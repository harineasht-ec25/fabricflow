# FabricFlow — Garment Production Tracker

A full-stack web application for tracking T-shirt manufacturing from fabric cutting to finished stock.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, React Router, Chart.js, Axios |
| Backend | Node.js, Express |
| Database | PostgreSQL (Railway managed) |
| Auth | JWT with role-based access |
| Hosting | Railway (free tier available) |
| Export | ExcelJS |

---

## Project Structure

```
fabricflow/
├── backend/
│   ├── db/index.js          # DB connection + schema init + seed data
│   ├── middleware/auth.js   # JWT auth middleware
│   ├── routes/
│   │   ├── auth.js          # Login, user management
│   │   ├── orders.js        # Orders CRUD + dashboard
│   │   ├── stages.js        # Stage entries + completion
│   │   └── misc.js          # Inventory, reports, notifications
│   ├── server.js            # Express app entry point
│   ├── railway.toml         # Railway deployment config
│   └── package.json
└── frontend/
    ├── src/
    │   ├── context/AuthContext.jsx
    │   ├── components/Layout.jsx
    │   ├── pages/
    │   │   ├── Login.jsx
    │   │   ├── Dashboard.jsx
    │   │   ├── Orders.jsx
    │   │   ├── SKUTracking.jsx
    │   │   ├── StagePage.jsx     # Reused for all 6 stages
    │   │   ├── Inventory.jsx
    │   │   ├── Reports.jsx
    │   │   ├── Notifications.jsx
    │   │   └── Users.jsx
    │   ├── api.js
    │   ├── App.jsx
    │   └── index.js
    ├── public/index.html
    ├── railway.toml
    └── package.json
```

---

## Deploy to Railway — Step by Step

### Step 1: Create Railway account
Go to https://railway.app and sign up (free).

### Step 2: Deploy the Backend

1. Go to https://railway.app/new
2. Click **"Deploy from GitHub repo"**
   - Push your `backend/` folder to a GitHub repo first
   - OR use **"Empty project"** → **"Add service"** → **"GitHub repo"**
3. Set the **root directory** to `/backend`
4. Railway auto-detects Node.js and runs `npm start`

**Add environment variables** (Settings → Variables):
```
DATABASE_URL        = (auto-filled when you add PostgreSQL)
JWT_SECRET          = any-long-random-string-here-make-it-secure
NODE_ENV            = production
FRONTEND_URL        = https://your-frontend.railway.app
PORT                = 5000
```

### Step 3: Add PostgreSQL Database

1. In your Railway project, click **"+ New"** → **"Database"** → **"PostgreSQL"**
2. Railway automatically sets `DATABASE_URL` in your backend service
3. The app auto-creates all tables and seed data on first boot

### Step 4: Deploy the Frontend

1. In the same Railway project, click **"+ New"** → **"GitHub repo"**
2. Set root directory to `/frontend`
3. Railway runs `npm run build` automatically

**Add environment variable:**
```
REACT_APP_API_URL = https://your-backend.railway.app/api
```

### Step 5: Get your URLs

Railway gives each service a public URL like:
- Backend: `https://fabricflow-backend-production.railway.app`
- Frontend: `https://fabricflow-frontend-production.railway.app`

Update `FRONTEND_URL` in backend env with the frontend URL.

---

## Default Login

```
Email:    admin@fabricflow.com
Password: admin123
```

**Change this immediately after first login via Users page!**

---

## User Roles & Access

| Role | Access |
|---|---|
| admin | Everything |
| production_manager | Dashboard, Orders, SKU, All stages, Reports |
| cutting_operator | Cutting stage only |
| stitching_operator | Stitching stage only |
| button_operator | Button attachment only |
| checking_operator | Checking & trimming only |
| ironing_operator | Ironing only |
| store_manager | Finished stock + Inventory |

---

## API Endpoints

### Auth
```
POST   /api/auth/login          Login
GET    /api/auth/me             Current user
POST   /api/auth/users          Create user (admin)
GET    /api/auth/users          List users
PUT    /api/auth/users/:id      Update user
```

### Orders
```
GET    /api/orders              List orders (with filters)
GET    /api/orders/:skuId       Get order + stage history
POST   /api/orders              Create order
PUT    /api/orders/:id          Update order
GET    /api/orders/meta/dashboard  Dashboard stats
```

### Stages
```
POST   /api/stages              Submit stage entry
POST   /api/stages/:id/complete Mark complete + advance
GET    /api/stages/stage/:name  Get entries by stage
```

### Reports
```
GET    /api/reports/daily       Daily production report
GET    /api/reports/monthly     Monthly trend
GET    /api/reports/sku         SKU-wise report
GET    /api/reports/customer    Customer-wise report
GET    /api/reports/export/excel  Download Excel
```

### Inventory
```
GET    /api/inventory           List all items
POST   /api/inventory           Add item
POST   /api/inventory/:id/movement  Record movement
GET    /api/inventory/movements Movement log
```

### Notifications
```
GET    /api/notifications       List all
PUT    /api/notifications/:id/read   Mark read
PUT    /api/notifications/read-all   Mark all read
```

---

## Run Locally

### Backend
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your PostgreSQL connection string
node server.js
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env
# Edit .env: REACT_APP_API_URL=http://localhost:5000/api
npm start
```

---

## Automatic Notifications

The system auto-creates notifications for:
- ✅ Stage completed → batch moves to next stage
- 🚨 Rejection > 5% → immediate alert
- ⚠️ Order delayed → due date passed
- 📦 Low stock → inventory below minimum
- 📋 New order created

---

## Production Stages Flow

```
Cutting → Stitching → Button Attachment → Checking & Trimming → Ironing → Finished Stock
```

Each stage entry records:
- Quantity received from previous stage
- Quantity completed at this stage
- Quantity rejected / damaged
- Operator who processed it
- Timestamp

Marking a stage complete automatically advances the SKU to the next stage.
