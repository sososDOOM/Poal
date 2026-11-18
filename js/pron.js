// Renders a vowelled form and/or its transliteration according to the "vowels" setting.
import { transliterateAll } from "./translit.js";
import { S } from "./state.js";

/** HTML for a vowelled form; "" when the setting is off or there is no vowelled form. */
export function pronHtml(voc, mode = S.vowels) {
  if (!voc || mode === "off") return "";
  const parts = [];
  if (mode === "vowels" || mode === "both") parts.push(`<span class="voc he">${voc}</span>`);
  if (mode === "translit" || mode === "both") parts.push(`<span class="tl">${transliterateAll(voc)}</span>`);
  return parts.join(" ");
}
