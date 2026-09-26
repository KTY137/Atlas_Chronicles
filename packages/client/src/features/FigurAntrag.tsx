// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useEffect, useRef, useState } from "react";
import type { FigurantragCard, FreigegebeneVorlageCard } from "@chronicle/protocol";
import type { Scalar } from "@chronicle/rules";
import { Button, Loading, Notice, StepList, ViewIntro, announce, confirmAction } from "@chronicle/ui";
import { api, apiPath } from "../api";
import { useResource, useTask } from "../hooks";
import { t } from "../i18n";
import { HostRuleFields } from "./HostRuleFields";
import { useHostRules } from "./useHostRules";
import { CharacterProgress } from "./CharacterProgress";
import { Begriff } from "./Begriff";
import { FigurVorschau, FigurWeg, FigurZusammenfassung, type FigurSchritt } from "./InstantiateActorHost";
import type { RulesState } from "./game-api";
import "./character-creation.css";

/**
 * `FigurAntrag` — der Weg vom leeren Bereich „Ich" zur eigenen Figur.
 *
 * **Die Auswahl kommt ausschließlich aus `/actor-templates/freigegeben`.** Die Werkstattliste
 * aller Vorlagen ist Spielleitungswissen: sie nennt Beutetabellen und Artikelverweise, die ein
 * Spieler nicht sehen soll. Diese Fläche fragt sie deshalb gar nicht erst ab, statt sie zu laden
 * und danach zu filtern.
 *
 * **Die Anfangswerte sind eine Abweichung, kein Bogen.** Gezeigt werden nur die Felder, die die
 * gewählte Vorlage führt, vorbelegt mit ihren Werten; abgeschickt wird nur, was daran anders
 * ist. Ein vollständiger Bogen hätte die Vorlage stillschweigend ersetzt — die Spielleitung
 * bestätigte dann etwas, das sie so nie entworfen hat.
 *
 * **Ein offener Antrag schließt den nächsten aus.** Der Server hält dieselbe Regel
 * (`figurantraege_ein_offener`); hier ist sie sichtbar, statt sich als Konflikt zu melden.
 *
 * **Derselbe Weg wie „Figur anlegen“ (E15):** Wer ist die Figur? — Was kann sie? — Fertig. Der
 * Name steht einmal im Formular; führt das Regelwerk ein eigenes Namensfeld, wird er dort
 * eingetragen, statt ein zweites Namensfeld zu zeigen.
 */
