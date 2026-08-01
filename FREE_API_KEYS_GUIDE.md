# 🎁 FREE API Keys Guide for Thought GPS

**Project**: Thought GPS - Multi-channel AI Agent  
**Purpose**: Get all required API keys for FREE to run your application  
**Last Updated**: August 2, 2026

---

## 📋 Overview

All Phase 2 multimodal services can be used **completely FREE** with generous free tiers. This guide shows you how to get each API key.

**Total Free Credits Available**: $355+ in free API credits!

---

## 🎤 1. AssemblyAI - Speech-to-Text (FREE $50 Credits)

**What you get**:
- $50 FREE credits (no credit card required)
- ~333 hours of audio transcription
- High fidelity transcription
- 85+ languages supported
- Speaker diarization

**How to get your FREE API key**:

1. Visit: https://www.assemblyai.com/
2. Click "Start Building for Free"
3. Sign up with email (no credit card needed)
4. Go to Dashboard → API Keys
5. Copy your API key
6. Add to `.env`:
   ```
   ASSEMBLYAI_API_KEY=your_key_here
   ```

**Pricing after free tier**: $0.15/hour of audio

**Why AssemblyAI?**
- ✅ Works on Vercel/Netlify/Render (serverless-friendly)
- ✅ No server required
- ✅ Commercial license included
- ✅ Better accuracy than Google Speech-to-Text
- ✅ Works for all users of your app

**Alternative**: Google Cloud Speech-to-Text ($300 free credits for new accounts)

---

## 🖼️ 2. Anthropic Claude Vision - Image Analysis (FREE $5 Credits)

**What you get**:
- $5 FREE credits (no credit card required)
- ~3,300 image analyses
- Claude 3.5 Sonnet Vision
- OCR text extraction
- Object detection
- Scene understanding

**How to get your FREE API key**:

1. Visit: https://console.anthropic.com/
2. Click "Sign Up"
3. Verify email (no credit card needed)
4. Go to API Keys → Create Key
5. Copy your API key
6. Add to `.env`:
   ```
   ANTHROPIC_API_KEY=your_key_here
   ```

**Pricing after free tier**: $1.50 per million tokens (~1000 images)

**Why Claude Vision?**
- ✅ Best-in-class image understanding
- ✅ Natural language descriptions
- ✅ OCR built-in
- ✅ Works on serverless platforms

**Alternative**: Google Cloud Vision ($300 free credits)

---

## 🔢 3. OpenAI Embeddings - Semantic Search (FREE $5 Credits)

**What you get**:
- $5 FREE credits (no credit card required)
- ~250 million tokens
- 1536-dimensional embeddings
- Semantic similarity search
- Batch processing support

**How to get your FREE API key**:

1. Visit: https://platform.openai.com/
2. Click "Sign Up"
3. Verify phone number (no credit card needed)
4. Go to API Keys → Create new secret key
5. Copy your API key
6. Add to `.env`:
   ```
   OPENAI_API_KEY=your_key_here
   ```

**Pricing after free tier**: $0.02 per million tokens

**Why OpenAI Embeddings?**
- ✅ Industry-standard quality
- ✅ Fast generation
- ✅ Great for semantic search
- ✅ Works with pgvector

**Alternative**: Cohere Embeddings (free tier available)

---

## 🗄️ 4. PostgreSQL with pgvector - Vector Database (FREE)

**What you get**:
- Completely FREE (self-hosted)
- Vector similarity search
- Works with embeddings
- No API key needed

**Free Hosting Options**:

### Option A: Neon (Recommended for Vercel)
1. Visit: https://neon.tech/
2. Sign up (FREE tier: 0.5GB storage)
3. Create a database
4. Copy connection string
5. Add to `.env`:
   ```
   DATABASE_URL=postgresql://...
   ```

### Option B: Supabase (FREE tier)
1. Visit: https://supabase.com/
2. Sign up (FREE tier: 500MB database)
3. Enable pgvector extension
4. Copy connection string

### Option C: Railway (FREE tier)
1. Visit: https://railway.app/
2. Sign up (FREE tier: $5/month credits)
3. Deploy PostgreSQL with pgvector

