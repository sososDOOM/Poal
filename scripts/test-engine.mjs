// Regression test: the engine must reproduce the 41 hand-entered prototype verbs exactly
// (scripts/fixtures/prototype-verbs.json), and cross-checks must catch a wrong class.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildAll } from "./build-verbs.mjs";
import { buildVerb } from "./engine.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const proto = JSON.parse(fs.readFileSync(path.join(here, "fixtures", "prototype-verbs.json"), "utf8"));
const { verbs, problems } = buildAll();
let fails = 0, compared = 0;
if (problems.length) { console.error("build problems:\n" + problems.join("\n")); fails++; }
const byId = new Map(verbs.map(v => [v.id, v]));
for (const pv of proto.verbs) {
  const nv = byId.get(pv.id);
  if (!nv) { console.error(`✗ ${pv.id} missing from build`); fails++; continue; }
  if (nv.infinitive !== pv.infinitive || nv.english !== pv.english || nv.root !== pv.root || nv.binyan !== pv.binyan || !!nv.weak !== !!pv.weak)
    { console.error(`✗ ${pv.id}: header differs`, { proto: [pv.infinitive, pv.english, pv.root, pv.binyan, pv.weak], now: [nv.infinitive, nv.english, nv.root, nv.binyan, nv.weak] }); fails++; }
  for (const [t, m] of Object.entries(pv.forms)) {
    if (!nv.forms[t]) { console.error(`✗ ${pv.id}.${t} missing`); fails++; continue; }
    for (const [k, alts] of Object.entries(m)) {
      compared++;
      // every prototype spelling must still be accepted, in the same order up front; extra alternates are improvements
      if (JSON.stringify((nv.forms[t][k] || []).slice(0, alts.length)) !== JSON.stringify(alts)) { console.error(`✗ ${pv.id}.${t}.${k}: proto ${alts.join("|")} ≠ engine ${(nv.forms[t][k] || []).join("|")}`); fails++; }
    }
    for (const k of Object.keys(nv.forms[t])) if (!m[k] && !/^(2fp|3fp|fp)$/.test(k)) { console.error(`✗ ${pv.id}.${t}.${k}: extra form not in prototype`); fails++; }
  }
  for (const t of Object.keys(nv.forms)) if (!pv.forms[t] && !["infinitive", "passiveParticiple", "verbalNoun"].includes(t)) { console.error(`✗ ${pv.id}: extra tense ${t}`); fails++; }
}
// the cross-check must catch a wrong class / wrong given form
const bad = buildVerb(["לכתוב", "כתב", "כתב", "to write", "כ-ת-ב", "paal", {}]);
if (!bad.errors.length) { console.error("✗ cross-check failed to catch a wrong present form"); fails++; }
console.log(fails ? `✗ ${fails} failure(s)` : `✓ engine reproduces all ${proto.verbs.length} prototype verbs (${compared} form lists compared)`);
process.exit(fails ? 1 : 0);
