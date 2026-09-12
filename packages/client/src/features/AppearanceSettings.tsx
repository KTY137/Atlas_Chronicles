// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { DEFAULT_ACCESSIBILITY_PREFERENCES, type AccessibilityPreferencesV3 } from "@chronicle/theme";
import { Button, Notice } from "@chronicle/ui";
import { useState, type ReactNode } from "react";
import { setzeSprache, t } from "../i18n";
import { spracheFehlerText, useAppearance } from "./Appearance";
import { LookAuswahl } from "./LookAuswahl";
import { BannerAuswahl } from "./BannerAuswahl";
import { LOOK_LABEL } from "./look-namen";

/**
 * Eine beschriftete Wahl mit einem Satz darunter, der das ERGEBNIS beschreibt.
 *
 * Der Satz ist nicht Zierde. Vorher hiess eine Wahl „Gestaltung" und bot „Schlicht",
 * „Ausgestaltet", „Szenisch" an — drei Woerter, aus denen niemand ableiten kann, was sich
 * sichtbar aendert. Jede Wahl hier sagt jetzt, was danach anders aussieht.
 *
 * Kein `aria-label`: das umschliessende `<label>` benennt das Feld bereits. Ein zweiter,
 * wortgleicher Name geht beim naechsten Umformulieren auseinander, und dann sagt die
 * Sprachausgabe etwas anderes als der Bildschirm.
 */
function Wahl({ titel, hilfe, wert, aendere, optionen }: {
  titel: string; hilfe: string; wert: string;
  aendere: (naechster: string) => void;
  optionen: readonly (readonly [string, string])[];
}) {
  return <div className="wahl-feld">
    <label>{titel}
      <select value={wert} onChange={ereignis => aendere(ereignis.target.value)}>
        {optionen.map(([schluessel, beschriftung]) => <option key={schluessel} value={schluessel}>{beschriftung}</option>)}
      </select>
    </label>
    <p className="field-help">{hilfe}</p>
  </div>;
}

function Haken({ an, aendere, titel, hilfe }: { an: boolean; aendere: (an: boolean) => void; titel: string; hilfe: ReactNode }) {
  return <div className="wahl-feld">
    <label className="check-label"><input type="checkbox" checked={an} onChange={ereignis => aendere(ereignis.target.checked)} /> {titel}</label>
    <p className="field-help">{hilfe}</p>
  </div>;
}

