// Shared reader for cached English-Wiktionary conjugation tables (CC BY-SA 4.0; read-only use, see README).
export const textOf = h => h.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).replace(/\s+/g, " ").trim();
export function parseTables(html, norm = x => x) {
  const out = [];
  for (const tm of html.matchAll(/<table[^>]*inflection-table[^>]*>([\s\S]*?)<\/table>/g)) {
    const tb = tm[1];
    if (!/Conjugation of|past|imperative/i.test(textOf(tb)) || !/to-infinitive|infinitive/i.test(textOf(tb))) continue;
    const t = { nonfinite: {}, past: {}, present: [], future: {}, imperative: {} };
    let section = null;
    for (const rm of tb.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)) {
      const ths = [], tds = [];
      for (const cm of rm[1].matchAll(/<(th|td)([^>]*)>([\s\S]*?)<\/\1>/g)) {
        if (cm[1] === "th") ths.push(textOf(cm[3]).toLowerCase());
        else tds.push([...cm[3].matchAll(/<span[^>]*lang="he"[^>]*>((?:[^<]|<(?!\/?span)[^>]*>)*)<\/span>/g)].flatMap(m => textOf(m[1]).split(/[\/,]/).map(x => norm(x.trim()))).filter(Boolean));
      }
      let person = null;
      for (const th of ths) {
        if (["past", "present", "future", "imperative"].includes(th)) section = th;
        else if (["first", "second", "third", "positive"].includes(th)) person = th;
        else if (/infinitive|action noun|passive participle/.test(th)) { section = "nonfinite"; person = th; }
      }
      if (!tds.length || !section) continue;
      if (section === "nonfinite") t.nonfinite[person] = tds[0];
      else if (section === "present") t.present = tds;
      else if (person) t[section][person] = tds;
    }
    out.push(t);
  }
  return out;
}

// where each of our keys lives in Wiktionary's table: [section, person row, cell index]
export const POS = {
  past: { "1s": ["first", 0], "1p": ["first", 1], "2ms": ["second", 0], "2fs": ["second", 1], "2mp": ["second", 2], "2fp": ["second", 3], "3ms": ["third", 0], "3fs": ["third", 1], "3p": ["third", 2] },
  future: { "1s": ["first", 0], "1p": ["first", 1], "2ms": ["second", 0], "2fs": ["second", 1], "2p": ["second", 2], "2fp": ["second", 3], "3ms": ["third", 0], "3fs": ["third", 1], "3p": ["third", 2], "3fp": ["third", 3] },
  imperative: { ms: ["positive", 0], fs: ["positive", 1], p: ["positive", 2], fp: ["positive", 3] },
};
export function cellFor(tbl, tense, key) {
  if (tense === "present") return tbl.present[{ ms: 0, fs: 1, mp: 2, fp: 3 }[key]];
  const p = POS[tense]?.[key]; return p && tbl[tense][p[0]]?.[p[1]];
}

