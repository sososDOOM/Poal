// Hebrew verb conjugation engine (unvocalised, "ktiv male" spelling).
//
// Given a root, a binyan and a small class tag, it produces every form the app drills.
// It is NOT a general-purpose Hebrew morphology library: each recipe covers the root
// classes that actually occur in the seed list (scripts/seeds.mjs), and every seed row
// is cross-checked against three independently-known forms (infinitive, past 3ms,
// present ms) so a wrong class choice shows up as a build error instead of bad data.
//
// Internally all letters are non-final; fin() restores final forms (ך ם ן ף ץ) at word ends.

const UNFIN = { "ך": "כ", "ם": "מ", "ן": "נ", "ף": "פ", "ץ": "צ" };
const FIN = { "כ": "ך", "מ": "ם", "נ": "ן", "פ": "ף", "צ": "ץ" };
export const unfin = s => s.replace(/[ךםןףץ]/g, c => UNFIN[c]);
export const fin = s => s.replace(/[כמנפצ](?=$|\s)/g, c => FIN[c]);

export const PAST_KEYS = ["1s", "2ms", "2fs", "3ms", "3fs", "1p", "2mp", "2fp", "3p"];
export const FUT_KEYS = ["1s", "2ms", "2fs", "3ms", "3fs", "1p", "2p", "3p"];
const PRE = { "1s": "א", "2ms": "ת", "2fs": "ת", "3ms": "י", "3fs": "ת", "1p": "נ", "2p": "ת", "3p": "י" };
const FSFX = { "2fs": "י", "2p": "ו", "3p": "ו" };
const arr = x => (Array.isArray(x) ? x : [x]);
const pick = (x, k) => (typeof x === "function" ? x(k) : x);

// ---------- generic builders ----------
function pastForms({ B, m3 = B, f3 = B + "ה", p3 = B + "ו" }) {
  const p1 = B.endsWith("נ") ? B + "ו" : B + "נו"; // C3=נ: 1p and 3p are written alike (נתנו, הבנו)
  // C3=ת absorbs the ת of the ending: מתי / מת / מתם / מתן (not מתתי...), כרתי, שירתי
  if (B.endsWith("ת")) return { "1s": B + "י", "2ms": B, "2fs": B, "3ms": m3, "3fs": f3, "1p": p1, "2mp": B + "מ", "2fp": B + "נ", "3p": p3 };
  return { "1s": B + "תי", "2ms": B + "ת", "2fs": B + "ת", "3ms": m3, "3fs": f3, "1p": p1, "2mp": B + "תמ", "2fp": B + "תנ", "3p": p3 };
}
const presentForms = (ms, fs, mp, fp) => ({ ms, fs, mp, fp });
// base/sfx: string | string[] | fn(key). sfx is used where a י/ו suffix is added.
function futureForms(base, sfx, fpStem) {
  const F = {};
  for (const k of FUT_KEYS) {
    const stems = arr(pick(FSFX[k] ? sfx : base, k));
    F[k] = stems.map(s => PRE[k] + s + (FSFX[k] || ""));
  }
  if (fpStem) { F["2fp"] = arr(fpStem).map(x => "ת" + fpNa(x)); F["3fp"] = F["2fp"]; }
  return F;
}
// formal feminine plural ending -נה; a stem ending in נ absorbs it (תתנה, not תתננה)
const fpNa = x => (x.endsWith("נ") ? x + "ה" : x + "נה");
const imperativeForms = (ms, sfx, fpStem) => {
  const I = { ms: arr(ms), fs: arr(sfx).map(s => s + "י"), p: arr(sfx).map(s => s + "ו") };
  if (fpStem) I.fp = arr(fpStem).map(fpNa);
  return I;
};
const regularPresent = stem => presentForms(stem, stem + "ת", stem + "ימ", stem + "ות");
const participle = s => ({ ms: s, fs: s + "ה", mp: s + "ימ", fp: s + "ות" });

