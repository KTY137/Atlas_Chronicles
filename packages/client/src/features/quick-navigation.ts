// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import type { Stage, TableTab } from "../navigation";
import type { ForgeSection } from "./forge-navigation";

export interface NavigationCommand {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly group: string;
  readonly keywords: string;
  readonly stage: Stage;
  readonly target?: { readonly forge?: ForgeSection; readonly tab?: TableTab };
}

type CommandDefinition = NavigationCommand & { readonly gmOnly?: boolean };

// Only static application destinations belong here. Never add article titles, player
// names or campaign content: their visibility must be projected by the server.
function commandDefinitions(t: (text: string) => string): readonly CommandDefinition[] {
  return [
  { id: "heute", label: t("Heute"), description: t("Übersicht & Schnellzugriff"), group: t("Spielen"), keywords: "home dashboard start", stage: "heute" },
  { id: "ich", label: t("Ich"), description: t("Meine Figuren & Inventare"), group: t("Spielen"), keywords: "character sheet charakter bogen profil", stage: "ich" },
  { id: "tisch", label: t("Tisch"), description: t("Würfel, Kampf & Szenen"), group: t("Spielen"), keywords: "table play session spielabend", stage: "tisch" },
  { id: "wiki", label: t("Chronik"), description: t("Artikel & Wissen"), group: t("Eure Welt"), keywords: "wiki chronicle journal notizen", stage: "wiki" },
  { id: "atlas", label: t("Atlas"), description: t("Weltkarte & Orte"), group: t("Eure Welt"), keywords: "world map welt ort", stage: "atlas" },
  { id: "woche", label: t("Woche"), description: t("Briefe & Vorhaben"), group: t("Eure Welt"), keywords: "week letter post kalender", stage: "woche" },
  { id: "kanal", label: t("Kanal"), description: t("Nachrichten der Runde"), group: t("Eure Welt"), keywords: "channel chat messages nachricht", stage: "kanal" },
  { id: "runde", label: t("Runde"), description: t("Mitglieder & Sicherungen"), group: t("Vorbereiten & verwalten"), keywords: "members invite backup export einladung sichern", stage: "runde" },
  { id: "account", label: t("Zugang verwalten"), description: t("Persönlicher Zugang"), group: t("Vorbereiten & verwalten"), keywords: "account passkey login konto", stage: "account" },
  { id: "table-actions", label: t("Würfeln & Proben"), description: t("Aktionen am Tisch öffnen"), group: t("Spielen"), keywords: "dice roll wuerfeln", stage: "tisch", target: { tab: "actions" } },
  { id: "table-actors", label: t("Figuren & Inventar"), description: t("Figuren und Besitz am Tisch öffnen"), group: t("Spielen"), keywords: "inventory items gegenstaende gegenstände vorrat besitz", stage: "tisch", target: { tab: "actors" } },
  { id: "table-kampf", label: t("Kampf"), description: t("Kampfbühne am Tisch öffnen"), group: t("Spielen"), keywords: "combat initiative battle", stage: "tisch", target: { tab: "kampf" } },
  { id: "table-tactical", label: t("Szenenkarten"), description: t("Szenenkarten am Tisch öffnen"), group: t("Spielen"), keywords: "tactical battle map taktisch", stage: "tisch", target: { tab: "tactical" } },
  { id: "forge-overview", label: t("Schmiede"), description: t("Loot, NPCs, Karten & Regeln"), group: t("Vorbereiten & verwalten"), keywords: "forge workshop werkstatt", stage: "schmiede", target: { forge: "overview" }, gmOnly: true },
  { id: "forge-loot", label: t("Lootkarte erstellen"), description: t("Kartenvorlagen und Beute vorbereiten"), group: t("Schmiede"), keywords: "loot items gegenstand item card", stage: "schmiede", target: { forge: "loot" }, gmOnly: true },
  { id: "forge-actors", label: t("Figuren vorbereiten"), description: t("Figurvorlagen und NPCs erschaffen"), group: t("Schmiede"), keywords: "npc templates vorlagen charakter", stage: "schmiede", target: { forge: "actors" }, gmOnly: true },
  { id: "forge-maps", label: t("Karte erstellen"), description: t("Kartenstudio und Grundrisse öffnen"), group: t("Schmiede"), keywords: "map editor raum siedlung gebaeude gebäude", stage: "schmiede", target: { forge: "maps" }, gmOnly: true },
  { id: "forge-media", label: t("Bild hochladen"), description: t("Bilder und Medien verwalten"), group: t("Schmiede"), keywords: "image upload png jpg media", stage: "schmiede", target: { forge: "media" }, gmOnly: true },
  { id: "forge-rules", label: t("Regeln bearbeiten"), description: t("Regelwerk und Figurenbogen gestalten"), group: t("Schmiede"), keywords: "rules formula formel balken werte", stage: "schmiede", target: { forge: "rules" }, gmOnly: true },
  { id: "forge-themes", label: t("Aussehen gestalten"), description: t("Farben, Schrift und Lesbarkeit einstellen"), group: t("Schmiede"), keywords: "theme appearance design schrift", stage: "schmiede", target: { forge: "themes" }, gmOnly: true },
  { id: "forge-publication", label: t("Veröffentlichung öffnen"), description: t("Artikel ausdrücklich veröffentlichen"), group: t("Schmiede"), keywords: "publish publication share freigabe", stage: "schmiede", target: { forge: "publication" }, gmOnly: true },
  ];
}

export function navigationCommands(gm: boolean, translate: (text: string) => string): NavigationCommand[] {
  // Keep literal t("…") calls visible to gate:sprache, while retaining the
  // German source wording as search aliases when the display language changes.
  const source = commandDefinitions(text => text);
  return commandDefinitions(translate).flatMap(({ gmOnly, ...command }, index) => {
    if (gmOnly && !gm) return [];
    const original = source[index]!;
    return [{ ...command, keywords: `${original.label} ${original.description} ${original.group} ${original.keywords}` }];
  });
}

function normalize(value: string): string {
  return value.toLowerCase().normalize("NFKD").replace(/\p{M}/gu, "")
    .replace(/ß/g, "ss").replace(/ae/g, "a").replace(/oe/g, "o").replace(/ue/g, "u");
}

export function searchNavigationCommands(commands: readonly NavigationCommand[], query: string): NavigationCommand[] {
  const normalized = normalize(query.trim());
  const tokens = normalized.split(/\s+/u).filter(Boolean);
  if (!tokens.length) return [...commands];
  return commands.map((command, index) => {
    const label = normalize(command.label);
    const searchable = normalize(`${command.label} ${command.description} ${command.group} ${command.keywords}`);
    const score = label === normalized ? 0 : label.startsWith(normalized) ? 1 : tokens.every(token => label.includes(token)) ? 2 : 3;
    return { command, index, score, matches: tokens.every(token => searchable.includes(token)) };
  }).filter(result => result.matches).sort((a, b) => a.score - b.score || a.index - b.index).map(result => result.command);
}

export function isQuickNavigationShortcut(event: Pick<KeyboardEvent, "key" | "ctrlKey" | "metaKey" | "altKey" | "shiftKey" | "repeat" | "isComposing" | "defaultPrevented">): boolean {
  return !event.defaultPrevented && !event.repeat && !event.isComposing && !event.altKey && !event.shiftKey
    && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k";
}
