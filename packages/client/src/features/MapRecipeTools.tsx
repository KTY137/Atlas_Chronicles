// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useEffect, useRef, useState } from "react";
import { Button, Notice } from "@chronicle/ui";
import { t } from "../i18n";
import type { GenerationDefaults } from "./map-generation";
import { parseMapRecipe, serializeMapRecipe, type MapRecipe } from "./map-recipes";

/** Files are the explicit persistence boundary. No private campaign recipes are left in
 * shared-browser localStorage after logout. Session variants stay bounded and ephemeral. */
export function MapRecipeTools({ recipe, defaults, onLoad, onCompare }: {
  recipe: MapRecipe | null; defaults: GenerationDefaults; onLoad: (recipe: MapRecipe) => void; onCompare: () => void;
}) {
  const [variants, setVariants] = useState<MapRecipe[]>([]), [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null), read = useRef(0), mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; read.current++; }; }, []);
  const remember = (next: MapRecipe) => setVariants(old => [next, ...old.filter(r => r.referenceHash !== next.referenceHash)].slice(0, 4));
  const download = () => {
    if (!recipe) return;
    const url = URL.createObjectURL(new Blob([serializeMapRecipe(recipe)], { type: "application/json" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = "atlas-kartenvorlage.json";
    document.body.append(anchor); anchor.click(); anchor.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000); remember(recipe);
  };
  return <section className="map-recipe-tools" aria-label={t("Kartenvorlagen")}>
    <strong>{t("Kartenvorlagen & Varianten")}</strong>
    <p className="field-help">{t("Vorlagen werden als JSON-Datei gespeichert. Die letzten vier Varianten bleiben nur in dieser Sitzung; keine Karte wird beim Laden überschrieben.")}</p>
    <div className="button-row">
      <Button type="button" disabled={!recipe} onClick={download}>{t("Vorlage als Datei speichern")}</Button>
      <Button type="button" onClick={() => input.current?.click()}>{t("Vorlage aus Datei laden")}</Button>
      <Button type="button" disabled={!recipe} onClick={() => { if (recipe) { remember(recipe); onCompare(); } }}>{t("Vorschau zum Vergleich merken")}</Button>
    </div>
    <input ref={input} aria-label={t("Kartenvorlage öffnen")} type="file" hidden accept=".json,application/json" onChange={async event => {
      const file = event.target.files?.[0], token = ++read.current; event.target.value = ""; if (!file) return;
      setError("");
      try {
        if (file.size > 64 * 1024) throw new Error(t("Die Vorlagendatei darf höchstens 64 KiB groß sein."));
        const loaded = parseMapRecipe(await file.text(), defaults);
        if (mounted.current && token === read.current) { remember(loaded); onLoad(loaded); }
      } catch (cause) { if (mounted.current && token === read.current) setError(cause instanceof Error ? cause.message : t("Die Vorlage konnte nicht geladen werden.")); }
    }} />
    {variants.length ? <label>{t("Varianten dieser Sitzung")}<select value="" onChange={event => { const selected = variants.find(r => r.referenceHash === event.target.value); if (selected) onLoad(selected); }}>
      <option value="">{t("Variante wählen …")}</option>{variants.map(r => <option key={r.referenceHash} value={r.referenceHash}>{r.name} · {r.seed}</option>)}
    </select></label> : null}
    {error ? <Notice error>{error}</Notice> : null}
  </section>;
}
