// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { memo, type CSSProperties } from "react";
import type { BannerId } from "@chronicle/theme";
import { BANNER_PALETTES, type Palette } from "./pixel-banner-palettes";

type Terrain = "woods" | "ridge" | "desert" | "clouds" | "cave" | "town" | "garden" | "lab" | "data" | "ocean" | "coast" | "space" | "haunted" | "market";
const TERRAIN: Record<BannerId, Terrain> = {
  mondburg: "ridge", gluehwald: "woods", drachenberge: "ridge", himmelsinseln: "clouds", kristallhoehle: "cave",
  luftschiffhafen: "town", uhrwerkstadt: "town", stahlwerk: "town", wuestenexpress: "desert", eiswacht: "woods",
  neonregen: "town", dachgaerten: "garden", biolabor: "lab", datenstrom: "data", tiefseestation: "ocean",
  sonnenraster: "coast", pastellpalmen: "coast", raketenhafen: "town", orbitalring: "space", geisterstadt: "haunted",
  sternwarte: "ridge", versunkener_tempel: "ocean", pilzdorf: "woods", wolkenkloster: "clouds", nachtmarkt: "market",
};

/** Stable, decorrelated values: the two sides never reuse or mirror a tile. */
function sample(seed: number, slot: number, salt = 0) {
  let value = Math.imul(seed + 1, 374761393) ^ Math.imul(slot + 17, 668265263) ^ Math.imul(salt + 31, 1274126177);
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967296;
}

