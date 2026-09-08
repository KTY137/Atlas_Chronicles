// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useState } from "react";
import { ImageOff, ScanSearch } from "lucide-react";
import { assetPath, type Block } from "../api";
import { t } from "../i18n";

type Figure = Extract<Block, { kind: "bildunterschrift" }>;

/**
 * Ein Bild im Artikel — und der ehrliche Fall, wenn es keins gibt.
 *
 * Vorher stand hier der Quelltext des Wikis in einem Kasten „nicht umgewandelt". Jetzt steht hier
 * das Bild; und wenn seine Bytes noch nicht geholt sind, steht hier der Dateiname und der Grund.
 * Beides ist eine Aussage. Ein leerer Platz wäre keine.
 *
 * Der Alt-Text kommt aus dem Wiki, wenn der Autor einen geschrieben hat, sonst aus der
 * Bildunterschrift. Erst wenn beides fehlt, ist das Bild dekorativ (`alt=""`) — ein erfundener
 * Alt-Text wäre schlechter als keiner, weil er einer Screenreader-Nutzerin etwas behauptet.
 */
export function ArticleFigure({ block, campaignId, children }: {
  block: Figure; campaignId?: string; children: React.ReactNode;
}) {
  const [fehlt, setFehlt] = useState(false);
  const [gross, setGross] = useState(false);
  const beschriftung = block.inhalt.map((part) => part.text).join("").trim();
  const alt = block.alt ?? (beschriftung || "");
  const quelle = campaignId ? assetPath(campaignId, block.assetId) : null;
  const name = block.dateiname ?? t("Unbenannte Datei");
  // Das Infobox-Portrait ist eine Tafel neben dem Text, kein Titelbild. Ohne diese Unterscheidung
  // füllt ein 512-px-Porträt die ganze Spalte — hochskaliert, weich, und lauter als der Artikel.
  const klasse = ["article-figure", `figure-${block.ausrichtung ?? "standard"}`, block.ausInfobox ? "figure-portrait" : ""].filter(Boolean).join(" ");

  if (!quelle || fehlt) {
    return <figure className={`${klasse} figure-missing`}>
      <div className="figure-placeholder">
        <ImageOff size={20} aria-hidden="true" />
        <p><strong>{name}</strong></p>
        <p className="muted">{t("Diese Datei ist noch nicht geholt. Der Artikel nennt sie, die Bilddatei liegt aber noch im Quell-Wiki.")}</p>
      </div>
      {children ? <figcaption>{children}</figcaption> : null}
    </figure>;
  }
  return <figure className={klasse}>
    <button type="button" className="figure-frame" onClick={() => setGross((value) => !value)}
      aria-label={gross ? t("{name} verkleinern", { name }) : t("{name} vergrößern", { name })} aria-pressed={gross}>
      {/* Ohne `width: auto` streckt der Browser jedes Bild auf die Spaltenbreite — auch ein
          512-px-Porträt, das dabei nur weicher wird. Vergrößern bleibt eine Entscheidung des Lesers. */}
      <img src={quelle} alt={alt} loading="lazy" decoding="async" onError={() => setFehlt(true)}
        style={gross || !block.breite ? undefined : { maxWidth: `${Math.min(block.breite, 900)}px` }}
        className={gross ? "figure-image figure-image-gross" : "figure-image"} />
      <span className="figure-zoom" aria-hidden="true"><ScanSearch size={15} /></span>
    </button>
    {children ? <figcaption>{children}</figcaption> : null}
  </figure>;
}
