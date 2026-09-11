// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import type { RoadPlan } from "@chronicle/szene";
import { abstandPolygonStrecke, huelle, imPolygon, type Polygon, type Punkt } from "./polygon.ts";
import type { RoadRouteReport } from "./road-routing.ts";

const orientation = (a: Punkt, b: Punkt, p: Punkt) => (b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]);
const crosses = (a: Punkt,b: Punkt,c: Punkt,d: Punkt) => orientation(a,b,c)*orientation(a,b,d)<0 && orientation(c,d,a)*orientation(c,d,b)<0;
export interface RoadNetworkReport { readonly components: number; readonly unreachableBuildings: readonly string[]; readonly unreachableNodes: readonly string[]; readonly singleLinks: readonly string[] }
/** Geometry-derived diagnostics, never an authorization or a second saved graph. Building
 * reachability follows its actual street reference; touching road bands are connected. */
export function inspectRoadNetwork(roads: readonly { id: string; umriss: Polygon }[], buildings: readonly { id: string; strasse: string }[], width: number, height: number, plan: RoadPlan, routes: readonly RoadRouteReport[]): RoadNetworkReport {
  const parent=roads.map((_,i)=>i), root=(i:number):number=>{while(parent[i]!==i){parent[i]=parent[parent[i]!]!;i=parent[i]!;}return i;};
  const boxes=roads.map(r=>huelle(r.umriss)), buckets=new Map<string,number[]>(), seen=new Set<string>();
  for(let i=0;i<roads.length;i++){
    const b=boxes[i]!;
    for(let y=Math.floor(b[1]/8);y<=Math.floor(b[3]/8);y++)for(let x=Math.floor(b[0]/8);x<=Math.floor(b[2]/8);x++){
      const key=`${x}:${y}`, list=buckets.get(key)??[];
      for(const j of list){const pair=`${j}:${i}`;if(seen.has(pair))continue;seen.add(pair);const c=boxes[j]!;
        if(b[0]>c[2]+.002||b[2]<c[0]-.002||b[1]>c[3]+.002||b[3]<c[1]-.002)continue;
        const a=roads[i]!.umriss,other=roads[j]!.umriss;
        if(a.some((p,k)=>other.some((v,l)=>crosses(p,a[(k+1)%a.length]!,v,other[(l+1)%other.length]!)))||a.some(p=>imPolygon(p,other))||other.some(p=>imPolygon(p,a))||a.some((p,k)=>abstandPolygonStrecke(other,p,a[(k+1)%a.length]!)<=.002))parent[root(i)]=root(j);
      }
      list.push(i);buckets.set(key,list);
    }
  }
  const entryRoots=new Set<number>();
  for(let i=0;i<roads.length;i++)if(roads[i]!.umriss.some(([x,y])=>x<=.002||y<=.002||x>=width-.002||y>=height-.002))entryRoots.add(root(i));
  for(const node of plan.knoten.filter(n=>n.art==="tor")){const p:Punkt=[node.position[0]*width,node.position[1]*height];roads.forEach((r,i)=>{if(imPolygon(p,r.umriss))entryRoots.add(root(i));});}
  const indices=new Map(roads.map((r,i)=>[r.id,i]));
  const unreachableBuildings=buildings.filter(b=>{const i=indices.get(b.strasse);return i===undefined||!entryRoots.has(root(i));}).map(b=>b.id);
  const unreachableNodes=plan.knoten.filter(n=>{const p:Punkt=[n.position[0]*width,n.position[1]*height];return !roads.some((r,i)=>entryRoots.has(root(i))&&imPolygon(p,r.umriss));}).map(n=>n.id);
  // These cut links describe the USER'S plan, not alleged choke points in the automatic roads.
  const successful=routes.filter(r=>r.status==="gebaut");
  const singleLinks=successful.filter(edge=>{
    const reached=new Set([edge.von]),queue=[edge.von];for(let i=0;i<queue.length;i++)for(const e of successful){if(e.id===edge.id)continue;const next=e.von===queue[i]?e.nach:e.nach===queue[i]?e.von:undefined;if(next&&!reached.has(next)){reached.add(next);queue.push(next);}}
    return !reached.has(edge.nach);
  }).map(e=>e.id);
  return {components:new Set(roads.map((_,i)=>root(i))).size,unreachableBuildings,unreachableNodes,singleLinks};
}
