# Meme'd Campaign Payout Tracker

A full-stack creator campaign marketplace. Brands publish Instagram/YouTube campaigns with milestone-based payouts; creators submit post URLs and track views and earnings.

## Stack

- **Frontend:** Next.js App Router, React, TypeScript, Tailwind CSS v4
- **Backend:** Node.js, Express, TypeScript
- **Database:** MongoDB + Mongoose
- **Authentication:** JWT + bcrypt password hashing
- **Tests:** Jest + ts-jest

## Repository structure

```text
/backend
  /src
    /config       MongoDB connection
    /middleware   JWT authentication and role guards
    /models       User, Campaign, Submission
    /routes       auth, campaigns, submissions, earnings
    /services     payout and milestone validation
    app.ts
    server.ts
  /tests          payout unit tests
/frontend
  /src/app        login, signup, brand, creator, campaign marketplace
  /src/lib        API client and shared types
```

## Requirements

- Node.js 20 or newer
- npm 10 or newer
- MongoDB running as a **replica set** for transactions, or a MongoDB Atlas cluster

MongoDB transactions are used to keep the campaign's `spent` amount and the submission's `payoutAllocated` value in sync. A standalone local MongoDB instance does not support multi-document transactions.

## Local setup

1. Install dependencies from the repository root:

   ```bash
   npm install
   ```

2. Configure the backend:

   ```bash
   cp backend/.env.example backend/.env
   ```

   Set `MONGODB_URI` to your MongoDB Atlas URI or local replica-set URI, and replace `JWT_SECRET` with a long random secret.

3. Configure the frontend:

   ```bash
   cp frontend/.env.example frontend/.env.local
   ```

   Set `NEXT_PUBLIC_API_URL` to the backend URL plus `/api`. For local development, the default is `http://localhost:4000/api`.

4. Start the backend in one terminal:

   ```bash
   npm run dev:backend
   ```

5. Start the frontend in another terminal:

   ```bash
   npm run dev:frontend
   ```

6. Open `http://localhost:3000`. Create a Brand account to create campaigns, and a separate Creator account to browse campaigns and submit posts.

## Environment variables

### Backend (`backend/.env`)

| Variable | Description |
|---|---|
| `PORT` | API port; defaults to `4000` |
| `MONGODB_URI` | MongoDB connection URI; transactions require a replica set |
| `JWT_SECRET` | Secret used to sign JWTs; do not commit it |
| `CLIENT_ORIGIN` | Comma-separated allowed frontend origins |
| `NODE_ENV` | Runtime environment |

### Frontend (`frontend/.env.local`)

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Public base URL for the backend API, including `/api` |

Never commit real environment files or secrets. `.env.example` files contain variable names and safe placeholders only.

## API overview

All endpoints use JSON unless noted.

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| `POST` | `/api/auth/signup` | Public | Create a Brand or Creator account |
| `POST` | `/api/auth/login` | Public | Login and receive a JWT |
| `POST` | `/api/campaigns` | Brand | Create a campaign and milestone ladder |
| `GET` | `/api/campaigns` | Authenticated | List active campaigns |
| `GET` | `/api/campaigns/mine` | Brand | List the current brand's campaigns and budget summaries |
| `GET` | `/api/campaigns/:id` | Authenticated | Get campaign details and submissions (brand ownership enforced for brands) |
| `POST` | `/api/submissions` | Creator | Submit a post URL to an active campaign |
| `GET` | `/api/submissions/mine` | Creator | List the creator's submissions and total allocated earnings |
| `PATCH` | `/api/submissions/:id/views` | Simulated platform endpoint | Update views and allocate eligible payout |
| `GET` | `/api/earnings` | Creator | Get total allocated earnings, views, and submission count |
| `GET` | `/api/health` | Public | Health check |

For authenticated endpoints, send `Authorization: Bearer <token>`.

Example view update:

```bash
curl -X PATCH http://localhost:4000/api/submissions/SUBMISSION_ID/views \
  -H 'Content-Type: application/json' \
  -d '{"views":60000}'
```

The view-update endpoint intentionally has no role check because the assignment specifies that simulated platform-data updates do not need one. It still validates the submission ID, input, and monotonic view count.

## Payout rules and assumptions

1. The payout for a post is the payout value of its **highest eligible milestone**, not the sum of all crossed milestones.
2. The payout increment is `max(0, targetPayout - payoutAllocated)`. This prevents repeated updates from paying the same milestone twice.
3. View counts must be non-negative integers and cannot decrease.
4. Milestone thresholds must be positive and strictly increasing. Payouts must be non-negative and non-decreasing.
5. If a full payout increment cannot fit inside the campaign's remaining budget, the increment is rejected entirely and the submission is marked `budget_exhausted`. Partial milestone payouts are not supported.
6. Campaign `remaining` is calculated as `budget - spent`, rather than stored independently.
7. Each creator may submit a given URL to a given campaign once. The database enforces this with a unique compound index.
8. The simulated view endpoint is public by assignment design. In a production application, it should be replaced with authenticated, verified platform webhooks or a trusted internal service.
9. Multi-document payout allocation runs in a MongoDB transaction. The campaign update includes a conditional budget check, and the submission/campaign writes commit together.
10. Currency amounts are represented as integer rupee values in the UI and API. For real financial payments, use integer paise or a Decimal128-based accounting model.

## Tests

Run backend unit tests:

```bash
npm test
```

The current tests cover below-threshold values, exact milestone boundaries, crossing multiple milestones in one update, incremental payout calculation, repeated updates, and milestone validation. Concurrent budget allocation should also be exercised against a replica-set MongoDB instance in an integration test before production use.

## Deployment

- **MongoDB:** Create a MongoDB Atlas cluster and configure network access and a least-privilege database user.
- **Backend:** Deploy `/backend` to Render or another Node.js host. Configure `MONGODB_URI`, `JWT_SECRET`, `CLIENT_ORIGIN`, `NODE_ENV`, and optionally `PORT`.
- **Frontend:** Deploy `/frontend` to Vercel. Set `NEXT_PUBLIC_API_URL` to the deployed backend URL ending in `/api`.
- Add the deployed frontend origin to `CLIENT_ORIGIN`, then verify signup, login, campaign creation, submission, view updates, and earnings on the live deployment.

The live link must be added here after deployment; it is not included until the application has actually been deployed and verified.

## Scaling to 10,000 creators (short note)

Keep campaign browsing paginated and indexed by status/creation date, and index submissions by creator and campaign. Cache active campaign-list responses in Redis with a short TTL and invalidate or refresh cache entries when campaign status changes. Move non-critical analytics and view-spike detection to a queue so view ingestion is not blocked by dashboard aggregation. Use MongoDB transactions or a dedicated atomic budget-allocation ledger to preserve payout invariants under concurrent updates. Add request rate limits, structured logs, metrics, and tracing; load-test the view-update path and monitor transaction retries. For money movement, store currency in paise, keep an append-only payout ledger, and reconcile ledger totals against campaign spend.

## Optional improvements not yet implemented

- Redis caching for active campaign listings
- Unusual view-spike detection
- Docker Compose setup
- Dedicated payout ledger and audit history
