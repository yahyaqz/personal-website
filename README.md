# Kontora Designs

Single-page agency site. Vanilla JS + Vite, with GSAP/ScrollTrigger for scroll
choreography and Lenis for smooth scrolling.

```bash
npm install
npm run dev      # http://localhost:5180
npm run build    # → dist/
npm run preview  # serve the built output
```

## Where things live

```
index.html              all page content — copy, projects, services, FAQ
src/main.js             boots every module
src/styles/
  base.css              design tokens, reset, type scale, buttons, marquee
  chrome.css            cursor, scroll progress, nav, mobile menu, footer
  sections.css          hero → FAQ
src/modules/
  env.js                prefers-reduced-motion / pointer probes
  smoothScroll.js       Lenis + GSAP ticker + anchor handling
  split.js              line & word splitter for masked text reveals
  opening.js            the pinned hero → "See it for yourself." scene
  reveals.js            hero load-in, scroll reveals, parallax, marquees
  cursor.js             custom cursor (fine pointers only)
  trail.js              pink ribbon cursor trail (fine pointers only)
  magnetic.js           magnetic CTAs
  nav.js                hide/reveal, light-section inversion, mobile menu
  squiggle.js           hand-drawn pink navigation indicator
  sections.js           services, show-more, process, FAQ accordion
  showcase.js           before/after drag, device morph, spotlight,
                        scroll inversion, odometer, project hover
  pricing.js            the estimator + live package builder — prices live here
  form.js               validation + submission
scripts/make-mockups.mjs   regenerates the placeholder imagery
public/mockups/            the generated SVGs
```

## Editing content

**Copy, projects, services, process steps and FAQ are all plain markup in
`index.html`.** No build step or data file to touch — and because they are real
HTML rather than JS-rendered, they work without JavaScript and are visible to
search engines.

**Adding a project:** duplicate an `<article class="project">` block. Add
`class="project--alt"` to flip the phone mockup to the left. `data-accent` sets
the colour that washes over the mockup on hover — keep it in the rose family.

**Adding a concept:** duplicate a `<figure class="concept">`. Add
`class="is-hidden" data-concept-extra` to place it behind *Show more*.

**Replacing the imagery:** drop real exports into `public/mockups/` using the
same filenames and dimensions (desktop 1440×900, mobile 390×780, concepts
900×640). Nothing in the code needs to change. To regenerate the placeholders
instead, edit palettes or archetypes in `scripts/make-mockups.mjs` and run
`node scripts/make-mockups.mjs`.

**Social links:** three `href` values in the `.social` list, which appears twice
— once in the contact section, once in the footer. Both blocks are marked with a
`SOCIAL LINKS` comment.

## Changing prices

Every number lives in the `PRICING` object at the top of
`src/modules/pricing.js` — nowhere else. The `+$750` labels the visitor reads
are rendered from the same object on load, so there is no second copy to keep in
sync.

```js
base: 2400,        // foundation, includes the first page
perPage: 400,      // every page beyond the first
minPages: 1, maxPages: 20, defaultPages: 5,
addons: {
  logo: { label: 'Logo Design', price: 750 },
  // …
},
compute({ pages, selected }) { … }   // the formula itself
```

To move away from flat per-page pricing (tiers, bulk discounts, a minimum),
rewrite `compute()` — the slider, the read-out, the line items and the total are
all derived from what it returns.

All figures are placeholders and presented as an estimate only; the disclaimer
under the total says so explicitly.

## Wiring up the contact form

`src/modules/form.js` validates locally and then calls `deliver()`, which
currently just logs and resolves. Replace its body with a `fetch()` to your form
handler (Formspree, Resend, a serverless function). Resolving means delivered;
rejecting shows the fallback email message.

## Motion and accessibility

- Everything is gated on `prefers-reduced-motion`. When it's set, Lenis is never
  mounted, animations are skipped and content renders in its resting state — the
  page still works completely, it just doesn't move.
- The custom cursor and magnetic buttons only mount for `hover: hover` and
  `pointer: fine`, so touch devices never see them.
- Animation is limited to `transform`, `opacity` and `clip-path`.
- Smooth scrolling is CSS-free (Lenis), so the reduced-motion override actually
  wins rather than being blocked by an inline `!important`.
- The mobile menu is `inert` while closed so its links stay out of the tab order.
- There's a skip link, real landmarks, visible focus rings, and a 3-second
  failsafe that reveals all content if a script ever fails to boot.

## The opening scene

`src/modules/opening.js` pins one viewport and scrubs a single GSAP timeline
with scroll position, so the hero *becomes* the statement rather than scrolling
past it. Because it is scrub-driven rather than time-driven, it reverses
correctly when you scroll back up. The beat map is documented at the top of the
file; the pin distance is the `end:` value (about 2.1 screens on desktop, 1.5 on
phones).

The load-in animation in `reveals.js` and the scrub in `opening.js` deliberately
animate **disjoint properties** — the former owns `.line__i` `yPercent` and the
bits' `y`/`opacity`, the latter owns the title wrapper's `yPercent` and the stage
`opacity`. If you add to either, keep them separate or they will fight over
recorded start values.

## The three demonstration interactions

These exist to show the service, not to decorate — they are in `showcase.js`.

- **Before / after drag** (`#transform`). One number, the split percentage, drives
  a clip-path and the handle through `--ba`. Pointer, touch and keyboard all
  funnel through `setSplit()`, so they cannot disagree. The grip is a real
  `role="slider"` with arrows, Shift+arrows, Home and End.
- **Device morph** (`#responsive`). The shell's target width and aspect-ratio are
  written to the style attribute and *CSS* interpolates them. Deliberately not a
  tween: the declared style is then always the truth, so the frame can never end
  up a different size from what the caption claims.
- **Cursor spotlight** (`#spotlight`). A radial mask lerped toward the pointer.
  Touch and reduced-motion get a static split reveal instead, entirely in CSS.

Swap the artwork by replacing `redesign-before/after.svg` and
`spot-wireframe/final.svg` in `public/mockups/`.

## Scroll-driven inversion

`@property --invert` is registered as a real number, and every colour in a
`[data-invert]` section derives from it through `color-mix`. Scrubbing that one
value from 0 to 1 turns the whole chapter from ink to paper, and the nav inverts
with it. To make another section a light chapter, add `data-invert` — no other
change needed.

## Pink

`--pink` is the interaction colour and is used only for things that move or
respond: the cursor trail, nav squiggles, the stroke under "yourself", hover
labels, slider progress, selected add-ons, form focus. The static UI uses the
quieter `--accent` rose. Keeping those two roles apart is what stops the page
turning pink.

## Notes

- The pricing section is the one light-themed chapter; it flips the same design
  tokens via `[data-theme="light"]` rather than redefining components, and the
  nav inverts over it automatically.
- The displayed estimate is written synchronously and only *animated* by GSAP,
  so a backgrounded tab (where `requestAnimationFrame` stops) can never leave a
  stale number on screen.
- The cursor trail renders on one canvas and parks its own rAF loop as soon as
  the ribbon collapses, so an idle page costs nothing.
- The nav no longer contains an "About" link, because the founder section was
  removed. Re-add one `<a>` in `index.html` when that section exists — the
  squiggle and scroll-spy pick it up automatically, no JS changes needed.
