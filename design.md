# design.md

## Document Status

This is the visual and interaction system specification for the Indonesian disaster assistance transparency application. It must remain consistent with [`AGENTS.md`](AGENTS.md). Public-facing copy must be written in Indonesian.

## 1. Visual Identity

### 1.1 Mood and tone

- Evidence-led, not emotional. Prioritize clarity over drama.
- Trustworthy, not decorative. No sensationalist imagery or language.
- Inclusive, not alarmist. Focus on information, not fear.
- Transparent, not vague. Every claim must be traceable.

### 1.2 Design approach

- Minimalist, information-first.
- High contrast for readability and accessibility.
- Consistent spacing and alignment for a cohesive feel.
- No heavy gradients, glows, or "tech" embellishments.

### 1.3 Color palette

#### Primary colors

- Primary text: `#1a1a1a` (near black)
- Secondary text: `#555555` (dark gray)
- Background: `#ffffff` (white)
- Secondary background: `#f5f5f5` (off-white)

#### Status colors

- Safe: `#e8f5e9` (light green), text `#2e7d32`
- Warning: `#fff3e0` (light orange), text `#ef6c00`
- Danger: `#ffebee` (light red), text `#c62828`
- Neutral: `#f5f5f5` (light gray), text `#616161`

#### Map colors (Stage 1)

- Province fill: `#e0e0e0`
- Regency/city fill: `#ffffff`
- Selected region: `#b0bec5`
- Outline: `#9e9e9e`
- Labels: `#1a1a1a`

#### Map colors (Stage 2 optional)

- Province fill: `#f0f0f0`
- Regency/city fill: `#ffffff`
- Selected region: `#cfd8dc`
- Outline: `#b0bec5`
- Labels: `#1a1a1a`

### 1.4 Typography

#### Primary fonts

- Display font: `Newsreader`, serif (Google Fonts)
- Body font: `Roboto`, sans-serif (Google Fonts)
- Code/labels: `JetBrains Mono`, monospace (Google Fonts)

#### Font weights and sizes

- Hero headings (h1): `700` (bold), `clamp(1.75rem, 4vw, 3rem)`
- Section headings (h2): `600` (semibold), `clamp(1.25rem, 3vw, 2.25rem)`
- Subheadings (h3): `500` (medium), `clamp(1rem, 2.5vw, 1.75rem)`
- Body text: `400` (regular), `clamp(0.875rem, 2vw, 1rem)`
- Code/labels: `400` (regular), `0.875rem`

#### Line height

- Body: `1.5`
- Display: `1.1`
- Code: `1.4`

#### Letter spacing

- Display: `0.05em`
- Body: `0em`
- Code: `0.05em`

### 1.5 Spacing and layout

#### Base unit

- 4px base unit.

#### Scale

- xs: 4px
- sm: 8px
- md: 16px
- lg: 24px
- xl: 32px
- 2xl: 48px
- 3xl: 64px

#### Container

- Max width: `1200px`
- Mobile: `100%`, padding `16px`
- Tablet: `100%`, padding `24px`
- Desktop: `1200px`, padding `32px`

### 1.6 Border radius

- Small: `4px`
- Medium: `8px`
- Large: `12px`
- Full: `9999px`

### 1.7 Shadows

- None (no shadows, no depth).
- Rationale: flat, information-first design.

### 1.8 Borders

- 1px solid `#e0e0e0` (light gray).
- Inner borders: 1px solid `#f0f0f0`.

## 2. Accessibility

### 2.1 Color contrast

- Minimum WCAG AA: 4.5:1 for normal text, 3:1 for large text.
- Primary text: `#1a1a1a` on `#ffffff` → 14.5:1 (excellent).
- Secondary text: `#555555` on `#ffffff` → 6.5:1 (excellent).
- Status colors: meet WCAG AA.

### 2.2 Keyboard navigation

- All interactive elements focusable via `Tab`.
- Visible focus indicators (outline: 2px solid `#1a1a1a`).
- Logical tab order.
- Escape key closes modals, dialogs, or dropdowns.

### 2.3 Screen reader support

- Semantic HTML (`<main>`, `<nav>`, `<article>`, `<section>`).
- Descriptive alt text for images.
- ARIA labels for icon-only buttons and map controls.
- Live regions for dynamic content (map filters, loading states).

### 2.4 Reduced motion

- `prefers-reduced-motion: reduce` detected via CSS media query.
- GSAP animations disabled or replaced with static transitions.
- No layout shifts from animations.

### 2.5 Text alternatives

- Alt text for all images.
- Text equivalents for icons where appropriate.
- Map alternatives: text-based region listing, source registry, statistics tables.

### 2.6 Focus management

- Focus trap in modals, dialogs, and dropdowns.
- Focus returns to trigger after close.
- Visible focus indicators.

## 3. Page Layouts

### 3.1 Global layout

