# IS216 TechTrek

## Description

TechTrek is a full-stack career development platform that brings technology-related opportunities into one place. Students can discover, filter, save and track internships, jobs, hackathons and competitions, prepare for applications and interviews with AI-powered practice tools, and connect with potential teammates. This makes it easier for them to act on opportunities that support their development and career goals in tech. It is built with Vue.js, Node.js, Express.js and MongoDB in a client-server architecture, and works on both desktop and mobile.

This repo is a monorepo:

| Package            | Path      | Stack                               |
| ------------------ | --------- | ----------------------------------- |
| `@techtrek/client` | `client/` | Vue 3, Vite, Pinia, Vue Router      |
| `@techtrek/server` | `server/` | Express 5, Mongoose (MongoDB Atlas) |

`pnpm-workspace.yaml` is what makes this a monorepo: one lockfile, one
`node_modules` store, and one place to run a command across both packages.

## Features

- Opportunity Discovery: Users can browse internships, jobs, hackathons, and competitions aggregated from multiple sources.
- Application Tracker: Users can track applications through different stages and manage upcoming deadlines.
- Interview Preparation: Users can practice interview questions and receive AI-generated feedback.
- Teammate Finder: Users can create teams, join existing teams, and connect with peers for competitions and hackathons.
- Career Insights: Users can view comments and experiences shared by seniors about internships, jobs, and competitions.
- Skill-Based Matching: Users indicate their skills and interests, which are used to recommend relevant opportunities and match them with suitable teammates.
- User Profiles: Users can create profiles showcasing their skills, interests, and experience to support opportunity matching.

## Tech Stack

- Frontend:Vue,Bootstrap,CSS
- Backend:Node.js,Express,Mongoose
- Database: MongoDB Atlas
- External APIs: Gemini, Adzuna and DevPost
- Testing: Playwright

Hackathon data for this project was sourced from https://devpost.com/api/hackathons while job and internships data for this project was sourced from https://api.adzuna.com/v1/api

## Links

- **Live app (Vercel):** https://is216-techtrek.vercel.app
- **Git repository:** https://github.com/ivusc/techtrek

The client is on Vercel and calls `/api`. `client/vercel.json` forwards those calls to the API project at https://techtrek-server.vercel.app.

## Setup

You need **Node.js 22.18+ or 24.12+** and **pnpm** (`npm install -g pnpm`, or `corepack enable`).

1. Get the code: unzip the submitted folder, or clone the repo:

```bash
git clone https://github.com/ivusc/techtrek.git
cd techtrek
```

2. Install dependencies for both packages from the repo root:

```bash
pnpm install
```

3. Create `server/.env` with these keys:

```bash
MONGO_URI=<mongodb_connection_string>
PORT=8000
JOB_API_KEY=<adzuna_api_key>
JOB_API_APP_ID=<adzuna_app_id>
JOB_API_URL=https://api.adzuna.com/v1/api
HACKATHONS_API_URL=https://devpost.com/api/hackathons
SECRET=<jwt_secret>
GEMINI_API_KEY=<gemini_api_key>
```

4. `client/.env` already points the client at the local API (`SERVER_URL=http://localhost:8000`), so you don't need to change it.

5. (Optional) Seed the demo teams so the Teams page has something to show:

```bash
pnpm --filter @techtrek/server seed:teams
```

## Running the app

From the repo root, start the client and the API together:

```bash
pnpm dev
```

- Client: http://localhost:5173 (open this one)
- API: http://localhost:8000

To run them in separate terminals, use `pnpm dev:server` in one and `pnpm dev:client` in the other.

## Testing

All test commands run from the repo root.

**Unit and API tests (Vitest).** These need no `.env` and no internet. The server tests use an in-memory MongoDB.

```bash
pnpm test
```

- `server/__tests__/`: API tests with Supertest for auth, profiles, opportunities, the application tracker, interviews, teams and notifications.
- `client/src/**/__tests__/`: tests for components, views, stores, services and utils.

**End-to-end tests (Playwright).** Install the browsers once:

```bash
pnpm --filter @techtrek/client exec playwright install
```

Then run:

```bash
pnpm test:e2e
```

