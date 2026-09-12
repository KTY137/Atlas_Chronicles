// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import type { BannerId } from "@chronicle/theme";

export interface Palette { sky: string; horizon: string; far: string; mid: string; ink: string; glow: string; light: string }
export const BANNER_PALETTES: Record<BannerId, Palette> = {
  mondburg: { sky: "#10142d", horizon: "#343565", far: "#303654", mid: "#47517a", ink: "#171c38", glow: "#a59bea", light: "#f4e8bc" },
  gluehwald: { sky: "#081d23", horizon: "#1e5550", far: "#173c40", mid: "#286257", ink: "#0c292d", glow: "#92efb1", light: "#e4f5a2" },
  drachenberge: { sky: "#29162d", horizon: "#a14b49", far: "#683044", mid: "#7e3c44", ink: "#301c31", glow: "#f3a263", light: "#ffe0a0" },
  himmelsinseln: { sky: "#23345b", horizon: "#8c83ae", far: "#535c89", mid: "#5b817b", ink: "#29384e", glow: "#a5e2e4", light: "#f9e8c3" },
  kristallhoehle: { sky: "#15112d", horizon: "#42356c", far: "#30254f", mid: "#655093", ink: "#171a34", glow: "#a492ef", light: "#b7f3f0" },
  luftschiffhafen: { sky: "#302a32", horizon: "#b18a61", far: "#5e4d4b", mid: "#886749", ink: "#302b32", glow: "#e6b56c", light: "#ffdfaa" },
  uhrwerkstadt: { sky: "#242528", horizon: "#7d7051", far: "#4c4a3e", mid: "#76674a", ink: "#292b2b", glow: "#d5b66d", light: "#f4e4ad" },
  stahlwerk: { sky: "#251f27", horizon: "#7e4741", far: "#47353b", mid: "#5c4945", ink: "#28282f", glow: "#f4a05e", light: "#ffe5a2" },
  wuestenexpress: { sky: "#493146", horizon: "#d99771", far: "#966052", mid: "#aa754f", ink: "#49333b", glow: "#efbd77", light: "#ffe1a1" },
  eiswacht: { sky: "#152b40", horizon: "#5c8998", far: "#3b596d", mid: "#83b2b6", ink: "#1b3547", glow: "#eeb971", light: "#e0f4e7" },
  neonregen: { sky: "#140f2b", horizon: "#48305b", far: "#282344", mid: "#44315c", ink: "#17162e", glow: "#ee83d1", light: "#8de8e8" },
  dachgaerten: { sky: "#21433f", horizon: "#91b781", far: "#497d69", mid: "#86a56b", ink: "#294d43", glow: "#edcf82", light: "#f2eabc" },
  biolabor: { sky: "#0d2025", horizon: "#315d50", far: "#233f3f", mid: "#346356", ink: "#142e32", glow: "#a5e989", light: "#d7f8b7" },
  datenstrom: { sky: "#0b1e28", horizon: "#163d4c", far: "#183744", mid: "#265363", ink: "#102733", glow: "#67c6ba", light: "#a9efcb" },
  tiefseestation: { sky: "#0b2036", horizon: "#1c5964", far: "#183a51", mid: "#286377", ink: "#112b42", glow: "#62c7d3", light: "#dcf2b5" },
  sonnenraster: { sky: "#26132f", horizon: "#9f4667", far: "#4c2954", mid: "#78385f", ink: "#281b3c", glow: "#f089ae", light: "#ffce93" },
  pastellpalmen: { sky: "#424064", horizon: "#c991ad", far: "#7f709e", mid: "#af8ea7", ink: "#464263", glow: "#8eddd4", light: "#f6d5ce" },
  raketenhafen: { sky: "#243545", horizon: "#b67b67", far: "#566174", mid: "#8b8784", ink: "#2d3c4b", glow: "#e7aa74", light: "#f0e6ba" },
  orbitalring: { sky: "#10162e", horizon: "#292f57", far: "#31365b", mid: "#626388", ink: "#19213d", glow: "#bca1df", light: "#a7e3ec" },
  geisterstadt: { sky: "#211c32", horizon: "#57506d", far: "#3b354c", mid: "#5f546a", ink: "#252235", glow: "#b0bcca", light: "#e5cf9d" },
  sternwarte: { sky: "#11132b", horizon: "#514776", far: "#292c50", mid: "#565784", ink: "#141c32", glow: "#c5a6ed", light: "#f7e3b5" },
  versunkener_tempel: { sky: "#071e2c", horizon: "#286d73", far: "#143c4a", mid: "#3e7a79", ink: "#0c2c37", glow: "#73e4cc", light: "#e1f9bf" },
  pilzdorf: { sky: "#171b35", horizon: "#6b586c", far: "#2d394d", mid: "#68725d", ink: "#202a36", glow: "#f39693", light: "#ffe8a8" },
  wolkenkloster: { sky: "#343e67", horizon: "#e4a691", far: "#737594", mid: "#a29795", ink: "#363b55", glow: "#efb681", light: "#fff0c5" },
  nachtmarkt: { sky: "#171a36", horizon: "#6a4564", far: "#35304d", mid: "#67546b", ink: "#24263e", glow: "#f49b75", light: "#ffe3ab" },
};
