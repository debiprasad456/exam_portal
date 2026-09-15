# 🎓 Full-Stack Online Exam & Proctoring Portal

A real-time, high-concurrency, full-stack Online Examination and Proctoring System built with **React 18**, **Vite**, **Node.js**, **Express**, **MongoDB Atlas**, **Socket.io**, and **Tailwind CSS**.

Designed for educational institutions, university campus drives, corporate recruitment, and organizational assessments. The platform features an intuitive **Admin Control Center** for live exam administration and a robust **Candidate Portal** equipped with independent per-student timers, automatic evaluation, and instant official scorecard email delivery.

---

## 🚀 Live Production Deployment

| Component | Technology | Hosting | Production URL |
| :--- | :--- | :--- | :--- |
| **Frontend Client** | React 18 + Vite + Tailwind | Vercel | [https://candidate-examination-portal.vercel.app](https://candidate-examination-portal.vercel.app) |
| **Backend API & WebSockets** | Node.js + Express + Socket.IO | Render | [https://exam-portal-server-tliz.onrender.com](https://exam-portal-server-tliz.onrender.com) |
| **Database** | MongoDB Atlas Cloud Cluster | AWS | Managed Cloud Database |
| **Email Gateway** | Brevo HTTPS API (Port 443) / Nodemailer | Cloud / Local | Dual Engine (HTTPS REST + SMTP) |

---

## 🌟 Key Features & Updates

### 👑 Admin Control Center
- **Concurrent Multi-Subject Exams**: Admin can start and monitor independent live exam sessions across subjects:
  - 📈 **Marketing**
  - 🤝 **Human Resources (HR)**
  - 💻 **Digital Marketing**
  - 🧠 **General Reasoning**
- **Manual Exam Session Lifecycle**: Sessions stay live until explicitly concluded by the administrator, avoiding arbitrary server cutoffs.
- **Admin Password Recovery Flow (2-Step OTP)**:
  - Secure 6-digit numeric verification code generated and stored with a 15-minute TTL in MongoDB.
  - Automatic OTP dispatch to admin email with password reset modal directly in the login view.
- **Question Bank Management**:
  - Filter questions by subject.
  - Add, edit, and delete Multiple Choice Questions (MCQs).
  - Accurate question count validation and error handling.
- **Live Results & Leaderboard**:
  - **Ranked Descending Sort**: Top scorers automatically appear at the top.
  - **Date Range Filtering**: Filter candidate attempts by submission date and time.
  - **Comprehensive Candidate Metadata**: View candidate name, email, phone, residential address, subject, score, percentage, and submission timestamp.
  - **Cascading Deletion**: Delete individual candidate records and associated result records with a single click.
- **Live Real-Time Dashboard**: Visual score distribution cards, active candidate count, and WebSocket-driven session monitors.

---

### 📝 Candidate Exam Experience
- **Independent Per-Candidate Countdown Timers**: Every candidate receives their full exam duration (e.g. 30m / 60m) starting from the exact second they enter the exam room.
- **Candidate Registration**: Includes full name, email, phone number, subject selection, and physical address.
- **Unassigned Questions Safeguard**: Prevents candidates from taking exams without configured questions, displaying a clean return interface and purging orphan candidate records.
- **Auto-Submission Engine**: Automatically grades and saves candidate answers upon timer expiration or admin force-stop.
- **Instant Official Scorecard Email**: Sends a beautifully styled HTML exam result scorecard directly to the student's email inbox upon submission.
- **Mobile-Responsive Interface**: Fluid layout optimized for mobile screens, tablets, and desktop browsers.

---

### ✉️ Dual-Engine Email & Notification System
To solve cloud firewall restrictions (e.g., Render blocking outbound SMTP ports 25, 465, and 587):
1. **Cloud Production (Port 443 - HTTPS REST API)**:
   - **Brevo (Sendinblue)**: Native REST API integration over HTTPS port 443 (`BREVO_API_KEY`). Sends up to 300 emails/day to any recipient domain without port blocking or connection timeouts.
   - **Resend**: HTTPS REST API integration (`RESEND_API_KEY`).
2. **Local Development (SMTP Socket)**:
   - Automatic fallback to **Nodemailer SMTP** (Gmail / custom SMTP on Port 465/587) when running locally.
3. **Admin Email Diagnostics**:
   - In-app SMTP status probe (`GET /api/admin/email/status`).
   - One-click test email dispatcher (`POST /api/admin/email/test`).

---

### 🛡️ Concurrency, Networking & Security
- **High-Concurrency Campus Scaling**: Rate limiter configured to handle **10,000 requests per 15-minute window**, allowing 150+ students on a shared campus Wi-Fi/lab public IP without 429 rate-limit drops.
- **Dynamic CORS Origin Whitelisting**: Automatically validates `localhost`, all `*.vercel.app` preview and production deployments, and custom domains.
- **Proxy Trust (`trust proxy: 1`)**: Ensures accurate client IP tracking behind cloud reverse proxies (Render and Vercel).
- **MongoDB Connection Resilience**: Connection pool sizing (`maxPoolSize: 30`, `minPoolSize: 5`) with fallback public DNS resolvers (`8.8.8.8`, `1.1.1.1`) for SRV record lookup reliability.

---

## 🛠️ Tech Stack

### **Frontend (`client/`)**
- **Framework**: [React 18](https://react.dev/) + [Vite](https://vitejs.dev/)
- **State Management**: [Zustand](https://zustand-demo.pmnd.rs/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Real-Time Client**: `socket.io-client`
- **HTTP Client**: `axios`
- **Routing**: `react-router-dom` with SPA rewrites (`vercel.json`)
- **Icons & Visuals**: `lucide-react`, Custom high-res portal branding

### **Backend (`server/`)**
- **Runtime**: [Node.js](https://nodejs.org/) (v18+)
- **Framework**: [Express.js](https://expressjs.com/)
- **Database**: [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) via [Mongoose ODM](https://mongoosejs.com/)
- **Real-Time WebSockets**: [Socket.IO](https://socket.io/)
- **Authentication**: `jsonwebtoken` (JWT), `bcryptjs`
- **Email Delivery**: Brevo HTTPS API, Resend REST API, Nodemailer

---

## 📂 Project Structure

```text
exam_portal/
├── client/                     # Frontend React Application (Vite)
│   ├── public/                 # Static Assets (Logos, Icons)
│   ├── src/
│   │   ├── api/                # Axios API Client & Base Endpoints
│   │   ├── components/         # Reusable UI Components & Modals
│   │   ├── pages/              # Views
│   │   │   ├── admin/          # Dashboard, ExamControl, Questions, Results, Login
│   │   │   └── candidate/      # Register, WaitingRoom, ExamRoom, ThankYou
│   │   ├── socket/             # Socket.IO Client Configuration
│   │   └── stores/             # Zustand State Stores (exam, candidate, auth)
│   ├── vercel.json             # Vercel Single-Page Application (SPA) Rewrites
│   └── vite.config.js          # Vite Configuration
│
├── server/                     # Backend Express API & Socket Server
│   ├── models/                 # Mongoose Schemas (Admin, Candidate, ExamSession, Question, Result)
│   ├── routes/                 # Express Route Handlers (adminRoutes, authRoutes, candidateRoutes)
│   ├── services/               # Core Services (emailService.js - Brevo/Resend/SMTP)
│   ├── socket/                 # Socket.IO Event Handlers & Connection State
│   ├── server.js               # Express Server & Socket.IO Entry Point
│   ├── .env.example            # Environment Template with Brevo/SMTP keys
│   └── .env                    # Local Server Configuration
│
├── .gitignore                  # Git Ignore Rules
└── README.md                   # Project Documentation
```

---

## ⚙️ Environment Variables Reference

### Backend (`server/.env`)

```env
# Server Port & Allowed Client
PORT=5000
CLIENT_URL=http://localhost:5173

# Database Connection (MongoDB Atlas)
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/exam_portal?retryWrites=true&w=majority

# Security Secret
JWT_SECRET=your_super_secret_jwt_key_here

# -------------------------------------------------------------
# Email Configuration
# -------------------------------------------------------------
# Option A (Recommended for Cloud / Render): Brevo HTTPS API (Port 443)
# Free 300 emails/day to any recipient, no domain DNS needed.
BREVO_API_KEY=xkeysib-your_brevo_api_key_here

# Option B: Resend HTTPS API (Port 443)
# RESEND_API_KEY=re_your_api_key_here
# RESEND_FROM=onboarding@resend.dev

# Option C: Local Nodemailer SMTP (Gmail, SES)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_gmail_app_password
SMTP_FROM_NAME="Diverse Solutions Exam Portal"
SMTP_FROM_EMAIL=your_email@gmail.com
```

### Frontend (`client/.env`)

```env
# For Local Development:
VITE_SERVER_URL=http://localhost:5000

# For Production Deployment on Vercel:
# VITE_SERVER_URL=https://exam-portal-server-tliz.onrender.com
```

---

## 🚀 Local Development Setup

### Prerequisites
- **Node.js** (v18.0.0 or higher)
- **npm** (v9+)
- **MongoDB Atlas** database URI

### 1. Clone the Repository
```bash
git clone https://github.com/debiprasad456/exam_portal.git
cd exam_portal
```

### 2. Configure Backend
```bash
cd server
cp .env.example .env
# Edit .env with your MongoDB URI and Brevo / Gmail credentials
npm install
npm run dev
```
*Backend runs on `http://localhost:5000`.*

### 3. Configure Frontend
```bash
cd ../client
npm install
npm run dev
```
*Frontend runs on `http://localhost:5173`.*

---

## 🌐 Production Deployment Guide

### Backend on [Render](https://render.com)
1. Create a **Web Service** on Render connected to `debiprasad456/exam_portal`.
2. Set **Root Directory** to `server`.
3. Build Command: `npm install`
4. Start Command: `node server.js`
5. Under **Environment Variables**, configure:
   - `MONGO_URI`
   - `JWT_SECRET`
   - `CLIENT_URL` = `https://candidate-examination-portal.vercel.app`
   - `BREVO_API_KEY` = `xkeysib-...` *(Required on Render Free Tier to bypass SMTP port blocking)*
6. Deploy service.

### Frontend on [Vercel](https://vercel.com)
1. Import repository on Vercel and set **Root Directory** to `client`.
2. Framework Preset will auto-detect **Vite**.
3. Under **Environment Variables**, add:
   - `VITE_SERVER_URL` = `https://exam-portal-server-tliz.onrender.com`
4. Deploy project. `client/vercel.json` ensures full client-side SPA routing without 404s.

---

## 📡 API Endpoints Overview

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/setup` | Public | Initial admin account creation |
| `POST` | `/api/auth/login` | Public | Admin login & JWT generation |
| `POST` | `/api/auth/forgot-password` | Public | Generates 6-digit OTP and dispatches reset email |
| `POST` | `/api/auth/reset-password` | Public | Verifies 6-digit OTP and resets admin password |
| `GET` | `/api/auth/verify` | Admin | Validates existing JWT token |
| `GET` | `/api/admin/questions` | Admin | Retrieve questions (filterable by subject) |
| `POST` | `/api/admin/questions` | Admin | Create new question |
| `PUT` | `/api/admin/questions/:id` | Admin | Update existing question |
| `DELETE` | `/api/admin/questions/:id` | Admin | Delete question |
| `GET` | `/api/admin/exam/status` | Admin | Retrieve active exam sessions status |
| `POST` | `/api/admin/exam/start` | Admin | Start exam session for selected subjects |
| `POST` | `/api/admin/exam/stop` | Admin | Terminate active exam session |
| `GET` | `/api/admin/results` | Admin | Retrieve candidate results (filterable by subject/date) |
| `DELETE` | `/api/admin/results/:id` | Admin | Cascading delete candidate attempt and score |
| `GET` | `/api/admin/email/status` | Admin | Probe live email service / SMTP status |
| `POST` | `/api/admin/email/test` | Admin | Send verification test email to target address |
| `POST` | `/api/candidate/register` | Public | Register candidate & assign session |
| `GET` | `/api/candidate/questions/:subject` | Public | Fetch randomized exam questions |
| `POST` | `/api/candidate/submit` | Public | Submit exam answers, compute score, trigger email |

---

## 📜 License

This project is open-source and available under the [MIT License](LICENSE).