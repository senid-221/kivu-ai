# KIVU AI

Production foundation for a multimodal AI platform with specialized Teacher, Developer, Student, Seller, and NESA EXAM Rev workspaces.

## Architecture

- **Next.js 15 + React 19** — application UI and server routes
- **PostgreSQL + Prisma** — users, conversations, messages, materials, exam reviews, study progress and achievements
- **Claude API** — model inference through the server-side `/api/chat` route
- **Secure sessions** — HTTP-only `kivu_session` cookie with server-side session signing
- **S3-compatible storage** — optional foundation for user materials

## Workspaces

| Workspace | Purpose |
|---|---|
| Teacher | Lessons, explanations and practical guidance |
| Developer | Websites, apps, systems, APIs and UI |
| Student | Interactive study and revision |
| Seller | Business, sales and growth strategy |
| NESA EXAM Rev | Question-by-question examination review |

## Local setup

1. Copy `.env.example` to `.env.local`.
2. Add `DATABASE_URL`, `ANTHROPIC_API_KEY` and `AUTH_SECRET`.
3. Install dependencies with `npm install`.
4. Generate Prisma Client with `npx prisma generate`.
5. Apply the schema with `npx prisma db push` for the first local environment.
6. Start with `npm run dev`.

Never put an Anthropic API key in client-side code. The browser calls KIVU's server route and the server calls Claude.
