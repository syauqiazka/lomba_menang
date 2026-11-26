# AGENTS.md

## Document Status

This is the primary engineering instruction for the Indonesian disaster assistance transparency application. Read it before changing code, data, schema, dependencies, deployment settings, or public-facing content. The visual and interaction system is defined in [`design.md`](design.md); both documents are complementary and must be kept consistent.

Public-facing copy must be written in Indonesian. This document and `design.md` are written in English so that development agents have an unambiguous shared reference.

## 1. Project Identity and Mission

This project is a public-facing transparency platform for disaster information in Indonesia. It helps people understand where disasters occur, which communities are reported to face difficulty accessing assistance, what evidence supports each claim, and where legitimate official assistance channels can be found.

The product serves the general public, journalists, researchers, volunteers, policymakers, and competition judges. It will include national disaster context, an interactive map, a detailed August 2026 Flores, NTT earthquake case study, environmental-disaster context, a methodology page, a source registry, and official assistance links.

The Flores earthquake is a geological disaster. It is a case study of assistance distribution and information traceability, not a disaster attributed to environmental degradation. Environmental disasters discussed elsewhere may include floods, landslides, coastal erosion, tidal flooding, extreme weather, and land subsidence.

This is not a donation platform. The product must never collect money, publish bank accounts, provide fundraising wallets, or integrate payments. Calls to action must point only to legitimate official assistance channels.

## 2. Non-Negotiable Rules

### 2.1 Data integrity

- Never fabricate statistics, dates, locations, disaster impacts, assistance totals, or community conditions.
- Every displayed statistic must originate from the `Stat` database model.
- Every `Stat` must reference a `Source`.
- Every statistic must display its as-of date and source.
- Never use AI-generated facts as verified disaster information.
- Never present an unverified community report as an established fact.
- Never claim that a village received no assistance without credible evidence.
- Treat conflicting sources as a documented discrepancy, not as an invitation to choose the most dramatic value.
- Preserve original source wording and publication/access dates in the source registry.
- Use the approved public statuses exactly when applicable: `Dilaporkan belum menerima bantuan`, `Akses terisolir`, and `Belum terverifikasi`.
- Clearly distinguish official information, media reporting, research, and editorial content in both data and UI.
- Editorial interpretation must never be stored or displayed as if it were an official observation.
- Do not silently replace an existing value during an import; record the source, date, and reason for correction.

### 2.2 Human dignity and privacy

- Never publish photographs of children.
- Blur victims' faces, vehicle plates, house identifiers, and identifying signs before publication.
- Never display exact victim locations.
- Never expose victim names, telephone numbers, residential addresses, or other direct identifiers.
- Show geographic information at the village or hamlet level at most; use broader aggregation when re-identification risk is credible.
- Do not infer sensitive personal attributes from location or community reports.
- Review Indonesian Personal Data Protection Law, UU No. 27 Tahun 2022, before implementing community submissions.
- Community submissions are not a source of truth without human verification and a documented moderation decision.

### 2.3 Donation restrictions

- No donation collection.
- No bank account information.
- No payment integrations.
- No fundraising forms, wallets, donation counters, or donation CTAs.
- The `/bantu` page may link to official agencies such as BNPB, PMI, and Baznas only after each destination is verified as official and current.
- Use clear Indonesian language explaining that the platform does not collect donations.

### 2.4 Scope discipline

- MVP does not include community submissions, public accounts, donation functionality, or a custom tile service.
- Do not implement optional community models before the MVP is complete.
- Do not add product features that are not required by the approved roadmap without recording the tradeoff and user approval.
- Do not modify application source code while this foundation task is under review.

## 3. Technical Architecture

### 3.1 Stack

- Next.js with the App Router.
- TypeScript with strict type checking.
- Prisma ORM.
- Neon PostgreSQL.
- MapLibre GL JS for the map.
- GSAP for intentional storytelling motion only.
- Use the repository's installed UI, icon, font, and validation libraries once the project is initialized; do not assume a dependency is available without checking `package.json`.

