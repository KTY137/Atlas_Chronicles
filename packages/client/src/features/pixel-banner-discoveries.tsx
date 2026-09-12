// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import type { BannerId } from "@chronicle/theme";
import type { ReactNode } from "react";
import { BANNER_PALETTES } from "./pixel-banner-palettes";
import type { Palette } from "./pixel-banner-primitives";
import { Sky, Moon, Clouds, Mountains, Water, Trees, Fireflies, Smoke } from "./pixel-banner-primitives";

function Lantern({ p, x, y, color = p.glow }: { p: Palette; x: number; y: number; color?: string }) {
  return <g transform={`translate(${x} ${y})`}><path fill={p.mid} d="M0-10h1v5H0z" /><g className="pb-lantern-swing" style={{ animationDelay: `${-(x % 7) / 3}s` }}><g className="pb-lantern">
    <path fill={color} opacity=".08" d="M-7-4H7v13H-7z" /><path fill={p.ink} d="M-2-5h4v2h-4zM-2 5h4v2h-4z" />
    <path fill={color} d="M-3-3h6v8h-6z" /><path fill={p.light} d="M-1-2h2v6h-2z" /><path fill={color} d="M0 7h1v3H0z" />
  </g></g></g>;
}

function FallingWater({ p, x, y, height }: { p: Palette; x: number; y: number; height: number }) {
  return <svg x={x} y={y} width="7" height={height} viewBox={`0 0 7 ${height}`} overflow="hidden">
    <path fill={p.glow} opacity=".25" d={`M0 0h7v${height}H0z`} />
    <g className="pb-waterfall" fill={p.light} opacity=".65">{[-1, 0, 1, 2, 3].map(i => <path key={i} d={`M1 ${i * 12}h1v5H1zM4 ${i * 12 + 6}h1v4H4zM6 ${i * 12 + 2}h1v7H6z`} />)}</g>
  </svg>;
}

function Grass({ p, y = 88 }: { p: Palette; y?: number }) {
  return <><path fill={p.ink} d={`M0 ${y}h640v${96 - y}H0z`} />
    <path fill={p.mid} d={Array.from({ length: 75 }, (_, i) => { const x = (i * 47) % 640, top = y - (i % 3); return `M${x} ${top}h1v3h-1z m2 -2h1v4h-1z`; }).join("")} />
    <path fill={p.glow} opacity=".7" d={Array.from({ length: 30 }, (_, i) => `M${(i * 79 + 13) % 640} ${y + 3 + i % 4}h2v1h-2z`).join("")} /></>;
}

