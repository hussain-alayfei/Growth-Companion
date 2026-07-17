# TradeUP / Growth-Companion

Arabic-first paper-trading education app with OpenAI coaching (gpt-4o-mini).

## Stack

- Frontend: React + Vite (`artifacts/life-os`) → **Vercel**
- API: Express (`artifacts/api-server`) → **Render**
- DB: PostgreSQL (Render)

## Environment

| Variable | Where | Notes |
|----------|--------|--------|
| `OPENAI_API_KEY` | Render API | Required for live coach |
| `OPENAI_MODEL` | Render API | Default `gpt-4o-mini` |
| `DATABASE_URL` | Render API | Postgres connection string |
| `PORT` | Render API | Set by Render |
| `VITE_API_URL` | Vercel build | API origin, e.g. `https://tradeup-api.onrender.com` |

**Never commit secrets.** Use `.env.example` locally.

## Local

```bash
pnpm install --ignore-scripts
pnpm --filter @workspace/db run push
pnpm --filter @workspace/api-server run dev
PORT=5173 BASE_PATH=/ pnpm --filter @workspace/life-os run dev
```
