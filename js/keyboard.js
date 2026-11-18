// On-screen Hebrew keyboard (Israeli layout).
import { $ } from "./util.js";
import { KEY_ROWS, FINAL_LETTERS } from "./config.js";
import { fixFinal } from "./hebrew.js";

/** getGame: returns the current game (or null); keys are inert once a question is answered. */
export function buildKeyboard(getGame) {
  const kb = $("kb");
  const locked = () => { const G = getGame(); return !G || G.answered; };
  const btn = (cls, text, onclick) => { const b = document.createElement("button"); b.type = "button"; b.className = cls; b.textContent = text; b.onclick = onclick; return b; };
  KEY_ROWS.forEach((r, i) => {
    const row = document.createElement("div"); row.className = "kbrow";
    r.forEach(c => row.appendChild(btn("key" + (FINAL_LETTERS.includes(c) ? " fin" : ""), c, () => { if (!locked()) $("ans").value += c; })));
    if (i === 2) row.appendChild(btn("key wide", "⌫", () => { if (!locked()) { const a = $("ans"); a.value = a.value.slice(0, -1); } }));
    kb.appendChild(row);
  });
  const last = document.createElement("div"); last.className = "kbrow";
  const fx = btn("key wide", "Final letter", () => { if (!locked()) { const a = $("ans"); a.value = fixFinal(a.value); } });
  fx.title = "Turn the last letter into its final form (כ→ך, מ→ם…)";
  const sp = btn("key space", "space", () => { if (!locked()) $("ans").value += " "; }); // compound tenses are two words
  last.append(fx, sp, btn("key wide enter", "Enter ⏎", () => $("ansForm").requestSubmit()));
  kb.appendChild(last);
}
