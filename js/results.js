// Results screen rendering + personal bests.
import { $, esc } from "./util.js";
import { store } from "./storage.js";
import { BEST_KEY } from "./config.js";
import { drillById, prompt, cue, vocalisedFor } from "./drills.js";
import { pronHtml } from "./pron.js";

export function renderResults(G, answers) {
  const acc = G.total ? Math.round(100 * G.correct / G.total) : 0;
  $("rScore").textContent = G.correct + (G.total ? ` / ${G.total}` : "");
  $("rSub").textContent = G.total ? `${acc}% accuracy · best streak ${G.best}` + (G.time ? ` · ${G.time / 60} min` : "") : "No answers yet";
  const rb = $("rBest"); rb.classList.add("hidden");
  if (G.time && !G.custom && G.total) {
    const key = BEST_KEY(G.time), prev = store.get(key, 0);
    if (G.correct > prev) {
      store.set(key, G.correct);
      if (prev) { rb.textContent = `🏆 New personal best for ${G.time / 60} min (was ${prev})`; rb.classList.remove("hidden"); }
    } else { rb.textContent = `Personal best for ${G.time / 60} min: ${prev}`; rb.classList.remove("hidden"); }
  }
  const tb = $("missedBody"); tb.innerHTML = "";
  G.missed.forEach(m => {
    const p = prompt(m.q), c = cue(m.q, { english: true, root: false }); const tr = document.createElement("tr");
    tr.innerHTML = `<td><span class="hw sm">${c.main}</span> <span class="muted">${m.q.v.en}</span></td><td>${drillById(m.q.t).name}</td><td><span class="hw sm">${p[0]}</span> <span class="muted">${p[1]}</span></td><td class="hw yours">${esc(m.yours)}</td><td class="hw right">${answers(m.q).join(" / ")}${pronHtml(vocalisedFor(m.q)) ? `<div class="pron-line">${pronHtml(vocalisedFor(m.q))}</div>` : ""}</td>`;
    tb.appendChild(tr);
  });
  $("missedPanel").classList.toggle("hidden", !G.missed.length);
  $("missedBtn").classList.toggle("hidden", !G.missed.length);
}

/** Unique missed questions, doubled, for "practice my mistakes". */
export function missedPool(G) {
  const seen = new Set(), items = [];
  G.missed.forEach(m => { const k = m.q.v.id + m.q.t + m.q.pi; if (!seen.has(k)) { seen.add(k); items.push(m.q); } });
  return items.concat(items);
}
