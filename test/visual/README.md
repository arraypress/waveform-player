# Visual theme verification

Auto-theme detection is a heuristic over what a page *looks like*, and CSS only
partly exposes that. The vitest suite pins the detection **logic**; this pins the
**assumptions underneath it** — what browsers actually paint — which is the part
that can silently stop being true.

It is deliberately **not** part of `npm test`: it needs ~500MB of browsers, takes
minutes rather than a second, and `prepublishOnly` must not depend on either.

## Running it

```bash
npm i -D playwright && npx playwright install chromium webkit   # one-off

npm run build                                     # it tests dist/, so build first
npm run test:visual                               # chromium, current build
npm run test:visual -- --engines=chromium,webkit
npm run test:visual -- --baseline=v1.24.0         # A/B the working tree vs a git ref
```

Exits non-zero if any real bug is found. Screenshots land in `shots/`
(git-ignored) so you can eyeball anything the numbers flag.

**Run this whenever you touch `detectColorScheme`, `detectCanvasScheme`,
`collectBackdrop` or `perceivedBrightness`.**

## What it actually measures

For each page shape in `cases.mjs` × both colour-scheme preferences, it renders a
player, screenshots the viewport, decodes the PNG back onto a canvas, and reads
the pixels:

- **Backdrop** — the modal colour in a strip directly below the player, i.e. what
  it is really sitting on (the card, for the wrapped cases — not the page around
  it).
- **Ink** — progress colour on the played half, waveform colour on the unplayed
  half, as WCAG contrast against that backdrop.

The expectation is derived from those pixels, never hand-written next to the
case, and nothing reuses the library's own colour logic — so the test cannot
agree with a bug by sharing it.

A failure means one of two different things, and the runner separates them:

- **BUG** — a real defect. Either the *page* painted the backdrop (so it was
  readable and we still got it wrong), or the page painted nothing under a
  **light** preference, which is white in every engine — that combination is
  exactly the misdetection issue #21 reported, so it must never be excused.
- **by-design** — the page painted nothing *and* the preference is dark. This is
  the single genuinely ambiguous combination; see below.

## The engine finding (issue #21)

Detection cannot use `prefers-color-scheme` to guess what shows through an
unpainted page, because engines disagree about what they paint there:

| unpainted page, OS dark | paints |
| --- | --- |
| Chromium | `#121212` |
| WebKit | white |
| Firefox | white |

Chromium is also the only engine where the script-visible `Canvas` system colour
(white) contradicts what it actually paints — which is exactly why no scripted
signal can tell these apart.

So detection believes the **page** instead: `color` resolves to the `canvastext`
system colour, so black text means the page was designed light and gets the light
preset. That matches two engines of three. In Chromium it diverges on a page that
paints no background *and* never declares `color-scheme` — a page already
rendering its own body text black-on-`#121212`. Those rows are the `by-design`
ones.

**Do not reintroduce `prefers-color-scheme` into `detectCanvasScheme` without
re-running this matrix across engines.** There is a test in `../themes.test.js`
guarding the same decision.

## Firefox

Playwright's bundled Firefox would not launch on macOS 15/Darwin 27 during the
#21 work (compositor failure headless, profile failure headed), and Playwright
cannot drive a system Firefox install. The Firefox row above was confirmed by
hand with `firefox-check.html` — open it in Firefox with *Settings → General →
Website appearance* set to Dark, verify the readout says
`prefers-color-scheme: dark`, and look at whether the page is white or near-black.

If Playwright's Firefox starts working, `--engines=chromium,webkit,firefox` picks
it up with no other changes.

## Files

| file | what it is |
| --- | --- |
| `theme-matrix.mjs` | the runner |
| `cases.mjs` | page shapes, deterministic peaks, HTML builder |
| `firefox-check.html` | manual one-glance check for engines the runner can't drive |
| `shots/` | screenshots + `results.json` (git-ignored) |
