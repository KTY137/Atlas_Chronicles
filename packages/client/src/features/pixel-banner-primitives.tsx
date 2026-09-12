// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import type { CSSProperties } from "react";
import type { Palette } from "./pixel-banner-palettes";
export type { Palette } from "./pixel-banner-palettes";

/** Integer coordinates, fixed seeds, and flat pixel clusters keep the art crisp and deterministic. */
export function Sky({ p, stars = true, seed = 0 }: { p: Palette; stars?: boolean; seed?: number }) {
  return <><path fill={p.sky} d="M0 0h640v96H0z" />
    {[16, 28, 40, 50, 60, 70, 80].map((y, i) => <path key={y} fill={p.horizon} opacity={.05 + i * .055} d={`M0 ${y}h640v${96 - y}H0z`} />)}
    <path fill={p.horizon} opacity=".18" d={Array.from({ length: 150 }, (_, i) => `M${(i * 47 + seed * 17) % 640} ${27 + (i * 13) % 48}h1v1h-1z`).join("")} />
    {stars && <><path fill={p.light} opacity=".45" d={Array.from({ length: 85 }, (_, i) => `M${(i * 83 + 16 + seed * 37) % 640} ${(i * 17 + 3) % 52}h1v1h-1z`).join("")} />
      {[0, 1, 2].map(n => <g key={n} className="pb-twinkle" style={{ animationDelay: `${-n * 1.7}s` }} fill={p.light} opacity=".8">
        <path d={Array.from({ length: 6 }, (_, i) => `M${(i * 107 + 27 + n * 59) % 638} ${5 + (i * 11 + n * 9) % 36}h1v3h-1z m-1 1h3v1h-3z`).join("")} />
      </g>)}</>}
  </>;
}

export function Moon({ p, x = 367, y = 9, sun = false }: { p: Palette; x?: number; y?: number; sun?: boolean }) {
  return <g transform={`translate(${x} ${y})`}>
    <path fill={p.glow} opacity=".05" d="M4-5h24v4h7v7h4v22h-4v7h-7v4H4v-4h-7v-7h-4V6h4V-1h7z" />
    <path fill={p.glow} opacity=".13" d="M7 0h18v3h5v5h3v18h-3v5h-5v3H7v-3H2v-5h-3V8h3V3h5z" />
    <path fill={p.light} d="M10 4h12v2h5v4h2v14h-2v4h-5v2H10v-2H5v-4H3V10h2V6h5z" />
    {sun ? <path fill={p.horizon} d="M3 17h26v1H3zM3 21h26v2H3zM5 25h22v2H5zM10 29h12v1H10z" />
      : <><path fill={p.glow} opacity=".55" d="M19 6h3v2h4v4h-3v3h-5v6h-6v-3H8v-5h4v-3h7zM20 23h4v3h-4zM8 23h2v2H8z" /><path fill={p.sky} opacity=".18" d="M17 10h4v2h-4zM12 14h3v3h-3z" /></>}
  </g>;
}

export function Clouds({ p }: { p: Palette }) {
  return <g className="pb-cloud"><path fill={p.light} opacity=".13" d="M-24 29H4v-3h18v-4h26v3h20v4h24v3H-24zM168 16h20v-4h18V8h29v4h23v4h25v3H168zM410 29h14v-4h22v-4h25v4h18v4h24v3H410zM567 13h16V9h30v4h18v4h29v3h-93z" />
    <path fill={p.light} opacity=".09" d="M12 33h74v1H12zM192 20h70v1h-70zM432 33h64v1h-64zM594 21h52v1h-52z" /></g>;
}

export function Mountains({ p, snow = false }: { p: Palette; snow?: boolean }) {
  return <>{[0, 1].map(layer => <g key={layer} fill={layer ? p.ink : p.far} opacity={layer ? .7 : 1}>
    {Array.from({ length: 9 }, (_, i) => { const x = i * 83 - 42, top = 24 + (i * 13) % 22 + layer * 18;
      return <g key={i}><path d={`M${x} 96V${top + 36}h12v-8h12v-8h9v-9h8v-8h6v-3h6v9h9v10h10v10h12v9h12v58z`} />
        {!layer && <path fill={p.mid} opacity=".42" d={`M${x + 47} ${top}h6v9h9v10h10v10h10v9h-12v-5h-11v-8h-7v-7h-5z`} />}
        {snow && !layer && <path fill={p.light} opacity=".75" d={`M${x + 41} ${top + 3}h6v-3h6v9h9v4h-8v-3h-6v5h-7v-2h-8v-2h8z`} />}</g>;
    })}</g>)}</>;
}

