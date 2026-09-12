// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import type { BannerId } from "@chronicle/theme";
import type { ReactNode } from "react";
import { BANNER_PALETTES } from "./pixel-banner-palettes";
import { Clouds, Fireflies, Moon, Sky, type Palette } from "./pixel-banner-primitives";

/** Original miniature worlds, hand composed on the banner's 640 × 96 pixel grid. */
function Skyline({ p, green = false }: { p: Palette; green?: boolean }) {
  return <g>{Array.from({ length: 25 }, (_, i) => {
    const x = i * 28 - 8, top = 22 + (i * 17 % 29), width = 16 + i % 3 * 4;
    return <g key={i}>
      <path fill={p.far} d={`M${x} ${top}h${width}v${83 - top}h-${width}zM${x + 4} ${top - 5}h${width - 8}v5h-${width - 8}z`} />
      <path fill={p.mid} opacity=".45" d={`M${x + 2} ${top + 2}h3v${77 - top}h-3z`} />
      {Array.from({ length: 5 }, (_, row) => <path key={row} fill={row % 2 ? p.light : p.glow} opacity={i % 3 ? ".36" : ".6"} d={`M${x + 5} ${top + 6 + row * 7}h2v2h-2zM${x + 11} ${top + 6 + row * 7}h2v2h-2z`} />)}
      {green ? <path fill="#69a87d" d={`M${x - 2} ${top}h${width + 4}v3h-${width + 4}zM${x + 4} ${top - 5}h4v5h-4zM${x + width - 5} ${top - 3}h4v3h-4z`} /> : null}
    </g>;
  })}</g>;
}

function Shrub({ x, y, flowers = false, dark = false }: { x: number; y: number; flowers?: boolean; dark?: boolean }) {
  return <g transform={`translate(${x} ${y})`}>
    <path fill={dark ? "#255a56" : "#3d7960"} d="M-9 0h3v-4h5v-5h5v3h5v5h4v6H-9z" />
    <path fill={dark ? "#468976" : "#82b97b"} d="M-6-2h4v-3h3v3h3v-4h3v5h4v2H-6z" />
    <path fill="#b1d998" d="M-3-5h2v2h-2zM4-3h2v2H4z" />
    {flowers ? <path fill="#ffcd91" d="M-5-1h2v2h-2zM3-4h2v2H3zM8 1h2v2H8z" /> : null}
  </g>;
}

function NeonRain() {
  const p = BANNER_PALETTES.neonregen;
  return <><Sky p={p} /><Moon p={p} x={357} y={5} /><Skyline p={p} />
    <path fill="#202443" d="M0 64h640v32H0z" />
    <path fill="#313254" d="M276 62h70l74 34H204z" />
    <g fill="#161b32"><path d="M0 14h74v69H0zM88 30h47v52H88zM146 9h59v73h-59zM212 26h61v57h-61zM359 14h64v69h-64zM436 3h53v81h-53zM508 27h58v57h-58zM580 12h60v72h-60z" /></g>
    <g fill="#34334e"><path d="M4 19h62v59H4zM150 14h49v64h-49zM216 30h51v48h-51zM365 19h52v60h-52zM441 8h42v70h-42zM514 31h46v48h-46zM585 17h55v62h-55z" /></g>
    <g fill="#566081"><path d="M153 17h3v59h-3zM217 33h48v2h-48zM365 22h3v53h-3zM440 10h42v2h-42zM515 35h42v2h-42z" /></g>
    <g fill="#72bccc" opacity=".7">{[16, 40, 156, 180, 225, 247, 376, 399, 448, 471, 528, 550, 594, 620].map((x, i) => <path key={x} d={`M${x} ${24 + i % 3 * 4}h5v7h-5zM${x} ${42 + i % 2 * 5}h5v7h-5z`} />)}</g>
    <path fill="#e370bd" d="M196 19h8v36h-8zM365 25h6v27h-6zM443 25h33v3h-33zM3 36h52v3H3z" />
    <path fill="#ffe4e7" d="M198 23h4v2h-4zM198 29h4v2h-4zM198 35h4v2h-4zM198 42h4v2h-4z" />
    <path fill="#11192e" d="M276 44h75v35h-75zM270 42h88v5h-88z" />
    <path fill="#6d4668" d="M280 47h66v28h-66z" /><path fill="#ffc397" d="M285 51h56v19h-56z" />
    <path fill="#e58186" d="M274 42h80v6h-80z" /><path fill="#ffbfac" d="M275 42h8v6h-8zM291 42h8v6h-8zM307 42h8v6h-8zM323 42h8v6h-8zM339 42h8v6h-8z" />
    <path fill="#d87498" d="M289 31h44v9h-44z" /><path fill="#ffe1ab" d="M293 33h3v5h-3zM298 33h6v2h-6zM298 36h6v2h-6zM308 33h3v5h-3zM313 33h7v2h-7zM316 35h2v3h-2zM324 33h5v5h-2v-3h-3z" />
    <path fill="#30273e" d="M287 62h53v3h-53zM284 70h60v4h-60zM291 53h2v17h-2zM333 53h2v17h-2zM302 65h2v5h-2zM323 65h2v5h-2z" />
    <path fill="#fff0cb" d="M307 54h6v2h-6zM306 56h8v5h-8zM310 64h6v2h-6zM327 64h6v2h-6z" />
    <path fill="#e98ca0" d="M308 65h10v1h-10zM325 65h10v1h-10z" />
    {[313, 329].map((x, i) => <g key={x} transform={`translate(${x} 62)`}><g className="pb-steam" style={{ animationDelay: `${-i * 1.8}s` }} fill="#fff1d3"><path d="M-2 0h2v-3h2v-4H0v-3h2v-3h2v4H2v3h2v4H2v3H0v2h-2z" /></g></g>)}
    <g transform="translate(311 60)"><g className="pb-gardener-arm"><path fill="#fff0cb" d="M0 0h8v2H0z" /><path fill="#30273e" d="M7 0h8v1H7zM13-2h9v2h-9z" /><path fill="#e991b8" d="M14-3h7v1h-7z" /></g></g>
    <path fill="#b17999" d="M282 48h2v20h-2zM339 50h2v17h-2zM293 72h3v1h-3zM306 71h9v1h-9zM326 72h7v1h-7z" />
    <path fill="#ffccac" opacity=".16" d="M286 66h53v3h-53zM300 78h27v1h-27z" />
    <path fill="#a15674" d="M292 76h9v2h-9zM327 76h9v2h-9zM295 78h2v5h-2zM330 78h2v5h-2z" />
    <g transform="translate(348 46)"><g className="pb-lantern"><path fill="#672e60" d="M-1-1h10v15H-1z" /><path fill="#fc87c0" d="M1 0h6v13H1z" /><path fill="#ffdbdd" d="M3 1h2v10H3z" /><path fill="#392743" d="M0 3h8v1H0zM0 9h8v1H0zM3 13h2v3H3z" /></g></g>
    <path fill="#0f182b" d="M240 63h2v23h-2zM229 63v-3h4v-3h14v3h5v3z" /><path fill="#75dbd7" d="M230 62v-2h5v-2h10v2h5v2z" />
    <path fill="#d6b2c0" d="M237 79v-6h2v2h4v-2h2v9h-8zM245 79h3v-4h2v6h-5z" /><path className="pb-blink" fill="#131f33" d="M239 77h1v1h-1zM243 77h1v1h-1z" />
    <path fill="#0c172c" d="M380 77h17v7h-17zM383 72h11v5h-11zM389 67h2v5h-2z" /><path fill="#7fcede" d="M383 77h3v3h-3zM390 77h3v3h-3z" />
    <g className="pb-water" opacity=".6"><path fill="#ed80bc" d="M280 81h61v2h-61zM289 86h49v2h-49zM309 92h45v1h-45zM169 86h30v1h-30zM380 88h47v2h-47z" /><path fill="#7adae4" d="M226 86h32v1h-32zM201 92h38v1h-38zM55 88h58v1H55zM450 86h37v1h-37zM515 91h70v1h-70z" /></g>
    <path fill="#76526f" opacity=".45" d="M218 40h9v1h-9zM234 39h8v1h-8zM250 45h10v1h-10zM220 57h9v1h-9zM247 67h13v1h-13zM369 56h8v1h-8zM389 54h10v1h-10zM405 65h9v1h-9zM374 69h8v1h-8zM161 58h11v1h-11zM178 68h13v1h-13z" />
    <path fill="#73778c" d="M256 32h6v3h-6zM260 35h2v21h-2zM258 56h4v3h-4zM372 23h6v1h-6zM405 40h9v7h-9z" /><path fill="#23283f" d="M406 42h7v1h-7zM406 44h7v1h-7z" />
    <path fill="#74697d" d="M230 70h3v2h-3zM231 74h3v1h-3zM263 79h3v2h-3zM365 80h4v1h-4zM348 88h3v1h-3zM274 90h4v1h-4zM317 84h2v1h-2z" />
    <path fill="#ec8bba" opacity=".13" d="M281 74h62v4h-62zM283 79h58v1h-58zM363 27h2v22h-2zM204 21h3v33h-3z" /><path fill="#e5c0a6" opacity=".6" d="M308 58h4v1h-4zM298 64h4v1h-4zM318 64h4v1h-4z" />
    <g fill="#ffe1ab" className="pb-beacon" style={{ animationDuration: "4.8s" }}><path d="M289 31h44v1h-44zM289 39h44v1h-44zM289 32h1v7h-1zM332 32h1v7h-1z" /><path fill="#f19ccc" opacity=".15" d="M285 29h52v13h-52z" /></g>
    <g transform="translate(314 20)"><g className="pb-cruise" style={{ animationDuration: "8s" }}><path fill="#202942" d="M-15-2h8v-3H7v3h8v3H8v5H-8V1h-7z" /><path fill="#75d0d9" d="M-13-3h7v2h-7zM6-3h7v2H6zM-5-2H5v2H-5z" /><path fill="#e991b8" d="M-5 1H5v3H-5z" /><path fill="#ffe0c0" d="M-2 1h2v2h-2z" /><path fill="#8ce6e4" opacity=".2" d="M-11 2h3v2h-3zM8 2h3v2h-3zM-9 6H9v1H-9z" /></g></g>
    <path fill="#10182e" d="M0 90h78v6H0zM515 91h125v5H515zM76 11h2v61h-2zM424 10h2v62h-2z" />
    <path fill="none" stroke="#11182c" d="M180 8q150 31 280-3M55 10q150 32 227 3" />
  </>;
}

