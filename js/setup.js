// Setup screen: binyan / drill / option pickers.
import { $ } from "./util.js";
import { DB } from "./data.js";
import { S, saveSettings } from "./state.js";
import { TIME_OPTIONS, COUNT_OPTIONS, VOWEL_OPTIONS, BINYANIM } from "./config.js";
import { loadVocalised } from "./data.js";
import { DRILLS, prompts, isAvailable, isFormal } from "./drills.js";

/** Every (verb, drill, prompt) question the current selection allows. */
export function pool() {
  const items = [];
  DB.verbs.forEach(v => {
    if (!S.binyanim.has(v.binyan)) return;
    S.tenses.forEach(t => prompts(t).forEach((p, pi) => {
      if (isFormal(p) && !S.formal) return; // formal feminine plural only when asked for
      if (isAvailable(v, t, pi)) items.push({ v, t, pi });
    }));
  });
  return items;
}

const verbCount = id => DB.verbs.filter(v => v.binyan === id).length;

export function renderSetup() {
  const bc = $("binyanChips"); bc.innerHTML = "";
  BINYANIM.forEach(b => {
    const n = verbCount(b.id); if (!n) return;
    const el = document.createElement("button"); el.className = "chip" + (S.binyanim.has(b.id) ? " on" : "");
    el.innerHTML = `<span class="h">${b.he}</span>${b.name}<span class="ex">${n} verbs</span>`;
    el.title = b.note;
    el.onclick = () => { S.binyanim.has(b.id) ? S.binyanim.delete(b.id) : S.binyanim.add(b.id); el.classList.toggle("on"); updateInfo(); };
    bc.appendChild(el);
  });
  const tc = $("tenseChips"); tc.innerHTML = "";
  DRILLS.forEach(t => {
    const b = document.createElement("button"); b.className = "chip" + (S.tenses.has(t.id) ? " on" : "");
    b.innerHTML = `<span class="h">${t.he}</span>${t.name}` + (t.example ? `<span class="ex he">${t.example}</span>` : "");
    b.onclick = () => { S.tenses.has(t.id) ? S.tenses.delete(t.id) : S.tenses.add(t.id); b.classList.toggle("on"); updateInfo(); };
    tc.appendChild(b);
  });
  seg("segTime", TIME_OPTIONS, "time");
  seg("segCount", COUNT_OPTIONS, "count");
  seg("segVowels", VOWEL_OPTIONS, "vowels", async () => { if (S.vowels !== "off") await loadVocalised(); });
  $("countOpt").classList.toggle("hidden", S.time !== 0);
  ["english", "root", "kb", "lenient", "formal"].forEach(k => {
    const el = $("opt" + k[0].toUpperCase() + k.slice(1)); el.checked = S[k]; el.onchange = () => { S[k] = el.checked; saveSettings(); updateInfo(); };
  });
  updateInfo();
}

function seg(id, opts, key, after) {
  const el = $(id); el.innerHTML = "";
  opts.forEach(([v, l]) => {
    const b = document.createElement("button"); b.textContent = l; b.className = S[key] === v ? "on" : "";
    b.onclick = async () => { S[key] = v; saveSettings(); if (after) await after(); renderSetup(); };
    el.appendChild(b);
  });
}

function updateInfo() {
  const n = pool().length, el = $("startInfo");
  if (!S.binyanim.size) el.innerHTML = '<span class="warn">Pick at least one binyan.</span>';
  else if (!S.tenses.size) el.innerHTML = '<span class="warn">Pick at least one drill type.</span>';
  else if (!n) el.innerHTML = '<span class="warn">Those verbs don\'t have the forms you picked — add another drill type.</span>';
  else el.textContent = `${nVerbs()} verbs · ${S.tenses.size} drill${S.tenses.size > 1 ? "s" : ""} · ${n} possible questions`;
  $("startBtn").disabled = !n; saveSettings();
}

const nVerbs = () => DB.verbs.filter(v => S.binyanim.has(v.binyan)).length;

export function wireSetup() {
  document.querySelectorAll("[data-all]").forEach(b => b.onclick = () => {
    S.binyanim = b.dataset.all === "1" ? new Set(BINYANIM.filter(x => verbCount(x.id)).map(x => x.id)) : new Set();
    renderSetup();
  });
}