export function Water({ p, y = 76 }: { p: Palette; y?: number }) {
  return <><path fill={p.ink} d={`M0 ${y}h640v${96 - y}H0z`} /><path fill={p.mid} opacity=".6" d={`M0 ${y}h640v1H0z`} />
    {[0, 1, 2].map(n => <g key={n} className="pb-water" style={{ animationDelay: `${-n * 1.4}s` }} fill={n === 1 ? p.light : p.glow} opacity={n === 1 ? .3 : .24}>
      <path d={Array.from({ length: 28 }, (_, i) => `M${(i * 67 + n * 23 + 9) % 630} ${y + 3 + (i * 7 + n * 3) % Math.max(1, 93 - y)}h${2 + (i % 5) * 3}v1h-${2 + (i % 5) * 3}z`).join("")} />
    </g>)}
  </>;
}

export function Trees({ p, glow = false }: { p: Palette; glow?: boolean }) {
  return <>{[14, 45, 80, 119, 157, 188, 449, 490, 529, 570, 612, 639].map((x, i) => <g key={x} transform={`translate(${x} ${12 + i % 3 * 8})`}>
    <path fill={i % 2 ? p.far : p.mid} d="M0 0h3v8h4v7h4v7h5v7h-6v3h10v7h-8v3h12v8H4v35H0V50h-21v-8h12v-3h-7v-7h10v-3h-6v-7h5v-7h4V8h3z" />
    <path fill={p.ink} opacity=".7" d="M0 14h2v64H0zM2 25h8v2H2zM-9 34h9v2h-9zM2 44h12v2H2z" />
    <path fill={glow ? p.glow : p.light} opacity={glow ? .5 : .13} d="M-3 19h3v1h-3zM4 28h6v1H4zM-12 43h7v1h-7zM8 47h7v1H8z" />
  </g>)}</>;
}

export function Fireflies({ p }: { p: Palette }) {
  return <>{Array.from({ length: 12 }, (_, i) => <g key={i} transform={`translate(${(i * 73 + 26) % 630} ${42 + (i * 7) % 42})`}>
    <g className="pb-fireflies" style={{ animationDelay: `${-(i % 7)}s`, animationDuration: `${5 + i % 4}s` }} fill={p.light}>
      <path opacity=".1" d="M-2-1h5v3h-5zM-1-2h3v5h-3z" /><rect width="1" height="1" />
    </g></g>)}</>;
}

/** Four identical 96px fields cover both boundaries throughout an entire translation.
 * The final field occupies exactly the pixels of its neighbour at time zero. */
export function Rain({ p, snow = false }: { p: Palette; snow?: boolean }) {
  return <g data-weather={snow ? "snow" : "rain"}>{[0, 1].map(layer => {
    const marks = Array.from({ length: snow ? 36 : 70 }, (_, i) => {
      const x = (i * 73 + layer * 31) % 640, y = (i * 29 + layer * 17) % 96;
      return snow ? `M${x} ${y}h${1 + layer}v${1 + layer}h-${1 + layer}z` : `M${x} ${y}h1v3h-1z m-1 3h1v${2 + layer}h-1z`;
    }).join("");
    return <g key={layer} className={snow ? "pb-snow" : "pb-rain"} data-weather-layer={layer}
      style={{ "--pb-fall-duration": snow ? `${22 - layer * 7}s` : `${2.8 - layer}s` } as CSSProperties}
      fill={p.light} opacity={snow ? .3 + layer * .3 : .13 + layer * .12}>
      {[-2, -1, 0, 1].map(row => <path key={row} transform={`translate(0 ${row * 96})`} d={marks} />)}
    </g>;
  })}</g>;
}

