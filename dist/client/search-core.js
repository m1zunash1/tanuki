(function (scope) {
  'use strict';
  const SMALL = { ぁ:'あ',ぃ:'い',ぅ:'う',ぇ:'え',ぉ:'お',ゃ:'や',ゅ:'ゆ',ょ:'よ',ゎ:'わ' };
  const HIRAGANA = /^[ぁ-ゖー]+$/u;
  const chars = value => Array.from(value);

  function normalize(value) { return String(value || '').normalize('NFKC').trim().replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60)); }
  function normalizeIndividual(value) { return chars(normalize(value)).map(c => SMALL[c] || c).join(''); }
  function deleteSequence(word, token) { return word.split(token).join(''); }
  function deleteIndividual(word, token) { const set=new Set(chars(normalizeIndividual(token))); return chars(normalizeIndividual(word)).filter(c=>!set.has(c)).join(''); }
  function sequenceCount(word, token) { return word.split(token).length - 1; }
  function frequencies(value) { const map=new Map(); for(const c of chars(value)) map.set(c,(map.get(c)||0)+1); return map; }
  function individualCount(word, token) {
    const have=frequencies(normalizeIndividual(word)); const need=frequencies(normalizeIndividual(token)); let units=null;
    for(const [c,n] of need){ const count=have.get(c)||0; if(count===0 || count%n!==0) return 0; const ratio=count/n; if(units===null) units=ratio; else if(units!==ratio) return 0; }
    return units||0;
  }
  function combinations(n,k){ let r=1; for(let i=1;i<=Math.min(k,n-k);i+=1) r=(r*(n-i+1))/i; return r; }
  function factorial(n){ let r=1; for(let i=2;i<=n;i+=1) r*=i; return r; }
  function isRepeatedWord(word){
    const list=chars(word);
    for(let unitLength=1;unitLength<=list.length/2;unitLength+=1){
      if(list.length%unitLength!==0)continue;
      let repeated=true;
      for(let i=unitLength;i<list.length;i+=1){if(list[i]!==list[i%unitLength]){repeated=false;break;}}
      if(repeated)return true;
    }
    return false;
  }
  function insertSize(input,k,mode){ return mode==='sequence' ? chars(input.token).length*k : chars(input.token).length*k; }
  function estimate(input,wordCount,mode){
    let total=0;
    for(let k=input.min;k<=input.max;k+=1){ const inserted=insertSize(input,k,mode); let variants=combinations(18+inserted,inserted); if(mode==='individual'){ const counts=frequencies(input.token); let permutations=factorial(inserted); for(const n of counts.values()) permutations/=factorial(n*k); variants*=permutations; } total+=variants; }
    return total*wordCount;
  }
  function generatedParts(input,k,mode){
    if(mode==='sequence') return new Map([[input.token,k]]);
    const map=frequencies(input.token); for(const [c,n] of map) map.set(c,n*k); return map;
  }
  function generate(base,parts,visit,budget){
    const baseChars=chars(base); const keys=[...parts.keys()];
    function walk(pos,out,remaining){
      if(budget.used>=budget.max) return;
      let left=0; for(const n of remaining.values()) left+=n;
      if(pos===baseChars.length && left===0){ budget.used+=1; visit(out.join('')); return; }
      if(pos<baseChars.length){ out.push(baseChars[pos]); walk(pos+1,out,remaining); out.pop(); }
      for(const key of keys){ const n=remaining.get(key)||0; if(!n) continue; remaining.set(key,n-1); out.push(key); walk(pos,out,remaining); out.pop(); remaining.set(key,n); if(budget.used>=budget.max) break; }
    }
    walk(0,[],new Map(parts));
  }
  function search(config){
    const mode=config.mode;
    if(!Array.isArray(config.inputs)||config.inputs.length<2||config.inputs.length>4) throw new Error('消す文字列は2〜4個にしてください。');
    const inputs=config.inputs.map((raw,index)=>{ const token=mode==='individual'?normalizeIndividual(raw.token):normalize(raw.token); if(!token)return {token:'',min:0,max:0,index,identity:true}; const min=Number(raw.min),max=Number(raw.max); if(!HIRAGANA.test(token)) throw new Error(`文字列${index+1}には、ひらがなを入力してください。`); if(!Number.isInteger(min)||!Number.isInteger(max)||min<1||max>6||min>max) throw new Error(`文字列${index+1}の含有数は1〜6で指定してください。`); return {token,min,max,index,identity:false}; });
    const activeInputs=inputs.filter(input=>!input.identity);
    if(activeInputs.length===0) throw new Error('消す対象を1つ以上入力してください。');
    if(new Set(activeInputs.map(x=>x.token)).size!==activeInputs.length) throw new Error('同じ消去文字列は複数指定できません。');
    const lengthMin=config.lengthMin===''||config.lengthMin==null?null:Number(config.lengthMin); const lengthMax=config.lengthMax===''||config.lengthMax==null?null:Number(config.lengthMax);
    if((lengthMin!==null&&(!Number.isInteger(lengthMin)||lengthMin<1))||(lengthMax!==null&&(!Number.isInteger(lengthMax)||lengthMax<1))||(lengthMin!==null&&lengthMax!==null&&lengthMin>lengthMax)) throw new Error('文字列の長さを正しく指定してください。');
    const words=new Set(); for(const word of config.words){ const w=mode==='individual'?normalizeIndividual(word):normalize(word); if(HIRAGANA.test(w)) words.add(w); }
    const remove=mode==='sequence'?deleteSequence:deleteIndividual; const count=mode==='sequence'?sequenceCount:individualCount;
    const source=[...activeInputs].sort((a,b)=>estimate(a,words.size,mode)-estimate(b,words.size,mode))[0];
    const bases=[...words].sort((a,b)=>chars(a).length-chars(b).length||a.localeCompare(b,'ja'));
    const found=new Map(); const budget={used:0,max:1500000};
    for(let k=source.min;k<=source.max&&budget.used<budget.max;k+=1){
      const parts=generatedParts(source,k,mode);
      for(const base of bases){
        const candidateLength=chars(base).length+insertSize(source,k,mode);
        if((lengthMin!==null&&candidateLength<lengthMin)||(lengthMax!==null&&candidateLength>lengthMax)) continue;
        if(remove(base,source.token)!==base) continue;
        generate(base,parts,candidate=>{
          if(remove(candidate,source.token)!==base || count(candidate,source.token)!==k) return;
          const outputs=[];
          for(const input of inputs){ if(input.identity){if(!words.has(candidate))return;outputs[input.index]=candidate;continue;} const amount=count(candidate,input.token); if(amount<input.min||amount>input.max) return; const output=remove(candidate,input.token); if(!output||!words.has(output)) return; outputs[input.index]=output; }
          if(config.omitRepeats&&(isRepeatedWord(candidate)||outputs.some(isRepeatedWord)))return;
          found.set(candidate,{candidate,outputs,length:chars(candidate).length});
        },budget);
        if(budget.used>=budget.max) break;
      }
    }
    return {results:[...found.values()].sort((a,b)=>a.length-b.length||a.candidate.localeCompare(b.candidate,'ja')),truncated:budget.used>=budget.max,checked:budget.used};
  }
  scope.TanukiCore={normalize,normalizeIndividual,deleteSequence,deleteIndividual,sequenceCount,individualCount,isRepeatedWord,search};
})(typeof window!=='undefined'?window:globalThis);
