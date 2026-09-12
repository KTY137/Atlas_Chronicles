// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import type { BannerId } from "@chronicle/theme";
import type { ReactNode } from "react";
import { BANNER_PALETTES } from "./pixel-banner-palettes";
import { Clouds, Fireflies, Gear, Moon, Rain, Sky, Smoke, Water, type Palette } from "./pixel-banner-primitives";

/** Hand-drawn miniature worlds. All texture and little inhabitants are deterministic. */
function Texture({ x = 0, y, width = 640, height, color, count = 100, seed = 3, opacity = .3 }: {
  x?: number; y: number; width?: number; height: number; color: string; count?: number; seed?: number; opacity?: number;
}) {
  return <g fill={color} opacity={opacity}>{Array.from({ length: count }, (_, i) =>
    <rect key={i} x={x + (i * 47 + seed * 13) % width} y={y + (i * 19 + seed * 7) % height} width={i % 4 === 0 ? 3 : 1} height="1" />
  )}</g>;
}

function Pine({ x, y, size = 1, dark, mid, tip, snow = false }: {
  x: number; y: number; size?: number; dark: string; mid: string; tip: string; snow?: boolean;
}) {
  return <g transform={`translate(${x} ${y}) scale(${size})`}>
    <path fill={dark} d="M-1-32h2v4h2v4h3v4h-2v2h5v4H6v2h6v4H7v2h7v4H2v7h-4v-7h-12v-4h7v-2h-5v-4h6v-2h-3v-4h5v-2h-2v-4h3v-4h2z" />
    <path fill={mid} d="M0-29h1v5h2v3H0zM-3-20h3v4h4v2h-8v-2h1zM-5-11h4v2h6v2h3v2H-8v-2h3z" />
    <path fill={tip} opacity={snow ? .95 : .45} d="M-1-30h2v5h-3v2h-2v-2h2zM-5-19h5v2h5v2H-6zM-7-10h5v2h7v1h5v2H-9v-2h2z" />
    <path fill={mid} d="M0-2h1v5H0z" />
  </g>;
}

function House({ x, y, wall, roof, p, width = 24 }: { x: number; y: number; wall: string; roof: string; p: Palette; width?: number }) {
  return <g transform={`translate(${x} ${y})`}>
    <path fill={p.ink} d={`M0 0h${width}v20H0zM-3 1v-3h4v-3h4v-3h4v-3h${width - 18}v3h4v3h4v3h4v3z`} />
    <rect x="1" y="1" width={width - 2} height="18" fill={wall} />
    <path fill={roof} d={`M-1-1v-2h4v-3h4v-3h${width - 14}v3h4v3h4v2z`} />
    <path fill={p.light} opacity=".3" d={`M3-4h${width - 6}v1H3zM7-7h${width - 14}v1H7zM1 2h${width - 2}v1H1z`} />
    <path fill={p.ink} d={`M1 12h${width - 2}v1H1zM${width / 2 - 1} 1h2v18h-2zM3 5h5v6H3zM${width - 8} 5h5v6h-5zM${width / 2 - 4} 14h6v6h-6z`} />
    <path fill={p.light} d={`M4 6h3v4H4zM${width - 7} 6h3v4h-3z`} />
    <path fill={p.glow} d={`M4 8h3v2H4zM${width - 7} 8h3v2h-3z`} />
    <path fill={p.mid} d={`M${width - 6}-6h3v-6h-3z`} />
  </g>;
}

function Lantern({ x, y, p }: { x: number; y: number; p: Palette }) {
  return <g transform={`translate(${x} ${y})`}><path fill={p.ink} d="M0-5h1v5h2v6h-5V0h2z" />
    <g className="pb-lantern"><path fill={p.glow} opacity=".08" d="M-6-3h12v14H-6z" /><path fill={p.glow} d="M-1 1h3v4h-3z" /><path fill={p.light} d="M0 1h1v3H0z" /></g>
  </g>;
}

function Cat({ x, y, color, eye }: { x: number; y: number; color: string; eye: string }) {
  return <g transform={`translate(${x} ${y})`}><path fill={color} d="M0 0h1v2h3V0h1v6H4v2h2v1h3V6h1v4H2V9H0z" /><path fill={eye} d="M1 3h1v1H1zM3 3h1v1H3z" /></g>;
}

function MoonCastle() {
  const p = BANNER_PALETTES.mondburg;
  return <><Sky p={p} seed={7} /><Moon p={p} x={355} y={3} /><Clouds p={p} />
    <path fill="#292e52" d="M0 49h14v-5h18v-7h12v-5h10v-6h8v6h8v5h12v7h18v5h38v-5h16v-8h10v-8h10v-6h8v6h10v8h14v8h36v-6h12v-8h10v-8h8v-6h8v6h10v8h12v8h32v8h24v-5h18v-6h12v-9h8v-8h10v-8h8v8h8v8h12v9h18v6h24v-7h14v-8h12v-7h8v7h12v8h18v7h38v-9h10v-8h8v-9h8v9h10v8h14v9h24v45H0z" />
    <path fill="#454d75" d="M172 28h10v-6h8v6h10v8h-9v-3h-7v4h-7v-4h-5zM420 25h8v-8h8v8h8v8h-8v-4h-8v4h-8z" />
    <path fill="#222f4c" d="M0 68h20v-5h32v-3h42v4h26v-7h30v-3h30v7h32v-4h24v-8h36v-4h76v7h22v5h34v4h46v-5h30v-3h42v6h28v5h42v-5h48v5h38v-4h22v36H0z" />
    <Water p={p} y={76} />
    <path fill="#3b4261" d="M234 68h10v-9h12v-8h26v-6h66v5h16v7h16v8h20v6h13v8H222v-5h12z" />
    <Texture x={240} y={54} width={140} height={23} color="#7b7892" count={68} />
    <g>
      <path fill="#141e39" d="M270 25h18v41h-18zM290 40h51v24h-51zM307 17h22v48h-22zM338 29h16v36h-16zM358 42h13v26h-13zM263 61h116v7H263z" />
      <path fill="#74759e" d="M272 27h9v34h-9zM309 19h12v41h-12zM292 42h45v19h-45zM340 31h8v30h-8zM360 44h6v19h-6z" />
      <path fill="#45496f" d="M281 27h5v34h-5zM321 19h6v43h-6zM348 31h4v30h-4zM366 44h3v19h-3z" />
      <path fill="#978faa" d="M271 27h16v2h-16zM308 19h20v2h-20zM339 31h14v2h-14zM292 42h45v2h-45zM265 62h110v2H265z" />
      <path fill="#444271" d="M267 25v-3h4v-4h3v-4h3v-5h2v5h3v4h3v4h5v3zM303 17v-2h4v-4h4V7h4V3h4v4h4v4h4v4h4v2zM335 29v-3h4v-4h3v-5h3v5h3v4h4v3zM355 42v-3h4v-4h4v-4h3v4h4v4h4v3z" />
      <path fill="#a18ac1" d="M270 23h16v1h-16zM274 18h8v1h-8zM306 15h23v1h-23zM310 11h15v1h-15zM338 27h12v1h-12zM359 40h12v1h-12z" />
      <path fill={p.ink} d="M311 21h6v9h-6zM274 35h4v7h-4zM313 39h4v7h-4zM342 39h4v7h-4zM298 49h4v6h-4zM326 49h4v6h-4zM362 49h3v5h-3zM311 53h12v11h-12v-8h2v-3z" />
      <g className="pb-twinkle" fill={p.light}><path d="M312 22h4v7h-4zM275 36h2v5h-2zM314 40h2v5h-2zM343 40h2v5h-2zM299 50h2v4h-2zM327 50h2v4h-2zM363 50h1v3h-1z" /></g>
      <path fill={p.glow} opacity=".65" d="M312 26h4v3h-4zM275 39h2v2h-2zM343 43h2v2h-2zM313 56h8v8h-8z" />
      <path fill="#b0a0b7" d="M268 57h5v1h-5zM279 48h4v1h-4zM311 33h5v1h-5zM319 17h5v1h-5zM320 47h5v1h-5zM337 57h6v1h-6zM348 50h3v1h-3z" />
      <path fill="#151d38" d="M278 7h1v7h-1zM345 13h1v8h-1z" /><g transform="translate(279 7)"><g className="pb-sway"><path fill="#b783b6" d="M0 0h8v2H5v2H0z" /><path fill="#e8b4c5" d="M0 0h5v1H0z" /></g></g>
    </g>
    <House x={239} y={55} wall="#74728c" roof="#746084" p={p} width={22} /><House x={388} y={58} wall="#686682" roof="#726183" p={p} />
    <path fill="#33324c" d="M398 73h106v6H398zM405 79h8v17h-8zM435 79h8v17h-8zM467 79h8v17h-8zM497 79h7v17h-7z" />
    <path fill="#79738b" d="M398 72h107v2H398zM404 69h2v3h-2zM414 69h2v3h-2zM424 69h2v3h-2zM434 69h2v3h-2zM444 69h2v3h-2zM454 69h2v3h-2zM464 69h2v3h-2zM474 69h2v3h-2zM484 69h2v3h-2zM494 69h2v3h-2zM404 68h92v1h-92z" />
    <g fill={p.light} opacity=".28" className="pb-water"><path d="M311 80h15v1h-15zM307 83h20v1h-20zM316 87h12v1h-12zM360 81h5v1h-5zM356 85h12v1h-12z" /></g>
    {[16, 47, 81, 132, 167, 201, 447, 486, 538, 580, 624].map((x, i) => <Pine key={x} x={x} y={77 + i % 3 * 6} size={i % 2 ? 1.1 : .8} dark="#13293a" mid="#294750" tip="#6b8b88" />)}
    <path fill="#101e31" d="M0 90h24v-3h42v4h28v-4h44v5h45v-3h26v7H0zM530 92h22v-5h29v3h33v-4h26v10H530z" />
    <Lantern x={392} y={70} p={p} /><Cat x={341} y={54} color="#c0a0a1" eye={p.light} />
    <g transform="translate(215 87)"><path fill="#9e897e" d="M0 0h17v2h-2v2H3V2H0z" /><path fill="#bbc5cf" d="M7-11h1v11H7zM8-10h2v2h2v2h2v2H8z" /></g>
  </>;
}