### 3.2 Next.js conventions

- Prefer Server Components for data-driven pages, source lists, methodology content, and static editorial sections.
- Use Client Components only for interaction that requires browser state, MapLibre, filters, reduced-motion detection, or GSAP.
- Keep Client Component boundaries narrow and pass serializable data from Server Components.
- Use Route Handlers only for clearly defined server endpoints. Validate method, content type, body size, input shape, and authorization at the boundary.
- Use `loading.tsx`, `error.tsx`, and `not-found.tsx` where they improve recovery and communication.
- Keep public URLs stable and semantic: `/`, `/peta`, `/kasus/ntt-2026`, `/metodologi`, `/sumber`, and `/bantu`.
- Prefer server-side rendering and static generation/revalidation where freshness requirements allow it.
- Do not put raw database calls directly in presentational components.
- Do not expose Prisma models or database errors to the browser.

### 3.3 Data access

- Centralize Prisma client creation so development hot reload does not create unbounded connections.
- Keep database queries in server-only modules or route handlers.
- Select only fields required by the page; avoid returning private or internal moderation fields to public routes.
- Use explicit ordering and deterministic pagination for source and event lists.
- Use official administrative region codes as identifiers. Never match regions solely by display name.
- Normalize source and region data before persistence.
- Use transactions for imports that must update related `Source`, `Stat`, `Region`, `DisasterEvent`, and `EventImpact` records together.
- Treat raw data files as import inputs, not as request-time dependencies.

### 3.4 Validation and errors

- Validate external data with schemas before import and validate request data before use.
- Reject unknown enum values and malformed dates instead of coercing them silently.
- Return user-safe Indonesian error messages and log diagnostic details only on the server.
- Use stable error codes for expected API failures.
- Never include stack traces, SQL, environment values, tokens, or personal data in client responses.
- Log enough context to investigate failures without logging secrets or sensitive community content.

### 3.5 Environment and deployment

- Keep secrets in environment variables managed by the deployment platform; never commit `.env`, database URLs, API keys, or tokens.
- Maintain a documented `.env.example` with names only and safe placeholder values.
- Use a separate Neon database or branch for development, test, and production where practical.
- Use least-privilege database credentials. Migration and application credentials need not be identical.
- Run migrations as an explicit deployment step; do not migrate on every request.
- Pin and audit dependencies. Review lockfile changes.
- Configure production secure headers, HTTPS, a restrictive Content Security Policy where compatible, and a correct `Referrer-Policy`.
- Configure caching and revalidation based on source update cadence, not convenience.
- Record the deployment commit, data snapshot date, and application version for public traceability.

### 3.6 Importing and seeding

Raw data processing belongs outside page requests. Use one-time, repeatable import scripts to populate:

- `Source`
- `Region`
- `DisasterEvent`
- `EventImpact`
- `Stat`

Imports must be idempotent, validate rows before writes, report rejected rows, and preserve source provenance. A failed row must not silently disappear. Store the source URL, publication date, access date, as-of date, source category, and an internal import identifier where the schema supports it.

Use a reviewed, version-controlled input snapshot for competition and MVP demos. Do not scrape at request time.

## 4. Database Rules

The supplied model contract is the minimum domain foundation and must be preserved as the application is implemented.

### 4.1 Required models

- `Source`: a credible origin for a claim or statistic. It must support source type/category, title or publisher, URL, publication date, access date, and traceability metadata.
- `Region`: an Indonesian administrative region identified by an official administrative code, with hierarchy and geometry references as needed.
- `DisasterEvent`: an event such as a flood, landslide, earthquake, coastal erosion incident, tidal flood, extreme-weather event, or land-subsidence case. It must distinguish geological events from environmental-disaster context.
- `EventImpact`: the relationship between an event and an affected region, including only sourced and appropriately qualified impact information.
- `Stat`: a displayed statistic linked to a `Source`, with value/label/unit, as-of date, and relevant event or region relationship.

### 4.2 Optional models

- `CommunityPost`
- `ModerationEvent`
- `Flag`