export function FigurAntrag({ campaignId, rules, revision, onChanged, onDirty }: {
  campaignId: string; rules: RulesState; revision: number; onChanged: () => void; onDirty?: (dirty: boolean) => void;
}) {
  const vorlagen = useResource<FreigegebeneVorlageCard[]>(apiPath(campaignId, "/actor-templates/freigegeben"), revision);
  const antraege = useResource<FigurantragCard[]>(apiPath(campaignId, "/figurantraege"), revision);
  const [formular, setFormular] = useState(false), [templateId, setTemplateId] = useState("");
  const [name, setName] = useState(""), [werte, setWerte] = useState<Record<string, Scalar> | null>(null);
  const [schritt, setSchritt] = useState<FigurSchritt>("wer");
  // Ein Netzfehler wiederholt denselben Befehl; erst die angekommene Antwort gibt eine neue Kennung frei.
  const befehl = useRef<string | null>(null);
  const task = useTask();

  const eigene = antraege.data ?? [];
  const wartend = eigene.find(a => a.status === "offen") ?? null;
  // Der Server liefert in Antragsreihenfolge; der jüngste Bescheid steht vorn, ältere klappen ein.
  const abgelehnt = eigene.filter(a => a.status === "abgelehnt").reverse();
  const [juengste, ...fruehere] = abgelehnt;
  // Eine einzige freigegebene Vorlage ist keine Wahl: sie steht gleich im Feld.
  const gewaehlt = templateId || (vorlagen.data?.length === 1 ? vorlagen.data[0]!.id : "");
  const vorlage = vorlagen.data?.find(v => v.id === gewaehlt) ?? null;
  const pin = vorlage?.package ?? rules.pin;
  const source = rules.packages.find(pkg => pkg.id === pin.id && pkg.version === pin.version);
  const basis = (vorlage?.anfangswerte ?? {}) as Record<string, Scalar>;
  const eigenerName = name.trim(), nameFeld = source?.fields.name?.type === "string";
  const entwurf = { ...(werte ?? basis), ...(nameFeld && eigenerName ? { name: eigenerName } : {}) };
  const editor = useHostRules(campaignId, pin, vorlage ? entwurf : null);
  const abweichung = Object.fromEntries(Object.entries(entwurf).filter(([key, wert]) => !Object.is(wert, basis[key])));
  const dirty = formular && !wartend && (!!templateId || !!name || werte !== null);
  useEffect(() => { onDirty?.(dirty); }, [dirty, onDirty]);
  useEffect(() => () => onDirty?.(false), [onDirty]);

  const ungueltig = editor.error ? t("Die Regeln sind gerade nicht erreichbar. Lade sie über „Erneut laden“ neu.")
    : editor.preview && !editor.preview.valid ? t("Ein Wert passt noch nicht zu den Regeln. Die Meldung oben nennt ihn.") : "";
  const sperre = !vorlage ? t("Wähle zuerst eine Figurvorlage.") : !eigenerName ? t("Gib deiner Figur einen Namen.") : ungueltig
    || (schritt === "fertig" && !editor.canSave ? t("Die Regeln prüfen die Werte noch …") : "");

  const leeren = () => { befehl.current = null; setFormular(false); setTemplateId(""); setName(""); setWerte(null); setSchritt("wer"); };
  const beantragen = () => { if (!vorlage || sperre) return; void task.run(async () => {
    befehl.current ??= crypto.randomUUID();
    await api(apiPath(campaignId, "/figurantraege"), { method: "POST", body: { commandId: befehl.current, templateId: vorlage.id, name: eigenerName, anfangswerte: abweichung } });
    leeren(); announce(t("Antrag gesendet. Er wartet jetzt auf die Spielleitung.")); onChanged();
  }); };
  const abbrechen = async () => {
    if (dirty && !await confirmAction({ title: t("Antrag verwerfen?"), message: t("Name und Werte, die du eingetragen hast, gehen verloren."), confirmLabel: t("Verwerfen"), cancelLabel: t("Weiter ausfüllen") })) return;
    leeren();
  };
  const zuruecknehmen = async (offen: FigurantragCard) => {
    if (!await confirmAction({ title: t("Antrag zurücknehmen?"), message: t("Die Spielleitung sieht deinen Antrag danach nicht mehr. Du kannst jederzeit einen neuen stellen."), confirmLabel: t("Antrag zurücknehmen"), danger: true })) return;
    void task.run(async () => {
      await api(apiPath(campaignId, `/figurantraege/${encodeURIComponent(offen.id)}/zuruecknehmen`), { method: "POST", body: { expectedVersion: offen.version } });
      onChanged();
    });
  };
  const zurueckAufVorgaben = async () => {
    if (await confirmAction({ title: t("Zurück auf die Vorgaben?"), message: t("Alle Werte gehen zurück auf die Vorgaben der Vorlage. Deine Änderungen daran gehen verloren."), confirmLabel: t("Werte zurücksetzen"), danger: true })) setWerte(null);
  };
  const keineVorlage = !vorlagen.loading && !vorlagen.error && !vorlagen.data?.length;

  return <section className="panel figur-antrag creation-request">
    <ViewIntro id="figurantrag-titel" title={t("Eine Figur beantragen")}
      action={!wartend && !formular && !keineVorlage ? <Button variant="primary" disabled={vorlagen.loading} onClick={() => { setFormular(true); setSchritt("wer"); }}>{t("Figur beantragen")}</Button> : undefined}
      steps={[
        t("Wähle eine Figurvorlage und gib deiner Figur einen Namen."),
        t("Schlage Werte vor. Was du an der Vorlage änderst, geht als Wunsch an die Spielleitung."),
        t("Schick den Antrag ab. Sobald die Spielleitung zustimmt, steht der Bogen deiner Figur hier."),
      ]}>{wartend ? t("Dein Antrag ist unterwegs. Die Spielleitung entscheidet, danach steht deine Figur hier.")
        // Ohne freigegebene Vorlage gibt es nichts zu beantragen: ein Satz, warum, und was als Nächstes geschieht — kein totes Formular.
        : keineVorlage ? t("Du führst noch keine Figur. Deine Spielleitung hat noch keine Figurvorlage für Spieler freigegeben. Sobald sie das tut, erscheint hier der Knopf „Figur beantragen“.")
        : t("Du führst noch keine Figur. Beantrage eine: Du wählst eine Vorlage, gibst ihr einen Namen und schlägst Werte vor. Die Spielleitung gibt sie frei.")}</ViewIntro>
    {vorlagen.error || antraege.error ? <Notice error>{vorlagen.error || antraege.error}</Notice> : null}
    {task.error ? <Notice error>{task.error} {t("Lade die Anträge erneut, falls die Spielleitung inzwischen entschieden hat.")}</Notice> : null}
    {vorlagen.loading || antraege.loading ? <Loading /> : null}
    {juengste && !wartend ? <Notice tone="warn">{t("Dein Antrag für „{name}“ wurde abgelehnt: {grund}", { name: juengste.name, grund: juengste.reason ?? "" })}</Notice> : null}
    {fruehere.length && !wartend ? <details className="figur-antrag-frueher"><summary>{t("Frühere Anträge")}</summary><ul>
      {fruehere.map(a => <li key={a.id}>{t("„{name}“ abgelehnt: {grund}", { name: a.name, grund: a.reason ?? "" })}</li>)}</ul></details> : null}
    {wartend
      ? <div className="figur-antrag-status creation-instance-preview">
        <StepList label={t("Stand deines Antrags")} steps={[
          { id: "vorlage", label: t("Vorlage wählen"), state: "done" },
          { id: "gestalten", label: t("Figur gestalten"), state: "done" },
          { id: "freigabe", label: t("Freigabe abwarten"), state: "current" },
        ]} />
        <h3>{t("„{name}“ wartet auf die Spielleitung.", { name: wartend.name })}</h3>
        <p className="field-help">{t("Sobald sie bestätigt, findest du den Bogen deiner Figur hier auf dieser Fläche.")}</p>
        <Button disabled={task.busy} onClick={() => void zuruecknehmen(wartend)}>{t("Antrag zurücknehmen")}</Button>
      </div>
      : formular
      ? <form onSubmit={event => { event.preventDefault(); if (schritt !== "fertig") { if (!sperre) setSchritt(schritt === "wer" ? "was" : "fertig"); return; } beantragen(); }}>
        <fieldset className="actor-command-fields" disabled={task.busy}>
          <FigurWeg idPrefix="figurantrag" schritt={schritt} onSchritt={setSchritt} sperre={sperre} busy={task.busy}
            absenden={task.busy ? t("Antrag wird gesendet …") : t("Antrag absenden")}
            vorschau={<FigurVorschau name={eigenerName || vorlage?.name || ""} zeile={vorlage ? t("Vorlage „{name}“", { name: vorlage.name }) : ""} editor={editor} source={source} />}>
            {schritt === "wer" ? <>
              <div className="creation-identity-fields">
                <label>{t("Figurvorlage")}<select required value={gewaehlt} onChange={event => { setTemplateId(event.target.value); setWerte(null); }}>
                  <option value="">{t("Vorlage wählen")}</option>
                  {vorlagen.data?.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select></label>
                <label>{t("Name deiner Figur")}<input required maxLength={160} value={name} placeholder={vorlage?.name ?? ""} onChange={event => setName(event.target.value)} /></label>
              </div>
              <p className="field-help">{t("Die Vorlage hat deine Spielleitung für Spieler freigegeben.")} <Begriff id="figurvorlage" /></p>
              {vorlage ? <HostRuleFields state={editor} source={source} onChange={setWerte} part="identity" omit={["name"]} /> : null}
            </> : schritt === "was" ? <>
              <p className="field-help">{t("Vorbelegt mit den Werten der Vorlage. Nur was du änderst, steht als Wunsch im Antrag.")}</p>
              {source && editor.values ? <CharacterProgress pkg={source} fields={editor.values} /> : null}
              <HostRuleFields state={editor} source={source} onChange={setWerte} part="values" omit={["name"]} />
              <div className="button-row"><Button variant="quiet" disabled={werte === null} onClick={() => void zurueckAufVorgaben()}>{t("Zurück auf die Vorgaben")}</Button></div>
            </> : <>
              <FigurZusammenfassung name={eigenerName} vorlage={vorlage?.name ?? ""} editor={editor} basis={basis} source={source} wuenscheTitel={t("Diese Wünsche schickst du mit:")} />
              <p className="field-help">{t("Die Spielleitung sieht deinen Antrag und gibt die Figur frei. Danach steht ihr Bogen hier.")}</p>
            </>}
          </FigurWeg>
        </fieldset>
        {/* Abbrechen steht außerhalb des gesperrten Bereichs und bleibt auch bei hängender Übertragung erreichbar. */}
        <div className="creation-save-actions"><Button variant="quiet" onClick={() => void abbrechen()}>{t("Abbrechen")}</Button></div>
      </form>
      : null}
  </section>;
}
