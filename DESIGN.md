# Design System — Tool Library

## Product Context
- **What this is:** Neighborhood tool lending app — catalog, discovery, and check-in/checkout for shared tools
- **Who it's for:** Neighbors in bounded communities (MVP: Highlands2, Bellingham WA)
- **Space/industry:** Community sharing / tool lending libraries
- **Project type:** PWA web app (mobile-first)

## Aesthetic Direction
- **Direction:** Organic/Natural — warm workshop feel, like oiled wood and organized pegboard
- **Decoration level:** Intentional (subtle texture/warmth on surfaces, not flat or clinical)
- **Mood:** Homey, trustworthy, connected. Like borrowing from a friend's garage, not using enterprise software.
- **Reference sites:** thetoollibrary.org (institutional, busy — what NOT to be), localtools.org (dated SaaS — what NOT to be)
- **Anti-patterns:** No tech blue, no startup purple, no nonprofit orange. No 3-column icon grids. No generic SaaS feel.

## Typography
- **Display/Hero:** Fraunces (optical serif, variable) — warm, handcrafted character. Separates from geometric sans-serif category norm.
- **Body:** Plus Jakarta Sans — clean, warm, readable. Personality without distraction.
- **UI/Labels:** Plus Jakarta Sans (600 weight)
- **Data/Tables:** Plus Jakarta Sans (tabular-nums feature)
- **Code:** JetBrains Mono
- **Loading:** Google Fonts CDN
- **Scale:**
  - xs: 12px / 0.75rem
  - sm: 14px / 0.875rem
  - base: 16px / 1rem
  - lg: 18px / 1.125rem
  - xl: 20px / 1.25rem
  - 2xl: 24px / 1.5rem
  - 3xl: 30px / 1.875rem
  - 4xl: 36px / 2.25rem
  - hero: clamp(40px, 6vw, 72px)

## Color
- **Approach:** Restrained — 1 warm accent + earth neutrals. Color is rare and meaningful.
- **CSS Variables:**
  ```css
  --bg: #FDFAF6;           /* warm cream background */
  --surface: #FFFFFF;       /* card/panel surfaces */
  --surface-raised: #F7F3ED; /* subtle raised surfaces */
  --text: #2D2A26;          /* warm near-black */
  --muted: #736E69;         /* warm gray — passes WCAG AA on bg+surface */
  --accent: #C17F3E;        /* warm amber/ochre — decorative/large text only */
  --accent-on-bg: #9A6530;  /* darkened accent for buttons + small text (4.5:1 on white) */
  --accent-hover: #7E5228;
  --secondary: #4A6F5C;     /* forest green — PNW, community */
  --secondary-hover: #3B5A4A;
  --border: #E8E2DA;
  --border-subtle: #F0EBE4;
  --error: #B04040;         /* darkened for AA contrast */
  --warning: #A07028;       /* darkened for AA contrast */
  --success: #4A6F5C;       /* same as secondary */
  --info: #4F6F8A;          /* darkened steel blue for AA contrast */
  ```
- **Dark mode strategy:** Reduce saturation 10-20%, flip surfaces to warm darks:
  ```css
  --bg: #1A1816;
  --surface: #242120;
  --text: #E8E2DA;
  --border: #3A3632;
  --border-subtle: #2E2B28;
  --surface-raised: #2E2B28;
  --muted: #9A9590;         /* lightened for AA on dark surfaces */
  --accent: #D4943A;        /* slightly warmer in dark */
  --accent-on-bg: #D4943A;  /* same as accent in dark (passes AA on dark bg) */
  --secondary: #6B9B80;     /* slightly lighter in dark */
  --error: #D46060;
  --warning: #D4943A;
  --success: #6B9B80;
  --info: #7BA0BE;
  ```
- **Color scheme:** Respect `prefers-color-scheme` by default. Persist user override in localStorage.

## Spacing
- **Base unit:** 8px
- **Density:** Comfortable
- **Scale:** 2xs(2px) xs(4px) sm(8px) md(16px) lg(24px) xl(32px) 2xl(48px) 3xl(64px)

## Layout
- **Approach:** Grid-disciplined (clean catalog layout, mobile-first)
- **Breakpoints:** sm: 640px, md: 768px, lg: 1024px, xl: 1200px
- **Grid:** 1 col mobile, 2 col tablet (md+), 3-4 col desktop (lg+) for tool cards
- **Max content width:** 1200px
- **Container padding:** 16px below sm, 24px above sm
- **Body text max-width:** 65ch (prevents unreadable line lengths on wide screens)
- **Border radius:**
  - sm: 6px (buttons, inputs, pills)
  - md: 10px (cards, panels)
  - lg: 16px (modals, major containers)
  - full: 9999px (badges, pills, avatars)
- **Safe areas:** Use `env(safe-area-inset-*)` for bottom nav and fixed elements (PWA standalone mode on notched phones)
- **Touch targets:** Minimum 44px for primary actions (buttons, nav items). 36px absolute minimum for secondary actions.

## Motion
- **Approach:** Minimal-functional — only transitions that aid comprehension
- **Easing:** enter(ease-out) exit(ease-in) move(ease-in-out)
- **Duration:** micro(50-100ms) short(150-250ms) medium(250-400ms)
- **No:** bouncy animations, scroll-driven effects, decorative motion

## Component Patterns
- **Buttons:** Primary (accent-on-bg text on bg), Secondary (forest green), Ghost (border only). Rounded sm. No gradient.
- **Cards:** White surface, subtle border, comfortable padding. No drop shadows.
- **Status badges:** Pill-shaped. Available=green tint, Checked out=warning tint, Unavailable=muted.
- **Search:** Full-width input with category pills below. Search is THE entry point.
- **Notifications/Toasts:** Icon + text, minimal chrome. Color-coded by type. Auto-dismiss after 5s, swipe to dismiss on mobile.
- **Bottom nav (mobile):** Fixed bottom bar with 3-4 items. Respects safe-area-inset-bottom. Active = accent color, inactive = muted.
- **Empty states:** Illustration-free. Short heading + action button. "No tools yet — add your first" not "Oops! Nothing here."
- **Loading:** Skeleton placeholders matching card/list shapes. No spinners except on button actions.
- **Form inputs:** Border-subtle border, rounded sm. Focus ring = accent color (2px). Error state = error color border + message below.
- **Photo/camera:** Full-bleed camera viewfinder for tool photos. Minimal overlay — capture button + close. Gallery fallback.

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-03-29 | Initial design system created | Created by /design-consultation based on office-hours product context and competitive research |
| 2026-03-29 | Fraunces as display font | Warm serif differentiates from every other tool library / community app (all geometric sans) |
| 2026-03-29 | Amber/ochre as primary accent | Workshop color — feels like wood and tools, not tech or nonprofit |
| 2026-03-29 | Restrained color approach | Community trust requires visual simplicity — too much color feels commercial |
