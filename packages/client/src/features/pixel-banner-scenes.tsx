// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import type { BannerId } from "@chronicle/theme";
import type { ReactNode } from "react";

/** Original pixel scenery, drawn on a 640 × 64 grid. No remote art or animation timers. */
interface Palette { sky: string; horizon: string; far: string; mid: string; ink: string; glow: string; light: string }
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
};

function Sky({ p, stars = true }: { p: Palette; stars?: boolean }) {
  return <><path fill={p.sky} d="M0 0h640v64H0z" /><path fill={p.horizon} opacity=".26" d="M0 22h640v42H0z" />
    <path fill={p.horizon} opacity=".35" d="M0 38h640v26H0z" />
    {stars ? <g fill={p.light}>{Array.from({ length: 32 }, (_, i) => <rect key={i} x={(i * 83 + 16) % 640} y={(i * 17 + 3) % 32} width={i % 5 === 0 ? 2 : 1} height={i % 5 === 0 ? 2 : 1} opacity={i % 3 === 0 ? ".7" : ".35"} />)}
      <g className="pb-twinkle"><path d="M174 8h2v2h2v2h-2v2h-2v-2h-2v-2h2zM422 5h2v2h2v2h-2v2h-2V9h-2V7h2zM556 20h2v2h2v2h-2v2h-2v-2h-2v-2h2z" /></g></g> : null}</>;
}
function Moon({ p, x = 348, y = 5, sun = false }: { p: Palette; x?: number; y?: number; sun?: boolean }) {
  return <g transform={`translate(${x} ${y})`}><path fill={p.glow} opacity=".16" d="M6 0h18v4h4v4h4v16h-4v4h-4v4H6v-4H2v-4H0V8h2V4h4z" />
    <path fill={p.light} d="M10 4h12v2h4v4h2v12h-2v4h-4v2H10v-2H6v-4H4V10h2V6h4z" />
    {sun ? <path fill={p.horizon} d="M4 16h24v2H4zM4 22h24v2H4zM8 26h16v2H8z" /> : <path fill={p.glow} opacity=".55" d="M18 6h4v2h4v4h-4v4h-4v6h-6v-4H8v-6h4v-2h6z" />}</g>;
}
function Clouds({ p }: { p: Palette }) {
  return <g className="pb-cloud" fill={p.light} opacity=".18"><path d="M44 16h10v-4h16v4h12v4h14v2H34v-2h10zM222 8h14V4h18v4h12v4h14v2h-70v-2h12zM450 25h12v-4h20v4h12v4h18v2h-72v-2h10zM590 12h10V8h14v4h12v4h14v2h-60v-2h10z" /></g>;
}
function Mountains({ p, snow = false }: { p: Palette; snow?: boolean }) {
  return <><path fill={p.far} d="M0 46h12v-6h12v-6h10v-6h8v-6h8v-6h8v6h8v6h8v6h12v6h26v-8h10v-8h10v-8h8V8h8v8h8v8h10v8h10v8h28v6h20v-8h12v-8h10v-8h10v-8h8v8h10v8h10v8h20v8h18v-8h12v-8h12v-8h8v-8h8v8h10v8h12v8h16v8h30v-8h12v-8h10v-8h10v-8h8v-6h8v6h8v8h10v8h10v8h24v-8h10v-8h8v-8h8v8h10v8h10v8h22v-6h10v-6h10v-6h10v6h10v6h10v6h12v18H0z" />
    {snow ? <path fill={p.light} opacity=".65" d="M42 22h8v-6h8v6h8v6H54v-4h-6v4H34v-6zM130 24v-8h8V8h8v8h8v8h-10v-4h-6v4zM434 22h10v-8h8v-6h8v6h8v8h-14v-4h-6v4z" /> : null}
    <path fill={p.ink} d="M0 56h30v-4h40v-4h26v4h28v4h56v-4h38v6h28v-4h48v4h40v-6h28v-4h34v4h28v4h58v-4h38v4h48v-4h30v-4h26v4h36v-4h26v16H0z" /></>;
}
function Water({ p }: { p: Palette }) {
  return <><path fill={p.ink} d="M0 51h640v13H0z" /><g fill={p.glow} opacity=".4" className="pb-water">
    {Array.from({ length: 24 }, (_, i) => <rect key={i} x={(i * 67 + 9) % 630} y={53 + (i % 4) * 3} width={4 + (i % 5) * 4} height="1" />)}</g></>;
}
function Trees({ p, glow = false }: { p: Palette; glow?: boolean }) {
  return <g>{[22, 58, 100, 155, 195, 244, 398, 444, 490, 542, 591, 623].map((x, i) => <g key={x} transform={`translate(${x} ${i % 3 * 4})`}>
    <path fill={i % 2 ? p.far : p.mid} d="M0 8h4v6h4v6h4v6h4v6h-4v4h6v6h-14v16H0V42h-14v-6h6v-4h-4v-6h4v-6h4v-6h4z" />
    <path fill={p.ink} opacity=".55" d="M0 16h2v36H0zM2 26h8v2H2zM-8 34h8v2h-8z" />
    {glow ? <path fill={p.glow} opacity=".7" d="M-6 26h4v2h-4zM4 34h4v2H4z" /> : null}</g>)}</g>;
}
function Castle({ p, x = 300, y = 18 }: { p: Palette; x?: number; y?: number }) {
  return <g transform={`translate(${x} ${y})`}><path fill={p.ink} d="M-18 36h78v8h-78zM-8 12H6v26H-8zM10 22h26v16H10zM32 4h14v34H32zM48 18h12v20H48z" />
    <path fill={p.mid} d="M-6 14H4v22H-6zM12 24h22v12H12zM34 6h10v30H34zM50 20h8v16h-8z" />
    <path fill={p.glow} d="M-12 12v-2h4V6h2V2h4v4h2v4h6v2zM28 4V2h4v-4h2v-4h4v-4h2v4h2v4h4v4h4v2zM46 18v-2h4v-4h2V8h4v4h2v4h4v2z" />
    <path fill={p.light} className="pb-twinkle" d="M-2 20h2v4h-2zM36 12h4v6h-4zM38 24h2v4h-2zM52 24h2v4h-2zM14 28h2v2h-2zM28 28h2v2h-2z" />
    <path fill={p.ink} d="M20 30h6v8h-6z" /><path fill={p.light} opacity=".35" d="M-8 14H6v2H-8zM32 6h14v2H32zM48 20h12v2H48z" /></g>;
}
function Fireflies({ p }: { p: Palette }) {
  return <g className="pb-fireflies" fill={p.light}>{Array.from({ length: 18 }, (_, i) => <g key={i} transform={`translate(${(i * 73 + 26) % 630} ${28 + (i * 7) % 26})`}><rect x="-1" y="-1" width="4" height="4" opacity=".15" /><rect width="2" height="2" /></g>)}</g>;
}
function City({ p, industrial = false, gardens = false }: { p: Palette; industrial?: boolean; gardens?: boolean }) {
  return <>{Array.from({ length: 21 }, (_, i) => {
    const x = i * 32 - 10, y = 20 + ((i * 7) % 22), w = 18 + (i % 3) * 4;
    return <g key={i}><path fill={p.far} d={`M${x - 8} ${y - 7}h18v${64 - y}h-18z`} /><rect x={x} y={y} width={w} height={64 - y} fill={p.ink} />
      <rect x={x + 2} y={y + 2} width={w - 4} height={62 - y} fill={p.mid} opacity=".6" />
      {Array.from({ length: 5 }, (_, n) => <path key={n} fill={n % 2 ? p.light : p.glow} opacity={n % 3 ? ".65" : ".3"} d={`M${x + 4} ${y + 5 + n * 6}h2v2h-2zM${x + 10} ${y + 5 + n * 6}h2v2h-2z`} />)}
      {industrial ? <path fill={p.ink} d={`M${x + 3} ${y - 10}h4v10h-4zM${x + 1} ${y - 12}h8v3h-8z`} /> : null}
      {gardens ? <><path fill={p.glow} d={`M${x - 2} ${y}h${w + 4}v3H${x - 2}z`} /><path fill={p.far} d={`M${x + 4} ${y - 6}h6v6h-6zM${x + 12} ${y - 4}h8v4h-8z`} /></> : null}</g>;
  })}</>;
}
function Airship({ p }: { p: Palette }) {
  return <g className="pb-float"><g transform="translate(284 7)"><path fill={p.ink} d="M10 0h52v2h10v4h8v4h4v10h-4v4h-8v4H10v-2H2v-4h-6V10H2V4h8z" />
    <path fill={p.glow} d="M12 2h48v2h12v4h6v4h4v6h-4v4h-8v4H12v-2H4v-4H0v-8h4V6h8z" />
    <path fill={p.light} d="M16 4h42v2h12v4H10V8h6z" /><path fill={p.mid} d="M4 18h74v4h-8v4H12v-2H4zM20 4h2v20h-2zM40 2h2v24h-2zM60 4h2v20h-2z" />
    <path fill={p.ink} d="M-6 10h-8V6h-4v16h4v-4h8zM22 28h2v8h-2zM54 28h2v8h-2zM16 36h46v4h-4v4H24v-2h-8z" />
    <path fill={p.light} d="M28 37h4v3h-4zM36 37h4v3h-4zM44 37h4v3h-4z" /></g></g>;
}
function Gear({ p, x, y, size = 1 }: { p: Palette; x: number; y: number; size?: number }) {
  return <g transform={`translate(${x} ${y}) scale(${size})`}><g className="pb-gear"><path fill={p.glow} d="M-4-14h8v4h4v-2h4v4h-2v4h4v8h-4v4h2v4H8v-2H4v4h-8v-4h-4v2h-4V8h2V4h-4v-8h4v-4h-2v-4h4v2h4z" />
    <path fill={p.ink} d="M-4-6h8v2h2v8H4v2h-8V4h-2v-8h2z" /><path fill={p.light} d="M-2-2h4v4h-4z" /></g></g>;
}
function Smoke({ p }: { p: Palette }) {
  return <g className="pb-smoke" fill={p.light} opacity=".25"><path d="M88 23h8v-4h-12v-4h6v-4h-14v4h-6v4h10v4zM272 14h10v-4h-6V6h-16v4h8v4zM450 27h12v-4h-6v-6h-12v4h-4v4h10zM564 18h10v-4h-6V8h-12v4h-4v4h12z" /></g>;
}
function Rain({ p, snow = false }: { p: Palette; snow?: boolean }) {
  return <g className={snow ? "pb-snow" : "pb-rain"} fill={p.light} opacity={snow ? ".65" : ".28"}>
    {Array.from({ length: snow ? 48 : 64 }, (_, i) => <rect key={i} x={(i * 73) % 654 - 6} y={(i * 19) % 80 - 12} width="1" height={snow ? 1 : 4 + i % 3} />)}</g>;
}
function Palm({ p, x, y = 24 }: { p: Palette; x: number; y?: number }) {
  return <g transform={`translate(${x} ${y})`} fill={p.ink}><path d="M0 0h4v8H2v12H0v12h-4V18h2V8h2zM0 0v-4h8v2h8v4h4v6h-4V4H8V2H4v2h6v4h4v8h-4v-6H6V6H2V4h-4V2h-8v4h-4v6h-4V4h4V0h8v-2h-10v2h-8v4h-4V0h4v-4h8v-2h10v2z" /></g>;
}
function Grid({ p }: { p: Palette }) {
  return <><path fill={p.ink} d="M0 44h640v20H0z" /><g stroke={p.glow} opacity=".35" strokeWidth="1">
    {[0, 64, 128, 192, 256, 320, 384, 448, 512, 576, 640].map(x => <path key={x} d={`M${280 + x / 8} 44L${x} 64`} />)}
    <path className="pb-grid" d="M0 46h640M0 49h640M0 53h640M0 59h640M0 64h640" /></g></>;
}

