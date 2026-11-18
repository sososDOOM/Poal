// Entry point: load data, build the UI, wire navigation.
import { $ } from "./util.js";
import { loadData } from "./data.js";
import { initState } from "./state.js";
import { show } from "./views.js";
import { renderSetup, wireSetup, pool } from "./setup.js";
import { start, wireGame, getGame, isGameActive, abandonGame } from "./game.js";
import { missedPool } from "./results.js";
import { buildKeyboard } from "./keyboard.js";
import { renderChartSel, chartPool, refreshChart } from "./charts.js";
import { loadVocalised } from "./data.js";
import { S } from "./state.js";
import { wireRipple } from "./ripple.js";

async function init() {
  try { await loadData(); }
  catch (e) {
    $("binyanChips").innerHTML = `<p class="note">Couldn't load the verb data (${e.message}). If you opened index.html directly from disk, serve the folder over http instead — e.g. <code>npx serve</code> or <code>python -m http.server</code>.</p>`;
    return;
  }
  wireRipple();
  initState();
  if (S.vowels !== "off") await loadVocalised();
  wireSetup(); wireGame(); buildKeyboard(getGame);

  $("startBtn").onclick = () => start();
  $("againBtn").onclick = () => { const G = getGame(); start(G && G.custom ? G.items : null); };
  $("missedBtn").onclick = () => start(missedPool(getGame()));
  $("setupBtn").onclick = () => { show("setup"); renderSetup(); };
  $("chartPractice").onclick = () => start(chartPool());
  $("tab-practice").onclick = () => { if (isGameActive()) return; show("setup"); renderSetup(); };
  $("tab-charts").onclick = () => { if (isGameActive()) abandonGame(); show("charts"); refreshChart(); };

  renderSetup(); renderChartSel();
}
init();
