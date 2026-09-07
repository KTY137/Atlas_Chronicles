// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import websocket from "@fastify/websocket";
import type { FastifyInstance } from "fastify";
import type { WebSocket } from "ws";
import { Type, type Static } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { WireInput, MessageDraft } from "@chronicle/protocol";
import type { Db } from "../db/index.ts";
import type { AppConfig } from "../app.ts";
import { createIdentity } from "../identity/index.ts";
import { createCampaigns } from "../domain/campaigns.ts";
import { createCommunication } from "../domain/communication.ts";
import { Gone, Conflict } from "../domain/errors.ts";

export async function registerRealtime(app:FastifyInstance,db:Db,config:AppConfig) {
  await app.register(websocket,{options:{maxPayload:64*1024},preClose:shutdown});
  const identity=createIdentity(db,config),campaigns=createCampaigns(db,config),service=createCommunication(db,config);
  interface Connection {socket:WebSocket;userId:string;campaignId:string;cookie:string;name:string;state:"online"|"away";seq:number;lastSeen:number}
  const connections=new Set<Connection>(); let closed=false,ticking=false;
  const emit=(c:Connection,payload:unknown)=>{if(c.socket.readyState===1) {if(c.socket.bufferedAmount>256*1024) c.socket.close(1013,"Slow reader"); else c.socket.send(JSON.stringify(payload));}};
  const authorize=async(c:Connection)=>{
    const me=await identity.authenticate(c.cookie); if(me.userId!==c.userId) throw new Gone();
    await campaigns.requireMember(c.userId,c.campaignId);
  };
  async function presence(campaignId:string) {
    const viewers=[...connections].filter(c=>c.campaignId===campaignId), users=new Map<string,{userId:string;displayName:string;state:string}>();
    for(const c of viewers) {const old=users.get(c.userId); if(!old||c.state==="online") users.set(c.userId,{userId:c.userId,displayName:c.name,state:c.state});}
    const packet={type:"presence",members:[...users.values()].sort((a,b)=>a.userId<b.userId?-1:1)};
    for(const c of viewers) {try {await authorize(c);emit(c,packet);} catch {c.socket.close(1008,"Unavailable");}}
  }
  async function refresh(campaignId?:string) {
    if(closed || ticking) return; ticking=true;
    try {
      const cursors=new Map<string,number>();
      for(const c of connections) {
        if(campaignId&&campaignId!==c.campaignId) continue;
        try {
          await authorize(c);const key=`${c.campaignId}/${c.userId}`;
          let seq=cursors.get(key); if(seq===undefined) {seq=await service.sync(c.userId,c.campaignId);cursors.set(key,seq);}
          if(seq>c.seq) {for(const event of await service.resume(c.userId,c.campaignId,c.seq)) {emit(c,event);c.seq=event.seq;}}
        } catch {c.socket.close(1008,"Unavailable");}
      }
    } finally {ticking=false;}
  }
  type Scope={campaignId:string};type Item=Scope&{id:string};
  app.get<{Params:Scope;Querystring:{kind?:"letter"|"table"}}>("/api/campaigns/:campaignId/messages",{schema:{querystring:Type.Object({kind:Type.Optional(Type.Union([Type.Literal("letter"),Type.Literal("table")]))},{additionalProperties:false})}},async req=>service.messages((await identity.authenticate(req.headers.cookie)).userId,req.params.campaignId,req.query.kind));
  app.post<{Params:Scope;Body:Static<typeof MessageDraft>}>("/api/campaigns/:campaignId/messages",{schema:{body:MessageDraft}},async req=>service.send((await identity.authenticate(req.headers.cookie)).userId,req.params.campaignId,req.body));
  app.delete<{Params:Item}>("/api/campaigns/:campaignId/messages/:id",async req=>{await service.remove((await identity.authenticate(req.headers.cookie)).userId,req.params.campaignId,req.params.id);return {ok:true};});
  app.get<{Params:Scope}>("/api/campaigns/:campaignId/live",{websocket:true,preValidation:async req=>{
    if(req.headers.origin!==new URL(config.origin).origin) throw new Gone();
    await campaigns.requireMember((await identity.authenticate(req.headers.cookie)).userId,req.params.campaignId);
  }},(socket,req)=>{
    if(closed){socket.close(1001,"Server wird beendet");return;}
    let connection:Connection|undefined; let count=0,windowAt=Date.now();
    // Attach message handlers synchronously before the first database await.
    const ready=(async()=>{
      const me=await identity.authenticate(req.headers.cookie),member=await campaigns.requireMember(me.userId,req.params.campaignId);
      if(socket.readyState!==1) return;
      if([...connections].filter(c=>c.userId===me.userId).length>=8) {socket.close(1008,"Too many connections");return;}
      const seq=await service.sync(me.userId,req.params.campaignId);
      connection={socket,userId:me.userId,campaignId:req.params.campaignId,cookie:req.headers.cookie??"",name:member.displayName,state:"online",seq,lastSeen:Date.now()};
      if(socket.readyState!==1)return;connections.add(connection);emit(connection,{type:"welcome",seq});await presence(connection.campaignId);
    })().catch(()=>socket.close(1008,"Unavailable"));
    let serial=Promise.resolve(),pending=0;
    socket.on("message",data=>{
      if(Date.now()-windowAt>60_000){count=0;windowAt=Date.now();}count++;pending++;
      if(count>120||pending>16){socket.close(1008,"Rate limited");return;}
      serial=serial.then(async()=>{
        await ready;const c=connection;if(!c||socket.readyState!==1)return;
        try {
          await authorize(c);c.lastSeen=Date.now();const message:unknown=JSON.parse(data.toString());
          if(!Value.Check(WireInput,message))throw new Gone();
          switch(message.type){
            case "ping":emit(c,{type:"pong"});break;
            case "presence":c.state=message.state;await presence(c.campaignId);break;
            case "resume": {
              const seq=await service.sync(c.userId,c.campaignId);if(message.after>seq)throw new Gone();
              const events=await service.resume(c.userId,c.campaignId,message.after);
              for(const event of events)emit(c,event);c.seq=events.at(-1)?.seq??message.after;
              emit(c,{type:"resumed",seq:c.seq});break;
            }
            case "command": {
              const result=await service.execute(c.userId,c.campaignId,message);await authorize(c);
              emit(c,{type:"ack",commandId:message.commandId,result});await refresh(c.campaignId);break;
            }
          }
        } catch(error) {if(error instanceof Conflict)emit(c,{type:"error",error:"Konflikt"});else if(error instanceof Gone)emit(c,{type:"error",error:"Nicht verfügbar"});else emit(c,{type:"error",error:"Befehl fehlgeschlagen"});}
      }).catch(()=>socket.close(1011,"Unavailable")).finally(()=>{pending--;});
    });
    socket.on("close",()=>{const c=connection;if(c){connections.delete(c);void presence(c.campaignId);}});
    socket.on("error",()=>socket.close());
  });
  // Coalesced viewer-specific invalidations: hidden edits never increment another reader's sequence.
  app.addHook("onResponse",async(req,reply)=>{if(!["GET","HEAD","OPTIONS"].includes(req.method)&&reply.statusCode<300){const campaignId=/^\/api\/campaigns\/([^/]+)/.exec(req.url)?.[1];void refresh(campaignId);}});
  const timer=setInterval(()=>{for(const c of connections)if(Date.now()-c.lastSeen>90_000)c.socket.close(1001,"Idle");void refresh();},5000);timer.unref();
  const purge=setInterval(()=>{void service.purge().catch(error=>app.log.error(error));},60_000);purge.unref();
  // Shutdown owns EVERY socket the ws server knows (also those still inside the auth window and not
  // yet in `connections`): stop accepting upgrades, send a real 1001 so clients can resume later,
  // give peers one second to acknowledge, terminate stragglers, then close the ws server. Bounded:
  // app.close() can never wait on a peer, and a browser keep-alive cannot hold the process past
  // Docker's stop grace. Replaces the plugin's default preClose (no close code, ws 30 s timeout).
  async function shutdown():Promise<void> {
    closed=true;clearInterval(timer);clearInterval(purge);connections.clear();
    app.server.removeAllListeners("upgrade");
    const wss=app.websocketServer, clients=[...wss.clients];
    for(const ws of clients)try{ws.close(1001,"Server wird beendet");}catch{ws.terminate();}
    await new Promise<void>(resolve=>{
      const done=()=>{clearTimeout(grace);resolve();};
      const grace=setTimeout(()=>{for(const ws of clients)if(ws.readyState!==3)ws.terminate();done();},1000);
      let left=clients.length;if(left===0)done();
      for(const ws of clients){if(ws.readyState===3){if(--left===0)done();}else ws.once("close",()=>{if(--left===0)done();});}
    });
    await Promise.race([new Promise<void>(resolve=>wss.close(()=>resolve())),new Promise<void>(resolve=>setTimeout(resolve,2000).unref())]);
  }
}
