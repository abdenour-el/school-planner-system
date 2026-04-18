import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Login from './pages/Login'; //  Make sure the path to Login is correct!
import Dashboard from './pages/Dashboard';
import Classes from './pages/Classes';
// import Matieres from './pages/Matieres';
import Enseignants from './pages/Enseignants';
import Emploi from './pages/Emploi';
import Utilisateurs from './pages/Utilisateurs';

// ==========================================
// PROTECTED LAYOUT (The Bouncer & Wrapper)
// ==========================================
// This component wraps all private pages. 
// It checks for a token, and if valid, it shows the Sidebar and the requested page (<Outlet />).
const ProtectedLayout = () => {
  // 1. Check if the user has a token in localStorage
  const token = localStorage.getItem('auth_token');

  // 2. If no token, kick them back to the login page immediately
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // 3. If token exists, render the standard layout (Sidebar + Content Area)
  return (
    <div className="flex min-h-screen bg-gray-100 font-sans">
      <Sidebar />
      <div className="flex-1 p-8 h-screen overflow-y-auto">
        {/* <Outlet /> is a placeholder where the specific page (Dashboard, Classes, etc.) will render */}
        <Outlet />
      </div>
    </div>
  );
};

// ==========================================
// MAIN APP COMPONENT
// ==========================================
export default function App() {
  return (
    <Router>
      <Routes>
        
        {/* -------------------------------------- */}
        {/* 1. PUBLIC ROUTE (No Sidebar, No Token needed) */}
        {/* -------------------------------------- */}
        <Route path="/login" element={<Login />} />

        {/* -------------------------------------- */}
        {/* 2. PROTECTED ROUTES (Sidebar + Token required) */}
        {/* -------------------------------------- */}
        {/* Any route placed inside this wrapper will require authentication */}
        <Route element={<ProtectedLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/classes" element={<Classes />} />
          {/* Note: In your previous code, /matieres was pointing to <Classes />. 
              Make sure to change it to <Matieres /> if you have a separate component! */}
          <Route path="/matieres" element={<Classes />} /> 
          <Route path="/enseignants" element={<Enseignants />} />
          <Route path="/emploi" element={<Emploi />} />
          <Route path="/utilisateurs" element={<Utilisateurs />} />
        </Route>

        {/* -------------------------------------- */}
        {/* 3. FALLBACK ROUTE (Catch-all for wrong URLs) */}
        {/* -------------------------------------- */}
        {/* If user types a URL that doesn't exist, redirect them to Dashboard (which will then check for login) */}
        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>
    </Router>
  );
}