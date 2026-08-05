# Thought GPS — Preview Run Doc

Worktree: `/Users/souvikchakraborty/Mindmap/.freebuff/worktrees/8b877d68-9533-48ca-8746-1ebabdd04a15`

## How to reproduce the artifacts

1. **Env files** — copy the gitignored `.env` files from the main checkout:
   ```bash
   cp /Users/souvikchakraborty/Mindmap/.env /Users/souvikchakraborty/Mindmap/.freebuff/worktrees/8b877d68-9533-48ca-8746-1ebabdd04a15/phase2-working/.env
   ```
   (Also `.env.local` / `.env.example` if present.) Never commit these.

2. **Install dependencies**:
   ```bash
   cd phase2-working && npm install --no-audit --no-fund
   cd src/frontend && npm install --no-audit --no-fund
   ```

3. **Build the frontend** (the server serves `src/frontend/dist`):
   ```bash
   cd phase2-working/src/frontend && npx vite build
   ```

4. **Database** — Postgres optional in dev; the server falls back to a degraded no-DB mode if `DATABASE_URL` is unreachable. A local Postgres (or the main checkout's DB) gives full functionality.

## How to run the server

```bash
cd /Users/souvikchakraborty/Mindmap/.freebuff/worktrees/8b877d68-9533-48ca-8746-1ebabdd04a15/phase2-working
PORT=3001 node server.js
```

- Default port: **3001** for this worktree (the main checkout uses 3333 — keep them distinct).
- The server serves both the API (`/api/*`) and the built frontend SPA.
- Detached launch (survives the shell), logging to
  `/Users/souvikchakraborty/Mindmap/.freebuff/preview-8b877d68-9533-48ca-8746-1ebabdd04a15.log`:
  ```bash
  cd /Users/souvikchakraborty/Mindmap/.freebuff/worktrees/8b877d68-9533-48ca-8746-1ebabdd04a15 && python3 - <<'EOF'
  import os, subprocess
  log = open('/Users/souvikchakraborty/Mindmap/.freebuff/preview-8b877d68-9533-48ca-8746-1ebabdd04a15.log', 'ab')
  env = dict(os.environ, PORT='3001')
  p = subprocess.Popen(['node', 'server.js'], cwd='phase2-working', stdout=log, stderr=subprocess.STDOUT, start_new_session=True, env=env)
  print('SPAWNED_PID', p.pid)
  EOF
  ```
- Health check: `curl http://localhost:3001/api/health`
