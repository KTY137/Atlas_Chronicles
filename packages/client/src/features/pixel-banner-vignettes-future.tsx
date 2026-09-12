// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import type { BannerId } from "@chronicle/theme";
import type { ReactNode } from "react";
import { BANNER_PALETTES } from "./pixel-banner-palettes";

/** Separate places beside the central landmark. Each drawing occupies 160 × 96
 * local pixels; open sky lets the continuous landscape show between buildings. */
function NeonVignettes() {
  const p = BANNER_PALETTES.neonregen;
  return <>
    <g transform="translate(-500 0)" data-vignette="neonregen-left">
      <path fill={p.far} d="M6 15h36v63H6zM109 6h38v73h-38zM40 35h22v43H40z" />
      <path fill={p.mid} d="M10 18h28v48H10zM113 11h29v59h-29z" />
      <path fill={p.light} opacity=".35" d="M14 23h6v9h-6zM26 23h6v9h-6zM118 16h5v7h-5zM131 16h5v7h-5zM118 31h5v7h-5zM131 31h5v7h-5z" />
      <path fill={p.ink} d="M0 80h160v16H0zM25 40h109v5H25zM32 44h3v39h-3zM128 44h3v39h-3z" />
      <path fill="#9d658d" d="M28 35h101v5H28zM24 40h110v4H24z" /><path fill="#cf93aa" d="M28 35h18v2H28zM53 35h16v2H53zM77 35h18v2H77zM105 35h24v2h-24z" />
      <path fill={p.light} opacity=".16" d="M35 45h93v34H35z" /><path fill={p.glow} d="M115 45h7v20h-7z" /><path fill={p.light} d="M117 48h3v2h-3zM117 53h3v2h-3zM117 59h3v2h-3z" />
      <path fill="#857e9e" d="M43 60h13v18H43zM43 58h13v2H43zM45 63h9v1h-9zM45 68h9v1h-9zM45 73h9v1h-9z" />
      <g transform="translate(81 66)"><g className="pb-cruise" style={{ animationDuration: "14s" }}>
        <path fill={p.ink} d="M-19-2v-3h5v-4h7v-3h13v3h7v4h5v3zM-1-2h2v17h-2z" /><path fill={p.light} d="M-16-5h4v-3h7v-2H5v2h6v3h4v2h-31z" />
        <path fill="#cf93aa" d="M-11 1h5v5h-5zM5 3h5v5H5z" /><path fill="#9d658d" d="M-13 6h9v9h-9zM3 8h9v7H3z" /><path fill={p.ink} d="M-12 15h3v5h-3zM-7 15h3v5h-3zM4 15h3v5H4zM9 15h3v5H9z" />
        <path fill={p.glow} d="M-5 8H4v2H-5z" />
      </g></g>
      <g className="pb-water" fill={p.light} opacity=".35"><path d="M54 87h41v1H54zM65 91h36v1H65zM110 80h14v2h-14zM106 85h22v1h-22z" /></g>
      <path fill={p.mid} d="M8 86h14v1H8zM26 92h8v1h-8zM134 87h20v1h-20zM118 73h4v1h-4zM12 69h12v1H12z" />
      <g transform="translate(31 44)"><path className="pb-drip" fill={p.light} d="M0 0h1v3H0zM-1 8h1v2h-1z" /></g>
    </g>
    <g transform="translate(350 0)" data-vignette="neonregen-right">
      <path fill={p.far} d="M21 17h107v66H21zM125 35h28v46h-28z" /><path fill={p.mid} d="M25 21h98v58H25z" />
      <path fill="#857e9e" d="M29 25h39v10H29zM76 25h40v10H76z" /><path fill={p.ink} d="M32 28h32v4H32zM79 28h33v4H79z" />
      <path fill={p.glow} className="pb-beacon" style={{ animationDuration: "5.7s" }} d="M34 29h7v1h-7zM44 29h4v1h-4zM51 29h9v1h-9zM83 29h4v1h-4zM90 29h6v1h-6zM100 29h8v1h-8z" />
      <path fill={p.ink} d="M17 38h112v6H17zM20 80h110v5H20zM36 47h49v31H36zM91 47h24v31H91z" /><path fill="#cf93aa" d="M20 38h106v2H20z" />
      <path fill="#857e9e" d="M39 50h20v27H39zM62 50h20v27H62z" /><path fill={p.light} d="M41 52h15v2H41zM64 52h15v2H64z" />
      {[49, 72].map((x, i) => <g key={x} transform={`translate(${x} 65)`}><path fill={p.ink} d="M-6-6H6v12H-6z" /><g className="pb-rotor" style={{ animationDuration: `${3.2 + i}s` }}><path fill={p.light} d="M-4-4h5v2H4v5H2v2h-5V3h-2v-5h1z" /><path fill="#9d658d" d="M-2-4h3v3h-3zM1 1h3v2H1z" /></g></g>)}
      <path fill="#9d658d" d="M94 52h17v10H94zM92 66h22v4H92zM95 70h17v8H95z" /><path fill={p.light} d="M97 54h11v5H97zM96 66h4v1h-4zM105 66h2v1h-2z" /><path fill={p.ink} d="M101 70h2v4h-2z" />
      <g transform="translate(102 57)"><g className="pb-beacon" style={{ animationDuration: "2.6s" }} fill={p.glow}><path d="M-4 0h2v1h-2z" /></g></g>
      <path fill={p.ink} d="M7 88h145v8H7zM130 67h13v14h-13zM131 64h11v3h-11z" /><path fill={p.mid} d="M132 69h9v1h-9zM132 74h9v1h-9zM29 85h25v1H29zM103 83h15v1h-15z" />
      <g className="pb-water" fill={p.glow} opacity=".4"><path d="M29 88h67v1H29zM50 92h38v1H50zM92 86h28v1H92z" /></g>
      <path fill={p.light} opacity=".15" d="M34 45h52v35H34zM89 80h27v3H89z" />
    </g>
  </>;
}