function RoofGardens() {
  const p = BANNER_PALETTES.dachgaerten;
  return <><Sky p={p} stars={false} /><Moon p={p} x={360} y={3} sun /><Clouds p={p} /><Skyline p={p} green />
    <path fill="#366559" d="M0 80h640v16H0zM205 68h67v28h-67zM273 61h91v35h-91zM367 74h71v22h-71z" />
    <path fill="#5d8f74" d="M0 83h203v13H0zM209 72h61v24h-61zM278 65h83v31h-83zM371 78h63v18h-63zM438 84h202v12H438z" />
    <path fill="#d1c793" d="M199 66h77v5h-77zM269 59h99v5h-99zM364 72h76v5h-76zM0 79h202v4H0zM442 79h198v4H442z" />
    <path fill="#284f49" d="M216 79h15v12h-15zM242 79h15v12h-15zM288 74h18v18h-18zM321 74h26v12h-26zM382 84h16v12h-16zM414 84h12v12h-12z" />
    <path fill="#e9d699" d="M218 81h11v2h-11zM244 81h11v2h-11zM290 76h14v14h-14zM323 76h22v8h-22zM384 86h12v7h-12z" />
    <path fill="#3a6a57" d="M295 76h2v14h-2zM333 76h2v8h-2zM384 89h12v1h-12z" />
    <path fill="#315b4e" d="M281 58V35h5v-8h9v-6h35v6h10v8h5v23z" />
    <path fill="#a7d5ad" d="M285 54V36h5v-7h9v-5h27v5h10v7h5v18z" />
    <path fill="#81b998" d="M287 38h52v16h-52z" /><path fill="#d5e8bd" d="M292 30h3v22h-3zM301 25h3v27h-3zM328 30h3v22h-3zM313 24h3v30h-3zM286 36h54v2h-54zM285 46h56v2h-56z" />
    <Shrub x={301} y={51} flowers /><Shrub x={324} y={51} /><path fill="#ad9563" d="M292 54h18v5h-18zM316 54h18v5h-18z" />
    <path fill="#477a61" d="M218 47h39v17h-39z" /><path fill="#acc78b" d="M215 46h46v3h-46z" />
    <Shrub x={224} y={44} flowers /><Shrub x={248} y={44} flowers /><Shrub x={371} y={65} /><Shrub x={404} y={66} flowers /><Shrub x={422} y={67} />
    <path fill="#b9b580" d="M350 35h3v22h-3zM347 56h11v3h-11z" /><path fill="#f1d68f" d="M342 35v-3h4v-3h12v3h5v3z" />
    <path fill="#42614f" d="M365 58h3v14h-3zM380 54h3v18h-3zM365 60h17v2h-17z" /><path fill="#92c992" d="M363 52h7v7h-7zM378 48h7v7h-7z" />
    <g transform="translate(263 57)"><path fill="#eed7a2" d="M-4-7h8v3h-8zM-2-10h4v3h-4zM-2-4h4v4h-4z" /><path fill="#417b7a" d="M-3 0h6v6h-6z" /><path fill="#263f38" d="M-3 6h2v3h-2zM1 6h2v3H1z" /><g transform="translate(3 1)"><g className="pb-gardener-arm"><path fill="#417b7a" d="M0 0h4v2H0z" /><path fill="#a7c7b1" d="M3 0h6v5H3zM9 1h3v2H9z" /><path fill="#e5edcb" d="M4 0h4v1H4zM7-2h2v2H7z" /><path className="pb-drip" fill="#dfedc5" d="M13 3h1v3h-1zM14 7h1v3h-1z" /></g></g></g>
    <path fill="#447654" d="M206 70h3v17h4v9h-6V84h-3V73h-5v-3zM354 62h4v10h-3v12h-4v12h-3V82h3V69h-3v-6zM424 76h3v9h4v11h-6V84h-4v-5z" />
    <g fill="#89bd70"><path d="M202 78h4v3h-4zM210 86h5v3h-5zM348 74h4v3h-4zM355 80h4v3h-4zM345 90h5v3h-5zM428 87h5v3h-5z" /></g>
    {[31, 70, 114, 154, 468, 500, 548, 590, 628].map((x, i) => <g key={x}><path fill="#9c996a" d={`M${x - 10} 75h20v5h-20z`} /><Shrub x={x} y={73} flowers={i % 2 === 0} /></g>)}
    <path fill="#d6dbc0" d="M390 71h8v2h-8zM392 66h4v5h-4zM394 64h4v3h-4zM399 65h2v1h-2z" />
    <path fill="#ebd4a0" d="M110 69h9v5h-9zM111 66h2v3h-2zM116 66h2v3h-2zM119 70h5v-4h2v6h-7z" />
    <path fill="#acc491" opacity=".52" d="M211 74h18v1h-18zM238 74h26v1h-26zM209 92h15v1h-15zM233 89h7v1h-7zM247 94h18v1h-18zM280 67h22v1h-22zM319 68h13v1h-13zM341 70h15v1h-15zM309 88h15v1h-15zM330 91h21v1h-21zM374 79h18v1h-18zM406 81h20v1h-20zM400 92h10v1h-10z" />
    <path fill="#426f5c" d="M213 76h5v1h-5zM258 88h9v1h-9zM278 91h8v1h-8zM312 72h7v1h-7zM338 88h14v1h-14zM385 80h12v1h-12zM419 93h11v1h-11z" />
    <path fill="#abb79c" d="M273 66h2v21h-2zM271 85h4v2h-4zM362 76h2v20h-2zM279 64h77v1h-77z" /><path fill="#e6ddb2" d="M280 70h5v1h-5zM304 70h9v1h-9zM338 66h7v1h-7z" />
    <path fill="#d3ead0" opacity=".7" d="M296 31h3v1h-3zM305 28h6v1h-6zM318 30h3v1h-3zM319 31h1v4h-1zM331 40h6v1h-6zM286 40h3v3h-3z" />
    <path fill="#729579" d="M254 26h3v19h-3z" /><path fill="#d9dfb2" d="M255 28h1v15h-1z" />
    <g transform="translate(255 25)"><g className="pb-rotor"><path fill="#e4e9bc" d="M-1-2v-12h3v10H1v3h12v3H3V1H0v11h-3V3h2V0h-11v-3h9v1z" /><path fill="#9ab599" d="M-1-1h3v3h-3z" /></g></g>
    <g transform="translate(314 15)"><g className="pb-butterfly"><path fill="#557153" d="M0 0h2v5H0zM-1-1h1v2h-1zM2-1h1v2h-1z" /><g className="pb-wing" style={{ animationDuration: "1.2s" }}><path fill="#f5ce91" d="M-5 0h4v4h-2v2h-2zM3 0h4v6H5V4H3z" /><path fill="#fff0be" d="M-4 1h2v2h-2zM4 1h2v2h-2z" /></g></g></g>
    <path fill="#b3d5a1" d="M307 56h2v2h-2zM332 53h3v2h-3zM341 58h2v1h-2zM286 60h13v1h-13z" />
    <g transform="translate(353 39)"><path className="pb-sway" fill="#d6dbaa" d="M0 0h8v1H5v2H0z" /></g>
    <path fill="#6a8f69" d="M374 56h6v7h-6zM378 53h1v3h-1z" /><path fill="#c1d8a7" d="M375 57h4v1h-4z" />
    <path fill="#e9c580" d="M296 89h4v1h-4zM293 92h10v1h-10zM323 87h18v1h-18z" />
    <path fill="#97c99e" d="M291 42h1v3h-1zM308 39h2v6h-2zM328 38h1v6h-1zM303 50h3v1h-3zM320 48h3v1h-3z" /><path fill="#efd0ac" d="M299 47h2v2h-2zM304 50h2v2h-2zM321 46h2v2h-2zM327 50h2v2h-2z" />
    <Fireflies p={p} />
  </>;
}