/** Small supporting buildings, never another copy of the scene's landmark. */
function Settlement({ scene, kind, x, y, width: w, variant: v, p, isLit }: {
  scene: BannerId; kind: Terrain; x: number; y: number; width: number; variant: number; p: Palette; isLit: boolean;
}) {
  const h = 92 - y, industrial = scene === "stahlwerk" || scene === "raketenhafen" || kind === "lab";
  const oldTown = scene === "luftschiffhafen" || scene === "uhrwerkstadt" || kind === "haunted" || kind === "market";
  const roof = oldTown ? [
    `M-3 ${-h}v-3h6v-5h7v-5h${w - 20}v5h7v5h6v3z`,
    `M-3 ${-h}v-4h4v-8h${w - 2}v8h4v4z`,
    `M0 ${-h}v-7h5v-5h${w - 10}v5h5v7z`,
    `M-4 ${-h}v-3h5v-3h${w - 2}v3h5v3z`,
  ][v % 4] : industrial && v % 3 === 1 ? `M-2 ${-h}v-5h8v-6h8v6h8v-6h8v6h${w - 30}v5z` :
    `M0 ${-h}v-4h${Math.floor(w * .35)}v-6h${Math.floor(w * .4)}v6h${w - Math.floor(w * .35) - Math.floor(w * .4)}v4z`;
  if (industrial && v === 0) return <g transform={`translate(${x} 92)`}>
    <path fill={p.ink} d={`M0-4v-${h - 8}h3v-5h${w - 6}v5h3V-4zM3-4h4v4H3zM${w - 7}-4h4v4h-4z`} />
    <path fill={p.mid} d={`M3-${h - 3}h${w - 6}v${h - 10}H3z`} />
    <path fill={p.light} opacity=".28" d={`M5-${h - 2}h3v${h - 7}H5zM3-${Math.floor(h * .65)}h${w - 6}v2H3zM3-12h${w - 6}v2H3z`} />
    <path fill={p.glow} opacity=".55" d={`M${w - 6}-${h - 6}h2v${h - 19}h-2z`} />
    <path fill={p.ink} d={`M${w}-15h9v-21h3v24H${w}zM-7-28h7v3h-7z`} />
    {kind === "lab" && <path fill={p.glow} opacity=".45" d={`M11-${Math.floor(h * .65)}h${w - 19}v${Math.floor(h * .45)}H11z`} />}
  </g>;
  if ((scene === "luftschiffhafen" || scene === "raketenhafen") && v === 4) return <g transform={`translate(${x} 92)`}>
    <path fill={p.ink} d={`M3 0v-${h}h4V0zM-1-${h}h${w + 10}v3H-1zM${w}-${h - 3}h1v22h-1zM0-2h14v2H0zM16-13h17v13H16zM38-8h14v8H38z`} />
    <path fill={p.mid} d={`M17-12h15v10H17zM39-7h12v6H39zM4-${h - 2}h1v${h - 6}H4zM6-${h - 3}h${w - 13}v1H6z`} />
    <path fill={p.glow} opacity=".5" d={`M${w - 2} ${23 - h}h5v2h-5zM18-8h13v1H18zM42-7h1v6h-1z`} />
  </g>;
  return <g transform={`translate(${x} 92)`}>
    <path fill={p.ink} d={`M0-${h}h${w}v${h}H0z${roof}`} />
    <path fill={p.mid} opacity={kind === "haunted" ? .45 : .7} d={`M2-${h - 2}h${w - 4}v${h - 4}H2z`} />
    <path fill={p.light} opacity=".22" d={`M1-${h}h${w - 2}v1H1zM2-${h - 3}h1v${h - 7}H2zM${w - 8}-${h + 5}h3v4h-3z`} />
    <path fill={p.ink} d={`M${w - 11}-12h7v12h-7zM1-16h${w - 2}v1H1z${oldTown ? `M${Math.floor(w / 2)}-${h - 2}h2v${h - 2}h-2z` : ""}`} />
    <path fill={p.glow} opacity={isLit ? .75 : .17} d={Array.from({ length: Math.max(1, Math.floor((h - 12) / 12)) }, (_, row) =>
      Array.from({ length: Math.max(1, Math.floor((w - 6) / 11)) }, (_, col) => (row + col + v) % 5 === 0 ? "" : `M${5 + col * 11} ${-h + 6 + row * 12}h${scene === "neonregen" && v % 2 ? 2 : 4}v${kind === "lab" ? 3 : 4}h-${scene === "neonregen" && v % 2 ? 2 : 4}z`).join("")
    ).join("")} />
    {kind === "garden" ? <><path fill="#3d745b" d={`M-2-${h}h${w + 4}v3H-2zM5-${h + 6}h5v6H5zM16-${h + 10}h8v10h-8zM${w - 6}-${h - 2}h3v11h-3v8h-2V-${h - 2}z`} /><path fill={p.light} opacity=".6" d={`M7-${h + 7}h2v2H7zM19-${h + 9}h2v2h-2z`} /></> :
      kind === "market" ? <><path fill={v % 2 ? p.glow : p.light} opacity=".65" d={`M-4-20h${w + 8}v5H-4zM${w + 6}-${h - 1}h5v7h-5z`} /><path fill={p.ink} d={`M3-20h3v5H3zM13-20h3v5h-3zM23-20h3v5h-3zM-3-15h2v15h-2zM${w + 1}-15h2v15h-2zM${w + 8}-${h + 7}h1v8h-1z`} /></> :
        kind === "haunted" ? <path fill={p.ink} d={`M4-${h - 9}h13v2H4zM8-${h - 13}h2v13H8zM${w + 8} 0v-24h2v24zM${w + 3}-17h12v2h-12zM${w + 15}-21h2v21h-2zM3-${h + 6}h5v8H3z`} /> :
          scene === "neonregen" ? <path fill={v % 2 ? p.glow : p.light} opacity=".8" d={`M${w - 1}-${h - 5}h4v${12 + v * 2}h-4zM4-${h + 3}h${w - 8}v1H4zM${w - 9}-${h + 14}h1v10h-1z`} /> :
            industrial ? <path fill={p.ink} d={`M5-${h}v-${7 + v * 3}h5v${7 + v * 3}zM3-${h + 6 + v * 3}h9v2H3zM${w + 3}-4v-17h10v3h-7v14zM${w - 13}-15h2v15h-2z`} /> :
              <path fill={p.ink} d={`M5-${h + 12}h4v12H5zM${w + 5}-4h9v3h-9zM${w + 7}-10h2v10h-2zM-4-2h${w + 14}v2H-4z`} />}
    {scene === "luftschiffhafen" && <path fill={p.mid} d={`M-8 0h${w + 26}v2H-8zM-4 2h3v2h-3zM${w + 10} 2h3v2h-3z`} />}
  </g>;
}

