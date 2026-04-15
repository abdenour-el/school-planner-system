import { useState, useEffect } from 'react';
import { BsPeople, BsBuilding, BsBook } from 'react-icons/bs';
import { LuSchool, LuBookOpen } from 'react-icons/lu';
import { FiAlertTriangle } from 'react-icons/fi';
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
        <div className="text-4xl animate-bounce mb-4"><LuSchool/></div>
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
    <div className="bg-gray-50 min-h-screen">

    {/* HEADER NAVBAR */}
    <div className=" top-0 z-50 bg-gradient-to-r from-blue-900 to-indigo-800 shadow-lg">
      <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight">
            Tableau de Bord
          </h1>
          <p className="text-blue-200 text-xs md:text-sm font-semibold">
            Année {startYear}/{endYear}
          </p>
        </div>
      </div>
    </div>
    <div className="p-6">

      {/* 2. STATISTIQUES RAPIDES (KPIs) */}
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">

        {/* Enseignants */}
        <Link to="/enseignants">
          <div className="group bg-[#2F2FE4] text-white p-6 rounded-2xl shadow-md hover:shadow-xl hover:-translate-y-1 transition-all flex justify-between items-center">
            <div>
              <p className="text-xs uppercase opacity-70">Enseignants</p>
              <h3 className="text-3xl font-black">{stats.totalProfs}</h3>
            </div>
            <BsPeople className="text-3xl group-hover:scale-110 transition" />
          </div>
        </Link>

        {/* Classes */}
        <Link to="/classes">
          <div className="group bg-[#162E93] text-white p-6 rounded-2xl shadow-md hover:shadow-xl hover:-translate-y-1 transition-all flex justify-between items-center">
            <div>
              <p className="text-xs uppercase opacity-70">Classes</p>
              <h3 className="text-3xl font-black">{stats.totalClasses}</h3>
            </div>
            <BsBuilding className="text-3xl group-hover:scale-110 transition" />
          </div>
        </Link>

        {/* Matières */}
        <Link to="/matieres">
          <div className="group bg-[#1A1953] text-white p-6 rounded-2xl shadow-md hover:shadow-xl hover:-translate-y-1 transition-all flex justify-between items-center">
            <div>
              <p className="text-xs uppercase opacity-70">Matières</p>
              <h3 className="text-3xl font-black">{stats.totalMatieres}</h3>
            </div>
            <BsBook className="text-3xl group-hover:scale-110 transition" />
          </div>
        </Link>

        {/* GERER LES EMPLOIS */}
        <Link to="/emploi">
          <div className="group bg-gradient-to-r from-indigo-600 to-blue-600 text-white p-6 rounded-2xl shadow-md hover:shadow-xl hover:-translate-y-1 transition-all flex justify-between items-center">
            <div>
              <p className="text-xs uppercase opacity-70">Gérer</p>
              <h3 className="text-xl font-black">Emplois du temps</h3>
            </div>
            <LuBookOpen className="text-3xl group-hover:scale-110 transition" />
          </div>
        </Link>

      </div>

      <div className="grid grid-cols-1 gap-6">
        
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
            {/* <span>0 Classe</span> */}
            <span className="text-gray-900 bg-gray-100 px-3 py-1 rounded-lg">
              {stats.classesCompletes} / {stats.totalClasses} Validées
            </span>
            <span>{stats.totalClasses} Classes</span>
          </div>

          {pourcentageCompletion < 100 && pourcentageCompletion > 0 && (
            <div className="mt-8 bg-orange-50 border border-orange-200 p-4 rounded-xl flex gap-4 items-center">
              <div className="text-2xl"><FiAlertTriangle /></div>
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

      </div>
    </div>
    </div>
  );
}