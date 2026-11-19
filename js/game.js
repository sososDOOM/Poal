// The practice game: question flow, scoring, timer.
import { $, rand } from "./util.js";
import { S, saveSettings } from "./state.js";
import { drillById, prompt, answers, cue, vocalisedFor } from "./drills.js";
import { pronHtml } from "./pron.js";
import { transliterateAll } from "./translit.js";
import { DB } from "./data.js";
import { norm, mapKeys } from "./hebrew.js";
import { matchesMeaning } from "./english.js";
import { esc } from "./util.js";
import { show } from "./views.js";
import { renderResults } from "./results.js";
import { pool } from "./setup.js";

let G = null, timerId = null;

export const getGame = () => G;
export const isGameActive = () => !!(G && !G.over);
export function abandonGame() { clearInterval(timerId); if (G) G.over = true; }

export function start(customPool) {
  const items = customPool || pool(); if (!items.length) return;
  G = {
    items, custom: !!customPool, correct: 0, total: 0, streak: 0, best: 0, missed: [], cur: null, answered: false,
    time: customPool ? 0 : S.time, count: customPool ? customPool.length : (S.time ? 0 : S.count), left: customPool ? 0 : S.time,
    queue: customPool ? [...items].sort(() => Math.random() - .5) : null,
  };
  $("kb").classList.toggle("hidden", !S.kb); $("ans").inputMode = S.kb ? "none" : "text";
  show("game"); updateHud(); next();
  clearInterval(timerId);
  if (G.time) timerId = setInterval(() => { G.left--; updateHud(); if (G.left <= 0) finish(); }, 1000);
}

function updateHud() {
  $("sCorrect").textContent = G.correct; $("sTotal").textContent = G.total; $("sStreak").textContent = G.streak;
  const tv = $("tVal");
  if (G.time) { $("tLabel").textContent = "Time"; const m = Math.floor(G.left / 60), s = G.left % 60; tv.textContent = `${m}:${String(s).padStart(2, "0")}`; tv.classList.toggle("low", G.left <= 10); }
  else if (G.count) { $("tLabel").textContent = "Question"; tv.textContent = `${Math.min(G.total + (G.answered ? 0 : 1), G.count)}/${G.count}`; tv.classList.remove("low"); }
  else { $("tLabel").textContent = "Mode"; tv.textContent = "∞"; }
}

function next() {
  let q;
  if (G.queue) { q = G.queue.shift(); if (!q) return finish(); }
  else { let tries = 0; do { q = rand(G.items); tries++; } while (G.cur && q.v === G.cur.v && q.t === G.cur.t && q.pi === G.cur.pi && tries < 10); }
  G.cur = q; G.answered = false;
  const p = prompt(q), drill = drillById(q.t), c = cue(q, S);
  $("qInf").textContent = c.main;
  setTip($("qInf"), q);
  $("qEn").textContent = c.en;
  $("qMeta").textContent = c.meta;
  const te = $("qTense"); te.className = "tense " + q.t; te.textContent = `${drill.name} · ${drill.he}`;
  $("qPron").textContent = p[0]; $("qGloss").textContent = p[1];
  const meaning = isMeaning(q);
  const a = $("ans"); a.value = ""; a.className = meaning ? "en-input" : ""; a.readOnly = false; $("ansBtn").textContent = "Check"; $("fb").innerHTML = "";
  a.dir = meaning ? "ltr" : "rtl"; a.lang = meaning ? "en" : "he"; a.placeholder = meaning ? "type the English meaning…" : "…"; // the meaning drill is typed in English
  $("kb").classList.toggle("hidden", !S.kb || meaning);
  $("hintline").innerHTML = meaning ? "Type what the verb means, then press <b>Enter</b>. If you're not exact you can mark yourself right or wrong." : "Press <b>Enter</b> to check · no Hebrew keyboard? Just type on your English keys — they map to the standard Israeli layout.";
  G.grading = false;
  updateHud();
  if (meaning || !S.kb || window.matchMedia("(pointer:fine)").matches) a.focus();
}