function GardenVignettes() {
  const p = BANNER_PALETTES.dachgaerten;
  return <>
    <g transform="translate(-500 0)" data-vignette="dachgaerten-left">
      <path fill={p.far} d="M2 65h151v31H2zM17 50h36v16H17zM117 39h31v28h-31z" /><path fill={p.ink} d="M7 71h144v25H7z" /><path fill={p.mid} d="M12 76h134v20H12z" />
      <path fill="#b89566" d="M18 64h126v7H18zM25 32h38v32H25zM89 38h35v26H89z" /><path fill={p.glow} d="M26 34h36v4H26zM26 45h36v3H26zM26 56h36v3H26zM90 40h33v4H90zM90 51h33v3H90z" />
      <path fill={p.ink} d="M21 31v-4h10v-5h24v5h12v4zM86 37v-4h10v-5h20v5h11v4zM39 59h12v3H39zM101 57h10v3h-10z" />
      <path fill={p.light} d="M25 28h38v2H25zM90 34h32v2H90zM28 39h2v5h-2zM28 49h2v5h-2zM93 45h2v5h-2z" />
      <path fill="#6db992" d="M16 64h7v-7h4v-5h4v12h8v-6h5v6h30v-5h4v-8h4v9h6v4h38v-6h4v-7h3v11h6v-4h5v7H16z" />
      <path fill="#d9949c" d="M18 56h4v3h-4zM27 50h4v4h-4zM75 50h4v3h-4zM127 50h5v3h-5zM138 56h4v3h-4z" />
      {[{ x: 65, y: 38 }, { x: 82, y: 27 }, { x: 111, y: 22 }].map(({ x, y }, i) => <g key={x} transform={`translate(${x} ${y})`}><g className="pb-butterfly" style={{ animationDuration: `${5 + i}s`, animationDelay: `${-i * 1.2}s` }}><g className="pb-wing" style={{ animationDuration: ".65s" }} fill={p.light}><path d="M-3-3h3v3h-3zM1-3h3v3H1z" /></g><path fill={p.glow} d="M-3 0h7v3h-7z" /><path fill={p.ink} d="M-1 0h1v3h-1zM2 0h1v3H2z" /></g></g>)}
      <path fill={p.ink} d="M27 82h21v12H27zM62 82h20v12H62zM101 80h28v14h-28z" /><path fill={p.glow} opacity=".5" d="M30 85h15v2H30zM65 85h14v2H65zM104 83h22v2h-22z" />
      <path fill={p.light} opacity=".35" d="M11 72h134v1H11zM21 78h8v1h-8zM86 88h10v1H86zM132 92h8v1h-8z" />
      <path fill="#6db992" d="M139 73h3v10h-3v8h-3V80h-4v-4h7zM15 76h4v8h-3v7h-3V81h2z" />
    </g>
    <g transform="translate(350 0)" data-vignette="dachgaerten-right">
      <path fill={p.far} d="M7 66h148v30H7zM18 44h25v23H18zM108 54h41v13h-41z" /><path fill={p.ink} d="M9 71h145v25H9zM18 66h124v6H18z" />
      <path fill={p.mid} d="M12 76h138v20H12z" /><path fill="#b89566" d="M30 54h77v12H30zM104 26h20v39h-20z" /><path fill={p.light} d="M103 25h23v3h-23zM106 31h2v26h-2z" />
      <path fill="#6db992" d="M107 43h15v18h-15z" /><path fill={p.glow} opacity=".45" d="M109 44h11v2h-11z" />
      <path fill={p.ink} d="M22 31h55l15 21H37z" /><path fill="#689eae" d="M27 33h46l11 16H38z" /><path fill={p.light} opacity=".6" d="M31 34h40v1H31zM38 39h37v1H38zM40 44h39v1H40zM40 33l11 16h1L41 33zM54 33l11 16h1L55 33zM66 33l11 16h1L67 33z" />
      <path fill={p.ink} d="M43 52h3v9h-3zM80 52h3v9h-3zM89 66h9V44h7v3h-4v22H89z" /><path fill={p.glow} d="M89 65h8v1h-8zM98 48h1v13h-1z" />
      <path fill="#689eae" d="M37 60h47v4H37z" /><g className="pb-water" fill={p.light}><path d="M43 61h12v1H43zM66 62h11v1H66z" /></g>
      <g transform="translate(99 53)"><g className="pb-drip" style={{ animationDuration: "1.5s" }} fill={p.light}><path d="M0 0h1v3H0zM-4 5h1v2h-1zM-9 9h1v2h-1z" /></g></g>
      <path fill="#6db992" d="M121 63V49h3v14h5V44h3v19h5v-9h3v9zM20 62V49h3v13h4V46h3v16z" /><path fill={p.glow} d="M121 47h4v3h-4zM128 42h5v3h-5zM135 52h5v3h-5zM19 47h5v3h-5z" />
      <path fill={p.ink} d="M26 81h35v10H26zM72 80h17v12H72zM104 80h29v10h-29z" /><path fill={p.light} opacity=".6" d="M28 82h30v2H28zM74 82h13v2H74zM106 81h25v2h-25z" />
      <path fill={p.glow} opacity=".35" d="M42 68h38v1H42zM91 72h20v1H91zM16 92h7v1h-7zM122 93h13v1h-13z" />
    </g>
  </>;
}

