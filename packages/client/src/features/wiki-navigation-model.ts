/**
 * Das Navigationsmodell: aus der flachen Antwort des Servers wird ein Baum.
 *
 * Reine Funktionen ohne React, damit die Ordnung prüfbar ist, ohne etwas zu rendern. Das Modell
 * **erfindet nichts**: Was der Server ausgelassen hat, weil die Figur es nicht weiß, bleibt hier
 * ausgelassen. Ein unbekannter Artikel behält seinen Platz im Baum und verliert nur seinen Namen —
 * das ist die Silhouette, und sie entsteht auf dem Server, nicht hier.
 */
export interface NavigationKategorie {
  readonly id: string; readonly slug: string; readonly titel: string;
  readonly elternId: string | null;
  readonly sichtbarkeit: "verborgen" | "silhouette" | "offen";
  readonly bekannt: number; readonly gesamt: number;
}
export interface NavigationArtikel {
  readonly id: string; readonly art: string; readonly elternId: string | null;
  readonly kategorieIds: readonly string[]; readonly bekannt: boolean;
  readonly titel?: string; readonly slug?: string; readonly ungelesen?: number;
}
export interface NavigationDaten {
  readonly kategorien: readonly NavigationKategorie[];
  readonly arten: readonly { readonly art: string; readonly bekannt: number; readonly gesamt: number }[];
  readonly artikel: readonly NavigationArtikel[];
}
export interface Gruppe {
  readonly id: string; readonly titel: string;
  readonly herkunft: "kategorie" | "art";
  readonly bekannt: number; readonly gesamt: number;
  readonly kinder: readonly Gruppe[];
  readonly artikel: readonly NavigationArtikel[];
}

/** Die acht Arten aus `EntryArt`, als Überschrift lesbar gemacht. */
const ART_TITEL: Readonly<Record<string, string>> = {
  charakter: "Figuren", organisation: "Organisationen", spezies: "Völker", gegenstand: "Gegenstände",
  ereignis: "Ereignisse", ort: "Orte", regelseite: "Regeln", sonstiges: "Sonstiges",
};
export const artTitel = (art: string): string => ART_TITEL[art] ?? "Sonstiges";

/**
 * Kategorien zuerst, danach die Arten als Rückfall für alles, was keine Kategorie trägt. Ohne
 * diesen Rückfall verschwände jeder von Hand angelegte Artikel aus der Navigation — er hat nur
 * seine `art`, und die ist bis auf Weiteres `sonstiges`.
 */
export function baueNavigation(daten: NavigationDaten): readonly Gruppe[] {
  const jeKategorie = new Map<string, NavigationArtikel[]>();
  for (const artikel of daten.artikel)
    for (const id of artikel.kategorieIds) jeKategorie.set(id, [...(jeKategorie.get(id) ?? []), artikel]);

  const kinderVon = new Map<string | null, NavigationKategorie[]>();
  for (const kategorie of daten.kategorien)
    kinderVon.set(kategorie.elternId, [...(kinderVon.get(kategorie.elternId) ?? []), kategorie]);

  // Tiefenbegrenzung statt Vertrauen: eine im Kreis gelegte Elternkette darf die Oberfläche
  // nicht zum Stehen bringen, auch wenn Server und Paket sie bereits abweisen.
  const gebaut = new Set<string>();
  const baue = (kategorie: NavigationKategorie): Gruppe => {
    gebaut.add(kategorie.id);
    return {
      id: kategorie.id, titel: kategorie.titel, herkunft: "kategorie",
      bekannt: kategorie.bekannt, gesamt: kategorie.gesamt,
      kinder: (kinderVon.get(kategorie.id) ?? []).filter(kind => !gebaut.has(kind.id)).map(baue),
      artikel: jeKategorie.get(kategorie.id) ?? [],
    };
  };
  const ausKategorien = (kinderVon.get(null) ?? []).map(baue);

  const ohneKategorie = daten.artikel.filter(artikel => artikel.kategorieIds.length === 0);
  const jeArt = new Map<string, NavigationArtikel[]>();
  for (const artikel of ohneKategorie) jeArt.set(artikel.art, [...(jeArt.get(artikel.art) ?? []), artikel]);
  const ausArten: Gruppe[] = [...jeArt].map(([art, artikel]) => ({
    id: `art:${art}`, titel: artTitel(art), herkunft: "art",
    bekannt: artikel.filter(eintrag => eintrag.bekannt).length, gesamt: artikel.length,
    kinder: [], artikel,
  }));
  ausArten.sort((links, rechts) => links.titel.localeCompare(rechts.titel, "de"));
  return [...ausKategorien, ...ausArten];
}

export interface Krume { readonly id: string; readonly titel: string | null; readonly bekannt: boolean }

/**
 * Die Brotkrume folgt `parent_entry_id` aufwärts und dreht die Kette um.
 *
 * Ein unbekannter Vorfahre wird namenlos gezeigt, nicht übersprungen: Dass es eine übergeordnete
 * Ebene gibt, folgt bereits aus der Existenz des bekannten Kindes — der Name tut es nicht.
 */
export function brotkrumen(artikelId: string, artikel: readonly NavigationArtikel[]): readonly Krume[] {
  const jeId = new Map(artikel.map(eintrag => [eintrag.id, eintrag]));
  const kette: Krume[] = [];
  const gesehen = new Set<string>();
  let laeufer = jeId.get(artikelId);
  while (laeufer && !gesehen.has(laeufer.id)) {
    gesehen.add(laeufer.id);
    kette.unshift({ id: laeufer.id, titel: laeufer.titel ?? null, bekannt: laeufer.bekannt });
    laeufer = laeufer.elternId ? jeId.get(laeufer.elternId) : undefined;
  }
  return kette;
}
