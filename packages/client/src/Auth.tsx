import { useEffect, useState } from "react";
import { ArrowRight, Fingerprint, KeyRound, Sparkles } from "lucide-react";
import { Button, Loading, Notice } from "@chronicle/ui";
import { api, ApiError, errorText, type PendingJoin } from "./api";
import { useResource, useTask } from "./hooks";

const pendingKey = "chronicle.pending-join.v1";
function savedJoin(): PendingJoin | null {
  try { const data = JSON.parse(sessionStorage.getItem(pendingKey) ?? "null") as PendingJoin | null;
    return data && typeof data.id === "string" && typeof data.pollToken === "string" && data.expiresAt > Date.now() ? data : null;
  } catch { return null; }
}

export function Auth({ onAuthenticated }: { onAuthenticated: (campaignId?: string) => Promise<void> }) {
  const setup = useResource<{ required: boolean }>("/api/setup");
  const reachability = useResource<{ passkeyEligible: boolean }>("/api/reachability");
  const task = useTask(), [name, setName] = useState(""), [secret, setSecret] = useState("");
  const [joinCode, setJoinCode] = useState(() => new URLSearchParams(location.search).get("join") ?? "");
  const [pairCode, setPairCode] = useState("");
  const [pending, setPending] = useState(savedJoin), [approved, setApproved] = useState(false), [pollError, setPollError] = useState("");

  useEffect(() => {
    if (!pending || approved) return;
    const controller = new AbortController(); let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const status = await api<{ status: string }>(`/api/joins/${encodeURIComponent(pending.id)}/status`, { method: "POST", body: { pollToken: pending.pollToken }, signal: controller.signal });
        if (controller.signal.aborted) return;
        setPollError("");
        if (status.status === "approved") { setApproved(true); return; }
      } catch (error) {
        if (controller.signal.aborted) return;
        setPollError(error instanceof ApiError && error.status === 404 ? "Die Anfrage ist abgelaufen oder die Einladung wurde widerrufen." : errorText(error));
        if (error instanceof ApiError && error.status === 404) return;
      }
      timer = setTimeout(poll, 2500);
    };
    void poll(); return () => { controller.abort(); clearTimeout(timer); };
  }, [pending, approved]);

  const login = () => task.run(async () => {
    const { startAuthentication } = await import("@simplewebauthn/browser");
    const ceremony = await api<{ challengeId: string; options: Parameters<typeof startAuthentication>[0]["optionsJSON"] }>("/api/passkeys/login/options", { method: "POST" });
    const response = await startAuthentication({ optionsJSON: ceremony.options });
    await api("/api/passkeys/login", { method: "POST", body: { challengeId: ceremony.challengeId, response } });
    await onAuthenticated();
  });

  return <main className="auth-layout"><section className="auth-story" aria-label="Willkommen bei Atlas Chronicles">
    <div className="brand"><span aria-hidden="true">A<span className="brand-star">✧</span></span><strong>ATLAS<br /><small>CHRONICLES</small></strong></div>
    <div className="auth-copy"><p className="eyebrow">Jede Welt beginnt mit einer Geschichte.</p><h1>Was ihr erlebt,<br />bleibt.</h1><p>Ein Zuhause für eure Welt. Ein gemeinsames Buch – und für jede Figur eine eigene Geschichte.</p><div className="auth-divider" /><span className="auth-caption"><Sparkles size={16} /> Die nächste Seite gehört euch.</span></div>
    <div className="orbital-art" aria-hidden="true"><i /><i /><i /><span>✧</span></div>
  </section><section className="auth-panel"><div className="auth-card">
    {setup.loading ? <Loading /> : setup.error ? <Notice error>{setup.error}</Notice> : setup.data?.required ? <>
      <p className="eyebrow">Der erste Schritt</p><h2>Deine Chronik beginnt.</h2><p className="muted">Richte die Spielleitung für diesen Server ein.</p>
      <form onSubmit={(event) => { event.preventDefault(); void task.run(async () => {
        await api("/api/setup", { method: "POST", body: { displayName: name }, authorization: `Bearer ${secret}` }); setSecret(""); await onAuthenticated();
      }); }}>
        <label>Dein Name<input value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} autoComplete="nickname" /></label>
        <label>Einrichtungsschlüssel<input type="password" value={secret} onChange={(e) => setSecret(e.target.value)} required minLength={32} autoComplete="off" aria-describedby="setup-help" /></label>
        <p id="setup-help" className="field-help">Der Serverbetreiber findet ihn in der lokalen Konfiguration unter „bootstrapToken“.</p>
        <Button type="submit" variant="primary" disabled={task.busy}>Chronik einrichten <ArrowRight size={16} /></Button>
      </form>
    </> : pending ? <>
      <p className="eyebrow">Dein Platz am Tisch</p><h2>{approved ? "Du bist eingeladen." : "Die Runde erwartet dich."}</h2>
      <p className="muted">{approved ? "Die Spielleitung hat deinen Beitritt freigegeben." : "Deine Anfrage liegt bei der Spielleitung. Diese Seite aktualisiert sich automatisch."}</p>
      {pollError ? <Notice error>{pollError}</Notice> : !approved ? <Loading text="Warte auf Freigabe …" /> : null}
      {approved ? <Button variant="primary" disabled={task.busy} onClick={() => void task.run(async () => {
        const result = await api<{ campaignId: string }>(`/api/joins/${encodeURIComponent(pending.id)}/claim`, { method: "POST", body: { pollToken: pending.pollToken } });
        sessionStorage.removeItem(pendingKey); setPending(null); await onAuthenticated(result.campaignId);
      })}>Die Runde betreten <ArrowRight size={16} /></Button> : null}
      <Button variant="quiet" onClick={() => { sessionStorage.removeItem(pendingKey); setPending(null); setApproved(false); setPollError(""); }}>Zurück zur Anmeldung</Button>
    </> : <>
      <p className="eyebrow">Willkommen zurück</p><h2>Dein Platz ist noch da.</h2><p className="muted">Öffne deine Chronik oder komm zu einer neuen Runde.</p>
      <Button variant="primary" className="full-width" disabled={task.busy || !reachability.data?.passkeyEligible} onClick={() => void login()}><Fingerprint size={19} /> Mit Passkey anmelden</Button>
      {reachability.data && !reachability.data.passkeyEligible ? <p className="field-help">Passkeys benötigen HTTPS oder localhost. Du kannst weiterhin über einen Einladungs- oder Kopplungscode beitreten.</p> : null}
      <div className="form-divider">Zu einer Runde kommen</div>
      <form onSubmit={(event) => { event.preventDefault(); void task.run(async () => {
        let code = joinCode.trim(); try { code = new URL(code).searchParams.get("join") ?? code; } catch { /* Raw invitation code. */ }
        const next = await api<PendingJoin>(`/join/${encodeURIComponent(code)}`, { method: "POST", body: { displayName: name } });
        setPending(next); sessionStorage.setItem(pendingKey, JSON.stringify(next));
      }); }}>
        <label>Einladungslink oder Code<input value={joinCode} onChange={(e) => setJoinCode(e.target.value)} required autoComplete="off" /></label>
        <label>Dein Name in der Runde<input value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} autoComplete="nickname" /></label>
        <Button type="submit" disabled={task.busy}>Beitritt anfragen <ArrowRight size={16} /></Button>
      </form>
      <details><summary><KeyRound size={14} /> Neues Gerät verbinden</summary><form onSubmit={(event) => { event.preventDefault(); void task.run(async () => {
        await api("/api/pairing/redeem", { method: "POST", body: { code: pairCode.trim() } }); setPairCode(""); await onAuthenticated();
      }); }}><label>Kopplungscode der Spielleitung<input value={pairCode} onChange={(e) => setPairCode(e.target.value)} autoComplete="off" required /></label><Button type="submit" disabled={task.busy}>Gerät verbinden</Button></form></details>
    </>}
    {task.error ? <Notice error>{task.error.includes("Konflikt") ? "Dieser Name ist bereits vergeben. Wähle bitte einen unterscheidbaren Namen." : task.error}</Notice> : null}
  </div><p className="auth-footer">Eure Geschichten bleiben bei eurem Server.</p></section></main>;
}