export function AppearanceSettings() {
  const { preferences, resolved, preferencesRecovered, spracheFehler, storageError, update } = useAppearance();
  const [wechselFehler, setWechselFehler] = useState("");
  // Zaehlt hoch, wenn ein Wechsel abgebrochen wurde. Ohne das bleibt im Auswahlfeld die
  // abgebrochene Wahl stehen: React zeichnet nicht neu, weil sich der Zustand nicht geaendert
  // hat — der Nutzer laese dann „English", waehrend die Oberflaeche deutsch bleibt.
  const [ruecksetzer, setRuecksetzer] = useState(0);
  const change = <K extends keyof AccessibilityPreferencesV3>(key: K, value: AccessibilityPreferencesV3[K]) =>
    update({ ...preferences, [key]: value });

  // Der Sprachwechsel baut die ganze Ansicht neu auf. Wer gerade schreibt, verliert den
  // Entwurf, also wird vorher gefragt; erst nach geladenem Katalog wird die Wahl gespeichert.
  const wechsleSprache = async (naechste: AccessibilityPreferencesV3["language"]) => {
    if (naechste === preferences.language) return;
    if (!window.confirm(t("Sprache umstellen? Die Seite wird neu aufgebaut. Text, den du noch nicht gespeichert hast, geht dabei verloren."))) {
      setRuecksetzer(stand => stand + 1);
      return;
    }
    try { await setzeSprache(naechste); setWechselFehler(""); update({ ...preferences, language: naechste }); }
    catch { setWechselFehler(spracheFehlerText()); }
  };

  const systemwahl = t("So wie mein Gerät es vorgibt");
  return <section className="panel appearance-settings"><h2>{t("Deine Darstellung")}</h2>
    <p>{t("Diese Einstellungen gelten nur für dich und nur in diesem Browser. Sie verändern weder die Kampagne noch das Bild der anderen Mitspieler.")}</p>

    <BannerAuswahl />

    <LookAuswahl gewaehlt={preferences.localSkin} aktiv={resolved.basePreset}
      aendere={naechster => change("localSkin", naechster)} />

    <div className="wahl-gitter">
      <div className="wahl-feld">
        <label>{t("Sprache")}
          <select key={ruecksetzer} value={preferences.language}
            onChange={ereignis => void wechsleSprache(ereignis.target.value as AccessibilityPreferencesV3["language"])}>
            <option value="de">Deutsch</option><option value="en">English</option>
          </select>
        </label>
        <p className="field-help">{t("Ändert die Wörter der Oberfläche. Was ihr selbst geschrieben habt — Artikel, Namen, Notizen — bleibt so, wie es ist.")}</p>
      </div>

      <Wahl titel={t("Kontrast")} wert={preferences.contrast} aendere={wert => change("contrast", wert as AccessibilityPreferencesV3["contrast"])}
        hilfe={t("Hoher Kontrast schaltet auf Schwarz, Weiß und wenige kräftige Farben mit deutlichen Rändern. Gut bei hellem Licht oder schwacher Sicht.")}
        optionen={[["system", systemwahl], ["normal", t("Normal")], ["high", t("Hoher Kontrast")]]} />

      <Wahl titel={t("Bewegte Übergänge")} wert={preferences.motion} aendere={wert => change("motion", wert as AccessibilityPreferencesV3["motion"])}
        hilfe={t("Ohne Übergänge erscheinen Fenster und Knöpfe sofort, statt sanft einzublenden. Hilft bei Schwindel und auf langsamen Geräten.")}
        optionen={[["system", systemwahl], ["reduced", t("Übergänge weglassen")]]} />

      <Wahl titel={t("Durchscheinende Flächen")} wert={preferences.transparency} aendere={wert => change("transparency", wert as AccessibilityPreferencesV3["transparency"])}
        hilfe={t("Deckend heißt: Leisten und Fenster sind einfarbig, statt den Inhalt dahinter durchscheinen zu lassen. Text ist dann leichter zu lesen.")}
        optionen={[["system", systemwahl], ["reduced", t("Flächen deckend machen")]]} />

      <Wahl titel={t("Schriftart")} wert={preferences.font} aendere={wert => change("font", wert as AccessibilityPreferencesV3["font"])}
        hilfe={t("Die letzte Wahl nutzt eine breite, ruhige Schrift ohne Zierat — angenehm bei langen Textstellen.")}
        optionen={[["theme", t("Schrift des gewählten Aussehens")], ["system", t("Schrift meines Geräts")], ["reader", t("Besonders gut lesbare Schrift")]]} />

      <Wahl titel={t("Platz zwischen den Elementen")} wert={preferences.density} aendere={wert => change("density", wert as AccessibilityPreferencesV3["density"])}
        hilfe={t("Viel Luft: größere Knöpfe und mehr Abstand, gut am Tablet und am Tisch. Eng: es passt mehr auf den Bildschirm.")}
        optionen={[["comfortable", t("Viel Luft")], ["compact", t("Eng")]]} />

      <Wahl titel={t("Wie schmuckvoll?")} wert={preferences.atmosphere} aendere={wert => change("atmosphere", wert as AccessibilityPreferencesV3["atmosphere"])}
        hilfe={t("Nüchtern: keine Schatten, keine Verläufe. Mit Verzierungen: Schatten und Zierkanten an Feldern. Stimmungsvoll: zusätzlich ein farbiger Lichtschein hinter der Seite.")}
        optionen={[["clean", t("Nüchtern")], ["crafted", t("Mit Verzierungen")], ["cinematic", t("Stimmungsvoll")]]} />
    </div>

    <Haken an={preferences.art === "off"} aendere={an => change("art", an ? "off" : "on")}
      titel={t("Zierbilder ausblenden")}
      hilfe={t("Angehakt heißt: Wappen, Sternchen und Schmuckgrafiken verschwinden. Text und Bedienung bleiben vollständig.")} />
    <Haken an={preferences.lowPower} aendere={an => change("lowPower", an)}
      titel={t("Sparsame Darstellung für ältere Geräte")}
      hilfe={t("Schaltet aufwendige Effekte ab, damit die Seite auch auf langsamen Geräten flüssig bleibt.")} />

    {/* Angesagt, nicht nur gezeigt: wer die Wahl per Tastatur trifft, hoert das Ergebnis.
        Vorher war das ein stummes <p>, das sich unbemerkt aenderte. */}
    <p className="field-help" role="status">{t("Gerade sichtbar: {look}.", { look: t(LOOK_LABEL[resolved.basePreset]) })} {t("Wenn dein Gerät größere Schrift, weniger Bewegung oder eigene Farben vorgibt, gilt das immer zuerst. Vergrößern mit Strg und + funktioniert weiterhin.")}</p>

    {wechselFehler || spracheFehler ? <Notice error>{wechselFehler || spracheFehler}</Notice> : null}
    {storageError ? <Notice error>{storageError}</Notice> : null}
    {preferencesRecovered ? <Notice error>{t("Deine gespeicherte Darstellung war beschädigt und wurde auf die Vorgabe zurückgesetzt.")}</Notice> : null}
    <Button onClick={() => update(DEFAULT_ACCESSIBILITY_PREFERENCES)}>{t("Meine Einstellungen zurücksetzen")}</Button>
  </section>;
}