function Observatory() {
  const p = BANNER_PALETTES.sternwarte;
  return <><Sky p={p} seed={9} /><Moon p={p} x={393} y={7} />
    <g fill="none" stroke={p.glow} strokeWidth="1" opacity=".25"><path d="M218 17l14 7 14-12 13 13-5 12M472 11l14 5 16-6 11 18M69 20l18-8 14 9 19-4" /></g>
    <path fill={p.light} d="M217 16h2v2h-2zM231 23h2v2h-2zM245 11h2v2h-2zM258 24h2v2h-2zM253 36h2v2h-2z" />
    <path className="pb-comet" fill={p.light} d="M345 8h2v2h-2zM347 6h4v2h-4zM351 4h6v2h-6zM357 2h8v2h-8z" />
    <Mountains p={p} /><Water p={p} y={81} />
    <path fill={p.far} d="M167 91v-9h16v-6h20v-8h36v-6h33v-6h56v9h27v12h35v7h21v12H167z" />
    <path fill={p.ink} d="M177 96v-8h31v-9h24v-7h36v-6h66v12h34v18z" />
    <path fill={p.mid} opacity=".6" d="M203 79h29v-7h36v-6h66v2h-53v8h-38v6h-40zM339 82h16v3h-16zM245 89h12v2h-12z" />
    <path fill={p.ink} d="M282 43h65v32h-65zM294 39V29h5v-7h9v-4h22v4h9v7h5v10z" />
    <path fill={p.mid} d="M285 46h58v24h-58zM297 38v-8h5v-6h8v-3h18v3h9v6h4v8z" />
    <path fill={p.glow} opacity=".55" d="M297 34h44v4h-44zM309 22h2v12h-2zM325 22h2v12h-2zM284 44h61v2h-61z" />
    <path fill={p.light} opacity=".6" d="M305 25h3v2h-3zM299 31h3v2h-3zM285 46h1v21h-1zM292 70h47v1h-47z" />
    <path fill={p.ink} opacity=".28" d="M286 62h12v1h-12zM296 65h5v1h-5zM314 62h12v1h-12zM329 65h12v1h-12zM306 47h1v3h-1zM323 47h1v3h-1zM286 69h6v1h-6zM314 67h7v1h-7zM339 48h3v1h-3z" />
    <path fill={p.glow} opacity=".12" d="M286 59h14v8h-14zM311 59h14v8h-14zM327 59h14v8h-14z" />
    <path fill={p.ink} d="M316 24h5v20h-5zM279 42h71v3h-71zM302 63h8v12h-8z" />
    <g className="pb-lantern" fill={p.light}><path d="M290 51h5v8h-5zM315 51h5v8h-5zM331 51h5v8h-5z" /></g>
    <path fill={p.ink} d="M289 54h7v1h-7zM314 54h7v1h-7zM330 54h7v1h-7z" />
    <g transform="translate(321 26)"><g className="pb-dish"><path fill={p.ink} d="M-1 0h7v6h-7zM5-3h9V3H5zM13-7h9v7h-9zM20-10h7v7h-7z" />
      <path fill={p.glow} d="M1 0h5v3H1zM6-2h8v3H6zM14-5h8v3h-8zM22-9h3v5h-3z" /><path fill={p.light} d="M25-10h2v6h-2z" />
      <path fill={p.glow} opacity=".08" d="M27-10l29-17v31L27-4z" /><path fill={p.light} opacity=".4" d="M27-8h6v1h-6z" />
    </g></g>
    <g transform="translate(363 52)"><g className="pb-rotor" style={{ animationDuration: "18s" }} fill="none" stroke={p.glow} strokeWidth="1" opacity=".65"><path d="M-10-4h4v-6H4v6h6V4H4v6H-4V4h-6zM-15 0h30M0-15v30" /></g><path fill={p.light} d="M-2-2h4v4h-4z" /></g>
    <path fill={p.mid} d="M362 64h2v9h-2zM357 73h12v2h-12z" />
    <path fill={p.mid} d="M253 70h21v2h-21zM257 72h2v9h-2zM268 72h2v8h-2z" />
    <path fill={p.light} d="M254 66h6l3 2 3-2h6v4h-18z" /><path fill={p.ink} d="M262 68h1v2h-1z" />
    <g transform="translate(263 66)"><path className="pb-page-turn" fill="#f2dfb2" d="M0 0l8-4h3v6L0 4z" /><path fill="#aa8ea8" d="M-9 3h7v1h-7z" /></g>
    <g transform="translate(263 62)"><g className="pb-specimen" fill={p.light} opacity=".85"><path d="M-5-7h2v-2h2v2h2v2H-1v2h-2v-2h-2zM8-13h1v3h-1zM7-12h3v1H7z" /></g></g>
    <Lantern p={p} x={278} y={65} />
    {/* A wizard charts the sky; a black cat watches a much smaller star. */}
    <path fill={p.glow} d="M273 58h6v4h-6zM274 55h4v3h-4zM275 52h2v3h-2zM270 65h8v7h-8z" /><path fill={p.light} d="M273 62h4v3h-4z" />
    <path fill={p.ink} d="M350 70h2v-2h1v2h3v-2h1v7h-8v-3h1zM357 72h3v-5h1v7h-4z" /><path fill={p.light} d="M351 71h1v1h-1zM355 71h1v1h-1z" />
    <path fill={p.mid} d="M240 82h16v2h-16zM233 85h16v2h-16zM225 88h16v2h-16zM217 91h16v2h-16z" />
    <path fill={p.glow} opacity=".25" d="M282 79h12v1h-12zM309 84h18v1h-18zM340 89h8v1h-8zM335 77h6v1h-6zM257 87h7v1h-7z" />
    <path fill={p.mid} d="M237 79h1v-4h1v3h2v-2h1v4zM342 76h2v-4h1v4h3v-2h1v5h-7zM270 87h1v-3h1v5h-4v-3h1v1z" />
    <path fill={p.glow} opacity=".45" d="M371 86h23v1h-23zM367 90h34v1h-34zM377 94h18v1h-18z" />
    <Fireflies p={p} /></>;
}

