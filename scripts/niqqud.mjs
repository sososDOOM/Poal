// Vocalisation (niqqud) for the forms scripts/engine.mjs builds.
//
// Templates are strings in which digits 1-5 are the stem's root letters, Hebrew letters are literal, and ASCII codes
// after a letter add vowel marks:
//   a patah  A qamats  e segol  E tsere  i hiriq  o holam  u qubuts
//   ;  silent shva (closes a syllable)      :  vocal shva (becomes a hataf under א ה ח ע)
//   *  dagesh forte / shuruk (on ו)
// compile() then applies the regular spelling rules: dagesh lene on ב ג ד כ פ ת, no dagesh on gutturals (the previous
// vowel lengthens instead), patah furtive on a final ח/ע, final letter forms (final ך takes a shva), shin/sin dots.
// Output is the *main* vocalised form only; scripts/check-vowels.mjs compares it with Wiktionary's tables.
import { unfin } from "./engine.mjs";

const V = { a: "ַ", A: "ָ", e: "ֶ", E: "ֵ", i: "ִ", o: "ֹ", u: "ֻ", ";": "ְ", "`": "ֲ", "´": "ֱ" };
const DAGESH = "ּ", SHIN = "ׁ", SIN = "ׂ";
const GUTT = "אהחער";            // can't take dagesh forte
const SHVA_GUTT = "אהחע";        // vocal shva becomes a hataf
const BGDKPT = "בגדכפת";
const LONG = new Set(["E", "o", "u"]);
const LENGTHEN = { i: "E", a: "A", u: "o" };
const FINAL = { כ: "ך", מ: "ם", נ: "ן", פ: "ף", צ: "ץ" };

export function compile(tpl, L, { sin = false } = {}) {
  // 1. tokenise
  const toks = [];
  for (const ch of tpl) {
    if (/[1-5]/.test(ch)) toks.push({ ch: L[+ch - 1], marks: [], root: true });
    else if (/[א-ת]/.test(ch)) toks.push({ ch: unfin(ch), marks: [], root: false });
    else if (toks.length) toks[toks.length - 1].marks.push(ch);
    else throw new Error(`template "${tpl}": mark before any letter`);
  }
  // 1b. a root-final נ/ת meeting the same letter of an ending is written once with dagesh (הִתְחַתַּנּוּ, תִּתְחַתֵּנָּה, שֵׁרַתִּי)
  for (let i = 0; i + 1 < toks.length; i++) {
    const a = toks[i], b = toks[i + 1];
    if (a.root && !b.root && a.ch === b.ch && "נת".includes(a.ch) && a.marks.length === 1 && a.marks[0] === ";") { a.marks = ["*", ...b.marks.filter(m => m !== ";" || b.marks.length === 1)]; toks.splice(i + 1, 1); }
  }
  const has = (t, m) => t.marks.includes(m);
  // 2. vocal shva under a guttural -> hataf, copying the neighbouring vowel (אֶעֱבֹד, תַּעֲבֹד, שָׁאֲלָה; initial alef: אֱכֹל but אֲסַפְתֶּם)
  toks.forEach((t, i) => {
    if (!has(t, ":")) return;
    const prevE = i > 0 && toks[i - 1].marks.includes("e");
    const next = toks[i + 1], nextO = next && ["o", "e", "E"].some(m => next.marks.includes(m));
    const segol = prevE || (i === 0 && t.ch === "א" && nextO);
    t.marks = t.marks.map(m => (m === ":" ? (SHVA_GUTT.includes(t.ch) ? (segol ? "´" : "`") : "v") : m));
  });
  // 3. dagesh forte impossible on gutturals/ר: lengthen the vowel before it instead (ו keeps its shuruk dagesh)
  toks.forEach((t, i) => {
    if (has(t, "*") && GUTT.includes(t.ch) && i > 0) {
      t.marks = t.marks.filter(m => m !== "*");
      if ("אר".includes(t.ch)) { const p = toks[i - 1], k = p.marks.findIndex(m => LENGTHEN[m]); if (k >= 0) p.marks[k] = LENGTHEN[p.marks[k]]; } // מְבָרֵךְ; ה/ח/ע keep the short vowel (virtual doubling)
    }
  });
  // 4. dagesh lene: word-initial, or right after a silent shva
  toks.forEach((t, i) => {
    if (BGDKPT.includes(t.ch) && !has(t, "*") && (i === 0 || has(toks[i - 1], ";"))) t.marks.push("*");
  });
  // 5. patah furtive: final ח/ע after a long vowel
  const last = toks[toks.length - 1], prev = toks[toks.length - 2];
  const hasVowel = t => t.marks.some(m => V[m] || m === "v");
  if (prev && "חע".includes(last.ch) && !hasVowel(last) && (prev.marks.some(m => LONG.has(m)) || ("וי".includes(prev.ch) && !prev.root))) last.marks.push("a");
  // 6. final letter forms; a bare final ך takes a shva
  if (FINAL[last.ch]) { if (last.ch === "כ" && !hasVowel(last)) last.marks.push(";"); last.ch = FINAL[last.ch]; }
  // 7. compose (marks are re-ordered by NFC)
  const out = toks.map(t => {
    let s = t.ch;
    s += t.marks.filter(m => V[m] || m === "v").map(m => (m === "v" ? V[";"] : V[m])).join("");
    if (has(t, "*")) s += DAGESH;
    if (t.ch === "ש") s += sin && t.root ? SIN : SHIN;
    return s;
  }).join("");
  return out.normalize("NFC");
}