function sceneArt(id: BannerId): ReactNode {
  const p = BANNER_PALETTES[id];
  switch (id) {
    case "mondburg": return <><Sky p={p} /><Moon p={p} /><Clouds p={p} /><Mountains p={p} snow /><Castle p={p} /><Water p={p} /></>;
    case "gluehwald": return <><Sky p={p} /><Moon p={p} x={296} /><Trees p={p} glow /><path fill={p.ink} d="M0 59h640v5H0zM288 50h8v-8h10v-4h16v4h10v8h8v14h-52z" /><path fill={p.glow} d="M300 50v-6h8v-2h12v2h8v6h-8v4h-10v-4z" /><path fill={p.light} d="M313 51h4v10h-4zM302 46h4v2h-4zM316 44h4v2h-4z" /><Fireflies p={p} /></>;
    case "drachenberge": return <><Sky p={p} /><Moon p={p} x={276} sun /><Mountains p={p} /><g className="pb-float" fill={p.ink}><path d="M314 17h8v-4h6v-3h10v4h6v4h-6v3h-8v4h-10v4h-16v-4h-12v-4h-8v-4h-8V9h6v4h10v4h10v-6h-6V7h-4V1h4v4h10v4h10zM306 29h4v4h-14v-4h-14v-4h20z" /><path fill={p.light} d="M332 14h2v2h-2z" /></g><path className="pb-twinkle" fill={p.glow} d="M342 20h8v2h6v2h-8v-2h-6zM94 53h6v4h4v7H90v-7h4zM470 52h4v6h4v6h-10v-6h2z" /></>;
    case "himmelsinseln": return <><Sky p={p} stars={false} /><Moon p={p} x={380} /><Clouds p={p} /><g className="pb-float"><path fill={p.ink} d="M270 40h100v4h-10v6h-12v6h-10v6h-18v-6h-14v-4h-16v-6h-20zM118 26h60v4h-8v8h-10v6h-14v-4h-12v-6h-16zM468 34h66v4h-10v8h-12v6h-14v-6h-16v-4h-14z" /><path fill={p.mid} d="M270 38h100v6H270zM118 24h60v6h-60zM468 32h66v6h-66z" /><Castle p={p} x={306} y={4} /><path className="pb-water" fill={p.light} opacity=".6" d="M346 44h4v20h-4zM156 30h2v34h-2zM494 38h4v26h-4z" /></g></>;
    case "kristallhoehle": return <><Sky p={p} stars={false} /><path fill={p.ink} d="M0 0h640v6h-28v14h-8V8h-20v6h-6V6h-38v18h-8V8h-18v4h-10V6h-42v8h-8V6h-46v4h-18V6h-34v10h-6V8h-26v4h-8V6h-56v6h-10V6h-32v16h-8V10h-18v6h-8V6h-40v10h-8V6h-36v18h-8V6H48v10h-8V6H18v22H8V6H0z" /><g fill={p.mid}>{[54, 132, 248, 308, 350, 454, 550, 604].map((x, i) => <g key={x}><path d={`M${x} 56v-${18 + i % 3 * 8}l6 -8 6 8v${18 + i % 3 * 8}z`} /><path fill={p.glow} d={`M${x + 6} ${30 - i % 3 * 4}h2v26h-2z`} /></g>)}</g><Water p={p} /><Fireflies p={p} /></>;
    case "luftschiffhafen": return <><Sky p={p} stars={false} /><Clouds p={p} /><City p={p} industrial /><path fill={p.ink} d="M210 20h4v44h-4zM206 20h38v4h-38zM236 24h2v18h-2zM406 10h4v54h-4zM406 10h42v4h-42zM440 14h2v24h-2z" /><Airship p={p} /><Smoke p={p} /></>;
    case "uhrwerkstadt": return <><Sky p={p} /><City p={p} /><path fill={p.ink} d="M298 18h40v46h-40zM304 10h28v8h-28zM314 2h8v8h-8z" /><path fill={p.mid} d="M302 20h32v40h-32z" /><Gear p={p} x={318} y={31} /><Gear p={p} x={270} y={56} size={1.3} /><Gear p={p} x={373} y={56} size={.8} /><path fill={p.light} d="M308 50h4v6h-4zM324 50h4v6h-4z" /><Clouds p={p} /></>;
    case "stahlwerk": return <><Sky p={p} stars={false} /><City p={p} industrial /><path fill={p.ink} d="M270 32h80v32h-80zM278 12h8v20h-8zM310 4h10v28h-10zM338 20h8v12h-8z" /><path fill={p.mid} d="M282 10h6v4h-12v-4zM306 2h18v4h-18z" /><path className="pb-twinkle" fill={p.glow} d="M278 44h12v10h-12zM302 44h12v10h-12zM326 44h12v10h-12z" /><Smoke p={p} /><path fill={p.ink} d="M0 60h640v4H0z" /></>;
    case "wuestenexpress": return <><Sky p={p} stars={false} /><Moon p={p} x={365} sun /><Mountains p={p} /><path fill={p.mid} d="M0 54h640v10H0z" /><path fill={p.ink} d="M0 59h640v2H0zM160 28h4v24h-4zM154 36h6v4h-8V28h2zM164 34h4v-8h2v10h-6zM510 36h4v20h-4zM514 42h4v-8h2v10h-6z" /><g className="pb-train"><path fill={p.ink} d="M245 42h26v12h-26zM273 42h26v12h-26zM301 38h16v6h18v10h-34zM326 34h4v10h-4zM304 54h8v4h-8zM324 54h8v4h-8zM248 54h6v4h-6zM263 54h6v4h-6zM276 54h6v4h-6zM291 54h6v4h-6z" /><path fill={p.light} d="M250 45h5v3h-5zM260 45h5v3h-5zM278 45h5v3h-5zM288 45h5v3h-5zM305 41h8v5h-8z" /><g className="pb-smoke" fill={p.light} opacity=".4"><path d="M326 28h8v4h-8zM314 24h10v4h-10zM300 18h14v4h-14z" /></g></g></>;
    case "eiswacht": return <><Sky p={p} /><Mountains p={p} snow /><path fill={p.mid} d="M0 60h80v-4h68v4h110v-4h82v4h108v-4h64v4h66v-4h62v8H0z" /><path fill={p.ink} d="M288 35h56v24h-56zM284 35v-4h12v-4h40v4h12v4zM310 8h8v23h-8zM304 6h20v4h-20z" /><path fill={p.light} d="M284 31h12v-4h40v4h12v4h-64z" /><path className="pb-twinkle" fill={p.glow} d="M294 40h8v6h-8zM330 40h8v6h-8zM310 42h12v17h-12z" /><Smoke p={p} /><Rain p={p} snow /></>;
    case "neonregen": return <><Sky p={p} /><City p={p} /><path fill={p.ink} d="M284 10h28v50h-28zM324 20h26v40h-26z" /><path fill={p.glow} d="M282 16h4v26h-4zM314 30h14v4h-14zM330 24h14v2h-14zM330 32h14v2h-14z" /><path className="pb-twinkle" fill={p.light} d="M292 18h12v2h-12zM292 26h12v2h-12zM294 34h2v12h-2zM300 34h2v12h-2zM332 38h6v8h-6z" /><Water p={p} /><Rain p={p} /></>;
    case "dachgaerten": return <><Sky p={p} stars={false} /><Moon p={p} x={374} sun /><City p={p} gardens /><path fill={p.light} d="M280 40v-6h4v-6h6v-4h12v4h6v6h4v6zM332 30v-6h4v-6h6v-4h12v4h6v6h4v6z" /><path fill={p.glow} d="M280 40h32v3h-32zM332 30h32v3h-32z" /><path fill={p.mid} d="M293 26h2v14h-2zM280 34h32v2h-32zM347 16h2v14h-2zM332 24h32v2h-32z" /><Clouds p={p} /><Fireflies p={p} /></>;
    case "biolabor": return <><Sky p={p} stars={false} /><City p={p} gardens /><path fill={p.ink} d="M254 14h134v50H254z" />{[278, 312, 346].map((x, i) => <g key={x}><path fill={p.mid} d={`M${x} 18h20v4h4v30h-4v4h-20v-4h-4V22h4z`} /><path fill={p.glow} opacity=".5" d={`M${x} 24h20v26h-20z`} /><g className="pb-float"><path fill={p.light} d={`M${x + 8} ${30 + i * 3}h6v4h-6zM${x + 4} ${38 + i * 2}h4v2h-4z`} /></g><path fill={p.light} d={`M${x} 22h2v28h-2z`} /></g>)}<Fireflies p={p} /></>;
    case "datenstrom": return <><Sky p={p} stars={false} /><g fill="none" stroke={p.mid} strokeWidth="2">{Array.from({ length: 16 }, (_, i) => <path key={i} d={`M${i * 44} 64V${12 + i % 4 * 10}h24V4`} />)}</g><g className="pb-data" fill={p.light}>{Array.from({ length: 26 }, (_, i) => <path key={i} d={`M${i * 26} ${i * 11 % 50}h2v4h-2zM${i * 26 + 8} ${i * 11 % 50 + 6}h4v2h-4z`} />)}</g><path fill={p.ink} d="M296 12h48v40h-48z" /><path fill={p.glow} d="M302 18h36v28h-36z" /><path fill={p.ink} d="M306 22h28v20h-28z" /><path fill={p.light} className="pb-twinkle" d="M314 28h12v8h-12z" /></>;
    case "tiefseestation": return <><Sky p={p} stars={false} /><Mountains p={p} /><path fill={p.ink} d="M266 40h108v6H266zM278 46h6v18h-6zM356 46h6v18h-6zM306 24h34v16h-34z" /><path fill={p.mid} d="M288 40V28h4v-8h8v-6h40v6h8v8h4v12z" /><path fill={p.glow} opacity=".6" d="M294 28v-6h10v-4h32v4h10v6z" /><path fill={p.light} d="M298 32h8v4h-8zM316 32h8v4h-8zM334 32h8v4h-8z" /><g className="pb-bubbles" fill="none" stroke={p.light} opacity=".55"><path d="M276 18h3v3h-3zM342 8h2v2h-2zM388 30h3v3h-3zM232 40h2v2h-2z" /></g><g className="pb-cloud" fill={p.glow}><path d="M168 20h8v2h-8zM166 18h2v6h-2zM434 28h10v2h-10zM444 26h2v6h-2z" /></g></>;
    case "sonnenraster": return <><Sky p={p} /><Moon p={p} x={304} y={2} sun /><Mountains p={p} /><Grid p={p} /><Palm p={p} x={241} y={27} /><Palm p={p} x={394} y={26} /><g className="pb-float"><path fill={p.ink} d="M306 48v-4h22v4h6v10h-34V48z" /><path fill={p.glow} d="M308 46h18v4h-18zM302 54h8v2h-8zM324 54h8v2h-8z" /></g></>;
    case "pastellpalmen": return <><Sky p={p} stars={false} /><Moon p={p} x={310} sun /><path fill={p.far} d="M0 42h640v22H0z" /><Water p={p} /><Palm p={p} x={258} y={21} /><Palm p={p} x={390} y={25} /><path fill={p.light} d="M290 44h8v16h-8zM288 42h12v2h-12zM286 60h16v2h-16zM346 42h8v18h-8zM344 40h12v2h-12zM342 60h16v2h-16z" /><Clouds p={p} /></>;
    case "raketenhafen": return <><Sky p={p} /><Mountains p={p} /><path fill={p.mid} d="M0 58h640v6H0zM280 54h80v4h-80z" /><path fill={p.ink} d="M344 16h4v40h-4zM332 16h16v2h-16zM334 30h12v2h-12z" /><g className="pb-float"><path fill={p.light} d="M314 10h4V6h4v4h4v8h4v26h-20V18h4z" /><path fill={p.glow} d="M314 10h4V6h4v4h4v8h-12zM310 38h20v6h-20z" /><path fill={p.ink} d="M316 24h8v8h-8zM310 34h-4v8h-4v8h8zM330 34h4v8h4v8h-8z" /><path fill={p.light} className="pb-twinkle" d="M316 44h8v8h-2v4h-4v-4h-2z" /></g><Clouds p={p} /></>;
    case "orbitalring": return <><Sky p={p} /><g className="pb-float"><Moon p={p} x={305} y={12} /><path fill={p.mid} d="M288 30h8v-4h14v2h-12v4h-8v8h12v2h30v-2h14v-4h10v-6h-12v-2h14v2h2v8h-10v4h-14v2h-36v-2h-12z" /><path fill={p.light} d="M290 38h10v2h32v-2h14v-2h8v2h-8v2h-14v2h-32v-2h-10z" /></g><path fill={p.glow} d="M216 20h10v4h-10zM220 16h2v12h-2zM402 46h12v4h-12zM406 42h2v12h-2z" /><path className="pb-comet" fill={p.light} d="M440 14h2v2h-2zM442 12h4v2h-4zM446 10h6v2h-6zM452 8h8v2h-8z" /></>;
    case "geisterstadt": return <><Sky p={p} /><Moon p={p} x={288} /><City p={p} /><Castle p={p} x={324} y={10} /><path fill={p.ink} d="M224 38h4v26h-4zM214 44h24v4h-24zM390 42h4v22h-4zM382 48h20v4h-20z" /><g className="pb-cloud" fill={p.light} opacity=".2"><path d="M0 50h180v4H0zM220 56h180v4H220zM448 48h192v4H448z" /></g><g className="pb-float" fill={p.light} opacity=".6"><path d="M266 44h6v2h2v8h-2v-2h-2v2h-2v-2h-2v2h-2v-8h2z" /></g></>;
  }
}

// Static trees are reused by the header and cards; no per-frame React work.
export const BANNER_ART = Object.fromEntries(Object.keys(BANNER_PALETTES).map(id => [id, sceneArt(id as BannerId)])) as Record<BannerId, ReactNode>;