function GlowForest() {
  const p = BANNER_PALETTES.gluehwald;
  return <><Sky p={p} seed={11} /><Moon p={p} x={376} y={3} />
    <path fill="#133439" d="M0 43h20V10h7v33h27V1h8v42h29V20h6v23h29V6h10v37h30V16h6v27h31V0h7v43h28V17h8v26h40V0h6v43h37V10h7v33h35V2h6v41h37V14h8v29h32V0h8v43h24V21h7v22h32V4h9v39h28V10h7v33h32V0h8v43h28v53H0z" />
    <path fill="#214b44" d="M0 59h40v-7h40v5h43v-5h54v7h41v-5h39v-6h85v4h48v7h57v-6h58v3h43v-5h44v6h48v39H0z" />
    <Texture y={53} height={30} color="#70a780" count={210} opacity={.22} />
    <path fill="#0b262c" d="M0 81h45v-6h62v3h49v-5h55v6h50v-3h82v6h64v-7h62v4h54v-6h57v5h60v18H0z" />
    <path fill="#153e36" d="M286 66h-16v8h-19v5h-19v7h-24v4h-25v6h208v-6h-18v-5h-20v-7h-20v-9h-17z" />
    <path fill="#345b48" d="M298 65h10v5h-8v8h-10v4h-10v4h-14v4h-20v6h-23v-3h15v-5h18v-5h12v-5h14v-6h16z" />
    <g>
      <path fill="#102b2b" d="M266 75h-8v4h-24v-3h15v-8h10V53h6V28h-11V18h-10v-8h9v5h12v9h8v-7h9V2h14v20h8v-9h14V5h11v10h-6v14h-13v28h5v12h13v7h18v5h-25v-3h-20v-6h-15v5h-13v4h-18v-3h10z" />
      <path fill="#45634a" d="M275 19h7V4h7v24h12v29h4v14h10v5h-15v-8h-7V46h-5v25h-8v-3h-6V50h-3V31h-5v-8h-9v-5h15z" />
      <path fill="#63805a" d="M279 25h3v21h-3zM284 8h2v20h-2zM293 35h3v20h-3zM280 51h2v14h-2zM297 60h2v11h-2zM305 24h10v-7h3v10h-13z" />
      <path fill="#233f34" d="M288 30h2v9h-2zM280 46h6v2h-6zM290 59h6v2h-6zM271 59h2v10h-2z" />
      <path fill="#153d35" d="M219 10h15V5h23V1h63v5h24v6h15v8h-8v8h-15v5h-34v-5h-34v7h-26v-6h-19v-7h-11v-6h7z" />
      <path fill="#28684b" d="M225 9h28V5h64v5h20v6h12v5h-28v5h-22v-6h-32v5h-27v-6h-19z" />
      <path fill="#439264" d="M234 9h20V6h39v3h-11v5h-22v3h-24v-3h-12v-2h10zM304 10h24v4h12v3h-29v4h-12v-4h5z" />
      <Texture x={225} y={7} width={114} height={18} color="#9ec778" count={100} opacity={.45} />
      <path fill="#224330" d="M282 43h16v23h-16z" /><path fill="#a5ce83" d="M285 43h9v2h3v17h-14V45h2z" /><path fill="#eedfa0" d="M285 46h9v14h-9z" /><path fill="#766b47" d="M286 48h6v12h-6zM282 61h17v2h-17z" />
      <House x={246} y={35} width={24} wall="#ac9b64" roof="#a56355" p={p} />
      <House x={311} y={32} width={24} wall="#7c9768" roof="#91856a" p={p} />
      <path fill="#9b9469" d="M240 55h36v2h-36zM304 52h38v2h-38zM258 56h2v11h-2zM269 56h2v11h-2zM316 54h2v10h-2zM331 54h2v10h-2z" />
      <path fill="#314e3c" d="M307 54h3v5h-3zM311 56h2v7h-2zM247 57h3v5h-3z" />
    </g>
    <g stroke="#91805a" strokeWidth="1" fill="none"><path d="M334 49v8h7v2h9v2h17v-2h10v-2h7v-9M334 55h7v2h9v2h17v-2h10v-2h7" />{[337, 343, 349, 355, 361, 367, 373, 379].map((x, i) => <path key={x} d={`M${x} ${51 + Math.min(i, 7 - i)}v7`} />)}</g>
    <path fill="#27543d" d="M370 28h9v-8h13v4h11v7h9v11h-7v8h-14v11h-4v12h-11V60h4V47h-10v-6h-6v-8h6z" />
    <path fill="#55986c" d="M373 29h9v-6h7v5h11v6h8v5h-21v5h-14v-5h-6v-5h6z" />
    <path fill="#346951" d="M0 0h20v18h-5v23h7v17h-7v38H0zM617 0h23v96h-16V60h-7V39h6V19h-6z" />
    {[45, 93, 145, 194, 435, 472, 531, 590].map((x, i) => <Pine key={x} x={x} y={78 + i % 3 * 5} size={i % 2 ? 1.6 : 1.1} dark="#0d2e2b" mid="#20523d" tip="#568666" />)}
    {[63, 118, 206, 224, 348, 399, 452, 506, 572].map((x, i) => <g key={x} transform={`translate(${x} ${76 + i % 3 * 6})`}>
      <path fill="#c2d39a" d="M-1 0h3v8h-3z" /><path fill={i % 2 ? "#6bd3a2" : "#7fa8d0"} d="M-8 0v-3h3v-3h8v2h3v2h3v3z" /><path fill="#e0f0ad" d="M-4-4h2v2h-2zM2-2h3v1H2zM-8 0h17v1H-8z" />
    </g>)}
    <g transform="translate(325 82)"><path fill="#d98d56" d="M0 1h7V0h4v-2h1v5h-2v4H1V6h-4V4h-3V1h-2v-3h3v3h3z" /><path fill="#e8d1a0" d="M-8-2h3v3h-2zM7 4h3v2H7z" /><path fill="#101f24" d="M9 2h1v1H9zM1 7h1v2H1zM7 7h1v2H7z" /></g>
    <Lantern x={273} y={49} p={p} /><Lantern x={336} y={40} p={p} /><Lantern x={383} y={49} p={p} /><Fireflies p={p} />
    <path fill="#102c26" d="M15 95v-8h2v4h2v-9h2v8h3v-4h2v9zM168 95v-5h-3v-3h5v4h2v-10h2v14zM419 96v-8h3v-4h2v8h3v-3h2v7zM548 96V85h2v6h3v-10h2v9h3v6z" />
  </>;
}

