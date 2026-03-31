import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function Sidebar() {
  // =========================================================================
  // STATE TO MANAGE SIDEBAR TOGGLE (OPEN / CLOSED)
  // =========================================================================
  const [isOpen, setIsOpen] = useState(true);
  const location = useLocation();

  // =========================================================================
  // NAVIGATION MENU DATA
  // =========================================================================
  const navLinks = [
    { path: '/', label: 'Tableau de bord', icon: '🏠' },
    { path: '/classes', label: 'Configuration', icon: '⚙️' },
    { path: '/enseignants', label: 'Enseignants', icon: '👨‍🏫' },
  ];

  return (
    // 🔥 NEW: 'sticky top-0 h-screen' makes it stay on the screen while scrolling
    <aside 
      className={`sticky top-0 h-screen bg-[#0B1120] border-r border-slate-800 flex flex-col transition-all duration-300 ease-in-out shadow-2xl z-50 ${
        isOpen ? 'w-64' : 'w-20'
      }`}
    >
      {/* ===================================================================== */}
      {/* 1. MODERN FLOATING TOGGLE BUTTON                                      */}
      {/* ===================================================================== */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="absolute -right-3.5 top-9 bg-slate-800 hover:bg-blue-600 w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] shadow-lg border border-slate-600 hover:border-blue-400 transition-all z-50 focus:outline-none"
        title={isOpen ? "Réduire" : "Agrandir"}
      >
        {isOpen ? '◀' : '▶'}
      </button>

      {/* ===================================================================== */}
      {/* 2. BRANDING / LOGO AREA                                               */}
      {/* ===================================================================== */}
      <div className="h-24 flex items-center justify-center border-b border-slate-800/50 overflow-hidden px-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-900/50 shrink-0">
            <span className="text-xl">🏫</span>
          </div>
          {isOpen && (
            <h2 className="font-black text-white tracking-tight whitespace-nowrap text-xl">
              School<span className="text-blue-500">Admin</span>
            </h2>
          )}
        </div>
      </div>
      
      {/* ===================================================================== */}
      {/* 3. NAVIGATION LINKS                                                   */}
      {/* ===================================================================== */}
      <nav className="flex-1 py-6 px-2 space-y-2 overflow-y-auto no-scrollbar">
        {navLinks.map((link) => {
          const isActive = location.pathname === link.path;
          return (
            <Link 
              key={link.path}
              to={link.path} 
              title={!isOpen ? link.label : ""}
              className={`relative flex items-center gap-4 px-3 py-3.5 rounded-lg transition-all duration-200 group ${
                isActive 
                  ? 'bg-blue-900/20 text-white' 
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-gray-100'
              }`}
            >
              {/* Active Indicator Line */}
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-blue-500 rounded-r-full shadow-[0_0_10px_rgba(59,130,246,0.8)]"></div>
              )}
              
              <span className={`text-xl transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
                {link.icon}
              </span>
              
              {isOpen && (
                <span className={`font-bold tracking-wider uppercase text-[10px] ${isActive ? 'text-blue-400' : ''}`}>
                  {link.label}
                </span>
              )}
            </Link>
          );
        })}

        {/* ===================================================================== */}
        {/* 4. PREMIUM CALL TO ACTION (CRÉER EMPLOI)                              */}
        {/* ===================================================================== */}
        <div className="pt-8 px-1">
          <Link 
            to="/emploi" 
            title={!isOpen ? "Créer Emploi" : ""}
            className="relative flex items-center justify-center gap-3 p-0.5 rounded-xl bg-gradient-to-r from-orange-500 via-pink-500 to-orange-500 hover:from-orange-400 hover:via-pink-400 hover:to-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.4)] transition-all group overflow-hidden"
          >
            {/* Inner background to create gradient border effect when closed, or full gradient when open */}
            <div className={`flex items-center gap-3 w-full h-full rounded-[10px] transition-colors duration-200 ${isOpen ? 'bg-transparent px-3 py-3' : 'bg-[#0B1120] p-2.5 justify-center'}`}>
              <span className="text-xl group-hover:scale-110 transition-transform duration-200 drop-shadow-md">📅</span>
              {isOpen && (
                <span className="font-black text-white tracking-widest uppercase text-[11px] drop-shadow-md">
                  Créer Emploi
                </span>
              )}
            </div>
          </Link>
        </div>
      </nav>

      {/* ===================================================================== */}
      {/* 5. USER PROFILE (FOOTER)                                              */}
      {/* ===================================================================== */}
      <div className="p-4 border-t border-slate-800/50 bg-[#070b14]">
        <div className={`flex items-center gap-3 ${isOpen ? 'justify-start' : 'justify-center'}`}>
          <div className="w-9 h-9 rounded-full bg-slate-800 text-blue-400 flex items-center justify-center font-black text-xs border border-slate-700 shrink-0">
            US
          </div>
          {isOpen && (
            <div className="flex flex-col whitespace-nowrap overflow-hidden">
              <span className="text-xs font-bold text-gray-200">User</span>
              <span className="text-[9px] text-emerald-400 uppercase tracking-widest font-black flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> En Ligne
              </span>
            </div>
          )}
        </div>
      </div>

    </aside>
  );
}