Optional community functionality is deferred until after MVP. If it is later approved, model moderation history as append-only audit evidence rather than a destructive status overwrite.

### 4.3 Region identity

Use official administrative region codes from authoritative Indonesian administrative datasets. Do not join by region name because spelling, naming, and hierarchy can change or collide. Keep display names separate from stable identifiers. Validate that the expected national inventory contains 38 provinces and 514 regencies/cities against current official data before publication; this count must not be treated as a hard-coded fact without a cited dataset and verification date.

## 5. Security Engineering

Apply the evidence-led, coverage-oriented principles from Cloudflare's Security Audit skill: map trust boundaries and input surfaces, validate findings independently, distinguish confirmed issues from needs-validation items, and preserve a machine-readable audit trail when a formal audit is run.

### 5.1 Required controls

- Validate and constrain all user input, imported data, query parameters, URL parameters, and file metadata.
- Use Prisma parameterization and safe query APIs; never concatenate SQL from request values.
- Escape output and avoid unsafe HTML. Sanitize any intentionally rendered rich text with a reviewed sanitizer and strict allowlist.
- Consider CSRF for any state-changing endpoint, especially future moderation or submission endpoints. Use same-site cookies, origin checks, and CSRF tokens where needed.
- If authentication is added, use a reviewed provider or well-tested implementation, secure sessions, strong authorization checks, and no client-only access control.
- Enforce rate limits and request size limits on every public write or expensive read endpoint.
- Protect search, map data, source retrieval, and export endpoints from abuse and unbounded filters.
- Use secure headers, HTTPS, secure cookies, and a restrictive content policy compatible with MapLibre and trusted external links.
- Keep secrets out of source, logs, errors, screenshots, and analytics payloads.
- Audit direct and transitive dependencies before release and after material lockfile changes.
- Restrict database roles and network access; do not grant public database access.
- Use safe deployment defaults and verify production configuration separately from local configuration.

### 5.2 Future community moderation

If community functionality is approved after MVP:

- Require pre-moderation before public display.
- Automatic filters may move submissions into `HELD`, but must never permanently delete them.
- Preserve the original submission and every moderation decision in an audit trail with actor, timestamp, reason, and action.
- AI failures must never cause automatic approval.
- Redact personal data and location precision before publication.
- Add abuse prevention, rate limiting, report handling, reviewer authentication, and a retention/deletion policy before launch.

## 6. Performance and Resilience

The primary audience may use low-end Android devices and unstable mobile internet.

- Minimize client JavaScript and keep interactive islands small.
- Dynamically import MapLibre, GSAP, charts, and other browser-only code.
- Use Next/Image or an equivalent optimized pipeline with explicit dimensions, modern formats, responsive sizes, and meaningful alt text.
- Lazy-load below-the-fold images and non-critical interactive modules.
- Use selective database fields, indexed filters, pagination, and bounded queries.
- Simplify GeoJSON and remove unused properties before shipping it to the browser.
- Load map layers progressively; do not render approximately 84,000 village boundaries simultaneously.
- Start with province and regency/city geometry. Load detailed regency/city geometry only when needed.
- Cache stable source, region, and event data using route-level caching or revalidation appropriate to its update policy.
- Use responsive layouts that remain readable at narrow widths and browser zoom.
- Support `prefers-reduced-motion` and avoid animation that delays content access.
- Avoid large DOM lists, continuous scroll listeners, layout-triggering animation, and unnecessary hydration.
- Test on a throttled mobile connection and a low-end device profile before release.

## 7. Mapping Architecture

Use MapLibre GL JS. The map is an evidence interface, not decoration.

### Stage 1 MVP

- Use no external base-map tiles.
- Use a minimal local background style.
- Provide province and regency/city GeoJSON.
- Check the expected 38 provinces and 514 regencies/cities against official data before publication.
- Load detailed regency/city geometry only when necessary.
- Keep region fill, boundary, selection, and status semantics legible without relying on color alone.
- Include geographic attribution for every data or geometry source.
- Do not use `tile.openstreetmap.org` as a public application tile provider.
- Provide a text-based alternative listing regions, status, relevant statistics, as-of dates, and sources.
- Provide a no-WebGL fallback that preserves region exploration and source traceability.
- Do not use decorative markers that imply unsupported geographic precision.

