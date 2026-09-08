// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { CAMPAIGN_V15_TABLES,CAMPAIGN_V15_MODULES,CAMPAIGN_BUNDLE_V15_LIMITS,type CampaignTablesV15 } from "../native-v15/schema.ts";
import type { CampaignColumn,CampaignRow } from "../campaign-schema.ts";
export const CAMPAIGN_BUNDLE_V16_LIMITS=CAMPAIGN_BUNDLE_V15_LIMITS;
const id=():CampaignColumn=>({kind:"text",maxLength:256,pattern:"^[^\\u0000-\\u001f\\u007f]+$"});
const nullable=(field:CampaignColumn):CampaignColumn=>({...field,nullable:true});
const hash=():CampaignColumn=>({kind:"text",maxLength:64,pattern:"^[a-f0-9]{64}$"});
const json=():CampaignColumn=>({kind:"json"});const time=():CampaignColumn=>({kind:"bigint"});
const integer=():CampaignColumn=>({kind:"integer",minimum:1,maximum:2147483647});
const choice=(...values:string[]):CampaignColumn=>({kind:"text",values});
function table<const N extends string>(name:N,fields:Readonly<Record<string,CampaignColumn>>){return Object.freeze({name,module:"chronist" as const,
  fields:Object.freeze(fields),columns:Object.freeze(Object.keys(fields)),primaryKey:Object.freeze(["id"]),
  bigintColumns:Object.freeze(Object.keys(fields).filter(k=>fields[k]!.kind==="bigint")),jsonColumns:Object.freeze(Object.keys(fields).filter(k=>fields[k]!.kind==="json"))});}
export const CAMPAIGN_V16_ADDITIONAL_TABLES=Object.freeze([
  table("chronist_laeufe",{id:id(),campaign_id:id(),created_by:id(),created_at:time(),updated_at:time(),version:integer(),
    state:choice("running","paused","partial","completed"),mode:choice("prosa","sitzung","abriss"),session_id:nullable(id()),
    start_command_id:id(),start_request:json(),request_hash:hash(),start_ack:json(),snapshot:json(),provider:json(),evidence:json(),checkpoints:json(),
    stop_reason:nullable(choice("cancelled","budget","source-stale","authorization","provider-unavailable","outcome-unknown","call-in-flight","scope-changed")),
    cancel_requested:{kind:"boolean"},fence:integer(),lease_owner:nullable(id()),lease_until:nullable(time())}),
  table("chronist_vorschlaege",{id:id(),campaign_id:id(),run_id:id(),unit_id:id(),candidate_key:id(),version:integer(),original:json(),original_hash:hash(),
    blocks:json(),draft_hash:hash(),dependencies:json(),state:choice("offen","eingereicht","verworfen"),updated_by:id(),updated_at:time(),accepted_by:nullable(id()),
    submission_command_id:nullable(id()),submission_request:nullable(json()),submission_request_hash:nullable(hash()),submission_ack:nullable(json())}),
] as const);
export const CAMPAIGN_V16_TABLES=Object.freeze([...CAMPAIGN_V15_TABLES,...CAMPAIGN_V16_ADDITIONAL_TABLES] as const);
export const CAMPAIGN_V16_MODULES=Object.freeze([...CAMPAIGN_V15_MODULES,"chronist"] as const);
export type CampaignTableNameV16=typeof CAMPAIGN_V16_TABLES[number]["name"];
export type CampaignModuleV16=typeof CAMPAIGN_V16_MODULES[number];
export type CampaignTablesV16=CampaignTablesV15&{readonly chronist_laeufe:readonly CampaignRow[];readonly chronist_vorschlaege:readonly CampaignRow[]};
export function emptyCampaignTablesV16():CampaignTablesV16{return Object.fromEntries(CAMPAIGN_V16_TABLES.map(t=>[t.name,[]])) as unknown as CampaignTablesV16;}
