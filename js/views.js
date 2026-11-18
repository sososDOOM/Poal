// Screen switching.
import { $ } from "./util.js";
export function show(v) {
  ["setup", "game", "results", "charts"].forEach(x => $("v-" + x).classList.toggle("hidden", x !== v));
  $("tab-practice").classList.toggle("on", v !== "charts");
  $("tab-charts").classList.toggle("on", v === "charts");
  window.scrollTo(0, 0);
}
