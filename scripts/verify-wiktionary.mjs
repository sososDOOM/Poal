// Independent check of data/verbs.json against English Wiktionary's Hebrew conjugation tables.
// Wiktionary text is licensed CC BY-SA 4.0 (https://en.wiktionary.org). We only READ it to find disagreements;
// no Wiktionary text is stored in the shipped data. Raw API responses are cached under scripts/.cache (git-ignored).
//
// Usage: node scripts/verify-wiktionary.mjs [--refresh] [--cache-only] [verbId ...]
// Output: a report of disagreements, plus scripts/.cache/report.json
import fs from "node:fs";
import path from "node:path";
import { parseTables as parseTablesRaw, cellFor } from "./wikt.mjs";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const cacheDir = path.join(here, ".cache", "wiktionary");
fs.mkdirSync(cacheDir, { recursive: true });
const data = JSON.parse(fs.readFileSync(path.join(here, "..", "data", "verbs.json"), "utf8"));
const args = process.argv.slice(2), refresh = args.includes("--refresh"), cacheOnly = args.includes("--cache-only"), only = args.filter(a => !a.startsWith("--"));
const UA = "poal-verify/0.1 (Hebrew verb practice site; read-only spot checks)";
const strip = s => s.normalize("NFC").replace(/[֑-ׇ]/g, "").replace(/[־'"׳״\s]/g, "").replace(/[ךםןףץ]/g, c => ({ "ך": "כ", "ם": "מ", "ן": "נ", "ף": "פ", "ץ": "צ" }[c]));
const skel = s => strip(s).replace(/[וי]/g, "");
const DELAY = +(args.find(a => a.startsWith("--delay="))?.slice(8) || 1500);
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function getPage(title) {
  const f = path.join(cacheDir, encodeURIComponent(title) + ".json");
  if (!refresh && fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, "utf8"));
  if (cacheOnly) return { error: { code: "not-cached" } };
  const url = `https://en.wiktionary.org/w/api.php?action=parse&page=${encodeURIComponent(title)}&prop=text&redirects=1&format=json&formatversion=2`;
  for (let attempt = 1; attempt <= 6; attempt++) { // be polite: one request at a time, back off when asked to slow down
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    const body = await res.text();
    try { const j = JSON.parse(body); fs.writeFileSync(f, JSON.stringify(j)); await sleep(DELAY); return j; }
    catch { console.error(`  rate-limited on ${title} (attempt ${attempt}); waiting ${attempt * 30}s`); await sleep(attempt * 30000); }
  }
  throw new Error("gave up after repeated rate limiting");
}

const parseTables = html => parseTablesRaw(html, strip);
const verbs = only.length ? only.map(id => data.verbs.find(v => v.id === id)).filter(Boolean) : data.verbs; // ids given on the command line are checked in that order
const report = [], summary = { ok: 0, soft: 0, hard: 0, missingCell: 0, noPage: 0 };
for (const v of verbs) {
  const title = v.forms.past["3ms"][0];
  let page; try { page = await getPage(title); } catch (e) { report.push({ id: v.id, title, status: "fetch-error", msg: String(e) }); continue; }
  if (page.error || !page.parse) { summary.noPage++; report.push({ id: v.id, title, status: "no-page" }); continue; }
  const tables = parseTables(page.parse.text);
  // pick the table that agrees best with ours (a page can hold several verbs/binyanim)
  let best = null, bestScore = -1;
  for (const tbl of tables) {
    let sc = 0;
    for (const t of ["past", "present"]) for (const [k, alts] of Object.entries(v.forms[t] || {})) { const c = cellFor(tbl, t, k); if (c && alts.some(a => c.includes(strip(a)))) sc++; }
    if (sc > bestScore) { bestScore = sc; best = tbl; }
  }
  if (!best) { summary.noPage++; report.push({ id: v.id, title, status: "no-table" }); continue; }
  const issues = [];
  const check = (label, mine, cell) => {
    if (!cell) { summary.missingCell++; return; }
    const m = mine.map(strip);
    if (m.some(x => cell.includes(x))) { summary.ok++; return; }
    if (m.some(x => cell.some(c => skel(c) === skel(x)))) { summary.soft++; issues.push({ label, kind: "soft", mine: mine.join("|"), theirs: cell.join(" | ") }); return; }
    summary.hard++; issues.push({ label, kind: "HARD", mine: mine.join("|"), theirs: cell.join(" | ") });
  };
  for (const t of ["present", "past", "future", "imperative"]) for (const [k, alts] of Object.entries(v.forms[t] || {})) check(`${t}.${k}`, alts, cellFor(best, t, k));
  if (v.forms.infinitive) check("infinitive", v.forms.infinitive, best.nonfinite["to-infinitive"]);
  if (v.forms.verbalNoun) check("verbalNoun", v.forms.verbalNoun, best.nonfinite["action noun"]);
  if (v.forms.passiveParticiple) check("passiveParticiple.ms", v.forms.passiveParticiple.ms, best.nonfinite["passive participle"]);
  report.push({ id: v.id, title, status: "checked", score: bestScore, issues });
}
fs.writeFileSync(path.join(here, ".cache", "report.json"), JSON.stringify(report, null, 1));
for (const r of report) {
  if (r.status !== "checked") { console.log(`? ${r.id} (${r.title}): ${r.status}`); continue; }
  for (const i of r.issues) console.log(`${i.kind === "HARD" ? "✗" : "~"} ${r.id} ${r.title} ${i.label}: mine ${i.mine}  | wikt ${i.theirs}`);
}
console.log("\nsummary", summary);
