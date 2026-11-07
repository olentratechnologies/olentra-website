# Founders within About

The former founders experience is the content of `/about`, also reached through
`/about#founders`. Its portraits, vision, thinking, founder message, and closing
calls to action make up the About page.

The shared desktop and mobile navigation use `src/data/navigation.js`. About is
the top-level destination; Founders is no longer a separate navbar item. The
footer keeps a useful **Founders** shortcut to `/about#founders`.

`next.config.js` permanently redirects `/founders` to `/about#founders` with HTTP 308.
The sitemap lists `/about` as the destination and excludes the redirected
`/founders` route. Metadata and structured data belong to the About page.

## Content handoff

Edit `src/data/founders.js` for founder profiles and chapter copy. Portraits use
`public/Founders Images/mani.jpg` and `Abhi.png`; Next Image supplies responsive
optimized versions. The original portrait assets remain unchanged.

Names, titles, portraits, image alternatives, focal points, credits, and chapter
copy continue to come from the existing data file. No new biographies or
professional claims are added. The internship module remains unchanged.

The closing contact CTA uses the existing `/#contact` destination. The work CTA
uses the existing `/#projects` anchor. Both continue to work from the About page.

## Interaction and accessibility

The About experience keeps document scrolling, portrait anchors, and
keyboard/tap/focus-accessible focus-area controls.
Desktop uses the existing sticky thinking heading; mobile reads vertically.
Essential copy is available before hydration. Reveals use IntersectionObserver
cleanup, reduced motion disables decorative animation, and vision lighting
pauses when it leaves the viewport. SVG and CSS supply the dimensional scene
without additional WebGL dependencies.

## Integration verification

Run `npm run build` and `git diff --check`. In the browser, verify:

- Desktop and mobile navigation expose About without a separate Founders item.
- The footer shortcut opens `/about#founders`, and direct `/founders` visits
  redirect to that same section.
- About contains the founder content once, with both portraits, focus-area
  controls, and closing CTAs working.
- Direct anchor navigation, refresh, Back/Forward, keyboard access, and reduced
  motion work in the integrated page.
- Desktop, tablet, 390px, and 320px layouts have no horizontal overflow.
- The sitemap includes `/about` and `/intern`, and excludes `/founders`.

Browser checks and performance measurements should use the integrated About
route; results from the former standalone page do not establish its current
layout or field performance.