function DragonMountains() {
  const p = BANNER_PALETTES.drachenberge;
  return <><Sky p={p} stars={false} /><Moon p={p} x={254} y={7} sun />
    <path fill="#593046" d="M0 56h20V45h13V32h9V19h9V7h7v12h9v13h11v13h12v11h28V42h15V28h12V17h8V7h7v10h10v11h12v14h17v14h36V43h17V31h9V21h8v10h11v12h16v13h36V43h14V28h11V17h8v11h10v15h13v13h40V43h12V28h12V12h9V0h7v12h9v16h11v15h15v13h28V43h11V30h10V18h8v12h11v13h17v13h22V43h16V29h9V17h9v12h8v14h13v13h30v40H0z" />
    <path fill="#9e5555" d="M45 22h7V8h5v15h7v13h-8v-9h-5v10h-9v-8h3zM433 17h7V2h6v16h8v12h-7v-7h-6v12h-8z" />
    <path fill="#432938" d="M0 78h20V65h17V54h11V43h12V32h8v11h11v11h12v11h17v13h35V66h17V52h12V40h10V30h7v10h13v12h15v14h18v12h28V64h20V49h14V36h11V24h8v12h11v13h15v15h20v14h27V65h17V54h12V41h11V32h9v9h11v13h15v11h18v13h26V63h16V52h11V42h9V31h8v11h12v10h15v11h16v15h33V66h14V55h13V42h9V31h8v11h10v13h15v11h15v30H0z" />
    <path fill="#75413f" d="M65 35h3v12h8v11h10v12h15v13H84V69H72V56H61V47h4zM309 27h5v14h9v12h14v14h19v14h-20V67h-14V53h-10V43h-9v-7h6zM505 35h4v13h12v9h15v9h13v17h-18V69h-13V58h-13V47h-6v-6h6z" />
    <Texture y={60} height={32} color="#c37960" count={180} opacity={.2} />
    <path fill="#271d2d" d="M0 90h34v-6h41v5h31v-9h38v4h38v8h41v-8h28v-6h36v-7h40v7h28v9h30v5h37v-5h32v-7h31v9h29v-5h44v8h44v-5h37v9H0z" />
    <path fill="#b5523c" d="M327 73h7v7h9v5h-4v5h19v6h-42v-4h11v-6h-5v-5h5zM85 86h9v5h9v5H77v-4h8zM490 83h6v8h10v5h-23v-5h7z" />
    <g className="pb-lantern"><path fill="#fcb45c" d="M329 75h2v8h5v3h-4v7h17v2h-24v-3h4v-9h-2v-3h2zM88 88h3v6h6v1H82v-2h6zM493 85h1v7h7v3h-12v-3h4z" /></g>
    <g transform="translate(311 57)">
      <g className="pb-float">
        <path fill="#321a2b" d="M-8 7h-7V1h-8v-6h-10v-7h-9v-8h-8v-9h-6v-8h8v4h9v5h10v7h9v7h7v-7h7v-11h7v-13h6v-9h6v13h5v12h5v12h7v10h8v10h-15v5h-19v4h-9v4h-15v-4h-9v-4h-15v-4h-8v-6h6v3h11v4h14z" />
        <g className="pb-wing"><path fill="#954449" d="M-11 0h-5v-8h-10v-8h-10v-7h-10v-7h-5v-5h7v5h10v5h10v7h8v7h5zM-3-6h5v-15h7v-13h5v-11h3v14h5v13h5v12h5v7h-8v-6h-8v-6H8v5z" />
          <path fill="#d66f59" d="M-46-32h3v5h9v5h10v7h9v8h-2v-6h-10v-7h-10v-6h-9zM15-40h2v14h-3v14h-3v6H8v-9h4v-15h3z" />
          <path fill="#642c3b" d="M-33-20h3v7h9v8h7v4h-4v-5h-9v-6h-6zM20-24h3v11h5v11h-5v-8h-5v-9h2z" />
        </g>
        <path fill="#ae5147" d="M-16 9h9V4H4V1h12v-5h7v-6h5v-8h6v-4h10v-4h3v6h8v3h-1v5h-9v5h-8v6h-6v8h-9v8H2v2h-12v-4h-13v-4h-9V4h5v4h11z" />
        <path fill="#e49c68" d="M-16 13h9v2H3v-2h12V9h9V4h6v-7h6v-6h9v-4h8v2h-8v5h-7v6h-5v8h-8v8H3v3h-14v-3h-8z" />
        <path fill="#692b37" d="M30-17h5v-4h9v3h8v3H40v5h-9zM4 2h9v4H4zM-9 8h5v3h-5zM20 0h6v3h-6z" />
        <path fill="#ffd496" d="M41-17h2v2h-2zM48-10h2v3h-2zM3 17h3v7H3zM-4 23h10v2H-4zM20 14h4v8h-4zM16 21h9v2h-9z" />
        <path fill="#f8b16d" d="M32-24h2v-5h2v7h-4zM18-8h2v-5h2v5zM9 0h2v-5h2v5zM-1 3h2v-4h2v4z" />
      </g>
    </g>
    <g transform="translate(371 46)"><g className="pb-spark"><path fill="#e88448" d="M0 0h7v2h6v-3h4v3h8v3h-5v2h-9V5H5V3H0z" /><path fill="#ffdb83" d="M1 1h6v2h6v2H8V3H1z" /><path fill="#fbbb62" d="M29 1h2v1h-2zM25 7h2v2h-2zM35 5h1v1h-1z" /></g></g>
    <g transform="translate(254 73)"><path fill="#b9bac0" d="M1 0h5v4H1zM0 5h6v7H0zM1 12h2v4H1zM5 12h2v4H5zM10-4h1v16h-1zM8 4h5v1H8z" /><path fill="#8b3e49" d="M-2 4h3v10h-6v-3h3zM1-2h5v2H1z" /><path fill="#f9d99a" d="M0 7h4v5H0z" /><path fill="#262131" d="M3 1h3v1H3z" /></g>
    <g fill="#f2b273" className="pb-spark"><path d="M283 83h1v2h-1zM358 76h1v1h-1zM103 84h1v1h-1zM495 73h1v2h-1zM343 67h1v1h-1z" /></g>
  </>;
}

function SkyIslands() {
  const p = BANNER_PALETTES.himmelsinseln;
  return <><Sky p={p} stars={false} /><Moon p={p} x={399} y={1} /><Clouds p={p} />
    <path fill="#8a90b1" opacity=".35" d="M0 61h25v-4h29v-4h37v4h31v5h47v-6h28v-4h46v4h29v6h45v-4h27v-5h38v4h30v5h52v-4h24v-5h38v4h30v5h49v-5h22v-4h33v4h25v5h38v34H0z" />
    <g opacity=".5"><path fill="#505876" d="M64 41h60v5h-7v6h-12v7H87v-6H73v-6h-9zM450 29h43v5h-8v7h-13v5h-8v-6h-8v-6h-6zM536 58h73v6h-12v7h-11v6h-18v-7h-15v-6h-17z" /><path fill="#7b9d8d" d="M64 39h60v4H64zM450 27h43v4h-43zM536 56h73v4h-73z" /></g>
    <g transform="translate(0 0)"><g className="pb-float">
      <path fill="#354956" d="M244 53h125v7h-12v7h-14v9h-10v11h-15v8h-12v-9h-16v-8h-14v-8h-15v-8h-17z" />
      <path fill="#727576" d="M259 59h30v8h10v11h12v11h8v-7h8V69h8V59h21v7h-13v11h-11v9h-14v7h-8v-9h-15v-9h-18v-9h-18z" />
      <path fill="#98948d" d="M264 60h12v7h9v8h8v4h-8v-8h-14v-6h-7zM313 62h5v13h-3v10h-3V73h-4v-7h5z" />
      <path fill="#487963" d="M241 53v-3h15v-4h24v-5h51v4h25v4h16v7h-20v3h-34v-2h-31v2h-23v-3h-23z" />
      <path fill="#84b584" d="M248 51h17v-4h22v-4h39v4h25v3h16v3h-50v-2h-30v3h-39z" />
      <Texture x={250} y={48} width={111} height={8} color="#d6d69c" count={62} opacity={.7} />
      <path fill="#7daaad" d="M339 55h9v29h-2v12h-9V83h2z" /><g className="pb-water"><path fill="#d3f2e9" d="M339 55h3v27h-2v14h-2V81h1zM346 56h1v17h-1zM343 78h1v18h-1z" /></g>
      <House x={277} y={30} wall="#dfc99b" roof="#798caf" width={32} p={p} />
      <path fill="#46526a" d="M306 49V23h3V11h3V5h13v6h3v12h3v26z" /><path fill="#ded2a6" d="M310 24h17v24h-17zM313 12h11v12h-11z" /><path fill="#a8aa92" d="M322 25h5v23h-5zM320 12h4v11h-4z" />
      <path fill="#688399" d="M307 12V9h4V5h4V1h8v4h4v4h4v3z" /><path fill="#ead5ab" d="M310 11h19v1h-19z" />
      <path fill="#566473" d="M316 33h6v7h-6zM315 43h7v6h-7z" /><path fill={p.light} d="M318 34h3v5h-3z" />
      <g transform="translate(318 24)"><g className="pb-gear"><path fill="#f5e7bd" d="M-1-2h3v-17h5v13H3v7h16v5H6V3H0v16h-5V6h3V0h-17v-5h13v3z" /><path fill="#91abb0" d="M3-16h2v7H3zM9 3h7v1H9zM-4 9h1v7h-1zM-16-4h7v1h-7z" /><path fill="#866c59" d="M-2-2h5v5h-5z" /><path fill="#f0c98d" d="M-1-1h2v2h-2z" /></g></g>
      <path fill="#6b8c5b" d="M257 43v-8h3v-6h4v6h3v8h-4v8h-3v-8zM350 42v-6h4v-5h4v5h3v6h-4v9h-3v-9z" />
      <path fill="#c7d6a5" d="M258 36h3v-4h2v6h-5zM351 37h4v-3h2v5h-6z" />
      <path fill="#bfb791" d="M310 49h15v1h-15zM306 51h16v1h-16zM301 53h18v1h-18z" />
      <g transform="translate(291 42)"><path fill="#b68ea8" d="M0 0h3v2h-3zM-1 3h5v5h-5z" /><path fill="#eaddb9" d="M0-2h3v2H0z" /><path fill="#574d71" d="M0 8h1v2H0zM3 8h1v2H3z" /></g>
    </g></g>
    <g transform="translate(172 48)"><g className="pb-float"><path fill="#485466" d="M-25 5h55v5H20v7H8v10H0v-7h-12v-6h-13z" /><path fill="#8abb99" d="M-27 3h59v4h-59z" /><path fill="#6d90a8" d="M-6 8h4v34h-4z" /><path fill="#d1f0e7" className="pb-water" d="M-6 8h1v34h-1z" /><Pine x={0} y={3} size={.8} dark="#416362" mid="#6c9c7d" tip="#b3d5a0" /></g></g>
    <g transform="translate(417 65)"><g className="pb-float"><path fill="#51526e" d="M-24 4h51v6H16v8H6v9H-2v-6h-9v-7h-9V9h-4z" /><path fill="#94b695" d="M-26 1h55v5h-55z" /><House x={-11} y={-17} width={22} wall="#dfbca0" roof="#9b789a" p={p} /></g></g>
    <g transform="translate(218 17)"><g className="pb-float"><path fill="#829fc0" d="M-13 1h7v-4h16v3h8v5h-4v4H0v-2h-8V4h-5zM-13 2h-5v-5h-3v9h8zM6 9h4v5H7v-2H4V9z" /><path fill="#bed6d6" d="M-7 5H9V4h7v2h-3v2H0V6h-7z" /><path fill="#e9e9c9" d="M11 1h1v1h-1z" /><path fill="#b5dada" opacity=".7" d="M4-6h1v-5H4zM1-11h6v-1H1z" /></g></g>
    <g fill="#e5e5cc"><path d="M363 16h3v1h3v-1h3v2h-3v1h-3v-1h-3zM373 21h2v1h2v-1h2v2h-6z" /></g>
    <path fill="#c5c2d1" opacity=".2" className="pb-cloud" d="M0 84h55v-4h36v4h25v4H0zM471 87h34v-5h43v4h50v-4h42v9H471z" />
  </>;
}

