// Generates data/vocalised.json (niqqud for the main spelling of every form) from the seeds, for the verb classes
// scripts/niqqud.mjs supports. Verbs of unsupported classes are simply absent: the app then shows no vowels for them.
// Usage: node scripts/build-vowels.mjs [--check]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ALL_ROWS } from "./build-verbs.mjs";
import { buildVerb, autoId } from "./engine.mjs";
import { vocalise } from "./niqqud.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const strip = s => s.normalize("NFC").replace(/[֑-ׇ]/g, "");
const skel = s => strip(s).replace(/[וי]/g, "").replace(/[ךםןףץ]/g, c => ({ "ך": "כ", "ם": "מ", "ן": "נ", "ף": "פ", "ץ": "צ" }[c]));

export function buildVowels() {
  const out = {}, problems = [];
  let total = 0;
  for (const row of ALL_ROWS) {
    const o = row[6] || {}, id = o.id || autoId(row[5], row[4]);
    const { verb } = buildVerb(row);
    const voc = vocalise(row[5], o.letters || row[4], o);
    if (!voc) continue;
    const clean = {};
    for (const [k, v] of Object.entries(voc)) {
      const main = (t, key) => (key === undefined ? verb.forms[t]?.[0] : verb.forms[t]?.[key]?.[0]);
      if (typeof v === "string") {
        const m = verb.forms[k]?.[0]; if (!m) continue;
        if (skel(v) !== skel(m)) problems.push(`${id}.${k}: vocalised ${v} does not match ${m}`);
        clean[k] = v; total++;
      } else {
        clean[k] = {};
        for (const [p, form] of Object.entries(v)) {
          const m = verb.forms[k]?.[p]?.[0]; if (!m) continue; // e.g. imperative removed by noImp
          if (skel(form) !== skel(m)) problems.push(`${id}.${k}.${p}: vocalised ${form} does not match ${m}`);
          clean[k][p] = form; total++;
        }
        if (!Object.keys(clean[k]).length) delete clean[k];
      }
    }
    out[id] = clean;
  }
  return { out, problems, total };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { out, problems, total } = buildVowels();
  if (problems.length) { console.error(`✗ ${problems.length} vowel/spelling mismatch(es):\n` + problems.slice(0, 40).map(p => "  - " + p).join("\n")); process.exit(1); }
  if (!process.argv.includes("--check")) {
    const lines = Object.entries(out).map(([id, f]) => `  ${JSON.stringify(id)}: ${JSON.stringify(f)}`);
    fs.writeFileSync(path.join(here, "..", "data", "vocalised.json"), `{\n  "schemaVersion": 1,\n  "verbs": {\n${lines.join(",\n")}\n  }\n}\n`);
  }
  console.log(`✓ vocalised ${Object.keys(out).length} verbs, ${total} forms`);
}
