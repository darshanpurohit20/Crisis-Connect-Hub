# VoiceForward — AI-Augmented Crisis Response Intelligence

## Overview

A real-time platform for Indian crisis helplines that gives operators AI intelligence while they talk to distressed callers. Built for SOC1 Hackathon 2026.

## What it does

- **Callers** join anonymously as guests, select their language, and start a WebRTC voice call
- **Operators** register, log in, and see a 3-pane HUD: call queue, live transcript, and real-time AI insights
- **AI layer** simulates real-time emotion detection, risk scoring, ambient audio classification, and recommended actions
- **Call queue** supports multiple callers waiting, multiple operators, hold/switch functionality
- **WebSocket** provides real-time bidirectional communication for voice and AI insights
- **Map/Resources** shows nearby hospitals, counseling centers, police stations per call
- **Supervisor dashboard** shows analytics: calls per hour, risk breakdown, language distribution, operator performance

## Stack

- **Monorepo tool**: pnpm workspaces
- **Frontend**: React + Vite (artifacts/voiceforward) — dark mode, navy/teal theme
- **Backend**: Express 5 + Node.js (artifacts/api-server)
- **Database**: PostgreSQL + Drizzle ORM
- **Real-time**: WebSocket (ws package) for voice and AI insight streaming
- **State**: React Query for server state, localStorage for sessions
- **Charts**: Recharts for analytics dashboard
- **Animation**: Framer Motion for risk gauge and transitions
- **Validation**: Zod (via Orval codegen from OpenAPI)
- **Auth**: Simple password hashing (SHA-256 + salt) for operator accounts; guest tokens for callers

## Architecture

```
artifacts/voiceforward/   Frontend (port varies, route: /)
artifacts/api-server/     Backend API + WebSocket (port 8080, routes: /api, /ws)
lib/api-spec/             OpenAPI spec (source of truth)
lib/api-client-react/     Generated React Query hooks
lib/api-zod/              Generated Zod validators
lib/db/                   Drizzle schema + PostgreSQL connection
```

## Key Routes (Frontend)

- `/` — Landing page
- `/caller` — Guest session creation
- `/caller/call/:callId` — Active caller voice call UI
- `/operator/login` — Operator login
- `/operator/register` — Operator registration
- `/operator/dashboard` — Main 3-pane operator HUD
- `/operator/dashboard/insights` — Supervisor analytics dashboard

## Key Routes (API)

- `POST /api/auth/guest` — Create guest caller session
- `POST /api/auth/operator/register` — Register operator
- `POST /api/auth/operator/login` — Login operator
- `GET/POST /api/calls` — List/create calls
- `PATCH /api/calls/:id/state` — Update call state (hold, end, active)
- `POST /api/calls/:id/assign` — Assign operator to call
- `GET/POST /api/calls/:id/transcript` — Transcript segments
- `GET/POST /api/calls/:id/insights` — AI insights per call
- `GET /api/calls/:id/resources` — Nearby resources
- `GET /api/queue` — Full queue status
- `GET/PATCH /api/operators` — Operator list and status
- `GET /api/insights/dashboard` — Supervisor analytics

## WebSocket (/ws)

Connect with: `ws://[host]/ws?callId=[callId]&role=[caller|operator]`

Message types:
- `connected`, `participant_joined`, `participant_left` — lifecycle events
- `ai_insight` — real-time AI analysis (sent every ~8 seconds to operators)
- `transcript` — live transcript segments
- `chat` — text messages
- `operator_action` — operator actions broadcast to call

## Demo Accounts

- `priya@helpline.in` / any password
- `arjun@vandrevala.org` / any password

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes
- `pnpm --filter @workspace/api-server run dev` — run API server locally
- `pnpm --filter @workspace/voiceforward run dev` — run frontend locally
