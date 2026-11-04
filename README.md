# IS216 TechTrek

## Description
A full-stack career development platform built with Vue.js, Node.js, Express.js, and MongoDB, enabling students to discover internships, jobs, hackathons, and competitions, track applications and interviews, find teammates, and prepare for interviews through AI-powered practice tools. The application follows a client-server architecture and provides a responsive, user-friendly experience across desktop and mobile devices.

This repo is a monorepo:

| Package            | Path      | Stack                               |
| ------------------ | --------- | ----------------------------------- |
| `@techtrek/client` | `client/` | Vue 3, Vite, Pinia, Vue Router      |
| `@techtrek/server` | `server/` | Express 5, Mongoose (MongoDB Atlas) |

`pnpm-workspace.yaml` is what makes this a monorepo: one lockfile, one
`node_modules` store, and one place to run a command across both packages.

## Features

* Opportunity Discovery: Users can browse internships, jobs, hackathons, and competitions aggregated from multiple sources.
* Application Tracker: Users can track applications through different stages and manage upcoming deadlines.
* Interview Preparation: Users can practice interview questions and receive AI-generated feedback.
* Teammate Finder: Users can create teams, join existing teams, and connect with peers for competitions and hackathons.
* Career Insights: Users can view comments and experiences shared by seniors about internships, jobs, and competitions.
* Skill-Based Matching: Users indicate their skills and interests, which are used to recommend relevant opportunities and match them with suitable teammates.
* User Profiles: Users can create profiles showcasing their skills, interests, and experience to support opportunity matching.

## Tech Stack

* Frontend:Vue,Bootstrap,CSS
* Backend:Node.js,Express,Mongoose
* Database: MongoDB Atlas
* External APIs: Gemini, Adzuna and DevPost
* Testing: Playwright

Hackathon data for this project was sourced from https://devpost.com/api/hackathons while job and internships data for this project was sourced from https://api.adzuna.com/v1/api

## Installation

1. Clone the repository

```bash
git clone https://github.com/ivusc/is216-techtrek
cd is216-techtrek
```

2. Install dependencies

```bash
cd client && pnpm install
```
```bash
cd server && pnpm install
```

3. Add the server settings
Create an .env file in the server
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
4. Run the app
Use two terminals
Terminal 1 is the server(http://localhost:8000)
```bash
cd server && pnpm dev
```
Terminal 2 is the client (http://localhost:5173)
```bash
cd client && pnpm dev
```
Open http://localhost:5173/


## Test Accounts

| Username | Password |
|----------|----------|
| `testing@smu.edu.sg` | `Singapore@2026` |  

You can also create a new account on the Sign Up page with any email ending in @smu.edu.sg

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