// Sibilant metathesis for hitpa'el: the ת of הת- moves after ס/ש and changes after צ/ז.
function hitpaelStem(L) {
  const [c1, ...rest] = L;
  if (c1 === "ס" || c1 === "ש") return "ה" + c1 + "ת" + rest.join("");
  if (c1 === "צ") return "ה" + c1 + "ט" + rest.join("");
  if (c1 === "ז") return "ה" + c1 + "ד" + rest.join("");
  return "הת" + L.join("");
}

// ---------- recipes (return { past, present, future, imperative, infinitive, participle, ... }) ----------
function paal(L, o) {
  const [c1, c2, c3] = L;
  const cls = o.c || (c3 === "ה" ? "he" : "reg");
  const a = o.fut ? o.fut === "a" : "חעא".includes(c3); // future vowel: a (yilmad) vs o (yikhtov)
  const st = c1 + c2 + c3, ov = c1 + c2 + "ו" + c3;
  const alef1 = fb => (o.alef ? k => (k === "1s" ? "ו" + arr(fb)[0].slice(1) : fb) : fb); // אוכל / אומר / אופה
  if (cls === "reg") {
    const fb = a ? st : ov;
    const impMs = o.alef || !a ? ov : st;
    return {
      past: pastForms({ B: st }),
      present: regularPresent(c1 + "ו" + c2 + c3),
      future: futureForms(alef1(fb), st, fb),
      imperative: imperativeForms(impMs, st, impMs),
      infinitive: "ל" + ov,
      participle: participle(ov),
    };
  }
  if (cls === "he") {
    const s2 = c1 + c2;
    return {
      past: pastForms({ B: s2 + "י", m3: s2 + "ה", f3: s2 + "תה", p3: s2 + "ו" }),
      present: presentForms(c1 + "ו" + c2 + "ה", c1 + "ו" + c2 + "ה", c1 + "ו" + c2 + "ימ", c1 + "ו" + c2 + "ות"),
      future: futureForms(alef1(s2 + "ה"), s2, s2 + "י"),
      imperative: imperativeForms(s2 + "ה", s2, s2 + "י"),
      infinitive: "ל" + s2 + "ות",
      participle: participle(s2 + "וי"),
    };
  }
  if (cls === "hol") { // hollow (ע"ו / ע"י): קם, בא, שם
    const v = o.vow || (c2 === "י" ? "י" : "ו"), B = c1 + c3, s = c1 + v + c3;
    return {
      past: pastForms({ B }),
      present: presentForms(B, B + "ה", B + "ימ", B + "ות"),
      future: futureForms(s, s, B), // formal fp drops the vowel letter: תקמנה, תשמנה
      imperative: imperativeForms(s, s, B),
      infinitive: "ל" + s,
    };
  }
  if (cls === "pdrop") { // first radical drops in future/imperative/infinitive: ישב, הלך, נסע, לקח, נתן
    const sf = c2 + c3, fv = o.fvow ? c2 + "ו" + c3 : sf;
    return {
      past: pastForms({ B: st }),
      present: regularPresent(c1 + "ו" + c2 + c3),
      future: futureForms(o.altY ? k => (k === "1s" ? [fv, "י" + fv] : ["י" + fv, fv]) : fv, o.altY ? ["י" + sf, sf] : sf, o.altY ? ["י" + sf, sf] : sf),
      imperative: imperativeForms(fv, sf, sf),
      infinitive: "ל" + sf + "ת",
    };
  }
  if (cls === "manual") return {};
  throw new Error(`paal: unknown class ${cls}`);
}