function LabVignettes() {
  const p = BANNER_PALETTES.biolabor;
  return <>
    <g transform="translate(-500 0)" data-vignette="biolabor-left">
      <path fill={p.far} d="M12 21h135v64H12zM5 15h6v72H5zM149 11h5v76h-5z" /><path fill={p.ink} d="M18 26h117v52H18zM0 86h160v10H0z" />
      <path fill="#779a91" d="M28 28h76v4H28zM28 73h76v6H28zM24 33h5v40h-5zM103 33h5v40h-5z" /><path fill={p.mid} d="M31 33h70v39H31z" />
      <path fill="#6da4a5" opacity=".3" d="M34 35h63v33H34z" /><path fill={p.light} opacity=".5" d="M34 35h2v29h-2zM38 35h18v1H38zM94 39h1v19h-1z" />
      <path fill="#d49a9c" d="M49 64h32v8H49z" /><path fill={p.ink} d="M51 65h28v1H51zM57 69h16v1H57z" />
      <g transform="translate(65 63)"><g className="pb-sway"><path fill={p.glow} d="M-1 0v-25h3v25zM-1-17h-10v-3h-4v-5h6v3h8zM2-11h11v-4h5v-5h-7v4H2zM2-24h4v-4h5v-4H5v3H2z" /><path fill={p.light} d="M-13-24h4v1h-4zM12-19h5v1h-5zM5-31h5v1H5zM0-15h1v12H0z" /></g></g>
      <g transform="translate(88 62)"><g className="pb-bubbles" style={{ animationDuration: "5.7s" }} fill="none" stroke={p.light}><path d="M0 0h2v2H0zM-3-9h2v2h-2z" /></g></g>
      <path fill="#779a91" d="M117 43h20v17h-20zM122 60h4v11h-4z" /><path fill={p.ink} d="M120 46h14v10h-14z" /><path fill={p.glow} className="pb-beacon" d="M122 48h4v2h-4zM122 53h10v1h-10z" />
      <path fill={p.mid} d="M35 14h66v4H35zM43 18h3v10h-3zM89 18h3v10h-3zM114 73h26v5h-26z" /><path fill={p.light} d="M43 29h3v1h-3zM89 29h3v1h-3zM39 16h57v1H39z" />
      <path fill={p.mid} d="M19 82h92v2H19zM28 90h18v1H28zM63 94h34v1H63zM125 88h18v1h-18z" /><path fill={p.glow} opacity=".12" d="M31 79h73v4H31zM40 85h63v2H40zM49 90h49v1H49z" />
    </g>
    <g transform="translate(350 0)" data-vignette="biolabor-right">
      <path fill={p.far} d="M11 17h137v69H11z" /><path fill={p.ink} d="M19 23h121v57H19zM0 88h160v8H0z" />
      <path fill="#779a91" d="M30 24h5v43h-5zM31 21h83v5H31zM109 25h5v23h-5z" /><path fill={p.light} opacity=".55" d="M32 28h1v32h-1zM37 22h66v1H37z" />
      <path fill={p.mid} d="M24 67h112v6H24zM30 73h7v14h-7zM122 73h7v14h-7z" /><path fill={p.glow} d="M27 68h105v1H27z" />
      <g transform="translate(83 27)"><g className="pb-lab-claw"><path fill="#779a91" d="M-4 0h8v16h-8zM-8 15H8v4H-8zM-8 19h3v8h-3zM5 19h3v8H5z" /><path fill={p.light} d="M-2 2h2v11h-2zM-5 17H5v1H-5z" /><path fill={p.glow} d="M-8 25h5v3h-5zM3 25h5v3H3z" /></g></g>
      <path fill="#6da4a5" d="M69 60h28v6H69zM72 55h22v5H72z" /><path fill={p.ink} d="M76 56h4v3h-4zM85 56h4v3h-4z" /><path fill={p.light} d="M77 56h2v1h-2zM86 56h2v1h-2z" />
      <path fill="#d49a9c" d="M39 53h10v13H39zM41 47h6v6h-6zM118 51h9v15h-9zM120 46h5v5h-5z" /><path fill={p.light} d="M41 55h1v8h-1zM120 54h1v9h-1z" />
      <path fill={p.mid} d="M113 25h20v16h-20z" /><path fill={p.glow} d="M116 28h14v9h-14z" /><path fill={p.ink} d="M118 30h5v2h-5zM118 34h9v1h-9z" />
      <g transform="translate(43 78)"><g className="pb-cruise" style={{ animationDuration: "11s" }}><path fill="#779a91" d="M-7-5H7v9H-7zM-5-10H5v5H-5z" /><path fill={p.ink} d="M-7 4h4v3h-4zM3 4h4v3H3zM-3-8h6v3H-3z" /><path fill={p.glow} d="M-2-7h1v1h-1zM1-7h1v1H1z" /></g></g>
      <path fill={p.mid} d="M86 77h19v1H86zM70 83h8v1h-8zM101 91h30v1h-30zM23 92h19v1H23z" /><path fill={p.glow} opacity=".12" d="M68 72h34v7H68zM73 82h29v2H73z" />
    </g>
  </>;
}

function DataVignettes() {
  const p = BANNER_PALETTES.datenstrom;
  return <>
    <g transform="translate(-500 0)" data-vignette="datenstrom-left">
      <path fill={p.far} d="M5 65h27v31H5zM121 53h32v43h-32zM44 83h63v13H44z" />
      <path fill={p.ink} d="M18 69h127v9H18zM22 41h9v30h-9zM133 35h8v36h-8z" /><path fill={p.mid} d="M26 50h109v3H26zM27 66h109v5H27z" />
      <path fill={p.glow} d="M29 48h104v1H29zM22 41h2v27h-2zM137 36h2v30h-2zM24 69h113v1H24z" />
      <path fill="none" stroke={p.mid} d="M30 70v16h22v10M65 74v9h23v13M113 72v18h31M33 36V19h26v-7h25M111 39V22h22v-9" />
      <path fill={p.light} d="M30 16h6v6h-6zM81 9h6v6h-6zM130 10h6v6h-6z" />
      {[45, 78, 110].map((x, i) => <g key={x} transform={`translate(${x} 49)`}><g className="pb-packet" style={{ animationDuration: "3.8s", animationDelay: `${-i * 1.25}s` }}><path fill={p.light} d="M0-2h6v3H0z" /><path fill="#8eabc9" opacity=".2" d="M-3-4h13v7H-3z" /></g></g>)}
      <g transform="translate(70 59)"><g className="pb-cruise" style={{ animationDuration: "8s" }}><path fill="#8eabc9" d="M-10-3H7v2h4v6H-10zM-6-8H4v5H-6z" /><path fill={p.light} d="M-4-6H2v2H-4zM-8-2H7v1H-8z" /><path fill={p.ink} d="M-8 5h4v3h-4zM4 5h4v3H4z" /><path fill="#d3b8dc" d="M-8 1h3v2h-3zM5 1h3v2H5z" /></g></g>
      <path fill={p.glow} opacity=".35" d="M21 80h25v1H21zM55 90h37v1H55zM122 81h18v1h-18zM86 85h16v1H86z" /><path fill={p.light} d="M23 42h3v2h-3zM136 35h3v2h-3zM35 74h4v1h-4zM124 74h4v1h-4z" />
    </g>
    <g transform="translate(350 0)" data-vignette="datenstrom-right">
      <path fill={p.far} d="M12 73h138v23H12zM21 31h28v44H21zM112 21h28v54h-28z" /><path fill={p.ink} d="M47 26h59v55H47zM36 80h84v7H36z" />
      <path fill={p.mid} d="M53 32h47v10H53zM53 47h47v10H53zM53 62h47v10H53zM45 83h67v2H45z" /><path fill="#8eabc9" d="M55 32h43v2H55zM55 47h43v2H55zM55 62h43v2H55z" />
      <path fill={p.ink} d="M62 36h32v3H62zM62 51h32v3H62zM62 66h32v3H62z" />
      {[0, 1, 2].map(i => <g key={i} className="pb-beacon" style={{ animationDuration: "4.3s", animationDelay: `${-i * 1.3}s` }} fill={i === 1 ? "#d3b8dc" : p.light}><path d={`M55 ${36 + i * 15}h3v3h-3zM82 ${37 + i * 15}h10v1H82z`} /></g>)}
      <path fill="none" stroke={p.glow} opacity=".65" d="M48 42H30v15H17M105 49h21V38h17M72 27V14h24M76 86v7h55" />
      <path fill={p.light} d="M15 54h5v5h-5zM140 35h5v5h-5zM94 12h5v5h-5zM127 91h5v4h-5z" />
      <g transform="translate(113 65)"><g className="pb-specimen" style={{ animationDelay: "-2s" }}><path fill="#d3b8dc" d="M0-9h5v3h5v9H5v3H0V3h-5v-9H0z" /><path fill={p.light} d="M0-7h3v2H0zM-3-4h2v6h-2z" /><path fill={p.ink} d="M3-2h5v3H3z" /></g></g>
      <path fill={p.mid} d="M21 34h2v33h-2zM135 25h2v44h-2zM17 77h11v1H17zM23 88h17v1H23zM89 92h13v1H89zM119 79h21v1h-21z" /><path fill={p.glow} opacity=".15" d="M50 74h54v5H50zM56 88h43v2H56z" />
    </g>
  </>;
}

