// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { BANNER_IDS, type BannerId } from "@chronicle/theme";
import { useId } from "react";
import { t } from "../i18n";
import { useAppearance } from "./Appearance";
import { PixelBanner } from "./PixelBanner";

const BANNER_LABEL: Record<BannerId, string> = {
  mondburg: "Mondburg", gluehwald: "Glühwald", drachenberge: "Drachenberge", himmelsinseln: "Himmelsinseln", kristallhoehle: "Kristallhöhle",
  luftschiffhafen: "Luftschiffhafen", uhrwerkstadt: "Uhrwerkstadt", stahlwerk: "Stahlwerk", wuestenexpress: "Wüstenexpress", eiswacht: "Eiswacht",
  neonregen: "Neonregen", dachgaerten: "Dachgärten", biolabor: "Biolabor", datenstrom: "Datenstrom", tiefseestation: "Tiefseestation",
  sonnenraster: "Sonnenraster", pastellpalmen: "Pastellpalmen", raketenhafen: "Raketenhafen", orbitalring: "Orbitalring", geisterstadt: "Geisterstadt",
};
const BANNER_GENRE_LABEL: Record<BannerId, string> = {
  mondburg: "Fantasy", gluehwald: "Waldmagie", drachenberge: "Drachenfantasy", himmelsinseln: "Himmelsfantasy", kristallhoehle: "Dungeon-Fantasy",
  luftschiffhafen: "Steampunk", uhrwerkstadt: "Clockpunk", stahlwerk: "Dieselpunk", wuestenexpress: "Westernpunk", eiswacht: "Frostpunk",
  neonregen: "Cyberpunk", dachgaerten: "Solarpunk", biolabor: "Biopunk", datenstrom: "Nanopunk", tiefseestation: "Oceanpunk",
  sonnenraster: "Retropunk", pastellpalmen: "Vaporwave", raketenhafen: "Atompunk", orbitalring: "Spacepunk", geisterstadt: "Gothicpunk",
};

export function BannerAuswahl() {
  const { preferences, resolved, update } = useAppearance();
  const helpId = useId(), name = useId();
  const motion = preferences.bannerAnimation && resolved.motion.cadence !== "none" && resolved.art;
  return <fieldset className="banner-auswahl" aria-describedby={helpId}>
    <legend>{t("Pixelart-Banner")} <span className="banner-count">{t("20 Szenen")}</span></legend>
    <p className="field-help" id={helpId}>{t("Ein kleines Stück Welt in deiner oberen Leiste. Wähle ein Motiv — dein Farbschema bleibt frei wählbar.")}</p>
    <div className="banner-toolbar">
      <label className={`banner-off ${preferences.banner === "none" ? "ist-gewaehlt" : ""}`}>
        <input type="radio" name={name} value="none" checked={preferences.banner === "none"}
          onChange={() => update({ ...preferences, banner: "none" })} />
        {t("Kein Banner")}
      </label>
      <label className="check-label banner-motion"><input type="checkbox" checked={preferences.bannerAnimation}
        onChange={event => update({ ...preferences, bannerAnimation: event.target.checked })} />{t("Banner animieren")}</label>
    </div>
    <div className="banner-gitter">
      {BANNER_IDS.map(id => <label key={id} className={`banner-karte ${preferences.banner === id ? "ist-gewaehlt" : ""}`}>
        <input className="banner-radio" type="radio" name={name} value={id}
          aria-label={`${t(BANNER_LABEL[id])} · ${t(BANNER_GENRE_LABEL[id])}`} checked={preferences.banner === id}
          onChange={() => update({ ...preferences, banner: id })} />
        <PixelBanner scene={id} preview animated={motion} />
        <span className="banner-caption"><strong>{t(BANNER_LABEL[id])}</strong><span>{t(BANNER_GENRE_LABEL[id])}</span></span>
        <span className="banner-check" aria-hidden="true">{preferences.banner === id ? "✓" : ""}</span>
      </label>)}
    </div>
    <p className="field-help banner-status" role="status">{preferences.banner === "none" ? t("Die obere Leiste bleibt ohne Banner.")
      : !resolved.art ? t("Dein Motiv ist gespeichert. Zierbilder aus, nüchterne Darstellung, hoher Kontrast oder Sparmodus blenden das Banner aus.")
      : !motion ? t("Dein Banner wird als Standbild angezeigt. Weniger Bewegung auf deinem Gerät gilt auch hier.")
      : t("Dein Banner ist animiert. Du kannst die Bewegung jederzeit ausschalten.")}</p>
  </fieldset>;
}