function piel(L, o) {
  const cls = o.c || (L[L.length - 1] === "ה" ? "he" : L[1] === "ו" || (L[1] === "י" && L.length === 3) ? "hol" : "reg");
  if (cls === "reg") {
    const B = L[0] + "י" + L.slice(1).join(""), S = L.join("");
    const past = pastForms({ B });
    const haser = pastForms({ B: S });
    for (const k of PAST_KEYS) past[k] = [past[k], haser[k]];
    return { past, present: regularPresent("מ" + S), future: futureForms(S, S, S), imperative: imperativeForms(S, S, S), infinitive: "ל" + S };
  }
  if (cls === "he") {
    const [c1, c2] = L, s2 = c1 + c2, P = c1 + "י" + c2;
    return {
      past: pastForms({ B: P + "י", m3: P + "ה", f3: P + "תה", p3: P + "ו" }),
      present: presentForms("מ" + s2 + "ה", "מ" + s2 + "ה", "מ" + s2 + "ימ", "מ" + s2 + "ות"),
      future: futureForms(s2 + "ה", s2, s2 + "י"),
      imperative: imperativeForms(s2 + "ה", s2, s2 + "י"),
      infinitive: "ל" + s2 + "ות",
    };
  }
  if (cls === "hol") { // טייל, קיים, שיווק
    const [c1, c2, c3] = L, w = c2 === "ו";
    const B = c1 + "י" + (w ? "וו" : "י") + c3, S = c1 + (w ? "וו" : "יי") + c3;
    return { past: pastForms({ B }), present: regularPresent("מ" + S), future: futureForms(S, S, S), imperative: imperativeForms(S, S, S), infinitive: "ל" + S };
  }
  throw new Error(`piel: unknown class ${cls}`);
}

function pual(L) {
  const B = L[0] + "ו" + L.slice(1).join("");
  return { past: pastForms({ B }), present: regularPresent("מ" + B), future: futureForms(B, B, B) };
}

// Hif'il / huf'al share one skeleton: prefix (ה / הו) + radicals R, with a י before the last radical.
function hifSkeleton(L, o) {
  const he = L[L.length - 1] === "ה" && !o.consH;
  const base = he ? L.slice(0, -1) : L;
  const cls = o.c || "reg";
  let pre = "ה", R;
  if (cls === "reg") R = base;
  else if (cls === "hol") R = [base[0], base[base.length - 1]];       // הקים, הביא, הבין
  else if (cls === "pnun") R = base.slice(1);                         // הכיר, הגיע, הציל
  else if (cls === "pyod") { pre = "הו"; R = base.slice(1); }         // הוריד, הוציא, הודה
  else throw new Error(`hifil: unknown class ${cls}`);
  return { he, pre, R };
}
function hifil(L, o) {
  const { he, pre, R } = hifSkeleton(L, o), p1 = pre.slice(1), j = R.join("");
  if (he) {
    return {
      past: pastForms({ B: pre + j + "י", m3: pre + j + "ה", f3: pre + j + "תה", p3: pre + j + "ו" }),
      present: presentForms("מ" + p1 + j + "ה", "מ" + p1 + j + "ה", "מ" + p1 + j + "ימ", "מ" + p1 + j + "ות"),
      future: futureForms(p1 + j + "ה", p1 + j, p1 + j + "י"),
      imperative: imperativeForms(pre + j + "ה", pre + j, pre + j + "י"),
      infinitive: "ל" + pre + j + "ות",
    };
  }
  const Ry = R.slice(0, -1).join("") + "י" + R[R.length - 1];
  return {
    past: pastForms({ B: pre + j, m3: pre + Ry, f3: pre + Ry + "ה", p3: pre + Ry + "ו" }),
    present: presentForms("מ" + p1 + Ry, "מ" + p1 + Ry + "ה", "מ" + p1 + Ry + "ימ", "מ" + p1 + Ry + "ות"),
    future: futureForms(p1 + Ry, p1 + Ry, p1 + j),
    imperative: imperativeForms(pre + j, pre + Ry, pre + j),
    infinitive: "ל" + pre + Ry,
    autoNoun: pre + j + "ה", // haf'ala
  };
}
function hufal(L, o) {
  const { R } = hifSkeleton(L, o), B = "הו" + R.join("");
  return { past: pastForms({ B }), present: regularPresent("מו" + R.join("")), future: futureForms("ו" + R.join(""), "ו" + R.join(""), "ו" + R.join("")) };
}