function CrystalCave() {
  const p = BANNER_PALETTES.kristallhoehle;
  const crystals = [{ x: 53, y: 80, h: 37 }, { x: 120, y: 78, h: 23 }, { x: 207, y: 70, h: 26 }, { x: 249, y: 73, h: 45 }, { x: 285, y: 74, h: 27 }, { x: 331, y: 68, h: 51 }, { x: 357, y: 74, h: 35 }, { x: 408, y: 73, h: 22 }, { x: 468, y: 80, h: 43 }, { x: 565, y: 79, h: 30 }, { x: 601, y: 84, h: 48 }];
  return <><Sky p={p} stars={false} />
    <path fill="#292344" d="M0 0h640v69h-24V44h-13V30h-22v-9h-31v8h-25v19h-20v18h-28V35h-12V18h-26v-8h-26v11h-18v27h-24v19h-25V32h-14V16h-33V8h-24v8h-18v20h-13v28h-25V36h-13V23h-25V9h-26v12h-25v27h-17v16H95V37H80V21H59v-7H36v16H22v21H0z" />
    <path fill="#3a2c53" d="M0 0h640v8h-25v12h-8V9h-26v8h-7V7h-47v24h-6V11h-17v6h-9V6h-42v7h-8V6h-39v14h-6V8h-27v5h-8V6h-49v11h-7V6h-34v6h-8V6h-42v15h-7V11h-17v17h-6V6h-38v9h-6V7h-44v15h-7V8H88v7h-7V8H48v25h-7V12H21v29h-8V8H0z" />
    <path fill="#725587" opacity=".28" d="M313 18h5v41h-5zM245 37h3v31h-3zM466 43h6v33h-6zM57 36h4v42h-4zM351 47h3v23h-3z" />
    <path fill="#1d263e" d="M0 76h40v-4h47v4h56v-6h45v5h44v-7h44v5h60v-9h42v7h46v-3h42v7h58v-5h45v6h42v-5h29v25H0z" />
    <Water p={p} y={79} />
    <path fill="#284354" d="M213 80h34v-3h85v-2h37v4h32v4h-28v3h-38v4h-74v-4h-34v-3h-14z" />
    <path fill="#407586" opacity=".5" d="M245 82h39v-3h58v-1h18v3h18v2h-28v3h-64v2h-25v-2h-16z" />
    {crystals.map(({ x, y, h }, i) => <g key={x} transform={`translate(${x} ${y})`}>
      <path fill={i % 2 ? "#7765b3" : "#5a8daf"} d={`M-7 0v-${h - 9}h2v-4h3v-5h3v5h4v5h3V0z`} />
      <path fill={i % 2 ? "#b19ade" : "#93d4d5"} d={`M-2-${h}h3v${h}h-3zM-5-${h - 5}h3v${h - 5}h-3z`} />
      <path fill={i % 2 ? "#55427e" : "#3a5f7a"} d={`M4-${h - 9}h4v${h - 9}H4z`} />
      <path fill="#e0f0e5" d={`M-2-${h}h2v5h-2zM-5-${h - 6}h1v${Math.floor(h / 2)}h-1z`} />
      <path fill="#c0ace8" opacity=".5" d={`M-5-${Math.floor(h / 3)}h6v1h-6zM1-${h - 12}h5v1H1z`} />
      <path fill="#546592" d="M-7 0h-8v-8h-2v-6h3v3h4v5h3zM8 0h7v-10h2v-7h-3v4h-3v6H8z" />
      <path fill="#aaa4df" d="M-14-11h2v10h-2zM13-12h1v10h-1z" />
      <path fill="#c8ebdc" opacity=".11" d="M-13 1h27v3h-27z" />
    </g>)}
    <g className="pb-twinkle" fill="#f3edd9"><path d="M249 38h1v3h3v1h-3v3h-1v-3h-3v-1h3zM331 21h1v2h2v1h-2v2h-1v-2h-2v-1h2zM356 50h1v3h3v1h-3v3h-1v-3h-3v-1h3zM56 50h1v2h2v1h-2v2h-1v-2h-2v-1h2z" /></g>
    <path fill="#1c1931" d="M0 83h24v-8h26v6h32v8h35v-5h26v-5h38v6h24v11H0zM384 91h21v-8h27v-3h34v6h28v-5h30v6h31v-7h31v7h26v-6h28v15H384z" />
    <path fill="#45405d" d="M0 82h24v-8h26v4H28v7H0zM85 87h30v-4h25v-5h38v3h-34v5h-26v3H85zM407 83h26v-4h32v3h-30v3h-28zM526 85h26v-6h31v3h-28v5h-29z" />
    <Texture y={83} height={13} color="#8c7198" count={130} opacity={.3} />
    <g transform="translate(229 83)"><path fill="#8c6c53" d="M-12-1h22v2h-22zM-10-2h2v9h-2zM6-2h2v9H6z" /><path fill="#bdaa6c" d="M-12-1h22v1h-22z" /><path fill="#eac483" d="M-2-11h4v4h-4z" /><path fill="#759a9f" d="M-3-6h6v6h-6z" /><path fill="#d9c899" d="M-4-12h8v2h-8zM-2-15h4v3h-4z" /><path fill="#ecf4bf" d="M3-12h2v2H3z" /><path fill="#667283" d="M-2 0h2v3h-2zM2 0h2v3H2zM8-10h1v10H8zM4-11h9v1H4z" /></g>
    <g transform="translate(398 81)"><path fill="#8e615c" d="M0-7h12v9H0z" /><path fill="#d4a576" d="M0-7h12v2H0zM0-1h12v1H0zM1-5h1v6H1zM10-5h1v6h-1z" /><path fill="#fae7a2" d="M5-3h3v4H5z" /><path fill="#28243d" d="M6-2h1v1H6z" /></g>
    <g transform="translate(304 11)"><path fill="#13162c" d="M-8 0h4v3h3V1h2v2h3V0h4v5H4v3H1v3h-2V8h-3V5h-4z" /><path fill="#e6ceab" d="M-1 4h1v1h-1zM1 4h1v1H1z" /></g>
    <Fireflies p={p} />
  </>;
}

