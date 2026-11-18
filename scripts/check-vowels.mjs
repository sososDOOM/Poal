// Compares the vocalised forms from scripts/niqqud.mjs with the (cached) Wiktionary tables.
// Usage: node scripts/check-vowels.mjs [-v] [verbId ...]     (-v = print every mismatch)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseTables, cellFor } from "./wikt.mjs";
import { ALL_ROWS } from "./build-verbs.mjs";
import { buildVerb, autoId } from "./engine.mjs";
import { vocalise } from "./niqqud.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2), verbose = args.includes("-v"), only = args.filter(a => !a.startsWith("-"));
const canon = s => s.normalize("NFC").replace(/[֑-ֽֿ֯]/g, "").replace(/־/g, "-");
const pointed = s => /[ְ-ּ]/.test(s);
const strip = s => s.normalize("NFC").replace(/[֑-ׇ]/g, "").replace(/[ךםןףץ]/g, c => ({ "ך": "כ", "ם": "מ", "ן": "נ", "ף": "פ", "צ": "צ", "ץ": "צ" }[c] || c));

export function loadTables(title) {
  const f = path.join(here, ".cache", "wiktionary", encodeURIComponent(title) + ".json");
  if (!fs.existsSync(f)) return null;
  const j = JSON.parse(fs.readFileSync(f, "utf8")); return j.parse ? parseTables(j.parse.text, x => x) : null;
}

const stats = { verbs: 0, perfect: 0, forms: 0, ok: 0, bad: 0, skipped: 0, notCached: 0 };
const badVerbs = [];
for (const row of ALL_ROWS) {
  const opts = row[6] || {}, binyan = row[5], id = opts.id || autoId(binyan, row[4]);
  if (only.length && !only.includes(id)) continue;
  const v = buildVerb(row).verb, title = v.forms.past["3ms"][0];
  const voc = vocalise(binyan, opts.letters || row[4], opts);
  if (!voc) { stats.skipped++; continue; }
  const tables = loadTables(title);
  if (!tables || !tables.length) { stats.notCached++; continue; }
  let best = tables[0], bs = -1;
  for (const t of tables) { let sc = 0; for (const k of Object.keys(v.forms.past)) { const c = cellFor(t, "past", k); if (c && c.some(x => strip(x) === v.forms.past[k][0])) sc++; } if (sc > bs) { bs = sc; best = t; } }
  stats.verbs++; let bad = 0;
  const check = (label, mine, cell) => {
    if (!cell || !mine) return;
    const cands = cell.filter(pointed).map(canon); if (!cands.length) return;
    stats.forms++;
    if (cands.includes(canon(mine))) { stats.ok++; return; }
    bad++; stats.bad++; if (verbose || only.length) console.log(`✗ ${id} ${title} ${label}: mine ${mine} | wikt ${cands.join(" | ")}`);
  };
  for (const t of ["present", "past", "future", "imperative"]) for (const [k, m] of Object.entries(voc[t] || {})) check(`${t}.${k}`, m, cellFor(best, t, k));
  if (voc.infinitive) check("infinitive", voc.infinitive, best.nonfinite["to-infinitive"]);
  if (voc.passiveParticiple?.ms) check("passiveParticiple", voc.passiveParticiple.ms, best.nonfinite["passive participle"]);
  if (bad === 0) stats.perfect++; else badVerbs.push(`${id}(${bad})`);
}
console.log(stats, badVerbs.length ? "\nwith mismatches: " + badVerbs.join(" ") : "");