function hitpael(L, o) {
  const cls = o.c || (L[L.length - 1] === "ה" ? "he" : L[0] === "י" ? "pyod" : "reg");
  if (cls === "reg") {
    const H = hitpaelStem(L), P = H.slice(1);
    return { past: pastForms({ B: H }), present: regularPresent("מ" + P), future: futureForms(P, P, P), imperative: imperativeForms(H, H, H), infinitive: "ל" + H };
  }
  if (cls === "pyod") { // התיישב: initial י doubles
    const H = "הת" + "יי" + L.slice(1).join(""), P = H.slice(1);
    return { past: pastForms({ B: H }), present: regularPresent("מ" + P), future: futureForms(P, P, P), imperative: imperativeForms(H, H, H), infinitive: "ל" + H };
  }
  if (cls === "he") {
    const H = hitpaelStem(L.slice(0, -1)), P = H.slice(1);
    return {
      past: pastForms({ B: H + "י", m3: H + "ה", f3: H + "תה", p3: H + "ו" }),
      present: presentForms("מ" + P + "ה", "מ" + P + "ה", "מ" + P + "ימ", "מ" + P + "ות"),
      future: futureForms(P + "ה", P, P + "י"),
      imperative: imperativeForms(H + "ה", H, H + "י"),
      infinitive: "ל" + H + "ות",
    };
  }
  throw new Error(`hitpael: unknown class ${cls}`);
}

function nifal(L, o) {
  const cls = o.c || (L[L.length - 1] === "ה" ? "he" : L[0] === "י" ? "pyod" : "reg");
  const alts = (s, k) => (k === "1s" ? [s, "י" + s] : ["י" + s, s]); // אכנס|איכנס, תיכנס|תכנס
  if (cls === "reg" || cls === "pyod") {
    // pe-yod (נולד, נוצר): the future stem has a consonantal ו plus the vowel ו (ייוולד); single-ו spellings (ייולד) are accepted too
    const bodies = cls === "reg" ? [L.join("")] : ["וו" + L.slice(1).join(""), "ו" + L.slice(1).join("")];
    const N = cls === "reg" ? "נ" + L.join("") : "נו" + L.slice(1).join("");
    const fut = k => bodies.flatMap(b => alts(b, k)), sfx = bodies.flatMap(b => ["י" + b, b]);
    return {
      past: pastForms({ B: N }),
      present: regularPresent(N),
      future: futureForms(fut, sfx, null),
      imperative: imperativeForms(bodies.flatMap(b => ["הי" + b, "ה" + b]), bodies.flatMap(b => ["הי" + b, "ה" + b]), null),
      infinitive: bodies.flatMap(b => ["להי" + b, "לה" + b]), // להיכנס | להכנס
    };
  }
  if (cls === "he") {
    const s2 = L[0] + L[1];
    return {
      past: pastForms({ B: "נ" + s2 + "י", m3: "נ" + s2 + "ה", f3: "נ" + s2 + "תה", p3: "נ" + s2 + "ו" }),
      present: presentForms("נ" + s2 + "ה", "נ" + s2 + "ית", "נ" + s2 + "ימ", "נ" + s2 + "ות"),
      future: futureForms(k => alts(s2 + "ה", k), ["י" + s2, s2], null),
      imperative: imperativeForms(["הי" + s2 + "ה", "ה" + s2 + "ה"], ["הי" + s2, "ה" + s2], null),
      infinitive: "להי" + s2 + "ות",
    };
  }
  throw new Error(`nifal: unknown class ${cls}`);
}

