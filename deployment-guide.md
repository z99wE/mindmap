# Deployment Guide: Zero-Cost Architecture

This guide details how to take the application live with robust security, utilizing free-tier services. 

## 1. Domain Registration
*Security Context*: Completely free domains (like `.tk`, `.ml`) suffer from extremely poor SEO and frequent blacklisting by email providers.
**Recommendation**: Use a free subdomain provided by a host (e.g. `your-app.vercel.app` or `your-app.onrender.com`). Alternatively, purchase a low-cost `.com` or `.dev` from Cloudflare/Namecheap for ~$10/year.

## 2. Database: Neon (Free Serverless Postgres)
Instead of running a local Postgres instance, we use a cloud-hosted free instance.
1. Sign up at [Neon.tech](https://neon.tech/).
2. Create a new project. 
3. Copy the Postgres connection string.
4. Add `pgvector` extension via the Neon SQL editor: `CREATE EXTENSION IF NOT EXISTS vector;`

## 3. Backend Deployment: Render.com
Render provides a free tier for Node.js Web Services.
1. Sign up for [Render](https://render.com).
2. Click **New +** -> **Web Service**.
3. Connect your GitHub repository.
4. Set the Root Directory to `phase2-working/`.
5. Set Build Command: `npm install`
6. Set Start Command: `node server.js`
7. Add Environment Variables:
   - `DATABASE_URL`: The Neon connection string you copied.
   - `SESSION_SECRET`: A long, random string.
   - `CASPIAN_API_KEY`: (If you are using Caspian)
8. Deploy.

## 4. Frontend Deployment: Vercel (or Render)
The Vite frontend should be built and served as static files. Vercel is highly optimized for this.
1. Sign up for [Vercel](https://vercel.com).
2. Import your GitHub repository.
3. Set the Root Directory to `phase2-working/src/frontend`.
4. The Build Command should automatically detect `vite build` (or `npm run build`).
5. Set the Output Directory to `dist`.
6. Deploy.

### Frontend Security Note
By default, the Vite configuration is set to `sourcemap: false` and uses `terser` to drop console logs. This ensures that no source maps are generated in production, making it exceedingly difficult for anyone to reverse engineer the frontend codebase. All core AI logic remains secure on the Render backend.

## 5. Connecting Frontend to Backend
Once the backend is live on Render, copy its public URL (e.g., `https://my-backend.onrender.com`).
You must configure the Vercel frontend to point to this backend instead of `localhost`.
In your Vercel project settings, add an Environment Variable:
`VITE_API_URL` = `https://my-backend.onrender.com`
*(Note: You may need to update `api.js` in the frontend to use `import.meta.env.VITE_API_URL` if not already configured).*