function DeepVignettes() {
  const p = BANNER_PALETTES.tiefseestation;
  return <>
    <g transform="translate(-500 0)" data-vignette="tiefseestation-left">
      <path fill={p.far} d="M5 80h25v-7h25v6h43v-9h19v8h35v18H5z" /><path fill={p.ink} d="M17 64h114v6h-7v9h-12v7H50v-4H32v-7H21z" />
      <path fill="#9f849e" d="M25 65h96v4h-5v9h-10v5H53v-4H36v-6h-8z" /><path fill={p.mid} d="M35 67h4v12h-4zM48 68h4v14h-4zM65 68h4v15h-4zM85 67h4v16h-4zM106 66h4v13h-4z" />
      <path fill={p.ink} d="M63 19h4v46h-4zM40 36h54v3H40zM65 18h24v3H65z" /><path fill="#78ada6" d="M69 25h19v5h6v22H72v-9h-3z" /><path fill={p.light} opacity=".35" d="M72 28h12v2H72zM77 33h12v1H77zM75 43h8v1h-8z" />
      <path fill="none" stroke={p.mid} d="M43 38l-7 24M92 38l18 26M65 22L30 63" />
      <path fill="#c6a97e" d="M45 67h12v7H45z" /><path fill={p.ink} d="M46 69h10v1H46z" /><path fill={p.light} d="M50 68h2v3h-2z" />
      <path fill="#9f849e" d="M126 87V57h3v12h6V54h3v19h-9v14zM124 76h-8V64h3v9h5zM17 89V72h3v8h6v-9h3v12h-9v6z" /><path fill={p.glow} d="M135 53h4v3h-4zM116 63h4v3h-4zM16 71h4v3h-4z" />
      <g transform="translate(96 45)"><g className="pb-cruise" style={{ animationDuration: "9.7s" }}><path fill="#c6a97e" d="M-6-3H5v2h4v3H5v2H-6V1h-4v-4h4z" /><path fill={p.light} d="M-3-3H4v1H-3z" /><path fill={p.ink} d="M4-1h1v1H4z" /></g></g>
      <g transform="translate(36 66)"><g className="pb-bubbles" style={{ animationDuration: "6.6s" }} fill="none" stroke={p.light}><path d="M0 0h3v3H0zM4-13h2v2H4z" /></g></g>
      <path fill={p.glow} opacity=".25" d="M37 87h31v1H37zM79 91h30v1H79zM9 93h17v1H9zM137 89h15v1h-15z" /><path fill="#78ada6" d="M76 85h3v3h4v2h-8v-2h-3v-2h4zM91 86h3v3h-3z" />
    </g>
    <g transform="translate(350 0)" data-vignette="tiefseestation-right">
      <path fill={p.far} d="M8 86V68h13V57h10v29h20V74h18v12h34V72h14V61h10v25h24v10H8z" />
      <path fill={p.ink} d="M32 96V82h12V62h7V47h8v-9h12v9h7v35h11v14zM96 96V76h7V57h7v-9h9v28h10v20z" />
      <path fill={p.mid} d="M50 83V61h5V48h5v-6h9v7h4v34zM108 80V58h4v-7h5v28z" /><path fill="#78ada6" d="M53 64h2v14h-2zM62 45h2v20h-2zM111 60h2v13h-2z" />
      <path fill={p.glow} d="M58 40h12v3H58zM109 51h9v2h-9z" />
      {[60, 66, 111].map((x, i) => <g key={x} transform={`translate(${x} ${i === 2 ? 51 : 39})`}><g className="pb-steam" style={{ animationDuration: "5s", animationDelay: `${-i * 1.6}s` }} fill="#78ada6"><path opacity=".55" d="M-3 0h7v-3h3v-5H3v-4h-5v5h-3v4h2z" /></g></g>)}
      <g transform="translate(103 30)"><g className="pb-cruise" style={{ animationDuration: "10.6s" }}><path fill="#9f849e" d="M-11-2h5v-4H8v3h6V5H8v4H-5V5h-6zM-12 0h-7v7h7z" /><path fill={p.ink} d="M7 1h8v2H7zM7 3h2v2H7zM11 3h2v2h-2z" /><path fill={p.light} d="M6-2h2v2H6z" /><path fill="none" stroke="#9f849e" d="M1-6v-8h12v6" /><g className="pb-beacon"><path fill={p.light} d="M11-10h5v4h-5z" /><path fill={p.glow} opacity=".13" d="M6-15h15v14H6z" /></g></g></g>
      <path fill="#c6a97e" d="M25 84h4v-4h3v4h4v3h-4v4h-3v-4h-4zM129 91h7v2h-7z" /><path fill={p.mid} d="M10 94h27v1H10zM44 91h31v1H44zM91 88h12v1H91zM123 87h23v1h-23z" />
      <path fill={p.glow} opacity=".14" d="M49 84h30v3H49zM48 90h35v1H48zM108 80h17v2h-17z" />
    </g>
  </>;
}

