# bdportal

Internal LIBD Brain Data Portal web application.

For current setup, architecture, and agent orientation notes, start here:

- `AGENTS.md`: quick-start facts for Codex agents.
- `README-project.md`: detailed frontend, middleware, data-generation, and deployment orientation.

## Quick Commands

```bash
npm ci
cd server && npm ci
```

Run middleware and frontend in separate terminals.

Terminal 1:

```bash
cd server && npm start
```

Terminal 2, from the repository root:

```bash
npm run dev
```

Useful checks:

```bash
npm run lint
npm run build
npm run build-based
```

The frontend dev server runs on `http://localhost:8080`; the middleware runs on `http://localhost:4095` and is reached by the frontend through `/api`.