- Header: fixed, top, white background, 1px solid `#e0e0e0`.
- Navigation: left-aligned, simple links.
- Footer: simple copyright and attribution.
- Content: centered, max-width `1200px`, padding.

### 3.2 Home page (/)

#### Structure

- Hero section: title, brief description, primary CTA.
- National context: key statistics (with sources).
- Quick links: map, case study, methodology, sources, help.
- Footer: simple.

#### Hero section

- Title: "Transparansi Bantuan Bencana di Indonesia" (Disaster Assistance Transparency in Indonesia).
- Subtitle: "Pantau lokasi bencana, status akses bantuan, dan sumber informasi resmi."
- Primary CTA: "Lihat Peta" (View Map).
- Secondary CTA: "Lihat Kasus Flores 2026" (View Flores 2026 Case).
- Background: white, no decorative imagery.

#### National context

- 3–5 key statistics with sources.
- Each statistic: value, label, unit, as-of date, source.
- Layout: grid 1 column mobile, 3 columns desktop.

### 3.3 Map page (/peta)

#### Structure

- Header: title, brief description, filters.
- Main content:
  - Map container (left, responsive).
  - Panel (right, scrollable): region list, selected region details, statistics, sources.
- Footer: simple.

#### Map container

- Height: `60vh` on desktop, `50vh` on mobile.
- No external base-map tiles (local style).
- Province and regency/city GeoJSON.
- Selection: click region to select, show details in panel.
- Zoom controls: native MapLibre controls, visible.

#### Panel

- Region list: scrollable, filterable by status.
- Selected region details:
  - Name, administrative code.
  - Status (Dilaporkan belum menerima bantuan, Akses terisolir, Belum terverifikasi).
  - Statistics (with sources).
  - Event information (if applicable).
  - Sources list with URLs and dates.
- Layout: max-width `400px`.

#### Mobile layout

- Map full width, panel below.
- Panel initially hidden, toggle button to show/hide.
- Panel slide-up animation.

### 3.4 Case study page (/kasus/ntt-2026)

#### Structure

- Header: title, subtitle, date.
- Introduction: brief context.
- Timeline: August 2026 events (chronological).
- Impact section:
  - Affected regions (list with codes and names).
  - Statistics (with sources).
  - Sources list.
- Evidence section:
  - Key documents/media links.
  - Data files (downloadable).
- Methodology section: brief methodology for the case study.
- Footer: simple.

#### Timeline

- Vertical timeline, left-aligned.
- Each event: date, title, description, links.

#### Impact section

- Grid layout: 2 columns mobile, 3 columns desktop.
- Each card: region, status, statistics, sources.

#### Mobile layout

- Timeline: single column, full width.
- Impact cards: 1 column.

### 3.5 Methodology page (/metodologi)

#### Structure

- Header: title, subtitle.
- Introduction: purpose and scope.
- Data sources: categories (official, media, research).
- Data collection: methodology for gathering and validating data.
- Data processing: normalization, validation, deduplication.
- Limitations: acknowledged gaps and uncertainties.
- Sources list: with URLs and dates.
- Footer: simple.

#### Content

- Clear headings, subheadings.
- Bullet points for lists.
- Code snippets for examples (if any).
- Tables for structured data (if any).

### 3.6 Sources page (/sumber)

#### Structure

- Header: title, subtitle.
- Filters: by category (official, media, research), by type.
- Sources list: each source:
  - Name, type, category.
  - URL, publication date, access date.
  - Notes (if any).
- Footer: simple.

#### List layout

- Table on desktop:
  - Columns: Name, Type, Category, URL, Publication Date, Access Date.
- Card layout on mobile:
  - Each source as a card with expandable details.

### 3.7 Help/Assistance page (/bantu)

#### Structure

- Header: title, subtitle.
- Introduction: platform does not collect donations.
- Official assistance channels:
  - BNPB (Badan Nasional Penanggulangan Bencana).
  - PMI (Palang Merah Indonesia).
  - Baznas (Badan Amil Zakat Nasional).
  - Other relevant agencies.
- For each channel:
  - Name, description.
  - URL.
  - Verification note (official, current).
- Disclaimer: platform is an information hub, not a direct provider.
- Footer: simple.

#### Layout

- List of cards, each channel as a card.
- Links open in new tab.

## 4. Components

### 4.1 Buttons

#### Primary button

- Background: `#1a1a1a`
- Text: `#ffffff`
- Padding: `12px 24px`
- Border radius: `8px`
- Font weight: `500`
- Hover: `#000000`

#### Secondary button

- Background: `#ffffff`
- Text: `#1a1a1a`
- Border: `1px solid #e0e0e0`
- Padding: `12px 24px`
- Border radius: `8px`
- Font weight: `500`
- Hover: `#f5f5f5`

### 4.2 Cards

- Background: `#ffffff`
- Border: `1px solid #e0e0e0`
- Border radius: `12px`
- Padding: `24px`
- Shadow: none
- Hover: none

