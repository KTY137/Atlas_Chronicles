// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import type { BannerId } from "@chronicle/theme";
import type { ReactNode } from "react";
import { BANNER_PALETTES } from "./pixel-banner-palettes";
import { Gear } from "./pixel-banner-primitives";

/** Two authored places in each world. Neither side repeats the central landmark. */
function Pair({ left, right }: { left: ReactNode; right: ReactNode }) {
  return <><g transform="translate(-500 0)" data-banner-vignette="left">{left}</g><g transform="translate(350 0)" data-banner-vignette="right">{right}</g></>;
}

function Lamp({ x, y, color = "#f8c77c" }: { x: number; y: number; color?: string }) {
  return <g transform={`translate(${x} ${y})`}><path fill="#27303b" d="M-1-7h2v5h3v9h-8v-9h3z" /><g className="pb-lantern"><path fill={color} opacity=".09" d="M-8-8H8v4h4V9H7v5H-7V9h-5V-4h4z" /><path fill={color} d="M-2-1h4v6h-4z" /><path fill="#fff0c4" d="M-1-1h1v4h-1z" /></g></g>;
}

function Reflection({ x, y, color }: { x: number; y: number; color: string }) {
  return <g transform={`translate(${x} ${y})`}><g className="pb-water" fill={color} opacity=".38"><path d="M-7 0H7v1H-7zM-11 4h17v1h-17zM-5 8h19v1H-5zM-13 12H5v1h-18zM-4 15H9v1H-4z" /></g></g>;
}

function MoonSides() {
  const p = BANNER_PALETTES.mondburg;
  return <Pair left={<>
    <path fill={p.far} d="M6 74h13v-7h26v-4h32v5h19v28H6z" /><path fill={p.ink} d="M0 76h160v20H0z" /><path fill={p.mid} opacity=".6" d="M0 76h160v1H0z" /><path fill="#101e31" d="M132 96v-2h10v-2h18v4z" />
    <path fill="#252a40" d="M16 67h103v7H16zM24 74h5v22h-5zM68 74h5v22h-5zM110 74h5v22h-5zM25 46h3v21h-3zM76 43h3v24h-3z" />
    <path fill="#8b7a81" d="M16 67h103v2H16zM28 69h1v4h-1zM44 69h1v4h-1zM60 69h1v4h-1zM76 69h1v4h-1zM92 69h1v4h-1zM108 69h1v4h-1zM25 45h15v2H25zM76 42h13v2H76z" />
    <path fill="#c7a994" opacity=".6" d="M21 67h23v1H21zM66 68h19v1H66zM26 76h1v11h-1zM70 79h1v13h-1z" />
    <Lamp x={39} y={53} /><Lamp x={88} y={49} color="#c1b5f0" /><Reflection x={39} y={80} color="#d2b19a" /><Reflection x={89} y={77} color="#b9a6ed" />
    <path fill="#675468" d="M44 57h13v10H44zM60 60h10v7H60z" /><path fill="#b79c8e" d="M44 59h13v1H44zM49 57h2v10h-2zM61 61h8v1h-8z" />
    <g transform="translate(101 58)"><path fill="#e1bb9d" d="M0-8h5v5H0z" /><path fill="#7a698f" d="M-2-4h8v11h-8zM0 7h2v3H0zM4 7h2v3H4z" /><path fill="#b2b1c6" d="M-3-9h10v2H-3z" /><g className="pb-pendulum" style={{ animationDuration: "3.6s" }}><path fill="#e6c6a1" d="M4-1h7v2H4zM10 1h1v5h-1z" /><Lamp x={10} y={11} /></g></g>
    <g transform="translate(139 83)"><g className="pb-pool-float"><path fill="#9798b3" d="M-6-2H7v3H5v2H-4V1h-2zM3-6h5v5H3z" /><path fill="#f1c49a" d="M8-5h4v2H8z" /><path fill="#ebe0bf" d="M6-5h1v1H6z" /></g></g>
    <path fill="#22273b" d="M6 67V50h3v17zM6 55H1v-9h2v7h3zM12 63h2v4h-2z" />
  </>} right={<>
    <path fill={p.ink} d="M0 92h14v-7h24v-5h82v4h22v8h18v4H0z" /><path fill="#55516f" d="M30 79h95v5H30zM39 74h80v5H39zM45 38h13v37H45zM100 42h12v33h-12zM41 32h20v7H41zM95 35h20v8H95zM48 22h27v7H61v5H43v-6h5zM85 26h24v6H85z" />
    <path fill="#9b8caa" d="M45 38h3v32h-3zM100 44h2v25h-2zM31 79h92v1H31zM48 23h21v2H48zM87 27h20v1H87z" /><path fill="#37364f" d="M51 46h5v2h-5zM47 61h7v2h-7zM101 55h8v2h-8zM95 35h4v4h-4zM58 26h4v5h-4z" />
    <path fill="#4d6c66" d="M40 32h13v3H43v10h-3zM104 35h9v18h-3V41h-6zM39 76h12v3H39zM94 80h21v3H94z" />
    <path fill="#7f718f" d="M69 68h22v5H69zM74 62h12v6H74z" /><g transform="translate(79 49)"><g className="pb-float"><path fill="#a99fcb" d="M-6-8H6v3h4V5H6v5H-6V6h-4V-4h4z" /><path fill="#f0dca9" d="M-2-7h4v4h3v6H2v4h-4V2h-3v-4h3z" /><path fill="#d3bbec" opacity=".12" d="M-16-15h32v30h-32z" /></g></g>
    <g fill="#d6c2f1" className="pb-crystal-pulse" opacity=".55"><path d="M64 71h6v1h-6zM91 72h8v1h-8zM74 80h14v1H74zM62 84h31v1H62z" /></g>
    <path fill="#bbb1b8" d="M123 82h10v-5h7v7h-4v3h-13zM17 82h12v6H17z" /><path fill="#82708d" d="M19 83h5v1h-5zM126 83h6v1h-6z" />
    <g transform="translate(59 69)"><path fill="#796380" d="M0-7h2v2h3v-2h2v9H0zM5 2h6v-4h2v6H5z" /><path fill="#efe2ad" className="pb-blink" d="M1-3h1v1H1zM4-3h1v1H4z" /></g>
  </>} />;
}