function Temple() {
  const p = BANNER_PALETTES.versunkener_tempel;
  return <><Sky p={p} stars={false} />
    <g className="pb-water" fill={p.glow} opacity=".06"><path d="M225 0h12l-32 84h-29zM327 0h7l-8 83h-20zM424 0h14l27 87h-32zM82 0h8L55 85H29z" /></g>
    <path fill={p.far} d="M0 75h19V54h12V41h8v18h13v20h44V56h12v20h48V50h8V39h10v36h31V61h15v17h192V50h10V37h12v44h39V51h12v25h36V62h18v17h48V54h14v24h44V64h21v32H0z" />
    <path fill={p.ink} d="M246 76V36h12v-9h18v-8h84v8h18v9h12v40z" />
    <path fill={p.mid} d="M257 35v-5h22v-8h78v8h21v5zM250 76h139v4H250zM245 82h150v4H245zM240 88h161v4H240z" />
    <path fill={p.glow} opacity=".42" d="M278 24h79v2h-79zM260 31h23v2h-23zM357 31h18v2h-18zM246 82h148v1H246zM241 88h159v1H241z" />
    <path fill={p.ink} opacity=".5" d="M282 28h12v1h-12zM293 23h1v4h-1zM318 23h1v4h-1zM343 23h1v4h-1zM298 32h18v1h-18zM333 29h17v1h-17zM269 84h1v2h-1zM309 84h1v2h-1zM352 84h1v2h-1zM278 89h1v3h-1zM331 89h1v3h-1zM373 89h1v3h-1z" />
    <path fill={p.glow} opacity=".42" d="M279 22h5v3h-2v3h-2v4h-2v-6h1zM353 29h7v3h-3v5h-2v-4h-2zM246 86h9v2h-3v2h-5zM381 80h8v2h-8z" />
    {[259, 281, 348, 370].map((x, i) => <g key={x}><path fill={p.mid} d={`M${x} 39h11v34h-11zM${x - 2} 36h15v4h-15zM${x - 2} 73h15v4h-15z`} />
      <path fill={p.light} opacity=".25" d={`M${x + 1} 41h2v29h-2z`} /><path fill={p.ink} opacity=".6" d={`M${x + 8} 42h2v28h-2zM${x} ${48 + i * 5}h5v1h-5z`} />
      <path fill={p.glow} opacity=".55" d={`M${x - 1} 38h4v4h-2v5h-2zM${x + 7} 68h3v5h3v3h-6z`} /></g>)}
    <path fill={p.far} d="M303 72V46h4v-7h22v7h4v26z" /><path fill={p.glow} opacity=".12" d="M298 43h40v31h-40z" />
    <g className="pb-crystal-pulse" fill={p.glow}><path d="M312 47h12v2h4v12h-4v2h-12v-2h-4V49h4z" /></g>
    <path fill={p.ink} d="M314 50h8v2h3v6h-3v2h-8v-2h-3v-6h3z" /><path fill={p.light} d="M317 51h2v3h3v2h-3v3h-2v-3h-3v-2h3z" />
    <Grass p={p} y={93} />
    {[205, 224, 409, 431, 130, 490, 565, 38].map((x, i) => <g key={x} transform={`translate(${x} 93)`}><g className="pb-sway" fill={i % 2 ? p.mid : p.glow} opacity=".75"><path d="M0 0v-12h-3v-7h2v5h3v7h2v-15h2v9h3v-5h2v8H6v10z" /></g></g>)}
    <g transform="translate(354 13)"><g className="pb-cruise"><path fill={p.mid} d="M-8 2h16v2h5v6H8v2H-8v-2h-4V4h4z" /><path fill={p.glow} d="M-6 2H6v3h3v4H-9V5h3z" /><path fill={p.light} opacity=".4" d="M-4 3H0v2h-4zM2 6h4v2H2z" /><path fill={p.mid} d="M13 5h6v4h-6zM-12 7h-4v2h4z" /><g transform="translate(-4 11)"><g className="pb-tail" fill={p.mid}><path d="M-2 0h4v5h-4z" /></g></g><g transform="translate(7 11)"><g className="pb-tail" style={{ animationDelay: "-.6s" }} fill={p.mid}><path d="M-2 0h4v5h-4z" /></g></g><path fill={p.light} d="M16 5h1v1h-1z" /></g></g>
    <g transform="translate(318 55)"><g className="pb-rotor" style={{ animationDuration: "14s" }} fill={p.light} opacity=".65"><path d="M-14-2h2v4h-2zM12-2h2v4h-2zM-2-14h4v2h-4zM-2 12h4v2h-4z" /></g></g>
    <g transform="translate(278 22)"><g className="pb-cruise" style={{ animationDelay: "-3s" }} fill={p.glow}><path d="M0 0h9v3H0zM-3-1h2v5h-2zM16 5h7v2h-7zM13 4h2v4h-2z" /><path fill={p.light} d="M7 0h1v1H7zM21 5h1v1h-1z" /></g></g>
    {/* A tiny treasure chest shelters a shy octopus. */}
    <path fill="#b68e61" d="M228 80h18v11h-18z" /><path fill={p.ink} d="M229 81h16v5h-16zM229 88h16v1h-16z" /><path fill={p.light} d="M231 83h3v2h-3zM237 82h4v3h-4zM240 86h3v2h-3zM235 87h2v4h-2z" />
    <g transform="translate(228 80)"><g className="pb-chest-lid"><path fill="#ab8b63" d="M0-5h18v6H0z" /><path fill="#e4c189" d="M0-5h18v1H0zM3-4h2v5H3zM13-4h2v5h-2z" /></g></g>
    <g transform="translate(394 75)"><g className="pb-float" fill="#ce92ac"><path d="M0 0h7v2h2v5H7v3H5V7H3v4H1V7h-2V2h1z" /><path fill={p.ink} d="M1 3h1v2H1zM5 3h1v2H5z" /></g></g>
    {[231, 343, 422, 150].map((x, i) => <g key={x} transform={`translate(${x} ${24 + i * 12})`}><g className="pb-bubbles" style={{ animationDelay: `${-i * 2}s` }} fill="none" stroke={p.light} opacity=".45"><path d="M0 0h2v2H0zM6 10h3v3H6z" /></g></g>)}
  </>;
}

