// Vocalised Hebrew -> Latin transliteration (simple, Israeli pronunciation, no stress marks). Pure function, no DOM.
// "כָּתַבְתִּי" -> "katavti", "לִכְתֹּב" -> "likhtov", "מַזְמִין" -> "mazmin", "שׁוֹמֵעַ" -> "shomea"
const LETTER = { א: "", ב: "v", ג: "g", ד: "d", ה: "h", ו: "v", ז: "z", ח: "kh", ט: "t", י: "y", כ: "kh", ך: "kh", ל: "l", מ: "m", ם: "m", נ: "n", ן: "n", ס: "s", ע: "", פ: "f", ף: "f", צ: "tz", ץ: "tz", ק: "k", ר: "r", ש: "sh", ת: "t" };
const DAGESH_LETTER = { ב: "b", כ: "k", פ: "p" };
const VOWEL = { "ַ": "a", "ָ": "a", "ֶ": "e", "ֵ": "e", "ִ": "i", "ֹ": "o", "ֺ": "o", "ֻ": "u", "ֲ": "a", "ֱ": "e", "ֳ": "o" };
const SHVA = "ְ", DAGESH = "ּ", SIN = "ׂ", HOLAM = "ֹ", HIRIQ = "ִ", TSERE = "ֵ", SEGOL = "ֶ", PATAH = "ַ";
const isLetter = c => c >= "א" && c <= "ת";

export function transliterate(word) {
  // split into clusters: letter + its marks
  const cl = [];
  for (const c of word.normalize("NFD")) {
    if (isLetter(c)) cl.push({ ch: c, marks: new Set() });
    else if (cl.length) cl[cl.length - 1].marks.add(c);
  }
  let out = "";
  for (let i = 0; i < cl.length; i++) {
    const { ch, marks } = cl[i], next = cl[i + 1], prev = cl[i - 1], last = i === cl.length - 1;
    const vowel = [...marks].find(m => VOWEL[m]);
    const dag = marks.has(DAGESH), shva = marks.has(SHVA);
    // vav carrying a vowel mark is the consonant; bare vav + holam / dagesh is a vowel letter
    if (ch === "ו" && prev && marks.has(HOLAM)) { out += "o"; continue; }          // holam male: וֹ
    if (ch === "ו" && prev && dag && !shva && ![...marks].some(m => VOWEL[m])) { out += "u"; continue; } // shuruk: וּ
    // yod after hiriq/tsere/segol is a vowel letter
    if (ch === "י" && prev && !vowel && !shva && [HIRIQ, TSERE, SEGOL].some(m => prev.marks.has(m)) && !(next && /[ְ-ּ]/.test([...next.marks].join("")) && false)) continue;
    // final silent ה/א and ע
    if (last && (ch === "ה" || ch === "א") && !vowel && !dag) continue;
    let cons = LETTER[ch];
    if (ch === "ש") cons = marks.has(SIN) ? "s" : "sh";
    if (dag && DAGESH_LETTER[ch]) cons = DAGESH_LETTER[ch];
    if (ch === "פ" && !dag) cons = "f";
    // patah furtive: final ח/ע/ה with patah after a long vowel is pronounced before the consonant
    if (last && marks.has(PATAH) && "חעה".includes(ch) && prev) { out += "a" + cons; continue; }
    // vocal shva: word-initial, or after another shva; else silent
    let v = vowel ? VOWEL[vowel] : "";
    if (shva) { const prevShva = prev && prev.marks.has(SHVA); v = !last && (i === 0 || (prevShva && !isDoubledDagesh(prev))) ? "e" : ""; } // a shva at the end of a word is silent
    out += cons + v;
  }
  return out;
}
const isDoubledDagesh = c => c.marks.has(DAGESH);
export const transliterateAll = s => s.split(/\s+/).map(transliterate).join(" ");
