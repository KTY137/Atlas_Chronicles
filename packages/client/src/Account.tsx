// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useState } from "react";
import { ArrowLeft, ArrowRight, Fingerprint, LogOut, ShieldCheck, Ticket, Users } from "lucide-react";
import { Button, Loading, Notice } from "@chronicle/ui";
import { api, type Campaign, type Credential, type Me } from "./api";
import { useResource, useTask } from "./hooks";
import { AppearanceSettings } from "./features/AppearanceSettings";
import { locale, t } from "./i18n";

/**
 * Der eigene Bereich — „Dein Zugang".
 *
 * Vorher standen hier nur Passkeys und die Darstellung. Das war für eine Spielleitung genug,
 * weil sie ihre Runden ohnehin anlegt; für eine Spielerin war es eine Seite ohne Auskunft.
 * Sie erfuhr nirgends, was sie eigentlich darf, in welchen Runden sie ist, und was passiert,
 * wenn sie eine zweite Einladung bekommt.
 *
 * Die drei neuen Abschnitte beantworten genau das:
 *
 * - **Was du hier darfst.** Es gibt zwei Ebenen, und sie werden ständig verwechselt: die Rolle
 *   auf diesem Server (darfst du eigene Runden anlegen?) und die Rolle in einer Runde
 *   (Spielleitung oder Spieler). Beide stehen jetzt im Klartext da.
 * - **Deine Runden.** Mit Rolle und einem Weg hinein. Vorher führte der einzige Weg über die
 *   Kopfleiste.
 * - **Eine Einladung bekommen?** Der wichtigste Satz der Seite, siehe unten.
 */