function ForestSides() {
  const p = BANNER_PALETTES.gluehwald;
  return <Pair left={<>
    <path fill={p.ink} d="M3 87h19v-7h20V57h7V27h-8V15h8v8h8V6h15v27h10V19h8v22h-9v27h8v10h18v7h33v11H3z" />
    <path fill="#47694f" d="M51 32h8V9h8v29h10v33h7v10h15v5H75V74h-9V51h-4v29H50v6H30v-4h15V58h6z" /><path fill="#73916b" d="M60 13h3v28h-3zM54 46h2v24h-2zM71 50h2v26h-2z" />
    <path fill="#1e513d" d="M7 22v-8h14V7h23V2h52v6h24v8h14v13h-14v7H93v-5H69v8H43v-6H21v-5H7z" /><path fill="#378761" d="M13 15h18V9h29V5h31v7h21v7h16v5H95v6H77v-6H47v5H28v-7H13z" /><path fill="#82b778" opacity=".55" d="M30 10h21v2H30zM65 7h19v2H65zM97 16h15v2H97zM17 21h12v2H17zM45 27h10v2H45z" />
    <path fill="#1a332c" d="M48 41h22v20H48z" /><path fill="#ac9568" d="M43 61h29v3H43zM46 58h23v2H46zM48 64h23v2H48z" />
    <g transform="translate(58 49)"><g className="pb-specimen" style={{ animationDuration: "6.4s" }}><path fill="#b79866" d="M-7-7h3v3h7v-3h3V8H-7z" /><path fill="#edd8a0" d="M-5-1h4v5h-4zM1-1h4v5H1zM-2 5h4v4h-4z" /><path fill="#1b3228" className="pb-blink" d="M-4 0h2v2h-2zM2 0h2v2H2z" /></g></g>
    <path fill="#826e4e" d="M92 63h2v22h-2zM89 68h8v2h-8zM89 74h8v2h-8zM89 80h8v2h-8z" /><Lamp x={83} y={52} color="#bddc98" />
    <path fill="#e0b985" d="M17 87v-7h2v-4h3v4h2v7zM117 84v-9h2v-3h3v3h2v9z" /><path fill="#8ecac3" d="M10 81v-4h5v-4h9v3h6v5zM110 76v-4h5v-3h9v3h7v4z" /><path fill="#ebefb4" d="M15 76h3v2h-3zM23 78h2v1h-2zM116 71h3v2h-3z" />
  </>} right={<>
    <path fill="#163b36" d="M0 76h27v-6h33v4h27v-5h42v7h31v20H0z" /><path fill="#245652" d="M12 81h22v-4h77v3h26v9h-24v5H35v-5H12z" /><path fill="#6ea58c" opacity=".35" d="M31 80h22v-2h48v2h22v2H31zM43 90h62v1H43z" />
    <path fill="#3b5b43" d="M20 83V43h6v25h12v5h17v7H35v5zM125 86V39h7v20h-3v17h-15v5h-13v4h-9v4h21v-3zM26 46h16v-7h4v10H26zM125 49h-14V35h3v10h11z" /><path fill="#71916a" d="M23 48h2v27h13v2H23zM128 43h2v25h-2zM115 79h9v2h-9z" />
    <path fill="#19492f" d="M5 42h15v-8h16v5h17v8H35v6H17v-4H5zM104 38h16v-8h19v5h16v11h-26v5h-16v-6h-9z" />
    <g transform="translate(75 86)"><g className="pb-pool-float"><path fill="#6eab79" d="M-17 0h28v2H3v2h-18z" /><path fill="#c792b4" d="M-2-2h-4v-4h3v-3h4v3h4v4H2v2z" /><path fill="#f3c9b0" d="M-1-6h2v3h-2z" /></g></g><Reflection x={77} y={77} color="#afd7b5" />
    <g transform="translate(109 75)"><g className="pb-train" style={{ animationDuration: "3.8s" }}><path fill="#a2c780" d="M-5-4h3v-3h3v3h4v5h3v2h-6V0h-4v3h-6V1h3z" /><path fill="#e4eab0" d="M-4-5h2v2h-2zM0-5h2v2H0z" /><path fill="#183d2d" d="M-3-4h1v1h-1zM0-4h1v1H0z" /></g></g>
    <g transform="translate(68 57)"><g className="pb-butterfly"><path fill="#e4d7a0" d="M-8-2h6v3h-6zM1-2h6v3H1z" /><path fill="#d2a8ca" d="M-5 2h3v3h-3zM1 2h3v3H1z" /><path fill="#cadfac" d="M-1-2h2v8h-2z" /></g></g>
  </>} />;
}

