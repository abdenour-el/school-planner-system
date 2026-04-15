import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BsHouseDoor, BsGear, BsPeople, BsCalendar3,BsBuildings, BsChevronLeft, BsChevronRight } from "react-icons/bs";


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
    { path: '/', label: 'Accueil', icon: <BsHouseDoor /> },
    { path: '/classes', label: 'Configuration', icon: <BsGear /> },
    { path: '/enseignants', label: 'Enseignants', icon: <BsPeople />  },
  ];

  return (
    // 'sticky top-0 h-screen' makes it stay on the screen while scrolling
    <aside 
      className={`sticky top-0 h-screen bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ease-in-out z-50 ${
        isOpen ? 'w-64' : 'w-20'
      }`}
    >
      {/* ===================================================================== */}
      {/* 1. MODERN FLOATING TOGGLE BUTTON                                      */}
      {/* ===================================================================== */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="absolute -right-3.5 top-9 bg-white hover:bg-gray-100 w-7 h-7 rounded-full flex items-center justify-center text-gray-600 text-[10px] shadow-md border border-gray-300 transition-all z-50"
        title={isOpen ? "Réduire" : "Agrandir"}
      >
        {isOpen 
          ? <BsChevronLeft />
          : <BsChevronRight />
        }
      </button>

      {/* ===================================================================== */}
      {/* 2. BRANDING / LOGO AREA                                               */}
      {/* ===================================================================== */}
      <div className="h-20 flex items-center justify-center border-b border-gray-100 px-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center shadow-md shrink-0">
            <span className="text-white text-lg font-bold"><BsBuildings /></span>
          </div>
          {isOpen && (
            <h2 className="font-bold text-gray-800 whitespace-nowrap text-lg">
              School<span className="text-blue-500">Admin</span>
            </h2>
          )}
        </div>
      </div>
      
      {/* ===================================================================== */}
      {/* 3. NAVIGATION LINKS                                                   */}
      {/* ===================================================================== */}
      <nav className="flex-1 py-6 px-2 space-y-2 overflow-y-auto">
        {navLinks.map((link) => {
          const isActive = location.pathname === link.path;
          return (
            <Link 
              key={link.path}
              to={link.path} 
              title={!isOpen ? link.label : ""}
              className={`flex items-center gap-4 px-3 py-3 rounded-xl transition-all duration-200 group ${
                isActive 
                  ? 'bg-blue-100 text-blue-600 font-semibold' 
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <span className={`text-xl transition ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
                {link.icon}
              </span>
              
              {isOpen && (
                <span className="text-sm">
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
            className="flex items-center justify-center gap-3 bg-blue-500 hover:bg-blue-700 text-white rounded-xl px-3 py-3 transition shadow-md"
          >
            <span className="text-xl">
              <BsCalendar3 />
            </span>
            {isOpen && (
              <span className="font-semibold text-sm">
                Gérer les emplois
              </span>
            )}
          </Link>
        </div>
      </nav>

      {/* ===================================================================== */}
      {/* 5. USER PROFILE (FOOTER)                                              */}
      {/* ===================================================================== */}
      <div className="p-4 border-t border-gray-100">
        <div className={`flex items-center gap-3 ${isOpen ? 'justify-start' : 'justify-center'}`}>
          <div className="w-9 h-9 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center font-bold text-xs">
            US
          </div>
          {isOpen && (
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-gray-800">User</span>
              <span className="text-[10px] text-green-500 flex items-center gap-1">
                ● En ligne
              </span>
            </div>
          )}
        </div>
      </div>

    </aside>
  );
}