function MushroomHouse({ p, x, y, scale = 1, cap = p.glow }: { p: Palette; x: number; y: number; scale?: number; cap?: string }) {
  return <g transform={`translate(${x} ${y}) scale(${scale})`}>
    <path fill={p.ink} d="M-19 4h38v5H13v31h-27V9h-5z" /><path fill="#bea689" d="M-11 8h22v29h-22z" />
    <path fill="#8f786f" d="M6 9h5v28H6zM-11 32h22v5h-22z" /><path fill={p.light} opacity=".4" d="M-9 12h2v15h-2z" />
    <path fill="#8f786f" opacity=".7" d="M-10 25h3v1h-3zM-10 29h4v1h-4zM4 21h5v1H4zM6 26h4v1H6zM-6 11h3v1h-3z" />
    <path fill={cap} d="M-25 3v-4h5v-6h5v-5h8v-4H7v4h8v5h5v6h5v4z" />
    <path fill="#613d58" d="M-25 3h50v4h-7v2h-36V7h-7z" /><path fill={p.light} opacity=".7" d="M-13-8h5v3h-5zM1-12h5v3H1zM11-3h6v3h-6zM-4-1H0v3h-4z" />
    <path fill={p.ink} d="M-3 23h6v-3h3v17H-6V23zM-9 14h7v7h-7zM3 13h6v6H3z" />
    <g className="pb-lantern" fill={p.light}><path d="M-8 15h5v5h-5zM4 14h4v4H4zM-3 24h6v12h-6z" /></g>
    <path fill={p.ink} d="M-6 15h1v5h-1zM-8 17h5v1h-5zM-1 25h1v11h-1z" />
    <path fill={p.mid} d="M-12 15h3v5h-3zM-2 15h2v5h-2zM2 19h9v2H2z" /><path fill={cap} d="M4 19h1v1H4zM8 19h1v1H8z" />
    <path fill={p.mid} d="M-18 38h35v2h-35zM-14 40h27v2h-27z" />
  </g>;
}

