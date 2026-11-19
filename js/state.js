// Persistent user settings (the setup screen's choices).
import { store } from "./storage.js";
import { DB } from "./data.js";
import { BINYANIM, DEFAULT_BINYANIM, DEFAULT_TENSES, SETTINGS_KEY } from "./config.js";
import { DRILLS } from "./drills.js";

export const S = {};

export function initState() {
  const saved = store.get(SETTINGS_KEY, {});
  const known = (saved.binyanim || []).filter(id => BINYANIM.some(b => b.id === id));
  Object.assign(S, {
    binyanim: new Set(known.length ? known : DEFAULT_BINYANIM),
    tenses: new Set((saved.tenses || DEFAULT_TENSES).filter(id => DRILLS.some(d => d.id === id))),
    time: saved.time ?? 120, count: saved.count ?? 20,
    english: saved.english ?? true, root: saved.root ?? false, kb: saved.kb ?? true, lenient: saved.lenient ?? false, formal: saved.formal ?? false, tl: saved.tl ?? false, vowels: ["off", "vowels", "translit", "both"].includes(saved.vowels) ? saved.vowels : "off",
  });
}
export function saveSettings() {
  store.set(SETTINGS_KEY, { binyanim: [...S.binyanim], tenses: [...S.tenses], time: S.time, count: S.count, english: S.english, root: S.root, kb: S.kb, lenient: S.lenient, formal: S.formal, vowels: S.vowels, tl: S.tl });
}