### 4.3 Badges

- Background: `#f5f5f5`
- Text: `#616161`
- Padding: `4px 12px`
- Border radius: `9999px`
- Font size: `0.875rem`
- Font weight: `400`

### 4.4 Tables

- Border: `1px solid #e0e0e0`
- Border radius: `8px`
- Overflow: hidden
- Header: `#f5f5f5`, text `#1a1a1a`
- Body: `#ffffff`, text `#1a1a1a`
- Row hover: `#f9f9f9`
- Padding: `12px 16px`
- Font size: `0.875rem`

### 4.5 Form inputs

- Background: `#ffffff`
- Border: `1px solid #e0e0e0`
- Border radius: `8px`
- Padding: `12px 16px`
- Font size: `0.875rem`
- Focus: `2px solid #1a1a1a`

### 4.6 Map controls

- Background: `#ffffff`
- Border: `1px solid #e0e0e0`
- Border radius: `8px`
- Padding: `8px 12px`
- Font size: `0.875rem`
- Hover: `#f5f5f5`

### 4.7 Modals and dialogs

- Background: `#ffffff`
- Border: `1px solid #e0e0e0`
- Border radius: `12px`
- Padding: `32px`
- Overlay: `rgba(0, 0, 0, 0.5)`
- Focus trap: enabled
- Close button: top right, X icon

## 5. Motion and Animation

### 5.1 GSAP usage

GSAP is used only for intentional storytelling moments:

- National-to-NTT introductory transition.
- Disaster impact panel transitions.

### 5.2 Animation rules

- Respect `prefers-reduced-motion`.
- Never make content or evidence dependent on animation.
- Use `useGSAP` or scoped GSAP contexts in React; clean up on unmount.
- Avoid unnecessary `ScrollTrigger`; do not pin long sections on mobile.
- Do not animate large numbers of DOM elements.
- Prefer transforms and opacity over layout properties.
- Keep mobile motion short and inexpensive.
- Use native MapLibre camera transitions for map movement, not GSAP.

### 5.3 Animation durations

- Intro transition: 1–2 seconds.
- Panel transitions: 0.3–0.5 seconds.
- Map camera transitions: native MapLibre, no GSAP.

### 5.4 Easing

- Standard: `power2.out`.
- Intro: `power2.inOut`.

## 6. Map Design

### 6.1 Stage 1 MVP

- No external base-map tiles.
- Local background style (white/off-white).
- Province and regency/city GeoJSON.
- Check 38 provinces and 514 regencies/cities against official data.
- Load detailed regency/city geometry only when needed.
- Region fill, boundary, selection, and status semantics legible without relying on color alone.
- Geographic attribution for every data or geometry source.
- No `tile.openstreetmap.org` as public tile provider.
- Text-based alternative listing regions, status, statistics, as-of dates, sources.
- No-WebGL fallback preserving region exploration and source traceability.
- No decorative markers implying unsupported precision.

### 6.2 Stage 2 optional

Richer basemap, additional layers, or more detailed geometry only if licensing, performance, attribution, and accessibility are documented and tested.

## 7. Responsive Behavior

### 7.1 Breakpoints

- Mobile: `0px – 768px`
- Tablet: `769px – 1024px`
- Desktop: `1025px – 1920px`

### 7.2 Mobile optimizations

- Minimize client JavaScript.
- Dynamically import MapLibre, GSAP.
- Lazy-load images.
- Simplify GeoJSON.
- Progressive map layer loading.
- Text alternatives for map.
- Touch-friendly tap targets (minimum `48px`).

### 7.3 Tablet optimizations

- Grid layouts adjust from 1 to 2 columns.
- Map height adjusts from `50vh` to `60vh`.

### 7.4 Desktop optimizations

- Grid layouts adjust from 2 to 3 columns.
- Map panel visible alongside map.
- Full-height map.

## 8. External Resources

### 8.1 Fonts

- Google Fonts: Newsreader, Roboto, JetBrains Mono.

### 8.2 Icons

- Use installed icon library (check `package.json` before assuming availability).

### 8.3 MapLibre

- Use installed MapLibre GL JS (check `package.json` before assuming availability).

### 8.4 GSAP

- Use installed GSAP (check `package.json` before assuming availability).

## 9. Testing Checklist

Before release, verify:

- Color contrast meets WCAG AA.
- Keyboard navigation works for all interactive elements.
- Screen reader support for headings, lists, tables, and dynamic content.
- Reduced motion animations are disabled or replaced.
- Text alternatives exist for all images and map interactions.
- Mobile layout is readable and touch-friendly.
- Tablet and desktop layouts are responsive.
- Map is accessible without WebGL.
- GSAP animations are clean, short, and respect reduced motion.
- All public text is in Indonesian and evidence-led.
- No donation mechanisms or personal data are exposed.
- Every displayed statistic has a source and as-of date.