### Stage 2 optional

A richer basemap, additional layers, or more detailed geometry may be considered after MVP only if licensing, performance, attribution, and accessibility are documented and tested.

## 8. GSAP Engineering Rules

Use GSAP only when motion adds meaningful explanatory value. Primary animation moments are:

- The national-to-NTT introductory transition.
- Disaster impact panel transitions.

Rules:

- Respect `prefers-reduced-motion` with a meaningful static alternative.
- Never make content, evidence, navigation, or map interpretation dependent on animation.
- Use `useGSAP` or scoped GSAP contexts in React and clean up contexts/tweens/triggers on unmount.
- Avoid unnecessary `ScrollTrigger`; do not pin long sections on mobile without a tested reason.
- Do not animate large numbers of DOM elements.
- Prefer transforms and opacity over layout properties.
- Keep mobile motion short and inexpensive.
- Use native MapLibre camera transitions for map movement, not GSAP.
- Interrupting an animation must leave semantic state, focus, and content correct.

Visual specifics, timing ranges, and page motion direction are in [`design.md`](design.md).

## 9. Engineering Workflow

Adapt the portable principles of Superpowers, Ponytail, and the local agent instructions without assuming Claude-specific commands, plugins, hooks, or runtime behavior.

1. Understand the task and its user-facing outcome.
2. Inspect the existing implementation, dependencies, conventions, and relevant data.
3. Identify constraints, privacy risks, security risks, and data provenance requirements.
4. Create a small implementation plan with affected files and verification steps.
5. Implement incrementally, reusing existing components and platform capabilities.
6. Test affected functionality and the relevant failure states.
7. Review security, accessibility, responsive behavior, and source traceability.
8. Report changed files, tests run, limitations, and remaining risk.

For debugging:

- Reproduce the issue.
- Trace the actual root cause through the real data and render path.
- Avoid superficial fixes that hide symptoms.
- Verify the fix with a regression test or a documented manual check.
- Avoid unrelated refactoring.

For new features:

- Do not invent scope.
- Do not modify unrelated behavior.
- Avoid abstractions without a demonstrated reuse or complexity benefit.
- Keep code understandable for a solo developer.
- Prefer the smallest correct implementation that retains validation, security, error handling, accessibility, and tests.

## 10. Testing Requirements

Before MVP release, establish scripts for the following and run the relevant subset for every change:

- TypeScript type checking.
- ESLint.
- Production build.
- Prisma schema validation and migration checks.
- Database integration tests against a disposable or dedicated test database.
- Import validation and idempotence tests.
- API input validation, error handling, rate-limit, and authorization tests.
- Accessibility checks for semantics, keyboard use, focus, labels, contrast, tables, map alternatives, and reduced motion.
- Responsive checks at mobile, tablet, desktop, and browser zoom.
- Slow-network and low-end-device checks.
- WebGL-unavailable and map-data-failure fallback checks.
- Data-source traceability checks ensuring every displayed statistic has a `Stat`, `Source`, as-of date, and source category.
- Privacy checks ensuring no prohibited personal data or exact victim location reaches public output.

Do not assume a test framework or script exists. Inspect `package.json` and project documentation once implementation begins, then document the exact commands here or in the project README.

## 11. Project Roadmap

The original schedule is binding for MVP planning:

- **November 26–December 2, 2026:** Data research and methodology. Verify sources, define status language, establish the source registry, validate administrative region data, and document limitations.
- **December 3–9, 2026:** National map and NTT case study. Implement the public map, alternative region listing, sourced event/impact views, and the Flores case study.
- **December 10–14, 2026:** Testing and presentation. Run data, security, accessibility, performance, responsive, and fallback checks; prepare the competition presentation.
- **December 15–30, 2026:** Optional improvements only. Consider richer map layers, carefully scoped community functionality, additional visualizations, or editorial polish only after MVP stability.

