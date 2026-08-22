# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 3.x (latest) | ✅ Full support |
| 2.x | ⚠️ Security fixes only |
| < 2.0 | ❌ Unsupported |

## Reporting a Vulnerability

**Do NOT report security vulnerabilities in public GitHub issues.**

Instead, email: [admin@mentally.local](mailto:admin@mentally.local)

You should receive a response within 48 hours. If you don't, follow up via the same channel.

### What to include:
- Type of vulnerability
- Full description and steps to reproduce
- Proof of concept (if available)
- Impact assessment

### What happens next:
1. We acknowledge receipt within 48 hours
2. We investigate and confirm the vulnerability
3. We develop and test a fix
4. We release a patched version with a security advisory
5. We credit the reporter (if desired)

## Security Measures in Place

### Application Security
- **Helmet CSP**: Content Security Policy restricts script/style sources
- **XSS Sanitization**: All POST body strings are sanitized for script injection
- **SQL Injection Prevention**: Parameterized queries everywhere — no string concatenation
- **JWT Authentication**: 7-day access tokens + 30-day refresh tokens with rotation
- **Rate Limiting**: Global (100/15min IP) + Per-user (tier-based) + Auth-specific limits
- **Password Hashing**: bcrypt with 12 salt rounds + email validation + disposable email blocking
- **API Key Encryption**: AES-256 encryption at rest for channel credentials and LLM keys

### Infrastructure Security
- **HSTS**: Strict Transport Security enforced (1 year, include subdomains, preload)
- **Permissions Policy**: Restricted browser features (camera, mic, geolocation scoped to same-origin)
- **CORS**: Restricted to configured frontend URL in production
- **Rate Limiting**: express-rate-limit with standard headers

### Database Security
- **Parameterized Queries**: No raw SQL string interpolation
- **Row-Level Security**: Optional tenant isolation at the database level (ENABLE_RLS=true)
- **Connection Pool**: Limited connections (3 in production) with timeout
- **Migration Safety**: All migrations use IF NOT EXISTS / ADD COLUMN IF NOT EXISTS patterns

### CI/CD Security
- **CodeQL Analysis**: Static analysis on every PR and weekly schedule
- **Secret Scanning**: Gitleaks scans for committed secrets on every PR
- **Dependency Review**: License and vulnerability check on dependency changes
- **Dependency Scanning**: npm audit in CI with high severity threshold
- **OSV-Scanner**: Open source vulnerability scanner for dependencies

## Disclosure Policy

We follow a coordinated disclosure process:
1. Reporter submits vulnerability privately
2. We confirm and develop a fix
3. We release the fix and publish a CVE
4. We publicly acknowledge the reporter (with permission)

## Security Checklist for Deployments

Before any production deployment:
- [ ] All tests pass (`npm run test:all`)
- [ ] No high-severity npm audit findings (`npm audit --audit-level=high`)
- [ ] No unaddressed CodeQL findings
- [ ] JWT_SECRET is a strong random string (32+ chars)
- [ ] API_KEY_ENCRYPTION_SECRET is a strong random string (32+ chars)
- [ ] DATABASE_URL uses TLS (sslmode=require for production Postgres)
- [ ] NODE_ENV is set to "production"
- [ ] Debug routes are not exposed
- [ ] CORS origin is set to the actual frontend URL

## Responsible Use

This application is designed for:
- Personal cognitive productivity
- Authorized security testing by the application owner
- Educational use and research

It is NOT designed for:
- Surveillance or tracking without consent
- Storing classified or illegal content
- Bypassing security controls of third-party services

## Contact

For security questions: [admin@mentally.local](mailto:admin@mentally.local)
