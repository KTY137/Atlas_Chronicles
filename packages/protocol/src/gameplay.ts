// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { Type } from "@sinclair/typebox";
import { TableDiceSpec } from "./tabletop.ts";
const closed = { additionalProperties: false } as const;
const id = Type.String({ minLength: 1, maxLength: 256 });
const date = Type.String({ minLength: 1, maxLength: 120 });
const scalar = Type.Union([Type.String({maxLength:4096}),Type.Number({minimum:-1e12,maximum:1e12}),Type.Boolean()]);
const values = Type.Record(Type.String({minLength:1,maxLength:96}),scalar,{maxProperties:128});
export const PackageActivation = Type.Object({packageId:id,packageVersion:id,expectedVersion:Type.Integer({minimum:0}),previewHash:Type.Optional(Type.String({pattern:"^[a-f0-9]{64}$"}))},closed);
export const PackagePreview = Type.Object({package:Type.Object({},{additionalProperties:true})},closed);
/** Ein Paket aus der Bibliothek nehmen, es zurueckholen oder endgueltig loeschen. */
export const PackageSelection = Type.Object({packageId:id,packageVersion:id},closed);
export const SheetUpdate = Type.Object({expectedVersion:Type.Integer({minimum:0}),fields:values},closed);
export const ResourceAdjustment = Type.Object({expectedVersion:Type.Integer({minimum:0}),field:id,delta:Type.Number({minimum:-1e12,maximum:1e12})},closed);
export const SceneDraft = Type.Object({name:Type.String({minLength:1,maxLength:160}),entryIds:Type.Array(id,{maxItems:128,uniqueItems:true}),fictionDate:date},closed);
export const SceneStart = Type.Object({expectedSceneVersion:Type.Optional(Type.Integer({minimum:1})),expectedPlanVersion:Type.Optional(Type.Integer({minimum:0}))},closed);
/**
 * `erleichterungId` loest ein offenes Zugestaendnis der Spielleitung ein. Aktion UND
 * Eingaben kommen dann aus der gespeicherten Zeile, nicht aus diesem Entwurf — die Felder
 * hier bleiben zulaessig, wirken aber nicht.
 */
export const ActionDraft = Type.Object({commandId:id,actorId:id,actionId:id,packageId:Type.Optional(id),packageVersion:Type.Optional(id),input:Type.Optional(values),targetPassageId:Type.Optional(id),fictionDate:Type.Optional(date),erleichterungId:Type.Optional(id),tableDice:Type.Optional(TableDiceSpec)},closed);
/** Ein Zugestaendnis der Spielleitung: welche Probe, was abgesprochen ist, und warum. */
export const ErleichterungDraft = Type.Object({actorId:id,gemeinteAktion:id,gewuerfelteAktion:id,eingaben:values,grund:Type.String({minLength:1,maxLength:500,pattern:"\\S"})},closed);
/**
 * Der Geldzaehler. Kein `pattern` auf dem Namen: die Domaene schneidet Leerraum ab und
 * weist einen leeren Namen zurueck — eine Regel an zwei Orten waere eine Regel zu viel.
 */
export const GeldEinheitDraft = Type.Object({name:Type.String({minLength:1,maxLength:40}),expectedVersion:Type.Integer({minimum:0})},closed);
/** Ein gesetzter Stand, keine Verrechnung: die erwartete Fassung macht Verluste sichtbar. */
export const GeldstandDraft = Type.Object({betrag:Type.Integer({minimum:0,maximum:Number.MAX_SAFE_INTEGER}),expectedVersion:Type.Integer({minimum:0})},closed);
export const MintDraft = Type.Object({commandId:id,passageId:id,fictionDate:date,actorIds:Type.Optional(Type.Array(id,{maxItems:128,uniqueItems:true})),expectedPassageHash:Type.Optional(Type.String({pattern:"^[a-f0-9]{64}$"}))},closed);
export const CorrectionDraft = Type.Object({...MintDraft.properties,replaces:id},closed);
export const DefeatDraft = Type.Object({...MintDraft.properties,actorId:id,expectedVersion:Type.Integer({minimum:1})},closed);
export const VollmachtDraft = Type.Object({commandId:id,actorId:id,passageId:id,actionId:id,packageId:Type.Optional(id),packageVersion:Type.Optional(id),input:Type.Optional(values),threshold:Type.Number({minimum:-1e12,maximum:1e12}),expiresAt:Type.Integer({minimum:1}),repeatable:Type.Optional(Type.Boolean()),budgetKind:Type.Union([Type.Literal("player"),Type.Literal("floating")]),fictionDate:date},closed);
export const DoorAction = Type.Object({commandId:id,input:Type.Optional(values)},closed);
