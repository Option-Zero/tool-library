# Tool Library

Neighborhood tool lending PWA for bounded communities. MVP: Highlands2 neighborhood, Bellingham WA.

## Design System
Always read DESIGN.md before making any visual or UI decisions.
All font choices, colors, spacing, and aesthetic direction are defined there.
Do not deviate without explicit user approval.
In QA mode, flag any code that doesn't match DESIGN.md.

## Tech Stack
- **Framework:** TanStack Start (on Cloudflare Workers)
- **Database:** Cloudflare D1
- **Image storage:** Cloudflare R2
- **AI:** Gemini API for tool recognition from photos
- **Auth:** Email magic link against admin-managed allowlist
- **Notifications:** Web Push API (primary), SMS/email fallback
- **Location:** Browser Geolocation API for return verification

## Architecture
- PWA / mobile-first web app
- Cloudflare Workers deployment (via CF GitHub integration)
- Deploy command: `npx wrangler deploy`
- Domain: toolibrary.app (pending registration)

## Dev Server
- Run from hammer's checkout: `/home/jason/code/gt/toollibrary/crew/hammer`
- tmux session: `devserver` window: `tool-library`
- Command: `pnpm dev --host`
- Secrets in `.dev.vars` (gitignored — never commit)
- Local D1 data in `.wrangler/` (also gitignored)

## Key Product Decisions
- The app is a **catalog and discovery layer**, NOT a communication platform
- Borrowing is notification-only (no owner approval required) — mirrors the existing WhatsApp "borrowing X" flow
- Location verification matters more for **returns** than checkouts (confirms tool is back in owner's garage)
- Photo snap on borrow/return is optional for the user (built but skippable)
- AI-powered bulk tool intake: photo tool wall → Gemini identifies tools → owner reviews/confirms with bounding box tap UI
- Trust boundary = neighborhood membership (admin allowlist), not reputation scores

## Data Sources
- Highlands2 resident directory: ~/code/highlands2_directory.json (PII — NEVER commit to repo)
- Contains: names, emails, phone numbers, addresses per household

## Commit Messages
- First line under 72 characters
- Use `git -c commit.gpgsign=false` for all commits

## Node
- Node 22: ~/.nvm/versions/node/v22.22.1/bin
- pnpm: ~/.local/share/pnpm/pnpm
