# TradeUP

Arabic-first mobile trading education simulator with paper trading, gamification, and an OpenAI-powered philosophy coach (Lumi UI + selectable coach personas).

## Run & Operate

- `pnpm --filter @workspace/life-os run dev` — frontend
- `pnpm --filter @workspace/api-server run dev` — API (port 8080)
- `pnpm run typecheck` — full typecheck
- `pnpm run build` — typecheck + build
- `pnpm --filter @workspace/api-spec run codegen` — regenerate hooks/Zod from OpenAPI
- `pnpm --filter @workspace/db run push` — push DB schema (dev)

### Required env

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Postgres connection string |
| `OPENAI_API_KEY` | OpenAI API key for gpt-4o-mini coaching |
| `OPENAI_MODEL` | Optional, default `gpt-4o-mini` |

## Stack

- pnpm workspaces, TypeScript 5.9
- Frontend: React + Vite, Framer Motion, Recharts, Tailwind CSS v4, Wouter
- API: Express 5 + OpenAI SDK
- DB: PostgreSQL + Drizzle ORM
- API codegen: Orval from `lib/api-spec/openapi.yaml`

## Product surfaces

- **Home**: XP, trade streak, portfolio, coach CTA
- **Trading**: Portfolio, market, buy/sell with AI preview + confirm, session review
- **Education**: Static Arabic curriculum
- **AI Coach**: Chat with history, 4 philosophy personas, session review
- **Progress**: Streaks, badges, trade counts

## Architecture notes

- Single user (`user_id = 1`) for personal demo
- Simulated prices (seeded random walk)
- Coach never hard-blocks trades; high risk requires `confirmed: true`
- Structured JSON via OpenAI `response_format: json_schema`
