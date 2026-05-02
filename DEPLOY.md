# Deployment Guide (Free Tier)

Stack: **Vercel** (frontend) + **Render** (backend) + **MongoDB Atlas** (database) + **Cloudinary** (file storage)

---

## 1. Cloudinary (file storage)

1. Sign up at [cloudinary.com](https://cloudinary.com) — the free tier gives you 25 GB storage and 25 GB bandwidth/month.
2. In your dashboard go to **Settings → API Keys** and copy your **API Environment variable** — it looks like:
   ```
   CLOUDINARY_URL=cloudinary://API_KEY:API_SECRET@CLOUD_NAME
   ```
3. You'll paste this into Render in step 2.

---

## 2. MongoDB Atlas (database)

You already have a cluster. Just make sure your Atlas cluster's **Network Access** allows connections from anywhere (`0.0.0.0/0`) so Render can connect.

---

## 3. Backend → Render

1. Push this repo to GitHub (if not already done).
2. Go to [render.com](https://render.com) → New → **Web Service**
3. Connect your GitHub repo.
4. Set:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance type**: Free
5. Add these **Environment Variables** in the Render dashboard:

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `MONGO_URI` | your Atlas connection string |
| `JWT_ACCESS_SECRET` | run `openssl rand -hex 64` |
| `JWT_REFRESH_SECRET` | run `openssl rand -hex 64` |
| `JWT_ACCESS_EXPIRY` | `15m` |
| `JWT_REFRESH_EXPIRY` | `7d` |
| `CLOUDINARY_URL` | from Cloudinary dashboard (step 1) |
| `BCRYPT_ROUNDS` | `12` |
| `CORS_ORIGIN` | your Vercel frontend URL (set after step 4) |

6. Deploy. Note your Render URL, e.g. `https://checklist-app-backend.onrender.com`

---

## 4. Frontend → Vercel

1. Go to [vercel.com](https://vercel.com) → New Project → import your GitHub repo.
2. Set **Root Directory** to `frontend`.
3. Add this **Environment Variable**:

| Key | Value |
|-----|-------|
| `VITE_API_BASE_URL` | your Render backend URL (from step 2) |

4. Deploy. Note your Vercel URL, e.g. `https://checklist-app.vercel.app`

5. Go back to Render → your backend service → Environment → update `CORS_ORIGIN` to your Vercel URL → redeploy.

---

## Important limitations on the free tier

- **Render free web services spin down after 15 minutes of inactivity** — the first request after idle takes ~30s to wake up.
- **File storage is persistent** — files are stored in Cloudinary and survive restarts and redeploys.