function SunsetVignettes() {
  const p = BANNER_PALETTES.sonnenraster;
  return <>
    <g transform="translate(-500 0)" data-vignette="sonnenraster-left">
      <path fill={p.far} d="M7 64h144v32H7zM85 44h56v24H85z" /><path fill={p.mid} d="M89 47h48v23H89z" />
      <path fill={p.ink} d="M13 37h124v9H13zM23 46h5v35h-5zM123 46h5v35h-5zM0 88h160v8H0z" /><path fill="#bc7692" d="M12 31h128v7H12z" /><path fill={p.light} d="M15 32h123v2H15z" /><path fill={p.glow} d="M17 41h114v2H17z" />
      <path fill="#7399b1" d="M97 52h31v13H97z" /><path fill={p.light} opacity=".6" d="M99 53h27v2H99z" /><path fill={p.ink} d="M111 52h2v13h-2zM94 70h38v3H94z" />
      {[43, 74].map((x, i) => <g key={x} transform={`translate(${x} 61)`}><path fill="#bc7692" d="M-7-10H7v24H-7z" /><path fill={p.light} d="M-5-8H5v7H-5zM-6 2H6v2H-6z" /><path fill={p.ink} d="M-3-6h6v2H-3zM-2 8h4v3h-4z" /><path fill="none" stroke={p.ink} strokeWidth="2" d="M7-5h5v20H8V5" /><path fill={p.glow} className="pb-beacon" style={{ animationDelay: `${-i * 2}s` }} d="M-2-5h3v1h-3z" /></g>)}
      <path fill={p.ink} d="M100 76h7v5h-7zM102 72h4v4h-4zM99 81h9v7h-9zM98 87h3v5h-3zM105 87h3v5h-3z" /><path fill={p.light} d="M101 74h4v2h-4z" />
      <path fill="#7399b1" d="M34 16h21v13H34zM43 29h3v2h-3z" /><path fill={p.light} d="M37 19h4v7h-4zM43 19h8v2h-8zM43 23h5v3h-5z" /><path fill={p.glow} className="pb-beacon" style={{ animationDuration: "5.9s" }} d="M34 16h21v1H34zM34 28h21v1H34z" />
      <g className="pb-water" fill={p.glow} opacity=".3"><path d="M33 80h49v1H33zM29 84h62v1H29zM28 91h72v1H28zM92 92h30v1H92z" /></g>
      <path fill={p.mid} d="M14 84h13v1H14zM120 85h23v1h-23zM7 94h15v1H7z" /><path fill={p.light} opacity=".14" d="M25 47h101v4H25zM31 78h54v2H31z" />
    </g>
    <g transform="translate(350 0)" data-vignette="sonnenraster-right">
      <path fill={p.far} d="M1 84V68h10V53h13V36h13v8h10v17h15v23h92v12H1z" /><path fill={p.mid} d="M15 69V55h13V41h7v8h8v17h11v12H15z" />
      <path fill="#bc7692" opacity=".65" d="M29 46h5v2h-5zM20 58h13v2H20zM29 65h18v2H29zM16 74h19v1H16z" />
      <path fill={p.ink} d="M0 85h159v11H0zM53 77h102v5H53zM70 44h4v33h-4zM137 40h4v36h-4z" /><path fill="#7399b1" d="M67 28h76v18H67z" /><path fill={p.ink} d="M71 32h68v10H71z" />
      <g className="pb-beacon" style={{ animationDuration: "6.2s" }} fill={p.glow}><path d="M74 35h6v4h-6zM84 34h3v6h-3zM91 34h8v2h-8zM91 38h8v2h-8zM104 34h3v6h-3zM111 34h9v2h-9zM114 36h3v4h-3zM126 34h8v6h-3v-3h-5z" /><path opacity=".15" d="M64 25h82v23H64z" /></g>
      <path fill={p.light} d="M67 28h76v1H67zM69 45h73v1H69zM74 29h4v2h-4zM133 29h4v2h-4z" />
      <path fill="#7399b1" d="M74 69h28v3H74zM78 72h2v7h-2zM97 72h2v7h-2zM77 64h3v6h-3zM96 64h3v6h-3z" /><path fill={p.light} d="M79 64h17v2H79z" />
      <path fill={p.ink} d="M117 69h5v8h-5zM115 65h9v4h-9zM121 57h2v8h-2zM121 57h9v3h-9z" /><path fill={p.light} d="M124 58h5v1h-5z" />
      <g transform="translate(55 56)"><g className="pb-butterfly" style={{ animationDuration: "11s" }}><path fill={p.light} d="M-5 0h3v2H2V0H5v1H3v3H-3V1H-5z" /></g></g>
      <path fill={p.light} opacity=".23" d="M57 83h95v1H57zM69 90h37v1H69zM117 87h25v1h-25zM30 92h13v1H30z" /><path fill={p.mid} d="M12 88h16v2H12zM41 80h10v1H41zM133 93h17v1h-17z" />
    </g>
  </>;
}

