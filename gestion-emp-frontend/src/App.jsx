import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Classes from './pages/Classes';
import Enseignants from './pages/Enseignants';
import Emploi from './pages/Emploi';
// Uncomment the line below if you still want to use the Utilisateurs page
// import Utilisateurs from './pages/Utilisateurs'; 

// ==========================================
// MAIN LAYOUT
// ==========================================
// This is the main wrapper that holds the Sidebar and the Content Area.
// Authentication has been removed, so this layout is public.
const MainLayout = () => {
  return (
    <div className="flex h-screen w-full bg-gray-50 font-sans overflow-hidden">
      {/* 1. Sidebar is always positioned on the left */}
      <Sidebar />
      
      {/* 2. Main content area for the pages (Dashboard, Classes, etc.) */}
      <div className="flex-1 h-screen overflow-y-auto relative">
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
        {/* MAIN ROUTES (Wrapped inside MainLayout)  */}
        {/* -------------------------------------- */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<Dashboard />} />
          
          <Route path="/classes" element={<Classes />} />
          <Route path="/matieres" element={<Classes />} /> 
          
          <Route path="/enseignants" element={<Enseignants />} />
          <Route path="/emploi" element={<Emploi />} />
          
          {/* <Route path="/utilisateurs" element={<Utilisateurs />} /> */}
        </Route>

        {/* -------------------------------------- */}
        {/* FALLBACK ROUTE (Security / Catch-all)  */}
        {/* -------------------------------------- */}
        {/* Redirect unknown routes or /login back to the Dashboard */}
        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>
    </Router>
  );
}