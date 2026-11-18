// Validates data/verbs.json. Usage: node scripts/validate-verbs.mjs [path]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const file = process.argv[2] || path.join(here, "..", "data", "verbs.json");

// Person keys required for each tense, in order. Keep in sync with js/config.js.
// OPTIONAL holds the formal feminine-plural forms (תכתובנה), which every generated verb has but hand-edits may omit.
const SHAPE = {
  present: ["ms", "fs", "mp", "fp"],
  past: ["1s", "2ms", "2fs", "3ms", "3fs", "1p", "2mp", "2fp", "3p"],
  future: ["1s", "2ms", "2fs", "3ms", "3fs", "1p", "2p", "3p"],
  imperative: ["ms", "fs", "p"],
};
const OPTIONAL = { future: ["2fp", "3fp"], imperative: ["fp"] };
const PARTICIPLE = ["ms", "fs", "mp", "fp"];
const PASSIVE = ["pual", "hufal"]; // no infinitive / imperative
const BINYANIM = ["paal", "piel", "pual", "hifil", "hufal", "hitpael", "nifal"];
const errors = [];
const err = (where, msg) => errors.push(`${where}: ${msg}`);

const raw = fs.readFileSync(file, "utf8");
if (raw.charCodeAt(0) === 0xfeff) err("file", "has a BOM; save as UTF-8 without BOM");
let data;
try { data = JSON.parse(raw); } catch (e) { console.error("Invalid JSON:", e.message); process.exit(1); }

const HEB_WORD = /^[א-ת]+$/;           // bare letters only: no niqqud, spaces, punctuation, Latin
const NONFINAL_END = /[כמנפצ]$/;       // these must be final forms at end of word
const FINAL_MID = /[ךםןףץ](?=.)/;      // final forms may only appear at the end
const ROOT = /^[א-ת](-[א-ת]){2,3}$/;
const allowedTop = ["present", "past", "future", "imperative", "infinitive", "passiveParticiple", "verbalNoun"];

function checkForm(where, s) {
  if (typeof s !== "string" || !s) return err(where, "empty or non-string form");
  if (!HEB_WORD.test(s)) return err(where, `"${s}" contains characters other than Hebrew letters (niqqud, spaces, punctuation, Latin?)`);
  if (NONFINAL_END.test(s)) err(where, `"${s}" ends in a non-final letter (should be ך ם ן ף ץ)`);
  if (FINAL_MID.test(s)) err(where, `"${s}" has a final-form letter mid-word`);
}

if (data.schemaVersion !== 2) err("file", "schemaVersion must be 2");
const groupIds = new Set();
for (const g of data.groups || []) {
  if (groupIds.has(g.id)) err(`group ${g.id}`, "duplicate id");
  groupIds.add(g.id);
  if (!BINYANIM.includes(g.binyan)) err(`group ${g.id}`, `unknown binyan "${g.binyan}"`);
  for (const k of ["name", "he"]) if (!g[k]) err(`group ${g.id}`, `missing ${k}`);
}
if (!groupIds.size) err("file", "no groups");

const ids = new Set();
let formCount = 0;
for (const v of data.verbs || []) {
  const w = `verb ${v.id ?? "?"}`;
  if (!/^[a-z0-9_]+$/.test(v.id || "")) err(w, "id must be lowercase ascii letters, digits or _");
  if (ids.has(v.id)) err(w, "duplicate id");
  ids.add(v.id);
  if (PASSIVE.includes(v.binyan)) { if (v.infinitive) err(w, "pu'al/huf'al verbs have no infinitive field"); }
  else { checkForm(`${w}.infinitive`, v.infinitive); if (!/^ל/.test(v.infinitive || "")) err(w, "infinitive should start with ל"); }
  if (!v.english) err(w, "missing english");
  if (v.synonyms && (!Array.isArray(v.synonyms) || v.synonyms.some(x => typeof x !== "string" || !x.trim()))) err(w, "synonyms must be an array of non-empty strings");
  if (!BINYANIM.includes(v.binyan)) err(w, `unknown binyan "${v.binyan}"`);
  if (![...(data.groups||[])].some(g => g.binyan === v.binyan && !!g.weak === !!v.weak)) err(w, "no group matches this binyan/weak combination");
  if (!ROOT.test(v.root || "")) err(w, `root "${v.root}" should look like ש-מ-ר`);
  if (!v.forms || !Object.keys(v.forms).length) { err(w, "no forms"); continue; }
  for (const t of Object.keys(v.forms)) if (!allowedTop.includes(t)) err(w, `unknown form group "${t}"`);
  const tl = (x, where) => { if (!Array.isArray(x) || !x.length) return err(where, "must be a non-empty array"); if (new Set(x).size !== x.length) err(where, "duplicate alternate"); x.forEach((s, i) => checkForm(`${where}[${i}]`, s)); formCount++; };
  if (v.forms.infinitive) tl(v.forms.infinitive, `${w}.infinitive`);
  else if (!PASSIVE.includes(v.binyan)) err(w, "missing forms.infinitive");
  if (PASSIVE.includes(v.binyan)) for (const t of ["imperative", "infinitive", "passiveParticiple"]) if (v.forms[t]) err(w, `${v.binyan} should not have ${t}`);
  if (PASSIVE.includes(v.binyan)) for (const t of ["present", "past", "future"]) if (!v.forms[t]) err(w, `missing ${t}`);
  if (v.forms.verbalNoun) tl(v.forms.verbalNoun, `${w}.verbalNoun`);
  if (v.forms.passiveParticiple) {
    const f = v.forms.passiveParticiple, have = Object.keys(f);
    if (have.join() !== PARTICIPLE.join()) err(`${w}.passiveParticiple`, `needs exactly ${PARTICIPLE.join(", ")}`);
    for (const k of PARTICIPLE) if (f[k]) tl(f[k], `${w}.passiveParticiple.${k}`);
  }
  for (const [t, keys] of Object.entries(SHAPE)) {
    const f = v.forms[t];
    if (f === undefined) continue; // tense not drilled for this verb
    const have = Object.keys(f);
    const missing = keys.filter(k => !have.includes(k)), extra = have.filter(k => !keys.includes(k) && !(OPTIONAL[t] || []).includes(k));
    if (missing.length) err(`${w}.${t}`, `missing persons: ${missing.join(", ")}`);
    if (extra.length) err(`${w}.${t}`, `unexpected persons: ${extra.join(", ")}`);
    for (const k of [...keys, ...(OPTIONAL[t] || []).filter(k => have.includes(k))]) {
      const alts = f[k];
      if (!Array.isArray(alts) || !alts.length) { if (have.includes(k)) err(`${w}.${t}.${k}`, "must be a non-empty array"); continue; }
      if (new Set(alts).size !== alts.length) err(`${w}.${t}.${k}`, "duplicate alternate spelling");
      alts.forEach((s, i) => checkForm(`${w}.${t}.${k}[${i}]`, s));
      formCount++;
    }
  }
}

if (errors.length) {
  console.error(`✗ ${errors.length} problem(s) in ${path.relative(process.cwd(), file)}:\n` + errors.map(e => "  - " + e).join("\n"));
  process.exit(1);
}
console.log(`✓ ${data.verbs.length} verbs, ${formCount} forms, ${groupIds.size} groups — no problems.`);
