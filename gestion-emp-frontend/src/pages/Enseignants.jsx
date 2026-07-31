import { useState, useEffect, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { FiEdit, FiTrash2, FiPrinter, FiX, FiDownload, FiLoader, FiUserPlus } from "react-icons/fi";
import { MdFolder, MdFolderOpen, MdOutlineCalendarMonth, MdPerson } from "react-icons/md";
import toast, { Toaster } from 'react-hot-toast';
import axiosClient from '../axiosClient';

export default function Enseignants() {
  // =========================================================================
  // 1. DATA STATES
  // =========================================================================
  const [enseignants, setEnseignants] = useState([]);
  const [matieres, setMatieres] = useState([]);
  const [classes, setClasses] = useState([]); // NEW: State to hold all classes
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // =========================================================================
  // 2. VIEW & GROUPING STATES
  // =========================================================================
  const [expandedGroups, setExpandedGroups] = useState({});
  
  // =========================================================================
  // 3. CRUD MODAL STATES
  // =========================================================================
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  // NEW: Updated formData to match the new Backend logic (max_heures & classes_ids)
  const [formData, setFormData] = useState({ 
    nom: '', prenom: '', matiere_id: '', max_heures: 24, classes_ids: [] 
  });

  // =========================================================================
  // 4. SCHEDULE (EMPLOI) MODAL STATES
  // =========================================================================
  const [showEmploiModal, setShowEmploiModal] = useState(false);
  const [currentProf, setCurrentProf] = useState(null);
  const [profSeances, setProfSeances] = useState([]);
  const [loadingEmploi, setLoadingEmploi] = useState(false);

  // =========================================================================
  // 5. DOWNLOAD ALL FEATURE STATES
  // =========================================================================
  const [allSeances, setAllSeances] = useState([]);
  const [isPreparingPDF, setIsPreparingPDF] = useState(false);
  const allComponentRef = useRef(null);
  const componentRef = useRef(null);

  const jours = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];
  
  // =========================================================================
  // 6. PRINT / DOWNLOAD SETUP
  // =========================================================================
  const handlePrintSingle = useReactToPrint({
    contentRef: componentRef,
    documentTitle: currentProf ? `Emploi_${currentProf.nom}_${currentProf.prenom}` : 'Emploi_Professeur',
  });

  const handlePrintAll = useReactToPrint({
    contentRef: allComponentRef,
    documentTitle: 'Tous_Les_Emplois_Professeurs',
    onAfterPrint: () => {
      setIsPreparingPDF(false);
      toast.success("Impression terminée !");
    }
  });

  const telechargerTous = async () => {
    if (!window.confirm("Générer le PDF pour TOUS les professeurs ? Cela peut prendre quelques secondes.")) return;
    setIsPreparingPDF(true);
    try {
      const res = await axiosClient.get('/seances');
      setAllSeances(res.data);
      setTimeout(() => {
        handlePrintAll();
      }, 1500);
    } catch {
      toast.error("Erreur lors de la préparation du PDF");
      setIsPreparingPDF(false);
    }
  };

  // =========================================================================
  // 7. DATA FETCHING (CRUD)
  // =========================================================================
  const loadData = async () => {
    try {
      // Fetch teachers, subjects AND classes at once
      const [resEns, resMat, resCls] = await Promise.all([
        axiosClient.get('/enseignants'),
        axiosClient.get('/matieres'),
        axiosClient.get('/classes') // NEW
      ]);
      setEnseignants(resEns.data);
      setMatieres(resMat.data);
      setClasses(resCls.data); // NEW
      
      const initialExpanded = {};
      resMat.data.forEach(m => { initialExpanded[m.id] = true; });
      initialExpanded['sans_matiere'] = true;
      setExpandedGroups(initialExpanded);
      
      setLoading(false);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erreur lors du chargement des données.");
      setLoading(false);
    }
  };

  useEffect(() => { 
    loadData(); 
  }, []);

  // =========================================================================
  // 8. UI HANDLERS & HELPERS
  // =========================================================================
  const toggleGroup = (groupId) => setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));

  // NEW: Handle checking/unchecking specific classes
  const handleClasseChange = (classId) => {
    setFormData(prev => {
      if (prev.classes_ids.includes(classId)) {
        // If already selected, remove it
        return { ...prev, classes_ids: prev.classes_ids.filter(id => id !== classId) };
      }
      // If not selected, add it
      return { ...prev, classes_ids: [...prev.classes_ids, classId] };
    });
  };

  const openAddModal = (defaultMatiereId = '') => {
    setEditingId(null);
    setFormData({ 
      nom: '', 
      prenom: '', 
      matiere_id: defaultMatiereId, 
      max_heures: 24, // Default hours
      classes_ids: [] // Empty classes array
    });
    setIsModalOpen(true);
  };

  const openEditModal = (prof) => {
    setEditingId(prof.id);
    setFormData({
      nom: prof.nom, 
      prenom: prof.prenom, 
      matiere_id: prof.matiere_id || '',
      max_heures: prof.max_heures || 24,
      // Extract class IDs from the pivot relation
      classes_ids: prof.classes ? prof.classes.map(c => c.id) : [] 
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.classes_ids.length === 0) { 
      toast.error("⚠️ Veuillez sélectionner au moins une classe !"); 
      return; 
    }
    try {
      if (editingId) {
        await axiosClient.put(`/enseignants/${editingId}`, formData);
        toast.success("Professeur modifié avec succès !");
      } else {
        await axiosClient.post('/enseignants', formData);
        toast.success("Professeur ajouté avec succès !");
      }
      setIsModalOpen(false); 
      setEditingId(null); 
      loadData(); 
    } catch (error) { 
        toast.error(error.response?.data?.message || "Erreur lors de l'enregistrement du professeur."); 
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer ce professeur ?")) {
      try {
        await axiosClient.delete(`/enseignants/${id}`);
        setEnseignants(enseignants.filter(prof => prof.id !== id));
        toast.success("Professeur supprimé avec succès !");
      } catch { 
        toast.error("Erreur lors de la suppression !"); 
      }
    }
  };

  const handleViewEmploi = async (prof) => {
    setCurrentProf(prof);
    setShowEmploiModal(true);
    setLoadingEmploi(true);
    try {
      const res = await axiosClient.get(`/seances?enseignant_id=${prof.id}`);
      setProfSeances(res.data);
    } catch {
      toast.error("Erreur lors du chargement de l'emploi du temps.");
    } finally {
      setLoadingEmploi(false);
    }
  };

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

  // Group classes by level for the Checkbox UI in the Modal
  const classesByNiveau = classes.reduce((acc, cls) => {
    if (!acc[cls.niveau]) acc[cls.niveau] = [];
    acc[cls.niveau].push(cls);
    return acc;
  }, {});

  const renderTable = (profData, seancesData) => {
    const totalHours = seancesData.reduce((sum, s) => {
      const hDebut = parseInt(s.heure_debut.substring(0, 2));
      const hFin = parseInt(s.heure_fin.substring(0, 2));
      return sum + (hFin - hDebut);
    }, 0);

    return (
      <div className="print-container bg-white p-8 rounded-xl shadow-sm print:p-0 print:shadow-none mx-auto w-full max-w-[29.7cm]">
        <div className="text-center mb-8 border-b-4 border-black pb-4">
          <h1 className="text-4xl font-black uppercase tracking-tighter text-gray-900 mb-4">EMPLOI DU TEMPS</h1>
          <div className="flex justify-between items-end px-4">
            <span className="text-sm font-bold text-gray-500 uppercase tracking-widest">Année Scolaire: 2025/2026</span>
            <div className="text-right">
              <span className="block text-2xl font-black text-indigo-800 uppercase tracking-tight">Professeur: {profData?.nom} {profData?.prenom}</span>
              <div className="flex justify-end gap-2 mt-1">
                <span className="inline-block bg-gray-100 px-3 py-1 rounded text-sm font-black text-gray-700 uppercase tracking-widest">
                  Matière: {profData?.matiere?.nom_matiere || 'Aucune'}
                </span>
                <span className="inline-block bg-indigo-50 border border-indigo-200 text-indigo-800 px-3 py-1 rounded text-sm font-black uppercase tracking-widest shadow-sm">
                  Charge: {totalHours}h / {profData?.max_heures || 24}h
                </span>
              </div>
            </div>
          </div>
        </div>

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
                  <td colSpan="2" className="p-1 align-top border-2 border-black">
                    <div className="grid grid-cols-4 gap-1 h-full">
                      {morning.map(s => (
                        <div 
                          key={s.id} 
                          style={getGridStyleMatin(s.heure_debut, s.heure_fin)}
                          className="border-2 border-gray-800 p-2 flex flex-col justify-center items-center bg-indigo-50/40 rounded-lg"
                        >
                          <span className="text-[11px] font-black text-gray-900 bg-white border border-gray-300 px-3 rounded-full mb-1 shadow-sm">
                            {s.heure_debut.slice(0,5)} - {s.heure_fin.slice(0,5)}
                          </span>
                          <span className="text-sm font-black uppercase text-center text-indigo-900 tracking-tight mt-1">
                            {s.classe?.nom_classe} <span className="text-indigo-500">(N{s.classe?.niveau})</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </td>
                  
                  <td className="bg-gray-200 border-2 border-black"></td>
                  
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
        <div className="mt-4 text-[9px] font-bold text-right text-gray-400 uppercase italic">
          Document généré le {new Date().toLocaleDateString()} - School Planner System
        </div>
      </div>
    );
  };

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

    // Extract unique levels taught by the teacher from their assigned classes
    const uniqueNiveaux = prof.classes ? [...new Set(prof.classes.map(c => c.niveau))].sort((a,b) => a-b) : [];

    return (
      <tr key={prof.id} className="hover:bg-indigo-50/40 border-b border-gray-100 transition-colors bg-white">
        <td className="py-4 px-4 font-black text-gray-900 w-[20%]">
          <div className="flex items-center gap-2">
            <span className="text-indigo-600 bg-indigo-50 p-2 rounded-lg">
              <MdPerson size={20} />
            </span>
            <span className="text-gray-800"
              dangerouslySetInnerHTML={{
                __html: highlight(`${prof.nom} ${prof.prenom}`)
              }}
            />
          </div>
        </td>
        
        <td className="py-4 px-4 text-center w-[15%]">
          <div className="flex justify-center gap-1 flex-wrap">
            {uniqueNiveaux.map((niv, idx) => (
              <span key={idx} className="bg-gray-100 text-gray-600 border border-gray-200 text-[9px] px-2 py-1 rounded-md font-black shadow-sm">N{niv}</span>
            ))}
          </div>
        </td>

        <td className="py-4 px-4 w-[25%]">
          <div className="flex flex-wrap gap-1">
            {prof.classes && prof.classes.length > 0 ? (
              prof.classes.map((cls, idx) => (
                <span key={idx} className="bg-indigo-50 border border-indigo-100 text-indigo-700 text-[9px] px-2 py-1 rounded font-black uppercase shadow-sm">
                  {cls.nom_classe}
                </span>
              ))
            ) : <span className="text-[10px] font-bold text-gray-400 italic bg-gray-50 px-2 py-1 rounded">Aucune classe</span>}
          </div>
        </td>

        <td className="py-4 px-4 w-[15%]">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[11px] font-black text-gray-700">{heuresActuelles}h / {prof.max_heures}h</span>
            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${pourcentage >= 100 ? 'bg-red-50 text-red-600 animate-pulse' : 'bg-gray-100 text-gray-500'}`}>
              {Math.round(pourcentage)}%
            </span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden shadow-inner">
            <div className={`h-full ${barColor} transition-all duration-1000 ease-out`} style={{ width: `${pourcentage}%` }}></div>
          </div>
        </td>

        <td className="py-4 px-4 text-right space-x-2 w-[25%]">
          <button onClick={() => handleViewEmploi(prof)} className="text-indigo-600 hover:text-white bg-indigo-50 hover:bg-indigo-600 px-3 py-2 rounded-lg font-black text-[10px] transition-all uppercase shadow-sm cursor-pointer" title="Voir l'emploi">
            <MdOutlineCalendarMonth size={18} />
          </button>
          <button onClick={() => openEditModal(prof)} className="text-blue-600 hover:text-white bg-blue-50 hover:bg-blue-600 px-3 py-2 rounded-lg font-black text-[10px] transition-all uppercase shadow-sm cursor-pointer" title="Modifier">
            <FiEdit size={18} />
          </button>
          <button onClick={() => handleDelete(prof.id)} className="text-red-500 hover:text-white bg-red-50 hover:bg-red-500 px-3 py-2 rounded-lg font-black text-[10px] transition-all uppercase shadow-sm cursor-pointer" title="Supprimer">
            <FiTrash2 size={18} />
          </button>
        </td>
      </tr>
    );
  };

  const searchWords = search.toLowerCase().trim().split(/\s+/);

  const enseignantsGroupes = matieres.map(mat => ({
    matiere: mat, 
    profs: enseignants.filter(e => {
      const fullName = `${e.nom} ${e.prenom}`.toLowerCase();
      return (
        e.matiere_id === mat.id &&
        searchWords.every(word => fullName.includes(word))
      );
    })
  })).filter(g => g.profs.length > 0); 

  const profsSansMatiere = enseignants.filter(e => {
    const fullName = `${e.nom} ${e.prenom}`.toLowerCase();
    return (
      !e.matiere_id && 
      searchWords.every(word => fullName.includes(word))
    );
  });

  if (profsSansMatiere.length > 0) {
    enseignantsGroupes.push({
      matiere: { id: 'sans_matiere', nom_matiere: 'SANS MATIÈRE (À Configurer)' },
      profs: profsSansMatiere
    });
  }
  
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <div className="text-4xl animate-bounce mb-4 text-indigo-600"><MdPerson/></div>
        <div className="text-indigo-400 font-black uppercase tracking-widest text-sm animate-pulse">
          Chargement du personnel...
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 p-6 min-h-screen">
      <Toaster position="top-right" /> 
      
      {/* 1. CONTROL PANEL */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className='w-full md:w-[350px] relative'>
          <input
            type="text"
            placeholder='Rechercher un enseignant...'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border-2 border-gray-200 focus:border-indigo-600 p-3 px-4 rounded-xl font-bold text-sm text-gray-800 outline-none transition-colors shadow-sm"
          />
        </div>
        <div className="flex gap-4 items-center w-full md:w-auto">
          <button onClick={telechargerTous} disabled={isPreparingPDF || enseignants.length === 0} className="w-full md:w-auto bg-gray-900 hover:bg-black text-white px-5 py-3 rounded-xl font-black shadow-lg uppercase text-xs transition-all disabled:opacity-50 cursor-pointer">
            {isPreparingPDF ? (  
              <div className="flex items-center justify-center gap-2">
                <FiLoader size={16} className="animate-spin" />
                PRÉPARATION...
              </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <FiDownload size={16} />
                  TÉLÉCHARGER TOUT
                </div>
            )}
          </button>
          
          <button onClick={() => openAddModal()} className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-black shadow-lg shadow-indigo-200 transition-all uppercase text-xs cursor-pointer">
            + Ajouter Prof
          </button>
        </div>
      </div>

      {/* 2. TREE VIEW (ARBORESCENCE) */}
      <div className="space-y-6">
        {enseignantsGroupes.map(groupe => (
          <div key={groupe.matiere.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            
            <div
             onClick={() => toggleGroup(groupe.matiere.id)} 
             className="bg-white hover:bg-gray-50 border-b border-gray-100 text-gray-800 p-5 flex justify-between items-center transition-colors select-none cursor-pointer group"
            >
              <div className="flex items-center gap-4">
                <span className="text-indigo-600 bg-indigo-50 p-2 rounded-xl group-hover:bg-indigo-100 transition-colors">
                  {expandedGroups[groupe.matiere.id] ? <MdFolderOpen size={24} /> : <MdFolder size={24} />}
                </span>
                <h3 className="font-black uppercase tracking-widest text-sm text-gray-900">{groupe.matiere.nom_matiere}</h3>
              </div>
              
              <div className='flex items-center gap-3'>
                {groupe.matiere.id !== 'sans_matiere' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation(); 
                      openAddModal(groupe.matiere.id);
                    }}
                    className="flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white px-3 py-1.5 rounded-lg text-[10px] font-black tracking-widest uppercase transition-all shadow-sm cursor-pointer border border-transparent hover:border-indigo-600"
                    title={`Ajouter un prof de ${groupe.matiere.nom_matiere}`}
                  >
                    <FiUserPlus size={14} /> Ajouter
                  </button>
                )}
                
                <span className="bg-indigo-100 text-indigo-800 px-4 py-1.5 rounded-lg text-xs font-black tracking-widest uppercase shadow-sm">
                  {groupe.profs.length} Prof(s)
                </span>
              </div>
            </div>
            
            {expandedGroups[groupe.matiere.id] && (
              <div className="overflow-x-auto bg-gray-50/50 p-4">
                <table className="w-full text-left border-collapse bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 text-[10px] uppercase tracking-widest border-b border-gray-200">
                      <th className="py-4 px-4 font-black">Professeur</th>
                      <th className="py-4 px-4 font-black text-center">Niv. Autorisés</th>
                      <th className="py-4 px-4 font-black">Classes (Réel)</th>
                      <th className="py-4 px-4 font-black">Charge Actuelle</th>
                      <th className="py-4 px-4 font-black text-right">Actions</th>
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

        {search && enseignantsGroupes.length === 0 ? (
          <div className="text-center py-20 text-gray-400 font-black text-xl uppercase tracking-widest bg-white rounded-2xl border border-gray-100 border-dashed">
            Aucun résultat trouvé pour "{search}"
          </div>
        ) : enseignants.length === 0 && (
          <div className="text-center py-20 text-gray-300 font-black text-2xl uppercase tracking-tighter bg-white rounded-2xl border border-gray-100 border-dashed">
            Aucun enseignant configuré
          </div>
        )}
      </div>

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

      {/* 4. CRUD MODAL (ADD / EDIT) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 no-print">
          <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-2xl border-t-8 border-indigo-600 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-black mb-6 uppercase tracking-tighter text-gray-800">
              {editingId ? "Modifier Professeur" : "Ajouter Professeur"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-5">
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Nom</label>
                  <input type="text" required className="w-full border-2 border-gray-200 p-3 rounded-xl focus:border-indigo-600 font-bold text-gray-900 outline-none transition-colors" value={formData.nom} onChange={(e) => setFormData({...formData, nom: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Prénom</label>
                  <input type="text" required className="w-full border-2 border-gray-200 p-3 rounded-xl focus:border-indigo-600 font-bold text-gray-900 outline-none transition-colors" value={formData.prenom} onChange={(e) => setFormData({...formData, prenom: e.target.value})} />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Matière</label>
                  <select required className="w-full border-2 border-gray-200 p-3 rounded-xl focus:border-indigo-600 font-black text-indigo-700 text-xs uppercase outline-none transition-colors cursor-pointer" value={formData.matiere_id} onChange={(e) => setFormData({...formData, matiere_id: e.target.value})}>
                    <option value="">-- Choisir --</option>
                    {matieres.map(mat => <option key={mat.id} value={mat.id}>{mat.nom_matiere}</option>)}
                  </select>
                </div>
                {/* NEW: Max Heures instead of Nombre Groupes Max */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Max Heures / Semaine</label>
                  <input type="number" min="1" required className="w-full border-2 border-gray-200 p-3 rounded-xl focus:border-indigo-600 font-black text-gray-900 outline-none transition-colors" value={formData.max_heures} onChange={(e) => setFormData({...formData, max_heures: parseInt(e.target.value)})} />
                </div>
              </div>
              
              {/* NEW: Explicit Classes Selection grouped by Niveau */}
              <div className="space-y-3 pt-2 bg-gray-50 p-5 rounded-2xl border border-gray-100">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">
                  Classes Assignées (Cochez les classes exactes)
                </label>
                
                {Object.keys(classesByNiveau).length === 0 ? (
                  <p className="text-xs text-red-500 font-bold italic">Aucune classe n'est configurée dans le système.</p>
                ) : (
                  Object.entries(classesByNiveau).sort(([a], [b]) => a - b).map(([niveau, listeClasses]) => (
                    <div key={niveau} className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                      <h4 className="text-xs font-black text-indigo-600 uppercase mb-2 tracking-widest">Niveau {niveau}</h4>
                      <div className="flex flex-wrap gap-2">
                        {listeClasses.map(cls => (
                          <label key={cls.id} className={`flex items-center gap-2 font-black text-xs px-3 py-1.5 rounded-lg border-2 cursor-pointer transition-all ${formData.classes_ids.includes(cls.id) ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-indigo-300'}`}>
                            <input 
                              type="checkbox" 
                              className="hidden" 
                              checked={formData.classes_ids.includes(cls.id)} 
                              onChange={() => handleClasseChange(cls.id)} 
                            /> 
                            {cls.nom_classe}
                          </label>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
                <button type="button" onClick={() => { setIsModalOpen(false); setEditingId(null); }} className="px-6 py-3 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 font-black uppercase text-xs tracking-widest transition-colors cursor-pointer">Annuler</button>
                <button type="submit" className={`px-8 py-3 text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-lg transition-all cursor-pointer ${editingId ? 'bg-blue-500 hover:bg-blue-600 shadow-blue-200' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'}`}>
                  {editingId ? "✓ Modifier" : "✓ Enregistrer"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* 5. SINGLE SCHEDULE PREVIEW MODAL */}
      {showEmploiModal && currentProf && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 no-print">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl border-t-8 border-gray-900 flex flex-col max-h-[95vh] overflow-hidden">
            
            <div className="p-6 flex justify-between items-center border-b border-gray-100 bg-white z-10 shadow-sm">
              <div>
                <h2 className="text-xl font-black uppercase tracking-tighter text-gray-800 flex items-center gap-3">
                  <MdOutlineCalendarMonth className="text-indigo-600" size={24} />
                  Aperçu de l'Emploi
                </h2>
              </div>
              <div className="flex gap-3">
                <button onClick={handlePrintSingle} className="bg-gray-900 hover:bg-black text-white px-6 py-2.5 rounded-xl font-black text-xs uppercase shadow-lg shadow-gray-200 transition-all flex items-center gap-2 cursor-pointer">
                  <span className="text-lg"><FiPrinter /></span> Imprimer
                </button>
                <button onClick={() => setShowEmploiModal(false)} className="text-gray-400 hover:text-red-500 hover:bg-red-50 w-10 h-10 rounded-full font-black text-xl flex items-center justify-center transition-colors cursor-pointer border border-gray-100 hover:border-red-100">
                  <FiX />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto bg-gray-100">
              {loadingEmploi ? (
                <div className="py-20 flex flex-col items-center justify-center gap-4 text-indigo-400 font-black animate-pulse uppercase tracking-widest">
                  <FiLoader size={30} className="animate-spin" />
                  Chargement de l'emploi...
                </div>
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