const mapT = (L, o, tpls) => Object.fromEntries(Object.entries(tpls).map(([k, v]) => [k, compile(v, L, o)]));

// ---------- pa'al ----------
function paalReg(L, o) {
  const [c1, c2, c3] = L;
  const a = o.fut ? o.fut === "a" : "חעא".includes(c3);
  const fv = a ? "a" : "o";
  const alefEnd = c3 === "א";                       // קרא, מצא: the alef is silent and the vowel before it is long
  const av = o.stativeE ? "E" : "A";                // שָׂנֵא (tsere) vs קָרָא (qamats)
  const gutEnd = "חע".includes(c3);                 // פתח, שמע: a-vowels in the feminine present
  const peG = "החע".includes(c1);                   // עבד, חזר: patah prefix in the future, hataf under the first radical
  const alefOchal = c1 === "א" && !!o.alef;         // אכל, אמר, אהב: future אֹכַל / תֹּאכַל (the alef is silent)
  const alefReg = c1 === "א" && !o.alef;            // אסף: segol prefix, תֶּאֱסֹף
  const hataf = (peG && !o.plain1) || alefReg;
  const m1 = hataf ? "1:" : "1;";                   // mark under the first radical in future/infinitive
  const pre = peG ? "a" : alefReg ? "e" : "i";
  const past = alefEnd
    ? { "1s": `1A2${av}3תiי`, "2ms": `1A2${av}3תA`, "2fs": `1A2${av}3ת`, "3ms": `1A2${av}3`, "3fs": "1A2:3Aה", "1p": `1A2${av}3נו*`, "2mp": `1:2${av}3תeם`, "2fp": `1:2${av}3תeן`, "3p": "1A2:3ו*" }
    : { "1s": "1A2a3;תiי", "2ms": "1A2a3;תA", "2fs": "1A2a3;ת;", "3ms": "1A2a3", "3fs": "1A2:3Aה", "1p": "1A2a3;נו*", "2mp": "1:2a3;תeם", "2fp": "1:2a3;תeן", "3p": "1A2:3ו*" };
  const present = o.stative
    ? { ms: "1A2E3", fs: "1:2E3Aה", mp: "1:2E3iים", fp: "1:2E3וoת" } // גָּדֵל, גְּדֵלָה: stative verbs have no ו
    : { ms: "1וo2E3", fs: alefEnd ? "1וo2E3ת" : gutEnd ? "1וo2a3aת" : "1וo2e3eת", mp: "1וo2:3iים", fp: "1וo2:3וoת" };
  const g2 = "אהחע".includes(c2);                   // C2 guttural: imperative fs/p פַּחֲדִי, שַׁאֲלִי (patah + hataf)
  const impSfx = g2 ? "1a2:3" : "1i2:3";
  const v3 = alefEnd ? "A" : fv;                    // vowel before the last radical
  let future, imperative, infinitive;
  if (alefOchal) {
    // c1 is a silent alef: written but not vocalised; the 1s drops it altogether (אֹכַל)
    const b = `2${fv}3`;
    future = { "1s": `אo${b}`, "2ms": `תo1${b}`, "2fs": "תo12:3iי", "3ms": `יo1${b}`, "3fs": `תo1${b}`, "1p": `נo1${b}`, "2p": "תo12:3ו*", "3p": "יo12:3ו*", "2fp": `תo1${b};נAה`, "3fp": `תo1${b};נAה` };
    const iv = o.impA ? "a" : "o", sf = g2 ? "1e2:3" : "1i2:3"; // אֱכֹל / אֱהַב; אִכְלִי / אֶהֱבִי
    imperative = { ms: `1´2${iv}3`, fs: `${sf}iי`, p: `${sf}ו*`, fp: `1´2${iv}3;נAה` };
    infinitive = "לe1:2o3";
  } else {
    const body = `${m1}2${v3}3`;
    const sfx = (p, tail) => (peG && hataf ? `${p}a1a2:3${tail}` : alefReg ? `${p}e1e2:3${tail}` : `${p}${pre}1;2:3${tail}`); // תַּעַבְדִי, תֶּאֶסְפִי, תִּכְתְּבִי
    const fp = alefEnd ? "e3נAה" : `${fv}3;נAה`;
    future = {
      "1s": `אe${body}`, "2ms": `ת${pre}${body}`, "2fs": sfx("ת", "iי"), "3ms": `י${pre}${body}`, "3fs": `ת${pre}${body}`, "1p": `נ${pre}${body}`,
      "2p": sfx("ת", "ו*"), "3p": sfx("י", "ו*"), "2fp": `ת${pre}${m1}2${fp}`, "3fp": `ת${pre}${m1}2${fp}`,
    };
    imperative = { ms: `1:2${v3}3`, fs: `${impSfx}iי`, p: `${impSfx}ו*`, fp: `1:2${alefEnd ? "e3נAה" : `${fv}3;נAה`}` };
    infinitive = `ל${pre}${m1}2${o.infA ? "a" : "o"}3`;
  }
  return {
    past, present, future, imperative, infinitive,
    passiveParticiple: { ms: "1A2ו*3", fs: "1:2ו*3Aה", mp: "1:2ו*3iים", fp: "1:2ו*3וoת" },
  };
}