function MushroomVillage() {
  const p = BANNER_PALETTES.pilzdorf;
  return <><Sky p={p} /><Moon p={p} x={382} y={4} /><Trees p={p} glow />
    <path fill={p.far} d="M0 72h40v-4h60v5h54v-7h58v4h62v-5h91v7h89v-4h80v5h56v-4h50v27H0z" />
    <path fill={p.ink} d="M73 0h13v68h-13zM174 0h15v72h-15zM450 0h18v74h-18zM560 0h12v74h-12z" />
    <path fill={p.mid} opacity=".45" d="M75 2h2v48h-2zM177 12h2v34h-2zM451 6h3v59h-3zM563 0h1v36h-1z" />
    <MushroomHouse p={p} x={259} y={47} scale={.8} cap="#c383a1" />
    <MushroomHouse p={p} x={329} y={38} cap="#d98285" />
    <MushroomHouse p={p} x={400} y={55} scale={.65} cap="#a496d0" />
    <MushroomHouse p={p} x={131} y={49} scale={.55} cap="#a496d0" />
    <MushroomHouse p={p} x={508} y={51} scale={.55} cap="#c383a1" />
    <path fill={p.ink} d="M287 47h3v25h-3zM364 42h3v27h-3z" /><path fill="none" stroke={p.mid} strokeWidth="1" d="M286 48l20 4 22-1 20-5 19-3" />
    <Lantern p={p} x={297} y={54} /><Lantern p={p} x={357} y={50} color="#c2c390" />
    <path fill={p.mid} d="M323 79h10v3h-15v3h-13v3h-14v8h-25v-5h16v-5h15v-4h16v-3z" /><path fill={p.light} opacity=".2" d="M319 80h8v1h-8zM305 86h9v1h-9zM284 91h11v1h-11z" />
    <Grass p={p} y={91} /><path fill={p.glow} d="M213 78h8v3h-8zM216 81h2v6h-2zM371 84h8v3h-8zM374 87h2v4h-2zM353 87h5v2h-5zM355 89h1v3h-1z" />
    <path fill={p.light} d="M214 78h2v1h-2zM375 84h2v1h-2z" />
    {/* A snail carries its own lit cottage; a fairy reads outside the bakery. */}
    <g transform="translate(239 87)"><g className="pb-snail-crawl"><path fill="#bcb693" d="M0 0h16v3H0zM13-3h3v4h-3zM14-5h1v2h-1zM17-5h1v5h-2z" /><path fill="#c68491" d="M3-7h7v2h2v5H1v-5h2z" /><path fill={p.light} d="M5-4h3v3H5z" /><path fill={p.ink} d="M14-5h1v1h-1zM17-5h1v1h-1z" /></g></g>
    <path fill={p.glow} d="M347 74h4v4h-4zM346 78h6v7h-6z" /><path fill={p.light} d="M346 75h2v2h-2zM340 80h5v3h-5zM351 80h5v3h-5z" />
    <g transform="translate(350 76)"><g className="pb-wing" fill="#c3ddc2" opacity=".75"><path d="M-7-1h3v5h-3zM2-2h3v5H2z" /></g></g>
    <Smoke p={p} x={335} y={24} /><Fireflies p={p} />
    {[{ x: 282, y: 41 }, { x: 369, y: 62 }].map(({ x, y }, i) => <g key={x} transform={`translate(${x} ${y})`}><g className="pb-fairy-flight" style={{ animationDelay: `${-i * 2.1}s`, animationDuration: `${5 + i * 2}s` }}>
      <path fill={p.light} opacity=".12" d="M-4-4h9v9h-9z" /><g className="pb-wing" fill="#c6e6cf"><path d="M-4-2h3v4h-3zM2-2h3v4H2z" /></g><path fill={p.glow} d="M0-1h2v5H0z" /><path fill={p.light} d="M0-3h2v2H0z" />
    </g></g>)}
    {[276, 318, 363].map((x, i) => <g key={x} transform={`translate(${x} ${23 + i * 7})`}><g className="pb-leaf-fall" style={{ animationDelay: `${-i * 1.9}s` }} fill={i % 2 ? p.light : p.glow}><path d="M0 0h3v1H0zM-1 1h4v2h-4zM0 3h2v1H0z" /></g></g>)}
  </>;
}

