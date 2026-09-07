// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { beforeAll,afterAll,describe,it,expect } from "vitest";
import { randomUUID } from "node:crypto";
import { createPgDb,migrate,type Db } from "../src/db/index.ts";
import { createIdentity } from "../src/identity/index.ts";
import { createCampaigns } from "../src/domain/campaigns.ts";
import { createDocuments } from "../src/domain/documents.ts";
import { Gone,Conflict } from "../src/domain/errors.ts";

const connection=process.env["TEST_DATABASE_URL"];
const schema=`chronicle_concurrency_${randomUUID().replaceAll("-","")}`;
const paragraph=(text:string)=>({inhalt:{kind:"absatz" as const,inhalt:[{text,marks:[]}]}});
function deferred(){let resolve!:()=>void;const promise=new Promise<void>(done=>{resolve=done;});return {promise,resolve};}

// PGlite intentionally serializes transactions; real Postgres is required for these interleavings.
describe.skipIf(!connection)("document changes and grants are serializable on Postgres",()=>{
  let admin:Db,db:Db,gm:string,player:string,actor:string,campaign:string;
  beforeAll(async()=>{
    admin=createPgDb(connection!);await admin.query(`CREATE SCHEMA "${schema}"`);
    const url=new URL(connection!);url.searchParams.set("options",`-c search_path=${schema}`);url.searchParams.set("application_name",schema);
    db=createPgDb(url.href);await migrate(db);
    gm=(await createIdentity(db,{origin:"https://concurrency.test",cookieSecret:"a-test-secret-of-at-least-thirty-two-bytes"}).bootstrap("Kaya")).userId;
    const campaigns=createCampaigns(db);campaign=(await campaigns.createCampaign(gm,{name:"Serialized manuscripts"})).id;
    const invitation=await campaigns.issueInvitation(gm,campaign),join=await campaigns.requestJoin(invitation.code,{displayName:"Sera"});
    const approved=await campaigns.approveJoin(gm,campaign,join.id);player=approved.userId;actor=approved.actorId;
  },30_000);
  afterAll(async()=>{
    await db?.close();
    if(admin){if(!/^chronicle_concurrency_[a-f0-9]{32}$/.test(schema))throw new Error("Unexpected test schema");await admin.query(`DROP SCHEMA "${schema}" CASCADE`);await admin.close();}
  });
  async function settleOrBlock(result:Promise<unknown>){
    let settled=false;void result.then(()=>{settled=true;},()=>{settled=true;});
    await expect.poll(async()=>settled || (await admin.query<{blocked:boolean}>("SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE application_name=$1 AND wait_event_type='Lock') AS blocked",[schema])).rows[0]!.blocked,{timeout:5000}).toBe(true);
  }
  it("rechecks merge audiences after an overlapping grant transaction commits",async()=>{
    const docs=createDocuments(db),entry=await docs.saveEntry(gm,campaign,{title:"The gate",passages:[paragraph("FIRST "),paragraph("SECOND")]});
    const inserted=deferred(),release=deferred();
    const grant=db.transaction(async tx=>{
      await tx.query("SELECT id FROM campaigns WHERE id=$1 FOR UPDATE",[campaign]);
      await tx.query("INSERT INTO revelations(campaign_id,actor_id,passage_id,granted_at,granted_by) VALUES($1,$2,$3,$4,$5)",[campaign,actor,entry.passagen[0]!.pid,Date.now(),gm]);
      inserted.resolve();await release.promise;
    });
    await inserted.promise;
    const merge=docs.saveEntry(gm,campaign,{title:"The gate",expectedVersion:1,passages:[{...paragraph("FIRST SECOND"),pid:entry.passagen[0]!.pid}]},entry.entryId);
    try {await settleOrBlock(merge);}finally{release.resolve();await grant;}
    await expect(merge).rejects.toBeInstanceOf(Conflict);
    const reader=await docs.getEntry(player,campaign,entry.entryId);
    expect(JSON.stringify(reader)).not.toContain("SECOND");
    expect((await docs.history(gm,campaign,entry.entryId))).toHaveLength(1);
  });
  it("does not acknowledge a grant for a passage retired by an overlapping transaction",async()=>{
    const docs=createDocuments(db),entry=await docs.saveEntry(gm,campaign,{title:"Retiring a passage",passages:[paragraph("An old draft")]});
    const retired=deferred(),release=deferred();
    const edit=db.transaction(async tx=>{
      await tx.query("SELECT id FROM campaigns WHERE id=$1 FOR UPDATE",[campaign]);
      await tx.query("SELECT id FROM entries WHERE id=$1 FOR UPDATE",[entry.entryId]);
      await tx.query("UPDATE passages SET retired_at_revision=$2 WHERE id=$1",[entry.passagen[0]!.pid,entry.revisionId]);
      retired.resolve();await release.promise;
    });
    await retired.promise;
    const grant=docs.revealPassage(gm,campaign,entry.passagen[0]!.pid,actor);
    try {await settleOrBlock(grant);}finally{release.resolve();await edit;}
    await expect(grant).rejects.toBeInstanceOf(Gone);
    expect((await db.query("SELECT 1 FROM revelations WHERE actor_id=$1 AND passage_id=$2",[actor,entry.passagen[0]!.pid])).rowCount).toBe(0);
  });
});
