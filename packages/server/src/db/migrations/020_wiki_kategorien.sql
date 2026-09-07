-- Kategorien: die zweite Ordnung des Wikis, neben der Enthaltensein-Kette `entries.parent_entry_id`.
--
-- Zwei Ordnungssysteme, und die Trennung ist der Punkt: eine Kategorie ist Zugehörigkeit zu einer
-- Menge (ein Artikel in vielen), `parent_entry_id` ist Enthaltensein (Stadt → Bezirk → Taverne,
-- ein Elternteil). Genau diese Trennung macht ein Wiki navigierbar; sie zusammenzulegen wäre
-- billiger und falsch. `entries.art` bleibt unberührt und trägt weiterhin die Rückfallgruppierung
-- für Artikel ohne jede Kategorie.
--
-- `sichtbarkeit` ist die Silhouetten-Stufe der Kategorie und steht hier, nicht am Eintrag: sie
-- beantwortet, wie viel eine Leserin über das erfahren darf, was sie NICHT weiß. Voreinstellung
-- ist `silhouette` — die Zahl der unbekannten ist sichtbar, kein Titel. Durchgesetzt wird sie an
-- genau einer Stelle, in wiki-navigation.ts.
--
-- Rein additiv: zwei neue Tabellen und zwei Indizes ändern kein Schema, das älterer Code
-- voraussetzt, und sind damit rolling-update-fähig (design/10-hosted-betrieb-und-auslieferung.md §1.4).
CREATE TABLE categories (
  id text PRIMARY KEY,
  campaign_id text NOT NULL REFERENCES campaigns(id),
  slug text NOT NULL,
  title text NOT NULL,
  parent_category_id text REFERENCES categories(id),
  sichtbarkeit text NOT NULL DEFAULT 'silhouette'
    CHECK (sichtbarkeit IN ('verborgen','silhouette','offen')),
  CHECK (parent_category_id IS NULL OR parent_category_id <> id),
  UNIQUE(campaign_id,slug), UNIQUE(id,campaign_id)
);
-- statement
CREATE TABLE entry_categories (
  campaign_id text NOT NULL REFERENCES campaigns(id),
  entry_id text NOT NULL,
  category_id text NOT NULL,
  PRIMARY KEY(campaign_id,entry_id,category_id),
  FOREIGN KEY(entry_id,campaign_id) REFERENCES entries(id,campaign_id),
  FOREIGN KEY(category_id,campaign_id) REFERENCES categories(id,campaign_id)
);
-- statement
CREATE INDEX entry_categories_category_idx ON entry_categories(campaign_id,category_id);
-- statement
-- Die Elternkette wird bei jedem Aufbau der Brotkrumen gelesen; Postgres legt für Fremdschlüssel
-- keinen Index an (dieselbe Begründung wie 016_lineage_index.sql).
CREATE INDEX entries_parent_idx ON entries(campaign_id,parent_entry_id);