function BioLab() {
  const p = BANNER_PALETTES.biolabor;
  return <><Sky p={p} stars={false} />
    <path fill="#21443f" d="M0 16h640v3H0zM0 65h640v3H0zM0 79h640v17H0z" />
    <g fill="#183734">{[15, 78, 145, 211, 427, 488, 555, 620].map(x => <path key={x} d={`M${x} 0h6v80h-6zM${x - 12} 23h30v35h-30z`} />)}</g>
    <g fill="#70b688" opacity=".22">{[20, 84, 151, 432, 494, 561, 625].map(x => <path key={x} d={`M${x} 24h19v31h-19zM${x + 3} 27h2v24h-2z`} />)}</g>
    <path fill="#507c68" d="M0 12h254v4H0zM388 12h252v4H388zM12 0h4v80h-4zM619 0h4v80h-4zM0 81h640v2H0z" />
    <path fill="#132e30" d="M239 10h160v71H239z" /><path fill="#315b4e" d="M242 13h154v3H242zM245 16h3v63h-3zM389 16h3v63h-3z" />
    <path fill="#486f59" d="M275 22h80v4h5v41h-5v7h-80v-7h-5V26h5z" />
    <path fill="#76b782" d="M278 27h74v38h-74z" /><path fill="#508e6c" d="M280 42h70v21h-70z" />
    <path fill="#b8e8a4" opacity=".38" d="M281 28h66v3h-66zM281 32h4v27h-4zM346 32h2v24h-2z" />
    <path fill="#afbd8e" d="M277 19h76v7h-76zM278 67h74v7h-74z" /><path fill="#253d35" d="M284 21h13v2h-13zM303 21h26v2h-26zM337 21h10v2h-10zM284 69h14v2h-14zM333 69h13v2h-13z" />
    <g transform="translate(316 45)"><g className="pb-specimen"><path fill="#335d49" d="M-11-8h5v-4h13v4h5v10H8v7H3v4H0V9h-4v4h-3V7h-4z" /><path fill="#c0e697" d="M-9-8h4v-2H6v2h4v8H6v5H-5V0h-4z" /><path fill="#315447" d="M-6-6h4v5h-4zM4-6h4v5H4z" /><path fill="#e9ffc4" d="M-5-6h1v2h-1zM5-6h1v2H5z" /><path fill="#74b479" d="M-1 1h3v2h-3zM-4 5h3v4h-3zM3 5h3v4H3z" /><path fill="#d7efa7" d="M-12 1h3v2h-3zM10 1h3v2h-3z" /></g></g>
    {[289, 338, 296].map((x, i) => <g key={x} transform={`translate(${x} 56)`}><g className="pb-bubbles" style={{ animationDuration: "4.8s", animationDelay: `${-i * 1.6}s` }} fill="none" stroke="#e2ffc4"><path d="M0 0h3v3H0zM4-9h2v2H4z" /></g></g>)}
    <path fill="#19372f" d="M230 54h38v25h-38zM363 51h42v27h-42z" /><path fill="#74967a" d="M228 53h42v3h-42zM361 50h47v3h-47z" />
    <path fill="#8ec590" d="M237 35h21v14h-21z" /><path fill="#264a3e" d="M240 38h15v8h-15z" /><path className="pb-beacon" style={{ animationDuration: "3.8s" }} fill="#d1eeb0" d="M242 40h5v2h-5zM242 43h10v1h-10z" />
    <path fill="#455e4e" d="M245 49h4v4h-4z" /><path fill="#b2d79a" d="M370 36h8v13h-8zM373 30h2v6h-2zM388 40h10v9h-10zM391 35h4v5h-4z" />
    <path fill="#dae9b6" d="M371 37h1v10h-1zM389 42h1v6h-1zM232 58h3v2h-3zM240 58h3v2h-3zM249 58h3v2h-3zM365 56h5v2h-5z" />
    <path fill="#adc19f" d="M257 63h6v6h-6zM255 69h10v12h-10zM254 81h3v5h-3zM262 81h3v5h-3zM251 72h4v3h-4z" /><path fill="#355750" d="M258 65h5v2h-5zM258 72h3v4h-3z" />
    <path fill="#617b5b" d="M0 73h210v5H0zM425 73h215v5H425z" />
    {[38, 92, 154, 201, 444, 489, 546, 596].map((x, i) => <g key={x}>
      <path fill="#678771" d={`M${x - 8} 66h16v7h-16z`} /><Shrub x={x} y={64} dark flowers={i % 3 === 0} />
      <path fill="#477c5c" d={`M${x} 60v-17h3v17zM${x} 49h-9v-4h6v2h3zM${x + 3} 53h8v-5h-4v3h-4z`} />
      <path fill="#a5da90" d={`M${x - 9} 43h5v3h-5zM${x + 7} 46h5v3h-5z`} />
    </g>)}
    <path fill="#88b47d" d="M125 11h3v11h-3zM123 22h3v8h-3zM119 29h6v3h-6zM493 13h3v9h-3zM496 20h4v14h-4zM500 31h5v3h-5z" />
    <path fill="#95bb96" d="M377 79h11v9h-11zM380 76h5v3h-5zM375 83h2v3h-2zM388 83h2v3h-2z" /><path fill="#233c37" d="M379 82h2v2h-2zM384 82h2v2h-2z" /><path fill="#cee8aa" className="pb-twinkle" d="M381 85h4v1h-4z" />
    <path fill="#507365" d="M248 22h17v2h-17zM263 22h2v8h-2zM255 28h10v2h-10zM255 28h2v15h-2zM365 17h16v2h-16zM379 17h2v15h-2zM376 30h8v3h-8zM381 33h2v9h-2z" />
    <path fill="#bdd4a4" d="M249 22h13v1h-13zM379 19h1v9h-1zM375 31h10v1h-10z" />
    <path fill="#1e4139" d="M235 63h28v1h-28zM235 68h14v1h-14zM235 73h14v1h-14zM371 63h27v1h-27zM371 68h27v1h-27zM371 73h27v1h-27z" />
    <path fill="#86ad87" d="M237 61h2v1h-2zM250 61h2v1h-2zM365 61h2v1h-2zM392 58h4v1h-4zM386 58h3v1h-3zM278 21h2v2h-2zM350 21h2v2h-2zM278 69h2v2h-2zM350 69h2v2h-2z" />
    <path fill="#d6ecc0" opacity=".4" d="M286 33h2v8h-2zM286 45h2v9h-2zM289 31h12v1h-12zM334 30h8v1h-8zM343 32h1v5h-1zM331 60h12v1h-12z" />
    <g fill="#d4fab8" className="pb-beacon" style={{ animationDuration: "6.2s", animationDelay: "-2s" }}><path opacity=".1" d="M269 18h91v57h-91z" /><path d="M280 23h2v2h-2zM349 23h2v2h-2zM280 68h2v2h-2zM349 68h2v2h-2z" /></g>
    <g transform="translate(375 43)"><g className="pb-bubbles" style={{ animationDuration: "3.5s", animationDelay: "-1s" }} fill="#e0edb9"><path d="M0 0h1v1H0zM-2 4h1v1h-1z" /></g></g>
    <path fill="#aec990" opacity=".14" d="M277 75h76v4h-76zM278 80h75v2h-75zM287 84h62v1h-62zM297 87h47v1h-47z" />
    <path fill="#47765c" d="M276 59h2v4h-2zM280 61h4v2h-4zM290 61h8v2h-8zM337 62h7v1h-7zM349 54h1v7h-1z" />
    <path fill="#789b78" d="M359 13h5v2h-5zM254 15h6v1h-6zM246 17h2v2h-2zM389 74h2v2h-2zM302 76h4v1h-4zM323 76h4v1h-4z" />
    <path fill="#94ada3" d="M367 19h24v3h-24zM370 21h2v10h-2z" />
    <g transform="translate(383 23)"><g className="pb-lab-claw"><path fill="#a8c1ac" d="M-2 0h4v9h-4zM-5 8H5v3H-5zM-5 11h2v6h-2zM3 11h2v6H3z" /><path fill="#e4efc3" d="M-1 1h1v6h-1zM-4 9H4v1H-4z" /></g></g>
    <path fill="#8fbba9" d="M296 28h1v3h-1zM307 29h5v1h-5zM318 27h10v1h-10zM334 58h7v1h-7zM284 63h12v1h-12z" />
    <path fill="#305048" d="M0 89h640v1H0zM240 83h2v13h-2zM404 83h2v13h-2z" />
    <path fill="#729783" opacity=".4" d="M261 92h14v1h-14zM281 94h8v1h-8zM359 90h18v1h-18zM386 94h11v1h-11zM215 89h8v1h-8zM420 88h14v1h-14z" />
  </>;
}

function DataStream() {
  const p = BANNER_PALETTES.datenstrom;
  return <><Sky p={p} />
    <path fill="#133444" d="M0 73h640v23H0z" />
    <g fill="none" stroke="#285062" strokeWidth="1" opacity=".6">{Array.from({ length: 13 }, (_, i) => <path key={i} d={`M${i * 56} 96l${(320 - i * 56) * .4} -28V${8 + i % 4 * 8}h${i % 2 ? 12 : -12}V0`} />)}<path d="M0 79h640M0 88h640M0 94h640" /></g>
    <g fill="#173b4a">{[16, 72, 128, 186, 423, 481, 537, 598].map((x, i) => <path key={x} d={`M${x} ${20 + i % 3 * 13}h24v${61 - i % 3 * 13}h-24zM${x + 5} ${14 + i % 3 * 13}h14v6h-14z`} />)}</g>
    <g fill="#609c98" opacity=".55">{Array.from({ length: 40 }, (_, i) => <path key={i} d={`M${i * 17 + 3} ${12 + i * 11 % 55}h2v3h-2zM${i * 17 + 6} ${17 + i * 11 % 55}h2v1h-2z`} />)}</g>
    <path fill="#1b4b57" d="M240 70h153v9H240zM255 62h125v8H255zM274 52h88v10h-88z" />
    <path fill="#70b6af" d="M240 70h153v2H240zM255 62h125v2H255zM274 52h88v2h-88z" />
    <path fill="#102f3b" d="M280 12h12v42h-12zM346 12h12v42h-12zM290 7h58v9h-58z" />
    <path fill="#357582" d="M282 14h7v38h-7zM348 14h7v38h-7zM293 9h52v5h-52z" />
    <path fill="#82d7c5" d="M282 14h2v38h-2zM348 14h2v38h-2zM293 9h52v1h-52z" />
    <path fill="#317782" opacity=".3" d="M294 16h51v35h-51z" />
    <g transform="translate(319 34)"><g className="pb-rotor" style={{ animationDuration: "12s" }}><path fill="none" stroke="#98ead3" opacity=".58" d="M-20-7h5v-5h30v5h5V7h-5v5h-30V7h-5z" /><path fill="#d6ffe1" d="M-22-3h4v5h-4zM18 3h4v4h-4zM-3-14h5v4h-5z" /></g></g>
    <g transform="translate(319 34)"><g className="pb-specimen" style={{ animationDuration: "6.4s" }}>
      <path fill="#5fc6b1" d="M0-15h4v4h6v4h6V7h-6v4H4v4H0v-4h-6V7h-6V-7h6v-4H0z" />
      <path fill="#b8f6d0" d="M0-12h3v3h6v4h-3v3H0v-3h-6v-2h6zM-10-4h3v10h-3z" />
      <path fill="#2d7883" d="M3 0h9v6H6v4H3zM-5 0H0v10h-5V6h-3V2h3z" />
      <path fill="#153c4b" d="M0-4h3v5H0zM-7-5h4v1h-4z" />
    </g></g>
    <path fill="#234955" d="M217 36h14v29h-14zM400 34h13v32h-13zM221 31h6v5h-6zM403 28h7v6h-7z" />
    <path fill="#81d1c0" d="M219 38h2v24h-2zM403 36h2v25h-2zM223 32h2v2h-2zM405 29h2v3h-2z" />
    <path fill="none" stroke="#68c4b8" opacity=".55" d="M223 51h35v-8h23M355 42h29v9h21M225 66v14h46v7h48v-9M407 67v13h-45v7h-43" />
    {[0, 1].map(i => <g key={i} transform={i ? "translate(379 42) rotate(180)" : "translate(260 43)"}><g className="pb-packet" style={{ animationDelay: `${-i * 1.4}s` }}><path fill="#d8ffe0" d="M-2-1h5v3h-5z" /><path fill="#8ae4d0" opacity=".28" d="M-6-2h10v5H-6z" /></g></g>)}
    <g transform="translate(321 64)"><g className="pb-packet" style={{ animationDuration: "3.7s", animationDelay: "-2s" }} fill="#ddffe2"><path d="M0 0h5v2H0zM-8 0h2v2h-2z" /></g></g>
    <g className="pb-data" fill="#c4ffdc"><path d="M249 49h5v3h-5zM378 49h5v3h-5zM272 85h6v3h-6zM91 53h2v5h-2zM487 29h2v5h-2zM530 63h2v4h-2zM162 16h2v4h-2z" /></g>
    <g transform="translate(356 80)"><g className="pb-float"><path fill="#7cccc2" d="M-9-4h11v2h5v2h-5v2H-9V0h-4v-4h4zM7-1h3v-3h2v7h-2V1H7z" /><path fill="#d3fbd7" d="M-8-3h7v2h-7z" /><path fill="#193f4c" d="M-8-1h1v1h-1z" /></g></g>
    <path fill="#52878a" d="M296 71h8v8h-8zM295 78h10v7h-10zM294 85h4v3h-4zM302 85h4v3h-4z" /><path fill="#b7f3c9" d="M298 73h2v2h-2zM302 73h1v2h-1zM298 80h4v2h-4z" />
    <g fill="#356571">{[51, 155, 461, 572].map(x => <g key={x}><path d={`M${x} 61h27v22h-27z`} /><path fill="#0f2a37" d={`M${x + 3} 64h21v16h-21z`} /><path fill="#80c5b4" d={`M${x + 5} 67h3v2h-3zM${x + 10} 67h10v1h-10zM${x + 5} 72h14v1h-14zM${x + 5} 76h9v1h-9z`} /></g>)}</g>
    <path fill="#6ba9a3" d="M257 65h2v3h-2zM375 65h2v3h-2zM242 73h3v3h-3zM386 73h3v3h-3zM274 65h11v1h-11zM348 65h18v1h-18zM260 73h20v1h-20zM365 73h17v1h-17z" />
    <path fill="#245b68" d="M285 18h2v5h-2zM285 28h2v8h-2zM351 18h2v5h-2zM351 28h2v8h-2zM300 11h7v1h-7zM327 11h10v1h-10z" />
    <path fill="#bcf7cd" opacity=".14" d="M293 53h54v4h-54zM290 57h60v3h-60zM286 60h66v1h-66zM292 66h54v2h-54zM302 72h43v1h-43z" />
    <path className="pb-beacon" fill="#a9f4d1" style={{ animationDuration: "5.2s" }} d="M282 15h2v35h-2zM349 15h2v35h-2zM302 54h8v1h-8zM327 54h8v1h-8z" />
    <path fill="#9cdccc" d="M293 12h1v3h-1zM343 12h1v3h-1zM275 58h9v1h-9zM351 58h9v1h-9zM260 69h3v1h-3zM373 69h3v1h-3z" />
    <g transform="translate(319 59) scale(1 .2)"><g className="pb-ring-ripple" style={{ animationDuration: "4.8s" }} fill="none" stroke="#c1f2d8" strokeWidth="2"><path d="M-29-6h10v-6h39v6h10V6H20v6h-39V6h-10z" /></g></g>
    <path fill="#a1b9ca" opacity=".7" d="M292 17h2v5h-2zM345 17h2v5h-2zM305 56h8v1h-8zM325 56h9v1h-9zM273 67h8v1h-8zM356 67h8v1h-8z" />
    <path fill="#73ccbe" opacity=".3" className="pb-water" d="M282 91h49v1h-49zM303 94h57v1h-57zM60 89h25v1H60zM466 90h28v1h-28z" />
  </>;
}

