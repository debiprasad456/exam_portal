import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';

// Admin Pages
import AdminLogin from './pages/admin/Login';
import AdminLayout from './pages/admin/Layout';
import Dashboard from './pages/admin/Dashboard';
import Questions from './pages/admin/Questions';
import ExamControl from './pages/admin/ExamControl';
import Results from './pages/admin/Results';

// Candidate Pages
import Register from './pages/candidate/Register';
import Waiting from './pages/candidate/Waiting';
import ExamRoom from './pages/candidate/ExamRoom';
import ThankYou from './pages/candidate/ThankYou';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ── Candidate Routes ── */}
        <Route path="/" element={<Register />} />
        <Route path="/waiting" element={<Waiting />} />
        <Route path="/exam" element={<ExamRoom />} />
        <Route path="/thankyou" element={<ThankYou />} />

        {/* ── Admin Routes ── */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="questions" element={<Questions />} />
          <Route path="exam" element={<ExamControl />} />
          <Route path="results" element={<Results />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
