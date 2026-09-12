# EDUKA

Production foundation for a multimodal AI learning platform with Teacher, Developer, Student, Seller, and NESA Exam workspaces.

## Architecture

- **Next.js 15 + React 19** — application UI and server routes
- **PostgreSQL + Prisma** — users, conversations, messages, materials, exam reviews, study progress and achievements
- **Google Gemini API** — AI inference through the server-side Gemini integration
- **Secure sessions** — HTTP-only Eduka session authentication with server-side JWT signing
- **Gemini Files API** — PDF and document analysis with native file processing
- **Knowledge connectors** — trusted learning and professional knowledge sources

## Workspaces

| Workspace | Purpose |
|---|---|
| Teacher | Lessons, explanations and practical guidance |
| Developer | Websites, apps, systems, APIs and UI |
| Student | Interactive study and revision |
| Seller | Business, sales and growth strategy |
| NESA Exam | Question-by-question examination review |

## Local setup

1. Copy `.env.example` to `.env.local`.
2. Add `DATABASE_URL`, `GEMINI_API_KEY` and `AUTH_SECRET`.
3. Optionally set `GEMINI_MODEL` to a model available to your API key.
4. Install dependencies with `npm install`.
5. Generate Prisma Client with `npx prisma generate`.
6. Apply the schema with `npx prisma db push` for the first local environment.
7. Start with `npm run dev`.

Never put a Gemini API key in client-side code. The browser calls EDUKA's server routes and the server communicates with Gemini.