function AirshipHarbor() {
  const p = BANNER_PALETTES.luftschiffhafen;
  return <><Sky p={p} stars={false} /><Clouds p={p} />
    <path fill="#80654f" opacity=".5" d="M0 61h15V47h14V36h9v11h14v14h29V43h18V30h7v13h14v18h29V48h17V39h13v9h17v13h28V42h18V29h11v13h19v19h30V44h19V34h10v10h21v17h30V48h15V37h9v11h18v13h29V41h20V28h9v13h19v20h29V46h17V35h12v11h19v15h27V44h19V29h10v15h19v17h31V40h15V26h9v14h18v21h27v35H0z" />
    <path fill="#5a4f49" d="M0 76h34V65h29V59h23v17h30V55h18V43h6v12h27v21h22V62h21V52h8v10h26v14h40V59h19V50h9v9h31v17h29V61h28V50h7v11h28v15h30V60h30V49h9v11h24v16h24V58h22V45h9v13h19v18h33V62h26V52h9v10h18v14h31v20H0z" />
    <Water p={p} y={80} />
    <path fill="#332f35" d="M0 78h640v5H0zM29 83h6v13h-6zM94 83h6v13h-6zM163 83h6v13h-6zM227 83h6v13h-6zM295 83h6v13h-6zM362 83h6v13h-6zM429 83h6v13h-6zM497 83h6v13h-6zM563 83h6v13h-6zM631 83h6v13h-6z" />
    <path fill="#ba9570" d="M0 77h640v2H0z" /><Texture y={79} height={3} color="#e4c595" count={100} opacity={.4} />
    <g>
      <path fill="#40373a" d="M221 21h6v56h-6zM216 21h48v4h-48zM251 25h2v34h-2zM214 74h20v4h-20zM399 14h7v64h-7zM394 14h53v4h-53zM437 18h2v32h-2zM391 75h23v3h-23z" />
      <path fill="#bd9266" d="M222 25h2v47h-2zM400 18h2v55h-2zM219 21h40v1h-40zM397 14h45v1h-45z" />
      <g stroke="#836548" strokeWidth="1"><path d="M226 26l20-4M226 36l13-12M225 44l-4 6m4 3-4 6m4 3-4 6M405 19l23-3M405 31l14-13M400 38l5 7-5 7 5 7-5 7" /></g>
      <path fill="#a78761" d="M249 57h6v2h-6zM436 49h5v2h-5z" />
    </g>
    <House x={179} y={57} width={30} wall="#b59371" roof="#6b6865" p={p} />
    <House x={428} y={57} width={34} wall="#ad8d6a" roof="#70605a" p={p} />
    <path fill="#4a4040" d="M469 45h38v32h-38zM474 37h28v8h-28zM478 30h20v7h-20z" /><path fill="#9a8063" d="M472 48h32v27h-32zM477 39h22v7h-22z" />
    <path fill="#e1c498" d="M479 53h6v7h-6zM491 53h6v7h-6zM481 40h3v4h-3zM491 40h3v4h-3z" /><path fill="#423938" d="M480 66h15v11h-15z" />
    <path fill="#423b3a" d="M153 33h5v45h-5zM142 33h31v3h-31zM146 36h2v21h-2zM541 31h4v47h-4zM531 31h27v3h-27zM551 34h1v23h-1z" />
    <g transform="translate(270 8)"><g className="pb-float">
      <path fill="#332b34" d="M15 0h69v2h15v3h12v5h9v6h4v10h-4v6h-9v4h-15v3H16v-2H4v-4H-5v-6h-5V13h5V7H4V3h11z" />
      <path fill="#b88755" d="M16 2h66v2h16v3h11v4h9v6h4v8h-4v6h-9v3H95v3H17v-2H5v-4H-3v-5h-5V14h5V9H5V5h11z" />
      <path fill="#d4ae77" d="M18 3h60v2h17v3h12v4h9v6H-5v-4h5v-4h7V6h11z" />
      <path fill="#f0d7a6" d="M21 5h54v2h19v3h12v3H1v-2h9V8h11z" />
      <path fill="#ecc88c" d="M-6 19h124v4H-6z" /><path fill="#956942" d="M0 28h111v3H98v4H17v-2H5v-2H0z" />
      <path fill="#765441" d="M16 4h2v31h-2zM38 2h2v35h-2zM64 2h2v35h-2zM87 5h2v29h-2zM105 10h2v21h-2z" />
      <path fill="#f8dcaa" opacity=".65" d="M18 5h1v25h-1zM40 4h1v27h-1zM66 4h1v27h-1zM89 7h1v23h-1z" />
      <path fill="#644a40" d="M-9 16h-11v-5h-4V6h-5v15h-3v4h3v13h5v-5h4v-6h11zM86 31h9v5h-4v9h-5z" />
      <path fill="#cda36a" d="M-27 9h2v8h8v2h-10zM-27 27h2v7h-2zM88 35h4v2h-4z" />
      <path fill="#4b3a34" d="M30 38h2v9h-2zM70 38h2v9h-2zM22 46h60v4h-5v7H34v-3h-8v-4h-4z" />
      <path fill="#a2784e" d="M28 48h50v4H35v-2h-7z" /><path fill="#e8cea0" d="M35 48h5v3h-5zM44 48h5v3h-5zM53 48h5v3h-5zM63 48h5v3h-5z" />
      <path fill="#d2ac74" d="M36 54h38v1H36z" /><path fill="#2c3034" d="M77 43h3v9h-3zM73 46h11v2H73z" />
      <path fill="#f4d7a0" d="M48 17h7v2h-2v6h-3v-6h-2zM55 20h3v2h-3zM45 20h3v2h-3z" />
      <path fill="#b79061" opacity=".5" d="M22 24h11v1H22zM43 29h14v1H43zM70 25h11v1H70zM92 18h7v1h-7z" />
    </g></g>
    <path fill="#8a694c" d="M272 70h15v8h-15zM291 68h12v10h-12zM276 62h11v8h-11zM374 70h17v8h-17zM379 64h10v6h-10z" />
    <g stroke="#c5a376" strokeWidth="1" fill="none"><path d="M273 71l12 6m-12 0 12-6M292 69l10 8m-10 0 10-8M277 63l9 6M375 71l15 6m-15 0 15-6" /></g>
    <Cat x={279} y={53} color="#d2ac7b" eye="#36303a" />
    <g transform="translate(349 71)"><path fill="#e2bc91" d="M0-7h4v4H0z" /><path fill="#4b555b" d="M-1-3h6v8h-6zM0 5h2v3H0zM4 5h2v3H4z" /><path fill="#aa835c" d="M-2-8h8v2h-8zM0-10h4v2H0zM6 0h7v6H6z" /><path fill="#e4c9a0" d="M8-1h3v1H8z" /></g>
    <Lantern x={235} y={62} p={p} /><Lantern x={395} y={64} p={p} /><Lantern x={472} y={66} p={p} />
    <g transform="translate(118 11)"><g className="pb-float"><path fill="#c79d74" d="M0 0h13v2h5v5h2v5h-2v4h-5v2H0v-2h-5v-4h-2V7h2V2h5z" /><path fill="#eac897" d="M1 2h8v2h5v4H-3V4h4z" /><path fill="#68514a" d="M1 18h1v5H1zM10 18h1v5h-1zM-1 23h14v3H-1z" /></g></g>
    <Smoke p={p} x={477} y={14} />
  </>;
}