function DeepStation() {
  const p = BANNER_PALETTES.tiefseestation;
  return <><Sky p={p} stars={false} />
    <path fill="#387783" opacity=".13" d="M108 0h19L66 82H17zM255 0h23l37 82h-72zM459 0h12l81 82h-63z" />
    <path fill="#173f55" d="M0 79h23V63h13V52h16v14h18v12h22V65h18v-9h15v20h36V65h27v13h26V69h19v16h162V65h17V50h18v18h19v13h45V70h17V55h19v18h24v10h27V60h14V42h14v27h18v15h38v12H0z" />
    <g transform="translate(347 22) scale(1.05)"><g className="pb-cruise"><path fill="#316274" d="M-40-7h15v-4h40v4h16v5h10v7h-9v5H17v4H-6v-4h-17V6h-15V2h-7V-4h5z" /><path fill="#4e8190" d="M-29-8h43v3h15v3h-55v-2h-9v-2h6z" /><path fill="#7ba0a4" d="M-14 7h43v2H17v3H-6V9h-8z" /><path fill="#c5e7ce" d="M27 0h2v2h-2z" /><path fill="#163f54" d="M28 6h10v1H28z" /><path fill="#92b8b6" opacity=".45" d="M-19-6h18v1h-18zM6-5h12v1H6zM20-2h8v1h-8zM-20 3h9v1h-9z" /><g transform="translate(0 11)"><g className="pb-tail" style={{ animationDelay: "-1.2s" }}><path fill="#316274" d="M-1 0h12v10H6V7H1z" /><path fill="#5c929a" d="M2 1h2v5H2z" /></g></g><g transform="translate(-43 0)"><g className="pb-tail"><path fill="#316274" d="M1-2h-8v-7h-7v6h3v5H1z" /><path fill="#578998" d="M-12-8h3v5h-3z" /></g></g></g></g>
    <path fill="#103249" d="M0 85h640v11H0zM254 72h129v8H254zM270 78h6v18h-6zM360 78h6v18h-6z" />
    <path fill="#537a86" d="M258 68h121v6H258zM273 74h3v20h-3zM360 74h3v20h-3z" />
    <path fill="#254f68" d="M276 66V49h5V39h10v-6h51v6h10v10h5v17z" />
    <path fill="#4a98a6" d="M282 61V48h5v-8h10v-4h38v4h10v8h5v13z" />
    <path fill="#78c8c5" d="M289 43h7v-4h36v3h-36v4h-7zM286 49h3v9h-3z" />
    <path fill="#285f74" d="M283 54h65v7h-65z" /><path fill="#b2dcca" d="M315 35h3v27h-3zM282 51h68v2h-68z" /><path fill="#3b7589" d="M297 38h2v23h-2zM334 38h2v23h-2z" />
    <path fill="#789194" d="M274 62h85v8h-85zM302 68h29v10h-29z" /><path fill="#d5e7b5" d="M280 64h7v3h-7zM294 64h7v3h-7zM332 64h7v3h-7zM346 64h7v3h-7z" /><path fill="#173d54" d="M308 69h17v9h-17z" /><path fill="#99cdc4" d="M310 71h5v5h-5zM318 71h5v5h-5z" />
    <path fill="#213f4a" d="M304 53h7v8h-7zM305 49h5v4h-5zM321 54h9v7h-9z" /><path fill="#c1dcb7" d="M323 55h5v2h-5z" />
    <path fill="#426f80" d="M258 50h8v19h-8zM371 49h6v20h-6zM254 48h16v3h-16zM368 47h12v3h-12z" /><path fill="#92e0d7" className="pb-beacon" d="M260 45h4v3h-4zM372 44h4v3h-4z" />
    <g transform="translate(227 58)"><g className="pb-float"><path fill="#d7bf81" d="M-15-5H8v3h6v9H8v3h-23V7h-5v-9h5z" /><path fill="#f1d5a0" d="M-13-4H5v2h-18z" /><path fill="#2a5767" d="M-10-1h8v6h-8zM3-1h6v6H3z" /><path fill="#94ddd1" d="M-8 0h4v3h-4zM4 0h3v3H4z" /><path fill="#577482" d="M-23-3h4v10h-4zM-6-9h3v4h-3zM-6-10h9v2h-9z" /><path fill="#d5e8b6" opacity=".15" d="M14 0h5l25-8v22L19 6h-5z" /></g></g>
    <g className="pb-bubbles" fill="none" stroke="#9fd4ce" opacity=".65"><path d="M241 41h3v3h-3zM247 29h2v2h-2zM267 18h3v3h-3zM382 50h2v2h-2zM377 30h3v3h-3zM481 47h3v3h-3zM99 66h2v2h-2z" /></g>
    {[35, 91, 160, 203, 406, 450, 516, 579, 621].map((x, i) => <g key={x} transform={`translate(${x} ${87 + i % 3 * 2})`}><path fill={i % 2 ? "#36818b" : "#a078a0"} d="M0 0v-17h3v8h5v-13h3v17H4V0zM0-8h-7v-9h3v6h4z" /><path fill={i % 2 ? "#69b5ad" : "#d49ab1"} d="M8-22h3v3H8zM-7-17h3v3h-3zM0-17h3v3H0z" /></g>)}
    <path fill="#d3b99c" d="M389 88h5v-4h3v4h5v2h-4v4h-3v-4h-6zM132 89h8v3h-8z" />
    <path fill="#7db2ae" d="M336 85h7v2h3v4h-3v-2h-2v4h-2v-4h-2v2h-3v-4h2z" /><path fill="#163c4b" d="M338 86h1v1h-1zM342 86h1v1h-1z" />
    <path fill="#b1d3c5" opacity=".55" d="M274 72h2v1h-2zM361 72h2v1h-2zM278 63h1v1h-1zM355 63h1v1h-1zM308 36h4v1h-4zM339 43h3v1h-3zM288 47h1v2h-1z" />
    <path fill="#456f7e" d="M280 78h2v5h-2zM356 78h2v5h-2zM286 85h22v2h-22zM304 79h2v8h-2zM308 84h6v3h-6z" />
    <path fill="#8fc0b0" opacity=".28" d="M302 80h29v2h-29zM300 84h37v1h-37zM294 88h47v1h-47zM314 93h22v1h-22z" />
    <path fill="#58858d" d="M249 89h6v1h-6zM274 94h9v1h-9zM348 92h6v1h-6zM367 87h5v1h-5zM407 94h8v1h-8zM287 91h4v1h-4z" />
    {[0, 1, 2].map(i => <g key={i} transform={`translate(${268 + i * 15} ${23 + i % 2 * 7})`}><g className="pb-cruise" style={{ animationDuration: "5.8s", animationDelay: `${-i * .7}s` }}><path fill={i % 2 ? "#d0b795" : "#93d4ce"} d="M-5-2h8v1h3v2H3v1h-8V1h-3v-3h3z" /><path fill="#214b61" d="M2-1h1v1H2z" /></g></g>)}
    <g transform="translate(365 72)"><g className="pb-cruise" style={{ animationDuration: "6.4s", animationDelay: "-3s" }}><path fill="#cdaac0" d="M-5-2h7v1h3v2H2v1h-7V0h-3v-2h3z" /><path fill="#dce9cf" d="M-3-2h4v1h-4z" /><path fill="#264b5e" d="M1-1h1v1H1z" /></g></g>
    <g className="pb-beacon" style={{ animationDuration: "5.8s" }} fill="#c8ffe1"><path opacity=".13" d="M255 41h14v13h-14zM367 40h14v13h-14z" /><path d="M260 45h4v3h-4zM372 44h4v3h-4z" /></g>
    <path fill="#79aba9" opacity=".45" d="M293 39h12v1h-12zM300 43h7v1h-7zM325 46h10v1h-10zM331 59h8v1h-8zM294 55h6v1h-6z" />
    <path fill="#8dc3bb" opacity=".45" d="M289 47h6v1h-6zM309 39h4v1h-4zM320 42h12v1h-12zM337 48h8v1h-8zM280 69h17v1h-17zM333 69h18v1h-18z" />
    <g fill="#91cfd1" opacity=".7"><path d="M104 28h8v2h-8zM113 26h2v6h-2zM433 38h9v2h-9zM442 36h2v6h-2zM486 19h6v2h-6zM492 17h2v6h-2zM149 44h6v2h-6zM155 42h2v6h-2z" /></g>
  </>;
}