function DragonSides() {
  const p = BANNER_PALETTES.drachenberge;
  return <Pair left={<>
    <path fill={p.ink} d="M0 83h22v-7h17v-6h86v8h20v8h15v10H0z" /><path fill="#6b3940" d="M33 75h94v8H33zM42 66h78v9H42zM51 57h59v9H51zM62 49h36v8H62z" /><path fill="#bd7960" d="M43 67h76v2H43zM53 58h54v1H53zM35 77h89v1H35z" />
    <path fill="#3a2331" d="M61 30h38v19H61zM66 24h27v6H66zM69 17h20v7H69zM49 30h7v27h-7zM104 25h7v32h-7z" /><path fill="#895347" d="M66 32h28v13H66zM71 20h15v3H71z" /><path fill="#ebaf76" d="M73 36h3v5h-3zM83 36h3v5h-3zM78 41h3v3h-3z" />
    <g transform="translate(80 25)"><g className="pb-exhaust" style={{ transformOrigin: "center bottom" }}><path fill="#ce5f3e" d="M-10 0v-10h4v-7h4v-10h4v9h5v8h4V0z" /><path fill="#f2aa59" d="M-6 0v-9h3v-7h3v7h4v9z" /><path fill="#ffe5a6" d="M-2 0v-7h3v7z" /></g></g>
    <path fill="#973f36" d="M74 49h12v11H74v9h-9v10h-7v17H41V85h10V73h11V61h12z" /><path fill="#ef9755" className="pb-lantern" d="M77 50h6v7h-5v9H68v12h-7v10h-7v7h-7V85h9V75h8V63h11v-8h2z" /><path fill="#ffdd89" d="M79 51h2v4h-2zM69 68h2v9h-2zM57 88h2v5h-2z" />
    <g fill="#f1a96f" className="pb-crystal-pulse" style={{ animationDuration: "3.6s" }} opacity=".5"><path d="M58 56h7v1h-7zM90 53h6v2h-6zM42 79h7v1h-7zM92 69h15v1H92z" /></g>
    <path fill="#b8a086" d="M127 86h10v-6h3v-10h2v14h-5v4h-10zM14 86h8v-7h3v10H14z" />
  </>} right={<>
    <path fill={p.ink} d="M0 91h16v-6h22v-7h71v4h28v7h23v7H0z" /><path fill="#8b7167" d="M20 82h101v5H20zM24 77h78v3H24zM29 73h11v6H29zM47 72h11v6H47zM68 73h11v6H68zM89 74h11v6H89z" />
    <path fill="#b5a08a" d="M35 78V51h4V40h7V31h12v3H48v8h-6v13h-3v23zM53 78V43h4V29h8v-8h10v3h-8v8h-7v13h-3v33zM75 80V41h4V28h8v-8h9v3h-7v8h-7v12h-3v37zM95 81V47h4V36h8v-8h10v3h-8v8h-7v10h-3v32z" />
    <path fill="#e2c6a0" d="M38 51h1v24h-1zM57 43h1v29h-1zM79 43h1v31h-1zM99 49h1v27h-1zM49 32h8v1h-8zM69 22h5v1h-5zM91 21h4v1h-4z" /><path fill="#6d4b4b" d="M39 64h3v2h-3zM59 49h3v2h-3zM80 59h3v2h-3zM98 68h3v2h-3z" />
    <path fill="#bbaa92" d="M121 78v-13h6v-5h15v5h9v9h-7v8h-14v-4z" /><path fill="#4a3039" d="M128 68h6v5h-6zM139 70h4v4h-4zM131 77h8v2h-8z" /><path fill="#e3c5a0" d="M128 61h12v2h-12zM145 72h3v1h-3z" />
    <g transform="translate(59 82)"><path fill="#6c5664" d="M-3-7h8v8h-8z" /><path fill="#deb790" d="M-1-12h4v5h-4z" /><path fill="#c4865d" d="M-4-13h10v2H-4z" /><path fill="#bfac86" d="M4-4h10v2H4zM12-7h2v8h-2z" /><Lamp x={6} y={2} /></g>
    <path fill="#d28b66" opacity=".25" d="M51 91h24v1H51zM29 87h14v1H29zM124 85h19v1h-19z" />
  </>} />;
}

function IslandSides() {
  const p = BANNER_PALETTES.himmelsinseln;
  return <Pair left={<>
    <g className="pb-float" style={{ animationDuration: "7.2s", animationDelay: "-2s" }}>
      <path fill={p.ink} d="M17 61h115v8h-12v9h-20v9H85v7H69v-8H53v-8H34v-8H17z" /><path fill="#777e87" d="M30 65h18v10h19v9h15v7h6v-9h13V68h15v8h-16v11H85v7H71v-9H55v-8H36v-8h-6z" />
      <path fill="#59977c" d="M13 61v-5h22v-4h59v3h34v5h8v5H13z" /><path fill="#b1d4a0" d="M22 56h26v-3h41v4h31v3H75v-2H45v3H22z" />
      <path fill="#8f8b80" d="M44 55V34h4v21zM97 57V34h4v23zM40 30h65v5H40zM51 22h5v8h-5zM67 22h5v8h-5zM85 22h5v8h-5zM48 21h47v2H48z" /><path fill="#ece0b3" d="M41 30h63v1H41zM45 36h1v17h-1zM98 36h1v18h-1z" />
      <path fill="#5e956e" d="M40 29h18v5H45v8h-3v-8h-2zM81 27h23v9h-3v10h-3V33H81z" /><path fill="#d6b3c8" d="M49 29h3v3h-3zM84 29h3v3h-3zM99 36h3v3h-3z" />
      <path fill="#9c786b" d="M28 50h14v8H28zM109 48h13v10h-13zM58 45h31v6H58z" /><path fill="#76ae8a" d="M27 49v-5h5v-5h5v6h6v4zM109 47v-5h5v-6h4v6h5v5z" /><path fill="#efd1a5" d="M30 40h3v3h-3zM114 37h3v3h-3z" />
      <g transform="translate(75 40)"><g className="pb-butterfly"><path fill="#e7c0d5" d="M-6-4h5v5h-5zM1-4h5v5H1z" /><path fill="#f0e9b8" d="M-1-2h2v6h-2z" /></g></g>
      <path fill="#d1ddbe" d="M113 65h2v16h-2zM112 85h1v6h-1z" /><Lamp x={58} y={40} color="#d0e7c3" />
    </g>
  </>} right={<>
    <path fill={p.light} opacity=".15" d="M2 77h20v-4h27v-5h32v5h18v5h24v4H2zM90 92h20v-4h20v-3h21v6h9v5H90z" />
    <g className="pb-float" style={{ animationDuration: "6.1s", animationDelay: "-4s" }}>
      <path fill={p.ink} d="M13 54h66v7H69v9H56v11H44v-8H33v-9H23v-5H13z" /><path fill="#85a58e" d="M10 51h71v5H10z" /><path fill="#dad4b3" d="M16 51h26v1H16z" />
      <path fill="#72695e" d="M53 53h79v5H53zM67 58h3v14h-3zM107 58h3v11h-3zM73 48h2v6h-2zM117 45h2v9h-2z" /><path fill="#e2c8a1" d="M53 53h78v1H53zM64 54h1v3h-1zM79 54h1v3h-1zM94 54h1v3h-1zM109 54h1v3h-1z" />
      <g transform="translate(97 46)"><path fill="#d8b6a0" d="M0-9h4v5H0z" /><path fill="#9b819f" d="M-2-4h8v9h-8zM2 5h7v2H2zM8 5h2v5H8z" /><path fill="#eee0b7" d="M-4-10h12v2H-4z" /><g className="pb-pendulum" style={{ animationDuration: "4.8s" }}><path fill="#aaa58c" d="M5-1h6v-7h4v-6h4v-5h4v1h-3v5h-4v6h-4V0H5z" /><path fill="#cdddc6" opacity=".75" d="M23-18h1v39h-1z" /><path fill="#e5acaa" d="M21 20h5v3h-5z" /></g></g>
      <Lamp x={74} y={40} /><path fill="#978778" d="M45 42h12v10H45z" /><path fill="#f1d7ad" d="M46 42h10v2H46z" />
    </g>
    <g transform="translate(137 74)"><g className="pb-cruise"><path fill="#80c1c7" d="M-12-3h17v3h7v5H5v4H-7V6h-5zM-12 0h-5v-5h-3V8h3V4h5z" /><path fill="#dde4c5" d="M-9 3H6v3H-5V5h-4zM6-1h2v2H6z" /><path fill="#d2adc8" d="M-2-6h5v3h-5z" /></g></g>
  </>} />;
}