// ---------- pi'el ----------
function pielReg(L) {
  const L1 = L[L.length - 1];
  const G = "חע".includes(L1) ? "a" : "E", Ge = "חע".includes(L1) ? "a" : "e"; // a guttural last radical takes patah: מִתְפַּתַּחַת, תִּתְפַּתַּחְנָה
  if (L.length === 3) {
    return {
      past: { "1s": "1i2*a3;תiי", "2ms": "1i2*a3;תA", "2fs": "1i2*a3;ת;", "3ms": "1i2*E3", "3fs": "1i2*:3Aה", "1p": "1i2*a3;נו*", "2mp": "1i2*a3;תeם", "2fp": "1i2*a3;תeן", "3p": "1i2*:3ו*" },
      present: { ms: "מ:1a2*E3", fs: `מ:1a2*${Ge}3${Ge}ת`, mp: "מ:1a2*:3iים", fp: "מ:1a2*:3וoת" },
      future: { "1s": "א:1a2*E3", "2ms": "ת:1a2*E3", "2fs": "ת:1a2*:3iי", "3ms": "י:1a2*E3", "3fs": "ת:1a2*E3", "1p": "נ:1a2*E3", "2p": "ת:1a2*:3ו*", "3p": "י:1a2*:3ו*", "2fp": `ת:1a2*${G}3;נAה`, "3fp": `ת:1a2*${G}3;נAה` },
      imperative: { ms: "1a2*E3", fs: "1a2*:3iי", p: "1a2*:3ו*", fp: `1a2*${G}3;נAה` },
      infinitive: "ל:1a2*E3",
    };
  }
  // quadriliteral (תִּכְנֵן): no doubling of the second radical
  return {
    past: { "1s": "1i2;3a4;תiי", "2ms": "1i2;3a4;תA", "2fs": "1i2;3a4;ת;", "3ms": "1i2;3E4", "3fs": "1i2;3:4Aה", "1p": "1i2;3a4;נו*", "2mp": "1i2;3a4;תeם", "2fp": "1i2;3a4;תeן", "3p": "1i2;3:4ו*" },
    present: { ms: "מ:1a2;3E4", fs: `מ:1a2;3${Ge}4${Ge}ת`, mp: "מ:1a2;3:4iים", fp: "מ:1a2;3:4וoת" },
    future: { "1s": "א:1a2;3E4", "2ms": "ת:1a2;3E4", "2fs": "ת:1a2;3:4iי", "3ms": "י:1a2;3E4", "3fs": "ת:1a2;3E4", "1p": "נ:1a2;3E4", "2p": "ת:1a2;3:4ו*", "3p": "י:1a2;3:4ו*", "2fp": `ת:1a2;3${G}4;נAה`, "3fp": `ת:1a2;3${G}4;נAה` },
    imperative: { ms: "1a2;3E4", fs: "1a2;3:4iי", p: "1a2;3:4ו*", fp: `1a2;3${G}4;נAה` },
    infinitive: "ל:1a2;3E4",
  };
}