function PalmVignettes() {
  const p = BANNER_PALETTES.pastellpalmen;
  return <>
    <g transform="translate(-500 0)" data-vignette="pastellpalmen-left">
      <path fill="#6fa9b0" d="M0 72h160v24H0z" /><path fill={p.far} d="M7 61h139v9H7z" /><path fill={p.ink} d="M16 68h4v28h-4zM49 68h4v28h-4zM114 68h4v28h-4zM140 67h4v29h-4z" />
      <path fill={p.mid} d="M7 63h139v8H7z" /><path fill={p.light} d="M11 63h131v2H11zM19 71h1v18h-1zM115 71h1v16h-1z" /><path fill={p.ink} opacity=".4" d="M28 65h1v6h-1zM56 65h1v6h-1zM90 65h1v6h-1zM124 65h1v6h-1z" />
      <path fill="#d89da9" d="M21 40h42v22H21zM17 36h50v5H17z" /><path fill={p.light} d="M23 42h38v3H23zM27 48h5v9h-5zM36 48h6v9h-6zM47 48h7v9h-7z" /><path fill={p.ink} d="M27 49h5v5h-5zM48 50h5v5h-5z" />
      <path fill={p.ink} d="M41 15h2v21h-2zM20 36V24h3v12h-3z" /><path fill="#d89da9" d="M8 24v-4h9v-5h16v-5h18v5h15v5h9v4z" /><path fill={p.light} d="M19 19h14v-4h9v9H19zM48 14h3v4h10v6H48z" />
      <path fill={p.ink} d="M89 54h29v3H89zM95 57h3v7h-3zM111 57h3v7h-3zM82 58h8v3h-8zM82 61h2v4h-2zM120 58h8v3h-8zM126 61h2v4h-2z" />
      <path fill={p.light} d="M97 48h6v5h-6zM103 49h3v3h-3zM109 51h5v2h-5z" /><g transform="translate(100 48)"><g className="pb-steam" style={{ animationDuration: "4.9s" }} fill={p.light}><path d="M0 0h1v-3h2v-3H1v-3h1v-2h-3v5h2v2H0z" /></g></g>
      <g className="pb-water" fill={p.glow} opacity=".65"><path d="M7 77h28v1H7zM51 82h39v1H51zM104 76h26v1h-26zM123 90h30v1h-30zM29 92h26v1H29z" /></g>
      <path fill="#a6bc93" d="M135 58V38h3v20h6V47h3v11zM133 43h-8v-7h3v4h5z" /><path fill={p.light} d="M128 37h3v2h-3zM145 45h3v3h-3z" />
      <path fill={p.glow} opacity=".22" d="M23 73h40v2H23zM30 80h29v1H30zM93 67h24v1H93z" />
    </g>
    <g transform="translate(350 0)" data-vignette="pastellpalmen-right">
      <path fill={p.mid} d="M4 79h15v-9h24v-6h17v7h18v6h20v-9h21v7h20v9h16v12H4z" /><path fill={p.far} d="M13 85h13v-9h20v-5h12v6h21v8h22v-8h18v5h19v14H13z" />
      <path fill="#6fa9b0" d="M30 84h18v-5h40v4h25v5h15v5H21v-5h9z" /><path fill={p.glow} d="M46 80h39v1H46zM27 87h6v1h-6zM105 85h7v1h-7z" />
      <g transform="translate(70 88)"><g className="pb-ring-ripple" fill="none" stroke={p.light}><path d="M-20-1h7v-2h28v2h6v3h-7v1h-27V1h-7z" /></g></g>
      <path fill={p.ink} d="M109 66h2v-26h3v26h3v3h-8zM110 45h-8v-9h3v6h5z" /><path fill={p.light} d="M111 36h7v4h-7zM117 37h7v2h-7zM109 42h8v7h-8zM108 47h7v9h-7z" /><path fill="#d89da9" d="M119 37h7v1h-7z" /><path fill={p.ink} d="M116 37h1v1h-1z" />
      <g transform="translate(111 49)"><g className="pb-wing" style={{ animationDuration: "5.2s" }}><path fill={p.glow} d="M0 0h6v2h4v3h3v2H7V5H2z" /></g></g>
      <path fill="#a6bc93" d="M35 70V42h3v15h6V37h3v29h-4v4zM48 68V53h3v15h4V46h3v22z" /><path fill={p.light} d="M36 42h1v10h-1zM45 38h1v18h-1zM55 47h1v10h-1z" />
      <path fill="#d89da9" d="M78 77h9v4h-9zM76 75h2v4h-2zM87 75h2v4h-2zM77 81h2v2h-2zM85 81h2v2h-2z" /><path fill={p.ink} d="M80 77h1v1h-1zM84 77h1v1h-1z" />
      <path fill={p.light} opacity=".4" d="M21 72h12v1H21zM46 65h12v1H46zM100 72h18v1h-18zM126 79h9v1h-9zM20 93h12v1H20zM133 91h11v1h-11z" />
      <g className="pb-water" fill={p.light} opacity=".55"><path d="M37 89h12v1H37zM88 90h22v1H88zM64 83h12v1H64z" /></g>
    </g>
  </>;
}

function RocketVignettes() {
  const p = BANNER_PALETTES.raketenhafen;
  return <>
    <g transform="translate(-500 0)" data-vignette="raketenhafen-left">
      <path fill={p.far} d="M7 73h144v23H7zM20 59h38v14H20z" /><path fill={p.ink} d="M52 71h81v8H52zM68 58h48v14H68zM89 40h6v21h-6z" />
      <path fill={p.mid} d="M72 60h40v10H72zM58 73h69v3H58z" /><path fill="#87adba" d="M76 62h31v3H76z" /><path fill={p.light} d="M78 63h5v1h-5zM87 63h8v1h-8zM101 63h4v1h-4z" />
      <g transform="translate(92 42)"><g className="pb-dish" style={{ animationDuration: "11s" }}>
        <path fill={p.mid} d="M-28-23h4v8h6v6h8v5H0v3H12V3H0v-2h-12v-4h-10v-6h-5v-7h-1z" /><path fill={p.light} d="M-25-22h2v8h7v5h8v4H4v2H-9v-3h-10v-6h-5z" />
        <path fill={p.ink} d="M-10-20h2V0h-2zM-15-22h12v3h-12z" /><path fill={p.glow} d="M-13-24h7v4h-7z" />
      </g></g>
      <path fill={p.ink} d="M30 31h3v31h-3zM18 39h28v2H18zM23 31h18v2H23zM27 24h10v2H27zM30 18h3v6h-3z" /><path fill={p.glow} className="pb-beacon" d="M29 15h5v4h-5z" />
      <path fill="#87adba" d="M23 66h19v8H23zM119 56h25v16h-25z" /><path fill={p.light} d="M25 67h15v1H25zM121 57h21v1h-21z" /><path fill={p.ink} d="M122 61h18v2h-18zM122 66h18v2h-18z" />
      <path fill="#aa887c" d="M15 83h22v9H15zM123 82h26v10h-26z" /><path fill={p.light} opacity=".45" d="M17 84h18v1H17zM126 83h19v1h-19zM62 80h56v1H62z" />
      <path fill="none" stroke={p.mid} d="M42 69h11v14h69M75 78v11H40" /><path fill={p.glow} opacity=".3" d="M68 85h42v1H68zM58 91h49v1H58zM25 94h11v1H25z" />
    </g>
    <g transform="translate(350 0)" data-vignette="raketenhafen-right">
      <path fill={p.far} d="M5 76h151v20H5zM104 38h38v39h-38z" /><path fill={p.ink} d="M19 30h34v43H19zM23 25h26v5H23zM62 40h28v33H62zM67 34h18v6H67zM12 74h138v8H12z" />
      <path fill={p.mid} d="M22 32h28v40H22zM26 27h20v5H26zM65 41h22v31H65zM69 36h14v5H69z" /><path fill={p.light} d="M25 34h3v33h-3zM68 43h2v24h-2zM26 27h19v1H26zM69 36h13v1H69z" />
      <path fill="#aa887c" d="M22 48h28v5H22zM65 51h22v5H65z" /><path fill={p.ink} d="M32 43h8v3h-8zM70 60h11v3H70z" />
      <path fill="#87adba" d="M39 67h7v19h30V73h8v-4h29v5H88v17H41v-5h-2zM109 51h19v23h-5V57h-14z" /><path fill={p.light} d="M42 69h1v15h-1zM47 87h27v1H47zM113 52h13v1h-13z" />
      <g transform="translate(81 73)"><g className="pb-rotor" style={{ animationDuration: "7s" }}><path fill={p.glow} d="M-7-2h5v-5h4v5H7v4H2V7h-4V2h-5z" /><path fill={p.ink} d="M-2-2h4v4h-4z" /></g></g>
      <path fill={p.mid} d="M109 25h18v17h-18zM112 42h3v10h-3z" /><path fill={p.light} d="M112 28h12v10h-12z" /><path fill={p.ink} d="M117 29h2v6h-5v-2h3z" />
      <g transform="translate(136 62)"><g className="pb-steam" style={{ animationDuration: "5.1s" }} fill={p.light}><path opacity=".55" d="M-4 0h8v-3h4v-5H3v-4h-6v4h-4v5h3z" /></g></g>
      <path fill={p.glow} className="pb-beacon" style={{ animationDuration: "5.5s" }} d="M108 77h4v2h-4zM117 77h4v2h-4zM126 77h4v2h-4zM22 21h4v4h-4z" />
      <path fill={p.mid} d="M16 91h16v1H16zM93 89h17v1H93zM121 94h23v1h-23zM57 93h20v1H57z" /><path fill={p.light} opacity=".25" d="M14 81h137v1H14zM49 90h18v1H49z" />
    </g>
  </>;
}

