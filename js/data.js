// Loads data/verbs.json and exposes it in the shape the UI uses.
// This is the only module that knows where verb data comes from, so a future
// backend (e.g. Supabase) only needs to change loadData().
export const DB = { groups: [], verbs: [], byId: new Map(), voc: null };

/** Vowelled forms (data/vocalised.json), fetched only when the player turns vowels/transliteration on. Verbs missing from it show no vowels. */
export async function loadVocalised(url = "data/vocalised.json") {
  if (DB.voc) return DB.voc;
  try { const res = await fetch(url); DB.voc = res.ok ? (await res.json()).verbs : {}; } catch (e) { DB.voc = {}; }
  return DB.voc;
}

export async function loadData(url = "data/verbs.json") {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not load ${url} (${res.status})`);
  const raw = await res.json();
  DB.groups = raw.groups;
  DB.verbs = raw.verbs.map(v => ({
    id: v.id, inf: v.infinitive || v.forms.past["3ms"][0], hasInf: !!v.infinitive, en: v.english, syn: v.synonyms || [], root: v.root, binyan: v.binyan,
    g: raw.groups.find(g => g.binyan === v.binyan && !!g.weak === !!v.weak).id,
    t: v.forms, // { tense: { personKey: [spelling, ...alternates] } }
  }));
  DB.byId = new Map(DB.verbs.map(v => [v.id, v]));
  return DB;
}
