import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useReactToPrint } from 'react-to-print';

export default function Enseignants() {
  // =========================================================================
  // DATA STATES
  // =========================================================================
  const [enseignants, setEnseignants] = useState([]);
  const [matieres, setMatieres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // =========================================================================
  // VIEW & GROUPING STATES
  // =========================================================================
  const [expandedGroups, setExpandedGroups] = useState({});
  
  // =========================================================================
  // CRUD MODAL STATES
  // =========================================================================
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ 
    nom: '', prenom: '', matiere_id: '', nombre_groupes: 1, niveaux: [] 
  });

  // =========================================================================
  // SCHEDULE (EMPLOI) MODAL STATES
  // =========================================================================
  const [showEmploiModal, setShowEmploiModal] = useState(false);
  const [currentProf, setCurrentProf] = useState(null);
  const [profSeances, setProfSeances] = useState([]);
  const [loadingEmploi, setLoadingEmploi] = useState(false);

  // =========================================================================
  // DOWNLOAD ALL FEATURE STATES
  // =========================================================================
  const [allSeances, setAllSeances] = useState([]);
  const [isPreparingPDF, setIsPreparingPDF] = useState(false);
  const allComponentRef = useRef(null);

  const jours = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];
  
  // =========================================================================
  // PRINT / DOWNLOAD SETUP
  // =========================================================================

  // Print SINGLE teacher
  const componentRef = useRef(null);
  const handlePrintSingle = useReactToPrint({
    contentRef: componentRef,
    documentTitle: currentProf ? `Emploi_${currentProf.nom}_${currentProf.prenom}` : 'Emploi_Professeur',
  });

  // Print ALL teachers
  const handlePrintAll = useReactToPrint({
    contentRef: allComponentRef,
    documentTitle: 'Tous_Les_Emplois_Professeurs',
    onAfterPrint: () => setIsPreparingPDF(false)
  });

  // Fetch all data and trigger the "Print All" function
  const telechargerTous = async () => {
    if (!window.confirm("Générer le PDF pour TOUS les professeurs ? Cela peut prendre quelques secondes.")) return;
    setIsPreparingPDF(true);
    try {
      const res = await axios.get('http://127.0.0.1:8000/api/seances');
      setAllSeances(res.data);
      // Wait for React to render the hidden tables before printing
      setTimeout(() => {
        handlePrintAll();
      }, 1500);
    } catch {
      alert("Erreur lors de la préparation du PDF");
      setIsPreparingPDF(false);
    }
  };

  // =========================================================================
  // DATA FETCHING (CRUD)
  // =========================================================================

  const loadData = async () => {
    try {
      const [resEns, resMat] = await Promise.all([
        axios.get('http://127.0.0.1:8000/api/enseignants'),
        axios.get('http://127.0.0.1:8000/api/matieres')
      ]);
      setEnseignants(resEns.data);
      setMatieres(resMat.data);
      
      // Expand all groups by default
      const initialExpanded = {};
      resMat.data.forEach(m => { initialExpanded[m.id] = true; });
      initialExpanded['sans_matiere'] = true;
      setExpandedGroups(initialExpanded);
      
      setLoading(false);
    } catch (error) {
      console.error("Error fetching data:", error);
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // =========================================================================
  // UI HANDLERS
  // =========================================================================
  const toggleGroup = (groupId) => setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));

  const handleNiveauChange = (niv) => {
    const val = niv.toString();
    setFormData(prev => {
      if (prev.niveaux.includes(val)) return { ...prev, niveaux: prev.niveaux.filter(n => n !== val) };
      return { ...prev, niveaux: [...prev.niveaux, val] };
    });
  };

  const openAddModal = () => {
    setEditingId(null);
    setFormData({ nom: '', prenom: '', matiere_id: '', nombre_groupes: 1, niveaux: [] });
    setIsModalOpen(true);
  };

  const openEditModal = (prof) => {
    setEditingId(prof.id);
    setFormData({
      nom: prof.nom, prenom: prof.prenom, matiere_id: prof.matiere_id,
      nombre_groupes: prof.nombre_groupes,
      niveaux: prof.niveaux ? prof.niveaux.map(String) : [] 
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.niveaux.length === 0) { 
      alert("⚠️ Veuillez sélectionner au moins un niveau d'enseignement !"); 
      return; 
    }
    try {
      if (editingId) await axios.put(`http://127.0.0.1:8000/api/enseignants/${editingId}`, formData);
      else await axios.post('http://127.0.0.1:8000/api/enseignants', formData);
      setIsModalOpen(false); 
      setEditingId(null); 
      loadData(); 
    } catch { 
      alert("Erreur lors de l'enregistrement du professeur."); 
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer ce professeur ?")) {
      try {
        await axios.delete(`http://127.0.0.1:8000/api/enseignants/${id}`);
        setEnseignants(enseignants.filter(prof => prof.id !== id));
      } catch { 
        alert("Erreur lors de la suppression !"); 
      }
    }
  };

  // =========================================================================
  // VIEW TEACHER SCHEDULE
  // =========================================================================
  const handleViewEmploi = async (prof) => {
    setCurrentProf(prof);
    setShowEmploiModal(true);
    setLoadingEmploi(true);
    try {
      const res = await axios.get(`http://127.0.0.1:8000/api/seances?enseignant_id=${prof.id}`);
      setProfSeances(res.data);
    } catch {
      alert("Erreur lors du chargement de l'emploi du temps.");
    } finally {
      setLoadingEmploi(false);
    }
  };

  // =========================================================================
  // GRID STYLING FUNCTIONS (PROPORTIONAL SIZES)
  // =========================================================================
  const getGridStyleMatin = (debut, fin) => {
    const hDebut = parseInt(debut.substring(0, 2));
    const hFin = parseInt(fin.substring(0, 2));
    return { gridColumn: `${hDebut - 9 + 1} / span ${hFin - hDebut}` };
  };

  const getGridStyleSoir = (debut, fin) => {
    const hDebut = parseInt(debut.substring(0, 2));
    const hFin = parseInt(fin.substring(0, 2));
    return { gridColumn: `${hDebut - 16 + 1} / span ${hFin - hDebut}` };
  };

  // =========================================================================
  // CORE DISPLAY: RENDER SCHEDULE TABLE
  // =========================================================================
  // =========================================================================
  // CORE DISPLAY: RENDER SCHEDULE TABLE
  // =========================================================================
  const renderTable = (profData, seancesData) => {
    // Calculate total hours directly from the rendered sessions for 100% accuracy
    const totalHours = seancesData.reduce((sum, s) => {
      const hDebut = parseInt(s.heure_debut.substring(0, 2));
      const hFin = parseInt(s.heure_fin.substring(0, 2));
      return sum + (hFin - hDebut);
    }, 0);

    return (
      <div className="print-container bg-white p-8 rounded-xl shadow-sm print:p-0 print:shadow-none mx-auto w-full max-w-[29.7cm]">
        
        {/* Document Header */}
        <div className="text-center mb-8 border-b-4 border-black pb-4">
          <h1 className="text-4xl font-black uppercase tracking-tighter text-gray-900 mb-4">EMPLOI DU TEMPS</h1>
          <div className="flex justify-between items-end px-4">
            <span className="text-sm font-bold text-gray-500 uppercase tracking-widest">Année Scolaire: 2025/2026</span>
            <div className="text-right">
              <span className="block text-2xl font-black text-blue-800 uppercase tracking-tight">Professeur: {profData?.nom} {profData?.prenom}</span>
              
              <div className="flex justify-end gap-2 mt-1">
                <span className="inline-block bg-gray-100 px-3 py-1 rounded text-sm font-black text-gray-700 uppercase tracking-widest">
                  Matière: {profData?.matiere?.nom_matiere || 'Aucune'}
                </span>
                {/* 🔥 NEW: TOTAL HOURS BADGE 🔥 */}
                <span className="inline-block bg-blue-100 border border-blue-200 text-blue-800 px-3 py-1 rounded text-sm font-black uppercase tracking-widest shadow-sm">
                  Charge: {totalHours}h / {profData?.max_heures || 24}h
                </span>
              </div>

            </div>
          </div>
        </div>

        {/* Schedule Table */}
        <table className="w-full border-4 border-black border-collapse print:table-fixed">
          <thead>
            <tr className="bg-gray-100 text-gray-900 text-xs uppercase tracking-widest">
              <th className="border-2 border-black p-3 w-24">JOUR</th>
              <th colSpan="2" className="border-2 border-black p-3">MATIN (09:00 - 13:00)</th>
              <th className="border-2 border-black p-3 w-8 bg-gray-300"></th>
              <th colSpan="2" className="border-2 border-black p-3">SOIR (16:00 - 19:00)</th>
            </tr>
          </thead>
          <tbody>
            {jours.map(jour => {
              const morning = seancesData.filter(s => s.jour === jour && s.heure_debut < "14:00").sort((a,b) => a.heure_debut.localeCompare(b.heure_debut));
              const afternoon = seancesData.filter(s => s.jour === jour && s.heure_debut >= "14:00").sort((a,b) => a.heure_debut.localeCompare(b.heure_debut));
              
              return (
                <tr key={jour} className="h-28 print:h-24">
                  <td className="border-2 border-black font-black text-center text-sm bg-gray-50 uppercase">{jour}</td>
                  
                  {/* Morning (Grid Layout) */}
                  <td colSpan="2" className="p-1 align-top border-2 border-black">
                    <div className="grid grid-cols-4 gap-1 h-full">
                      {morning.map(s => (
                        <div 
                          key={s.id} 
                          style={getGridStyleMatin(s.heure_debut, s.heure_fin)}
                          className="border-2 border-gray-800 p-2 flex flex-col justify-center items-center bg-blue-50/30 rounded-lg"
                        >
                          <span className="text-[11px] font-black text-gray-900 bg-white border border-gray-300 px-3 rounded-full mb-1 shadow-sm">
                            {s.heure_debut.slice(0,5)} - {s.heure_fin.slice(0,5)}
                          </span>
                          <span className="text-sm font-black uppercase text-center text-blue-900 tracking-tight mt-1">
                            {s.classe?.nom_classe} <span className="text-blue-500">(N{s.classe?.niveau})</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </td>
                  
                  <td className="bg-gray-200 border-2 border-black"></td>
                  
                  {/* Afternoon (Grid Layout) */}
                  {jour === 'Mercredi' ? (
                    <td colSpan="2" className="bg-gray-50 border-2 border-black align-middle text-center">
                      <span className="text-gray-300 font-black uppercase tracking-[0.3em] text-xs">Après-midi libre</span>
                    </td>
                  ) : (
                    <td colSpan="2" className="p-1 align-top border-2 border-black">
                      <div className="grid grid-cols-3 gap-1 h-full">
                        {afternoon.map(s => (
                          <div 
                            key={s.id} 
                            style={getGridStyleSoir(s.heure_debut, s.heure_fin)}
                            className="border-2 border-gray-800 p-2 flex flex-col justify-center items-center bg-purple-50/30 rounded-lg"
                          >
                            <span className="text-[11px] font-black text-gray-900 bg-white border border-gray-300 px-3 rounded-full mb-1 shadow-sm">
                              {s.heure_debut.slice(0,5)} - {s.heure_fin.slice(0,5)}
                            </span>
                            <span className="text-sm font-black uppercase text-center text-purple-900 tracking-tight mt-1">
                              {s.classe?.nom_classe} <span className="text-purple-500">(N{s.classe?.niveau})</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Footer */}
        <div className="mt-4 text-[9px] font-bold text-right text-gray-400 uppercase italic">
          Document généré le {new Date().toLocaleDateString()} - School Planner System
        </div>

      </div>
    );
  };

  // =========================================================================
  // RENDER TEACHER ROW IN TABLE
  // =========================================================================
  const renderProfRow = (prof) => {
    const heuresActuelles = prof.heures_actuelles || 0;
    const pourcentage = Math.min((heuresActuelles / prof.max_heures) * 100, 100);
    
    let barColor = "bg-green-500";
    if (pourcentage >= 100) barColor = "bg-red-500 shadow-red-200";
    else if (pourcentage >= 80) barColor = "bg-orange-500";
    const highlight = (text) => {
      if (!search) return text;

      const regex = new RegExp(`(${search})`, 'gi');
      return text.replace(
        regex,
        '<mark class="bg-yellow-200 px-1 rounded">$1</mark>'
      );
    };
    return (
      <tr key={prof.id} className="hover:bg-blue-50/40 border-b border-gray-100 transition-colors bg-white">
        <td className="py-4 px-4 font-black text-gray-900 w-[20%]">
          👨‍🏫 {' '}
          <span
            dangerouslySetInnerHTML={{
              __html: highlight(`${prof.nom} ${prof.prenom}`)
            }}
          />
        </td>
        
        <td className="py-4 px-4 text-center w-[15%]">
          <div className="flex justify-center gap-1 flex-wrap">
            {prof.niveaux && prof.niveaux.map((niv, idx) => (
              <span key={idx} className="bg-gray-200 text-gray-500 text-[9px] px-1.5 py-0.5 rounded font-black">N{niv}</span>
            ))}
          </div>
        </td>

        <td className="py-4 px-4 w-[25%]">
          <div className="flex flex-wrap gap-1">
            {prof.classes_assignees && prof.classes_assignees.length > 0 ? (
              prof.classes_assignees.map((cls, idx) => (
                <span key={idx} className="bg-purple-100 border border-purple-200 text-purple-800 text-[9px] px-2 py-1 rounded font-black uppercase shadow-sm">
                  {cls.nom_classe}
                </span>
              ))
            ) : <span className="text-[10px] font-bold text-gray-400 italic">Aucune classe</span>}
          </div>
        </td>

        <td className="py-4 px-4 w-[15%]">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[11px] font-black text-gray-700">{heuresActuelles}h / {prof.max_heures}h</span>
            <span className={`text-[9px] font-black ${pourcentage >= 100 ? 'text-red-600 animate-pulse' : 'text-gray-400'}`}>
              {Math.round(pourcentage)}%
            </span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden shadow-inner">
            <div className={`h-full ${barColor} transition-all duration-1000 ease-out`} style={{ width: `${pourcentage}%` }}></div>
          </div>
        </td>

        <td className="py-4 px-4 text-right space-x-2 w-[25%]">
          <button onClick={() => handleViewEmploi(prof)} className="text-green-600 hover:text-white hover:bg-green-600 border-2 border-green-100 hover:border-green-600 px-3 py-1 rounded-lg font-black text-[10px] transition-all uppercase shadow-sm">
            📅 Emploi
          </button>
          <button onClick={() => openEditModal(prof)} className="text-orange-500 hover:text-white hover:bg-orange-500 border-2 border-orange-100 hover:border-orange-500 px-3 py-1 rounded-lg font-black text-[10px] transition-all uppercase">
            Éditer
          </button>
          <button onClick={() => handleDelete(prof.id)} className="text-red-500 hover:text-white hover:bg-red-500 border-2 border-red-100 hover:border-red-500 px-3 py-1 rounded-lg font-black text-[10px] transition-all uppercase">
            Sup.
          </button>
        </td>
      </tr>
    );
  };

  // Group teachers by subject
  const enseignantsGroupes = matieres.map(mat => ({
    matiere: mat, 
    profs: enseignants.filter(e => {
      const fullName = `${e.nom} ${e.prenom}`.toLowerCase();
      return (
        e.matiere_id === mat.id &&
        fullName.includes(search.toLowerCase())
      );
    })
  })).filter(g => g.profs.length > 0); 
  
  if (loading) {
    return <div className="p-6 text-center text-blue-600 font-black animate-pulse uppercase tracking-widest mt-20">Chargement du personnel...</div>;
  }

  return (
    <div className="bg-gray-50 p-6 min-h-screen">
      
      {/* ===================================================================== */}
      {/* 1. CONTROL PANEL */}
      {/* ===================================================================== */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className='w-full md:w-[350px]'>
        <input
          type="text"
          placeholder='rechercher un enseignant...'
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border-2 border-gray-200 focus:border-blue-600 p-3 rounded-xl font-bold text-sm outline-none transition"
        />
        </div>
        <div className="flex gap-4 items-center">
          {/* DOWNLOAD ALL TEACHERS BUTTON */}
          <button onClick={telechargerTous} disabled={isPreparingPDF || enseignants.length === 0} className="bg-black hover:bg-gray-800 text-white px-5 py-2.5 rounded-xl font-black shadow-lg uppercase text-[10px] transition-all disabled:opacity-50">
            {isPreparingPDF ? '⏳ PRÉPARATION...' : '📑 TÉLÉCHARGER TOUT (PDF)'}
          </button>
          
          <button onClick={openAddModal} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-black shadow-lg shadow-blue-200 transition-all uppercase text-xs">+ Ajouter Prof</button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 2. TREE VIEW (ARBORESCENCE) */}
      {/* ===================================================================== */}
      <div className="space-y-6">
        {enseignantsGroupes.map(groupe => (
          <div key={groupe.matiere.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            
            {/* Group Header */}
            <div
             onClick={() => toggleGroup(groupe.matiere.id)} 
             className="bg-gray-900 hover:bg-gray-800 text-white p-4  flex justify-between items-center transition-colors select-none"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{expandedGroups[groupe.matiere.id] ? '📂' : '📁'}</span>
                <h3 className="font-black uppercase tracking-widest text-sm">{groupe.matiere.nom_matiere}</h3>
              </div>
              <div className='flex items-center gap-2'>
                <button
                  onClick={openAddModal}
                  className="bg-green-600 hover:bg-green-800 text-white px-3 py-1 rounded-full text-[10px] font-black cursor-pointer transition">
                  + Ajouter Prof
                </button>
                <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-[10px] font-black">
                  {groupe.profs.length} Prof(s)
                </span>
              </div>
            </div>
            
            {/* Group Content (Teachers Table) */}
            {expandedGroups[groupe.matiere.id] && (
              <div className="overflow-x-auto bg-gray-50 p-2">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-gray-400 text-[10px] uppercase tracking-widest border-b-2 border-gray-200">
                      <th className="pb-3 px-4 font-black">Professeur</th>
                      <th className="pb-3 px-4 font-black text-center">Niv. Autorisés</th>
                      <th className="pb-3 px-4 font-black">Classes (Réel)</th>
                      <th className="pb-3 px-4 font-black">Charge Actuelle</th>
                      <th className="pb-3 px-4 font-black text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupe.profs.map(renderProfRow)}
                  </tbody>
                </table>
              </div>
            )}

          </div>
        ))}

        {/* Empty State */}
        {search && enseignantsGroupes.length === 0 ? (
          <div className="text-center py-20 text-gray-400 font-black text-xl uppercase tracking-widest">
            Aucun résultat trouvé
          </div>
        ) : enseignants.length === 0 && (
          <div className="text-center py-20 text-gray-300 font-black text-2xl uppercase tracking-tighter">
            Aucun enseignant
          </div>
        )}
      </div>

      {/* ===================================================================== */}
      {/* 3. HIDDEN CONTAINER TO PRINT ALL TEACHERS                             */}
      {/* ===================================================================== */}
      <div className="hidden">
        <div ref={allComponentRef} className="w-full bg-white print:m-0 print:p-0">
          {enseignants.map((prof, index) => {
            const seancesDuProf = allSeances.filter(s => s.enseignant_id === prof.id);
            return (
              <div 
                key={prof.id} 
                style={{ pageBreakAfter: index === enseignants.length - 1 ? 'auto' : 'always' }}
              >
                {renderTable(prof, seancesDuProf)}
              </div>
            );
          })}
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 4. CRUD MODAL (ADD / EDIT)                                            */}
      {/* ===================================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 no-print">
          <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-lg border-t-8 border-blue-600">
            <h2 className="text-2xl font-black mb-6 uppercase tracking-tighter text-gray-800">
              {editingId ? "Modifier Professeur" : "Ajouter Professeur"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-5">
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-500 uppercase">Nom</label>
                  <input type="text" required className="w-full border-2 p-3 rounded-xl focus:border-blue-600 font-bold" value={formData.nom} onChange={(e) => setFormData({...formData, nom: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-500 uppercase">Prénom</label>
                  <input type="text" required className="w-full border-2 p-3 rounded-xl focus:border-blue-600 font-bold" value={formData.prenom} onChange={(e) => setFormData({...formData, prenom: e.target.value})} />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-500 uppercase">Matière</label>
                  <select required className="w-full border-2 p-3 rounded-xl focus:border-blue-600 font-black text-blue-700 text-xs uppercase" value={formData.matiere_id} onChange={(e) => setFormData({...formData, matiere_id: e.target.value})}>
                    <option value="">-- Choisir --</option>
                    {matieres.map(mat => <option key={mat.id} value={mat.id}>{mat.nom_matiere}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-purple-500 uppercase">Nombre Groupes Max</label>
                  <input type="number" min="1" required className="w-full border-2 p-3 rounded-xl focus:border-purple-600 font-black text-purple-700" value={formData.nombre_groupes} onChange={(e) => setFormData({...formData, nombre_groupes: parseInt(e.target.value)})} />
                </div>
              </div>
              
              <div className="space-y-2 pt-2 bg-gray-50 p-4 rounded-xl border-2 border-gray-100">
                <label className="text-[10px] font-black text-gray-500 uppercase block mb-2">Niveaux Enseignés</label>
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, 4, 5, 6].map(niv => (
                    <label key={niv} className={`flex items-center gap-2 font-black text-xs px-4 py-2 rounded-lg border-2 cursor-pointer transition-all ${formData.niveaux.includes(niv.toString()) ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white text-gray-600 hover:border-blue-300'}`}>
                      <input type="checkbox" className="hidden" checked={formData.niveaux.includes(niv.toString())} onChange={() => handleNiveauChange(niv)} /> NIVEAU {niv}
                    </label>
                  ))}
                </div>
              </div>
              
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => { setIsModalOpen(false); setEditingId(null); }} className="px-6 py-3 bg-gray-100 text-gray-500 rounded-xl hover:bg-gray-200 font-black uppercase text-xs">Annuler</button>
                <button type="submit" className={`px-8 py-3 text-white rounded-xl font-black uppercase text-xs shadow-xl transition-all ${editingId ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-600 hover:bg-blue-700'}`}>
                  {editingId ? "✓ Modifier" : "✓ Enregistrer"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 5. SINGLE SCHEDULE PREVIEW MODAL                                      */}
      {/* ===================================================================== */}
      {showEmploiModal && currentProf && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 no-print">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl border-t-8 border-gray-900 flex flex-col max-h-[95vh]">
            
            <div className="p-6 flex justify-between items-center border-b border-gray-100 bg-gray-50 rounded-t-xl">
              <div>
                <h2 className="text-xl font-black uppercase tracking-tighter text-gray-800">
                  Aperçu de l'Emploi
                </h2>
              </div>
              <div className="flex gap-3">
                <button onClick={handlePrintSingle} className="bg-gray-900 hover:bg-black text-white px-6 py-2 rounded-xl font-black text-xs uppercase shadow-lg shadow-gray-400 transition-all flex items-center gap-2">
                  <span className="text-lg">🖨️</span> Imprimer (1)
                </button>
                <button onClick={() => setShowEmploiModal(false)} className="text-gray-500 hover:text-red-500 hover:bg-red-50 w-10 h-10 rounded-full font-black text-xl flex items-center justify-center transition-colors">
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto bg-gray-200">
              {loadingEmploi ? (
                <div className="py-20 text-center text-gray-500 font-black animate-pulse uppercase">Chargement de l'emploi...</div>
              ) : (
                <div ref={componentRef}>
                  {renderTable(currentProf, profSeances)}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}