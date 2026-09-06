import { get } from "node:http";
import { it,expect } from "vitest";
import type { Db } from "../src/db/index.ts";
import { buildApp } from "../src/app.ts";

it("application shutdown drains a running database operation before closing its response",async()=>{
  let began!:()=>void,release!:()=>void;
  const started=new Promise<void>(resolve=>{began=resolve;}),continueQuery=new Promise<void>(resolve=>{release=resolve;});
  let completed=false;
  const db:Db={query:async()=>{began();await continueQuery;completed=true;return {rows:[],rowCount:0};},transaction:fn=>fn(db),close:async()=>{}};
  const app=await buildApp(db,{origin:"http://localhost",bootstrapToken:"b".repeat(32),cookieSecret:"c".repeat(32)});
  const address=await app.listen({host:"127.0.0.1",port:0});
  let request:ReturnType<typeof get>|undefined;
  const response=new Promise<{status:number;body:string;error?:string}>(resolve=>{
    request=get(`${address}/api/health`,res=>{let body="";res.setEncoding("utf8");res.on("data",part=>{body+=part;});res.on("end",()=>resolve({status:res.statusCode!,body}));});
    request.on("error",error=>resolve({status:0,body:"",error:error.message}));
  });
  let timer:ReturnType<typeof setTimeout>|undefined;
  try {
    await started;
    const closing=app.close();
    const early=await Promise.race([closing.then(()=>"closed"),response.then(()=>"response-closed"),new Promise<string>(resolve=>{timer=setTimeout(()=>resolve("draining"),50);})]);
    expect(early).toBe("draining");expect(completed).toBe(false);
    release();
    expect(await response).toEqual({status:200,body:'{"ok":true}'});
    await closing;expect(completed).toBe(true);
  } finally {clearTimeout(timer);release();request?.destroy();await app.close();}
},5000);