function Pagoda({ p, x, y, small = false }: { p: Palette; x: number; y: number; small?: boolean }) {
  return <g transform={`translate(${x} ${y}) scale(${small ? .55 : 1})`}>
    <path fill={p.mid} d="M-23 24h46v25h-46zM-15 1h30v21h-30z" /><path fill={p.light} opacity=".3" d="M-20 26h40v13h-40zM-12 4h24v10h-24z" />
    <path fill={p.ink} d="M-27 23h54v3h-54zM-18 0h36v3h-36zM-29 48h58v4h-58zM-18 25h3v23h-3zM15 25h3v23h-3zM-3 26h6v22h-6z" />
    <path fill={p.ink} d="M-35 22v-5h3v2h9v-4h10v-4h26v4h10v4h9v-2h3v5zM-26 0v-5h3v2h8v-4h9v-4H6v4h9v4h8v-2h3v5z" />
    <path fill={p.glow} d="M-32 20h12v-4h10v-3h20v3h10v4h12v1H19v-4H9v-3H-9v3h-10v4h-13zM-23-2h11v-4h8v-3h8v3h8v4h11v1H11v-4H3v-3H-3v3h-8v4h-12z" />
    <path fill={p.light} d="M-1-18h2v8h-2zM-5-14H5v1H-5z" />
    <Lantern p={p} x={-26} y={30} /><Lantern p={p} x={26} y={30} />
    <path fill={p.ink} d="M-21 39h42v1h-42zM-11 3h1v12h-1zM10 3h1v12h-1z" />
  </g>;
}

function CloudMonastery() {
  const p = BANNER_PALETTES.wolkenkloster;
  return <><Sky p={p} stars={false} /><Moon p={p} x={401} y={3} sun /><Mountains p={p} /><Clouds p={p} />
    <path fill={p.mid} d="M261 72h118v6h-12v6h-10v6h-17v6h-49v-8h-16v-7h-14zM121 58h77v5h-9v9h-18v6h-20v-7h-20v-7h-10zM455 59h70v6h-13v9h-15v10h-12v-9h-18v-8h-12z" />
    <path fill={p.ink} opacity=".7" d="M279 78h88v6h-10v6h-17v6h-38v-9h-12v-6h-11zM140 66h48v6h-17v6h-20v-7h-11zM472 67h39v7h-14v10h-12v-9h-13z" />
    <path fill={p.glow} opacity=".55" d="M261 72h118v2H261zM121 58h77v2h-77zM455 59h70v2h-70z" />
    <Pagoda p={p} x={320} y={22} /><Pagoda p={p} x={164} y={30} small /><Pagoda p={p} x={489} y={32} small />
    <path fill={p.mid} d="M359 72v-9h-3v-4h2v3h3v-6h2v16zM278 71v-8h2v8z" />
    <path fill="#677978" d="M350 60v-3h7v-3h9v3h5v3zM273 62v-3h6v-2h5v5z" /><path fill={p.light} opacity=".35" d="M351 57h6v1h-6zM358 55h7v1h-7zM276 59h5v1h-5z" />
    <path fill={p.light} opacity=".22" d="M267 76h17v2h-17zM292 80h14v2h-14zM308 87h12v1h-12zM335 81h8v2h-8zM317 93h12v1h-12zM480 69h11v1h-11zM153 69h9v1h-9z" />
    <path fill="none" stroke={p.ink} strokeWidth="2" d="M189 51l18 9 21 4 21-3 23-10M377 54l22 7 21 3 20-3 20-8" />
    <path fill="none" stroke={p.glow} strokeWidth="1" d="M189 56l18 9 21 4 21-3 23-10M377 59l22 7 21 3 20-3 20-8" />
    <path fill={p.mid} d="M196 54h1v7h-1zM208 60h1v6h-1zM220 63h1v6h-1zM232 63h1v6h-1zM244 62h1v6h-1zM257 57h1v7h-1zM391 59h1v6h-1zM403 62h1v6h-1zM417 63h1v6h-1zM431 63h1v5h-1zM445 60h1v5h-1z" />
    <FallingWater p={p} x={347} y={77} height={19} /><FallingWater p={p} x={147} y={66} height={30} /><FallingWater p={p} x={500} y={70} height={26} />
    <g fill={p.light} opacity=".22" className="pb-cloud"><path d="M0 87h30v-4h39v-4h45v5h30v5h51v7H0zM349 94h26v-5h40v-4h38v5h48v-6h44v5h48v-6h47v13H349z" /></g>
    {/* A monk shares the bridge with a red panda; koi swim through the clouds. */}
    <path fill="#bd7867" d="M234 55h4v4h-4zM233 59h6v7h-6z" /><path fill={p.light} d="M234 55h3v2h-3z" /><path fill={p.ink} d="M234 65h1v3h-1zM238 65h1v3h-1z" />
    <path fill="#c48665" d="M270 68h8v5h-8zM269 64h2v-2h1v2h4v-2h1v2h2v5h-10zM278 69h5v3h-5z" /><path fill={p.light} d="M270 65h2v2h-2zM275 65h2v2h-2zM280 69h1v3h-1z" />
    <g transform="translate(376 25)"><g className="pb-cruise"><path fill={p.light} d="M0 0h11v2h4v3h-4v2H0V5h-4V2h4zM15 2h3V0h2v7h-2V5h-3z" /><path fill="#df9f82" d="M2 0h5v2H2zM6 4h4v3H6z" /><path fill={p.ink} d="M-1 2h1v1h-1z" /></g></g>
    <g transform="translate(320 43)"><g className="pb-pendulum"><path fill={p.glow} d="M0 0h1v8h-1zM-3 8h7v3h2v3H-5v-3h2z" /><path fill={p.light} d="M-2 9h2v3h-2zM0 14h2v3H0z" /></g></g>
    <path fill={p.mid} d="M286 13h1v24h-1zM351 10h1v22h-1z" />
    <g transform="translate(287 14)"><path className="pb-flag-flutter" fill={p.glow} d="M0 0h13v3H9v3H0z" /></g>
    <g transform="translate(352 11)"><path className="pb-flag-flutter" style={{ animationDelay: "-.6s" }} fill={p.light} d="M0 0h11v3H7v3H0z" /></g>
    <path fill={p.light} opacity=".8" d="M253 19h5v2h5v-2h5v1h-4v3h-7v-3h-4zM368 10h4v2h3v-2h4v1h-3v3h-5v-3h-3z" />
    <g transform="translate(400 20)"><g className="pb-kite"><path fill="#cc9b83" d="M0-9l8 9-8 8-8-8z" /><path fill="#f0d7a5" d="M0-8V7l-7-7z" /><path fill="#eee3c6" d="M-7 0H7v1H-7zM0 0h1v21H0zM-2 13h5v2h-5zM-2 19h5v2h-5z" /></g></g>
  </>;
}

