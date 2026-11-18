# אנחנו מטים — Hebrew verb conjugation practice

A static website (no framework, no build step for the site itself) for drilling Hebrew verb forms, modeled on Conjuguemos.

## Run it locally

```bash
npm start        # serves this folder at http://localhost:8000  (needs Python; or use any static server)
```

The page loads `data/verbs.json` with `fetch`, so opening `index.html` directly from disk won't work. Use a local server.

To get a file you can just double-click, run `npm run build:standalone`. It packs the whole site (CSS, JS, verb data) into `../אנחנו מטים.html`. That file is generated, so rebuild it after any change here.

## What's in the box

| Path | What it is |
| --- | --- |
| `index.html` | Page markup |
| `css/style.css` | **All** styling. Design tokens (colours, fonts, radius) are CSS variables at the top; JS sets no inline styles |
| `js/` | ES modules: `main.js` (entry) · `data.js` (loads verbs) · `drills.js` (drill types, prompts, answers) · `config.js` (pronoun tables, keyboard) · `setup.js` · `game.js` · `results.js` · `charts.js` · `keyboard.js` · `hebrew.js` (normalisation, QWERTY→Hebrew) · `state.js` / `storage.js` (settings, localStorage) |
| `data/verbs.json` | The verb data the site reads. **Generated**: don't edit by hand |
| `data/vocalised.json` | Vowelled (niqqud) forms for most verbs; loaded only if the player turns vowels/transliteration on. **Generated** |
| `data/needs-review.md` | Forms a Hebrew speaker should check. Generated |
| `scripts/` | Data pipeline, checks and tests (see below) |

## Choosing verbs

Setup picks verbs by **binyan** only (pa'al, pi'el, hif'il, hitpa'el, nif'al, pu'al, huf'al): each chip brings in all of that binyan's verbs, regular and weak-root, in random order. The verb charts tab still lets you open any single verb and "Practice just this verb".

## Drill types

Present, past, future, imperative · **meaning** (type the English; exact matches are credited automatically, otherwise you mark yourself right or wrong, which lets you practise without ever seeing the meaning) · infinitive (shown as root + binyan + meaning) · passive participle (כתוב) · verbal noun (שם פעולה) · compound tenses (הייתי כותב, אהיה כותב; built from the forms of להיות plus the present participle) · optional formal feminine plural (תכתובנה).

## Vowels and transliteration

Setup has a "Vowels & pronunciation" option (off / vowels / transliteration / both). It shows the vowelled form and/or a Latin transliteration under each revealed answer, in the missed-answers table and in the verb charts. Typing is still unvocalised. Vowels come from `scripts/niqqud.mjs` (explicit templates per root class) and are compared against Wiktionary by `npm run check:vowels`; verbs of classes not yet covered show no vowels (see `data/needs-review.md` for exactly which).

## The data pipeline

Forms are **generated, then checked**, never typed form by form:

```
scripts/seeds/*.mjs   one row per verb: infinitive, past 3ms, present ms, English, root, binyan, class tags
        │
scripts/engine.mjs    conjugation engine (unvocalised ktiv male spelling, per binyan and root class)
        │   npm run build
data/verbs.json       every person/tense/alternate spelling, schema version 2
```

Each seed row carries three forms entered independently of the engine (infinitive, past 3ms, present ms). If the engine disagrees, the build fails, so a wrong class tag is caught immediately.

```bash
npm run build         # regenerate data/verbs.json, data/vocalised.json and data/needs-review.md from the seeds
npm run test:engine   # the engine must reproduce the 41 hand-entered prototype verbs exactly
npm run validate      # schema check: right persons per tense, Hebrew letters only, final letters, ids...
npm run check         # engine test + schema validation + vowel build + translit and english-matcher tests
npm run check:vowels  # compare our vowels with the cached Wiktionary tables (after running verify-wiktionary)
```

### Adding a verb

Add a row to the right file in `scripts/seeds/`, run `npm run build`, then `npm run check`. Class tags are documented at the top of `scripts/engine.mjs` (`c: "hol" | "pnun" | "pyod" | "pdrop"`, `fut: "a" | "o"`, `alef`, `noun`, `pp`, `noImp`, `over`, `review`...). Add a `review: "..."` note to anything you're not sure about and it lands in `data/needs-review.md`.

### Independent check against Wiktionary

```bash
node scripts/verify-wiktionary.mjs            # fetches pages slowly (cached in scripts/.cache, git-ignored)
node scripts/verify-wiktionary.mjs --cache-only
```

This compares our forms with the conjugation tables on English Wiktionary and prints disagreements. It only **reads** Wiktionary; none of its text is included in `data/verbs.json`. Wiktionary content is available under the [Creative Commons Attribution-ShareAlike 4.0 license](https://creativecommons.org/licenses/by-sa/4.0/) (<https://en.wiktionary.org>); we cite it as a verification source and are grateful to its contributors. No copyrighted conjugation sites are scraped.

### Data schema (v2)

```jsonc
{
  "id": "katav", "infinitive": "לכתוב", "english": "to write",
  "binyan": "paal", "weak": true /* pa'al only: shown in the "weak roots" group */, "root": "כ-ת-ב",
  "forms": {
    "present":    { "ms": ["כותב"], "fs": [...], "mp": [...], "fp": [...] },
    "past":       { "1s": [...], "2ms": [...], "2fs": [...], "3ms": [...], "3fs": [...], "1p": [...], "2mp": [...], "2fp": [...], "3p": [...] },
    "future":     { "1s": [...], ..., "2p": [...], "3p": [...], "2fp": [...], "3fp": [...] }, // 2fp/3fp = formal
    "imperative": { "ms": [...], "fs": [...], "p": [...], "fp": [...] },                     // fp = formal
    "infinitive": ["לכתוב"], "verbalNoun": ["כתיבה"],
    "passiveParticiple": { "ms": ["כתוב"], "fs": ["כתובה"], "mp": [...], "fp": [...] }
  }
}
```

Every form is an array: the first entry is the canonical spelling shown as the answer; the rest are accepted alternates. Pu'al and huf'al verbs have no infinitive or imperative (their `infinitive` field is absent; the app shows the past 3ms as the headword). Tenses a verb doesn't use are simply omitted.

## Deploying

The site is plain static files; any static host works (Cloudflare Pages, Netlify, GitHub Pages). Publish the folder as-is; there is no build command and the output directory is the repo root.

## Later (not built yet)

Accounts, teacher classes/assignments and leaderboards (e.g. with Supabase). Where they would plug in: `js/storage.js` (settings and personal bests are the only persisted data; swap localStorage for a synced store) and `js/results.js` (the one place a finished round's score is produced; post it to a backend there). `js/data.js` is the only module that knows where verbs come from.
