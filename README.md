# 🎓 Full-Stack Online Exam & Proctoring Portal

A real-time, secure, full-stack Online Examination and Proctoring System built with **React**, **Node.js**, **Express**, **MongoDB**, **Socket.io**, and **Tailwind CSS**.

Designed for educational institutions and organization testing, this platform features an intuitive **Admin Control Center** for live exam administration and a robust **Candidate Exam Interface** complete with real-time timer sync and anti-cheating tab-proctoring.

---

## 🌟 Key Features

### 🛡️ Admin Dashboard & Management
- **Live Exam Control Center**: Real-time control to **Start**, **Pause**, **Resume**, and **Force End** active exam sessions for all candidates instantly via WebSockets.
- **Real-Time Proctoring & Candidate Tracker**: Live dashboard displaying candidate connection states (*Not Started*, *In Progress*, *Submitted*, *Auto-Submitted*, *Disconnected*) and live tab-switch warning counters.
- **Exam & Question Bank Management**:
  - Create and configure exams (duration, passing percentage, total marks, scheduled time).
  - Add and edit Multiple Choice Questions (MCQs), descriptive questions, and code snippet prompts.
- **Candidate Management**: Single candidate enrollment and bulk CSV candidate import support.
- **Analytics & Results**: Automatic evaluation of objective questions, candidate score breakdown, accuracy statistics, and result export capabilities.

### 📝 Candidate Exam Interface
- **Secure Authentication**: Candidate login using assigned credentials.
- **Synchronized Countdown Timer**: Real-time server-synced countdown timer with automatic fallback.
- **Interactive Question Palette**: Easily navigate between questions, track answered/unanswered states, and mark questions for review.
- **Anti-Cheating Proctoring**:
  - Active detection of browser tab switches and window blur events.
  - Visual warnings to candidates upon policy violation.
  - Configurable automatic exam submission on repeated tab-switching violations or timer expiration.
- **Auto-Save & Instant Submission**: Automatic response saving and instant score calculation for objective sections.

---

## 🛠️ Tech Stack

### **Frontend**
- **Framework**: [React 18](https://react.dev/) + [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Real-Time WebSockets**: `socket.io-client`
- **HTTP Client**: `axios`
- **Routing**: `react-router-dom`

### **Backend**
- **Runtime**: [Node.js](https://nodejs.org/)
- **Framework**: [Express.js](https://expressjs.com/)
- **Database**: [MongoDB](https://www.mongodb.com/) (Mongoose ODM)
- **WebSockets**: `socket.io`
- **Security & Auth**: `jsonwebtoken` (JWT), `bcryptjs`
- **File Parsing**: `csv-parser` / `multer` (for candidate CSV imports)

---

## 📂 Project Structure

```text
exam_portal/
├── client/                   # Frontend React Application (Vite)
│   ├── public/               # Static Assets
│   ├── src/
│   │   ├── components/       # Reusable UI Components (Navbar, Timer, Modal, etc.)
│   │   ├── context/          # React Context (Auth, Exam State, Socket)
│   │   ├── pages/            # Page Views (Admin Dashboard, Exam Room, Login, etc.)
│   │   │   ├── admin/        # Admin Views (Control, Questions, Candidates, Results)
│   │   │   └── candidate/    # Candidate Views (Dashboard, Exam Interface, Result)
│   │   ├── utils/            # Helper functions & API instances
│   │   ├── App.jsx           # Main App Routes & Layout
│   │   └── main.jsx          # Entry point
│   ├── .env.example          # Client Environment Variables Template
│   ├── tailwind.config.js    # Tailwind CSS Configuration
│   └── vite.config.js        # Vite Configuration
│
├── server/                   # Backend Express API & Socket Server
│   ├── middleware/           # Auth & Error Handling Middlewares
│   ├── models/               # MongoDB Mongoose Schemas (User, Exam, Question, Result)
│   ├── routes/               # API Route Handlers (Auth, Admin, Candidate, Exam)
│   ├── socket/               # Real-Time Socket.io Event Handlers
│   ├── server.js             # Express & Socket Server Entry Point
│   └── .env.example          # Server Environment Variables Template
│
├── .gitignore                # Root Git Ignore File
└── README.md                 # Project Documentation
```

---

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed on your machine:
- **Node.js** (v18.0.0 or higher recommended)
- **npm** or **yarn** / **pnpm**
- **MongoDB** instance (Local MongoDB server or [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) connection URI)

---

### 📥 1. Installation

Clone the repository to your local machine:
```bash
git clone https://github.com/your-username/exam_portal.git
cd exam_portal
```

---

### ⚙️ 2. Environment Setup

#### **Backend (`server/`) Setup**
1. Navigate to the `server` directory:
   ```bash
   cd server
   ```
2. Create a `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```
3. Update `.env` with your actual MongoDB connection string and JWT secret key:
   ```env
   PORT=5000
   MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/exam_portal?retryWrites=true&w=majority
   JWT_SECRET=your-secure-jwt-secret-key
   CLIENT_URL=http://localhost:5173
   ```

#### **Frontend (`client/`) Setup**
1. Navigate to the `client` directory:
   ```bash
   cd ../client
   ```
2. Create a `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```
3. Update `.env` with your backend server URL:
   ```env
   VITE_SERVER_URL=http://localhost:5000
   ```

---

### 📦 3. Install Dependencies

#### Install Backend Dependencies:
```bash
cd server
npm install
```

#### Install Frontend Dependencies:
```bash
cd ../client
npm install
```

---

### 🏃‍♂️ 4. Running the Application

#### Start Backend Server:
```bash
cd server
npm start
# or for development with nodemon:
npm run dev
```
*The server will run on `http://localhost:5000`.*

#### Start Frontend Client:
```bash
cd client
npm run dev
```
*The client will run on `http://localhost:5173`.*

---

## 🔐 Security Best Practices

- **Never commit `.env` files** containing database passwords, secret keys, or private URIs.
- Use `.env.example` templates to document required variables safely.
- All candidate passkeys and admin passwords are encrypted using `bcryptjs`.
- Session access is protected via `JWT` authentication headers.

---

## 📜 License

This project is open-source and available under the [MIT License](LICENSE).