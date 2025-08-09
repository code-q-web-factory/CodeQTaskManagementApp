### React + TypeScript Chat (Vite + Tailwind + Jest)

This is a client-side React app scaffolded with Vite, styled with Tailwind CSS, and tested with Jest + React Testing Library. It includes a minimal chat UI with local-only state.

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
