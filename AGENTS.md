# Repository Guidelines

## Project Structure & Module Organization
- Root frontend (Vite + React + TS): `App.tsx`, `index.tsx`, `components/`, `services/`, `utils/`, `public/`, `tailwind.config.js`, `vite.config.ts`.
- Backend (Django REST): `backend/` with apps `authentication/`, `products/`, `ai_services/`, project config `easystyle_backend/`.
- Config and docs: `.env.local`, `.env.production`, `README.md`, `docs/`, deployment `vercel.json`.

Example layout:
```
/                   # frontend root
/backend/           # Django project
/public/            # static assets served by Vite
```

## Build, Test, and Development Commands
- Frontend dev: `npm run dev` — start Vite at http://localhost:5173.
- Frontend build: `npm run build` — produce `dist/` for deploy; preview with `npm run preview`.
- Backend setup: `cd backend && python -m venv easystyle_env && source easystyle_env/bin/activate && pip install -r requirements.txt`.
- Backend DB + server: `python manage.py migrate && python manage.py runserver 8000` (http://localhost:8000).
- Backend sanity checks: `python manage.py check` and `python manage.py showmigrations`.

## Coding Style & Naming Conventions
- TypeScript + React: functional components, hooks; 2‑space indent.
- File names: React components `PascalCase.tsx` in `components/`; utilities `camelCase.ts` in `utils/`; route pages under `pages/`.
- Styling: Tailwind CSS classes; prefer semantic class composition over inline styles.
- Imports: use `@/*` path alias from `tsconfig.json` when appropriate.
- Python (Django): 4‑space indent; models/serializers/views split per app.

## Testing Guidelines
- Backend scripts: run targeted checks via `backend/test_admin.py` and `backend/test_db_connection.py` (execute with activated venv: `python test_admin.py`).
- Django tests (if added): place as `backend/<app>/tests/test_*.py`; run with `python manage.py test`.
- Frontend: no test runner configured; keep UI logic small and testable; add tests with your chosen runner in a separate PR.

## Commit & Pull Request Guidelines
- Commits: concise, imperative subject; scope if helpful. Example: `feat(auth): add JWT login endpoint` or `fix(ui): correct responsive grid`.
- PRs: clear description, linked issues, reproduction steps, and screenshots or curl examples for API changes.
- Include migration notes and update docs (`README.md`, this file) when changing setup or commands.

## Security & Configuration Tips
- Do not commit secrets; use `backend/.env`, `.env.local`, `.env.production`.
- CORS is open in dev; restrict for production.
