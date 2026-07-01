# Katherine Keenan — Teaching Portfolio

A single-page portfolio site for Katherine Keenan, an English and inclusive (special)
education teacher in the Rochester, NY area. It presents her background, recommendation
letters, lesson plans, and a redacted resume. The page is meant to be reached through a
link on her job applications.

## Stack

Plain HTML, CSS, and JavaScript. No build step. Two libraries load from a CDN:

- [AOS](https://michalsnik.github.io/aos/) for scroll-in animations
- [PDF.js](https://mozilla.github.io/pdf.js/) for lesson-plan thumbnails and the in-page PDF viewer

## Run locally

From the project root:

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000. (A local server is required so the browser can fetch the
PDFs; opening `index.html` directly with `file://` will block them. If you open it directly
anyway, a banner explains this and the lesson/recommendation cards still link straight to
the PDFs.)

## Project layout

```
index.html              Page markup, meta tags, JSON-LD
css/styles.css          Design system + responsive layout + animations
js/main.js              Nav, mobile menu, active-section highlight, AOS, the letter modal
js/pdf-viewer.js        PDF.js thumbnails + the modal viewer + the file:// warning banner
resume/resume.html      Source for the redacted resume (no phone/email)
robots.txt              Blocks search + AI/scraper crawlers
favicon.svg, site.webmanifest
assets/
  images/               Original portraits + generated hero/OG derivatives
  lesson_plans/         Seven lesson/activity/slide PDFs (shown in the viewer)
  recommendations/      Three recommendation PDFs (linked from each card)
  resume/               Original resume (not linked) + the redacted PDF the site serves
```

## Privacy / data exposure

By design, the site shows **no email, no phone number, and no contact form**. The only
contact path is the LinkedIn link. The downloadable resume is a redacted version that
shows only "Rochester, NY"; the original resume with full contact details stays in
`assets/resume/` but is never linked from the page.

## Editing the resume

The downloadable resume is generated from `resume/resume.html`. After editing that file,
regenerate the PDF with headless Chrome:

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless --disable-gpu --no-pdf-header-footer \
  --print-to-pdf="assets/resume/Katherine-Keenan-Resume.pdf" \
  "file://$(pwd)/resume/resume.html"
```

Keep it to a single page, and do not add a phone number or email.

## Things to update

- **LinkedIn URL** — set in `index.html` (the footer link and the JSON-LD `sameAs`),
  currently `https://www.linkedin.com/in/katherine-keenan-0b0b1714a/`.
- **Hero photo** — `assets/images/hero/`. Regenerate from a source image with `sips` if needed:
  ```bash
  sips -s format jpeg -s formatOptions 80 --resampleWidth 1100 assets/images/Be-Teacher.jpg --out assets/images/hero/hero.jpg
  ```

## Deploy to GitHub Pages

1. Commit and push these files to a GitHub repository.
2. In the repo: **Settings → Pages → Build and deployment → Source: Deploy from a branch**,
   then pick your branch and the `/ (root)` folder.
3. The site publishes at `https://<user>.github.io/<repo>/`.

Note: `robots.txt` asks search engines not to index the site, since it is meant to be
reached through the resume link rather than found in search results. Remove or edit
`robots.txt` if that changes.