export function Smoke({ p, x = 315, y = 28 }: { p: Palette; x?: number; y?: number }) {
  return <g transform={`translate(${x} ${y})`}>{[0, 1, 2].map(i => <g key={i} className="pb-smoke" style={{ animationDelay: `${-i * 2}s` }} fill={p.light} opacity=".12">
    <path d="M-2 0h4v-3h3v-4H2v-3h-6v4h-3v3h5z" /><path opacity=".4" d="M-5-7h5v-5h-8v4h3z" />
  </g>)}</g>;
}

export function Gear({ p, x, y, size = 1 }: { p: Palette; x: number; y: number; size?: number }) {
  return <g transform={`translate(${x} ${y}) scale(${size})`}><g className="pb-gear">
    <path fill={p.glow} d="M-4-14h8v4h4v-2h4v4h-2v4h4v8h-4v4h2v4H8v-2H4v4h-8v-4h-4v2h-4V8h2V4h-4v-8h4v-4h-2v-4h4v2h4z" />
    <path fill={p.mid} d="M-5-8h10v3h3v10H5v3H-5V5h-3V-5h3z" /><path fill={p.ink} d="M-3-5h6v2h2v6H3v2h-6V3h-2v-6h2z" />
    <path fill={p.light} d="M-1-1h2v2h-2zM-3-11h6v1h-6zM9-3h1v6H9z" />
  </g></g>;
}

export function Castle({ p, x = 300, y = 30 }: { p: Palette; x?: number; y?: number }) {
  return <g transform={`translate(${x} ${y})`}>
    <path fill={p.ink} d="M-20 45h86v12h-86zM-10 10H6v38h-16zM8 25h28v23H8zM30 0h18v48H30zM50 16h14v32H50z" />
    <path fill={p.mid} d="M-8 12H3v33H-8zM10 27h24v18H10zM32 2h12v43H32zM52 18h9v27h-9z" />
    <path fill={p.glow} d="M-14 10V8h4V4h3V0h3v-4h2v4h3v4h3v4h6v2zM26 0v-2h4v-4h4v-6h3v-5h3v5h3v6h3v4h5v2zM48 16v-2h4v-4h3V6h3v4h3v4h5v2z" />
    <path fill={p.light} opacity=".2" d="M-8 13h1v32h-1zM32 3h1v42h-1zM10 28h24v1H10zM-8 24H3v1H-8zM32 14h12v1H32zM52 29h9v1h-9z" />
    <path fill={p.ink} opacity=".45" d="M-6 19h4v1h-4zM-2 32h4v1h-4zM35 10h5v1h-5zM39 24h4v1h-4zM35 36h4v1h-4zM15 36h4v1h-4zM26 40h4v1h-4z" />
    <g className="pb-lantern" fill={p.light}><path d="M-4 18h3v5h-3zM36 8h4v6h-4zM37 26h3v5h-3zM54 24h3v5h-3zM12 32h3v3h-3zM28 32h3v3h-3z" /></g>
    <path fill={p.ink} d="M19 38h6v-2h2v2h2v10H19z" /><path fill={p.glow} opacity=".5" d="M22 40h4v8h-4z" />
    <path fill={p.light} d="M38-20h1v5h-1z" /><g transform="translate(39 -20)"><path className="pb-sway" fill={p.glow} d="M0 0h8v2H5v2H0z" /></g>
  </g>;
}

export function Palm({ p, x, y = 28 }: { p: Palette; x: number; y?: number }) {
  return <g transform={`translate(${x} ${y})`}><path fill={p.ink} d="M0 0h4v12H2v16H0v18h-4V27h2V12h2z" />
    <path fill={p.mid} d="M0 16h1v3H0zM-1 27h1v4h-1zM-3 39h2v2h-2z" /><g className="pb-sway" fill={p.ink}>
      <path d="M0 0v-4h8v2h8v4h4v6h-4V4H8V2H4v2h6v4h4v8h-4v-6H6V6H2V4h-4V2h-8v4h-4v6h-4V4h4V0h8v-2h-10v2h-8v4h-4V0h4v-4h8v-2h10v2z" />
      <path fill={p.mid} d="M-15-3h10v1h-10zM4-2h7v1H4zM7 5h3v2H7z" /></g></g>;
}