**Why pgvector?**
- ✅ No additional cost
- ✅ Native PostgreSQL extension
- ✅ Fast similarity search
- ✅ Works with all embeddings

---

## 🚀 5. Hosting Platforms (FREE Tiers)

### Vercel (Recommended for Frontend + Serverless)
- **FREE tier**: 
  - 100GB bandwidth/month
  - Unlimited API routes
  - Serverless functions
- **Limits**: 10 second timeout (up to 60s with Pro)
- **Sign up**: https://vercel.com/

### Netlify (Alternative)
- **FREE tier**:
  - 100GB bandwidth/month
  - 125k serverless function calls/month
  - 10 second timeout
- **Sign up**: https://netlify.com/

### Render (Best for Backend + Database)
- **FREE tier**:
  - 750 hours/month
  - PostgreSQL database
  - Background workers
- **Limits**: Service sleeps after 15 min inactivity
- **Sign up**: https://render.com/

### Railway (Best for Full Stack)
- **FREE tier**: $5/month in credits
- **Features**: PostgreSQL, Redis, Background workers
- **Sign up**: https://railway.app/

---

## 📊 Cost Summary

| Service | Free Credits | Duration | Cost After Free |
|---------|--------------|----------|-----------------|
| AssemblyAI (Speech) | $50 | ~333 hours | $0.15/hour |
| Anthropic (Vision) | $5 | ~3,300 images | $1.50/1000 images |
| OpenAI (Embeddings) | $5 | ~250M tokens | $0.02/M tokens |
| Database (Neon) | 0.5GB | Forever | $0/month |
| Hosting (Vercel) | 100GB | Monthly | $0/month |
| **TOTAL** | **$60+** | **Months of usage** | **Pay as you go** |

---

## ✅ Quick Setup Checklist

- [ ] AssemblyAI API key - https://www.assemblyai.com/
- [ ] Anthropic API key - https://console.anthropic.com/
- [ ] OpenAI API key - https://platform.openai.com/
- [ ] Neon database - https://neon.tech/
- [ ] Vercel account - https://vercel.com/

**Total time to setup**: ~15 minutes

---

## 🔒 Security Best Practices

1. **Never commit API keys** to Git
2. Use `.env.local` for local development
3. Use Vercel Environment Variables for production
4. Rotate keys if compromised
5. Monitor usage in each dashboard

---

## 🎯 Usage Estimates

For a typical app with 100 users:

- **Voice notes**: 100 notes/day × 2 min = 200 min/day
  - AssemblyAI cost: $0.15/hour × 3.3 hours = $0.50/day
  - **Free tier covers**: 50 days with $50 credits

- **Image uploads**: 50 images/day
  - Claude Vision cost: ~$0.075/day
  - **Free tier covers**: 66 days with $5 credits

- **Embeddings**: 1000 texts/day × 100 tokens = 100k tokens/day
  - OpenAI cost: $0.002/day
  - **Free tier covers**: 2,500 days with $5 credits

**Result**: Free tier covers **2-3 months** of active usage!

---

## 🆘 Troubleshooting

### AssemblyAI Error: "Invalid API Key"
- Make sure you copied the entire key
- Check for extra spaces in `.env` file
- Verify your account is active

### Database Connection Error
- Check DATABASE_URL format: `postgresql://user:pass@host:5432/db`
- Ensure pgvector extension is installed
- Test connection with `psql $DATABASE_URL`

### Vercel Timeout Error
- Serverless functions have 10s timeout on free tier
- Upgrade to Pro for 60s timeout
- Or move to Render/Railway for longer processes

---

## 📚 Additional Resources

- [AssemblyAI Documentation](https://www.assemblyai.com/docs)
- [Anthropic Claude Documentation](https://docs.anthropic.com/)
- [OpenAI Embeddings Guide](https://platform.openai.com/docs/guides/embeddings)
- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [Vercel Deployment Guide](https://vercel.com/docs)

---

**Need help?** Check the main documentation:
- `PHASE_2_IMPLEMENTATION_GUIDE.md` - Implementation details
- `BUILD_PHASES_STATUS.md` - Overall project status
- `00_START_HERE.md` - Getting started guide

---

**Total Free Value**: $355+ in API credits + free hosting! 🎉
