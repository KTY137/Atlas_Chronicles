import { Type, type Static } from "@sinclair/typebox";

const closed = { additionalProperties: false } as const;
const id = Type.String({ minLength: 1, maxLength: 128 });
const nullableId = Type.Union([id, Type.Null()]);
const name = Type.String({ minLength: 1, maxLength: 160, pattern: "\\S" });
const version = Type.Integer({ minimum: 1, maximum: 2_147_483_647 });
const reason = Type.String({ minLength: 1, maxLength: 500, pattern: "\\S" });
const scalar = Type.Union([Type.String({ maxLength: 4096 }), Type.Number({ minimum: -1e12, maximum: 1e12 }), Type.Boolean()]);
const fields = Type.Record(Type.String({ pattern: "^[a-z][a-z0-9_-]{0,95}$" }), scalar, { maxProperties: 64, additionalProperties: false });
const command = { commandId: id };
const change = { ...command, expectedVersion: version, reason };

export const ACTOR_KINDS = ["player_character", "npc", "creature", "companion", "vehicle"] as const;
export const ActorKind = Type.Union(ACTOR_KINDS.map(value => Type.Literal(value)));
/** A template is immutable at this revision. Its fields use the referenced existing actor schema. */
export const ActorTemplateDefinition = Type.Object({
  schemaVersion: Type.Literal(1), name, kind: ActorKind, loreEntryId: nullableId,
  package: Type.Object({ id, version: Type.String({ minLength: 1, maxLength: 128 }) }, closed), fields,
}, closed);
export const ActorTemplateCreate = Type.Object({ ...command, definition: ActorTemplateDefinition }, closed);
export const ActorTemplateRevise = Type.Object({ ...change, definition: ActorTemplateDefinition }, closed);
export const ArchiveObject = Type.Object(change, closed);
export const ActorInstantiate = Type.Object({ ...command, templateId: id, templateRevision: version, name: Type.Optional(name) }, closed);
export const ActorProfileUpdate = Type.Object({ ...change, name, kind: ActorKind, loreEntryId: nullableId }, closed);
export const ActorControllerGrant = Type.Object({ ...command, expectedVersion: Type.Integer({ minimum: 0, maximum: 2_147_483_647 }), reason }, closed);
export const ActorControllerRevoke = Type.Object(change, closed);
export const ReaderPerspectiveUpdate = Type.Object({ ...command, expectedVersion: Type.Integer({ minimum: 0, maximum: 2_147_483_647 }), actorId: nullableId }, closed);

/** Descriptive item data: this is neither an actor rule schema nor an automatic rule effect. */
export const ItemContractV1 = Type.Object({
  schemaVersion: Type.Literal(1), name, loreEntryId: nullableId,
  tags: Type.Array(Type.String({ minLength: 1, maxLength: 80, pattern: "\\S" }), { maxItems: 32, uniqueItems: true }),
}, closed);
export const ItemStateV1 = Type.Object({
  quantity: Type.Integer({ minimum: 1, maximum: 1_000_000 }),
  notes: Type.String({ maxLength: 4000 }), equipped: Type.Boolean(),
}, closed);
/**
 * Die Seltenheit ist eine GESCHLOSSENE Menge, weil sie den Rahmen der Karte bestimmt: eine
 * erfundene Stufe hätte keine Darstellung und wäre damit eine Angabe, die nirgends ankommt.
 */
