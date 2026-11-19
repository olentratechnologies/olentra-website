import { test, expect } from 'bun:test';
import { createOfferSchedules } from '../../src/modules/lifecycle/offer-schedules';
const admin:any={id:'admin',role:'company',staffRole:'admin'},student:any={id:'student',role:'intern',applicationId:'OL-1'};
function fixture() {
 const rows=new Map<string,any[]>();
 rows.set('applications',[{_id:'OL-1',name:'Alex',email:'a@example.test',programId:'software-engineer',program:'Software Engineer Intern',schedule:'part_time',status:'Selected',version:1}]);rows.set('settings',[{_id:'program',duration:'1 month',scheduleRevision:'config1'}]);rows.set('programs',[{_id:'software-engineer',stipend:5000}]);
 const matches=(row:any,filter:any)=>Object.entries(filter).every(([k,v]:any)=>v&&typeof v==='object'&&'$in'in v?v.$in.includes(row[k]):row[k]===v);
 const collection=(name:string)=>{if(!rows.has(name))rows.set(name,[]);const items=rows.get(name)!;return {
  findOne:async(f:any)=>items.find(r=>matches(r,f))||null,
  find:(f:any)=>({sort:()=>({toArray:async()=>items.filter(r=>matches(r,f))})}),
  insertOne:async(row:any)=>{items.push(structuredClone(row));},
  replaceOne:async(f:any,row:any)=>{const i=items.findIndex(r=>matches(r,f));if(i<0)items.push(structuredClone(row));else items[i]=structuredClone(row);},
  updateOne:async(f:any,u:any,o:any)=>{let row=items.find(r=>matches(r,f));if(!row&&o?.upsert){row={...f,...u.$setOnInsert};items.push(row);}if(row){Object.assign(row,u.$set||{});for(const k of Object.keys(u.$unset||{}))delete row[k];for(const[k,v]of Object.entries(u.$inc||{}))row[k]=(row[k]||0)+Number(v);}return {matchedCount:row?1:0};},
 };};
 return {service:createOfferSchedules(collection),rows,collection};
}
const start='2030-11-24';
async function send(f:any){const preview=await f.service.execute('offer.preview',{applicationId:'OL-1',startOn:start},admin);return f.service.execute('offer.send',{...preview,stipend:100},admin,{} as any);}
test('new offers require a reviewed current configuration and reject independent end dates',async()=>{
 const f=fixture();await expect(f.service.execute('offer.send',{applicationId:'OL-1',startOn:start,stipend:100},admin)).rejects.toMatchObject({code:'CONFLICT'});
 const reviewed=await f.service.execute('offer.preview',{applicationId:'OL-1',startOn:start},admin);
 f.rows.get('settings')![0].scheduleRevision='config2';
 await expect(f.service.execute('offer.send',{...reviewed,stipend:100},admin)).rejects.toMatchObject({code:'CONFLICT'});
 const updated=await f.service.execute('offer.preview',{applicationId:'OL-1',startOn:start},admin);
 await expect(f.service.execute('offer.send',{...updated,endOn:'2031-01-01',stipend:100},admin)).rejects.toMatchObject({code:'CONFLICT'});
 const sent=await send(f);expect(sent.endOn).toBe('2030-12-23');expect(sent.currentVersion).toBe(1);
 expect(sent.emailSnapshot.durationLabel).toBe('1 calendar month');
 f.rows.get('settings')![0].duration='3 months';expect(f.rows.get('offers')![0].endOn).toBe('2030-12-23');
 await expect(f.service.execute('offer.accept',{applicationId:'OL-1'},student)).rejects.toMatchObject({code:'CONFLICT'});
});
test('accepted schedules stay effective until a revision is accepted; stale and foreign decisions fail',async()=>{
 const f=fixture();await send(f);await f.service.execute('offer.accept',{applicationId:'OL-1',version:1},student);
 const input={applicationId:'OL-1',startOn:'2031-01-01',reason:'Student requested a later start',configRevision:'config1',revising:true};
 await f.service.execute('offer.revise',input,admin);let offer=f.rows.get('offers')![0];expect(offer.startOn).toBe(start);expect(offer.pendingRevision.version).toBe(2);
 await expect(f.service.execute('offer.revision.accept',{applicationId:'OL-1',version:1},student)).rejects.toMatchObject({code:'CONFLICT'});
 await expect(f.service.execute('offer.revision.accept',{applicationId:'OL-1',version:2},{...student,applicationId:'other'})).rejects.toMatchObject({code:'FORBIDDEN'});
 await f.service.execute('offer.revision.accept',{applicationId:'OL-1',version:2},student);offer=f.rows.get('offers')![0];expect(offer.startOn).toBe('2031-01-01');expect(offer.currentVersion).toBe(2);expect(offer.pendingRevision).toBeUndefined();
 expect(f.rows.get('offer_versions')![0].startOn).toBe(start);
});
test('declining a revision preserves accepted terms, and terminal internships cannot be revised',async()=>{
 const f=fixture();await send(f);await f.service.execute('offer.accept',{applicationId:'OL-1',version:1},student);
 await f.service.execute('offer.revise',{applicationId:'OL-1',startOn:'2031-01-01',reason:'Correction',configRevision:'config1'},admin);
 const result=await f.service.execute('offer.revision.decline',{applicationId:'OL-1',version:2},student);
 expect(result.startOn).toBe(start);expect(result.emailSnapshot.startOn).toBe(start);expect(result.emailStatus).toBe('offer-revision-declined');
 f.rows.set('certificates',[{_id:'cert',applicationId:'OL-1'}]);await expect(f.service.execute('offer.revise',{applicationId:'OL-1',startOn:start,reason:'Correction',configRevision:'config1'},admin)).rejects.toMatchObject({code:'CONFLICT'});
});