function Stall({ p, x, y, color }: { p: Palette; x: number; y: number; color: string }) {
  return <g transform={`translate(${x} ${y})`}>
    <path fill={p.ink} d="M-2 0h48v3H-2zM0 4h3v30H0zM40 4h3v30h-3zM-3 27h49v8H-3z" /><path fill={p.mid} d="M0 29h43v5H0z" />
    <path fill={color} d="M-4 0h51v9H-4zM-4 9h8v3h-8zM12 9h8v3h-8zM28 9h8v3h-8zM43 9h4v3h-4z" />
    <path fill={p.light} opacity=".65" d="M4 0h8v10H4zM20 0h8v10h-8zM36 0h7v10h-7z" />
    <path fill={p.glow} opacity=".14" d="M3 12h37v15H3z" /><path fill={p.light} d="M7 21h7v2h-7zM23 20h10v3H23z" />
    <path fill={color} d="M8 19h5v2H8zM24 18h3v2h-3zM29 18h3v2h-3z" /><Lantern p={p} x={40} y={17} />
    <path fill={p.ink} opacity=".4" d="M5 30h1v3H5zM17 30h1v3h-1zM30 30h1v3h-1z" />
  </g>;
}

function NightMarket() {
  const p = BANNER_PALETTES.nachtmarkt;
  return <><Sky p={p} /><Moon p={p} x={372} y={3} />
    <path fill={p.far} d="M0 35h18v-6h15v6h22v31h20V28h16v-8h14v8h17v39h33V30h21v-6h12v6h27v37h28V27h21v-8h16v8h29v37h37V29h20v-6h18v6h31v36h25V29h22v-7h13v7h24v37h22V31h19v-8h20v8h20v35h37V29h20v-7h14v7h24v67H0z" />
    <path fill={p.ink} d="M200 39h7v43h-7zM437 39h7v43h-7zM192 38h60v3h-60zM413 38h47v3h-47z" />
    <path fill="none" stroke={p.ink} strokeWidth="1" d="M149 16l57 9 58 9 58 3 60-5 61-9 53-9M32 27l40 6 47-3M502 24l59 9 52-6" />
    {[175, 212, 250, 290, 330, 370, 410, 451, 487, 61, 110, 552, 595].map((x, i) => <Lantern key={x} p={p} x={x} y={x < 150 || x > 500 ? 36 : 32 + Math.round(9 * Math.sin((x - 170) / 310 * Math.PI))} color={i % 3 === 1 ? "#c19ed3" : i % 3 === 2 ? "#d6b977" : p.glow} />)}
    <path fill={p.mid} d="M0 77h640v19H0z" /><path fill={p.light} opacity=".09" d={Array.from({ length: 70 }, (_, i) => `M${(i * 67) % 640} ${78 + i % 6 * 3}h${5 + i % 4 * 2}v1h-${5 + i % 4 * 2}z`).join("")} />
    <Stall p={p} x={213} y={45} color="#b06a83" /><Stall p={p} x={286} y={48} color="#718e94" /><Stall p={p} x={369} y={45} color="#a48a64" />
    <Stall p={p} x={111} y={46} color="#718e94" /><Stall p={p} x={492} y={47} color="#b06a83" />
    <path fill={p.ink} d="M225 60h6v6h-6zM223 66h10v5h-10zM296 62h6v5h-6zM294 67h10v7h-10zM382 60h5v6h-5zM380 66h9v5h-9z" />
    <path fill={p.light} d="M224 59h8v2h-8zM296 62h5v2h-5zM382 60h4v2h-4z" />
    <Smoke p={p} x={307} y={67} />
    <g transform="translate(303 66)"><g className="pb-gardener-arm" style={{ animationDuration: "3.2s" }}><path fill="#d9b697" d="M0-1h10v3H0z" /><path fill={p.ink} d="M10-4h2v10h-2z" /><path fill={p.light} d="M9 6h4v2H9z" /></g></g>
    <Water p={p} y={86} />
    <path fill={p.ink} d="M256 82h36v3h-36zM261 83h2v9h-2zM285 83h2v9h-2zM343 82h24v3h-24zM345 83h2v8h-2zM362 83h2v8h-2z" />
    {/* A paper boat, sleepy cat and a fox-mask visitor reward a second look. */}
    <g transform="translate(325 91)"><g className="pb-boat-glide" style={{ animationDuration: "12s" }}><path fill={p.light} d="M-7 0H7v2H4v2h-8V2h-3zM-1-5h1v5h-6z" /><path fill={p.glow} d="M0-5h1l5 5H0z" /></g></g>
    <path fill="#cfb796" d="M273 73h2v-2h1v2h5v4h-10v-3h2zM280 74h4v2h-4z" /><path fill={p.ink} d="M275 74h2v1h-2z" />
    <g transform="translate(350 73)"><path fill="#bc859f" d="M-3 0h7v8h-7z" /><path fill={p.light} d="M-3-6h2v-2h1v2h2v-2h1v2h2v5h-8z" /><path fill={p.glow} d="M-2-4h1v1h-1zM2-4h1v1H2z" /><path fill={p.ink} d="M-2 8h2v3h-2zM2 8h2v3H2z" /></g>
    <path fill={p.light} opacity=".45" d="M229 90h14v1h-14zM231 94h9v1h-9zM391 89h12v1h-12zM385 93h20v1h-20z" />
    <Fireflies p={p} />
    {[{ x: 302, y: 15 }, { x: 350, y: 20 }, { x: 256, y: 10 }].map(({ x, y }, i) => <g key={x} transform={`translate(${x} ${y})`}><g className="pb-festival-spark" style={{ animationDelay: `${-i * 1.4}s` }} fill={i % 2 ? "#c5adeb" : p.glow}><path d="M-1-10h2v4h-2zM-1 6h2v4h-2zM-10-1h4v2h-4zM6-1h4v2H6zM-7-7h2v2h-2zM5 5h2v2H5zM5-7h2v2H5zM-7 5h2v2h-2z" /></g></g>)}
  </>;
}

export const DISCOVERY_ART = {
  sternwarte: <Observatory />, versunkener_tempel: <Temple />, pilzdorf: <MushroomVillage />,
  wolkenkloster: <CloudMonastery />, nachtmarkt: <NightMarket />,
} satisfies Partial<Record<BannerId, ReactNode>>;
