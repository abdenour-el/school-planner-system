import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Classes from './pages/Classes';
import Enseignants from './pages/Enseignants';
import Emploi from './pages/Emploi';

function App() {
  return (
    <Router>
      <div className="flex min-h-screen bg-gray-100 font-sans">
        
        <Sidebar />

        <div className="flex-1 p-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/classes" element={<Classes />} />
            <Route path="/enseignants" element={<Enseignants />} />
            <Route path="/emploi" element={<Emploi />} />
          </Routes>
        </div>

      </div>
    </Router>
  );
}

export default App;