function OrbitVignettes() {
  const p = BANNER_PALETTES.orbitalring;
  return <>
    <g transform="translate(-500 0)" data-vignette="orbitalring-left">
      <path fill={p.far} d="M13 46h10V34h17V23h83v8h19v47h-19v9H40V76H22V63H13z" /><path fill={p.ink} d="M34 37h91v38H34zM27 77h107v10H27z" />
      <path fill={p.mid} d="M28 44h9V34h15v-7h69v5H57v7H42v29h14v8h66v5H50v-8H34V60h-6z" /><path fill={p.light} opacity=".55" d="M39 36h14v-6h61v1H55v7H42v24h-1zM50 76h63v1H50z" />
      <path fill="#8eb4c1" d="M37 46h18v4H37zM37 62h18v4H37zM118 43h16v5h-16zM118 65h16v5h-16z" /><path fill={p.glow} d="M50 44h6v8h-6zM50 60h6v8h-6zM117 42h4v8h-4zM117 63h4v9h-4z" />
      <g transform="translate(88 56)"><g className="pb-cruise" style={{ animationDuration: "13s" }}>
        <path fill="#c5b4c3" d="M-25-3h10v-5H9v4h15v8H9v5h-24V4h-10z" /><path fill={p.light} d="M-12-6H7v2h-19zM-21-2h10v1h-10z" /><path fill={p.mid} d="M-11 1H8v5h-19zM-22 1h10v2h-10zM11 0h11v2H11z" />
        <path fill={p.ink} d="M-7-3H4v3H-7zM-19-9h7v5h-7zM-19 5h7v6h-7z" /><path fill="#cfa887" className="pb-beacon" d="M-26-2h3v5h-3z" />
      </g></g>
      <path fill={p.ink} d="M59 84h4v10h-4zM108 84h4v10h-4z" /><path fill={p.mid} d="M51 92h24v4H51zM99 92h23v4H99z" />
      {[46, 71, 96].map((x, i) => <g key={x} transform={`translate(${x} 81)`}><g className="pb-packet" style={{ animationDelay: `${-i}s`, animationDuration: "3.5s" }} fill={p.light}><path d="M0 0h4v1H0z" /></g></g>)}
      <path fill={p.light} opacity=".5" d="M22 49h2v5h-2zM31 68h2v4h-2zM126 33h2v5h-2zM130 74h2v3h-2zM67 30h7v1h-7zM97 30h5v1h-5z" />
    </g>
    <g transform="translate(350 0)" data-vignette="orbitalring-right">
      <path fill={p.far} d="M61 38h16v-8h31v5h16v10h12v21h-7v11h-16v7H77v-8H61V63H51V47h10z" /><path fill={p.mid} d="M67 42h14v-8h24v6h16v9h10v14h-8v11h-15v6H82v-8H67V58H57v-8h10z" />
      <path fill="#c5b4c3" opacity=".5" d="M72 43h12v-7h15v2H85v8H72zM61 51h3v8h-3zM113 43h7v4h-7zM100 76h8v2h-8z" />
      <path fill={p.ink} d="M84 48h19v11H84zM106 63h12v9h-12zM75 66h9v7h-9zM108 38h5v5h-5z" /><path fill={p.glow} d="M89 49h3v5h-3zM95 50h2v7h-2zM107 64h2v4h-2zM77 67h2v3h-2z" />
      <path fill="#8eb4c1" d="M15 49h25v23H15zM18 45h19v4H18zM20 72h4v8h-4zM31 72h4v8h-4zM21 79h43v4H21zM60 68h4v11h-4z" /><path fill={p.light} d="M18 51h18v2H18zM20 46h15v1H20zM22 80h37v1H22z" />
      <path fill={p.ink} d="M20 56h15v7H20z" /><path fill="#cfa887" d="M22 58h11v3H22z" />
      <g transform="translate(40 58)"><g className="pb-piston" style={{ animationDuration: "1.1s" }}><path fill={p.light} d="M0-3h16v6H0z" /><path fill={p.mid} d="M4-2h2v4H4zM10-2h2v4h-2z" /><path fill="#cfa887" d="M16-5h5v2h5v6h-5v2h-5z" /></g></g>
      <g transform="translate(68 56)"><g className="pb-spark" style={{ animationDuration: "2.8s" }} fill={p.glow}><path d="M0 0h2v2H0zM4-4h1v2H4zM2 4h2v1H2z" /></g></g>
      <path fill={p.mid} d="M129 25h9v-4h8v5h4v9h-7v3h-11v-5h-3zM30 18h7v3h4v7h-9v-3h-2zM137 87h8v4h-8z" /><path fill={p.light} opacity=".35" d="M133 26h8v1h-8zM32 20h4v1h-4zM86 88h5v1h-5z" />
    </g>
  </>;
}

