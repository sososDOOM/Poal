// Prints the raw (vocalised) cells of the best-matching cached Wiktionary table for a verb id. Dev helper.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseTables } from "./wikt.mjs";
const here = path.dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(fs.readFileSync(path.join(here, "..", "data", "verbs.json"), "utf8"));
for (const id of process.argv.slice(2)) {
  const v = data.verbs.find(x => x.id === id); if (!v) continue;
  const f = path.join(here, ".cache", "wiktionary", encodeURIComponent(v.forms.past["3ms"][0]) + ".json");
  if (!fs.existsSync(f)) { console.log(id, "not cached"); continue; }
  const tables = parseTables(JSON.parse(fs.readFileSync(f, "utf8")).parse.text);
  console.log("==", id, v.infinitive || "", "tables:", tables.length);
  const t = tables[0];
  console.log(" nonfinite", JSON.stringify(t.nonfinite));
  console.log(" present", JSON.stringify(t.present));
  for (const k of ["past", "future", "imperative"]) console.log(" " + k, JSON.stringify(t[k]));
}
