# Code Q Management App

Code Q Management is a client-side React application that consolidates Asana tasks and Everhour time data to help prioritize work. It provides a "Critical" view that surfaces long-standing tasks and highlights items with significant time investment, and a "Focused Work" view that filters tasks by curated project presets. The app stores API credentials locally in the browser and performs all data fetching directly from the client, avoiding any server-side persistence. To minimize latency and API load, it employs memoization and a lightweight localStorage cache for Asana queries. The UI is built with Tailwind and organized into presentational components to keep rendering clean and maintainable.

This is a client-side React app scaffolded with Vite, styled with Tailwind CSS, and tested with Jest + React Testing Library. It includes a minimal chat UI with local-only state.

### Main Features

1. Critical tasks spotlight: lists tasks older than six months to surface long-standing items.
2. Time-invested flagging: shows tasks older than one month with more than one hour logged via Everhour.
3. Assignee filtering: quick filter for all, unassigned, or specific assignees.
4. Focused Work presets: one-click filters for curated Asana project groups (e.g., Code Q Developer, FlowMagic).
5. Asana integration: reads workspaces, projects, and tasks via the official Asana SDK using a Personal Access Token.
6. Everhour integration: fetches time entries and joins them to Asana tasks by URL or task id.
7. Client-side credential storage: saves tokens/keys in localStorage with no server involved.
8. Caching and memoization: in-memory TTL cache plus persistent localStorage cache for faster repeat queries.
9. Clean task cards: consistent presentation of title, assignee, created date, and total hours with external links to Asana.
10. Simple navigation shell: top-level app shell with routes for Critical, Focused Work, and Settings.

### Prerequisites
- Node 18+ and npm

### Install
```bash
nvm use
npm install
```

### Start (with Hot Reloading)
```bash
nvm use
npm run dev
```
- Open the app at the URL shown in the terminal.
- Hot Module Replacement (HMR) is enabled by default via Vite + React Fast Refresh. When you edit files in `src/`, the UI updates without a full reload.

### Build
```bash
nvm use
npm run build
```

### Preview production build
```bash
npm run preview
```

### Test
```bash
nvm use
npm test
npx playwright test
```

Additional commands:
- `npm run test:watch` — run tests in watch mode
- `npm run test:coverage` — run tests with coverage

### Project structure
- `src/types/` — shared type definitions
- `src/components/` — presentational UI components
- `src/pages/` — containers that manage state and compose components
- `src/__tests__/` — unit tests

### Styling
Tailwind CSS is configured in `tailwind.config.js` and `postcss.config.js`. Base utilities are imported in `src/index.css`.

### Notes
- This app is client-side only; messages are kept in memory.
- You can adapt `src/pages/ChatPage.tsx` to connect to an API or WebSocket later.
