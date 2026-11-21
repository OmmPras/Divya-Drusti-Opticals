# Divya Drusti Opticals — Optical Clinic Management System

Complete full-stack optical clinic & consultancy management application built with React, TypeScript, Tailwind CSS, Express.js, and SQLite.

## Key Features

- **100% Free Patient Registration (₹0)**: Auto-generated unique Patient IDs (`DDO-YYYY-XXXX`), DOB-to-Age calculation, optional photograph upload, medical history consent, and printable free registration slips.
- **Real-Time Admin Dashboard**: Live KPI metrics, searchable/filterable/paginated patient registry, and automatic instant updates via Server-Sent Events (SSE) + polling whenever Doctors or Receptionists register patients.
- **Role-Based Access Control (RBAC)**:
  - **Admin**: Full clinic oversight, create/approve/deactivate Doctor and Receptionist accounts, issue one-time password reset codes, manage products & medicines, view reports & audit logs, configure GST settings.
  - **Doctor / Optometrist**: Register free patients, perform OD/OS refraction examinations (`JetBrains Mono` diopter/axis grid), manage prescriptions & medicines, print eye exam reports.
  - **Receptionist**: Register free patients, print free registration slips, manage appointments, and create bills while confidential medical histories and refraction records remain strictly restricted.
- **Optical Products & Medicines Inventory**: Frames, lenses, eyeglasses, sunglasses, contact lenses, accessories, and eye medicines with live stock tracking and reorder alerts.
- **GST Billing & Invoices**: Line-item billing with automatic inventory stock deduction, configurable GST %, discounts, payment tracking, and printable tax invoices (Registration fee always ₹0.00).
- **Security & Cookie Consent**: `bcryptjs` password hashing, JWT sessions backed by a revocable server-side `sessions` table, `HttpOnly; Secure; SameSite=None; Partitioned` browser cookies, CSRF verification, rate limiting, and dedicated Privacy/Cookie consent settings.

## Installation & Local Run

```bash
npm install
cp .env.example .env
npm run dev
```

Open `http://localhost:3000`. On first run, claim the primary Clinic Admin account on the setup screen (or configure `ADMIN_BOOTSTRAP_PASSWORD` in `.env` before starting).

## Production Build & Deployment

```bash
npm run build
NODE_ENV=production npm start
```

## Android (Capacitor) Build Setup

1. Build the responsive web bundle: `npm run build`
2. Initialize Capacitor Android platform in a local Android SDK environment:
   ```bash
   npm install @capacitor/core @capacitor/cli @capacitor/android
   npx cap add android
   npx cap sync android
   npx cap open android
   ```
3. Configure `VITE_API_BASE_URL` or server origin to point to your deployed HTTPS backend. Native Capacitor clients use `X-Client-Platform: android` with in-memory `Authorization: Bearer` tokens (never `localStorage`).

## Verification & Testing

Run TypeScript validation and production build:
```bash
npm run lint
npm run build
```