function SolarGrid() {
  const p = BANNER_PALETTES.sonnenraster;
  return <><Sky p={p} />
    <path fill="#bf607d" opacity=".16" d="M276 8h88v46h-88z" />
    <path fill="#f6b18e" d="M304 4h32v3h10v5h6v6h4v24h-5v6h-8v4h-46v-4h-8v-6h-5V18h4v-6h6V7h10z" />
    <path fill="#e5818e" d="M284 26h72v3h-72zM284 34h72v4h-72zM286 43h68v4h-68zM293 50h54v3h-54z" />
    <path fill="#64345f" d="M0 59h22v-7h16v-8h13v-8h9v8h14v8h22v8h20V50h18V40h12V28h10v10h12v9h17v9h17v7h27v-7h18v-7h10v9h22v8h65v-8h19V48h12V36h9v11h15v10h27v-6h19V38h11V27h9v13h10v12h21v10h33v-8h20V41h13V31h8v12h14v10h21v9h26V48h14V37h11v12h13v11h22v36H0z" />
    <path fill="#271d3e" d="M0 65h640v31H0z" />
    <g fill="none" stroke="#b85b92" opacity=".52" strokeWidth="1">{[0, 64, 128, 192, 256, 384, 448, 512, 576, 640].map(x => <path key={x} d={`M${305 + x * .047} 65L${x} 96`} />)}<path d="M0 70h640M0 76h640M0 84h640M0 95h640" /></g>
    <path fill="#422343" d="M312 64h16l50 32H261z" /><path fill="#ee9cbd" d="M312 65h2l-44 31h-3zM326 65h2l48 31h-3z" />
    <g className="pb-grid" fill="#efadd0"><path d="M319 67h2v3h-2zM318 74h4v4h-4zM317 84h6v6h-6z" /></g>
    {[0, 1, 2].map(i => <g key={i} transform="translate(320 65)"><g className="pb-road" style={{ animationDelay: `${-i * .57}s` }} fill="#e295c1"><path d="M-38 5h13v1h-13zM25 5h13v1H25zM-2 3h4v3h-4z" /></g></g>)}
    {[222, 414, 96, 538].map((x, i) => <g key={x} transform={`translate(${x} ${i < 2 ? 35 : 43})`}><path fill="#221b37" d="M-2 2h4v12H0v17h-2v16h-4V28h2V13h2zM-1 0h4v-5h11v3h7v4h5v7h-4V5h-7V2H5v3h8v4h6v10h-4v-7H9V8H2V5h-7V2h-10v4h-7v6h-4V4h5V0h9v-4h8v2z" /><path fill="#8b517b" d="M1-3h12v2H1zM-17 1h8v2h-8zM0 11h1v13H0z" /></g>)}
    <g transform="translate(319 80)"><g className="pb-drive"><path fill="#211b36" d="M-25-5h4v-6h7v-5h27v5h7v6h5v12h-50z" /><path fill="#b35284" d="M-21-4h42v8h-42zM-15-10h30v6h-30z" /><path fill="#77629c" d="M-12-13h24v8h-24z" /><path fill="#aab3d1" d="M-10-12h20v2h-20z" /><path fill="#ef9fc1" d="M-20-3h40v2h-40zM-23 1h12v3h-12zM11 1h12v3H11z" /><path fill="#ffcfa4" d="M-21 1h8v2h-8zM13 1h8v2h-8z" /><path fill="#1c1d33" d="M-8 1H8v3H-8zM-21 7h8v3h-8zM13 7h8v3h-8z" /><path fill="#d87ea8" d="M-8 5H8v1H-8z" /><path fill="#987aaa" d="M-11-7h21v1h-21zM21-1h2v2h-2zM-23-1h2v2h-2zM-17 7h8v1h-8zM10 7h8v1h-8z" /><g className="pb-beacon" style={{ animationDuration: "4.2s" }} fill="#ffc2c7"><path d="M-20 1h7v2h-7zM14 1h7v2h-7z" /><path opacity=".14" d="M-24 4h15v4h-15zM10 4h15v4H10z" /></g></g></g>
    <path fill="#201d38" d="M367 53h3v32h-3zM362 44h29v18h-29z" /><path fill="#ca6eaf" d="M364 46h25v14h-25z" /><path fill="#f9c9bf" d="M367 49h3v8h-3zM372 49h4v2h-4zM372 53h4v4h-2v-2h-2zM379 49h7v2h-7zM381 51h3v6h-3z" />
    <path fill="#7188a6" d="M382 75h8v8h-8zM381 83h10v5h-10zM381 88h3v3h-3zM388 88h3v3h-3z" /><path fill="#e9acbc" d="M384 77h2v2h-2zM388 77h1v2h-1z" />
    <path fill="#eb9dc2" className="pb-twinkle" d="M171 20h2v2h2v2h-2v2h-2v-2h-2v-2h2zM432 10h2v2h2v2h-2v2h-2v-2h-2v-2h2z" />
    <path fill="#ffbaae" opacity=".14" d="M287 84h21v2h-21zM330 84h21v2h-21zM281 89h25v1h-25zM334 89h25v1h-25zM279 91h25v1h-25zM336 91h25v1h-25z" />

    <g className="pb-beacon" style={{ animationDuration: "4.6s" }} fill="#f3b9d3"><path d="M365 46h2v14h-2zM387 46h2v14h-2z" /><path opacity=".12" d="M360 43h33v20h-33z" /></g>
    <path fill="#c78cab" opacity=".28" d="M286 58h7v1h-7zM343 58h9v1h-9zM301 55h38v1h-38zM278 62h19v1h-19zM342 61h18v1h-18z" />
    <g transform="translate(259 32)"><g className="pb-cruise" style={{ animationDuration: "13s", animationDelay: "-4s" }}><path fill="#7f6d94" d="M-8 0H8v3H-8zM-3-3h6v3h-6z" /><path fill="#ecc0ca" d="M-5 3H5v1H-5zM-2-2h3v1h-3z" /></g></g>
    <path className="pb-water" fill="#e176a5" opacity=".42" d="M293 93h52v1h-52zM282 95h70v1h-70z" />
  </>;
}

