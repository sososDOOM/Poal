// Verb charts tab.
import { $ } from "./util.js";
import { DB } from "./data.js";
import { CHART_ROWS, PARTICIPLE_ROWS } from "./config.js";
import { DRILLS, drillById, prompts, answersFor, hasDrill, isAvailable, isFormal } from "./drills.js";
import { pronHtml } from "./pron.js";

export function renderChartSel() {
  const sel = $("chartSel");
  DB.groups.forEach(g => {
    const og = document.createElement("optgroup"); og.label = g.name;
    DB.verbs.filter(v => v.g === g.id).forEach(v => { const o = document.createElement("option"); o.value = v.id; o.textContent = `${v.inf} — ${v.en}`; og.appendChild(o); });
    if (og.children.length) sel.appendChild(og);
  });
  sel.onchange = () => { vpSel = null; renderChart(sel.value); };
  renderChart(DB.verbs[0].id);
}
/** Re-draw the chart for the selected verb (after the vowels setting changes). */
export const refreshChart = () => renderChart($("chartSel").value);

const formsCell = (forms, voc) => `${forms[0]}${voc && pronHtml(voc) ? `<small class="pron-line">${pronHtml(voc)}</small>` : ""}${forms.length > 1 ? `<small>also ${forms.slice(1).join(", ")}</small>` : ""}`;
const table = (drillId, title, rows, empty) =>
  `<div class="ctable"><h3 class="${drillId}">${title}</h3><table>${rows.length ? rows.join("") : `<tr><td class="p nof" colspan="2">${empty}</td></tr>`}</table></div>`;
const row = (label, heb, forms, cls = "", voc = null) => `<tr class="${cls}"><td class="p">${label}${heb ? `<span class="he">${heb}</span>` : ""}</td><td class="f">${formsCell(forms, voc)}</td></tr>`;

function renderChart(id) {
  const v = DB.byId.get(id), g = DB.groups.find(x => x.id === v.g);
  let h = `<div class="chead"><span class="inf he">${v.inf}</span><span class="en">${v.en}</span><span class="tag">${g.name} · ${g.he}</span><span class="tag">root ${v.root}</span></div><div class="cgrid">`;
  ["present", "past", "future", "imperative"].forEach(tid => {
    const d = drillById(tid), f = v.t[tid];
    const rows = f ? CHART_ROWS[tid].filter(r => f[r[2]]).map(r => row(r[0], r[1], f[r[2]], /formal/.test(r[0]) ? "formal" : "", DB.voc?.[v.id]?.[tid]?.[r[2]])) : [];
    const empty = tid === "present" ? "No present-tense form (Hebrew drops “to be” in the present)." : "Not commonly used / not drilled.";
    h += table(tid, `${d.name} · ${d.he}`, rows, empty);
  });
  // non-finite forms
  const other = [];
  if (v.t.infinitive && v.hasInf) other.push(row("Infinitive", "", v.t.infinitive, "", DB.voc?.[v.id]?.infinitive));
  if (v.t.verbalNoun) other.push(row("Verbal noun", "", v.t.verbalNoun));
  if (v.t.passiveParticiple) PARTICIPLE_ROWS.forEach(([lab, k]) => other.push(row(`Passive participle, ${lab}`, "", v.t.passiveParticiple[k], "", DB.voc?.[v.id]?.passiveParticiple?.[k])));
  if (other.length) h += table("infinitive", "Other forms · שם פועל, שם פעולה, בינוני סביל", other, "");
  // compound tenses
  ["pastprog", "futprog"].forEach(tid => {
    if (!hasDrill(v, tid)) return;
    const d = drillById(tid), rows = prompts(tid).map((p, pi) => isAvailable(v, tid, pi) ? row(p[1], p[0], answersFor(v, tid, pi)) : "").filter(Boolean);
    h += table(tid, `${d.name} · ${d.he}`, rows, "");
  });
  $("chartOut").innerHTML = h + "</div>";
  renderVp();
}

// ---- "Practice just this verb": mini picker for which drills to include ----
let vpSel = null; // Set of drill ids; null = all the verb's drills (reset when the verb changes)
const vpDrills = v => DRILLS.filter(d => hasDrill(v, d.id));
const vpCount = (v, id) => prompts(id).filter((p, pi) => !isFormal(p) && isAvailable(v, id, pi)).length;

function renderVp() {
  const v = DB.byId.get($("chartSel").value), drills = vpDrills(v);
  if (!vpSel) vpSel = new Set(drills.map(d => d.id));
  const box = $("vpChips"); box.innerHTML = "";
  drills.forEach(d => {
    const b = document.createElement("button"); b.className = "chip" + (vpSel.has(d.id) ? " on" : "");
    b.innerHTML = `<span class="h">${d.he}</span>${d.name}<span class="ex">${vpCount(v, d.id)}</span>`;
    b.onclick = () => { vpSel.has(d.id) ? vpSel.delete(d.id) : vpSel.add(d.id); b.classList.toggle("on"); updateVp(); };
    box.appendChild(b);
  });
  updateVp();
}
function updateVp() {
  const n = chartPool().length;
  $("vpInfo").textContent = n ? `${n} questions` : "Pick at least one drill.";
  $("vpStart").disabled = !n;
}
export function wireVerbPractice(startFn) {
  $("chartPractice").onclick = () => { const p = $("vpPanel"); p.classList.toggle("hidden"); if (!p.classList.contains("hidden")) renderVp(); };
  $("vpStart").onclick = () => startFn(chartPool());
  document.querySelectorAll("[data-vp]").forEach(b => b.onclick = () => {
    const v = DB.byId.get($("chartSel").value); vpSel = new Set(b.dataset.vp === "all" ? vpDrills(v).map(d => d.id) : []); renderVp();
  });
}

/** Drillable questions for the verb shown in the chart, limited to the drills ticked in the mini picker. */
export function chartPool() {
  const v = DB.byId.get($("chartSel").value), items = [];
  DRILLS.filter(d => !vpSel || vpSel.has(d.id)).forEach(d => prompts(d.id).forEach((p, pi) => { if (!isFormal(p) && isAvailable(v, d.id, pi)) items.push({ v, t: d.id, pi }); }));
  return items;
}
