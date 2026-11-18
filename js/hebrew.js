// Pure Hebrew text helpers: answer normalisation and keyboard mapping. No DOM access.
const FIN = { "ך": "כ", "ם": "מ", "ן": "נ", "ף": "פ", "ץ": "צ" };
const TOFINAL = { "כ": "ך", "מ": "ם", "נ": "ן", "פ": "ף", "צ": "ץ" };

// Standard Israeli layout: English key -> Hebrew letter.
export const QWERTY_TO_HEBREW = { e: "ק", r: "ר", t: "א", y: "ט", u: "ו", i: "ן", o: "ם", p: "פ", a: "ש", s: "ד", d: "ג", f: "כ", g: "ע", h: "י", j: "ח", k: "ל", l: "ך", ";": "ף", z: "ז", x: "ס", c: "ב", v: "ה", b: "נ", n: "מ", m: "צ", ",": "ת", ".": "ץ" };

/** Strip niqqud/punctuation/spaces, fold final letters; lenient also drops ו and י. */
export function norm(s, lenient) {
  s = (s || "").normalize("NFC").replace(/[֑-ׇ]/g, "").replace(/[\s\-־'"׳״.,]/g, "").replace(/[ךםןףץ]/g, c => FIN[c]);
  if (lenient) s = s.replace(/[וי]/g, "");
  return s;
}
export const fixFinal = s => s.replace(/[כמנפצ]$/, c => TOFINAL[c]);
export const mapKeys = v => v.split("").map(c => QWERTY_TO_HEBREW[c.toLowerCase()] || c).join("");
