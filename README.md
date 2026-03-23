# OL Renditions tests

A small Next.js app that loads a [Frontify](https://www.frontify.com/) library over GraphQL and runs local checks on masters and renditions (PSD/TIF/PNG/JPEG rules, JPEG white-border sampling, and similar suites).

---

## Prerequisites

- [Node.js](https://nodejs.org/) 20 or newer (matches this repo’s tooling)
- A Frontify brand with API access and a **personal access token** (or OAuth bearer) that can query the library and read assets

---

## 1. Clone and install

```bash
git clone <your-repo-url>
cd "OL Renditions tests"
npm install
```

---

## 2. Environment variables

Copy the example file and edit the values:

```bash
cp .env.example .env
```

Open `.env` and set:

| Variable | Required | What to put |
|----------|----------|-------------|
| `FRONTIFY_GRAPHQL_URL` | Yes | Your brand’s **full GraphQL API URL** (the endpoint you use for Frontify’s GraphQL API, not the marketing site). |
| `FRONTIFY_ACCESS_TOKEN` | Yes | **Bearer token** — same value you’d send as `Authorization: Bearer …`. Used for GraphQL and for downloading previews when a suite needs image bytes. |
| `FRONTIFY_LIBRARY_ID` | Yes | Numeric **library ID** to scan: a **positive integer** (digits only, e.g. `23`). |

Save the file. Next.js reads `.env` automatically for `npm run dev` and `npm run build`.

> **Security:** Do not commit `.env`. It is gitignored; keep tokens out of the repo and rotate them if they leak.

---

## 3. Run the app

**Development** (hot reload):

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). If `FRONTIFY_LIBRARY_ID` is missing, the page tells you to set it before the checker UI appears.

**Production build** (optional):

```bash
npm run build
npm start
```

---

## 4. Using the checker

1. Confirm the header shows the library ID from `.env`.
2. Open **Run configuration** and turn individual **suites** on or off.
3. Click **Run check**. Progress streams from the server; when it finishes, use the tabs to review each suite and any failing assets.

Suite toggles only affect what runs on the next request; the target library always comes from `FRONTIFY_LIBRARY_ID`.

---

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Local development server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