const RECIPES = { paal, piel, pual, hifil, hufal, hitpael, nifal };
const TRANSLIT = { א: "a", ב: "b", ג: "g", ד: "d", ה: "h", ו: "v", ז: "z", ח: "x", ט: "q", י: "y", כ: "k", ל: "l", מ: "m", נ: "n", ס: "s", ע: "e", פ: "p", צ: "c", ק: "j", ר: "r", ש: "w", ת: "t" };
export const autoId = (binyan, root) => binyan + "_" + unfin(root).replace(/-/g, "").split("").map(c => TRANSLIT[c]).join("");

const finAll = x => [...new Set(arr(x).map(s => fin(s)).filter(Boolean))];
const finMap = m => Object.fromEntries(Object.entries(m).map(([k, v]) => [k, finAll(v)]));
// "a,b|c,d" -> {key: [..]} helper for hand-entered overrides
export const listToMap = (keys, s) => Object.fromEntries(s.split(",").map((x, i) => [keys[i], x.split("|")]));

/**
 * Build one verb. row = [infinitive, past3ms, presentMs, english, root, binyan, opts]
 * opts: c (class), fut ("a"|"o"), vow, alef, altY, fvow, pp (passive participle), noun (string | string[] | "auto"),
 *       noImp, noPresent, over {tense:{key:[..]}}, add {tense:{key:[..]}}, irregInf, id, review (string)
 */
export function buildVerb(row) {
  const [inf, past3, presMs, english, root, binyan, o = {}] = row;
  const errors = [];
  const L = unfin(o.letters || root).split("-"); // letters: stem consonants when they differ from the displayed root (e.g. התעורר)
  const r = RECIPES[binyan](L, o);
  const forms = {};
  if (r.present && !o.noPresent) forms.present = finMap(r.present);
  if (r.past) forms.past = finMap(r.past);
  if (r.future) forms.future = finMap(r.future);
  if (r.imperative && !o.noImp) forms.imperative = finMap(r.imperative);
  if (r.infinitive) forms.infinitive = finAll(r.infinitive);
  if (o.pp && r.participle) forms.passiveParticiple = finMap(r.participle);
  const noun = o.noun === "auto" ? r.autoNoun : o.noun;
  if (noun) forms.verbalNoun = finAll(noun);
  // hand overrides / additions
  for (const [t, m] of Object.entries(o.over || {})) {
    if (m === null) delete forms[t];
    else if (Array.isArray(m)) forms[t] = finAll(m);
    else { forms[t] = forms[t] || {}; for (const [k, v] of Object.entries(m)) forms[t][k] = finAll(v); }
  }
  for (const [t, m] of Object.entries(o.add || {})) for (const [k, v] of Object.entries(m)) forms[t][k] = finAll([...forms[t][k], ...arr(v)]);
  // cross-checks against the independently supplied forms
  const finInf = inf && fin(inf);
  if (inf && forms.infinitive && forms.infinitive[0] !== finInf) {
    if (o.irregInf) forms.infinitive = finAll(inf);
    else errors.push(`infinitive: engine "${forms.infinitive[0]}" ≠ given "${finInf}"`);
  } else if (inf && !forms.infinitive) forms.infinitive = finAll(inf);
  if (past3 && forms.past?.["3ms"]?.[0] !== fin(past3)) errors.push(`past 3ms: engine "${forms.past?.["3ms"]?.[0]}" ≠ given "${fin(past3)}"`);
  if (presMs && !o.noPresent && forms.present?.ms?.[0] !== fin(presMs)) errors.push(`present ms: engine "${forms.present?.ms?.[0]}" ≠ given "${fin(presMs)}"`);
  const weak = binyan === "paal" ? (o.c && o.c !== "reg") || L[2] === "ה" || !!o.alef || L[0] === "י" || L[0] === "א" || L[2] === "א" || !!o.weak : undefined;
  const verb = { id: o.id || autoId(binyan, root), infinitive: finInf || undefined, english, binyan };
  if (weak) verb.weak = true;
  verb.root = root;
  if (o.syn) verb.synonyms = o.syn;
  verb.forms = forms;
  return { verb, errors, review: o.review };
}
