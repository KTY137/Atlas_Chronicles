// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import type { ReactNode } from "react";
import type { BannerId } from "@chronicle/theme";
import { BANNER_PALETTES } from "./pixel-banner-palettes";
import { Smoke, type Palette } from "./pixel-banner-primitives";

function Lamp({ p, x, y }: { p: Palette; x: number; y: number }) {
  return <g transform={`translate(${x} ${y})`}><path fill={p.ink} d="M0 0h2v36H0zM-5 0H7v2H-5z" /><g transform="translate(1 2)"><g className="pb-lantern-swing"><path fill={p.glow} opacity=".08" d="M-13 0h26v30h-26z" /><path fill={p.ink} d="M-5 0H5v10H-5z" /><path fill={p.light} d="M-3 2H3v6H-3z" /><path fill={p.glow} d="M-1 2H1v6H-1z" /></g></g></g>;
}
function Ledge({ p }: { p: Palette }) {
  return <><path fill={p.ink} d="M-7 85h166v11H-7z" /><path fill={p.mid} d="M-3 84h152v3H-3z" /><path fill={p.light} opacity=".25" d="M4 85h28v1H4zM48 85h12v1H48zM84 85h42v1H84zM31 91h11v1H31zM104 93h16v1h-16z" /></>;
}
function StarVignettes() {
  const p = BANNER_PALETTES.sternwarte;
  return <><g transform="translate(-500 0)"><Ledge p={p} />
    <path fill={p.ink} d="M18 33h52v51H18zM15 30h58v4H15zM23 26h45v4H23z" /><path fill={p.mid} d="M22 35h44v47H22z" />
    <path fill="#786c9b" d="M25 36h2v45h-2zM46 36h2v45h-2zM63 36h2v45h-2zM24 49h40v2H24zM24 63h40v2H24zM24 76h40v2H24z" />
    <path fill="#c89b91" d="M28 40h4v9h-4zM34 39h3v10h-3zM50 53h4v10h-4zM59 52h3v11h-3zM31 68h5v8h-5z" /><path fill="#d6bf80" d="M39 42h5v7h-5zM28 53h4v10h-4zM34 56h8v7h-8zM56 40h6v9h-6zM49 68h4v8h-4zM56 69h5v7h-5z" />
    <path fill={p.light} opacity=".55" d="M29 42h2v1h-2zM40 44h3v1h-3zM50 70h2v1h-2z" />
    <path fill={p.mid} d="M78 69h47v3H78zM82 72h3v12h-3zM118 72h3v12h-3z" /><path fill="#d4c9a7" d="M87 64h11l5 2 5-2h12v5H87z" /><path fill={p.ink} d="M102 66h1v4h-1z" />
    <g transform="translate(103 65)"><path className="pb-page-turn" fill="#f3e3b3" d="M0 0l11-4h5v5L0 3z" /></g>
    <g transform="translate(107 49)"><g className="pb-specimen"><path fill={p.glow} opacity=".14" d="M-13-9h26v22h-26z" /><path fill={p.light} d="M-2-7H2v5h5V2H2v5H-2V2H-7V-2h5z" /></g></g>
    <Lamp p={p} x={138} y={48} /><path fill={p.glow} opacity=".22" d="M125 88h28v1h-28zM130 91h17v1h-17z" />
  </g><g transform="translate(350 0)"><Ledge p={p} />
    <path fill={p.mid} d="M35 79h66v5H35zM43 74h49v5H43zM61 63h13v11H61z" />
    <g transform="translate(67 44)"><g className="pb-rotor" style={{ animationDuration: "28s" }} fill="none" stroke="#c7a971" strokeWidth="2"><path d="M-27-5h5v-13h11v-6h22v6h11v13h5V5h-5v13H11v6H-11v-6h-11V5h-5zM-25 0H25M0-24V24M-17-17L17 17M17-17L-17 17" /></g><path fill="#f3dfb5" d="M-3-3H3V3H-3z" /></g>
    <path fill="#9f82ac" d="M9 75h8v9H9zM8 74h10v2H8z" /><path fill={p.light} d="M10 75h2v6h-2zM122 74h9v2h-9zM124 72h5v2h-5z" />
    <g transform="translate(124 67)"><g className="pb-steam" fill={p.light}><path d="M0 0h2v-4H0zM3-7h2v-4H3z" /></g></g>
    <path fill={p.ink} d="M103 78h2v-3h2v3h5v-3h2v9h-12zM112 81h7v-5h2v7h-9z" /><path fill={p.light} d="M106 79h1v1h-1zM111 79h1v1h-1z" />
  </g></>;
}
function TempleVignettes() {
  const p = BANNER_PALETTES.versunkener_tempel;
  return <><g transform="translate(-500 0)"><Ledge p={p} />
    <path fill={p.ink} d="M22 85V43h10V29h14v-9h60v9h14v14h10v42h-21V47h-7V36H49v11h-7v38z" /><path fill={p.mid} d="M25 83V45h10V32h14v-9h54v9h14v13h10v38h-13V44h-8V33H46v11h-8v39z" />
    <path fill={p.glow} opacity=".5" d="M49 25h52v2H49zM27 47h2v33h-2zM119 49h2v26h-2zM44 35h3v7h-3z" />
    <path fill={p.ink} d="M36 50h7v2h-7zM30 68h10v2H30zM114 61h10v2h-10zM60 24h1v7h-1zM85 24h1v7h-1z" />
    <g transform="translate(74 57)"><g className="pb-crystal-pulse"><path fill={p.glow} opacity=".14" d="M-18-17h36v35h-36z" /><path fill="#b4e6ce" d="M-2-13H2v8h6V2H2v9H-2V2H-8V-5h6z" /><path fill={p.light} d="M-1-8H1V4H-1z" /></g></g>
    <g transform="translate(110 35)"><g className="pb-bubbles" style={{ animationDelay: "-2s" }} fill="none" stroke={p.light}><path d="M0 0h3v3H0zM7-9h4v4H7z" /></g></g>
    <path fill="#588c83" d="M12 85V64H8V50h3v12h4v12h4V58h3v19h-7v8zM135 85V66h4V51h3v18h-4v16z" />
  </g><g transform="translate(350 0)"><Ledge p={p} />
    <path fill="#355c60" d="M18 77h15v-7h17v-8h35v5h26v8h15v10H18z" /><path fill="#547c75" d="M22 76h23v-7h39v2H47v8H22zM79 74h18v1H79z" />
    <g transform="translate(67 70)"><g className="pb-specimen" style={{ animationDuration: "6.5s" }}><path fill="#ae9ad2" d="M-18-17h5v-6h9v-3H5v3h9v6h5v12h-6v8h-5V-6H2V9H-2V-6H-8V3h-5V-5h-5z" /><path fill="#d8c4ec" d="M-11-18h8v-4H4v3h7v4h4v5h-30v-5h4z" /><path fill={p.ink} d="M-8-14h2v3h-2zM7-14h2v3H7z" /><path fill="#f4e4de" d="M-7-14h1v1h-1zM8-14h1v1H8z" /></g></g>
    <path fill="#82b6a8" d="M115 81V56h3v12h6V48h3v27h-9v6zM123 61h8v-9h3v12h-11z" /><path fill="#d7bb97" d="M31 83h8v-3h8v3h8v2H31zM34 79h2v3h-2zM42 77h2v6h-2z" />
    <g transform="translate(28 30)"><g className="pb-cruise" fill={p.glow}><path d="M0 0h12v4H0zM-5-2h3v8h-3zM21 8h8v3h-8zM17 7h3v5h-3z" /><path fill={p.light} d="M9 0h1v1H9z" /></g></g>
  </g></>;
}
function MushroomVignettes() {
  const p = BANNER_PALETTES.pilzdorf;
  return <><g transform="translate(-500 0)"><Ledge p={p} />
    <path fill="#403d43" d="M18 0h27v22h8v11h-7v53H16V58h7V32h-5z" /><path fill="#68534f" d="M25 0h3v24h7v7h-5v49h-3V49h-3V30h-2zM37 37h2v31h-2z" />
    <path fill="#a29b72" d="M19 58h8v3h-8zM39 27h11v3H39z" /><path fill="#718571" d="M14 20h14v3H14zM39 4h11v4H39z" />
    <path fill={p.ink} d="M25 36h12v17H25z" /><path fill="#c8ac87" d="M27 39h2v-2h2v2h3v-2h2v2h2v9H26v-7h1z" /><path fill={p.light} d="M28 41h3v3h-3zM34 41h3v3h-3z" /><g className="pb-blink" fill={p.ink}><path d="M29 42h1v1h-1zM35 42h1v1h-1z" /></g>
    <path fill="#77665c" d="M64 75h56v4H64zM70 79h3v6h-3zM112 79h3v6h-3zM84 64h19v11H84z" /><path fill="#c9a27e" d="M84 64h19v2H84zM87 68h13v1H87zM87 72h13v1H87z" />
    <path fill="#d99685" d="M84 60h7v4h-7zM94 59h7v5h-7z" /><path fill="#f3d2a4" d="M86 60h3v1h-3zM96 59h3v1h-3z" />
    <Smoke p={p} x={96} y={56} /><Lamp p={p} x={134} y={48} />
    <path fill="#759168" d="M46 85v-9h3v9zM45 76v-4h6v4zM125 85v-7h2v7z" />
  </g><g transform="translate(350 0)"><Ledge p={p} />
    <path fill="#443e46" d="M15 81v-8h11v-5h16v-7h48v7h16v5h13v8z" /><path fill="#78886f" d="M27 73h16v-7h46v5H45v6H27z" /><path fill="#1e4b4b" d="M34 79h65v3H34z" />
    <g className="pb-water" fill="#a2c9b7" opacity=".6"><path d="M41 79h18v1H41zM76 81h15v1H76z" /></g>
    <g transform="translate(70 50)"><g className="pb-fairy-flight" style={{ animationDuration: "9s" }}><g className="pb-wing" fill="#cbd4b4" opacity=".8"><path d="M-4-6h-8V2h9zM4-7h9V2H3z" /></g><path fill="#cf9685" d="M-2-4H3V9H-2z" /><path fill="#f3dbac" d="M-3-9H3v5H-3zM0 9H2v4H0z" /><path fill={p.glow} d="M3 4h9v2H3zM10 3h7v5h-7zM14 8h1v5h-1z" /></g></g>
    <path fill="#9eb889" d="M19 85V69h2v16zM18 68h-7v-3h9v-7h3v7h9v3h-8v4h-6zM125 86V55h2v31z" /><path fill="#d4adcc" d="M118 58v-5h4v-5h7v5h4v5z" /><path fill={p.light} d="M124 50h2v3h-2z" />
    <g transform="translate(105 73)"><g className="pb-snail-crawl"><path fill="#c1b08b" d="M0 5h18v3H0zM14 0h3v6h-3zM15-2h1v2h-1z" /><path fill="#a881ae" d="M3-1h7v2h3v5H1V1h2z" /><path fill="#ead3ad" d="M5 1h4v2H5zM6 3h2v2H6z" /></g></g>
  </g></>;
}
function CloudVignettes() {
  const p = BANNER_PALETTES.wolkenkloster;
  return <><g transform="translate(-500 0)">
    <path fill={p.mid} d="M14 66h126v6h-16v8h-17v8H45v-8H28v-8H14z" /><path fill={p.ink} d="M30 74h95v5h-18v8H46v-7H30z" /><path fill={p.glow} d="M14 65h126v2H14z" />
    <path fill="#776965" d="M44 65V41h-7V32h4v6h7V21h5v23h13V27h4v19H53v19z" /><path fill="#6c8e7c" d="M28 30v-5h7v-5h17v3h15v6h-9v5H39v-4zM57 24v-6h8v-4h18v5h7v6z" /><path fill="#a0b091" d="M37 22h14v2H37zM64 17h18v2H64z" />
    <path fill="#cba28a" d="M90 58h6v7h-6zM87 62h12v3H87z" /><path fill="#e8d1aa" d="M91 54h4v4h-4z" /><path fill={p.ink} d="M89 64h10v2H89z" />
    <path fill="#a4b4ae" d="M76 65h1V41h-1zM110 65h1V38h-1z" /><path fill="none" stroke="#a9aa94" d="M76 42q17 9 35-3" /><g transform="translate(86 46)"><g className="pb-flag-flutter"><path fill="#d1b1a6" d="M0 0H7v8H0z" /><path fill="#ead4ae" d="M1 2h5v1H1zM3 4h1v3H3z" /></g></g><g transform="translate(100 43)"><path className="pb-flag-flutter" fill="#a8bfc5" d="M0 0H7v9H0z" /></g>
    <g className="pb-cloud" fill={p.light} opacity=".18"><path d="M0 88h25v-4h19v-4h32v4h29v4h42v6H0z" /></g>
  </g><g transform="translate(350 0)">
    <path fill={p.mid} d="M10 68h134v6h-19v8H99v9H53v-8H30v-9H10z" /><path fill={p.glow} d="M10 67h134v2H10z" />
    <path fill={p.ink} d="M38 67V29h5v38zM104 67V29h5v38zM27 26h93v5H27zM37 22h73v4H37zM46 18h56v4H46z" /><path fill="#b8ae8e" d="M41 32h1v31h-1zM106 32h1v31h-1zM37 25h73v1H37z" />
    <g transform="translate(74 31)"><g className="pb-pendulum" style={{ animationDuration: "4.2s" }}><path fill="#b1a37d" d="M-1 0H1v11H-1zM-8 11H8v7h5v4h-26v-4h5z" /><path fill="#e8d3a0" d="M-5 13h3v5h-3zM-1 22H2v5H-1z" /></g></g>
    <path fill="#8caa91" d="M123 66V49h2v17zM128 66V43h2v23zM133 66V52h2v14z" /><path fill="#cbad8c" d="M21 61h5v6h-5z" />
    <g transform="translate(26 38)"><g className="pb-cruise"><path fill="#f0dcc6" d="M0 0h15v3h6v4h-6v3H0V7h-5V3h5zM21 3h4V0h3v10h-3V7h-4z" /><path fill="#cd947f" d="M3 0h5v3H3zM9 6h6v4H9z" /><path fill={p.ink} d="M-2 4h1v1h-1z" /></g></g>
  </g></>;
}
function MarketVignettes() {
  const p = BANNER_PALETTES.nachtmarkt;
  return <><g transform="translate(-500 0)"><Ledge p={p} />
    <path fill={p.ink} d="M12 34h100v49H12zM7 29h111v6H7zM16 23h92v6H16z" /><path fill="#645169" d="M16 37h92v44H16z" />
    <path fill="#c0967c" d="M20 41h35v27H20zM65 41h38v27H65z" /><path fill="#392b48" d="M23 44h29v21H23zM68 44h32v21H68z" />
    <path fill="#e4c095" d="M27 49h8v3h-8zM40 48h7v4h-7zM27 58h8v4h-8zM39 57h8v5h-8zM74 51h21v2H74zM75 57h8v6h-8zM88 55h7v8h-7z" />
    <path fill="#ab6f91" d="M7 32h111v7H7z" /><path fill="#d6b3b0" d="M13 32h8v8h-8zM32 32h8v8h-8zM51 32h8v8h-8zM70 32h8v8h-8zM89 32h8v8h-8zM108 32h8v8h-8z" />
    <Lamp p={p} x={126} y={44} /><Smoke p={p} x={83} y={48} />
    <path fill="#4b374b" d="M24 71h18v3H24zM28 74h2v10h-2zM38 74h2v10h-2z" /><path fill="#af91ae" d="M72 72h7v11h-7z" /><path fill="#dfb99a" d="M73 67h5v5h-5z" /><path fill={p.light} d="M81 74h6v3h-6z" />
  </g><g transform="translate(350 0)"><Ledge p={p} />
    <path fill={p.mid} d="M11 84V63h14V51h18v-9h63v9h20v12h15v21h-13V69h-15V57H38v12H24v15z" /><path fill={p.light} opacity=".3" d="M44 45h61v1H44zM13 65h10v1H13zM113 55h11v1h-11z" /><path fill={p.ink} d="M20 62h1v17h-1zM32 53h1v9h-1zM48 45h1v9h-1zM68 45h1v9h-1zM90 45h1v9h-1zM112 53h1v9h-1zM132 64h1v17h-1z" />
    <path fill="#272c46" d="M26 85h120v11H26z" /><g className="pb-water" fill={p.glow} opacity=".4"><path d="M34 88h17v1H34zM70 92h24v1H70zM102 89h15v1h-15zM130 93h10v1h-10z" /></g>
    <g transform="translate(77 86)"><g className="pb-boat-glide" style={{ animationDuration: "17s" }}><path fill="#c8a085" d="M-17 0h35v3H13v3H-12V3h-5z" /><path fill="#ece0b9" d="M-8-7h8V0H-8z" /><path fill="#dc9ba6" d="M-3-13h4v7H-3z" /><path fill={p.glow} d="M1-11h4v6H1z" /></g></g>
    <Lamp p={p} x={33} y={19} /><Lamp p={p} x={118} y={20} />
    <g transform="translate(77 28)"><g className="pb-festival-spark" style={{ animationDelay: "-1.8s" }} fill="#d8b2df"><path d="M-1-17H1v7H-1zM-1 10H1v7H-1zM-17-1h7V1h-7zM10-1h7V1h-7zM-11-11h3v3h-3zM8 8h3v3H8zM-11 8h3v3h-3zM8-11h3v3H8z" /></g></g>
  </g></>;
}

export const DISCOVERY_VIGNETTES = {
  sternwarte: <StarVignettes />, versunkener_tempel: <TempleVignettes />, pilzdorf: <MushroomVignettes />,
  wolkenkloster: <CloudVignettes />, nachtmarkt: <MarketVignettes />,
} satisfies Partial<Record<BannerId, ReactNode>>;
