// App configuration: tenses, pronoun prompts, chart layout, keyboard layout.
// Person keys (ms, 1s, 2fp...) must match data/verbs.json (and scripts/validate-verbs.mjs).

export const TENSES = [
  { id: "present", name: "Present", he: "הווה" },
  { id: "past", name: "Past", he: "עבר" },
  { id: "future", name: "Future", he: "עתיד" },
  { id: "imperative", name: "Imperative", he: "ציווי" },
];

// Practice prompts per tense: [hebrew pronoun, English gloss, person key in the data]
export const PRON = {
  present: [["אני", "I (m.)", "ms"], ["אני", "I (f.)", "fs"], ["אתה", "you (m.)", "ms"], ["את", "you (f.)", "fs"], ["הוא", "he", "ms"], ["היא", "she", "fs"], ["אנחנו", "we (m.)", "mp"], ["אנחנו", "we (f.)", "fp"], ["אתם", "you (m. pl.)", "mp"], ["אתן", "you (f. pl.)", "fp"], ["הם", "they (m.)", "mp"], ["הן", "they (f.)", "fp"]],
  past: [["אני", "I", "1s"], ["אתה", "you (m.)", "2ms"], ["את", "you (f.)", "2fs"], ["הוא", "he", "3ms"], ["היא", "she", "3fs"], ["אנחנו", "we", "1p"], ["אתם", "you (m. pl.)", "2mp"], ["אתן", "you (f. pl.)", "2fp"], ["הם", "they (m.)", "3p"], ["הן", "they (f.)", "3p"]],
  future: [["אני", "I", "1s"], ["אתה", "you (m.)", "2ms"], ["את", "you (f.)", "2fs"], ["הוא", "he", "3ms"], ["היא", "she", "3fs"], ["אנחנו", "we", "1p"], ["אתם", "you (m. pl.)", "2p"], ["אתן", "you (f. pl.)", "2p"], ["הם", "they (m.)", "3p"], ["הן", "they (f.)", "3p"]],
  imperative: [["אתה", "you (m.)", "ms"], ["את", "you (f.)", "fs"], ["אתם", "you (m. pl.)", "p"], ["אתן", "you (f. pl.)", "p"]],
};

// Formal feminine plural (תכתובנה): extra prompts, only used when the "formal" option is on. 4th item = formal.
PRON.future.push(["אתן", "you (f. pl., formal)", "2fp", true], ["הן", "they (f., formal)", "3fp", true]);
PRON.imperative.push(["אתן", "you (f. pl., formal)", "fp", true]);

// Compound tenses: להיות (past/future) + present participle. Row: [pronoun, gloss, key in להיות, key in the verb's present]
export const COMPOUND = {
  pastprog: { aux: "past", rows: [["אני", "I (m.)", "1s", "ms"], ["אני", "I (f.)", "1s", "fs"], ["אתה", "you (m.)", "2ms", "ms"], ["את", "you (f.)", "2fs", "fs"], ["הוא", "he", "3ms", "ms"], ["היא", "she", "3fs", "fs"], ["אנחנו", "we (m.)", "1p", "mp"], ["אנחנו", "we (f.)", "1p", "fp"], ["אתם", "you (m. pl.)", "2mp", "mp"], ["אתן", "you (f. pl.)", "2fp", "fp"], ["הם", "they (m.)", "3p", "mp"], ["הן", "they (f.)", "3p", "fp"]] },
  futprog: { aux: "future", rows: [["אני", "I (m.)", "1s", "ms"], ["אני", "I (f.)", "1s", "fs"], ["אתה", "you (m.)", "2ms", "ms"], ["את", "you (f.)", "2fs", "fs"], ["הוא", "he", "3ms", "ms"], ["היא", "she", "3fs", "fs"], ["אנחנו", "we (m.)", "1p", "mp"], ["אנחנו", "we (f.)", "1p", "fp"], ["אתם", "you (m. pl.)", "2p", "mp"], ["אתן", "you (f. pl.)", "2p", "fp"], ["הם", "they (m.)", "3p", "mp"], ["הן", "they (f.)", "3p", "fp"]] },
};

// Verb-chart rows per tense: [English label, Hebrew pronouns, person key]
export const CHART_ROWS = {
  present: [["m. sg.", "אני / אתה / הוא", "ms"], ["f. sg.", "אני / את / היא", "fs"], ["m. pl.", "אנחנו / אתם / הם", "mp"], ["f. pl.", "אנחנו / אתן / הן", "fp"]],
  past: PRON.past.slice(0, 8).map(p => [p[1], p[0], p[2]]).concat([["they", "הם / הן", "3p"]]),
  future: [["I", "אני", "1s"], ["you (m.)", "אתה", "2ms"], ["you (f.)", "את", "2fs"], ["he", "הוא", "3ms"], ["she", "היא", "3fs"], ["we", "אנחנו", "1p"], ["you (pl.)", "אתם / אתן", "2p"], ["they", "הם / הן", "3p"], ["you (f. pl.), formal", "אתן", "2fp"], ["they (f.), formal", "הן", "3fp"]],
  imperative: [["you (m.)", "אתה", "ms"], ["you (f.)", "את", "fs"], ["you (pl.)", "אתם / אתן", "p"], ["you (f. pl.), formal", "אתן", "fp"]],
};

export const VOWEL_OPTIONS = [["off", "Off"], ["vowels", "Vowels"], ["translit", "Transliteration"], ["both", "Both"]];
export const TIME_OPTIONS = [[60, "1 min"], [120, "2 min"], [180, "3 min"], [300, "5 min"], [0, "No limit"]];
export const COUNT_OPTIONS = [[10, "10"], [20, "20"], [50, "50"], [0, "Endless"]];

// The verb picker is by binyan only (no per-verb selection).
export const BINYANIM = [
  { id: "paal", name: "Pa'al", he: "פָּעַל", note: "the basic binyan" },
  { id: "piel", name: "Pi'el", he: "פִּיעֵל", note: "intensive" },
  { id: "hifil", name: "Hif'il", he: "הִפְעִיל", note: "causative" },
  { id: "hitpael", name: "Hitpa'el", he: "הִתְפַּעֵל", note: "reflexive" },
  { id: "nifal", name: "Nif'al", he: "נִפְעַל", note: "passive / reflexive" },
  { id: "pual", name: "Pu'al", he: "פֻּעַל", note: "passive of pi'el" },
  { id: "hufal", name: "Huf'al", he: "הֻפְעַל", note: "passive of hif'il" },
];
export const DEFAULT_BINYANIM = ["paal"];
export const DEFAULT_TENSES = ["present", "past", "future"];

// Israeli keyboard layout for the on-screen keyboard.
export const KEY_ROWS = [["ק", "ר", "א", "ט", "ו", "ן", "ם", "פ"], ["ש", "ד", "ג", "כ", "ע", "י", "ח", "ל", "ך", "ף"], ["ז", "ס", "ב", "ה", "נ", "מ", "צ", "ת", "ץ"]];
export const FINAL_LETTERS = "ךםןףץ";
export const PARTICIPLE_ROWS = [["m. sg.", "ms"], ["f. sg.", "fs"], ["m. pl.", "mp"], ["f. pl.", "fp"]];
export const SETTINGS_KEY = "poal.settings";
export const BEST_KEY = t => `poal.best.${t}`;