function PastelPalms() {
  const p = BANNER_PALETTES.pastellpalmen;
  return <><Sky p={p} stars={false} /><Moon p={p} x={297} y={6} sun /><Clouds p={p} />
    <path fill="#a095bc" d="M0 41h640v36H0z" /><path fill="#81b6bd" d="M0 49h640v27H0z" />
    <g fill="#d2e0d3" opacity=".55" className="pb-water"><path d="M0 52h83v1H0zM113 54h65v1h-65zM210 51h54v1h-54zM290 55h65v1h-65zM391 52h76v1h-76zM501 55h139v1H501zM30 61h80v1H30zM456 64h76v1h-76z" /></g>
    <path fill="#dec0bd" d="M0 76h640v20H0zM192 65h254v31H192z" /><path fill="#f1d6cc" d="M202 62h232v4H202zM0 75h192v2H0zM448 75h192v2H448z" />
    <path fill="#b28ba8" d="M253 69h135v3h9v18H244V72h9z" /><path fill="#83c9c8" d="M255 72h132v3h6v12H248V75h7z" /><path fill="#a9e3da" d="M258 74h126v2H258zM251 78h3v6h-3z" />
    <g fill="#d4f0e1" className="pb-water" opacity=".7"><path d="M267 81h22v1h-22zM300 78h28v1h-28zM329 85h36v1h-36zM364 79h15v1h-15z" /></g>
    {[0, 1, 2].map(i => <g key={i} transform={`translate(${i === 2 ? 378 : 307} ${i === 2 ? 81 : 80}) scale(${i === 2 ? .6 : 1} 1)`}><g className="pb-ring-ripple" style={{ animationDelay: `${-i * 1.15}s` }} fill="none" stroke="#e7f6df"><path d="M-14-1h5v-1H9v1h5v2H9v1H-9V1h-5z" /></g></g>)}
    <path fill="#a995ba" d="M229 27h8v38h-8zM222 24h22v5h-22zM222 64h22v4h-22zM398 27h8v38h-8zM391 24h22v5h-22zM391 64h22v4h-22zM223 19h189v6H223z" /><path fill="#f0ddd5" d="M224 20h188v2H224zM230 30h2v31h-2zM399 30h2v31h-2z" />
    <path fill="#c1b2c7" d="M242 20h5v17h-5zM390 20h5v17h-5z" /><path fill="#efcfcd" d="M243 21h2v13h-2zM391 21h2v13h-2z" />
    <g transform="translate(212 30)"><g className="pb-sway"><path fill="#596283" d="M0 0h5v12H2v13H0v23h-5V24h2V12h3zM0 0h4v-5h11v2h8v5h5v8h-4V5h-7V2H7v3h9v4h6v11h-4v-7h-6V9H3V5h-7V2h-12v4h-7v8h-5V5h5V0h9v-4h9v2z" /><path fill="#88b6ae" d="M2-3h13v2H2zM-19 1h11v2h-11zM7 5h8v2H7zM-1 14h2v15h-2z" /></g></g>
    <g transform="translate(433 37)"><g className="pb-sway"><path fill="#596283" d="M0 0h4v12H2v17h-2v15h-5V24h2V10h3zM0 0v-5h10v2h9v4h5v8h-4V4h-7V1H4v4h8v5h5v10h-4v-8H8V8H1V4h-8V2h-9v4h-6v8h-4V5h5V0h9v-3h9v2z" /><path fill="#a0c4b6" d="M2-3h8v2H2zM-17 1h9v2h-9zM1 12h1v15H1z" /></g></g>
    <path fill="#dbb799" d="M349 57h3v12h-3z" /><path fill="#e7acba" d="M336 57v-3h4v-4h7v-3h7v3h7v4h4v3z" /><path fill="#f2d5ca" d="M342 54h5v-4h4v7h-9zM355 51h3v3h4v3h-7z" />
    <path fill="#a486a2" d="M355 63h20v3h-20zM358 66h2v4h-2zM371 66h2v4h-2zM357 58h3v6h-3z" /><path fill="#f1d8c7" d="M357 60h15v2h-15z" />
    <g transform="translate(307 77)"><g className="pb-pool-float"><path fill="#f3a4b7" d="M-8-2h12v2h4v3H4v2H-8V3h-3V0h3zM4-2v-8h2v-4h6v2H8v2H7v8z" /><path fill="#ffe0d4" d="M-6-1h8v1h-8zM8-13h3v1H8z" /><path fill="#75567b" d="M10-11h4v2h-4zM9-13h1v1H9zM-4 1h5v1h-5z" /></g></g>
    <g transform="translate(345 80)"><g className="pb-cruise" style={{ animationDuration: "11s", animationDelay: "-2.5s" }}><path fill="#e6b7a7" d="M-2-6h5v5h-5zM-4-1H5v3H-4z" /><path fill="#719bb5" d="M-2-7h5v2h-5z" /><path fill="#75567b" d="M1-4h2v1H1z" /><g transform="translate(-4 0)"><g className="pb-tail"><path fill="#e6b7a7" d="M-7-3h3v2H0v2h-5v-2h-2z" /></g></g><g transform="translate(5 0)"><g className="pb-tail" style={{ animationDelay: "-1.2s" }}><path fill="#e6b7a7" d="M0-1h4v-2h3v2H5v2H0z" /></g></g><path fill="#d6f0dd" d="M-12 3h7v1h-7zM6 3h8v1H6z" /></g></g>
    <path fill="#f4dacc" d="M270 59h13v2h-13zM272 53h9v6h-9zM272 51h2v3h-2zM279 51h2v3h-2zM281 54h4v4h-4z" /><path fill="#8c7899" d="M275 55h1v1h-1zM279 55h1v1h-1z" />
    <path fill="#f5dfcc" d="M166 44h20v2h-20zM174 30h2v14h-2zM176 31h2v2h2v3h3v4h-7z" /><path fill="#7b819f" d="M165 46h23v2h-4v2h-14v-2h-5z" />
    {[43, 104, 154, 485, 539, 603].map((x, i) => <g key={x}><path fill="#b292ad" d={`M${x - 8} 77h17v7h-17z`} /><Shrub x={x} y={75} flowers={i % 2 === 0} /></g>)}
    <path fill="#b39ab1" opacity=".6" d="M216 67h20v1h-20zM215 68h14v1h-14zM390 67h20v1h-20zM392 68h18v1h-18zM337 69h39v1h-39zM343 70h22v1h-22z" />
    <path fill="#f4e3d8" d="M253 69h15v1h-15zM272 69h11v1h-11zM355 69h15v1h-15zM376 69h12v1h-12zM245 77h2v8h-2zM396 77h1v8h-1zM263 90h12v1h-12zM280 90h10v1h-10zM360 90h16v1h-16z" />
    <path fill="#b893a5" d="M270 72h1v2h-1zM284 70h1v2h-1zM371 72h1v2h-1zM253 87h1v2h-1zM384 87h1v2h-1z" />
    <path fill="#d9ded3" opacity=".65" d="M252 37h2v7h-2zM255 34h6v2h-6zM372 43h8v1h-8zM281 54h7v1h-7zM321 52h13v1h-13z" />
    <path fill="#b798ac" d="M376 63h5v9h-5zM372 62h13v3h-13z" /><path fill="#f5e1d4" d="M373 62h10v1h-10zM377 65h1v6h-1z" />
    {[0, 1].map(i => <g key={i} transform="translate(378 71)"><g className="pb-drip" style={{ animationDuration: "1.4s", animationDelay: `${-i * .7}s` }} fill="#edf9e1"><path d="M0 0h2v4H0zM-2 4h1v2h-1zM2 5h1v2H2z" /></g></g>)}
    {[248, 387].map((x, i) => <g key={x} transform={`translate(${x} 34)`}><path fill="#b295a6" d="M-5-2H5v5H-5z" /><g className="pb-sway" style={{ animationDelay: `${-i * 2}s` }}><path fill="#7aaba2" d="M-4 1h3v7h-2v7h-2V7h1zM1 0h3v5h3v3H3v4H1z" /><path fill="#b6cdb9" d="M-3 4h1v4h-1zM3 6h3v1H3z" /></g></g>)}
    <path fill="#ac94ab" d="M0 89h221v1H0zM416 89h224v1H416zM90 78h1v18h-1zM201 78h1v18h-1zM460 78h1v18h-1zM572 78h1v18h-1z" />
  </>;
}

function RocketPort() {
  const p = BANNER_PALETTES.raketenhafen;
  return <><Sky p={p} /><Clouds p={p} />
    <path fill="#746c7b" d="M0 61h28v-6h26v-6h27v7h34v8h29v-9h26V44h21v-9h12v12h22v11h30v8h121v-9h26v-8h22V38h14v13h26v8h39v-9h25v-7h17v10h34v8h29v-8h25v-9h14v11h22v7h25v34H0z" />
    <path fill="#3b4a5b" d="M0 73h640v23H0z" /><path fill="#636877" d="M0 75h640v2H0zM263 67h109v8H263z" />
    <path fill="#283b4c" d="M360 7h9v64h-9zM355 6h40v4h-40zM388 9h5v61h-5zM338 24h27v4h-27zM340 43h23v4h-23zM355 66h44v7h-44z" />
    <path fill="#ad9491" d="M361 10h3v55h-3zM389 10h2v54h-2zM366 17h23v2h-23zM366 31h23v2h-23zM366 46h23v2h-23zM366 61h23v2h-23z" />
    <path fill="none" stroke="#7e7f86" strokeWidth="2" d="M366 11l22 18-22 15 22 15M366 59l22-13-22-15 22-20" />
    <path fill="#263c4b" d="M284 69h65v6h-65zM292 73h5v16h-5zM336 73h5v16h-5z" /><path fill="#b09588" d="M287 69h58v2h-58z" />
    <path fill="#d8d6c7" d="M311 8h5V3h5v5h5v9h4v39h-24V17h5z" /><path fill="#f2e7cd" d="M312 16h6v35h-6z" /><path fill="#909eab" d="M322 14h4v39h-4zM306 52h24v5h-24z" />
    <path fill="#db8f79" d="M311 13V8h5V3h5v5h5v5zM306 42h24v5h-24z" /><path fill="#52677b" d="M312 24h12v12h-12z" /><path fill="#9bd5d5" d="M314 26h8v8h-8z" /><path fill="#e6f3dd" d="M314 26h8v2h-8zM314 28h2v4h-2z" />
    <path fill="#b16c69" d="M304 42h3v16h-9v-6h3v-6h3zM330 42h3v4h3v6h3v6h-9z" /><path fill="#273c4d" d="M310 56h16v5h-16z" />
    <path fill="#f6af76" className="pb-exhaust" d="M310 61h16v7h-2v8h-3v9h-5v-9h-3v-8h-3z" /><path fill="#ffdf9e" className="pb-twinkle" d="M315 61h6v8h-2v4h-2v-4h-2z" />
    <g className="pb-smoke" fill="#b7aaa4" opacity=".65"><path d="M299 76h14v6h-5v4h-30v-4h-8v-5h11v-4h12v3zM324 76h14v-4h13v4h11v5h-6v6h-26v-4h-6z" /></g>
    <path fill="#607587" d="M206 53h40v20h-40zM212 47h28v6h-28zM214 39h4v8h-4z" /><path fill="#b1b4af" d="M208 54h36v3h-36z" /><path fill="#f0d4a2" d="M211 60h8v5h-8zM223 60h8v5h-8zM235 60h6v5h-6z" /><path fill="#253c4b" d="M210 69h32v3h-32z" />
    <path fill="#84929a" d="M422 63h48v11h-48zM429 57h34v6h-34zM431 52h30v5h-30z" /><path fill="#bbc3bb" d="M432 54h28v2h-28z" /><path fill="#334b5c" d="M430 66h31v8h-31z" /><path fill="#d7bc96" d="M434 68h4v2h-4zM444 68h4v2h-4zM454 68h4v2h-4z" />
    <path fill="#dddbbf" d="M263 69h7v7h-7zM261 76h11v10h-11zM260 79h2v5h-2zM272 77h5v2h-5zM261 86h3v5h-3zM269 86h3v5h-3z" /><path fill="#526e7e" d="M265 71h5v3h-5zM264 79h5v4h-5z" />
    <path fill="#93a6a5" d="M407 81h21v8h-21zM415 76h9v5h-9zM418 71h2v5h-2zM417 70h5v2h-5z" /><path fill="#294253" d="M407 88h5v4h-5zM423 88h5v4h-5z" /><path fill="#e9cc9e" d="M408 82h3v2h-3zM417 78h5v2h-5z" />
    <path fill="#7f818a" d="M89 71V57h5v14h12V53h4v18h14v-9h5v9h25v5H77v-5zM512 71V51h5v20h22V61h4v10h21V55h4v16h27v5h-92v-5z" />
    <path fill="#d1ab88" opacity=".7" d="M0 83h201v1H0zM441 83h199v1H441zM16 92h59v2H16zM152 92h58v2h-58zM470 92h58v2h-58zM597 92h43v2h-43z" />
    <path fill="#efbe87" className="pb-beacon" d="M361 3h4v3h-4zM389 3h3v3h-3zM216 36h2v3h-2z" />
    <path fill="#e1b78e" d="M285 72h4v2h-4zM293 72h4v2h-4zM301 72h4v2h-4zM329 72h4v2h-4zM337 72h4v2h-4zM345 72h4v2h-4z" />
    <path fill="#c0b6a9" d="M362 13h1v2h-1zM362 28h1v2h-1zM362 43h1v2h-1zM362 58h1v2h-1zM389 13h1v2h-1zM389 28h1v2h-1zM389 43h1v2h-1zM389 58h1v2h-1zM355 67h42v1h-42z" />
    <path fill="#546676" d="M308 38h20v1h-20zM310 19h1v3h-1zM326 19h1v3h-1zM316 48h5v1h-5zM315 51h7v1h-7zM212 48h26v1h-26z" />
    <path fill="#97a0a6" d="M214 55h6v1h-6zM227 55h6v1h-6zM238 55h3v1h-3zM211 70h5v1h-5zM232 70h7v1h-7zM431 59h30v1h-30zM426 72h2v1h-2zM465 72h2v1h-2z" />
    <path fill="#697786" d="M235 83h16v9h-16zM238 80h10v3h-10zM377 81h17v10h-17z" /><path fill="#a4aaa6" d="M236 83h14v1h-14zM378 81h15v1h-15z" /><path fill="#334859" d="M238 86h10v1h-10zM238 89h10v1h-10zM380 84h11v1h-11zM380 87h11v1h-11z" />
    <path fill="#a99f91" opacity=".65" d="M279 88h8v1h-8zM293 94h8v1h-8zM334 93h14v1h-14zM354 85h7v1h-7zM363 90h6v1h-6zM399 93h8v1h-8zM271 94h6v1h-6z" />
    <path fill="#e5b290" opacity=".15" d="M308 78h18v3h-18zM301 83h34v2h-34zM296 88h47v1h-47zM309 91h29v1h-29z" />
    <path fill="#b6aba0" d="M375 11h1v21h-1z" /><g transform="translate(376 33)"><g className="pb-lab-claw" style={{ animationDuration: "7s" }}><path fill="#b6aba0" d="M-1-22h2V4h-2zM-3 3h6v3h-6z" /><path fill="#ad8377" d="M-7 7H7v10H-7z" /><path fill="#e7c5a3" d="M-6 8H6v1H-6zM-1 8h2v8h-2z" /><path fill="#516579" d="M-7 6H7v2H-7z" /></g></g>
    <path fill="#4f6679" d="M265 38h3v18h-3zM259 56h15v3h-15z" /><path fill="#abb5b5" d="M266 39h1v15h-1z" />
    <g transform="translate(267 36)"><g className="pb-dish"><path fill="#bec5bc" d="M-11-9h3v3h4v3h4v3h8v3H1v-2h-5v-3h-4v-3h-3z" /><path fill="#6a8493" d="M-8-9h2v3h4v3H3v2h-5v-2h-4v-3h-2z" /><path fill="#e7d8b9" d="M-1-6h2v7h-2zM0-8h3v3H0z" /></g></g>
    <g className="pb-beacon" style={{ animationDuration: "3.8s", animationDelay: "-1.8s" }} fill="#f0bb8b"><path opacity=".16" d="M303 59h31v26h-31z" /><path d="M359 16h2v3h-2zM359 31h2v3h-2zM359 46h2v3h-2zM386 61h2v3h-2z" /></g>
    <g transform="translate(290 76)"><g className="pb-steam" style={{ animationDuration: "4.2s", animationDelay: "-2s" }} fill="#e2d1b5"><path opacity=".6" d="M0 0h7v-3h5v3h4v3h-6v2H1v-2h-5V1H0z" /></g></g>
    <path fill="#c1b39a" d="M487 82h6v-3h3v3h4v2h-7v4h-3z" />
  </>;
}

