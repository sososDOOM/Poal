// Lists verbs that have vowels in data/vocalised.json but could not be compared with a Wiktionary table. Dev helper.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseTables } from "./wikt.mjs";
const here = path.dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(fs.readFileSync(path.join(here, "..", "data", "verbs.json"), "utf8"));
const voc = JSON.parse(fs.readFileSync(path.join(here, "..", "data", "vocalised.json"), "utf8")).verbs;
const loadTables = title => {
  const f = path.join(here, ".cache", "wiktionary", encodeURIComponent(title) + ".json");
  if (!fs.existsSync(f)) return null;
  const j = JSON.parse(fs.readFileSync(f, "utf8")); return j.parse ? parseTables(j.parse.text, x => x) : null;
};
const missing = data.verbs.filter(v => voc[v.id] && !(loadTables(v.forms.past["3ms"][0]) || []).length);
console.log(missing.length, "verbs with vowels but no comparable Wiktionary table:\n" + missing.map(v => `${v.id} ${v.forms.past["3ms"][0]}`).join("\n"));