function CrystalSides() {
  const p = BANNER_PALETTES.kristallhoehle;
  return <Pair left={<>
    <path fill={p.ink} d="M0 84h28V72h16v-5h16v13h45V68h22v7h33v21H0z" /><path fill="#315369" d="M17 84h121v12H17z" />
    <path fill="#796b9e" d="M24 66h16v-5h18v-5h27v3h24v5h25v7h-25v-3H86v-4H59v5H41v4H24zM32 73h6v15h-6zM118 72h6v18h-6z" /><path fill="#c3b4db" d="M25 66h16v-4h19v-5h24v2H61v5H43v4H25zM88 60h20v2H88zM112 65h20v2h-20z" />
    <path fill="#6e729f" d="M38 62V37h3v-7h4v7h4v25zM115 61V29h3v-8h4v8h4v32zM69 54V39h3v-6h4v6h3v15z" /><g fill="#a9e4dc" className="pb-crystal-pulse"><path d="M42 36h2v23h-2zM120 28h2v29h-2zM73 39h2v13h-2z" /></g>
    <Reflection x={48} y={80} color="#bbb0e7" /><Reflection x={113} y={80} color="#99e4e0" />
    <g transform="translate(77 52)"><path fill="#e2c4a3" d="M0-9h4v5H0z" /><path fill="#9486b1" d="M-2-4h8v7h-8zM-1 3h2v4h-2zM4 3h2v4H4z" /><path fill="#c8b287" d="M-3-10h10v2H-3z" /><g className="pb-pendulum"><path fill="#b0bfae" d="M5-1h6v2H5zM10 1h1v5h-1z" /><Lamp x={10} y={11} color="#bce8cf" /></g></g>
    <path fill="#63527d" d="M5 85V66h3v-5h4v5h3v19zM140 83V51h3v-6h4v6h4v32z" /><path fill="#b5a1d1" d="M9 66h2v16H9zM144 52h2v26h-2z" />
  </>} right={<>
    <path fill={p.far} d="M6 96V56h12V36h21V23h59v10h26v15h19v48z" /><path fill={p.ink} d="M33 83V43h8V31h55v10h15v42z" />
    <path fill="#967d72" d="M31 29h71v7H31zM35 35h7v48h-7zM93 36h7v47h-7zM30 78h76v5H30z" /><path fill="#cbb092" d="M32 29h68v2H32zM36 38h2v35h-2zM94 38h2v35h-2z" /><path fill="#574557" d="M34 41h8v3h-8zM92 55h9v3h-9zM58 31h2v5h-2zM83 31h2v5h-2z" />
    <path fill="#887c8b" d="M51 81h3v-37h2v-7h3v7h-2v37h5v15h-3V84h-5v12h-3zM77 37h2v7h3v37h3v15h-3V84h-6v12h-3V81h6V44h-2z" /><path fill="#7a6475" d="M52 77h30v2H52zM52 68h28v2H52zM54 59h26v2H54zM56 50h23v2H56z" />
    <g transform="translate(67 48)"><g className="pb-cargo-hoist" style={{ animationDuration: "9.6s" }}><path fill="#504d62" d="M-11 0h23v13H-11zM-8 13h4v4h-4zM5 13h4v4H5z" /><path fill="#9c89a1" d="M-10 1h21v3h-21zM-8 7h17v1H-8z" /><path fill="#8cc6ca" d="M-7 0v-7h3v-4h3v6h5v-9h4v6h3V0z" /></g></g>
    <Lamp x={42} y={48} /><Reflection x={35} y={83} color="#c0a3a8" />
    <path fill="#546786" d="M114 84V66h4v-8h4v8h5v18zM130 91V73h3v-5h3v5h4v18z" /><path fill="#b4e1d3" d="M120 66h2v15h-2zM134 73h1v13h-1z" /><path fill="#bdacbd" d="M18 88h10v3H18zM109 89h7v2h-7z" />
  </>} />;
}