// ---------- pu'al / huf'al ----------
function pualReg(L) {
  const GL = "חע".includes(L[L.length - 1]), G = GL ? "a" : "E", Ge = GL ? "a" : "e"; // a guttural last radical takes patah: מִתְפַּתַּחַת, תִּתְפַּתַּחְנָה
  if (L.length > 3) { // quadriliteral (תֻּרְגַּם)
    return {
      past: { "1s": "1u2;3a4;תiי", "2ms": "1u2;3a4;תA", "2fs": "1u2;3a4;ת;", "3ms": "1u2;3a4", "3fs": "1u2;3:4Aה", "1p": "1u2;3a4;נו*", "2mp": "1u2;3a4;תeם", "2fp": "1u2;3a4;תeן", "3p": "1u2;3:4ו*" },
      present: { ms: "מ:1u2;3A4", fs: `מ:1u2;3${Ge}4${Ge}ת`, mp: "מ:1u2;3A4iים", fp: "מ:1u2;3A4וoת" },
      future: { "1s": "א:1u2;3a4", "2ms": "ת:1u2;3a4", "2fs": "ת:1u2;3:4iי", "3ms": "י:1u2;3a4", "3fs": "ת:1u2;3a4", "1p": "נ:1u2;3a4", "2p": "ת:1u2;3:4ו*", "3p": "י:1u2;3:4ו*", "2fp": "ת:1u2;3a4;נAה", "3fp": "ת:1u2;3a4;נAה" },
    };
  }
  return {
    past: { "1s": "1u2*a3;תiי", "2ms": "1u2*a3;תA", "2fs": "1u2*a3;ת;", "3ms": "1u2*a3", "3fs": "1u2*:3Aה", "1p": "1u2*a3;נו*", "2mp": "1u2*a3;תeם", "2fp": "1u2*a3;תeן", "3p": "1u2*:3ו*" },
    present: { ms: "מ:1u2*A3", fs: `מ:1u2*${Ge}3${Ge}ת`, mp: "מ:1u2*A3iים", fp: "מ:1u2*A3וoת" },
    future: { "1s": "א:1u2*a3", "2ms": "ת:1u2*a3", "2fs": "ת:1u2*:3iי", "3ms": "י:1u2*a3", "3fs": "ת:1u2*a3", "1p": "נ:1u2*a3", "2p": "ת:1u2*:3ו*", "3p": "י:1u2*:3ו*", "2fp": "ת:1u2*a3;נAה", "3fp": "ת:1u2*a3;נAה" },
  };
}
function hufalReg(L) {
  const GL = "חע".includes(L[L.length - 1]), G = GL ? "a" : "E", Ge = GL ? "a" : "e"; // a guttural last radical takes patah: מִתְפַּתַּחַת, תִּתְפַּתַּחְנָה
  return {
    past: { "1s": "הu1;2a3;תiי", "2ms": "הu1;2a3;תA", "2fs": "הu1;2a3;ת;", "3ms": "הu1;2a3", "3fs": "הu1;2:3Aה", "1p": "הu1;2a3;נו*", "2mp": "הu1;2a3;תeם", "2fp": "הu1;2a3;תeן", "3p": "הu1;2:3ו*" },
    present: { ms: "מu1;2A3", fs: `מu1;2${Ge}3${Ge}ת`, mp: "מu1;2A3iים", fp: "מu1;2A3וoת" },
    future: { "1s": "אu1;2a3", "2ms": "תu1;2a3", "2fs": "תu1;2:3iי", "3ms": "יu1;2a3", "3fs": "תu1;2a3", "1p": "נu1;2a3", "2p": "תu1;2:3ו*", "3p": "יu1;2:3ו*", "2fp": "תu1;2a3;נAה", "3fp": "תu1;2a3;נAה" },
  };
}