Playwright starts its own API with an in-memory database (`server/scripts/e2e-api.js`) and its own client, so you don't need to start anything first. The specs are in `client/e2e/`. They cover sign-up and login, the app shell, opportunities, the tracker (board, history, offers), interview practice, profiles and teams, at desktop and mobile breakpoints. To open the last report, run `pnpm --filter @techtrek/client exec playwright show-report`.

**Manual testing.** Log in with the test account below on the live app or on http://localhost:5173, then go through Opportunities, Tracker, Interview, Teams and Profile.

CI (`.github/workflows/ci.yml`) runs lint, unit tests and the build on every push and pull request.

## Test Accounts

| Username             | Password         |
| -------------------- | ---------------- |
| `testing@smu.edu.sg` | `Singapore@2026` |

You can also make a new account on the Sign Up page with any email ending in `@smu.edu.sg`.

## Project Structure

```text
.
├── client/
│   └── src/
│       ├── __tests__/
│       ├── assets/
│       ├── components/
│       ├── composables/
│       ├── constants/
│       ├── router/
│       ├── services/
│       ├── store/
│       ├── styles/
│       ├── utils/
│       └── views/
│
├── server/
│   ├── __tests__/
│   ├── ai/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── scripts/
│   ├── service/
│   ├── app.js
│   └── server.js
│
├── pnpm-workspace.yaml
└── README.md
```

## Commands

Run all of these from the repo root.

| Command             | What it does                                       |
| ------------------- | -------------------------------------------------- |
| `pnpm dev`          | Client and API together, both watching for changes |
| `pnpm dev:client`   | Client only                                        |
| `pnpm dev:server`   | API only                                           |
| `pnpm build`        | Production build of every package that has one     |
| `pnpm test`         | Unit tests across every package                    |
| `pnpm test:e2e`     | Playwright end-to-end tests                        |
| `pnpm lint`         | ESLint + oxlint, autofixing what it can            |
| `pnpm format`       | Prettier across the whole repo                     |
| `pnpm format:check` | Prettier in check-only mode (use this in CI)       |

## AI / LLM Usage Declaration

**Tools used:** Claude (Anthropic), Figma

**1. Parts that relied solely on AI/LLM**

- `server/scripts/seed-teams.js`, `server/scripts/demo-avatars.js`: mock data for teams and users, plus their illustrated profile pictures. AI generated these and we reviewed them.
- Dark mode and the theme switcher (`client/src/components/ThemeToggle.vue`, colour tokens in `client/src/styles/`).
- Home page refactor: AI split `HomeView.vue` into the components in `client/src/components/home/`.
- CI/CD setup: `.github/workflows/ci.yml`, `client/vercel.json` and `client/.env.production`.
- Automated tests: AI wrote most of the unit tests (`client/src/**/__tests__/`, `server/__tests__/`) and the Playwright end-to-end tests (`client/e2e/`). We picked which features to test and checked that the tests pass.
- Favicon (`client/public/favicon.svg`): AI made it from our sidebar icon.

**2. Parts where AI assisted but we wrote the code**

- Opportunity APIs: AI helped write the Adzuna and Devpost fetching and data normalisation in `server/controllers/opportunity-controller.js` and `server/service/opportunity-service.js`. We set the requirements (IT jobs in Singapore only, a full-time/intern filter, no shortcuts) and reviewed every change.
- Application tracker backend: AI produced starter CRUD code for `server/controllers/application-controller.js`, `server/models/Application.js` and `server/routes/application.js`. We decided which fields to store, how errors are handled (`handleError`), and that the opportunity is saved together with the application.
- Mobile layout pass: AI adjusted card sizes, spacing and font sizes on every page for small screens.
- Gemini prompts: AI moved the interview prompts into `server/ai/prompt.js`; we wrote and tuned the prompt content.
- Debugging: AI explained errors in Google Fonts and Bootstrap SCSS overrides, SVGs not rendering, the applications store returning `undefined`, the database not saving opportunities, and the lag when opening the create-team modal in `TeamsView.vue`. We applied and tested the fixes.
- Refactoring: AI suggested where helper functions and services should live and reorganised `client/src/components/` into subfolders; we approved the structure.
- Testing data: AI generated sample opportunity and application JSON so we could test the API in Thunder Client.
- Git: AI helped resolve merge conflicts when pulling `dev` into feature branches.
- UI/UX ideas: we explored colour themes, card layouts and responsive breakpoints with AI and in Figma before building the design we chose.

All AI-generated output was reviewed, tested and understood by the team.
