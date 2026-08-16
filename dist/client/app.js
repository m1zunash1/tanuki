'use strict';
const $ = id => document.getElementById(id);
const state = { dictionaries:new Map(), results:[], visible:30 };
const labels = { kobuta:'仔豚辞書', general:'一般語辞書', item:'イラスト辞書' };

function escapeHtml(s) { return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;'); }
function loadWords(ids) {
  const merged = new Set();
  for (const id of ids) {
    if (!state.dictionaries.has(id)) {
      const set = new Set(String(EMBEDDED_DICT_TEXT[id] || '').split(/\r?\n/).map(TanukiCore.normalize).filter(Boolean));
      state.dictionaries.set(id,set);
    }
    for (const word of state.dictionaries.get(id)) merged.add(word);
  }
  return merged;
}
function highlight(word, token, mode) {
  if (mode === 'sequence') return escapeHtml(word).split(escapeHtml(token)).join(`<mark>${escapeHtml(token)}</mark>`);
  const set = new Set(Array.from(TanukiCore.normalizeForIndividual(token)));
  return Array.from(TanukiCore.normalizeForIndividual(word)).map(c => set.has(c) ? `<mark>${escapeHtml(c)}</mark>` : escapeHtml(c)).join('');
}
function render() {
  const mode = document.querySelector('input[name="mode"]:checked').value;
  const a = mode === 'individual' ? TanukiCore.normalizeForIndividual($('remove1').value) : TanukiCore.normalize($('remove1').value);
  const b = mode === 'individual' ? TanukiCore.normalizeForIndividual($('remove2').value) : TanukiCore.normalize($('remove2').value);
  const shown = state.results.slice(0,state.visible);
  $('moreButton').hidden = shown.length >= state.results.length;
  if (!shown.length) { $('results').innerHTML = '<div class="empty-state"><span>空</span><p>この条件では候補が見つかりませんでした。</p></div>'; return; }
  $('results').innerHTML = shown.map((r,i) => `<article class="result-card" style="--i:${i}">
    <div class="candidate-line"><span class="number">${String(i+1).padStart(2,'0')}</span><h3>${highlight(r.candidate,a,mode)}</h3><span class="length">${r.length}文字</span></div>
    <div class="proof-grid">
      <div><span class="proof-label one">1を消す</span><p>${highlight(r.candidate,a,mode)}<i>→</i><strong>${escapeHtml(r.word1)}</strong></p></div>
      <div><span class="proof-label two">2を消す</span><p>${highlight(r.candidate,b,mode)}<i>→</i><strong>${escapeHtml(r.word2)}</strong></p></div>
    </div>
  </article>`).join('');
}
function runSearch() {
  $('error').textContent=''; $('searchButton').disabled=true; $('searchButton').classList.add('loading'); $('searchButton').querySelector('span').textContent='探しています…';
  setTimeout(() => {
    try {
      const ids=[...document.querySelectorAll('input[name="dictionary"]:checked')].map(x=>x.value);
      if (!ids.length) throw new Error('辞書を1つ以上選んでください。');
      const started=performance.now();
      const output=TanukiCore.search({ a:$('remove1').value,b:$('remove2').value,min:$('minLength').value,max:$('maxLength').value,mode:document.querySelector('input[name="mode"]:checked').value,words:loadWords(ids) });
      state.results=output.results; state.visible=30; render();
      $('summary').textContent=`${output.results.length.toLocaleString()}件 · ${Math.round(performance.now()-started).toLocaleString()}ms${output.truncated?' · 探索上限まで':''}`;
    } catch(e) { $('error').textContent=e.message; $('summary').textContent='入力を確認してください'; }
    finally { $('searchButton').disabled=false; $('searchButton').classList.remove('loading'); $('searchButton').querySelector('span').textContent='候補を探す'; }
  },30);
}
$('searchButton').addEventListener('click',runSearch);
$('swapButton').addEventListener('click',()=>{ const v=$('remove1').value; $('remove1').value=$('remove2').value; $('remove2').value=v; });
$('moreButton').addEventListener('click',()=>{ state.visible+=30; render(); });
document.querySelectorAll('.examples button').forEach(button=>button.addEventListener('click',()=>{ $('remove1').value=button.dataset.a; $('remove2').value=button.dataset.b; $('minLength').value=button.dataset.min; $('maxLength').value=button.dataset.max; document.querySelector('input[value="sequence"]').checked=true; runSearch(); }));
document.addEventListener('keydown',e=>{ if(e.key==='Enter' && e.target.matches('input')) runSearch(); });
