import fs from 'node:fs';import vm from 'node:vm';const ctx={globalThis:{}};vm.runInNewContext(fs.readFileSync(new URL('./search-core.js',import.meta.url),'utf8'),ctx);const C=ctx.globalThis.TanukiCore;
const words=new Set(['むかんしん','おおむかし','いんちょうしつ','けいけんち','うえ','え']);
let r=C.search({inputs:[{token:'お',min:2,max:3},{token:'ん',min:2,max:3}],mode:'sequence',words});if(!r.results.some(x=>x.candidate==='おおむかんしん'))throw new Error('sequence example failed');
r=C.search({inputs:[{token:'お',min:2,max:3},{token:'ん',min:2,max:3}],lengthMin:'8',lengthMax:'',mode:'sequence',words});if(r.results.some(x=>x.candidate==='おおむかんしん'))throw new Error('length minimum failed');
r=C.search({inputs:[{token:'け',min:2,max:2},{token:'ょうしつ',min:1,max:1}],mode:'sequence',words});if(!r.results.some(x=>x.candidate==='けいけんちょうしつ'))throw new Error('second example failed');
if(C.individualCount('あいうえ','あいう')!==1||C.individualCount('あいえ','あいう')!==0)throw new Error('individual completeness failed');
r=C.search({inputs:[{token:'あいう',min:1,max:1},{token:'あい',min:1,max:1}],mode:'individual',words});if(r.results.some(x=>!x.candidate.includes('う')))throw new Error('individual candidate omitted a required character');
console.log('tanuki search tests passed');