function OrbitalRing() {
  const p = BANNER_PALETTES.orbitalring;
  return <><Sky p={p} />
    <path fill="#43355e" opacity=".36" d="M0 13h80v6h70v5h81v6h91v5h98v6h87v6h71v5h62v11h-88v-6h-73v-5h-78v-6h-91v-5h-88v-5h-83v-5H72v-6H0z" />
    <path fill="#746394" opacity=".17" d="M0 16h72v5h80v6h86v6h87v5h94v6h89v5h74v6h58v3h-65v-5h-73v-5h-90v-6h-95v-5h-88v-5h-82v-6H70v-5H0z" />
    <path fill="#353c65" d="M265 53h8v-7h14v-6h27v-4h48v4h28v6h14v8h4v8h-8v5h-26v4h-42v-4h-29v-6h-23v-3h-15z" />
    <path fill="#766c93" d="M269 53h6v-5h14v-5h26v-4h46v4h26v5h14v7h-3v4h-14v3h-23v2h-37v-4h-30v-5h-25z" />
    <path fill="#496888" d="M312 11h25v3h12v6h8v9h4v25h-4v9h-8v6h-12v3h-25v-3h-12v-6h-8v-9h-4V29h4v-9h8v-6h12z" />
    <path fill="#70a4b2" d="M307 17h7v-3h21v3h12v5h6v8h4v19h-5V30h-5v-8h-11v-4h-22v4h-7v7h-8v16h-7V30h5v-8h10z" />
    <path fill="#91b9b5" d="M307 24h11v-4h11v5h-7v6h-9v5h-9v-6h3zM334 30h12v6h6v7h-7v6h-7v9h-7v-9h-5v-8h8zM306 48h13v5h6v11h-9v-4h-10z" />
    <path fill="#bdcbbf" d="M313 14h21v3h-21zM296 33h2v13h-2zM317 23h9v2h-9zM337 30h6v2h-6z" />
    <path fill="#2e4167" d="M344 21h5v8h7v25h-4v9h-7v6h-13v3h-21v-3h18v-5h11v-9h5z" />
    <path fill="#3d416a" d="M266 53h5v7h15v6h27v5h46v-3h26v-6h14v-7h5v8h-7v6h-15v5h-27v3h-46v-4h-28v-6h-15z" />
    <path fill="#c4abc8" d="M269 58h4v4h14v5h27v5h43v-3h26v-5h14v-5h4v5h-15v6h-28v4h-45v-5h-27v-5h-17z" />
    <path fill="#ebe0d6" d="M286 64h12v2h-12zM316 71h17v2h-17zM365 68h12v2h-12zM391 61h6v2h-6z" />
    <g transform="translate(376 25)"><g className="pb-cruise" style={{ animationDuration: "12s" }}><path fill="#7385a1" d="M-9-3h16v8H-9zM-28-10h14v20h-14zM14-10h15v20H14z" /><path fill="#a1bfd1" d="M-8-2H6v2H-8zM-25-8h8v1h-8zM17-8h9v1h-9z" /><path fill="#35486c" d="M-26-6h10v14h-10zM16-6h11v14H16z" /><path fill="#7785b1" d="M-22-6h1V8h-1zM-26 0h10v1h-10zM21-6h1V8h-1zM16 0h11v1H16z" /><path fill="#d6d6d0" d="M-3-6h5v3h-5zM-1-10h1v4h-1z" /><path fill="#9fe0dc" className="pb-beacon" d="M3 1h2v2H3z" /><g transform="translate(0 -9)"><g className="pb-dish" style={{ animationDuration: "9s" }}><path fill="#c8c9d4" d="M-5-4h2v2h3v2h5v2H0v-2h-3v-2h-2z" /><path fill="#9fe0dc" d="M0-4h1v4H0z" /></g></g></g></g>
    <path className="pb-tether" fill="none" stroke="#aeb2c8" opacity=".8" d="M266 57q-31-4-14-22" />
    <g transform="translate(257 32)"><g className="pb-specimen" style={{ animationDuration: "8s" }}><path fill="#c8c9d4" d="M-3-7h7v7h-7zM-5 0H5v9H-5zM-8 1h3v5h-3zM5 0h4v3H5zM-5 9h3v5h-3zM2 9h3v4H2z" /><path fill="#35516b" d="M-1-5h5v3h-5zM-2 3h4v3h-4z" /><path fill="#e4dacc" d="M-3-7h6v1h-6z" /></g></g>
    <path fill="#272d4d" d="M0 92h27v-7h33v4h32v-9h24v5h41v-7h27v8h28v10H0zM429 90h20v-9h30v5h21v-5h33v-8h20v8h42v-6h27v6h18v15H429z" /><path fill="#4c4b70" d="M26 85h35v2H26zM93 80h21v2H93zM535 73h17v2h-17zM596 75h27v2h-27z" />
    <path fill="#afb4cf" d="M142 38h12v2h-12zM146 34h3v10h-3zM487 27h14v3h-14zM493 20h2v15h-2z" /><path fill="#bd9dbb" d="M139 35h4v8h-4zM154 35h4v8h-4zM482 21h6v14h-6zM501 21h6v14h-6z" />
    <path fill="#d7e3dc" className="pb-comet" d="M441 8h3v2h-3zM444 6h6v2h-6zM450 4h10v2h-10z" />
    <path fill="#a3c7c7" opacity=".65" d="M309 18h5v1h-5zM304 25h7v1h-7zM320 30h4v1h-4zM337 37h6v1h-6zM334 44h5v1h-5zM308 49h9v1h-9zM318 54h3v1h-3z" />
    <path fill="#d9d2db" d="M278 62h4v1h-4zM294 66h2v1h-2zM304 69h3v1h-3zM340 72h6v1h-6zM375 67h2v1h-2zM387 63h2v1h-2zM398 58h1v1h-1z" />
    <g transform="translate(319 73)"><g className="pb-packet" style={{ animationDuration: "3.6s", animationDelay: "-1.5s" }}><path fill="#f7e5e0" d="M0 0h5v1H0z" /><path fill="#a7dcd9" opacity=".25" d="M-2-1h10v3H-2z" /></g></g>
    <g className="pb-beacon" style={{ animationDuration: "6.8s", animationDelay: "-2s" }} fill="#bdece4"><path d="M278 60h2v2h-2zM291 65h2v2h-2zM365 68h2v2h-2zM388 61h2v2h-2z" /><path opacity=".11" d="M280 58h10v9h-10zM362 63h14v10h-14zM386 55h10v9h-10z" /></g>
    <path fill="#d3e4d9" opacity=".36" d="M304 18h8v1h-8zM298 23h10v1h-10zM327 21h8v1h-8zM321 57h11v1h-11zM325 62h7v1h-7zM349 39h1v7h-1z" />
    <path fill="#a2c4ce" opacity=".5" d="M279 56h9v1h-9zM295 65h7v1h-7zM316 75h10v1h-10zM362 71h7v1h-7zM385 65h6v1h-6z" />
    <path fill="#333752" d="M268 94h11v-5h22v-4h25v4h18v4h24v3H268z" /><path fill="#646283" d="M286 89h16v-3h21v2h-20v3h-17zM331 92h10v1h-10zM274 94h8v1h-8z" />
    <path fill="#a6a8bb" d="M298 86h2v-7h3v-3h8v3h-4v4h-5v3zM300 83h7v1h-7zM301 84h1v3h-1z" /><path fill="#60768f" d="M301 78h5v2h-5z" />
    <path fill="#a8b6c7" d="M527 77h5v3h-5zM529 73h3v4h-3zM527 70h7v3h-7z" /><path fill="#d1b5c6" d="M529 67h1v3h-1zM532 67h1v3h-1z" />
  </>;
}

