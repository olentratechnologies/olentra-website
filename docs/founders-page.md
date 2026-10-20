# Founders page

`/founders` uses the existing Next.js App Router, header, footer, fonts, brand blue, and metadata utilities. Navigation and sitemap include the route. The work CTA uses the existing home-page `#projects` anchor.

## Content handoff

Edit `src/data/founders.js` for profiles and chapter copy. Portraits use the existing `public/Founders Images/mani.jpg` and `Abhi.png` files, associated by their filenames. Confirm those associations and image usage approval before public release. Originals are unchanged; Next Image delivers responsive optimized images. The existing Abhi.png was untracked before this work and must be included in any deployment.

Still needed: approved biographies, expertise, professional URLs, founder message, and any photographer credits. No qualifications, executive titles, quotes, or career history have been invented. Empty fields render explicit placeholders or omit optional lists. Add authentic optional `mobileImage`, `alternateImage`, `focalPoint`, and `credit` values as needed. No signatures are fabricated.

## Interaction and accessibility

Native scrolling, portrait anchor links, expandable professional details, and keyboard/tap/focus-accessible focus-area buttons. Desktop has a sticky thinking heading; mobile reads vertically. Essential text is rendered before hydration. Reveals use a one-shot browser animation with IntersectionObserver cleanup. Reduced motion disables reveals and CSS animation. Decorative vision lighting pauses out of view. SVG and CSS provide the dimensional scene without WebGL or additional dependencies. The site's existing global custom cursor is omitted on this route so the normal pointer remains available.

## Verification

Production build and git diff whitespace checks pass. Browser checks confirmed no horizontal overflow at 1440, 1024, 390, and 320 CSS pixels; both hero and profile images loaded; profile disclosure and focus-area selection worked; keyboard Tab changed the selected focus area; reduced motion disabled core animation with all headings visible; and the contact CTA reached /contact via keyboard. No console errors were observed. The work CTA targets the verified existing home-page #projects section. Core Web Vitals targets require production field measurements; build success is not a performance guarantee.
