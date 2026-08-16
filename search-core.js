(function (scope) {
  'use strict';
  const SMALL = { ぁ:'あ',ぃ:'い',ぅ:'う',ぇ:'え',ぉ:'お',ゃ:'や',ゅ:'ゆ',ょ:'よ',ゎ:'わ' };
  const HIRAGANA = /^[ぁ-ゖー]+$/u;
  const chars = (s) => Array.from(s);

  function normalize(value) {
    return String(value || '').normalize('NFKC').trim().replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60));
  }
  function normalizeForIndividual(value) {
    return chars(normalize(value)).map(c => SMALL[c] || c).join('');
  }
  function deleteSequence(word, token) { return word.split(token).join(''); }
  function deleteIndividual(word, token) {
    const set = new Set(chars(normalizeForIndividual(token)));
    return chars(normalizeForIndividual(word)).filter(c => !set.has(c)).join('');
  }
  function combinations(n, k) {
    let r = 1;
    for (let i = 1; i <= Math.min(k, n - k); i += 1) r = (r * (n - i + 1)) / i;
    return r;
  }
  function estimate(wordsByLength, target, token, mode) {
    const unit = mode === 'sequence' ? chars(token).length : 1;
    let total = 0;
    for (let k = 1; k * unit < target; k += 1) {
      const n = target - k * unit;
      const count = (wordsByLength.get(n) || []).length;
      const variants = mode === 'individual' ? Math.pow(new Set(chars(token)).size, k) : 1;
      total += count * combinations(n + k, k) * variants;
    }
    return total;
  }

  function generate(base, token, count, mode, visit, budget) {
    const baseChars = chars(base);
    const inserts = mode === 'sequence' ? [token] : [...new Set(chars(token))];
    function walk(basePos, remaining, parts) {
      if (budget.used >= budget.max) return;
      if (basePos === baseChars.length && remaining === 0) {
        budget.used += 1; visit(parts.join('')); return;
      }
      if (basePos < baseChars.length) {
        parts.push(baseChars[basePos]); walk(basePos + 1, remaining, parts); parts.pop();
      }
      if (remaining > 0) {
        for (const insert of inserts) {
          parts.push(insert); walk(basePos, remaining - 1, parts); parts.pop();
          if (budget.used >= budget.max) break;
        }
      }
    }
    walk(0, count, []);
  }

  function search(config) {
    const mode = config.mode;
    const a = mode === 'individual' ? normalizeForIndividual(config.a) : normalize(config.a);
    const b = mode === 'individual' ? normalizeForIndividual(config.b) : normalize(config.b);
    if (!a || !b || !HIRAGANA.test(a) || !HIRAGANA.test(b)) throw new Error('入力1・2には、ひらがなを入力してください。');
    if (a === b) throw new Error('異なる2つの文字列を入力してください。');
    const min = Number(config.min), max = Number(config.max);
    if (!Number.isInteger(min) || !Number.isInteger(max) || min < 2 || max > 24 || min > max) throw new Error('文字数は2〜24の範囲で正しく指定してください。');
    const wordSet = config.words;
    const byLength = new Map();
    for (const word of wordSet) {
      const normalized = mode === 'individual' ? normalizeForIndividual(word) : normalize(word);
      if (!HIRAGANA.test(normalized)) continue;
      const len = chars(normalized).length;
      if (!byLength.has(len)) byLength.set(len, []);
      byLength.get(len).push(normalized);
    }
    const remove = mode === 'sequence' ? deleteSequence : deleteIndividual;
    const found = new Map();
    const budget = { used: 0, max: 1500000 };
    for (let target = min; target <= max && budget.used < budget.max; target += 1) {
      const sides = [
        { token:a, other:b, flip:false, cost:estimate(byLength,target,a,mode) },
        { token:b, other:a, flip:true, cost:estimate(byLength,target,b,mode) },
      ].sort((x,y) => x.cost-y.cost);
      const side = sides[0];
      const unit = mode === 'sequence' ? chars(side.token).length : 1;
      for (let k = 1; k * unit < target && budget.used < budget.max; k += 1) {
        const baseLength = target - k * unit;
        for (const base of byLength.get(baseLength) || []) {
          if (remove(base, side.token) !== base) continue;
          generate(base, side.token, k, mode, candidate => {
            if (chars(candidate).length !== target || remove(candidate, side.token) !== base) return;
            const otherWord = remove(candidate, side.other);
            if (!otherWord || !wordSet.has(otherWord)) return;
            const word1 = side.flip ? otherWord : base;
            const word2 = side.flip ? base : otherWord;
            found.set(candidate, { candidate, word1, word2, length:target });
          }, budget);
          if (budget.used >= budget.max) break;
        }
      }
    }
    return { results:[...found.values()].sort((x,y) => x.length-y.length || x.candidate.localeCompare(y.candidate,'ja')), truncated:budget.used>=budget.max, checked:budget.used };
  }
  scope.TanukiCore = { normalize, normalizeForIndividual, deleteSequence, deleteIndividual, search };
})(typeof window !== 'undefined' ? window : globalThis);
