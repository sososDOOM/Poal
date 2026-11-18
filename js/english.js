// Matching a typed English meaning against a verb's gloss. Pure functions, no DOM.
// "to learn, study" accepts: "to learn", "learn", "study", "to study" (case, punctuation and a leading "to" are ignored).

export function normEnglish(s) {
  return (s || "").toLowerCase().replace(/\([^)]*\)/g, " ").replace(/[^a-z' ]+/g, " ").replace(/\s+/g, " ").trim().replace(/^to /, "").trim();
}

/** All accepted answers for a verb, normalised: each comma/semicolon-separated part of the gloss, the word in any
 *  parentheses ("to live (reside)" accepts "reside"), the part without a trailing particle ("ask for" accepts "ask"), and synonyms. */
export function acceptedMeanings(verb) {
  const out = new Set();
  const add = x => { x = normEnglish(x); if (x) { out.add(x); out.add(x.replace(/ (for|to|at|up|down|out|on|off|in|about|from|with|of)$/, "")); } };
  verb.en.split(/[,;]/).forEach(part => { add(part); [...part.matchAll(/\(([^)]*)\)/g)].forEach(m => add(m[1])); });
  (verb.syn || []).forEach(add);
  return [...out].filter(Boolean);
}

export const matchesMeaning = (typed, verb) => acceptedMeanings(verb).includes(normEnglish(typed));