function Wing({ scene, side, seed, p }: { scene: BannerId; side: "left" | "right"; seed: number; p: Palette }) {
  const kind = TERRAIN[scene], isLeft = side === "left", offset = isLeft ? -4096 : 320;
  return <g data-landscape-wing={side}>
    {kind !== "space" && kind !== "data" && kind !== "lab" && <path fill={p.far} opacity=".45" d={Array.from({ length: 55 }, (_, i) => {
      const x = offset + i * 70, top = 25 + Math.floor(sample(seed, i, 2) * 35), span = 53 + Math.floor(sample(seed, i, 5) * 33);
      if (kind === "town" || kind === "garden" || kind === "market" || kind === "haunted") return `M${x} 96V${top + 10}h9V${top}h${span - 24}v7h15v${89 - top}z`;
      if (kind === "ocean") return `M${x} 96V${top + 30}h17v-3h${span - 34}v5h17v${64 - top}z`;
      if (kind === "woods") return `M${x} 96V${top + 7}h9v-7h${span - 25}v5h16v${91 - top}z`;
      if (kind === "coast" || kind === "clouds") return `M${x} ${top + 18}h13v-3h${span - 31}v3h18v3H${x}z`;
      return `M${x} 96V${top + 15}h9v-5h7v-10h${span - 39}v4h10v8h13v${88 - top}z`;
    }).join("")} />}
    {Array.from({ length: 46 }, (_, i) => {
      const r = (salt: number) => sample(seed, i, salt), x = offset + i * 82 - 22 + Math.floor(r(0) * 57);
      const y = 34 + Math.floor(r(1) * 39), width = 22 + Math.floor(r(2) * 43), variant = Math.floor(r(6) * 5);
      const isLit = r(4) > .35;
      switch (kind) {
        case "woods": {
          const treeHeight = 29 + Math.floor(r(3) * 38), ground = 87 + Math.floor(r(7) * 8);
          return <g key={i} transform={`translate(${x} ${ground})`}>
            {variant < 2 ? <g transform={`scale(${variant ? .7 : 1} ${treeHeight / 48})`}><path fill={p.ink} d="M-2-48h4v7h4v6h4v6H7v3h8v7h-4v3h10v7H2V0h-4v-9h-19v-7h10v-3h-4v-7h8v-3h-3v-6h4v-6h4z" /><path fill={p.mid} d="M0-41h2v12h5v7H0v6h9v6H-9v-3h9z" /><path fill={scene === "eiswacht" ? p.light : p.glow} opacity={scene === "eiswacht" ? .75 : .25} d="M-2-44h4v7h-5v3h-3v-3h4zM-8-24h9v2h7v3H-9zM-13-12H0v2h15v3h-30z" /></g> :
              variant === 2 ? <><path fill={p.ink} d={`M-2 0v-${treeHeight - 18}h-12v-5h-7v-12h6v-7h13v-5h15v5h12v8h5v12h-8v6H3V0z`} /><path fill={p.mid} d={`M-15-${treeHeight - 13}v-9h9v-7H8v5h12v7H7v6H-4v-2z`} /><path fill={scene === "eiswacht" ? p.light : p.glow} opacity={scene === "eiswacht" ? .65 : .25} d={`M-11-${treeHeight - 22}h10v-7h10v3h10v3H1v5h-12z`} /><path fill={p.mid} d="M0-17h1v16H0zM1-12h7v-6h2v8H1z" /></> :
                variant === 3 ? <><path fill={p.ink} d={`M0 0v-${treeHeight}h3v${treeHeight - 21}h9v-12h3v15H3V0zM0-14h-10v-3h-5v-11h3v9H0zM3-${treeHeight - 8}h10v-8h2v11H3z`} /><path fill={scene === "eiswacht" ? p.light : p.mid} opacity=".65" d={`M1-${treeHeight}h1v${treeHeight}H1zM-12-19h9v1h-9zM4-22h8v1H4z`} /><path fill={p.mid} d="M-12-2h11v-4h12v2h16v4h-39z" /></> :
                  <><path fill={p.ink} d="M-18 0v-7h6v-6H1v3h11v-4h12v6h7v8zM-11-10h5v-7h3v7H1v5h-12z" /><path fill={p.mid} d="M-15-6h10v-4H2v3h10v-4h9v5h7v2H-15z" /><path fill={scene === "eiswacht" ? p.light : p.glow} opacity=".4" d="M-12-8h10v2h-10zM13-9h9v2h-9zM-3-2h13v1H-3z" /></>}
            {(scene === "pilzdorf" || scene === "gluehwald") && variant !== 3 && <><path fill={p.glow} d={`M${width - 9}-3v-4h4v-3h${5 + variant * 2}v3h4v4zM${width + 11}-1v-3h3v-2h5v2h3v3z`} /><path fill={p.light} d={`M${width - 3}-3h2v6h-2zM${width + 16}-1h1v4h-1zM${width - 3}-8h2v1h-2z`} /></>}
            {i % 7 === 3 && <path fill={p.light} className="pb-fireflies" d={`M${width}-19h1v1h-1zM${width + 8}-11h1v1h-1z`} />}
            <path fill={p.mid} opacity=".45" d={`M-22 2h${width + 33}v1h-${width + 33}zM27-6h1v5h-1zM32-4h1v4h-1z`} />
          </g>;
        }
        case "ridge": return <g key={i}>
          {variant === 3 ? <><path fill={p.ink} d={`M${x - 9} 96V76h13v-6h${width}v5h11v21z`} /><path fill={p.mid} d={`M${x + 4} 71h${width - 2}v2H${x + 4}zM${x + 18} 80h11v1h-11z`} /></> : variant === 4 ? <><path fill={p.ink} d={`M${x} 96V68h8V${y - 6}h11v20h9v12h8v32zM${x + 31} 96V77h8V${y + 8}h9v25h12v63z`} /><path fill={p.mid} opacity=".6" d={`M${x + 13} ${y - 4}h5v19h-5zM${x + 44} ${y + 10}h3v18h-3z`} /></> : <>
          <path fill={p.ink} d={`M${x - 8} 96V${y + 30}h12v-8h10v-8h10V${y}h12v9h9v10h12v9h14v68z`} />
          <path fill={p.mid} opacity=".65" d={`M${x + 26} ${y}h12v9h9v10h12v9h14v3h-23v-8h-10v-9h-9v-7h-5z`} />
          </>}
          <path fill={p.glow} opacity=".25" d={`M${x + 33} ${y + 10}h5v1h-5zM${x + 51} ${y + 28}h9v1h-9zM${x + 18} 84h15v1h-15z`} />
          {scene === "drachenberge" ? <path fill={p.glow} className={i % 4 === 0 ? "pb-lantern" : undefined} opacity=".6" d={`M${x + 20} 91h13v-2h8v2h-5v3h-16z`} /> :
            isLit && <><path fill={p.far} d={`M${x + 52} 75h20v16h-20zM${x + 48} 75v-3h7v-4h13v4h8v3z`} /><path fill={p.light} d={`M${x + 56} 80h3v4h-3zM${x + 65} 80h3v4h-3z`} /></>}
        </g>;
        case "desert": return <g key={i}>
          <path fill={p.mid} d={variant < 2 ? `M${x} 83V${y}h${width}v7h7v19h7V83z` : variant < 4 ? `M${x - 9} 84v-6h13v-4h${width - 7}v3h18v7z` : `M${x + 5} 84V${y + 4}h8v-7h9v13h6v74zM${x + 35} 84V${y + 17}h14v-5h7v72z`} />
          <path fill={p.light} opacity=".2" d={variant < 2 ? `M${x + 2} ${y + 2}h${width - 4}v2H${x + 2}zM${x + 8} ${y + 13}h${width - 6}v1H${x + 8}z` : `M${x + 4} 75h${width - 5}v1H${x + 4}zM${x + 18} 82h15v1h-15z`} />
          <path fill={p.ink} d={`M${x + 58} 58h3v25h-3zM${x + 54} 61h2v9h5v2h-7zM${x + 62} 67h4v-9h2v11h-6zM${x - 4} 88h83v2h-83z`} />
          <path fill={p.glow} opacity=".5" d={`M${x} 94h4v1h-4zM${x + 33} 85h7v1h-7zM${x + 48} 91h3v1h-3z`} />
        </g>;
        case "clouds": return <g key={i}>
          <path fill={p.light} opacity=".12" d={`M${x - 15} ${y + 16}h18v-3h14v-4h23v4h14v3h19v4H${x - 15}z`} />
          {variant !== 4 && <><path fill={p.ink} d={variant < 2 ? `M${x + 5} ${y + 25}h${width}v5h-7v6h-9v7h-10v5h-9v-8h-10v-7h-7z` : `M${x - 4} ${y + 23}h${width + 13}v5h-11v6h-17v4h-13v-5h-12v-5H${x - 4}z`} />
          <path fill={p.mid} d={`M${x + 5} ${y + 23}h${width - 2}v4H${x + 5}z`} /><path fill={p.light} opacity=".4" d={`M${x + 12} ${y + 24}h9v1h-9z`} />
          {variant === 0 ? <path fill={p.mid} d={`M${x + 18} ${y + 23}v-8h-6v-5h3v-5h7v4h5v6h-6v8z`} /> : variant === 1 ? <path fill={p.glow} opacity=".45" d={`M${x + 28} ${y + 28}h2v15h-2zM${x + 25} ${y + 37}h1v5h-1z`} /> : <path fill={p.glow} opacity=".45" d={`M${x + 16} ${y + 20}h3v3h-3zM${x + 25} ${y + 19}h2v4h-2z`} />}</>}
          <path fill={p.light} opacity=".15" d={`M${x - 10} 89h17v-3h22v-3h18v3h29v4h10v4h-96z`} />
        </g>;
        case "cave": return <g key={i}>
          <path fill={p.ink} d={`M${x - 10} 0h89v8h-12v11h-6V8h-16v17h-7V11H${x - 10}zM${x - 10} 92h91v4h-91z`} />
          {variant < 3 ? <><path fill={p.mid} d={`M${x + 13} 89V${y + 13}h3v-5h4v-5h3v5h4v5h3v${76 - y}zM${x + 41} 89V${y + 5}h3v-7h4v7h4v${84 - y}z`} /><path fill={p.glow} opacity=".7" d={`M${x + 20} ${y + 13}h2v${74 - y}h-2zM${x + 47} ${y + 4}h2v${83 - y}h-2z`} /><path fill={p.light} opacity=".5" d={`M${x + 19} ${y + 12}h2v2h-2zM${x + 48} ${y + 8}h1v9h-1z`} /></> : variant === 3 ? <><path fill={p.mid} d={`M${x - 4} 92V79h8v-7h${width - 8}v9h11v11z`} /><path fill={p.glow} opacity=".45" d={`M${x + 9} 73h${width - 16}v2H${x + 9}zM${x + 3} 84h9v1h-9z`} /></> : <><path fill={p.mid} d={`M${x + 8} 6h21v14h-4v14h-4v12h-3V32h-5V19H${x + 8}z`} /><path fill={p.glow} opacity=".45" d={`M${x + 18} 10h2v24h-2z`} /></>}
          <path fill={p.light} opacity=".3" d={`M${x + 33} 93h9v1h-9z`} />
        </g>;
        case "town": case "garden": case "lab": case "haunted": case "market":
          return <Settlement key={i} scene={scene} kind={kind} x={x} y={y} width={width} variant={variant} p={p} isLit={isLit} />;
        case "data": return <g key={i} fill="none" stroke={p.mid} strokeWidth="1">
          <path d={variant < 2 ? `M${x} 96V${y}h15V${y - 19}h${width}v-7M${x + 7} 96V${y + 10}h18V${y - 10}h${width - 8}` : variant < 4 ? `M${x} ${y + 24}h${width}v-18h13V${y - 12}h10M${x + 7} ${y + 31}h${width}v-15h20` : `M${x} ${y}h11v-13h${width}v32h-14v12H${x + 19}v-8M${x + 6} ${y + 7}h10v-12h${width - 12}v17`} />
          <path fill={p.light} stroke="none" opacity=".55" d={`M${x + 13} ${y - 21}h4v4h-4zM${x + width + 12} ${y - 30}h5v5h-5z`} />
          <path className={i % 4 === 0 ? "pb-packet" : undefined} fill={p.glow} stroke="none" d={`M${x + 19} ${y - 20}h5v2h-5z`} />
        </g>;
        case "ocean": return <g key={i} transform={`translate(${x} 92)`}>
          <path fill={p.ink} d={`M-16 4V-3h12v-5h${width - 6}v4h17v8z`} />
          {variant === 0 ? <><path fill={p.mid} d="M-2 0v-15h-8v-4h-7v-16h3v13h7v-21h3v24h6v-11h8v-13h3v16H5v12h8v-7h7v-13h3v16h-7v8H3V0z" /><path fill={p.glow} opacity=".45" d="M-14-33h1v10h-1zM-4-38h1v17h-1zM11-40h1v12h-1zM20-32h1v11h-1zM-1-13h1V0h-1z" /></> :
            variant === 1 ? <g className="pb-sway"><path fill={p.mid} d="M0 0v-15h-3v-13h3v-12h-4v-13h3v11h4v17H0v10h4V0zM14 0v-18h4v-13h-3v-12h3v10h3v17h-4V0zM-11 0v-9h-4v-12h2v10h5V0z" /><path fill={p.glow} opacity=".4" d="M1-49h1v9H1zM1-22h1v10H1zM18-30h1v9h-1z" /></g> :
              variant === 2 ? <><path fill={p.mid} d={`M-10-4v-8h7v-9h${Math.floor(width / 2)}v5h10v7h5v6zM${width - 2} 0v-5h5v-6h11v6h4v5z`} /><path fill={p.glow} opacity=".3" d={`M-1-19h${Math.floor(width / 2) - 3}v2H-1zM${width + 4}-9h7v2h-7z`} /><path fill={p.light} opacity=".45" d="M-8-2h6v1h-6zM22-4h5v1h-5z" /></> :
                variant === 3 && scene === "versunkener_tempel" ? <><path fill={p.mid} d="M-5 0v-4h3v-24h-4v-4H5v-6h10v4h4v5h-5v25h4v4zM26 0v-9h5v-4h11v4h7v9z" /><path fill={p.glow} opacity=".35" d="M2-27h2v21H2zM10-26h1v20h-1zM-4-31H6v1H-4zM30-10h10v1H30z" /><path fill={p.ink} d="M6-22h4v2H8v8H6z" /></> :
                  <><path fill={p.mid} d="M0 0v-22h6V0zM10 0v-31h7V0zM23 0v-18h5V0zM32 0v-9h4V0z" /><path fill={p.glow} opacity=".6" d="M-1-23h8v3h-8zM9-32h9v3H9zM22-19h7v3h-7z" /><path fill={p.light} opacity=".25" d="M1-19h1v16H1zM12-27h1v23h-1zM24-14h1v12h-1z" /></>}
          {r(8) > .42 && <g transform={`translate(${28 + variant * 5} ${y - 102})`}><g className={i % 5 === 0 ? "pb-cruise" : undefined} fill={p.glow} opacity=".55"><path d="M0 0h7v3H0zM-4-1h3v5h-3zM13 7h5v2h-5zM10 6h2v4h-2z" /><path fill={p.light} d="M5 0h1v1H5z" /></g></g>}
        </g>;
        case "coast": return <g key={i} transform={`translate(${x} 86)`}>
          {variant < 3 ? <g transform={`scale(${.75 + r(3) * .6} ${.65 + r(5) * .6})`}>
            <path fill={p.ink} d="M14 0v-13h2v-13h2v-19h3v20h-2v14h-2V0zM19-44v-4h9v2h9v4h5v6h-3v-4h-7v-3h-8v3h-6v-2H7v4H4v-7h6v-2h9zM18-42h-6v5H9v9h2v-7h4v-4h5z" />
            <path fill={p.mid} d="M19-43h9v1h-9zM18-31h1v5h-1zM16-17h1v4h-1zM14-4h2v2h-2z" />
          </g> : variant === 3 ? <><path fill={p.ink} d="M-2-16h5v-4h7v-3h13v3h7v4h5v3H-2zM16-13h2v13h-2zM32-7h17v2H32zM34-5h1v5h-1zM47-5h1v5h-1z" /><path fill={p.glow} opacity=".6" d="M11-21h11v6H11zM2-16h7v2H2zM25-16h7v2h-7z" /></> :
            <><path fill={p.ink} d="M-5 0v-6h6v-5h11v5h7v6zM26 0v-13h2v13zM24-8h-4v-6h2v4h4zM29-9h5v-8h2v10h-7z" /><path fill={p.mid} d="M0-9h10v2H0zM2-5h1v2H2z" /></>}
          <path fill={p.glow} opacity=".25" d={`M-14 2h${width + 30}v1h-${width + 30}zM4 7h17v1H4zM45 9h13v1H45z`} />
          {variant === 1 && <path fill={p.light} opacity=".55" d="M43-7h13v2H43zM45-5h1v5h-1zM54-5h1v5h-1z" />}
        </g>;
        case "space": return <g key={i} transform={`translate(${x} ${9 + Math.floor(r(1) * 77)})`}>
          {variant === 0 ? <><path fill={p.far} d="M2 0h12v3h5v9h-4v5H4v-4H0V4h2z" /><path fill={p.mid} d="M3 1h9v2H3zM1 5h3v5H1zM10 7h4v4h-4z" /></> : variant === 1 ? <><path fill={p.far} d="M0 0h7v2h6v5H9v3H1V7h-4V3h3z" /><path fill={p.mid} d="M0 1h5v1H0zM6 4h2v2H6z" /></> : <path fill={p.mid} opacity=".5" d="M0 0h2v2H0zM7 4h3v2H7zM13-3h1v1h-1z" />}
          <path fill={p.light} opacity=".55" d="M51-8h1v1h-1zM39 11h1v3h-1zM38 12h3v1h-3z" />
        </g>;
      }
    })}
  </g>;
}

