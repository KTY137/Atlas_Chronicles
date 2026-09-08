// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { admitChronistValue } from "@chronicle/chronist";
import type { ChronistEncoded } from "./data.ts";
import { rejectDuplicateKeys } from "../campaign-v3-json.ts";
const denied=new Set(["__proto__","prototype","constructor"]);
function bad():never{throw new Error("chronist-checkpoint-invalid");}
export interface ChronistSendData {readonly node:string;readonly args:unknown;readonly timeout:number|null}
export interface ChronistCodecOptions {readonly readSend?:(value:object)=>ChronistSendData|null;
  readonly validateSend?:(value:ChronistSendData)=>void;readonly restoreSend?:(value:ChronistSendData)=>unknown}
/** A closed tagged format. User objects are always wrapped, so they cannot impersonate tags. */
export function encodeChronistCheckpoint(value:unknown,options:ChronistCodecOptions={}):ChronistEncoded {
  const seen=new Set<object>();let count=0;
  const encode=(v:unknown,depth:number):ChronistEncoded=>{
    if(++count>500_000||depth>40)bad();
    if(v===undefined)return {t:"undefined"};
    if(v===null||typeof v==="string"||typeof v==="boolean")return v;
    if(typeof v==="number"){if(!Number.isFinite(v))bad();return v;}
    if(typeof v!=="object"||seen.has(v))bad();seen.add(v);
    try{
      const send=options.readSend?.(v);if(send){options.validateSend?.(send);return {t:"send",node:send.node,args:encode(send.args,depth+1),timeout:send.timeout};}
      if(v instanceof Error)return {t:"error",v:"graph-error"};
      if(Array.isArray(v)){if(Object.getOwnPropertySymbols(v).length||Object.keys(v).length!==v.length)bad();
        const items:ChronistEncoded[]=[];for(let i=0;i<v.length;i++){const d=Object.getOwnPropertyDescriptor(v,String(i));if(!d||!Object.hasOwn(d,"value"))bad();items.push(encode(d!.value,depth+1));}return {t:"array",v:items};}
      if(Object.getPrototypeOf(v)!==Object.prototype&&Object.getPrototypeOf(v)!==null)bad();
      if(Object.getOwnPropertySymbols(v).length)bad();
      const entries:[string,ChronistEncoded][]=[];
      for(const key of Object.getOwnPropertyNames(v).sort()){const d=Object.getOwnPropertyDescriptor(v,key)!;
        if(denied.has(key)||!d.enumerable||!Object.hasOwn(d,"value"))bad();
        // Framework class markers are reserved even when disguised as user Plain Objects.
        if(key==="lg_name"&&(d.value==="DeltaSnapshot"||d.value==="Send"))bad();entries.push([key,encode(d.value,depth+1)]);}
      return {t:"object",v:entries};
    }finally{seen.delete(v);}
  };
  const result=encode(value,0);admitChronistValue(result);return result;
}
export function decodeChronistCheckpoint(value:unknown,options:ChronistCodecOptions={}):unknown {
  admitChronistValue(value);let count=0;
  const decode=(v:unknown,depth:number):unknown=>{
    if(++count>500_000||depth>40)bad();if(v===null||typeof v==="string"||typeof v==="boolean"||typeof v==="number")return v;
    if(!v||typeof v!=="object"||Array.isArray(v))bad();const row=v as Record<string,unknown>,keys=Object.keys(row).sort().join(",");
    switch(row.t){case "undefined":if(keys!=="t")bad();return undefined;
      case "error":if(keys!=="t,v"||row.v!=="graph-error")bad();return new Error("graph-error");
      case "array":if(keys!=="t,v"||!Array.isArray(row.v))bad();return (row.v as unknown[]).map(x=>decode(x,depth+1));
      case "object":{if(keys!=="t,v"||!Array.isArray(row.v))bad();const result:Record<string,unknown>={};let previous:string|null=null;
        for(const pair of row.v as unknown[]){if(!Array.isArray(pair)||pair.length!==2||typeof pair[0]!=="string"||denied.has(pair[0])||(previous!==null&&previous>=pair[0]))bad();
          previous=pair[0];const item=decode(pair[1],depth+1);if(pair[0]==="lg_name"&&(item==="Send"||item==="DeltaSnapshot"))bad();
          Object.defineProperty(result,pair[0],{value:item,writable:true,enumerable:true,configurable:true});}return result;}
      case "send":{if(keys!=="args,node,t,timeout"||typeof row.node!=="string"||(row.timeout!==null&&(!Number.isSafeInteger(row.timeout)||Number(row.timeout)<1||Number(row.timeout)>120_000)))bad();
        const send={node:row.node as string,args:decode(row.args,depth+1),timeout:row.timeout as number|null};if(!options.validateSend)bad();options.validateSend!(send);
        return options.restoreSend?options.restoreSend(send):{chronistSend:send};}
      default:return bad();}
  };return decode(value,0);
}
export function parseChronistCheckpointText(text:string,options:ChronistCodecOptions={}):unknown{
  if(typeof text!=="string"||Buffer.byteLength(text,"utf8")>16*1024*1024)bad();rejectDuplicateKeys(text);
  let value:unknown;try{value=JSON.parse(text);}catch{bad();}return decodeChronistCheckpoint(value,options);
}
