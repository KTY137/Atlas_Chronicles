// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { Send } from "@langchain/langgraph";
import { BaseCheckpointSaver, WRITES_IDX_MAP, type Checkpoint, type CheckpointMetadata, type CheckpointListOptions,
  type CheckpointTuple, type ChannelVersions, type PendingWrite } from "@langchain/langgraph-checkpoint";
import type { RunnableConfig } from "@langchain/core/runnables";
import { encodeChronistCheckpoint,decodeChronistCheckpoint,parseChronistCheckpointText,emptyChronistCheckpoints,validateChronistSend,
  type ChronistRunRow,type ChronistStoredCheckpoint,type ChronistSendData } from "@chronicle/io";
import type { Db } from "../../db/index.ts";
import { ChronistConflict } from "./sources.ts";
import { hashChronist } from "./store.ts";
type BoundTransaction=<T>(fn:(tx:Db,run:ChronistRunRow,at:number)=>Promise<T>)=>Promise<T>;
function codec(run:ChronistRunRow){return {validateSend:(send:ChronistSendData)=>validateChronistSend(run,send),
  readSend:(value:object):ChronistSendData|null=>{if(!(value instanceof Send))return null;
    for(const key of Object.getOwnPropertyNames(value)){const d=Object.getOwnPropertyDescriptor(value,key)!;
      if(!["lg_name","node","args","timeout"].includes(key)||!d.enumerable||!Object.hasOwn(d,"value"))throw new ChronistConflict("checkpoint-send");}
    if(Object.getOwnPropertySymbols(value).length)throw new ChronistConflict("checkpoint-send");
    const timeout=value.timeout;if(timeout&&Object.keys(timeout).some(k=>k!=="runTimeout"))throw new ChronistConflict("checkpoint-timeout");
    return {node:value.node,args:value.args,timeout:timeout?.runTimeout??null};},
  restoreSend:(send:ChronistSendData)=>Object.assign(Object.create(Send.prototype) as Send,{lg_name:"Send",node:send.node,args:send.args,timeout:send.timeout===null?undefined:{runTimeout:send.timeout}})};}
