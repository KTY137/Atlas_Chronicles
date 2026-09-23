// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useCallback, useState } from "react";
import { EyeOff, MoreHorizontal } from "lucide-react";
import { Button } from "@chronicle/ui";
import { t } from "../i18n";
import type { ActionCard } from "./game-api";
import { KampfBalken } from "./KampfBalken";
import { InitiativeAendern, KartenMenue, LoeschenRueckfrage, MaskenWahl, SichtBearbeiten, WertAendern } from "./KampfFenster";
import { balkenFarbe, initialen, type KartenAktionen, type KartenAnsicht } from "./kampftisch-model";

type Offen = { art: "menue" | "sicht" | "initiative" | "loeschen" } | { art: "maske" | "wert"; vital: string };

/**
 * Eine Karte auf dem Tisch. Dieselbe Karte für Spielleitung und Runde — nur die Spielleitung
 * bekommt Kartenmenü und Augen an den Balken, und nur wer die Figur führt, ändert ihre Werte.
 * Zustände stehen als Wort, nie nur als Farbe: am Zug, umgelegt, verdeckt, deine Figur.
 */
export function Kampfkarte({ karte, leitung, klein = false, busy, aktionen, bildUrl, wurf }: {
  karte: KartenAnsicht; leitung: boolean; klein?: boolean; busy: boolean; aktionen: KartenAktionen;
  bildUrl: (karteId: string, version: number) => string; wurf: ActionCard | null;
}) {
  const [offen, setOffen] = useState<Offen | null>(null);
  const schliessen = useCallback(() => setOffen(null), []);
  const roh = leitung ? karte.roh : null;
  const klassen = ["kampfkarte", `seite-${karte.seite}`, karte.amZug ? "amzug" : "", karte.lage === "umgelegt" ? "umgelegt" : "",
    klein ? "klein" : "", karte.eigene ? "eigene" : ""].filter(Boolean).join(" ");
  const menueOffen = offen !== null && (offen.art === "menue" || offen.art === "sicht" || offen.art === "initiative" || offen.art === "loeschen");

  return <article className={klassen} aria-label={karte.name} aria-current={karte.amZug ? "step" : undefined}>
    {karte.amZug ? <span className="kampfkarte-marke">{t("am Zug")}</span> : null}
    {karte.eigene ? <span className="kampfkarte-eigene">{t("Deine Figur")}</span> : null}
    {karte.lage === "umgelegt" ? <span className="kampfkarte-stempel">{t("umgelegt")}</span> : null}
    <span className="kampfkarte-siegel" title={t("Initiative")}>{karte.initiative}</span>
    {roh ? <div className="kampf-anker kampfkarte-menue-ort">
      <button type="button" className="kampfkarte-menue" aria-haspopup="dialog" aria-expanded={menueOffen}
        aria-label={t("Was mit {name} geschehen soll", { name: karte.name })} onClick={() => setOffen({ art: "menue" })}>
        <MoreHorizontal size={16} aria-hidden="true" /></button>
      {offen?.art === "menue" ? <KartenMenue karte={roh} onClose={schliessen}
        onLage={ziel => { setOffen(null); aktionen.lage(roh, ziel); }}
        onSicht={() => setOffen({ art: "sicht" })} onInitiative={() => setOffen({ art: "initiative" })} onLoeschen={() => setOffen({ art: "loeschen" })}
        onInventar={roh.actorId && aktionen.inventar ? () => { setOffen(null); aktionen.inventar!(roh.actorId!); } : undefined} /> : null}
      {offen?.art === "sicht" ? <SichtBearbeiten karte={roh} onClose={schliessen}
        onSpeichern={(sicht, name) => { setOffen(null); aktionen.sicht(roh, sicht, name); }} /> : null}
      {offen?.art === "initiative" ? <InitiativeAendern karte={roh} wurf={wurf} onClose={schliessen}
        onSetzen={(wert, rollId) => { setOffen(null); aktionen.initiative(roh, wert, rollId); }} /> : null}
      {offen?.art === "loeschen" ? <LoeschenRueckfrage karte={roh} onClose={schliessen}
        onLoeschen={() => { setOffen(null); aktionen.loeschen(roh); }} /> : null}
    </div> : null}
    <div className="kampfkarte-bild">{karte.bild
      ? <img src={bildUrl(karte.id, karte.bild.version)} alt="" loading="lazy" />
      : <span className="kampfkarte-monogramm" aria-hidden="true">{initialen(karte.name)}</span>}</div>
    <h4 className="kampfkarte-name">{karte.name}
      {leitung && karte.nameFuerRunde ? <small>{t("Die Runde liest: „{name}“", { name: karte.nameFuerRunde })}</small> : null}</h4>
    {klein ? <span className="kampfkarte-verdeckt"><EyeOff size={12} aria-hidden="true" /> {t("verdeckt")}</span> : <>
      {karte.balken.length ? <div className="kampfkarte-balken">{karte.balken.map((balken, stelle) => {
        const vital = balken.anzeige.id, anzeige = balken.anzeige;
        const bearbeitbar = karte.bearbeitbar && anzeige.anzeige === "genau" ? karte.bearbeitbar : null;
        const schwebe = offen?.art === "maske" && offen.vital === vital && roh && balken.leitung
          ? <MaskenWahl balken={balken.leitung} onClose={schliessen} onWahl={maske => { setOffen(null); aktionen.maske(roh, vital, maske); }} />
          : offen?.art === "wert" && offen.vital === vital && bearbeitbar && anzeige.anzeige === "genau"
            ? <WertAendern label={anzeige.label} wert={anzeige.wert} hoechst={anzeige.hoechst} onClose={schliessen}
                onSetzen={wert => { setOffen(null); aktionen.wert(bearbeitbar.actorId, vital, wert, bearbeitbar.bogenVersion); }} />
            : null;
        return <KampfBalken key={vital} balken={balken} farbe={balkenFarbe(balken, stelle)} schwebe={schwebe}
          onMaske={roh && balken.leitung ? () => setOffen({ art: "maske", vital }) : undefined}
          onWert={bearbeitbar ? () => setOffen({ art: "wert", vital }) : undefined} />;
      })}</div> : leitung && karte.ohneWerte ? <p className="kampfkarte-ohne">{t("Ohne Werte")}</p> : null}
      {karte.zustaende.length ? <ul className="kampfkarte-zustaende" aria-label={t("Zustände")}>
        {karte.zustaende.map(zustand => <li key={zustand.id}>{zustand.name}</li>)}</ul> : null}
      {roh && karte.aufgebraucht && karte.lage === "feld" ? <div className="kampfkarte-hinweis" role="status">{t("Leben aufgebraucht. Umlegen?")}
        <Button disabled={busy} onClick={() => aktionen.lage(roh, "umgelegt")}>{t("Umlegen")}</Button></div> : null}
      <p className="kampfkarte-fuss">{karte.gewuerfelt ? t("gewürfelt") : t("gesetzt")}</p>
    </>}
  </article>;
}