// ---------- hif'il (regular roots) ----------
function hifilReg(L) {
  const g1 = "אהחע".includes(L[0]), sh = L[0] === "ח" ? ";" : ":"; // הֶעֱמִיד, הֶאֱמִין (hataf) but הֶחְלִיט (ח keeps a plain shva)
  const p = g1 ? `e1${sh}` : "i1;";
  const q = g1 ? `a1${sh}` : "a1;";                    // מַעֲמִיד / מַחְלִיט / מַזְמִין
  const nEnd = L[2] === "נ";                           // הִזְמַנּוּ, תַּזְמֵנָּה: a final נ absorbs the ending
  const e3 = "חע".includes(L[2]) ? "a" : "E";          // תַּבְטַחְנָה (guttural last radical) vs תַּזְמֵנָּה
  const fp = nEnd ? "*Aה" : ";נAה";
  return {
    past: { "1s": `ה${p}2a3;תiי`, "2ms": `ה${p}2a3;תA`, "2fs": `ה${p}2a3;ת;`, "3ms": `ה${p}2iי3`, "3fs": `ה${p}2iי3Aה`, "1p": nEnd ? `ה${p}2a3*ו*` : `ה${p}2a3;נו*`, "2mp": `ה${p}2a3;תeם`, "2fp": `ה${p}2a3;תeן`, "3p": `ה${p}2iי3ו*` },
    present: { ms: `מ${q}2iי3`, fs: `מ${q}2iי3Aה`, mp: `מ${q}2iי3iים`, fp: `מ${q}2iי3וoת` },
    future: { "1s": `א${q}2iי3`, "2ms": `ת${q}2iי3`, "2fs": `ת${q}2iי3iי`, "3ms": `י${q}2iי3`, "3fs": `ת${q}2iי3`, "1p": `נ${q}2iי3`, "2p": `ת${q}2iי3ו*`, "3p": `י${q}2iי3ו*`, "2fp": `ת${q}2${e3}3${fp}`, "3fp": `ת${q}2${e3}3${fp}` },
    imperative: { ms: `ה${q}2E3`, fs: `ה${q}2iי3iי`, p: `ה${q}2iי3ו*`, fp: `ה${q}2${e3}3${fp}` },
    infinitive: `ל:ה${q}2iי3`,
  };
}

// ---------- hitpa'el (regular 3-letter roots) ----------
function hitpaelReg(L) {
  if (L.length !== 3) return null;
  const GL = "חע".includes(L[L.length - 1]), G = GL ? "a" : "E", Ge = GL ? "a" : "e"; // a guttural last radical takes patah: מִתְפַּתַּחַת, תִּתְפַּתַּחְנָה
  const sib = { ס: "ת", ש: "ת", צ: "ט", ז: "ד" }[L[0]];   // הִסְתַּכֵּל, הִצְטַעֵר, הִזְדַּקֵּן: the ת jumps behind a sibilant
  const H = pre => (sib ? `${pre}1;${sib}a` : `${pre}ת;1a`);
  return {
    past: { "1s": `${H("הi")}2*a3;תiי`, "2ms": `${H("הi")}2*a3;תA`, "2fs": `${H("הi")}2*a3;ת;`, "3ms": `${H("הi")}2*E3`, "3fs": `${H("הi")}2*:3Aה`, "1p": `${H("הi")}2*a3;נו*`, "2mp": `${H("הi")}2*a3;תeם`, "2fp": `${H("הi")}2*a3;תeן`, "3p": `${H("הi")}2*:3ו*` },
    present: { ms: `${H("מi")}2*E3`, fs: `${H("מi")}2*${Ge}3${Ge}ת`, mp: `${H("מi")}2*:3iים`, fp: `${H("מi")}2*:3וoת` },
    future: { "1s": `${H("אe")}2*E3`, "2ms": `${H("תi")}2*E3`, "2fs": `${H("תi")}2*:3iי`, "3ms": `${H("יi")}2*E3`, "3fs": `${H("תi")}2*E3`, "1p": `${H("נi")}2*E3`, "2p": `${H("תi")}2*:3ו*`, "3p": `${H("יi")}2*:3ו*`, "2fp": `${H("תi")}2*${G}3;נAה`, "3fp": `${H("תi")}2*${G}3;נAה` },
    imperative: { ms: `${H("הi")}2*E3`, fs: `${H("הi")}2*:3iי`, p: `${H("הi")}2*:3ו*`, fp: `${H("הi")}2*${G}3;נAה` },
    infinitive: `ל:${H("הi")}2*E3`,
  };
}

