# FabricFlow

FabricFlow is a full-stack web application for garment production tracking and inventory management.

It helps teams monitor order progress through each manufacturing stage, track rejected quantities, manage inventory movements, and generate operational reports.

## Highlights
- Role-based authentication and access control (JWT)
- End-to-end production stage tracking
- SKU-level order progress visibility
- Inventory item and stock movement management
- Dashboard metrics and reporting APIs
- Excel export for reporting

## Tech Stack
- **Frontend:** React 18, React Router, Axios, Chart.js
- **Backend:** Node.js, Express
- **Database:** PostgreSQL
- **Auth:** JWT
- **Deployment:** Railway

## Repository Structure
```text
fabricflow/
├── backend/
│   ├── db/
│   ├── middleware/
│   ├── routes/
│   ├── server.js
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── .env.example
└── README.md
```

## Prerequisites
- Node.js 18+
- npm 9+
- PostgreSQL 14+

## Local Development Setup

### 1) Clone repository
```bash
git clone https://github.com/harineasht-ec25/fabricflow.git
cd fabricflow
```

### 2) Backend setup
```bash
cd backend
npm install
cp .env.example .env
```

Update `.env` with your database and auth settings.

Start backend:
```bash
npm run dev
```

By default backend runs on:
- `http://localhost:5000`

### 3) Frontend setup
Open a new terminal:
```bash
cd frontend
npm install
cp .env.example .env
```

Set API base URL in frontend `.env`:
```env
REACT_APP_API_URL=http://localhost:5000/api
```

Start frontend:
```bash
npm start
```

By default frontend runs on:
- `http://localhost:3000`

## Environment Variables

### Backend (`backend/.env`)
Minimum variables:
```env
DATABASE_URL=postgres://<user>:<password>@<host>:<port>/<database>
JWT_SECRET=replace_with_a_secure_random_secret
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
PORT=5000
```

### Frontend (`frontend/.env`)
```env
REACT_APP_API_URL=http://localhost:5000/api
```

## Production Stage Flow
1. Cutting
2. Stitching
3. Button Attachment
4. Checking & Trimming
5. Ironing
6. Finished Stock

Each stage can record:
- Received quantity
- Completed quantity
- Rejected quantity
- Operator and timestamp

## Default Admin Access
If seed data is enabled, default credentials may exist:
- Email: `admin@fabricflow.com`
- Password: `admin123`

Change default credentials immediately after first login.

## API Overview
Base URL: `/api`

### Auth
- `POST /auth/login`
- `GET /auth/me`
- `POST /auth/users`
- `GET /auth/users`
- `PUT /auth/users/:id`

### Orders
- `GET /orders`
- `GET /orders/:skuId`
- `POST /orders`
- `PUT /orders/:id`
- `GET /orders/meta/dashboard`

### Stages
- `POST /stages`
- `POST /stages/:id/complete`
- `GET /stages/stage/:name`

### Reports
- `GET /reports/daily`
- `GET /reports/monthly`
- `GET /reports/sku`
- `GET /reports/customer`
- `GET /reports/export/excel`

### Inventory
- `GET /inventory`
- `POST /inventory`
- `POST /inventory/:id/movement`
- `GET /inventory/movements`

### Notifications
- `GET /notifications`
- `PUT /notifications/:id/read`
- `PUT /notifications/read-all`

## Deployment (Railway)
Both backend and frontend can be deployed as separate services with root directories:
- `/backend`
- `/frontend`

Set production variables appropriately:
- Backend `FRONTEND_URL` should point to deployed frontend URL
- Frontend `REACT_APP_API_URL` should point to deployed backend `/api`

## Documentation Files
- [Contributing Guide](./CONTRIBUTING.md)
- [Code of Conduct](./CODE_OF_CONDUCT.md)
- [Security Policy](./SECURITY.md)
- [Changelog](./CHANGELOG.md)
- [License](./LICENSE)
