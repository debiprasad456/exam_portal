# 🎓 Full-Stack Online Exam & Proctoring Portal

A real-time, secure, full-stack Online Examination and Proctoring System built with **React 18**, **Vite**, **Node.js**, **Express**, **MongoDB Atlas**, **Socket.io**, and **Tailwind CSS**.

Designed for educational institutions, corporate hiring, and organizational assessments, this platform features an intuitive **Admin Control Center** for real-time exam management and a seamless **Candidate Interface** with individual candidate countdown timers, automatic evaluation, and live proctoring.

---

## 🚀 Live Demo & Production Architecture

| Service | Technology | Live URL |
| :--- | :--- | :--- |
| **Frontend Client** | React 18 + Vite (Vercel) | [https://candidate-examination-portal.vercel.app](https://candidate-examination-portal.vercel.app) |
| **Backend API & WebSockets** | Node.js + Express + Socket.IO (Render) | [https://exam-portal-server-tliz.onrender.com](https://exam-portal-server-tliz.onrender.com) |
| **Database** | MongoDB Atlas Cloud | Managed Cloud Cluster |

---

## 🌟 Key Features

### 👑 Admin Control Center
- **Concurrent Multi-Exam Management**: Start independent live exam sessions for multiple subjects concurrently (Marketing, HR, Digital Marketing, General Reasoning).
- **Manual Exam Session Lifecycle**: Admin exam sessions stay active until explicitly terminated via **Stop Exam**, allowing candidate attempts to proceed without artificial server cutoffs.
- **Question Bank Management**: Filter, add, edit, and delete Multiple Choice Questions (MCQs) per subject.
- **Results Management & Record Deletion**:
  - Auto-scored candidate performance breakdown.
  - Cascading deletion of individual result records and associated candidate documents directly from MongoDB.
- **Live Real-Time Dashboard**: Visual score distribution charts, total candidate metrics, and active session indicators via WebSockets.
- **Enhanced Security**: Auth role toggle switch and password show/hide eye control on admin login/setup screens.

### 📝 Candidate Exam Portal
- **Supported Exam Subjects**:
  - 📈 **Marketing**
  - 🤝 **Human Resources (HR)**
  - 💻 **Digital Marketing**
  - 🧠 **General Reasoning**
- **Independent Per-Candidate Timers**: Every candidate gets their full allocated exam duration (e.g., 30m / 60m) starting from the exact moment they enter the exam room.
- **Auto-Submission Engine**: Automatic submission upon time expiry or when force-ended by admin.
- **Unassigned Questions Handling**: Graceful validation prevents candidates from taking exams without assigned questions, displaying a clean return interface (**← Back to Candidate Login**) and automatically cleaning up draft candidate records from database.
- **Real-Time Waiting Room**: Automatic transition into the active exam room as soon as admin starts the exam session.

---

## 🛠️ Tech Stack

### **Frontend (`client/`)**
- **Framework**: [React 18](https://react.dev/) + [Vite](https://vitejs.dev/)
- **State Management**: [Zustand](https://zustand-demo.pmnd.rs/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Real-Time WebSockets**: `socket.io-client`
- **HTTP Client**: `axios`
- **Routing**: `react-router-dom` with `vercel.json` SPA rewrites

### **Backend (`server/`)**
- **Runtime**: [Node.js](https://nodejs.org/)
- **Framework**: [Express.js](https://expressjs.com/)
- **Database**: [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) (Mongoose ODM)
- **WebSockets**: `socket.io` (Real-time event broadcasting)
- **Security & Auth**: `jsonwebtoken` (JWT), `bcryptjs`, dynamic CORS credentials handling

---

## 📂 Project Structure

```text
exam_portal/
├── client/                   # Frontend React Application (Vite)
│   ├── public/               # Static Assets
│   ├── src/
│   │   ├── api/              # Axios API Client & Base Configuration
│   │   ├── components/       # Reusable Components (Role Toggle, Modals, Badges)
│   │   ├── pages/            # Page Views
│   │   │   ├── admin/        # Admin Views (Dashboard, ExamControl, Questions, Results, Login)
│   │   │   └── candidate/    # Candidate Views (Register, Waiting, ExamRoom, ThankYou)
│   │   ├── socket/           # Client Socket.IO Initialization
│   │   └── stores/           # Zustand Global State Stores (examStore, candidateStore, authStore)
│   ├── vercel.json           # Vercel Single-Page Application (SPA) Rewrite Config
│   └── vite.config.js        # Vite Config
│
├── server/                   # Backend Express API & Socket Server
│   ├── models/               # MongoDB Mongoose Schemas (Candidate, ExamSession, Question, Result)
│   ├── routes/               # API Route Handlers (authRoutes, adminRoutes, candidateRoutes)
│   ├── socket/               # Real-Time Socket Server Event Handlers
│   ├── server.js             # Express & WebSockets Entry Point
│   └── .env.example          # Backend Environment Variables Template
│
├── .gitignore                # Git Ignore Configuration
└── README.md                 # Project Documentation
```

---

## 🚀 Local Development Setup

### Prerequisites
- **Node.js** (v18.0.0 or higher)
- **npm** or **yarn**
- **MongoDB** instance (Local MongoDB or MongoDB Atlas URI)

---

### 📥 1. Installation

Clone the repository:
```bash
git clone https://github.com/debiprasad456/exam_portal.git
cd exam_portal
```

---

### ⚙️ 2. Environment Configuration

#### **Backend (`server/`)**
Navigate to `server/` and create `.env`:
```bash
cd server
```
Create `.env` file:
```env
PORT=5000
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/exam_portal?retryWrites=true&w=majority
JWT_SECRET=your_super_secret_jwt_key
CLIENT_URL=http://localhost:5173
```

#### **Frontend (`client/`)**
Navigate to `client/` and create `.env`:
```bash
cd ../client
```
Create `.env` file:
```env
VITE_SERVER_URL=http://localhost:5000
```

---

### 📦 3. Install Dependencies & Run

#### Run Backend Server:
```bash
cd server
npm install
npm run dev
```
*Server will start on `http://localhost:5000`.*

#### Run Frontend Client:
```bash
cd client
npm install
npm run dev
```
*Client will start on `http://localhost:5173`.*

---

## 🌐 Production Deployment Guide

### Backend (Deployed on Render)
1. Create a **Web Service** on Render pointing to repository root directory: `server`.
2. Set Build Command: `npm install` and Start Command: `npm start`.
3. Configure Environment Variables: `MONGO_URI`, `JWT_SECRET`, `CLIENT_URL`.

### Frontend (Deployed on Vercel)
1. Import repository on Vercel and set Root Directory to `client`.
2. Framework Preset will auto-select **Vite**.
3. Configure Environment Variable: `VITE_SERVER_URL = https://exam-portal-server-tliz.onrender.com`.
4. Vercel automatically utilizes `client/vercel.json` for seamless SPA route navigation.

---

## 📜 License

This project is open-source and available under the [MIT License](LICENSE).