// ---------- nif'al (regular roots) ----------
function nifalReg(L) {
  const GL = "חע".includes(L[L.length - 1]), G = GL ? "a" : "E", Ge = GL ? "a" : "e"; // a guttural last radical takes patah: מִתְפַּתַּחַת, תִּתְפַּתַּחְנָה
  const g1 = "אהחע".includes(L[0]), alefEnd = L[2] === "א";
  const N = g1 ? "נe1:2" : "נi1;2";                          // נֶעֱמַד (guttural first radical) vs נִכְנַס
  const N3 = g1 ? "נe1e2:" : "נi1;2:";                       // 3fs/3p: נֶעֶלְמָה
  const pre = g1 ? "E" : "i", pre1 = g1 || L[0] === "ר" ? "e" : "E";          // תֵּעָלֵם / תִּכָּנֵס; 1s אֶעָלֵם / אֵכָּנֵס
  const av = "E";                                             // נִמְצֵאתִי: before the alef the vowel is tsere
  const past = alefEnd
    ? { "1s": `${N}${av}3תiי`, "2ms": `${N}${av}3תA`, "2fs": `${N}${av}3ת`, "3ms": `${N}A3`, "3fs": `${N3}3Aה`, "1p": `${N}${av}3נו*`, "2mp": `${N}${av}3תeם`, "2fp": `${N}${av}3תeן`, "3p": `${N3}3ו*` }
    : { "1s": `${N}a3;תiי`, "2ms": `${N}a3;תA`, "2fs": `${N}a3;ת;`, "3ms": `${N}a3`, "3fs": `${N3}3Aה`, "1p": `${N}a3;נו*`, "2mp": `${N}a3;תeם`, "2fp": `${N}a3;תeן`, "3p": `${N3}3ו*` };
  const fpEnd = alefEnd ? "e3נAה" : `${G}3;נAה`;
  return {
    past,
    present: { ms: `${N}A3`, fs: alefEnd ? `${N}E3ת` : `${N}${Ge}3${Ge}ת`, mp: `${N}A3iים`, fp: `${N}A3וoת` },
    future: { "1s": `א${pre1}1*A2${G}3`, "2ms": `ת${pre}1*A2${G}3`, "2fs": `ת${pre}1*A2:3iי`, "3ms": `י${pre}1*A2${G}3`, "3fs": `ת${pre}1*A2${G}3`, "1p": `נ${pre}1*A2${G}3`, "2p": `ת${pre}1*A2:3ו*`, "3p": `י${pre}1*A2:3ו*`, "2fp": `ת${pre}1*A2${fpEnd}`, "3fp": `ת${pre}1*A2${fpEnd}` },
    imperative: { ms: `ה${pre}1*A2${G}3`, fs: `ה${pre}1*A2:3iי`, p: `ה${pre}1*A2:3ו*`, fp: `ה${pre}1*A2${fpEnd}` },
    infinitive: `ל:ה${pre}1*A2${G}3`,
  };
}

// ---------- pa'al lamed-he (קנה, שתה, ראה, עשה) ----------
function paalHe(L) {
  const g = "אהחע".includes(L[0]) && L[0] !== "א", m = g ? "a1:2" : "i1;2", p = g ? "a" : "i";   // תַּעֲלֶה, אֶעֱלֶה
  const m1 = g ? "e1:2" : "e1;2";
  return {
    past: { "1s": "1A2iיתiי", "2ms": "1A2iיתA", "2fs": "1A2iית", "3ms": "1A2Aה", "3fs": "1A2:תAה", "1p": "1A2iינו*", "2mp": "1:2iיתeם", "2fp": "1:2iיתeן", "3p": "1A2ו*" },
    present: { ms: "1וo2eה", fs: "1וo2Aה", mp: "1וo2iים", fp: "1וo2וoת" },
    future: { "1s": `א${m1}eה`, "2ms": `ת${p}${m.slice(1)}eה`, "2fs": `ת${p}${m.slice(1)}iי`, "3ms": `י${p}${m.slice(1)}eה`, "3fs": `ת${p}${m.slice(1)}eה`, "1p": `נ${p}${m.slice(1)}eה`, "2p": `ת${p}${m.slice(1)}ו*`, "3p": `י${p}${m.slice(1)}ו*`, "2fp": `ת${p}${m.slice(1)}eינAה`, "3fp": `ת${p}${m.slice(1)}eינAה` },
    imperative: { ms: "1:2Eה", fs: "1:2iי", p: "1:2ו*", fp: "1:2eינAה" },
    infinitive: `ל${p}${m.slice(1)}וoת`,
    passiveParticiple: { ms: "1A2ו*י", fs: "1:2ו*יAה", mp: "1:2ו*יiים", fp: "1:2ו*יוoת" },
  };
}

