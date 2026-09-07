// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { afterAll,beforeAll,describe,it,expect } from "vitest";
import { randomUUID } from "node:crypto";
import WebSocket from "ws";
import { buildApp } from "../src/app.ts";
import { createTestDb,migrate,type Db } from "../src/db/index.ts";
import { createIdentity } from "../src/identity/index.ts";
import { createCampaigns } from "../src/domain/campaigns.ts";
import { createDocuments } from "../src/domain/documents.ts";
import { createCommunication } from "../src/domain/communication.ts";
import { createGameplay } from "../src/domain/gameplay.ts";
import { Gone,Conflict } from "../src/domain/errors.ts";

describe("Authenticated realtime bus and deliberately authored messages",()=>{
  let db:Db,gm:string,player:string,actor:string,campaign:string,cookie:string,address:string,app:Awaited<ReturnType<typeof buildApp>>;
  const config={origin:"http://chronicle.test",cookieSecret:"a-long-cookie-key-that-is-at-least-32-bytes",bootstrapToken:"b".repeat(32)};
  beforeAll(async()=>{
    db=await createTestDb();await migrate(db);const auth=createIdentity(db,config);gm=(await auth.bootstrap("Kaya")).userId;
    const campaigns=createCampaigns(db);campaign=(await campaigns.createCampaign(gm,{name:"Live table"})).id;
    const invite=await campaigns.issueInvitation(gm,campaign),join=await campaigns.requestJoin(invite.code,{displayName:"Sera"});
    const approved=await campaigns.approveJoin(gm,campaign,join.id);player=approved.userId;actor=approved.actorId;
    cookie=(await auth.issueSession(player)).setCookie.split(";")[0]!;
    app=await buildApp(db,config);address=await app.listen({host:"127.0.0.1",port:0});
  },30_000);
  afterAll(async()=>{await app?.close();await db?.close();});
  it("does not change a player's sequence when only hidden content changes",async()=>{
    const docs=createDocuments(db),live=createCommunication(db);
    const input={title:"Twin",passages:[{inhalt:{kind:"absatz" as const,inhalt:[{text:"Known",marks:[]}]}},{inhalt:{kind:"absatz" as const,inhalt:[{text:"Hidden",marks:[]}]}}]};
    const entry=await docs.saveEntry(gm,campaign,input);await docs.revealPassage(gm,campaign,entry.passagen[0]!.pid,actor);
    const before=await live.sync(player,campaign);
    await docs.saveEntry(gm,campaign,{...input,expectedVersion:1,passages:input.passages.map((p,i)=>({...p,pid:entry.passagen[i]!.pid,inhalt:{...p.inhalt,inhalt:[{text:i?"Completely different hidden world":"Known",marks:[]}]}}))},entry.entryId);
    expect(await live.sync(player,campaign)).toBe(before);expect(await live.resume(player,campaign,before)).toEqual([]);
    await docs.revealPassage(gm,campaign,entry.passagen[1]!.pid,actor);
    expect(await live.sync(player,campaign)).toBe(before+1);expect(await live.resume(player,campaign,before)).toEqual([{type:"refresh",seq:before+1}]);
    const stored=await db.query("SELECT payload FROM events WHERE user_id=$1 AND campaign_id=$2",[player,campaign]);
    expect(JSON.stringify(stored.rows)).not.toContain("Hidden");
  });
  it("persists authored posts once, scopes retry, and physically purges table chat at session end",async()=>{
    const live=createCommunication(db),body={commandId:randomUUID(),kind:"letter" as const,body:"Termin am Samstag?"};
    const sent=await live.send(player,campaign,body);expect(await live.send(player,campaign,body)).toEqual(sent);
    await expect(live.send(player,campaign,{...body,body:"changed"})).rejects.toBeInstanceOf(Conflict);
    await expect(live.send(player,randomUUID(),body)).rejects.toBeInstanceOf(Gone);
    expect((await live.messages(player,campaign)).filter(m=>m.id===sent.id)).toHaveLength(1);
    await expect(live.send(player,campaign,{...body,commandId:randomUUID(),kind:"table"})).rejects.toBeInstanceOf(Gone);
    const game=createGameplay(db),scene=await game.createScene(gm,campaign,{name:"Abend",entryIds:[],fictionDate:"1. Herbst"});await game.startScene(gm,campaign,scene.id);
    const chat=await live.send(player,campaign,{...body,commandId:randomUUID(),kind:"table",body:"Noch einmal würfeln?"});
    await live.send(gm,campaign,{...body,commandId:randomUUID(),kind:"table",body:"Ja",parentId:chat.id});
    await db.query("UPDATE game_sessions SET ended_at=$2 WHERE campaign_id=$1",[campaign,Date.now()]);
    await live.purge();expect((await db.query("SELECT id FROM campaign_messages WHERE kind='table'")).rowCount).toBe(0);
    expect((await live.messages(player,campaign)).some(m=>m.id===sent.id)).toBe(true);
  });
  it("uses a real socket for scoped commands, resumable invalidation and revoked credential denial",async()=>{
    const socket=new WebSocket(address.replace("http:","ws:")+`/api/campaigns/${campaign}/live`,{headers:{origin:config.origin,cookie}});
    const packets:Record<string,unknown>[]=[];socket.on("message",data=>packets.push(JSON.parse(data.toString())));
    await expect.poll(()=>packets.some(p=>p.type==="welcome")).toBe(true);
    const commandId=randomUUID(),command={type:"command",commandId,payload:{kind:"message",body:{commandId,kind:"letter",body:"Socket contribution"}}};
    socket.send(JSON.stringify(command));socket.send(JSON.stringify(command));
    await expect.poll(()=>packets.filter(p=>p.type==="ack").length).toBe(2);
    expect(packets.filter(p=>p.type==="ack")[0]).toEqual(packets.filter(p=>p.type==="ack")[1]);
    expect((await createCommunication(db).messages(player,campaign)).filter(m=>m.body==="Socket contribution")).toHaveLength(1);
    socket.send(JSON.stringify({type:"resume",after:0}));await expect.poll(()=>packets.some(p=>p.type==="resumed")).toBe(true);
    expect(packets.filter(p=>p.type==="refresh").every(p=>Object.keys(p).sort().join(",")==="seq,type")).toBe(true);
    await db.query("UPDATE credentials SET revoked_at=$2 WHERE user_id=$1",[player,Date.now()]);
    const ackCount=packets.filter(p=>p.type==="ack").length;socket.send(JSON.stringify({...command,commandId:randomUUID()}));
    await expect.poll(()=>packets.some(p=>p.type==="error")).toBe(true);expect(packets.filter(p=>p.type==="ack")).toHaveLength(ackCount);
    socket.terminate();
  },20_000);
});