function ClockworkCity() {
  const p = BANNER_PALETTES.uhrwerkstadt;
  return <><Sky p={p} seed={21} /><Moon p={p} x={380} y={4} /><Clouds p={p} />
    <path fill="#474941" d="M0 70V37h12V27h8v10h17v33h15V43h15V32h6v11h15v27h16V31h15V20h7v11h13v39h16V44h15V30h8v14h15v26h19V38h15V27h8v11h14v32h24V31h13V20h8v11h14v39h63V40h18V28h7v12h17v30h18V35h14V23h8v12h13v35h20V42h16V31h7v11h17v28h20V30h15V20h8v10h13v40h18V40h17V27h7v13h12v30h23V35h11V23h8v12h20v35h14v26H0z" />
    <g opacity=".5" fill="#b7a877">{Array.from({ length: 47 }, (_, i) => <rect key={i} x={10 + i * 13} y={48 + i % 3 * 8} width="2" height="3" />)}</g>
    <Water p={p} y={82} />
    <House x={167} y={57} wall="#a49771" roof="#6a7470" width={30} p={p} />
    <House x={199} y={49} wall="#93876a" roof="#87755a" width={28} p={p} />
    <House x={234} y={58} wall="#b09b70" roof="#606b65" width={28} p={p} />
    <House x={372} y={57} wall="#b3a17d" roof="#6d7769" width={30} p={p} />
    <House x={410} y={52} wall="#a38b6d" roof="#8e7658" width={30} p={p} />
    <House x={447} y={58} wall="#8f8971" roof="#63706b" width={26} p={p} />
    <path fill="#302e2e" d="M272 32h18v46h-18zM291 15h43v64h-43zM337 40h22v38h-22zM285 73h55v7h-55zM294 9h37v7h-37zM300 4h25v5h-25zM310 0h5v4h-5z" />
    <path fill="#9a885c" d="M294 17h37v57h-37zM274 34h13v41h-13zM340 42h16v32h-16z" />
    <path fill="#746747" d="M323 18h8v55h-8zM281 34h6v41h-6zM350 42h6v32h-6z" />
    <path fill="#d6bc7e" d="M293 17h39v2h-39zM289 44h45v3h-45zM290 64h44v2h-44zM272 34h16v2h-16zM337 42h21v2h-21zM288 73h49v2h-49z" />
    <path fill="#6b7970" d="M292 15v-3h6V8h6V4h6V1h5v3h6v4h6v4h7v3z" /><path fill="#adb18a" d="M298 12h29v1h-29zM304 8h17v1h-17z" />
    <g transform="translate(312 31)">
      <path fill="#433e31" d="M-7-12H7v2h4v4h2V6h-2v4H7v2H-7v-2h-4V6h-2V-6h2v-4h4z" />
      <path fill="#e3c78b" d="M-6-10H6v2h4v4h1v8h-1v4H6v2H-6V8h-4V4h-1v-8h1v-4h4z" />
      <path fill="#f5e2b2" d="M-5-8H5v2h3v12H5v2H-5V6h-3V-6h3z" />
      <path fill="#74634c" d="M-1-9h2v3h-2zM-1 6h2v3h-2zM-9-1h3v2h-3zM6-1h3v2H6zM-6-6h2v2h-2zM4-6h2v2H4zM-6 4h2v2h-2zM4 4h2v2H4z" />
      <path fill="#433d35" d="M-1-5h2v6h-2zM0-1h6v2H0z" /><path fill="#b78851" d="M-1-1h3v3h-3z" />
    </g>
    <path fill="#413e32" d="M300 50h7v10h-7zM317 50h7v10h-7zM276 43h4v7h-4zM341 50h5v7h-5zM306 68h11v9h-11z" />
    <g className="pb-twinkle" fill="#edd598"><path d="M301 51h5v8h-5zM318 51h5v8h-5zM277 44h2v5h-2zM342 51h3v5h-3z" /></g>
    <path fill="#6d573b" d="M301 55h5v1h-5zM303 51h1v8h-1zM318 55h5v1h-5zM320 51h1v8h-1z" />
    <path fill="#b6a16f" d="M296 22h2v2h-2zM327 40h3v1h-3zM298 61h4v1h-4zM330 49h2v4h-2zM343 62h4v1h-4zM277 68h5v1h-5z" />
    <Gear p={p} x={270} y={67} size={.7} /><Gear p={p} x={351} y={69} size={.7} />
    <path fill="#302f2d" d="M0 79h264v5H0zM368 79h272v5H368zM256 77h17v4h-17zM358 77h18v4h-18zM264 82h104v3H264z" />
    <path fill="#c3aa76" d="M0 78h262v2H0zM371 78h269v2H371zM270 80h92v1h-92z" />
    <g transform="translate(312 84)"><Gear p={p} x={0} y={0} size={.65} /></g>
    <path fill="#72634b" d="M296 87h32v2h-32zM304 85h2v11h-2zM319 85h2v11h-2z" />
    <g transform="translate(231 73)"><path fill="#6e7b70" d="M0-7h9v10H0zM1-9h2v3H1zM6-9h2v3H6zM1 3h2v2H1zM6 3h2v2H6z" /><path fill="#e9cc8c" d="M1-6h3v3H1zM5-6h3v3H5zM4-2h1v2H4z" /><path fill="#333730" d="M2-5h1v1H2zM6-5h1v1H6zM1 0h2v1H1zM6 0h2v1H6z" /></g>
    <g transform="translate(385 72)"><path fill="#354039" d="M0-4h6v7H0zM-2-1h2v5h-2zM6-1h2v5H6zM0 3h2v4H0zM5 3h2v4H5z" /><path fill="#cfb67f" d="M1-8h4v4H1z" /><path fill="#685b45" d="M-1-9h8v2h-8zM1-12h4v3H1z" /><path fill="#b1aa7b" d="M8-2h8v5H8z" /></g>
    <Lantern x={228} y={69} p={p} /><Lantern x={367} y={67} p={p} /><Lantern x={444} y={66} p={p} />
    <path fill="#817255" d="M69 76h31V59h3v20H67v-3zM539 76h29V56h3v23h-34v-3z" />
    <Gear p={p} x={85} y={66} size={.55} /><Gear p={p} x={553} y={65} size={.55} />
    <Texture y={86} height={10} color="#e0c386" count={65} opacity={.2} />
  </>;
}

function SteelWorks() {
  const p = BANNER_PALETTES.stahlwerk;
  return <><Sky p={p} stars={false} />
    <path fill="#5b3d40" d="M0 60h18V33h6v-5h13v5h5v27h18V42h8V20h10v22h8v18h25V29h9V13h10v16h9v31h20V43h9V27h12v16h8v17h20V37h10V15h10v22h9v23h30V34h8V20h12v14h8v26h59V39h11V18h11v21h10v21h25V30h8V13h12v17h8v30h24V41h8V25h12v16h9v19h29V35h9V12h11v23h9v25h20V39h9V20h12v19h8v21h28V31h10V17h12v14h8v29h19v36H0z" />
    <path fill="#3b3036" d="M0 75V60h30V48h18v27h20V56h23v19h19V50h37v25h23V60h30v15h19V50h40v25h26V59h40v16h36V51h36v24h28V61h38v14h23V47h37v28h21V57h30v18h26V51h33v24h26V61h30v14h18v21H0z" />
    <g fill="#d58259" opacity=".5">{Array.from({ length: 32 }, (_, i) => <rect key={i} x={i * 21 + 5} y={64 + i % 2 * 5} width={i % 4 ? 3 : 8} height="2" />)}</g>
    <Smoke p={p} x={196} y={5} /><Smoke p={p} x={459} y={3} />
    <path fill="#26272e" d="M0 84h640v12H0zM170 46h96v5h-96zM173 51h5v32h-5zM244 51h5v32h-5zM364 37h111v5H364zM367 42h5v42h-5zM462 42h5v42h-5z" />
    <path fill="#7b6556" d="M171 45h96v2h-96zM364 36h112v2H364zM176 55h70v1h-70zM369 46h97v1h-97z" />
    <g stroke="#584d48" strokeWidth="1"><path d="M180 51l24 31m0-31-24 31m32-31 27 31m0-31-27 31M375 42l32 40m0-40-32 40m42-40 42 40m0-40-42 40" /></g>
    <path fill="#383136" d="M277 14h17v34h-17zM309 4h16v38h-16zM337 24h13v26h-13zM269 49h90v33h-90zM282 38h54v13h-54zM291 24h37v15h-37z" />
    <path fill="#816255" d="M279 15h10v31h-10zM311 6h10v32h-10zM339 26h7v22h-7zM273 51h81v30h-81zM285 39h47v12h-47zM294 26h31v13h-31z" />
    <path fill="#b78c66" d="M279 17h3v26h-3zM311 8h3v25h-3zM294 27h3v9h-3zM274 52h3v26h-3zM286 40h3v8h-3z" />
    <path fill="#4c4340" d="M280 24h12v2h-12zM280 34h12v2h-12zM312 17h12v2h-12zM312 28h12v2h-12zM295 35h31v2h-31zM276 59h76v2h-76zM280 75h69v2h-69z" />
    <path fill="#3f3637" d="M274 12h22v4h-22zM306 2h22v5h-22zM335 22h18v5h-18zM278 38h58v3h-58zM267 48h94v4h-94z" />
    <path fill="#b59874" d="M275 12h20v1h-20zM307 2h20v1h-20zM336 22h16v1h-16zM269 48h90v1h-90z" />
    <g className="pb-lantern">
      <path fill="#d06f40" opacity=".16" d="M277 58h21v26h-21zM300 55h28v31h-28zM331 58h19v26h-19z" />
      <path fill="#422c2c" d="M282 63h12v16h-12zM306 58h18v23h-18zM334 63h11v16h-11z" />
      <path fill="#ea8b48" d="M284 65h8v12h-8zM308 60h14v19h-14zM336 65h7v12h-7z" />
      <path fill="#ffe0a0" d="M287 67h2v8h-2zM311 65h7v12h-7zM337 69h4v6h-4z" />
    </g>
    <path fill="#a5825c" d="M307 80h16v2h-16zM303 82h25v2h-25z" />
    <path fill="#523b34" d="M320 81h7v5h13v3h28v7h-47v-5h-6v-7h5z" /><path fill="#f0a34f" className="pb-lantern" d="M322 82h3v6h13v3h27v3h-41v-5h-4v-5h2z" /><path fill="#f7cd76" d="M323 84h1v5h14v2h-12v-1h-3z" />
    <path fill="#8a6a4e" d="M229 71V32h-17v-4h23v43zM232 63h37v5h-37zM349 57h20V25h42v5h-36v33h-26z" />
    <path fill="#c49f73" d="M230 32h1v37h-1zM233 63h34v1h-34zM350 57h20V26h39v1h-38v32h-21z" />
    <path fill="#4b413b" d="M224 51h15v3h-15zM221 33h17v3h-17zM253 60h3v11h-3zM365 42h12v3h-12zM390 23h3v9h-3z" />
    <Gear p={p} x={255} y={62} size={.4} />
    <g transform="translate(389 70)"><path fill="#8f7c62" d="M0-8h13v11H0zM2-14h9v6H2zM-3-5h3v7h-3zM13-5h3v7h-3zM1 3h4v5H1zM9 3h4v5H9z" /><path fill="#c2af83" d="M2-7h9v3H2zM3-13h7v4H3z" /><path fill="#d8e8b0" d="M4-12h2v2H4zM8-12h2v2H8z" /><path fill="#413c36" d="M4-2h5v2H4z" /><path fill="#daa96d" d="M13 0h9v3h-9zM21-2h2v3h-2z" /></g>
    <g transform="translate(241 75)"><path fill="#c39a7c" d="M0-9h4v4H0z" /><path fill="#c8ad64" d="M-2-10h8v2h-8zM0-12h4v2H0z" /><path fill="#66716e" d="M-1-5h6v7h-6zM0 2h2v4H0zM4 2h2v4H4z" /><path fill="#cabf92" d="M5-4h8v2H5zM12-6h2v5h-2z" /></g>
    <g fill="#ffca78" className="pb-spark"><path d="M265 64h1v2h-1zM259 58h2v1h-2zM261 52h1v2h-1zM269 56h2v1h-2zM327 67h1v2h-1zM334 84h1v1h-1zM344 86h2v1h-2zM359 89h1v1h-1z" /></g>
    <path fill="#59534a" d="M0 89h301v1H0zM377 89h263v1H377zM0 94h301v1H0zM377 94h263v1H377z" />
    <Texture y={85} height={11} color="#a18b6d" count={160} opacity={.25} />
    <g transform="translate(189 82)"><path fill="#675546" d="M0-6h18v10H0z" /><path fill="#ad8e61" d="M0-6h18v2H0zM1 0h16v1H1z" /><path fill="#353334" d="M2 4h4v3H2zM12 4h4v3h-4z" /><path fill="#48403a" d="M1-9h4v-3h4v2h5v2h3v2H1z" /></g>
  </>;
}