export function Account({ me, campaigns, joinCode, onOpenCampaign, onSignOut, onSessionChanged, onClose, closeLabel }: {
  me: Me;
  campaigns: readonly Campaign[] | undefined;
  /** Ein `?join=`-Code in der Adresse, obwohl schon jemand angemeldet ist. */
  joinCode: string;
  onOpenCampaign: (id: string) => void;
  onSignOut: () => void;
  onSessionChanged: () => Promise<void>;
  onClose: () => void;
  closeLabel: string;
}) {
  const task = useTask(), [revision, setRevision] = useState(0), [notice, setNotice] = useState("");
  const credentials = useResource<Credential[]>("/api/credentials", revision);
  const reachability = useResource<{ passkeyEligible: boolean }>("/api/reachability");
  const register = () => task.run(async () => {
    const { startRegistration } = await import("@simplewebauthn/browser");
    const ceremony = await api<{ challengeId: string; options: Parameters<typeof startRegistration>[0]["optionsJSON"] }>("/api/passkeys/register/options", { method: "POST" });
    const response = await startRegistration({ optionsJSON: ceremony.options });
    await api("/api/passkeys/register", { method: "POST", body: { challengeId: ceremony.challengeId, response, label: "Mein Passkey" } });
    setRevision((v) => v + 1); setNotice(t("Dein Passkey wurde eingerichtet."));
  });
  const ausgang = <Button onClick={onClose}><ArrowLeft size={16} /> {closeLabel}</Button>;

  return <section className="page-content account-page">
    <div className="account-exit">{ausgang}<span className="field-help">{t("Oder Esc drücken.")}</span></div>
    <p className="eyebrow">{t("Dein Zugang")}</p><h1>{me.displayName}</h1>
    <p className="muted">{t("Komm wieder. Deine Geschichten warten auf dich.")}</p>
    {task.error ? <Notice error>{task.error}</Notice> : null}{notice ? <Notice>{notice}</Notice> : null}

    {/* Eine Einladung in der Adresse, obwohl schon jemand angemeldet ist. Ohne diesen Kasten
        passierte gar nichts: die Anmeldeseite liest `?join=`, wird aber nur gezeigt, solange
        niemand angemeldet ist — der Link lief also ins Leere. */}
    {joinCode ? <section className="panel account-einladung">
      <h2><Ticket size={20} /> {t("Du hast eine Einladung geöffnet")}</h2>
      <p>{t("Diese Einladung gehört zu einer Runde, in der du noch nicht bist. Ein Beitritt legt einen eigenen Zugang für genau diese Runde an — er wird nicht mit „{name}“ zusammengelegt.", { name: me.displayName })}</p>
      <p className="field-help">{t("Das ist Absicht: In jeder Runde trittst du unter dem Namen auf, den du dort angibst. Melde dich also zuerst ab; die Einladung bleibt geöffnet und du kannst sie danach annehmen.")}</p>
      <div className="button-row"><Button variant="primary" onClick={onSignOut}><LogOut size={17} /> {t("Abmelden und Einladung annehmen")}</Button></div>
    </section> : null}

    <section className="panel">
      <h2><ShieldCheck size={20} /> {t("Was du hier darfst")}</h2>
      <p className="muted">{me.canCreateCampaign
        ? t("Du kannst auf diesem Server eigene Runden anlegen und andere dazu einladen.")
        : t("Du spielst in Runden, zu denen dich eine Spielleitung einlädt. Eigene Runden anlegen kann auf diesem Server nur, wer ihn eingerichtet hat.")}</p>
      <p className="field-help">{t("Innerhalb einer Runde hat jeder zusätzlich eine eigene Rolle. Die Spielleitung sieht dort die Schmiede und alle Regeln; als Spieler siehst du deine Figuren, den Tisch, die Chronik und alles, was für dich freigegeben ist.")}</p>
    </section>

    <section className="panel">
      <h2><Users size={20} /> {t("Deine Runden")}</h2>
      {!campaigns ? <Loading /> : campaigns.length === 0
        ? <p className="muted">{t("Du bist noch in keiner Runde. Sobald dich eine Spielleitung einlädt, erscheint sie hier.")}</p>
        : <ul className="account-runden">{campaigns.map(runde => <li key={runde.id}>
          <div><strong>{runde.name}</strong><small>{runde.role === "leitung" ? t("Du führst diese Runde.") : t("Du spielst in dieser Runde.")}</small></div>
          <Button onClick={() => onOpenCampaign(runde.id)}>{t("Öffnen")} <ArrowRight size={15} /></Button>
        </li>)}</ul>}
    </section>

    <section className="panel"><h2><ShieldCheck size={20} /> {t("Wiederkommen")}</h2>
      <p className="muted">{t("Mit einem Passkey meldest du dich auf diesem oder einem verbundenen Gerät wieder an. Alternativ kannst du diesen Browser für 30 Tage merken.")}</p>
      <div className="button-row">
        <Button variant="primary" disabled={task.busy || !reachability.data?.passkeyEligible} onClick={() => void register()}><Fingerprint size={17} /> {t("Passkey einrichten")}</Button>
        <Button disabled={task.busy} onClick={() => void task.run(async () => { await api("/api/remember", { method: "POST" }); await onSessionChanged(); setRevision((v) => v + 1); setNotice(t("Dieser Browser bleibt für 30 Tage angemeldet.")); })}>{t("Diesen Browser merken")}</Button>
      </div>
      {reachability.data && !reachability.data.passkeyEligible ? <p className="field-help">{t("Passkeys sind unter dieser Serveradresse nicht verfügbar. Verwende HTTPS oder localhost.")}</p> : null}
      <p className="field-help">{t("Ohne beides kommst du nach dem Abmelden nur mit einem neuen Kopplungscode deiner Spielleitung zurück. Richte am besten jetzt eins von beiden ein.")}</p>
    </section>

    <section className="panel"><h2>{t("Aktive Zugänge")}</h2>{credentials.loading ? <Loading /> : credentials.error ? <Notice error>{credentials.error}</Notice> : <ul className="credential-list">{credentials.data?.map((credential) => <li key={credential.id}><div><strong>{credential.id === me.credentialId ? t("{name} · dieser Zugang", { name: credential.label }) : credential.label}</strong><small>{credential.kind === "passkey" ? t("Passkey · gültig bis {datum}", { datum: new Date(Number(credential.expiresAt)).toLocaleDateString(locale()) }) : t("Browser · gültig bis {datum}", { datum: new Date(Number(credential.expiresAt)).toLocaleDateString(locale()) })}</small></div><Button variant="danger" disabled={task.busy} onClick={() => void task.run(async () => { await api(`/api/credentials/${encodeURIComponent(credential.id)}`, { method: "DELETE" }); if (credential.id === me.credentialId) await onSessionChanged(); else { setRevision((v) => v + 1); setNotice(t("Zugang widerrufen.")); } })}>{t("Widerrufen")}</Button></li>)}</ul>}</section>

    <AppearanceSettings />

    {/* Der beschriftete Weg zur Anmeldeseite. In der Kopfleiste steht dafür nur ein Symbol —
        wer nicht weiß, dass ein Ausschaltzeichen „abmelden" heißt, findet ihn dort nicht. */}
    <section className="panel account-abmelden">
      <h2><LogOut size={20} /> {t("Abmelden")}</h2>
      <p className="muted">{t("Bringt dich zurück auf die Anmeldeseite. Dort kannst du dich wieder anmelden, ein neues Gerät verbinden oder einer Runde beitreten.")}</p>
      <div className="button-row"><Button variant="danger" onClick={onSignOut}>{t("Abmelden und zur Anmeldeseite")}</Button></div>
    </section>

    <div className="account-exit account-exit-unten">{ausgang}</div>
  </section>;
}