// ---------- pa'al hollow (קם, שם, בא) ----------
function paalHol(L, o) {
  const yod = (o.vow || (L[1] === "י" ? "י" : "ו")) === "י", c3 = L[2], gut = "חע".includes(c3), alef = c3 === "א";
  const fv = yod ? "iי" : alef ? "וo" : "ו*";                // אָשִׂים / אָבוֹא / אָקוּם
  const furt = gut ? "a" : "";                              // אָנוּחַ
  const T = (pre, x = "", tail = "") => `${pre}A1${fv}3${furt}${tail}`;
  return {
    past: alef
      ? { "1s": "1A3תiי", "2ms": "1A3תA", "2fs": "1A3ת", "3ms": "1A3", "3fs": "1A3Aה", "1p": "1A3נו*", "2mp": "1A3תeם", "2fp": "1A3תeן", "3p": "1A3ו*" } // בָּאתִי: the alef is silent
      : { "1s": "1a3;תiי", "2ms": "1a3;תA", "2fs": "1a3;ת;", "3ms": "1A3", "3fs": "1A3Aה", "1p": "1a3;נו*", "2mp": "1a3;תeם", "2fp": "1a3;תeן", "3p": "1A3ו*" },
    present: { ms: "1A3", fs: "1A3Aה", mp: "1A3iים", fp: "1A3וoת" },
    future: { "1s": T("א"), "2ms": T("ת"), "2fs": `תA1${fv}3iי`, "3ms": T("י"), "3fs": T("ת"), "1p": T("נ"), "2p": `תA1${fv}3ו*`, "3p": `יA1${fv}3ו*`, "2fp": `תA1${yod ? "E" : "o"}3${alef ? "" : ";"}נAה`, "3fp": `תA1${yod ? "E" : "o"}3${alef ? "" : ";"}נAה` },
    imperative: { ms: `1${fv}3${furt}`, fs: `1${fv}3iי`, p: `1${fv}3ו*`, fp: `1${yod ? "E" : "o"}3${alef ? "" : ";"}נAה` },
    infinitive: `לA1${fv}3${furt}`,
  };
}

const RECIPES = { paal: (L, o) => (o.c === "hol" ? paalHol(L, o) : L[2] === "ה" && !o.alef ? paalHe(L, o) : paalReg(L, o)), piel: pielReg, pual: pualReg, hufal: hufalReg, hifil: hifilReg, hitpael: hitpaelReg, nifal: nifalReg };

/** Vocalised main forms for a verb: { tense: { key: "form" }, infinitive: "..", passiveParticiple: {..} } or null if unsupported. */
export function vocalise(binyan, rootLetters, o = {}) {
  const L = unfin(rootLetters).split("-");
  // Weak root classes are added one by one as they are verified; until then they simply have no vowels.
  const he = L[L.length - 1] === "ה", hollowPiel = binyan === "piel" && L.length === 3 && (L[1] === "ו" || L[1] === "י");
  const peY = L[0] === "י" && binyan !== "hifil";
  const paalOk = binyan === "paal" && ((o.c === "hol") || (he && !o.c && !o.alef));
  if (!paalOk && (o.c || he || hollowPiel || peY)) return null;
  if (o.noVowels) return null;
  const r = RECIPES[binyan]?.(L, o);
  if (!r) return null;
  const out = {};
  for (const [k, v] of Object.entries(r)) out[k] = typeof v === "string" ? compile(v, L, o) : mapT(L, o, v);
  Object.assign(out, o.voc || {}); // hand-entered vocalised overrides, e.g. { infinitive: "לוֹמַר" }
  return out;
}