function HarborSides() {
  const p = BANNER_PALETTES.luftschiffhafen;
  return <Pair left={<>
    <path fill={p.ink} d="M12 81V43h64V31h17v50h54v15H12zM9 41v-5h13v-6h48v6h10v5z" /><path fill="#927458" d="M16 44h56v37H16zM78 33h12v47H78z" /><path fill="#d3b389" d="M12 41h62v2H12zM20 33h48v2H20zM79 34h2v41h-2z" />
    <path fill="#2e3035" d="M26 52h39v29H26z" /><path fill="#aa875e" d="M30 78h33v3H30zM34 69h24v3H34zM37 73h3v7h-3zM55 73h3v7h-3z" /><Gear p={p} x={45} y={61} size={.55} /><Lamp x={22} y={55} />
    <path fill="#423b37" d="M103 21h7v62h-7zM99 19h53v6H99zM109 31h25v-7h3v10h-28zM96 82h20v5H96z" /><path fill="#d7b27d" d="M104 24h2v54h-2zM101 20h49v1h-49zM106 37h3v3h-3zM106 49h3v3h-3zM106 61h3v3h-3z" />
    <svg x="124" y="25" width="30" height="61" viewBox="0 0 30 61" style={{ width: 30, height: 61, position: "static", overflow: "hidden" }}><g transform="translate(15 32)"><g className="pb-cargo-hoist"><path fill="#e2cda1" d="M-1-32h1V0h-1z" /><path fill="#74563f" d="M-10 0h20v17h-20z" /><path fill="#c99d68" d="M-9 1H9v3H-9zM-9 12H9v2H-9zM-7 4h2v8h-2zM4 4h2v8H4z" /><path fill="#e5c991" d="M-2 6h4v4h-4z" /></g></g></svg>
    <g transform="translate(80 72)"><path fill="#d5b087" d="M0-11h5v5H0z" /><path fill="#798981" d="M-2-6h9v9h-9zM0 3h2v6H0zM5 3h2v6H5z" /><path fill="#c29963" d="M-2-12h9v2H-2z" /><g className="pb-flag-flutter"><path fill="#e2c39a" d="M5-4h9v-5h2v7H5z" /></g></g>
    <path fill="#84694f" d="M8 87h143v3H8zM17 91h22v1H17zM71 92h18v1H71z" /><path fill="#d6ab6c" opacity=".27" d="M18 82h42v2H18z" />
  </>} right={<>
    <path fill="#34424a" d="M0 78h160v18H0z" /><path fill="#57433a" d="M10 66h140v8H10zM20 74h6v22h-6zM65 74h6v22h-6zM121 74h6v22h-6z" /><path fill="#c3a27c" d="M10 66h140v2H10zM24 69h1v4h-1zM43 69h1v4h-1zM62 69h1v4h-1zM81 69h1v4h-1zM100 69h1v4h-1zM119 69h1v4h-1z" />
    <path fill="#6e5445" d="M62 43h29v23H62zM93 50h27v16H93zM71 25h22v18H71zM109 35h22v15h-22z" /><path fill="#b68a5e" d="M63 44h27v3H63zM63 59h27v2H63zM94 51h25v2H94zM72 26h20v2H72zM110 36h20v2h-20z" /><path fill="#d3b383" d="M65 47h2v12h-2zM85 47h2v12h-2zM75 28h2v12h-2zM95 54h2v10h-2zM113 38h2v10h-2z" />
    <g transform="translate(41 52)"><path fill="#463c36" d="M-5 0h10v15H-5zM-12 12h24v3h-24z" /><g className="pb-rotor"><path fill="#b69b6f" d="M-3-13h6v4h6v6h4v6H9v6H3v4h-6V9h-6V3h-4v-6h4v-6h6z" /><path fill="#594e40" d="M-7-7H7V7H-7z" /><path fill="#d8c392" d="M-1-8h2V8h-2zM-8-1H8v2H-8z" /></g><path fill="#eee0b0" d="M-2-2h4v4h-4z" /></g>
    <path fill="#a7926e" d="M27 67h2v12h-7v5h-4v-2h3v-5h6zM126 68h2v11h7v5h-2v-3h-7z" /><Lamp x={17} y={57} /><Reflection x={17} y={77} color="#d8ab6f" /><Reflection x={116} y={79} color="#917d6c" />
    <g transform="translate(78 19)"><path fill="#c69d75" d="M-6 0h2v3h6V0h2v8H1v3h-6V8h-1zM2 9h7V4h2v7H2z" /><path fill="#f0d9a7" className="pb-blink" d="M-4 4h1v1h-1zM0 4h1v1H0z" /></g>
    <path fill="#d6c39c" d="M138 57h4v-4h3v4h6v3h-4v4h-6v-4h-3z" /><path fill="#9f8565" d="M144 54h1v1h-1z" />
  </>} />;
}