function DesertExpress() {
  const p = BANNER_PALETTES.wuestenexpress;
  return <><Sky p={p} stars={false} /><Moon p={p} x={363} y={4} sun /><Clouds p={p} />
    <path fill="#b07e6b" d="M0 47h28V36h11V23h41v13h14v11h31V37h18V21h31v16h17v10h47V33h19V20h34v13h16v14h62V34h15V19h35v15h13v13h40V35h12V23h31v12h12v12h47V33h14V18h26v15h14v14h56v49H0z" />
    <path fill="#d59e78" d="M42 25h34v2H42zM146 23h25v2h-25zM260 22h28v2h-28zM387 21h29v2h-29zM536 20h21v2h-21z" />
    <path fill="#8e6056" d="M0 67h22V54h14V46h19v-9h29v9h11v8h23v13h28V55h21V39h41v16h17v12h35V51h15V38h40v13h20v16h39V57h19V43h35v14h20v10h30V53h20V40h44v13h21v14h30V55h20V43h40v12h19v12h45v29H0z" />
    <path fill="#ae754f" d="M0 77h49v-5h51v5h69v-6h47v6h41v-5h38v5h44v-6h45v6h49v-5h51v5h55v-5h47v5h54v19H0z" />
    <Texture y={69} height={25} color="#f1c58b" count={230} opacity={.3} />
    <path fill="#573e40" d="M225 80h199v16H225z" /><path fill="#8c5f47" d="M217 73h217v5H217zM228 78h9v18h-9zM268 78h9v18h-9zM308 78h9v18h-9zM348 78h9v18h-9zM388 78h9v18h-9zM422 78h9v18h-9z" />
    <g stroke="#b18054" strokeWidth="2" fill="none"><path d="M236 79l33 17m0-17-33 17M276 79l33 17m0-17-33 17M316 79l33 17m0-17-33 17M356 79l33 17m0-17-33 17M396 79l27 17m0-17-27 17" /></g>
    <path fill="#423338" d="M0 71h640v2H0zM0 76h222v1H0zM432 76h208v1H432z" /><path fill="#e2b989" d="M0 70h640v1H0z" />
    <g fill="#77503e">{Array.from({ length: 80 }, (_, i) => <rect key={i} x={i * 8} y="72" width="3" height="2" />)}</g>
    <g className="pb-train">
      {[224, 266].map((x, i) => <g key={x} transform={`translate(${x} 48)`}>
        <path fill="#47343a" d="M0 0h38v19H0zM-2 1V-2h5v-2h29v2h8v3z" />
        <path fill={i ? "#856f5b" : "#92775b"} d="M1 2h36v14H1z" /><path fill="#b99b72" d="M1 3h36v2H1zM1 14h36v2H1z" />
        <path fill="#38353d" d="M4 6h7v6H4zM15 6h7v6h-7zM26 6h7v6h-7z" /><path fill="#f2d298" d="M5 7h5v4H5zM16 7h5v4h-5zM27 7h5v4h-5z" />
        <path fill="#abbdab" d="M5 7h5v2H5zM16 7h5v2h-5zM27 7h5v2h-5z" />
        <path fill="#caaa7f" d="M3-2h28v1H3z" /><path fill="#282b32" d="M4 18h7v4H4zM26 18h7v4h-7zM37 15h6v2h-6z" /><path fill="#a59276" d="M6 19h3v2H6zM28 19h3v2h-3z" />
        <path fill="#48373a" d="M0 12h38v1H0z" />
      </g>)}
      <g transform="translate(308 48)">
        <path fill="#3d3037" d="M0 3h24v15H0zM27-4h22v22H27zM49 4h31v14H49zM60-9h8V4h-8zM57-12h14v4H57zM77 0h6v18h-6zM24-6h29v3H24zM-1 17h87v3H-1z" />
        <path fill="#7e6653" d="M1 4h21v12H1zM29-2h18v18H29zM49 5h28v10H49zM61-8h5V4h-5z" />
        <path fill="#d3a76e" d="M29-2h18v2H29zM49 5h28v2H49zM50 14h27v1H50zM1 14h21v1H1z" />
        <path fill="#f0d4a0" d="M31 1h12v8H31z" /><path fill="#879996" d="M32 2h10v3H32z" /><path fill="#4b3939" d="M36 1h1v8h-1zM49 4h2v12h-2zM68 4h2v12h-2z" />
        <path fill="#9c7c5a" d="M27 11h20v2H27zM4 7h15v1H4z" /><path fill="#302c32" d="M2 0h5v-3h7v2h7v4H2z" />
        <path fill="#d5ad78" d="M78 7h4v4h-4zM84 18h5v2h3v2h-8z" />
        <g fill="#292b31"><path d="M4 18h8v5H4zM16 18h8v5h-8zM29 17h11v7H29zM49 17h11v7H49zM66 17h11v7H66z" /></g>
        <g fill="#b89971"><path d="M6 19h4v2H6zM18 19h4v2h-4zM32 19h5v3h-5zM52 19h5v3h-5zM69 19h5v3h-5z" /></g>
        <path fill="#cab993" d="M33 20h38v1H33z" />
      </g>
      <g transform="translate(370 34)"><g className="pb-smoke"><path fill="#dac6b4" opacity=".65" d="M-2 0h9v-4H3v-5h-12v-4h-16v-4h-23v-3h-16v4h13v4h23v4h13v5h13z" /><path fill="#f1d6b4" opacity=".6" d="M0-2h5v-3H0v-3h-12v-3h-15v2h12v4h11v3z" /></g></g>
    </g>
    {[47, 108, 182, 454, 498, 585].map((x, i) => <g key={x} transform={`translate(${x} ${74 + i % 3 * 6})`}>
      <path fill="#3e5650" d="M-2 0v-27h2v-3h3v3h2V0zM-2-12h-8v-3h-3v-12h3v10h8zM5-18h6v-12h3v14h-2v2H5z" />
      <path fill="#89906b" d="M-1-26h1V-1h-1zM-11-25h1v9h-1zM12-28h1v11h-1z" />
      <path fill="#bd897a" d="M0-31h3v2H0z" />
    </g>)}
    <path fill="#bb8c59" d="M145 86h7v-3h9v3h6v7h-24v-4h2zM539 84h8v-3h10v3h8v6h-29v-3h3z" /><path fill="#e3b880" d="M149 85h10v1h-10zM542 84h13v1h-13z" />
    <g transform="translate(422 24)"><g className="pb-float"><path fill="#7c8580" d="M0 0h7v2h5v2H-5V2h5z" /><path fill="#c2c7a4" d="M1-2h5v2H1z" /><path fill="#e6d79b" d="M-3 4h2v1h-2zM2 4h2v1H2zM7 4h2v1H7z" /></g></g>
    <g transform="translate(207 86)"><path fill="#5a5041" d="M0-3h3V0h4v3H4v2H2V3h-4V0h2zM7 1h5v1H7z" /><path fill="#cead76" d="M0-3h1v1H0z" /></g>
    <path fill="#8c674b" d="M0 94h22v-2h27v3h38v-4h31v4h51v-3h34v4H0zM451 96v-3h23v-3h27v4h46v-3h28v4h33v-3h32v4z" />
  </>;
}