function GhostTown() {
  const p = BANNER_PALETTES.geisterstadt;
  return <><Sky p={p} /><Moon p={p} x={286} y={3} /><Clouds p={p} />
    <path fill="#403b55" d="M0 67h23V38h12V27h8v11h10v27h27V43h11V31h8v12h18v26h26V30h15V15h8v15h13v39h36V38h12V26h8v12h18v31h155V43h15V27h9v16h16v24h30V36h10V23h9v13h12v29h35V39h11V26h8v13h13v26h32V29h12V15h8v14h12v38h24v29H0z" />
    <path fill="#292b40" d="M0 76h640v20H0z" /><path fill="#565067" d="M232 77h181v3H232zM276 80h91l49 16H224z" />
    <path fill="#26263b" d="M258 41h47v36h-47zM269 34h25v9h-25zM275 27h13v9h-13zM341 25h43v52h-43zM347 15h30v12h-30zM357 3h10v14h-10z" />
    <path fill="#696078" d="M262 45h39v30h-39zM273 37h17v8h-17zM345 29h35v46h-35zM352 19h20v10h-20z" />
    <path fill="#39354d" d="M255 42v-4h10v-6h12v-6h10v6h11v6h10v4zM338 27v-4h9v-8h7V9h15v6h8v8h10v4z" />
    <path fill="#8b7c93" d="M259 38h8v-6h10v-4h8v4h10v6h8v2h-10v-5h-8v-4h-6v4h-12v5h-8zM341 24h8v-8h8v-5h10v5h7v8h9v1h-11v-8h-7v-4h-7v5h-7v8h-10z" />
    <path fill="#c5c8b7" d="M273 50h7v10h-7zM287 50h7v10h-7zM351 35h8v11h-8zM367 35h7v11h-7zM354 19h6v7h-6zM366 19h4v7h-4z" /><path fill="#4a4258" d="M272 54h9v2h-9zM286 53h9v2h-9zM351 40h8v2h-8zM368 38h6v2h-6z" />
    <path fill="#24293b" d="M278 65h11v12h-11zM359 61h12v16h-12z" /><path fill="#827086" d="M358 57h15v4h-15zM258 72h47v2h-47zM342 51h42v2h-42z" />
    <path fill="#342f46" d="M183 50h51v30h-51zM179 49v-4h14v-8h24v8h20v4zM428 49h48v31h-48zM424 49v-5h13v-9h22v9h20v5z" /><path fill="#675870" d="M188 53h42v24h-42zM432 53h40v24h-40z" /><path fill="#c5b99d" d="M193 58h9v11h-9zM215 57h9v11h-9zM438 58h9v11h-9zM457 59h8v10h-8z" /><path fill="#655267" d="M192 61h11v3h-11zM213 64h12v3h-12zM437 61h12v3h-12zM456 65h10v3h-10z" />
    <path fill="#1f2639" d="M223 55h3v30h-3zM218 55h13v-3h-4v-5h-5v5h-4zM402 48h3v35h-3zM397 48h13v-3h-4v-5h-5v5h-4z" /><path fill="#d1c4a1" className="pb-lantern" d="M221 55h7v6h-7zM400 48h7v7h-7z" /><path fill="#b4b3a6" opacity=".12" d="M218 61h13l9 20h-31zM397 55h13l9 24h-31z" />
    <path fill="#434354" d="M0 89h640v2H0zM0 95h640v1H0z" /><path fill="#8e8091" opacity=".5" d="M0 90h640v1H0z" />
    <g transform="translate(318 78)"><g className="pb-tram-travel"><path fill="#283044" d="M-17-16h32v5h4v17h-40v-17h4z" /><path fill="#6b7680" d="M-17-11h32V3h-32z" /><path fill="#a7bbb2" d="M-14-9h8v8h-8zM-3-9h8v8h-8zM8-9h5v8H8z" /><path fill="#404552" d="M-17-1h32v2h-32zM-16 6h6v4h-6zM8 6h6v4H8z" /><path fill="#cfc9a9" d="M-16 2h4v2h-4zM10 2h4v2h-4z" /><path fill="#797080" d="M-9-17h17v-2H1v-9h2v8h8v3z" /><path fill="#26394a" d="M-11-8h2v4h-2zM0-8h2v4H0z" /><path fill="#aca897" d="M-14-13h10v1h-10zM3-13h10v1H3zM-18 3h2v1h-2zM15 3h2v1h-2z" /><path fill="#d6d8b5" opacity=".15" d="M-20 5h39v3h-39zM-25 8h50v2h-50z" /></g></g>
    <g transform="translate(253 55)"><g className="pb-ghost"><path fill="#bfdacf" opacity=".1" d="M-8-10h14v3h4V9H6v3H-7V9h-4V-5h3z" /><path fill="#c5dbd3" opacity=".8" d="M-4-7h7v2h3V8H3V5H1v3h-2V5h-2v3h-3V-5h2z" /><path fill="#536174" d="M-2-3h2v3h-2zM2-3h2v3H2z" /><path fill="#e0e6d7" d="M-2-6h4v1h-4z" /></g></g>
    <path fill="#292b3e" d="M387 78h8v7h-8zM387 75h2v3h-2zM393 75h2v3h-2zM395 82h4v-6h2v8h-6z" /><path fill="#cee0b1" d="M389 79h1v1h-1zM393 79h1v1h-1z" />
    <path fill="#22283a" d="M120 43h4v39h-4zM122 53h13v-8h3v11h-14zM120 64h-13V53h3v8h10zM510 32h4v49h-4zM512 48h14V37h3v14h-15zM510 63h-14V51h3v9h11z" />
    <path fill="#788087" d="M151 78v-9h3v-3h7v3h3v9zM487 80V68h3v-3h8v3h3v12zM547 81V71h3v-3h7v3h3v10z" /><path fill="#444654" d="M156 70h2v6h-2zM153 72h8v2h-8zM492 70h5v1h-5zM492 73h5v1h-5z" />
    <path fill="#85758b" opacity=".65" d="M264 47h8v1h-8zM284 46h12v1h-12zM263 63h9v1h-9zM291 63h8v1h-8zM265 70h7v1h-7zM294 69h6v1h-6zM347 31h10v1h-10zM366 31h10v1h-10zM348 48h8v1h-8zM369 48h8v1h-8zM348 57h6v1h-6zM371 68h7v1h-7zM348 72h6v1h-6zM189 72h10v1h-10zM218 74h9v1h-9zM433 70h9v1h-9zM461 73h8v1h-8z" />
    <path fill="#463d53" d="M263 57h8v1h-8zM292 60h7v1h-7zM269 66h7v1h-7zM349 44h3v1h-3zM365 54h9v1h-9zM352 66h5v1h-5zM373 38h6v1h-6zM199 54h6v1h-6zM449 73h5v1h-5z" />
    <path fill="#6c5f76" d="M272 35h4v1h-4zM282 33h6v1h-6zM278 37h5v1h-5zM266 39h7v1h-7zM290 38h8v1h-8zM351 23h5v1h-5zM361 15h7v1h-7zM369 21h6v1h-6zM359 24h4v1h-4zM192 44h8v1h-8zM207 41h9v1h-9zM438 42h7v1h-7zM449 38h7v1h-7z" />
    <path fill="#9c8995" d="M262 43h1v29h-1zM345 30h1v18h-1zM346 54h1v19h-1zM302 47h1v21h-1zM380 32h1v33h-1zM355 77h20v1h-20zM354 79h23v1h-23zM275 77h17v1h-17z" />
    <path fill="#c8c1a1" opacity=".12" d="M271 61h26v2h-26zM350 46h24v3h-24zM268 79h33v2h-33zM264 83h38v1h-38zM346 82h35v1h-35zM348 85h42v1h-42zM215 83h20v1h-20zM393 82h24v1h-24z" />
    <g className="pb-beacon" style={{ animationDuration: "7.4s", animationDelay: "-3s" }} fill="#e1dcc0"><path d="M274 50h2v9h-2zM288 50h2v9h-2zM352 35h2v10h-2zM368 35h2v10h-2z" /><path opacity=".12" d="M269 48h29v14h-29zM347 33h31v15h-31z" /></g>
    <path fill="#303147" d="M358 26h10v9h-10z" /><path fill="#b6baa9" d="M360 27h6v1h2v5h-2v1h-6v-1h-1v-5h1z" />
    <g transform="translate(363 30)"><g className="pb-rotor" style={{ animationDuration: "24s" }}><path fill="#52566b" d="M0-3h1v4h-3v-1h2z" /></g></g>
    <path fill="#d2c1aa" d="M362 30h2v1h-2zM357 25h12v1h-12z" />
    <path fill="#a491a3" d="M270 45h9v1h-9zM290 47h7v1h-7zM349 55h9v1h-9zM371 58h6v1h-6zM265 68h5v1h-5zM346 70h5v1h-5z" /><path fill="#718c85" d="M294 74v-9h2v9h4v-6h2v8h-8zM348 75V64h2v8h3v-5h2v8z" />
    <path fill="#857e8c" opacity=".55" d="M251 84h9v1h-9zM274 86h12v1h-12zM288 82h6v1h-6zM361 86h10v1h-10zM380 88h8v1h-8zM331 94h12v1h-12zM250 93h16v1h-16zM234 87h6v1h-6zM412 92h9v1h-9zM398 86h9v1h-9zM292 94h12v1h-12z" />

    <g className="pb-cloud" fill="#c1c7cc" opacity=".15"><path d="M0 83h119v-3h55v4h90v3H0zM355 85h69v-3h88v3h128v4H355zM210 92h91v-3h50v3h80v2H210z" /></g>
    <path fill="#b4aaa3" d="M69 79h5v-3h2v3h4v2h-4v4h-2v-4h-5z" /><path fill="#d3d9c9" className="pb-twinkle" d="M281 68h3v2h-3zM363 64h3v2h-3z" />
  </>;
}

export const FUTURE_ART = {
  neonregen: <NeonRain />,
  dachgaerten: <RoofGardens />,
  biolabor: <BioLab />,
  datenstrom: <DataStream />,
  tiefseestation: <DeepStation />,
  sonnenraster: <SolarGrid />,
  pastellpalmen: <PastelPalms />,
  raketenhafen: <RocketPort />,
  orbitalring: <OrbitalRing />,
  geisterstadt: <GhostTown />,
} satisfies Partial<Record<BannerId, ReactNode>>;