function ClockSides() {
  const p = BANNER_PALETTES.uhrwerkstadt;
  return <Pair left={<>
    <path fill="#334943" d="M0 84h160v12H0z" /><path fill="#9b926c" d="M8 37h145v13H8zM14 50h11v39H14zM55 50h11v39H55zM96 50h11v39H96zM137 50h10v39h-10zM25 50h30v6H25zM66 50h30v6H66zM107 50h30v6h-30z" /><path fill="#554f3d" d="M21 53h4v33h-4zM62 53h4v33h-4zM103 53h4v33h-4zM144 53h3v33h-3zM24 55h5v7h-5zM51 55h5v7h-5zM65 55h5v7h-5zM92 55h5v7h-5zM106 55h5v7h-5zM133 55h5v7h-5z" />
    <path fill="#d7c597" d="M9 37h142v2H9zM10 48h141v1H10zM16 58h2v23h-2zM57 62h2v19h-2zM98 57h2v25h-2z" /><path fill="#7e997e" d="M10 35h141v3H10z" /><path fill="#d8e3b1" className="pb-water" opacity=".65" d="M13 35h18v1H13zM43 36h27v1H43zM94 35h34v1H94z" />
    <g transform="translate(83 71)"><g className="pb-rotor" style={{ animationDuration: "10s" }}><path fill="#785d3d" d="M-8-18H8v4h6v6h4V8h-4v6H8v4H-8v-4h-6V8h-4V-8h4v-6h6z" /><path fill="#c4aa72" d="M-7-15H7v4h4v4h4V7h-4v4H7v4H-7v-4h-4V7h-4V-7h4v-4h4z" /><path fill="#3c4941" d="M-6-12H6v4h2v2h4V6H8v2H6v4H-6V8h-2V6h-4V-6h4v-2h2z" /><path fill="#b69c67" d="M-2-14h4v28h-4zM-14-2h28v4h-28zM-10-10h3v3h3v3h-3v-3h-3zM7 7h3v3H7z" /></g><path fill="#eed8a0" d="M-3-3h6v6h-6z" /></g>
    <Reflection x={82} y={83} color="#c2b983" /><Lamp x={32} y={58} /><path fill="#a99a73" d="M3 91h51v2H3zM110 92h44v2h-44z" />
    <g transform="translate(122 34)"><g className="pb-cruise"><path fill="#d1c299" d="M-5-4H4v2H8v3H0v2h-5zM-6-2h-4v-3h-2v7h6z" /><path fill="#404639" d="M4-2h1v1H4z" /></g></g>
  </>} right={<>
    <path fill="#344839" d="M3 82h26v-6h31v4h36v-7h37v7h24v16H3z" /><path fill="#87976b" d="M16 85h51v4H16zM91 85h57v4H91z" /><path fill="#c2b789" d="M17 84h49v2H17zM92 84h55v2H92z" />
    <path fill="#705c44" d="M24 67h18v17H24zM111 63h22v21h-22zM53 75h12v9H53z" /><path fill="#a8905f" d="M24 69h18v2H24zM112 66h20v2h-20zM54 76h10v2H54z" />
    <path fill="#749269" d="M29 68V48h3v20zM32 58h8v-5h3v8H32zM120 64V39h3v25zM120 53h-8v-7h3v5h5zM123 49h8v-8h3v11h-11zM57 75V63h2v12z" /><path fill="#d3b37b" d="M26 47h10v5H26zM117 35h10v8h-10zM129 38h8v5h-8zM109 43h8v5h-8zM54 60h8v4h-8z" /><path fill="#f2de9c" d="M29 48h3v2h-3zM120 37h3v3h-3zM132 39h2v2h-2z" />
    <g transform="translate(82 65)"><path fill="#707e6d" d="M-8-6H8v18H-8zM-6-18H6v11H-6zM-5 12h4v9h-4zM3 12h4v9H3z" /><path fill="#b5b08a" d="M-5-17H5v7H-5zM-6-4H6v4H-6z" /><path fill="#e7dc99" className="pb-blink" d="M-3-15h2v3h-2zM2-15h2v3H2z" /><g transform="translate(8 -3)"><g className="pb-pendulum" style={{ animationDuration: "4.5s" }}><path fill="#b8ab7e" d="M0-1h11v4H0zM9-5h7v11H9zM16-3h7v2h-7z" /><g className="pb-drip" fill="#cbe9ce"><path d="M23-1h2v3h-2zM27 4h1v3h-1zM31 10h1v2h-1z" /></g></g></g><path fill="#d6c293" d="M-11-2h4v11h-4z" /></g>
    <path fill="#99936d" d="M4 90h150v1H4zM69 87h22v2H69z" /><Lamp x={143} y={66} color="#d2d69c" /><path fill="#b4c596" opacity=".23" d="M101 91h42v2h-42z" />
    <g transform="translate(47 79)"><path fill="#bd9863" d="M0-5h7v4h-7zM-3-1h12v3H-3zM-1 2h2v3h-2zM6 2h2v3H6z" /><path fill="#e9d295" d="M2-6h3v2H2z" /></g>
  </>} />;
}

function SteelSides() {
  const p = BANNER_PALETTES.stahlwerk;
  return <Pair left={<>
    <path fill={p.ink} d="M0 86h160v10H0zM16 20h8v64h-8zM16 19h70v6H16zM77 25h2v13h-2zM106 35h7v51h-7zM104 32h43v5h-43z" /><path fill="#a28061" d="M18 22h2v53h-2zM22 20h61v1H22zM108 38h2v39h-2z" />
    <g transform="translate(75 37)"><g className="pb-pendulum" style={{ animationDuration: "5s" }}><path fill="#3c3434" d="M-17-7h34V8h-6v9h-22V8h-6z" /><path fill="#986952" d="M-14-5h28V5h-5v7H-9V5h-5z" /><path fill="#e8874b" d="M-12-5h24v5h-24z" /><path fill="#ffd485" d="M-8-4H8v2H-8z" /><g transform="translate(-1 15)"><g className="pb-metal-pour"><path fill="#ef994d" d="M-2 0h5v24h-5z" /><path fill="#ffe8aa" d="M0 0h1v23H0z" /></g></g></g></g>
    <path fill="#68473b" d="M70 69h16v12h25v5h36v10H72V86H49v-7h21z" /><path fill="#e88a43" className="pb-lantern" d="M73 70h9v13h28v5h34v6H77V84H54v-3h19z" /><path fill="#ffce77" d="M75 72h3v12h32v3H79v-1H57v-3h18zM111 91h26v1h-26z" />
    <path fill="#94705b" d="M19 83h24v12H19zM25 75h13v8H25z" /><path fill="#c19972" d="M20 84h22v2H20zM26 76h11v1H26z" />
    <g fill="#ffce83" className="pb-spark"><path d="M70 70h2v2h-2zM85 73h1v3h-1zM91 82h2v1h-2zM118 87h1v2h-1z" /></g><path fill="#daab77" opacity=".35" d="M15 91h31v2H15zM121 79h22v2h-22zM106 60h2v14h-2z" />
    <path fill="#2c2d32" d="M119 55h22v17h-22z" /><path fill="#b68e61" d="M121 57h18v2h-18zM122 61h3v7h-3zM135 61h3v7h-3z" />
  </>} right={<>
    <path fill={p.ink} d="M3 86h154v10H3zM20 37h119v5H20zM24 42h4v44h-4zM133 42h4v44h-4z" /><path fill="#7f6252" d="M27 42h106v2H27zM39 61h102v7H39zM44 68h5v18h-5zM128 68h5v18h-5z" /><path fill="#bb9a70" d="M40 61h100v2H40zM45 70h1v12h-1zM131 70h1v12h-1z" />
    <path fill="#9d8970" d="M37 46h9v2h-9zM53 45h2v12h-2zM64 44h7v2h-7zM66 46h2v10h-2zM113 45h8v2h-8zM116 47h2v9h-2z" /><Lamp x={127} y={48} />
    <g transform="translate(80 60)"><path fill="#75817b" d="M-9-1H9v19H-9zM-7-16H7v13H-7zM-7 18h5v8h-5zM3 18h5v8H3z" /><path fill="#bdc3a2" d="M-6-14H6v7H-6zM-6 2H6v5H-6z" /><path fill="#e9d092" className="pb-blink" d="M-4-12h3v3h-3zM2-12h3v3H2z" /><path fill="#41494a" d="M-3 11h6v3h-6zM-1-20h2v4h-2z" /><g transform="translate(10 3)"><g className="pb-forge-hammer" style={{ animationDuration: "3s" }}><path fill="#adab8c" d="M0-2h19v4H0z" /><path fill="#50545a" d="M16-9h7v12h-7z" /><path fill="#d3bb88" d="M17-9h5v2h-5z" /></g></g><path fill="#a5a589" d="M-14 0h5v12h-5z" /></g>
    <path fill="#8d7156" d="M105 62h17v5h-17z" /><path fill="#de9162" d="M109 54h4v3h4v-3h4v7h-12z" /><path fill="#ffd79c" className="pb-lantern" d="M111 57h7v3h-7z" />
    <g transform="translate(116 61)"><g className="pb-spark" style={{ animationDuration: "3s" }}><path fill="#fbe1a0" d="M-2-1h1v2h-1zM4-4h2v1H4zM8 0h1v2H8z" /></g></g>
    <path fill="#b69262" d="M17 79h17v6H17zM19 72h13v7H19z" /><path fill="#3c3938" d="M20 76h10v2H20z" /><path fill="#dcbd7f" opacity=".3" d="M105 72h22v1h-22zM67 90h28v1H67z" />
  </>} />;
}

