# Process Checklists — Setup Guide

## Prerequisites

- Node.js 20+
- MongoDB 7 (local or Atlas)
- npm

---

## Local Development (Quick Start)

### 1. Configure the backend

```bash
cd backend
cp .env.example .env
```

Edit `.env` and fill in required values:

```dotenv
# Generate with: openssl rand -hex 64
JWT_ACCESS_SECRET=<64-char hex>
JWT_REFRESH_SECRET=<64-char hex>

# Generate with: openssl rand -hex 32
FILE_ENC_KEY=<64-char hex>   # must be exactly 64 hex characters (32 bytes)

MONGO_URI=mongodb://127.0.0.1:27017/checklist_app
```

### 2. Install and run the backend

```bash
cd backend
npm install
npm run dev        # starts on http://localhost:4000
```

### 3. Install and run the frontend

```bash
cd frontend
npm install
npm run dev        # starts on http://localhost:5173
```

Open **http://localhost:5173** — register an account and start using the app.

---

## Production — Docker Compose

### 1. Create a `.env` file in the project root:

```dotenv
MONGO_USER=admin
MONGO_PASSWORD=<strong-password>
JWT_ACCESS_SECRET=<openssl rand -hex 64>
JWT_REFRESH_SECRET=<openssl rand -hex 64>
FILE_ENC_KEY=<openssl rand -hex 32>
CORS_ORIGIN=https://yourdomain.com
```

### 2. Start all services

```bash
docker compose --env-file .env up -d --build
```

The app will be available on port 80. Put an HTTPS reverse proxy (nginx, Caddy, Traefik) in front for TLS.

---

## Security Architecture

| Layer | Measure |
|---|---|
| **Auth** | JWT access tokens (15 min, memory-only) + httpOnly refresh tokens (7 days, rotated on use) |
| **Passwords** | bcrypt, rounds=12, min 10 chars + uppercase + number + symbol |
| **Brute force** | Account locked for 15 min after 5 failed logins |
| **Rate limiting** | 10 req/15 min on auth routes; 200 req/min globally |
| **Headers** | Helmet: CSP, X-Frame-Options DENY, HSTS (prod), nosniff |
| **CORS** | Strict origin whitelist, credentials allowed only for that origin |
| **Input** | express-validator on all routes; express-mongo-sanitize (NoSQL injection) |
| **Files** | MIME-type allowlist; size limit 20 MB; 10 files/request max; stored **AES-256-CBC encrypted** on disk, never in DB |
| **File access** | Authenticated-only download; files decrypted in-stream, never written unencrypted to disk |
| **MongoDB** | No direct exposure; internal Docker network only |
| **Tokens in DB** | Refresh tokens stored hashed with TTL index (auto-expire) |
| **Audit** | Winston structured logs: register, login, lock, file upload, delete |
| **Docker** | Non-root user in backend container; MongoDB not exposed to host |

---

## Project Structure

```
checklist-app/
├── backend/
│   ├── src/
│   │   ├── app.js              # Express entry point
│   │   ├── config/db.js        # MongoDB connection
│   │   ├── middleware/
│   │   │   ├── auth.js         # JWT verification
│   │   │   ├── upload.js       # Multer + type validation
│   │   │   └── validate.js     # express-validator helper
│   │   ├── models/             # Mongoose schemas
│   │   ├── routes/             # API routes
│   │   └── utils/
│   │       ├── crypto.js       # AES-256 file encryption
│   │       └── logger.js       # Winston
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── api/                # Axios API layer
│   │   ├── components/         # React components
│   │   ├── contexts/           # AuthContext (token in memory)
│   │   ├── data/templates.ts   # Checklist templates
│   │   ├── pages/              # LoginPage, AppPage
│   │   └── types/              # TypeScript interfaces
│   └── nginx.conf
└── docker-compose.yml
```
