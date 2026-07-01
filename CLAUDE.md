# CLAUDE.md

Guidance for Claude Code (or any future agent) working in this repository.

## What this is

A single-page portfolio site for Katherine Keenan, a recent SUNY Brockport graduate
(B.S. English Adolescence Inclusive Education, magna cum laude, Dec 2025) applying for
K-12 English / inclusive education teaching jobs. The site exists to help her land a job:
it's meant to be linked from her resume on job applications, not discovered via search.

Source material for all content lives in `assets/` (her two portrait photos, seven lesson
plan/activity/slide PDFs, three recommendation letter PDFs, and her resume in `.docx` and
`.pdf`). Treat that folder as the source of truth for any content changes; the page copy
should stay faithful to it.

## Stack

Plain HTML/CSS/JS. No build step, no package.json, no framework. Two libraries load from
a CDN:

- [AOS](https://michalsnik.github.io/aos/) — scroll-in animations
- [PDF.js](https://mozilla.github.io/pdf.js/) — renders lesson-plan/resume thumbnails and
  powers the in-page PDF modal viewer (`pdfjs-dist` build + worker, both from cdnjs)

Fonts are Google Fonts: **Fraunces** (headings) + **Nunito Sans** (body).

## File layout

```
index.html              All markup, meta tags, JSON-LD (Person schema, no contact fields)
css/styles.css          Design tokens (CSS vars) + layout + animations, single file
js/main.js              Nav (sticky/active/mobile menu), AOS init, recommendation letter modal
js/pdf-viewer.js        PDF.js thumbnails (lazy via IntersectionObserver) + the PDF modal viewer
                        + the file:// protocol warning banner (see Gotchas below)
resume/resume.html      Source for the redacted, downloadable resume (see Resume section)
robots.txt              Blocks search indexing + ~15 named AI/scraper bots
favicon.svg, site.webmanifest
assets/
  images/               Original portraits; assets/images/hero/ has generated derivatives
                        (hero.jpg, hero-mobile.jpg, og-image.jpg) made with `sips`
  lesson_plans/         7 PDFs shown in the lesson-plan viewer, grouped into
                        Lesson Plans / Activities / Slides
  recommendations/      3 recommendation letter PDFs, linked from each card
  resume/               Original resume (.docx + full-contact .pdf, NEVER linked from the
                        page) + Katherine-Keenan-Resume.pdf (redacted, the one the site serves)
```

## Design system

Olive/sage + warm beige palette, meant to feel bright and inviting (she teaches kids).
All tokens are CSS custom properties at the top of `css/styles.css`:
`--olive`, `--olive-deep`, `--olive-light`, `--mustard`, `--terracotta`, `--cream`,
`--cream-2`, `--paper`, `--ink` family. Reuse these vars rather than hardcoding colors.

## Critical constraint: no contact data exposed

This is the single most important rule for this project. The site must never show an
email address, phone number, or contact form anywhere — not in HTML, not in the
downloadable resume, not in comments. The only outbound contact path is the LinkedIn link
in the footer (`https://www.linkedin.com/in/katherine-keenan-0b0b1714a/`).

**Why:** the client's original resume PDF has her phone and personal email on it. The
site is reached via a link on job applications, so it's effectively public; the client
explicitly chose to minimize exposed personal data once she realized the site would carry
the same contact details as the resume itself.

**How this is implemented:**
- The downloadable resume (`assets/resume/Katherine-Keenan-Resume.pdf`) is *not* her real
  resume file — it's regenerated from `resume/resume.html`, a clean HTML recreation of the
  same content, with the header showing only "Rochester, NY" (no phone/email). This
  guarantees the data is actually gone, not just visually covered.
- The original full-contact resume (`assets/resume/KatherineKeenanResumeFinal.pdf` and the
  `.docx`) stay in the repo for reference but are never linked from `index.html`.
- There is no contact form (Formspree or otherwise) — adding one would mean collecting/
  routing messages somewhere, which the client decided wasn't worth the exposure for a
  site whose only real audience finds it via her resume anyway.
- `robots.txt` sets `noindex` behavior and blocks GPTBot/CCBot/ClaudeBot/Google-Extended/
  etc., since the client doesn't want this scraped or indexed.

**Before adding anything** (a contact method, an analytics script, a third-party embed),
check whether it would leak personal data or make the page crawlable/identifiable in a way
the client didn't sign up for. When in doubt, ask rather than assume.

## Editing the resume

`assets/resume/Katherine-Keenan-Resume.pdf` is generated, not hand-edited. To change it,
edit `resume/resume.html` (plain HTML/CSS, single page, styled to match the site's design
system) and regenerate with headless Chrome:

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless --disable-gpu --no-pdf-header-footer \
  --print-to-pdf="assets/resume/Katherine-Keenan-Resume.pdf" \
  "file://$(pwd)/resume/resume.html"
```

Keep it to one page. Do not add a phone number or email to it.

## Recommendation letters: modal pattern

Each card in `#recommendations` shows a pull-quote, author/role, and an actions row
(button + "Open original PDF" link). The *full* letter text lives in a `<template>` tag
inside each `.rec-card` (not rendered, doesn't affect card height). Clicking "Read the
full letter" (`[data-letter-trigger]`) clones the template into a shared modal
(`#letter-modal` in `index.html`, wired up in `js/main.js`). This replaced an earlier
inline-expand design that pushed page content down awkwardly — the modal was a deliberate
fix after client feedback. If adding a fourth recommendation, follow this same
quote/actions/`<template>` structure, and the `.recs__grid` will keep all cards equal
height automatically (`align-items: stretch` + `.rec-card { height: 100% }` +
`.rec-card__actions { margin-top: auto }` pins the button row to the bottom of every card
regardless of quote length).

## Gotcha: PDF previews require an HTTP server, not file://

Opening `index.html` directly (double-click, `file://...`) makes every PDF.js fetch fail
silently — Chrome blocks XHR/fetch under `file://` for security reasons. This is not a bug
to "fix" in the usual sense; it's a hard browser restriction. `js/pdf-viewer.js` already
detects `window.location.protocol === "file:"` and injects a dismissible banner inside the
nav explaining this, and every thumbnail/preview falls back to "Click to open PDF" instead
of getting stuck on "Loading preview" forever. Always test with a local server:

```bash
python3 -m http.server 8000
```

This is a non-issue once deployed (GitHub Pages serves over https).

## Verifying changes

There's no test suite (static site). To verify changes:
1. Serve locally as above, open in a real browser, exercise the PDF modal (prev/next/esc),
   the lesson thumbnails (scroll them into view), the resume preview, and the letter modal.
2. Check mobile width (hamburger menu, card stacking).
3. Re-run the data-exposure sweep before considering any change done:
   ```bash
   grep -rn "794-8503\|18kschulz\|tkeenan911\|mailto:\|<form\|<input" index.html css js resume *.txt
   ```
   Expect zero hits, always.
4. If editing `index.html`, verify all local `href`/`src` references still resolve (no
   typoed/URL-encoded paths into `assets/`).

## Things to know if asked to extend this site

- It's intentionally a **single page** with anchor-nav sections — the client does not want
  multi-page navigation.
- Copy was written and then passed through the **humanizer** skill (`.github/skills/
  humanizer/SKILL.md`) to strip AI-writing tells (no em dashes, no rule-of-three, no
  promotional language, etc.). Apply the same pass to any new prose.
- The hero photo is `assets/images/Be-Teacher.jpg` (the client's choice over the other
  portrait, `Be-Teacher-2.jpg`), cropped via `sips` into `assets/images/hero/`.
- No crooked/tilt-on-hover photo effects anywhere on the site — this was explicitly
  removed from both the hero photo and the resume preview after client feedback that it
  read as a dated UI gimmick. Don't reintroduce it.
- There is no "Connect" section — location (Rochester, NY) and the LinkedIn link live in
  the footer instead.