function DesertSides() {
  const p = BANNER_PALETTES.wuestenexpress;
  return <Pair left={<>
    <path fill="#855b46" d="M2 86h156v10H2zM31 50h7v34h-7zM76 50h7v34h-7zM26 46h62v7H26z" /><path fill="#ba9162" d="M33 53h2v27h-2zM78 53h2v27h-2z" /><path fill="none" stroke="#ac845a" strokeWidth="2" d="M37 56l39 25m0-25L37 81" />
    <path fill="#634c3f" d="M27 18h60v27H27zM31 12h52v6H31zM37 8h41v4H37z" /><path fill="#a88054" d="M30 20h54v22H30zM34 14h47v3H34z" /><path fill="#d1aa74" d="M32 20h3v20h-3zM42 20h2v20h-2zM53 20h2v20h-2zM64 20h2v20h-2zM76 20h2v20h-2zM37 9h40v1H37z" /><path fill="#584c3f" d="M28 23h58v3H28zM28 36h58v3H28z" />
    <path fill="#9f9679" d="M83 30h23v7h-17v23h-5zM98 33h3v30h-3z" /><path fill="#d9c397" d="M84 30h20v1H84zM99 36h1v23h-1z" /><g transform="translate(99 61)"><g className="pb-drip"><path fill="#c4dbcf" d="M0 0h2v5H0zM1 10h1v3H1z" /></g></g>
    <path fill="#736354" d="M86 76h50v9H86z" /><path fill="#98b1a2" d="M89 77h44v3H89z" /><path fill="#dfd0a3" className="pb-water" d="M94 78h12v1H94zM116 77h11v1h-11z" />
    <path fill="#515d48" d="M139 83V51h3v32zM139 62h-7v-3h-3V48h3v10h7zM143 68h7V54h3v17h-10z" /><path fill="#c69778" d="M138 48h5v3h-5z" /><path fill="#d7a979" d="M13 87h11v2H13zM53 89h16v1H53z" />
    <g transform="translate(120 73)"><g className="pb-pendulum" style={{ animationDuration: "4.8s" }}><path fill="#675e4a" d="M-4 0H5v3H0v5h-2V3h-2zM4-4h5v5H4zM-4 0h-8v-2h8z" /><path fill="#d8c19b" d="M8-3h6v1H8zM6-3h1v1H6z" /></g></g>
    <Lamp x={24} y={66} />
  </>} right={<>
    <path fill="#a47755" d="M0 86h19v-6h28v3h61v-5h30v8h22v10H0z" /><path fill="#c39b6c" d="M26 81h100v5H26zM41 76h68v4H41z" />
    <path fill="#d9bc8f" d="M22 73h88v5H22zM13 66h20v4H13zM10 57h13v9H10zM18 50h24v9H18zM28 59h12v10H28zM113 74h13v-8h8v4h-4v9h-17z" /><path fill="#785441" d="M22 54h6v5h-6zM35 54h4v3h-4zM17 62h6v2h-6z" />
    <path fill="#bda780" d="M45 76V59h4V47h7v-4h8v3h-7v5h-5v12h-3v13zM63 76V53h4V41h7v-5h9v3h-7v6h-5v11h-4v20zM82 76V57h4V47h7v-6h8v3h-6v7h-5v10h-4v15zM102 76V62h4V54h8v3h-5v8h-3v11z" /><path fill="#f0d6a6" d="M49 60h1v12h-1zM67 55h1v18h-1zM86 59h1v14h-1zM76 39h5v1h-5zM58 44h5v1h-5z" />
    <path fill="#755342" d="M126 57h3v26h-3zM124 55h8v3h-8zM125 50h6v5h-6z" /><path fill="#e0a477" className="pb-flag-flutter" d="M129 51h19v3h-4v4h-15z" />
    <g transform="translate(36 78)"><path fill="#e0b18b" d="M0-9h5v5H0z" /><path fill="#8f9679" d="M-2-4h8v7h-8zM2 3h7v3H2z" /><path fill="#c49a69" d="M-4-10h12v2H-4z" /><g className="pb-piston" style={{ animationDuration: "1.5s" }}><path fill="#ddc49a" d="M5-2h9v2H5z" /><path fill="#80684d" d="M13-4h2v6h-2z" /></g></g>
    <path fill="#e4c99b" d="M4 92h11v1H4zM74 89h18v1H74zM108 87h12v1h-12zM131 92h16v1h-16z" /><path fill="#786249" d="M139 83h11v6h-11z" /><path fill="#c09a65" d="M140 83h9v1h-9z" />
  </>} />;
}

