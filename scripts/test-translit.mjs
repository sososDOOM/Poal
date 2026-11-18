import { transliterate } from "../js/translit.js";
const cases = [["כָּתַבְתִּי", "katavti"], ["לִכְתֹּב", "likhtov"], ["מַזְמִין", "mazmin"], ["הִזְמִין", "hizmin"], ["שׁוֹמֵעַ", "shomea"], ["יִכְתְּבוּ", "yikhtevu"], ["אֶכְתֹּב", "ekhtov"], ["כּוֹתֵב", "kotev"], ["כָּתוּב", "katuv"], ["מְדַבֵּר", "medaber"], ["תִּקְנֶה", "tikne"], ["קָנָה", "kana"], ["פּוֹתֵחַ", "poteakh"], ["הִזְמַנְתְּ", "hizmant"], ["כָּתַבְתְּ", "katavt"]];
let bad = 0;
for (const [h, want] of cases) { const got = transliterate(h); if (got !== want) { console.error(`✗ ${h}: got ${got}, want ${want}`); bad++; } }
console.log(bad ? `✗ ${bad} failure(s)` : `✓ translit: ${cases.length} cases`); process.exit(bad ? 1 : 0);