function GhostVignettes() {
  const p = BANNER_PALETTES.geisterstadt;
  return <>
    <g transform="translate(-500 0)" data-vignette="geisterstadt-left">
      <path fill={p.far} d="M5 71h27V44h13v29h95V59h13v37H5z" /><path fill={p.ink} d="M32 36h61v48H32zM26 35v-5h14v-8h13v-8h18v8h11v8h17v5zM0 88h160v8H0z" />
      <path fill={p.mid} d="M37 39h51v42H37z" /><path fill="#a38a9d" d="M31 30h11v-7h13v-6h14v7h10v7h14v2H77v-6H66v-7h-9v6H44v7H31z" />
      <path fill={p.ink} d="M42 45h41v22H42zM42 71h41v3H42z" /><path fill={p.glow} opacity=".5" d="M46 49h33v15H46z" /><path fill={p.light} d="M48 50h3v12h-3zM62 50h2v12h-2zM75 50h2v12h-2z" /><path fill={p.mid} d="M43 56h39v2H43zM45 67h36v3H45z" />
      <path fill="#809b8e" d="M48 75h28v5H48z" /><path fill={p.light} opacity=".65" d="M50 76h8v1h-8zM61 76h11v1H61z" />
      <g transform="translate(85 46)"><g className="pb-lantern-swing"><path fill={p.ink} d="M-1-6h2v7h-2zM-4 0h9v12h-9z" /><path fill={p.light} d="M-2 2h5v7h-5z" /><path fill={p.glow} opacity=".14" d="M-8-2H9v19H-8z" /></g></g>
      <path fill={p.ink} d="M105 72h32v4h-32zM108 65h3v7h-3zM130 65h3v7h-3zM107 76h3v8h-3zM131 76h3v8h-3z" /><path fill={p.mid} d="M108 65h25v2h-25zM105 72h30v1h-30z" />
      <g transform="translate(61 53)"><g className="pb-leaf-fall" style={{ animationDuration: "8s", animationDelay: "-2s" }}><path fill={p.light} d="M0 0h6v5H0z" /><path fill={p.mid} d="M1 1h4v1H1zM1 3h3v1H1z" /></g></g>
      <path fill="#809b8e" d="M34 79V65h3v14h4v5h-7zM34 70h-6v-8h2v5h4zM79 81h3v-9h3v9h4v-5h3v8H79z" />
      <path fill={p.mid} d="M28 86h71v1H28zM16 91h22v1H16zM72 93h30v1H72zM120 88h19v1h-19z" /><path fill={p.light} opacity=".12" d="M43 74h41v8H43zM39 85h55v2H39z" />
    </g>
    <g transform="translate(350 0)" data-vignette="geisterstadt-right">
      <path fill={p.far} d="M0 83h14v-8h27v5h27v-9h32v8h21v-5h24v10h15v12H0z" /><path fill={p.ink} d="M8 87h146v9H8zM26 45h5v40h-5zM118 45h5v40h-5zM26 43v-5h12v-9h14v-8h18v-4h16v4h18v8h10v10h9v5h-6v-5h-9V31H98v-6H84v-4H72v4H55v7H43v9H31v4z" />
      <path fill="#a38a9d" d="M31 40h9v-9h14v-8h18v-3h12v3h16v7h10v9h8v2h-10v-9H98v-7H84v-3H72v3H56v8H43v9H31z" />
      <path fill={p.mid} d="M31 53h41v2H31zM85 53h33v2H85zM39 44h2v42h-2zM50 41h2v45h-2zM62 45h2v41h-2zM92 43h2v43h-2zM105 45h2v41h-2zM113 47h2v39h-2z" />
      <path fill="#a38a9d" d="M49 87V66h4v-5h12v5h4v21zM89 89V72h4v-5h10v5h4v17z" /><path fill={p.glow} opacity=".4" d="M53 65h10v1H53zM93 71h8v1h-8z" /><path fill={p.ink} d="M58 68h2v11h-2zM54 72h10v2H54zM94 76h8v1h-8zM94 80h8v1h-8z" />
      <path fill="#809b8e" d="M23 84V60h3v24h4v-9h3v12H23zM122 86V54h3v13h7V57h3v14h-10v15zM125 78h14v-8h3v11h-17zM67 88V77h3v11h6v-8h2v10H67z" /><path fill="#a38a9d" d="M25 63h4v3h-4zM132 60h4v3h-4zM137 73h4v3h-4zM70 81h4v3h-4z" />
      <g transform="translate(81 21)"><path fill={p.ink} d="M-4-4h8v5h-8zM2-7h5v4H2zM6-6h3v2H6zM-2 1h1v3h-1zM2 1h1v3H2z" /><g className="pb-wing" style={{ animationDuration: "4.7s" }}><path fill={p.mid} d="M-3-3h-7v-3h-5v-2h4v1h5v2h4z" /></g><path fill={p.light} d="M5-6h1v1H5z" /></g>
      <g transform="translate(78 70)"><g className="pb-fairy-flight" style={{ animationDuration: "8.8s" }}><path fill={p.light} d="M-2-2h4v4h-4z" /><path fill={p.glow} opacity=".14" d="M-6-5H6V6H-6z" /></g></g>
      <path fill={p.mid} d="M37 91h21v1H37zM81 94h29v1H81zM114 89h25v1h-25zM13 93h13v1H13z" /><path fill={p.light} opacity=".2" d="M52 89h17v1H52zM92 92h12v1H92z" />
    </g>
  </>;
}

export const FUTURE_VIGNETTES = {
  neonregen: <NeonVignettes />, dachgaerten: <GardenVignettes />, biolabor: <LabVignettes />,
  datenstrom: <DataVignettes />, tiefseestation: <DeepVignettes />,
  sonnenraster: <SunsetVignettes />, pastellpalmen: <PalmVignettes />, raketenhafen: <RocketVignettes />,
  orbitalring: <OrbitVignettes />, geisterstadt: <GhostVignettes />,
} satisfies Partial<Record<BannerId, ReactNode>>;