export const LOOT_RARITIES = ["gewoehnlich", "ungewoehnlich", "selten", "episch", "legendaer"] as const;
export const LootRarity = Type.Union(LOOT_RARITIES.map(value => Type.Literal(value)));
/**
 * Die Kartenfassung eines Gegenstands — Fassung 2 des Vertrags.
 *
 * Sie beschreibt weiterhin NUR: keine Regelwirkung, kein Würfelmodifikator. Was dazukommt, ist
 * das Gesicht der Karte — Bild, Art, Seltenheit, Spruch und ein paar freie Zeilen.
 *
 * **Die Kategorie ist freier Text, die Seltenheit nicht.** Kein Rollenspiel kennt dieselben
 * Gegenstandsarten, aber jede Karte braucht einen Rahmen. Was die Darstellung trägt, wird
 * geschlossen; was die Welt beschreibt, bleibt offen.
 *
 * **Fassung 1 bleibt gültig.** Eine Vorlage, die vor dieser Zeile gespeichert wurde, trägt
 * weiter `schemaVersion: 1` und wird weiter gelesen — ihre Revision ist unveränderlich und
 * inhaltsgehasht; sie nachträglich umzudeuten wäre eine Fälschung.
 */
export const ItemContractV2 = Type.Object({
  schemaVersion: Type.Literal(2), name, loreEntryId: nullableId,
  tags: Type.Array(Type.String({ minLength: 1, maxLength: 80, pattern: "\S" }), { maxItems: 32, uniqueItems: true }),
  seltenheit: LootRarity,
  kategorie: Type.String({ maxLength: 80 }),
  /** Ein Bild aus dem Bildbestand der Kampagne. Fehlen die Bytes, zeigt die Karte den Platzhalter. */
  bildAssetId: nullableId,
  spruch: Type.String({ maxLength: 600 }),
  zeilen: Type.Array(Type.Object({
    label: Type.String({ minLength: 1, maxLength: 40, pattern: "\S" }),
    wert: Type.String({ minLength: 1, maxLength: 120, pattern: "\S" }),
  }, closed), { maxItems: 8 }),
}, closed);
/** Beide Fassungen werden angenommen; die Karte entscheidet anhand von `schemaVersion`. */
export const ItemContractAny = Type.Union([ItemContractV1, ItemContractV2]);
export const ItemTemplateCreate = Type.Object({ ...command, definition: ItemContractAny }, closed);
export const ItemTemplateRevise = Type.Object({ ...change, definition: ItemContractAny }, closed);
export const ItemInstantiate = Type.Object({ ...command, templateId: id, templateRevision: version, holderActorId: nullableId, state: Type.Optional(ItemStateV1) }, closed);
export const ItemUpdate = Type.Object({ ...change, state: ItemStateV1 }, closed);
export const ItemCustodyChange = Type.Object({ ...change, holderActorId: nullableId }, closed);

export const ACTOR_INVENTORY_OPERATIONS = [
  "actor.template.create", "actor.template.revise", "actor.template.archive", "actor.instantiate", "actor.update", "actor.archive",
  "actor.controller.grant", "actor.controller.revoke", "reader.perspective",
  "item.template.create", "item.template.revise", "item.template.archive", "item.instantiate", "item.update", "item.transfer", "item.archive",
] as const;

export type ActorKindValue = Static<typeof ActorKind>;
export type ActorTemplateData = Static<typeof ActorTemplateDefinition>;
export type ItemContractV1Data = Static<typeof ItemContractV1>;
export type ItemContractV2Data = Static<typeof ItemContractV2>;
export type ItemContract = ItemContractV1Data | ItemContractV2Data;
export type LootRarityValue = Static<typeof LootRarity>;
export type ItemState = Static<typeof ItemStateV1>;
export interface ActorCard {
  id: string; campaignId: string; name: string; kind: ActorKindValue | "unspecified";
  version: number | null; archivedAt: number | null; loreEntryId: string | null;
  template: { id: string; revision: number } | null; canControl: boolean; canReadAs: boolean;
}
export interface TemplateCard<T> {
  id: string; revision: number; version: number; archivedAt: number | null; definition: T; contentHash: string;
}
export interface ControllerCard {
  userId: string; permission: "control"; version: number;
  grantedBy: string | null; grantedAt: number | null; revokedAt: number | null;
}
export interface ReaderPerspective { actorId: string | null; version: number }
export interface ItemCard {
  id: string; version: number; holderActorId: string | null; archivedAt: number | null;
  template: { id: string; revision: number }; definition: ItemContract; state: ItemState;
}
