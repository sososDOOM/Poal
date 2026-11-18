// Drill types: what can be practised, how a question is prompted, and where its accepted answers come from.
// A question is { v: verb, t: drill id, pi: index into prompts(t) }.
import { DB } from "./data.js";
import { PRON, COMPOUND, PARTICIPLE_ROWS } from "./config.js";

export const DRILLS = [
  { id: "present", name: "Present", he: "הווה", kind: "conj" },
  { id: "past", name: "Past", he: "עבר", kind: "conj" },
  { id: "future", name: "Future", he: "עתיד", kind: "conj" },
  { id: "imperative", name: "Imperative", he: "ציווי", kind: "conj" },
  { id: "infinitive", name: "Infinitive", he: "שם פועל", kind: "inf" },
  { id: "participle", name: "Passive participle", he: "בינוני סביל", kind: "pp" },
  { id: "noun", name: "Verbal noun", he: "שם פעולה", kind: "noun" },
  { id: "pastprog", name: "Past compound", he: "עבר מתמשך", kind: "compound", example: "הייתי כותב" },
  { id: "futprog", name: "Future compound", he: "עתיד מתמשך", kind: "compound", example: "אהיה כותב" },
  { id: "meaning", name: "Meaning", he: "פירוש", kind: "meaning", example: "type it in English" },
];
export const drillById = id => DRILLS.find(d => d.id === id);

/** Prompts for a drill: [hebrew pronoun, English gloss, key, ...]. Key meaning depends on the drill kind. */
export function prompts(id) {
  const d = drillById(id);
  switch (d.kind) {
    case "conj": return PRON[id];
    case "pp": return PARTICIPLE_ROWS.map(([g, k]) => ["", g, k]);
    case "compound": return COMPOUND[id].rows;
    case "meaning": return [["", "type the English meaning", null]];
    default: return [["", "", null]];
  }
}

/** Accepted spellings for (verb, drill, prompt index), main spelling first; null if the verb has no such form. */
export function answersFor(v, id, pi) {
  const d = drillById(id), p = prompts(id)[pi];
  switch (d.kind) {
    case "conj": return v.t[id]?.[p[2]] || null;
    case "inf": return v.t.infinitive || null;
    case "noun": return v.t.verbalNoun || null;
    case "meaning": return [v.en]; // display form; matching is done by english.js
    case "pp": return v.t.passiveParticiple?.[p[2]] || null;
    case "compound": {
      const aux = DB.byId.get("haya")?.t[COMPOUND[id].aux]?.[p[2]], pr = v.t.present?.[p[3]];
      return aux && pr ? aux.flatMap(a => pr.map(x => a + " " + x)) : null;
    }
  }
}
export const answers = q => answersFor(q.v, q.t, q.pi);
export const prompt = q => prompts(q.t)[q.pi];
/** Formal feminine-plural prompts carry `true` as their 4th item (compound prompts use that slot for a key). */
/** Vowelled main form for a question, or null when we have none (unsupported verb class, compound, noun, meaning). */
export function vocalisedFor(q) {
  const d = drillById(q.t), voc = DB.voc?.[q.v.id], key = prompt(q)[2];
  if (!voc) return null;
  if (d.kind === "conj") return voc[q.t]?.[key] || null;
  if (d.kind === "inf") return voc.infinitive || null;
  if (d.kind === "pp") return voc.passiveParticiple?.[key] || null;
  return null;
}
export const isFormal = p => p[3] === true;
export const isAvailable = (v, id, pi) => !!answersFor(v, id, pi)?.length;
export const hasDrill = (v, id) => prompts(id).some((p, pi) => !isFormal(p) && isAvailable(v, id, pi));

export const groupOf = v => DB.groups.find(g => g.id === v.g);
/** What the question card shows above the prompt. */
export function cue(q, { english, root }) {
  const { v, t } = q, grp = groupOf(v), bin = grp.name.split(" (")[0].split(" —")[0];
  if (t === "meaning") return { main: v.inf, en: "", meta: `${bin} · root ${v.root}` }; // English is what is being asked, so never show it
  if (t === "infinitive") return { main: v.root, en: v.en, meta: bin }; // the infinitive is the answer, so show root + binyan + meaning
  return { main: v.inf, en: english ? v.en : "", meta: root ? `${bin} · root ${v.root}` : "" };
}