function IceWatch() {
  const p = BANNER_PALETTES.eiswacht;
  return <><Sky p={p} seed={31} /><Moon p={p} x={369} y={4} />
    <g opacity=".2" className="pb-sway"><path fill="#86d6bb" d="M0 9h42V6h38v3h34v7h35v6h42v4h42v-5h38v-8h40V8h39V4h41v4h43v8h40v8h43v5h41v-7h41v-9h43V7h45V3h36v4h40v9h-40V9h-35v1h-43v7h-42v10h-41v8h-41v-5h-42v-6h-39v-7h-43v-6h-38v3h-40v6h-39v9h-38v5h-41v-5h-43v-6h-35v-7H79v-4H40v4H0z" /><path fill="#a4a2dd" d="M0 14h40v-3h39v3h35v7h35v6h42v5h40v-5h40v-8h39v-5h39V9h41v6h42v7h41v6h42v5h41v-8h41v-9h42v-7h42V6h36v5h39v3h-40v-2h-34v2h-42v7h-43v9h-41v9h-42v-5h-42v-6h-39v-7h-43v-6h-37v5h-40v5h-39v8h-41v5h-40v-5h-43v-7h-35v-6H80v-3H41v3H0z" /></g>
    <path fill="#36566a" d="M0 61h15V47h13V35h12V22h9V10h8v12h10v13h12v12h15v14h33V47h13V35h11V23h9V11h8v12h11v12h14v12h18v14h29V47h15V32h11V18h9V6h8v12h11v14h14v15h17v14h33V47h14V35h11V21h10V8h8v13h11v14h14v12h16v14h36V47h15V33h11V20h9V7h8v13h11v13h12v14h15v14h38V46h13V33h11V19h9V6h8v13h11v14h13v13h15v15h14v35H0z" />
    <path fill="#b4d7d6" d="M41 23h9V11h6v12h10v12H56v-7h-7v9H37v-8h4zM153 25h8V12h6v13h10v10h-9v-6h-8v8h-14v-7h7zM268 20h8V7h7v13h10v12h-10v-6h-7v10h-13v-8h5zM382 24h8V9h7v14h9v12h-10v-8h-7v11h-12v-8h5zM496 22h8V8h7v14h9v11h-9v-6h-7v10h-13v-9h5zM605 21h8V7h7v14h10v12h-9v-8h-7v11h-13v-8h4z" />
    <path fill="#648a97" d="M0 76h28v-4h48v4h37v-6h48v3h53v-6h51v5h61v-5h56v5h44v-6h55v6h51v-6h45v6h63v24H0z" />
    {[27, 65, 103, 145, 190, 226, 410, 452, 490, 529, 578, 620].map((x, i) => <Pine key={x} x={x} y={78 + i % 3 * 4} size={i % 2 ? 1.15 : .8} dark="#254654" mid="#3d6875" tip="#b8d6ce" snow />)}
    <path fill="#92b7b8" d="M0 87h51v-4h43v3h51v-6h58v3h51v-5h73v4h46v-5h50v5h61v-3h52v5h50v-4h54v16H0z" />
    <path fill="#d0e1d5" d="M0 86h51v-4h43v3h51v-6h58v3h51v-5h73v4h46v-5h50v5h61v-3h52v5h50v-4h54v3h-54v2h-51v-3h-51v3h-61v-4h-48v5h-48v-3h-72v4h-51v-2h-57v5H92v-3H53v4H0z" />
    <g>
      <path fill="#25404e" d="M251 52h124v28H251zM282 34h58v46h-58zM302 12h18v29h-18zM297 8h28v6h-28zM293 6h36v3h-36z" />
      <path fill="#667f80" d="M254 55h117v23H254zM285 37h52v41h-52zM305 14h12v23h-12z" />
      <path fill="#435e65" d="M327 39h10v39h-10zM363 55h8v23h-8zM313 15h4v20h-4z" />
      <path fill="#374f5b" d="M244 53v-4h10v-5h15v-5h18v-6h7v-5h10v-6h14v6h9v5h12v6h18v5h15v5h11v4z" />
      <path fill="#e2e9d9" d="M245 50h11v-5h15v-5h19v-6h7v-5h9v-5h10v5h10v5h12v6h18v5h15v5h11v4h-15v-4h-16v-4h-15v-5h-16v-7h-17v7h-15v5h-18v4h-15v4h-10z" />
      <path fill="#abc9c9" d="M250 54h21v-4h17v-5h16v-7h13v7h16v5h17v4h27v2h-29v-4h-17v-5h-16v-6h-9v6h-16v5h-17v4h-23z" />
      <path fill="#c7d5c8" d="M297 8h28v3h-28zM301 5h21v3h-21zM304 1h16v4h-16z" />
      <path fill="#233945" d="M261 60h12v11h-12zM286 56h11v11h-11zM326 56h11v11h-11zM352 60h12v11h-12zM306 59h13v21h-13z" />
      <g className="pb-lantern"><path fill="#e6a763" d="M263 62h8v7h-8zM288 58h7v7h-7zM328 58h7v7h-7zM354 62h8v7h-8zM308 61h9v18h-9z" /><path fill="#ffe0a0" d="M264 62h6v4h-6zM289 58h5v4h-5zM329 58h5v4h-5zM355 62h6v4h-6zM309 63h6v11h-6z" /></g>
      <path fill="#536568" d="M266 61h1v9h-1zM291 57h1v9h-1zM331 57h1v9h-1zM358 61h1v9h-1zM309 65h6v1h-6z" />
      <path fill="#a0b4ae" d="M256 73h6v1h-6zM275 59h6v1h-6zM281 70h5v1h-5zM295 73h5v1h-5zM320 51h6v1h-6zM341 70h7v1h-7zM354 75h6v1h-6zM361 57h5v1h-5z" />
      <path fill="#e5e9d9" d="M260 71h14v2h-14zM285 67h13v2h-13zM325 67h13v2h-13zM351 71h14v2h-14zM302 79h20v2h-20z" />
      <path fill="#a6c7c7" d="M248 54h1v5h-1zM258 54h1v8h-1zM274 51h1v6h-1zM291 46h1v5h-1zM334 49h1v7h-1zM354 54h1v5h-1zM370 55h1v8h-1z" />
    </g>
    <g transform="translate(305 8)"><g className="pb-smoke" fill="#d0e2d4" opacity=".4"><path d="M1 0h9v-3H6v-4H-5v-4h-14v-3h-12v3h10v4h14v4H1z" /></g></g>
    <path fill="#547a88" d="M307 83h8v2h-8zM318 87h6v2h-6zM307 91h7v2h-7zM320 94h8v2h-8z" />
    <g transform="translate(381 79)"><path fill="#546f78" d="M0-13h1v17H0zM-9-11h18v2H-9z" /><g className="pb-sway"><path fill="#b94d55" d="M1-13h13v2h-3v2H1z" /><path fill="#e59982" d="M2-13h8v1H2z" /></g></g>
    <g transform="translate(237 83)"><path fill="#203745" d="M1-7h5v2h2v9H0v-9h1z" /><path fill="#ecedda" d="M2-3h4v6H2z" /><path fill="#e3ad6e" d="M5-5h4v1H5zM0 4h3v1H0zM5 4h3v1H5z" /><path fill="#edf0da" d="M5-6h1v1H5z" /></g>
    <g transform="translate(348 82)"><path fill="#765449" d="M0 1h16v2H0zM2-5h2v7H2zM12-5h2v7h-2zM2-6h12v2H2zM0 3h2v2h14v-2h2v4H0z" /><path fill="#b8865d" d="M3-5h10v1H3z" /><path fill="#bfbead" d="M5-10h7v5H5z" /></g>
    <Lantern x={299} y={67} p={p} /><Lantern x={324} y={67} p={p} />
    <Pine x={191} y={95} size={1.4} dark="#1c3947" mid="#315b68" tip="#c4ded5" snow /><Pine x={446} y={95} size={1.5} dark="#1c3947" mid="#315b68" tip="#c4ded5" snow />
    <Texture y={88} height={8} color="#f0f0dd" count={115} opacity={.45} /><Rain p={p} snow />
  </>;
}

export const FANTASY_ART = {
  mondburg: <MoonCastle />,
  gluehwald: <GlowForest />,
  drachenberge: <DragonMountains />,
  himmelsinseln: <SkyIslands />,
  kristallhoehle: <CrystalCave />,
  luftschiffhafen: <AirshipHarbor />,
  uhrwerkstadt: <ClockworkCity />,
  stahlwerk: <SteelWorks />,
  wuestenexpress: <DesertExpress />,
  eiswacht: <IceWatch />,
} satisfies Partial<Record<BannerId, ReactNode>>;