MVP includes: sourced national context, `/peta`, `/kasus/ntt-2026`, `/metodologi`, `/sumber`, `/bantu`, the required domain models, local Stage 1 map data, text alternatives, source attribution, accessibility states, and production verification.

Optional after MVP: community submissions with full pre-moderation, richer basemap layers, expanded event coverage, advanced charting, and additional editorial interactions.

## 12. Skill Evaluation

The project uses portable principles, not unverified repository copies. The locally available skills at foundation time are `antislop`, `antislop-code`, `antislop-copywriting`, `antislop-human`, `antislop-layoutmobile`, `antislop-ui`, `banner-design`, `brand`, `design`, `design-system`, `slides`, `ui-styling`, `ui-ux-pro-max`, and `find-skills`. Use only skills that are actually available to the current agent.

| Skill | Main purpose and relevant capabilities | Compatibility | Use? | Activation |
|---|---|---|---|---|
| Cloudflare Security Audit | Multi-phase reconnaissance, coverage-led hunting, independent validation, structured findings, supply-chain and deployment security | Portable principles; full workflow requires a tool-using agent, Node.js, and an OS-enforced sandbox. Do not assume its CLI or sandbox exists | Yes, as a security review model; do not install blindly | Before MVP security review, after major auth/data/API changes, or for a focused vulnerability audit |
| obra Superpowers | Brainstorming, approved designs, plans, TDD, systematic debugging, code review, verification, subagent workflows | Portable concepts; installation is harness-specific. The repo supports OpenCode, but do not assume plugin installation has occurred | Yes, adapt workflow into this document | Before substantial features, debugging, and release verification |
| nextlevelbuilder UI UX Pro Max | Searchable styles, product palettes, typography, chart and UX guidance, stack-specific recommendations | Compatible; locally installed as `ui-ux-pro-max`. Search scripts require Python 3 and are local/no-network | Yes | New pages, design-system decisions, accessibility, data visualization, responsive UI review |
| anthropics Skills | Examples and specification for folder-based skills, document, data, and technical workflows | Claude-oriented implementation and disclaimer; portable Agent Skills ideas only. Do not use Claude plugin commands here | Reference only | When authoring a future local skill or evaluating skill structure |
| dietrichgebert Ponytail | Minimal-solution discipline, inspect existing code first, retain validation/security/accessibility, review and audit commands | Instruction file is portable; plugin commands and benchmarks are agent-specific and must not be assumed | Yes, adapt the ladder and review discipline | Every change; especially refactors, reviews, and performance work |
| mengto Skills | Portable procedural design and workflow skills, reference-driven design, GSAP and UI recipes | Portable folder contract; many skills are specialized and visual. Do not install unrelated skills | Selectively | UI/UX or GSAP work when a narrowly matching skill is available and reviewed |
| greensock GSAP Skills | GSAP core, timelines, ScrollTrigger, React lifecycle, performance and cleanup | Portable Agent Skills format and compatible with this stack; only use the needed skill, not every animation plugin | Yes | Any GSAP implementation or review; especially React cleanup and ScrollTrigger work |

Do not copy entire repositories into the project. Do not create references to skills that are not available locally or explicitly installed. When a repository requires a specific runtime, plugin marketplace, hook, or Claude-only mechanism, use the documented equivalent workflow in this file instead.

## 13. Change and Review Checklist

Before requesting approval for a change, confirm:

- Public text is Indonesian and distinguishes evidence levels.
- No unsupported statistic, exact victim location, prohibited personal data, or donation mechanism was introduced.
- Every displayed statistic has a source and as-of date.
- Region joins use official codes.
- Server/client boundaries are intentional.
- Error states, loading states, no-WebGL states, and text alternatives exist where relevant.
- Keyboard, focus, contrast, reduced motion, and responsive behavior were checked.
- Tests and lint/typecheck/build commands were run or the missing command is recorded.
- The diff contains only the intended files.
- `design.md` remains aligned with the implemented visual behavior.