// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { Type, type Static } from "@sinclair/typebox";
import { ActionDraft, DoorAction, MintDraft } from "./gameplay.ts";
const closed={additionalProperties:false};
const id=Type.String({minLength:1,maxLength:256});
export const MessageDraft=Type.Object({commandId:id,body:Type.String({minLength:1,maxLength:8000}),parentId:Type.Optional(id),kind:Type.Union([Type.Literal("letter"),Type.Literal("table")]),
  expectedScene:Type.Optional(Type.Object({id,version:Type.Integer({minimum:1})},closed))},closed);
export const WireCommand=Type.Object({type:Type.Literal("command"),commandId:id,payload:Type.Union([
  Type.Object({kind:Type.Literal("reveal"),passageId:id,actorId:id},closed),
  Type.Object({kind:Type.Literal("message"),body:MessageDraft},closed),
  Type.Object({kind:Type.Literal("roll"),body:ActionDraft},closed),
  Type.Object({kind:Type.Literal("confirm-roll"),rollId:id},closed),
  Type.Object({kind:Type.Literal("door-roll"),vollmachtId:id,body:DoorAction},closed),
  Type.Object({kind:Type.Literal("confirm-door"),rollId:id},closed),
  Type.Object({kind:Type.Literal("speak"),body:MintDraft},closed),
])},closed);
export const WireInput=Type.Union([WireCommand,
  Type.Object({type:Type.Literal("resume"),after:Type.Integer({minimum:0,maximum:Number.MAX_SAFE_INTEGER})},closed),
  Type.Object({type:Type.Literal("presence"),state:Type.Union([Type.Literal("online"),Type.Literal("away")])},closed),
  Type.Object({type:Type.Literal("ping")},closed),
]);
export type WireCommandBody=Static<typeof WireCommand>;
