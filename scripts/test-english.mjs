// Tests for the English-meaning matcher (js/english.js).
import { matchesMeaning } from "../js/english.js";
const v = (en, syn = []) => ({ en, syn });
const cases = [
  ["to live (reside)", "reside", true], ["to live (reside)", "live", true], ["to ask for, request", "ask", true], ["to ask for, request", "To Request", true],
  ["to go, walk", "walk", true], ["to put", "put", true], ["to put", "puts", false], ["to write", "writ", false], ["to write", "to write.", true],
  ["to speak", "talk", false],
];
let bad = 0;
for (const [en, typed, want] of cases) if (matchesMeaning(typed, v(en)) !== want) { console.error(`✗ "${typed}" vs "${en}": expected ${want}`); bad++; }
if (!matchesMeaning("talk", v("to speak", ["to talk"]))) { console.error("✗ synonyms not accepted"); bad++; }
console.log(bad ? `✗ ${bad} failure(s)` : `✓ english matcher: ${cases.length + 1} cases`);
process.exit(bad ? 1 : 0);