/** The real framework saver. Storage and writes live in the fenced run transaction. */
export class ChronistCheckpointSaver extends BaseCheckpointSaver {
  constructor(readonly runId:string,readonly transaction:BoundTransaction){super({
    dumpsTyped:async(value:unknown)=>transaction(async(_tx,run)=>["chronist-checkpoint-json-1",Buffer.from(JSON.stringify(encodeChronistCheckpoint(value,codec(run))),"utf8")]),
    loadsTyped:async(type:string,bytes:Uint8Array|string)=>{if(type!=="chronist-checkpoint-json-1")throw new ChronistConflict("checkpoint-serializer");
      return transaction(async(_tx,run)=>parseChronistCheckpointText(typeof bytes==="string"?bytes:Buffer.from(bytes).toString("utf8"),codec(run)));},
  });}
  private config(config:RunnableConfig){const c=config.configurable??{};
    if(c.thread_id!==this.runId||typeof(c.checkpoint_ns??"")!=="string"||String(c.checkpoint_ns??"").length>1024)throw new ChronistConflict("checkpoint-thread");
    const namespace=String(c.checkpoint_ns??""),id=c.checkpoint_id;
    if(id!==undefined&&(typeof id!=="string"||id.length>256))throw new ChronistConflict("checkpoint-id");
    if(namespace!==""&&!/^(work:[a-zA-Z0-9_-]+)(\|[a-zA-Z0-9_:-]+)*$/.test(namespace))throw new ChronistConflict("checkpoint-namespace");
    return {namespace,id:id as string|undefined};
  }
  private codec(run:ChronistRunRow){return codec(run);}
  private tuple(run:ChronistRunRow,stored:ChronistStoredCheckpoint):CheckpointTuple{
    const configurable={thread_id:this.runId,checkpoint_ns:stored.namespace,checkpoint_id:stored.id},codec=this.codec(run);
    return {config:{configurable},checkpoint:decodeChronistCheckpoint(stored.checkpoint,codec) as Checkpoint,
      metadata:decodeChronistCheckpoint(stored.metadata,codec) as CheckpointMetadata,
      ...(stored.parentId?{parentConfig:{configurable:{...configurable,checkpoint_id:stored.parentId}}}:{}),
      pendingWrites:stored.writes.map(w=>[w.taskId,w.channel,decodeChronistCheckpoint(w.value,codec)])};
  }
  override async getTuple(config:RunnableConfig):Promise<CheckpointTuple|undefined>{const {namespace,id}=this.config(config);
    return this.transaction(async(_tx,run)=>{const rows=run.checkpoints.checkpoints.filter(c=>c.namespace===namespace&&(!id||c.id===id)).sort((a,b)=>a.id<b.id?1:-1);
      return rows[0]?this.tuple(run,rows[0]):undefined;});
  }
  override async *list(config:RunnableConfig,options:CheckpointListOptions={}):AsyncGenerator<CheckpointTuple>{
    const {namespace,id}=this.config(config),before=options.before?this.config(options.before).id:undefined;
    const items=await this.transaction(async(_tx,run)=>run.checkpoints.checkpoints.filter(c=>(config.configurable?.checkpoint_ns===undefined||c.namespace===namespace)&&(!id||c.id===id)&&(!before||c.id<before))
      .sort((a,b)=>a.id<b.id?1:-1).map(c=>this.tuple(run,c)).filter(t=>!options.filter||Object.entries(options.filter).every(([key,value])=>hashChronist("checkpoint",(t.metadata as Record<string,unknown>)[key]??null)===hashChronist("checkpoint",value)))
      .slice(0,Math.max(0,Math.min(options.limit??256,256))));
    yield* items;
  }
  override async put(config:RunnableConfig,checkpoint:Checkpoint,metadata:CheckpointMetadata,newVersions:ChannelVersions):Promise<RunnableConfig>{
    const {namespace,id}=this.config(config);
    if(checkpoint.v!==4||typeof checkpoint.id!=="string"||!Number.isFinite(Date.parse(checkpoint.ts))||Object.hasOwn(metadata,"counters_since_delta_snapshot"))throw new ChronistConflict("checkpoint-schema");
    return this.transaction(async(_tx,run)=>{const codec=this.codec(run),store=run.checkpoints;
      const row:ChronistStoredCheckpoint={namespace,id:checkpoint.id,parentId:id??null,type:"chronist-checkpoint-json-1",
        checkpoint:encodeChronistCheckpoint(checkpoint,codec),metadata:encodeChronistCheckpoint(metadata,codec),newVersions:{...newVersions},writes:[]};
      const old=store.checkpoints.find(c=>c.namespace===namespace&&c.id===row.id);
      if(old){if(hashChronist("checkpoint",{...old,writes:[]})!==hashChronist("checkpoint",row))throw new ChronistConflict("checkpoint-conflict");}
      else store.checkpoints.push(row);
      // Each namespace stores full values. Retain latest plus its immediate predecessor.
      const same=store.checkpoints.filter(c=>c.namespace===namespace).sort((a,b)=>a.id<b.id?1:-1),keep=new Set(same.slice(0,2).map(c=>c.id));
      if(same.length>2){const pruned=store.prunedBefore.find(p=>p.namespace===namespace),boundary=same[2]!.id;
        if(pruned){if(pruned.checkpointId<boundary)pruned.checkpointId=boundary;}else store.prunedBefore.push({namespace,checkpointId:boundary});
        store.checkpoints=store.checkpoints.filter(c=>c.namespace!==namespace||keep.has(c.id));}
      return {configurable:{thread_id:this.runId,checkpoint_ns:namespace,checkpoint_id:checkpoint.id}};});
  }
  override async putWrites(config:RunnableConfig,writes:PendingWrite[],taskId:string):Promise<void>{const {namespace,id}=this.config(config);
    if(!id||typeof taskId!=="string"||taskId.length>256||writes.length>1024)throw new ChronistConflict("checkpoint-write");
    await this.transaction(async(_tx,run)=>{const stored=run.checkpoints.checkpoints.find(c=>c.namespace===namespace&&c.id===id);if(!stored)throw new ChronistConflict("checkpoint-pruned");
      for(const [index,[channel,value]] of writes.entries()){
        const write={taskId,index:WRITES_IDX_MAP[channel]??index,channel,value:encodeChronistCheckpoint(value,this.codec(run))};
        const old=stored.writes.find(w=>w.taskId===taskId&&w.index===write.index);
        if(old){if(write.index<0)Object.assign(old,write);else if(hashChronist("checkpoint",old)!==hashChronist("checkpoint",write))throw new ChronistConflict("checkpoint-write-conflict");}
        else stored.writes.push(write);
      }
    });
  }
  override async deleteThread(threadId:string):Promise<void>{if(threadId!==this.runId)throw new ChronistConflict("checkpoint-thread");
    await this.transaction(async(_tx,run)=>{run.checkpoints=emptyChronistCheckpoints();});}
}
