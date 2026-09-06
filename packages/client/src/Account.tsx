import { useState } from "react";
import { Fingerprint, ShieldCheck } from "lucide-react";
import { Button, Loading, Notice } from "@chronicle/ui";
import { api, type Credential, type Me } from "./api";
import { useResource, useTask } from "./hooks";
import { AppearanceSettings } from "./features/AppearanceSettings";

export function Account({ me, onSessionChanged }: { me: Me; onSessionChanged: () => Promise<void> }) {
  const task = useTask(), [revision, setRevision] = useState(0), [notice, setNotice] = useState("");
  const credentials = useResource<Credential[]>("/api/credentials", revision);
  const reachability = useResource<{ passkeyEligible: boolean }>("/api/reachability");
  const register = () => task.run(async () => {
    const { startRegistration } = await import("@simplewebauthn/browser");
    const ceremony = await api<{ challengeId: string; options: Parameters<typeof startRegistration>[0]["optionsJSON"] }>("/api/passkeys/register/options", { method: "POST" });
    const response = await startRegistration({ optionsJSON: ceremony.options });
    await api("/api/passkeys/register", { method: "POST", body: { challengeId: ceremony.challengeId, response, label: "Mein Passkey" } });
    setRevision((v) => v + 1); setNotice("Dein Passkey wurde eingerichtet.");
  });
  return <section className="page-content account-page"><p className="eyebrow">Dein Zugang</p><h1>{me.displayName}</h1><p className="muted">Komm wieder. Deine Geschichten warten auf dich.</p>
    {task.error ? <Notice error>{task.error}</Notice> : null}{notice ? <Notice>{notice}</Notice> : null}
    <section className="panel"><h2><ShieldCheck size={20} /> Wiederkommen</h2><p className="muted">Mit einem Passkey meldest du dich auf diesem oder einem verbundenen Gerät wieder an. Alternativ kannst du diesen Browser für 30 Tage merken.</p><div className="button-row"><Button variant="primary" disabled={task.busy || !reachability.data?.passkeyEligible} onClick={() => void register()}><Fingerprint size={17} /> Passkey einrichten</Button><Button disabled={task.busy} onClick={() => void task.run(async () => { await api("/api/remember", { method: "POST" }); await onSessionChanged(); setRevision((v) => v + 1); setNotice("Dieser Browser bleibt für 30 Tage angemeldet."); })}>Diesen Browser merken</Button></div>{reachability.data && !reachability.data.passkeyEligible ? <p className="field-help">Passkeys sind unter dieser Serveradresse nicht verfügbar. Verwende HTTPS oder localhost.</p> : null}</section>
    <section className="panel"><h2>Aktive Zugänge</h2>{credentials.loading ? <Loading /> : credentials.error ? <Notice error>{credentials.error}</Notice> : <ul className="credential-list">{credentials.data?.map((credential) => <li key={credential.id}><div><strong>{credential.label}{credential.id === me.credentialId ? " · dieser Zugang" : ""}</strong><small>{credential.kind === "passkey" ? "Passkey" : "Browser"} · gültig bis {new Date(Number(credential.expiresAt)).toLocaleDateString("de-DE")}</small></div><Button variant="danger" disabled={task.busy} onClick={() => void task.run(async () => { await api(`/api/credentials/${encodeURIComponent(credential.id)}`, { method: "DELETE" }); if (credential.id === me.credentialId) await onSessionChanged(); else { setRevision((v) => v + 1); setNotice("Zugang widerrufen."); } })}>Widerrufen</Button></li>)}</ul>}</section>
    <AppearanceSettings />
  </section>;
}