function IceSides() {
  const p = BANNER_PALETTES.eiswacht;
  return <Pair left={<>
    <path fill="#8faeb5" d="M0 80h20v-6h27v4h42v-7h31v6h40v19H0z" /><path fill="#c9ded7" d="M0 80h20v-6h27v3H22v6H0zM91 72h29v4h40v3h-42v-4H91z" />
    <path fill="#4d8698" d="M14 85h21v-5h76v4h31v7h-30v4H35v-4H14z" /><path fill="#afd5d4" d="M26 85h23v-3h44v2H51v3H26zM53 91h40v1H53zM113 86h21v1h-21z" /><path fill="#deece0" opacity=".6" d="M69 82h2v3h15v1H70v6h-1v-7H56v-1h13zM113 88h-9v3h-1v-3h-7v-1h17z" />
    <path fill="#284c60" d="M86 86h19v4H86z" /><path fill="#94c6d0" d="M88 86h15v1H88z" /><Reflection x={94} y={78} color="#b8d9d5" />
    <g transform="translate(67 73)"><path fill="#a87b63" d="M-7 0H8v5H-7zM-4 5h3v7h-3zM4 5h3v7H4z" /><path fill="#334c62" d="M-5-12H6V1H-5zM2 1h8v3H2zM8 2h3v7H8z" /><path fill="#d4bfa5" d="M-2-17h5v5h-5z" /><path fill="#a75f65" d="M-4-19h9v4h-9zM-5-10h10v2H-5z" /><g transform="translate(5 -7)">
      <g className="pb-ice-rod"><path fill="#c2b193" d="M0 0h8v-5h5v-6h3v-1h-4v6H7v5H0z" /></g>
      <path className="pb-ice-line" fill="none" stroke="#deede2" strokeWidth="1" d="M16 -12Q25 4 22 22" />
      <path fill="#d69a86" d="M20 20h4v3h-4z" />
    </g></g>
    <Lamp x={45} y={75} /><path fill="#e3b27e" opacity=".25" d="M31 85h22v1H31zM39 90h14v1H39z" />
    <path fill="#496671" d="M114 75h13v10h-13z" /><path fill="#b7c8c0" d="M115 76h11v2h-11z" /><g transform="translate(25 78)"><path fill="#223e52" d="M0-8h4v-3h4v3h2v13H0z" /><path fill="#e4e9d5" d="M2-4h5v7H2z" /><path fill="#d2a875" d="M7-7h5v2H7zM1 5h3v1H1zM7 5h3v1H7z" /></g>
  </>} right={<>
    <path fill="#7a9ba6" d="M0 87h20v-8h28v-6h72v7h24v7h16v9H0z" /><path fill="#dfebe0" d="M21 79h27v-6h71v4H50v5H21zM121 81h23v3h-23z" />
    <path fill="#385767" d="M64 19h9v57h-9zM55 16h28v6H55zM60 11h17v5H60zM58 71h26v7H58zM69 26h39v5H69z" /><path fill="#9aaca3" d="M65 23h3v43h-3zM56 16h26v2H56zM70 27h34v1H70z" />
    <g transform="translate(93 31)"><g className="pb-pendulum" style={{ animationDuration: "3.4s" }}><path fill="#b9a77d" d="M-5 0H5v7h4v8h3v4H-12v-4h3V7h4z" /><path fill="#f3d59a" d="M-4 2h3v10h-3zM-10 17h20v1h-20z" /><path fill="#756852" d="M-1 19h2v5h-2z" /></g></g>
    <g transform="translate(72 20)"><g className="pb-flag-flutter"><path fill="#b96970" d="M0 0h37v4h-7v5H0z" /><path fill="#e6b3a1" d="M2 1h25v2H2z" /></g></g>
    <path fill="#435b65" d="M26 59h24v20H26zM23 55h31v5H23z" /><path fill="#7c8990" d="M29 61h18v15H29z" /><path fill="#d8e5db" d="M23 54h31v3H23zM29 76h18v2H29z" /><Lamp x={38} y={66} />
    <g transform="translate(121 70)"><path fill="#364f61" d="M-5-11H6V4H-5zM-3 4h3v7h-3zM4 4h3v7H4z" /><path fill="#d7baa0" d="M-2-16h5v5h-5z" /><path fill="#abbfc0" d="M-4-18h9v4h-9z" /><path fill="#b3676d" d="M-5-9H6v3H-5z" /><g className="pb-pendulum"><path fill="#d8c3a2" d="M-5-6h-9v-10h-2v12h11z" /></g></g>
    <path fill="#506f80" d="M113 87h7v2h-7zM102 91h7v2h-7zM90 94h8v2h-8z" /><path fill="#ebc691" opacity=".28" d="M23 83h32v2H23zM32 88h26v1H32z" />
  </>} />;
}

export const FANTASY_VIGNETTES = {
  mondburg: <MoonSides />,
  gluehwald: <ForestSides />,
  drachenberge: <DragonSides />,
  himmelsinseln: <IslandSides />,
  kristallhoehle: <CrystalSides />,
  luftschiffhafen: <HarborSides />,
  uhrwerkstadt: <ClockSides />,
  stahlwerk: <SteelSides />,
  wuestenexpress: <DesertSides />,
  eiswacht: <IceSides />,
} satisfies Partial<Record<BannerId, ReactNode>>;