export const BannerLandscape = memo(function BannerLandscape({ scene }: { scene: BannerId }) {
  const p = BANNER_PALETTES[scene], seed = [...scene].reduce((value, char) => value * 31 + char.charCodeAt(0) | 0, 7);
  const kind = TERRAIN[scene], snow = scene === "eiswacht", weather = snow || scene === "neonregen";
  const waterDust = kind === "ocean" || kind === "cave" || kind === "lab";
  const daylight = ["himmelsinseln", "luftschiffhafen", "stahlwerk", "wuestenexpress", "dachgaerten", "raketenhafen", "pastellpalmen", "wolkenkloster", "drachenberge", "sonnenraster"].includes(scene);
  return <><path fill={p.sky} d="M-4096 0h8192v96h-8192z" />
    {[16, 28, 40, 50, 60, 70, 80].map((y, i) => <path key={y} fill={p.horizon} opacity={.05 + i * .055} d={`M-4096 ${y}h8192v${96 - y}h-8192z`} />)}
    {scene === "pastellpalmen" && <><path fill="#a095bc" d="M-4096 41h8192v36h-8192z" /><path fill="#81b6bd" d="M-4096 49h8192v27h-8192z" /><path fill="#dec0bd" d="M-4096 76h8192v20h-8192z" /><path fill="#f1d6cc" d="M-4096 75h8192v2h-8192z" /></>}
    {scene === "sonnenraster" && <path fill="#271d3e" d="M-4096 65h8192v31h-8192z" />}
    {scene === "neonregen" && <path fill="#202443" d="M-4096 64h8192v32h-8192z" />}
    {scene === "raketenhafen" && <><path fill="#3b4a5b" d="M-4096 73h8192v23h-8192z" /><path fill="#636877" d="M-4096 75h8192v2h-8192z" /></>}
    {scene === "datenstrom" && <path fill="#133444" d="M-4096 73h8192v23h-8192z" />}
    {scene === "biolabor" && <><path fill="#21443f" d="M-4096 16h8192v3h-8192zM-4096 65h8192v3h-8192zM-4096 79h8192v17h-8192z" /><path fill="#507c68" d="M-4096 12h8192v4h-8192zM-4096 81h8192v2h-8192z" /></>}
    {!daylight && <path fill={p.light} opacity={waterDust ? .12 : .35} d={Array.from({ length: waterDust ? 260 : 700 }, (_, i) => `M${Math.floor(sample(seed, i, 7) * 8192) - 4096} ${3 + Math.floor(sample(seed, i, 9) * (waterDust || kind === "space" ? 89 : 40))}h1v1h-1z`).join("")} />}
    <Wing scene={scene} side="left" seed={seed} p={p} /><Wing scene={scene} side="right" seed={seed ^ 0x4f32ab} p={p} />
    {weather && <g data-landscape-weather={snow ? "snow" : "rain"}>{[0, 1].map(layer => {
      // Same 96px period, four guard fields and timing as the central Rain primitive.
      const marks = Array.from({ length: snow ? 460 : 896 }, (_, i) => {
        const x = Math.floor(sample(seed, i, 32 + layer) * 8192) - 4096, y = (i * 29 + layer * 17) % 96;
        return snow ? `M${x} ${y}h${1 + layer}v${1 + layer}h-${1 + layer}z` : `M${x} ${y}h1v3h-1z m-1 3h1v${2 + layer}h-1z`;
      }).join("");
      return <g key={layer} className={snow ? "pb-snow" : "pb-rain"} data-landscape-weather-layer={layer}
        style={{ "--pb-fall-duration": snow ? `${22 - layer * 7}s` : `${2.8 - layer}s` } as CSSProperties}
        fill={p.light} opacity={snow ? .3 + layer * .3 : .13 + layer * .12}>
        {[-2, -1, 0, 1].map(row => <path key={row} transform={`translate(0 ${row * 96})`} d={marks} />)}
      </g>;
    })}</g>}
  </>;
});
