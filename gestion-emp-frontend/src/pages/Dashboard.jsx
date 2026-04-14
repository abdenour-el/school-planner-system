import { useState, useEffect } from 'react';
import { BsPeople, BsBuilding, BsBook } from 'react-icons/bs';
import { LuSchool, LuBookOpen } from 'react-icons/lu';
import axios from 'axios';
import { Link } from 'react-router-dom';
export default function Dashboard() {
  const [stats, setStats] = useState({
    totalClasses: 0,
    totalProfs: 0,
    totalMatieres: 0,
    classesCompletes: 0,
    heuresTotalProgrammees: 0
  });
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [resCls, resEns, resMat, resSea] = await Promise.all([
          axios.get('http://127.0.0.1:8000/api/classes'),
          axios.get('http://127.0.0.1:8000/api/enseignants'),
          axios.get('http://127.0.0.1:8000/api/matieres'),
          axios.get('http://127.0.0.1:8000/api/seances')
        ]);

        const classes = resCls.data;
        const seances = resSea.data;

        // 1. calculate hours per class
        const heuresParClasse = {};
        let totalHeures = 0;

        seances.forEach(seance => {
          // Calcul de la durée de la séance en heures (ex: 08:30 - 10:00 => 1.5h)
          const [h1, m1] = seance.heure_debut.split(':').map(Number);
          const [h2, m2] = seance.heure_fin.split(':').map(Number);
          const duree = (h2 + m2 / 60) - (h1 + m1 / 60);

          if (!heuresParClasse[seance.classe_id]) {
            heuresParClasse[seance.classe_id] = 0;
          }
          heuresParClasse[seance.classe_id] += duree;
          totalHeures += duree;
        });

        // 2. shows how many classes have completed at least 32 hours
        let completes = 0;
        classes.forEach(cls => {
          if (heuresParClasse[cls.id] >= 32) {
            completes++;
          }
        });

        setStats({
          totalClasses: classes.length,
          totalProfs: resEns.data.length,
          totalMatieres: resMat.data.length,
          classesCompletes: completes,
          heuresTotalProgrammees: totalHeures
        });

        setLoading(false);
      } catch (error) {
        console.error("Erreur chargement dashboard:", error);
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <div className="text-4xl animate-bounce mb-4">🏫</div>
        <div className="text-gray-400 font-black uppercase tracking-widest text-sm animate-pulse">
          Chargement de la Tour de Contrôle...
        </div>
      </div>
    );
  }

  // Calcul du pourcentage de classes avec emploi du temps complet
  const pourcentageCompletion = stats.totalClasses === 0 ? 0 : Math.round((stats.classesCompletes / stats.totalClasses) * 100);
  // année scolaire
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const startYear = month >= 8 ? year : year - 1;
  const endYear = startYear + 1;

  return (
    <div className="bg-gray-50 p-6 min-h-screen">
      
      {/* 1. HEADER HERO */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-800 p-8 rounded-2xl shadow-xl mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl"></div>
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-blue-500 opacity-20 rounded-full blur-3xl"></div>
        
        <div className="relative z-10 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight uppercase mb-2">
              Tableau de Bord
            </h1>
            <p className="text-blue-200 font-bold text-sm">
              Supervision globale de l'établissement scolaire. Année {startYear}/{endYear}.
            </p>
          </div>
          <div className="hidden md:block text-6xl shadow-black/50 drop-shadow-lg">
            🎓
          </div>
        </div>
      </div>

      {/* 2. STATISTIQUES RAPIDES (KPIs) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">

        {/* Enseignants */}
        <Link to="/enseignants" >
        <div className="group bg-[#2F2FE4] text-white p-6 rounded-2xl shadow-md hover:shadow-xl hover:-translate-y-1  transition-all duration-300 flex items-center justify-between cursor-pointer">
          
          <div>
            <p className="text-xs uppercase opacity-70">Enseignants</p>
            <h3 className="text-3xl font-black mt-1">{stats.totalProfs}</h3>
          </div>

          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition">
            <BsPeople />
          </div>
        </div>
        </Link>

        {/* Classes */}
        <Link to="/classes">
        <div className="group bg-[#162E93] text-white p-6 rounded-2xl shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex items-center justify-between cursor-pointer">
          
          <div>
            <p className="text-xs uppercase opacity-70">Classes</p>
            <h3 className="text-3xl font-black mt-1">{stats.totalClasses}</h3>
          </div>

          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition">
            <BsBuilding />
          </div>
        </div>
        </Link>

        {/* Matières */}
        <Link to="/matieres">
        <div className="group bg-[#1A1953] text-white p-6 rounded-2xl shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex items-center justify-between cursor-pointer">
          
          <div>
            <p className="text-xs uppercase opacity-70">Matières</p>
            <h3 className="text-3xl font-black mt-1">{stats.totalMatieres}</h3>
          </div>

          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition">
            <BsBook />
          </div>
        </div>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* new widget */}
        <div className="lg:col-span-2 bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-end mb-8">
            <div>
              <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight">Avancement des Emplois</h2>
              <p className="text-xs font-bold text-gray-400 mt-1">Classes ayant un emploi du temps complet (32h).</p>
            </div>
            <div className="text-right">
              <span className={`text-4xl font-black ${pourcentageCompletion === 100 ? 'text-green-500' : 'text-blue-600'}`}>
                {pourcentageCompletion}%
              </span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-gray-100 rounded-full h-4 mb-4 overflow-hidden shadow-inner">
            <div 
              className={`h-full transition-all duration-1000 ease-out ${pourcentageCompletion === 100 ? 'bg-green-500 shadow-green-200' : 'bg-gradient-to-r from-blue-500 to-indigo-500'}`} 
              style={{ width: `${pourcentageCompletion}%` }}
            ></div>
          </div>

          <div className="flex justify-between text-xs font-black uppercase tracking-widest text-gray-500">
            <span>0 Classe</span>
            <span className="text-gray-900 bg-gray-100 px-3 py-1 rounded-lg">
              {stats.classesCompletes} / {stats.totalClasses} Validées
            </span>
            <span>{stats.totalClasses} Classes</span>
          </div>

          {pourcentageCompletion < 100 && pourcentageCompletion > 0 && (
            <div className="mt-8 bg-orange-50 border border-orange-200 p-4 rounded-xl flex gap-4 items-center">
              <div className="text-2xl">⚠️</div>
              <div>
                <h4 className="text-sm font-black text-orange-800 uppercase">Attention Requise</h4>
                <p className="text-xs font-bold text-orange-600 mt-1">
                  Il reste {stats.totalClasses - stats.classesCompletes} classe(s) avec des emplois du temps incomplets. Veuillez utiliser le générateur ou vérifier la disponibilité des enseignants.
                </p>
              </div>
            </div>
          )}

          {pourcentageCompletion === 100 && (
            <div className="mt-8 bg-green-50 border border-green-200 p-4 rounded-xl flex gap-4 items-center">
              <div className="text-2xl">🎉</div>
              <div>
                <h4 className="text-sm font-black text-green-800 uppercase">Parfait !</h4>
                <p className="text-xs font-bold text-green-600 mt-1">
                  Tous les emplois du temps ont été générés avec succès. L'école est prête !
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 4. ACTIONS RAPIDES */}
        <div className="bg-gray-900 p-8 rounded-2xl shadow-xl text-white">
          <h2 className="text-lg font-black uppercase tracking-widest mb-6 text-gray-300">⚡ Actions Rapides</h2>
          
          <div className="space-y-4">
            <a href="/emploi" className="block w-full bg-indigo-600 hover:bg-indigo-500 p-4 rounded-xl transition-colors group">
              <div className="flex justify-between items-center">
                <span className="font-black text-sm uppercase">Gérer les Emplois</span>
                <span className="text-xl group-hover:translate-x-1 transition-transform">➔</span>
              </div>
              <p className="text-[10px] text-indigo-200 font-bold mt-1">Ouvrir le planificateur et le générateur auto.</p>
            </a>

            <a href="/enseignants" className="block w-full bg-gray-800 hover:bg-gray-700 p-4 rounded-xl transition-colors border border-gray-700 group">
              <div className="flex justify-between items-center">
                <span className="font-black text-sm uppercase">Corps Enseignant</span>
                <span className="text-xl group-hover:translate-x-1 transition-transform">➔</span>
              </div>
              <p className="text-[10px] text-gray-400 font-bold mt-1">Ajouter ou modifier des professeurs.</p>
            </a>

            <a href="/classes" className="block w-full bg-gray-800 hover:bg-gray-700 p-4 rounded-xl transition-colors border border-gray-700 group">
              <div className="flex justify-between items-center">
                <span className="font-black text-sm uppercase">Configuration</span>
                <span className="text-xl group-hover:translate-x-1 transition-transform">➔</span>
              </div>
              <p className="text-[10px] text-gray-400 font-bold mt-1">Gérer les classes et les matières.</p>
            </a>
          </div>

        </div>

      </div>

    </div>
  );
}