/** Hover bubble on the headword: its transliteration (always available, independent of the vowels setting). Not shown in the infinitive drill, where the headword is the root and the infinitive is the answer. */
function setTip(el, q) {
  const voc = DB.voc?.[q.v.id], form = q.v.hasInf ? voc?.infinitive : voc?.past?.["3ms"];
  if (q.t !== "infinitive" && form) el.dataset.tl = transliterateAll(form); else delete el.dataset.tl;
}
const isMeaning = q => drillById(q.t).kind === "meaning";

function check() {
  if (G.grading) return; // waiting for "I was right / wrong"
  if (G.answered) { next(); return; }
  const a = $("ans"), val = a.value.trim(); if (!val) { a.focus(); return; }
  if (isMeaning(G.cur)) {
    if (matchesMeaning(val, G.cur.v)) return settle(true, val); // exact enough: credited automatically
    return selfCheck(val); // otherwise the player judges their own answer
  }
  settle(answers(G.cur).some(x => norm(x, S.lenient) === norm(val, S.lenient)), val);
}

/** Meaning drill, answer not an exact match: reveal the gloss and let the player decide. */
function selfCheck(val) {
  G.grading = true; $("ans").readOnly = true;
  $("fb").innerHTML = `<span>Meaning: <span class="corr en">${esc(answers(G.cur)[0])}</span></span><span><button type="button" class="selfbtn good" data-r="1">I was right</button> <button type="button" class="selfbtn bad" data-r="0">I was wrong</button></span><span class="hint">You wrote: ${esc(val)}</span>`;
  $("fb").querySelectorAll(".selfbtn").forEach(b => b.onclick = () => { G.grading = false; settle(b.dataset.r === "1", val); });
}

/** Record a result (correct or not) and move on. */
function settle(ok, val) {
  const a = $("ans"), meaning = isMeaning(G.cur), main = answers(G.cur)[0];
  G.total++; G.answered = true; a.readOnly = true;
  if (ok) {
    G.correct++; G.streak++; G.best = Math.max(G.best, G.streak); a.classList.add("good");
    $("fb").innerHTML = `<span class="ok">✓ Correct</span>` + (meaning ? ` <span class="corr en">${esc(main)}</span>` : norm(val) !== norm(main) ? ` <span class="corr">${main}</span>` : "");
    updateHud();
    setTimeout(() => { if (!G || G.over || !G.answered) return; isDone() ? finish() : next(); }, 650);
  } else {
    G.streak = 0; a.classList.add("bad"); G.missed.push({ q: G.cur, yours: val });
    $("fb").innerHTML = `<span class="no">✗</span> Correct answer: <span class="corr${meaning ? " en" : ""}">${esc(main)}</span><span class="hint">Press Enter to continue</span>`;
    $("ansBtn").textContent = "Next"; updateHud();
    if (isDone()) setTimeout(() => { if (G.answered) $("ansBtn").textContent = "Results"; }, 10);
  }
  showPron();
  a.focus();
}
/** Line under a revealed answer: vowels follow the setting; transliteration follows the "Show transliteration" button. */
function showPron() {
  $("fb").querySelector(".pron-line")?.remove();
  if (!G || !G.answered || G.grading) return;
  const vow = S.vowels === "vowels" || S.vowels === "both";
  const mode = vow && S.tl ? "both" : vow ? "vowels" : S.tl ? "translit" : "off";
  const pr = pronHtml(vocalisedFor(G.cur), mode); if (pr) $("fb").insertAdjacentHTML("beforeend", `<span class="pron-line">${pr}</span>`);
}
function syncTlBtn() { $("tlBtn").textContent = S.tl ? "Hide transliteration" : "Show transliteration"; }
const isDone = () => G.count && G.total >= G.count;

export function finish() {
  clearInterval(timerId); if (!G || G.over) return; G.over = true;
  renderResults(G, answers);
  show("results");
}

export function wireGame() {
  $("ansForm").onsubmit = e => { e.preventDefault(); if (G.grading) return; if (G.answered && isDone()) { finish(); return; } check(); };
  $("ans").addEventListener("input", e => { if (G && G.cur && isMeaning(G.cur)) return; const el = e.target, m = mapKeys(el.value); if (m !== el.value) el.value = m; });
  $("quitBtn").onclick = () => finish();
  $("tlBtn").onclick = () => { S.tl = !S.tl; saveSettings(); syncTlBtn(); showPron(); $("ans").focus(); };
  syncTlBtn();
}
