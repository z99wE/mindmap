# Runbook — Mentally Operations Guide

## 1. Startup Failure

### Symptoms
- Server exits immediately with `FATAL: Missing required environment variables`
- Server starts but `/api/health` shows `database: { status: "error" }`

### Diagnosis
```bash
# Check environment variables
echo $DATABASE_URL  # Should be a valid Postgres connection string
echo $JWT_SECRET     # Should be a strong 32+ char random string

# Check Postgres connectivity
psql $DATABASE_URL -c "SELECT 1"

# Check logs
node server.js 2>&1 | grep -i error
```

### Resolution
1. Set missing env vars in `.env` or Render dashboard
2. Verify Postgres is running: `docker compose up -d postgres`
3. Check Render dashboard for deployment logs

---

## 2. Database Connection Lost

### Symptoms
- All routes return 500 with `DB_SYNC_DELAY`
- `/api/health` shows `database: { status: "error" }`

### Diagnosis
```bash
# Test connectivity
pg_isready -h $DB_HOST -p $DB_PORT

# Check connection count
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"

# Check for long-running queries
psql $DATABASE_URL -c "SELECT pid, now() - pg_stat_activity.query_start AS duration, query, state FROM pg_stat_activity WHERE state != 'idle' ORDER BY duration DESC;"
```

### Resolution
1. **Free-tier Render Postgres**: Wait 60s for auto-recovery. The pool retry logic will reconnect.
2. **Kill stuck queries**: `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'active' AND now() - query_start > interval '5 minutes';`
3. **Restart Postgres**: `docker compose restart postgres`
4. **Worst case**: Restart the app container: `docker compose restart app`

---

## 3. LLM Keys Exhausted

### Symptoms
- `/api/process/message` returns 503 with `HIGH_COGNITIVE_LOAD`
- Health check shows `keyPool: { status: "no_keys" }`

### Diagnosis
```bash
# Check which keys are configured
node -e "console.log(JSON.stringify(process.env.GROQ_KEY_1 ? 'GROQ_KEY_1 set' : 'GROQ_KEY_1 not set'))"

# Check KeyPool status via API
curl -s http://localhost:3001/api/health | jq '.checks.keyPool'
```

### Resolution
1. Add more API keys via environment variables
2. Check if keys have hit rate limits (especially Groq: 30 req/min)
3. If using free tier, wait for rate limit cooldown (typically 60s)
4. Add keys from different providers for fallback diversity

---

## 4. PulseKit Channel Failure

### Symptoms
- Messages not delivered to Telegram/Slack/etc.
- `[PulseKit]` error logs at startup

### Diagnosis
```bash
# Check PulseKit initialization logs
grep "PulseKit" server.log

# Verify channel credentials
psql $DATABASE_URL -c "SELECT platform, is_active FROM channels WHERE is_active = true;"
```

### Resolution
1. **Telegram**: Verify bot token is valid. Bot tokens look like `123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11`
2. **Discord**: Ensure bot has proper intents enabled in Discord Developer Portal
3. **WhatsApp**: Re-verify webhook in Facebook Business Manager
4. **Email**: Check SMTP credentials. Some providers block "less secure apps"
5. **Global bot**: Ensure `TELEGRAM_BOT_TOKEN` env var is set correctly

---

## 5. High Memory Usage

### Symptoms
- App becomes slow
- Render shows memory > 80%
- Health check memory values are high

### Diagnosis
```bash
# Check memory usage
curl -s http://localhost:3001/api/health | jq '.memory'

# Check Node.js heap
node -e "console.log(process.memoryUsage())"
```

### Resolution
1. **Restart server**: `docker compose restart app` (Render auto-restarts on deploy)
2. **Check memory leak**: Monitor heap growth over time
3. **Reduce connection pool**: Set `DATABASE_POOL_MAX=3` in env (default is 10)
4. **Free tier Render**: Service restarts daily, which clears memory

---

## 6. Rate Limit Exceeded

### Symptoms
- API returns 429 with `RATE_LIMITED`
- User reports "too many requests"

### Diagnosis
```bash
# Check rate limit headers on any response
curl -sI http://localhost:3001/api/health | grep -i ratelimit
```

### Resolution
1. **Free users**: 15 req/min on process endpoint, 60 req/min on memory
2. **Pro users**: 75 req/min on process, 300 req/min on memory
3. **Admin users**: Unlimited (bypassed)
4. **Global limit**: 100 req/15min per IP on `/api/` globally
5. Wait for the rate limit window to expire (typically 1 minute)

---

## 7. Backup & Restore

### Backup (Postgres)
```bash
# Create backup
pg_dump $DATABASE_URL > mentally_backup_$(date +%Y%m%d).sql

# Compress
gzip mentally_backup_*.sql
```

### Restore
```bash
# Create a fresh database first
createdb mentally_restore

# Restore
gunzip -c backup_file.sql.gz | psql mentally_restore
```

### Render Postgres
Use Render's built-in backup feature from the Dashboard → PostgreSQL → Backups.

---

## 8. Deployment Rollback

### Render
1. Go to Render Dashboard → mentally → Deploys
2. Find the last known-good deploy
3. Click "Deploy" on that version
4. Verify with `/api/health` endpoint

### Manual
```bash
# Checkout previous commit
git log --oneline -5
git checkout <previous-stable-commit>

# Rebuild and restart
docker compose build
docker compose up -d
```

---

## 9. Disaster Recovery

If the entire database is lost:

1. **Restore from backup** (see Backup section)
2. **If no backup exists**: The app will create all tables on startup (via `runMigrations()`)
3. **Users will need to re-register**: No user data can be recovered without backup
4. **Prevention**: Schedule daily backups:
   ```cron
   0 3 * * * pg_dump $DATABASE_URL > /backups/mentally_$(date +\%Y\%m\%d).sql
   ```

---

## 10. On-Call Contacts

| Role | Contact |
|------|---------|
| Developer | Set in Render dashboard → Project settings |
| DPO (Data Protection) | admin@mentally.local (configurable via env) |
| Incident Response | Documented in this runbook |

---

*Last updated: 2025-08-20*
