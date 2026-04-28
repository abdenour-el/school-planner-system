import { useState, useEffect, useRef, useCallback } from 'react';
import axiosClient from '../axiosClient';
import { useReactToPrint } from 'react-to-print';
import { useLocation } from 'react-router-dom';
import { FiCalendar, FiDownload, FiFileText, FiTrash2, FiLoader, FiX, FiPlus, FiBell } from 'react-icons/fi';
import { MdAutoAwesome, MdOutlineCalendarMonth } from 'react-icons/md';
import { FaSchool, FaBook } from 'react-icons/fa';
import toast, { Toaster } from 'react-hot-toast'; 

export default function Emploi() {
  // =========================================================================
  // DATA STATES
  // =========================================================================
  const [classes, setClasses] = useState([]);
  const [matieres, setMatieres] = useState([]);
  const [enseignants, setEnseignants] = useState([]);
  
  // =========================================================================
  // SELECTION STATES
  // =========================================================================
  const [selectedNiveau, setSelectedNiveau] = useState('');
  const [selectedClasseId, setSelectedClasseId] = useState('');
  
  // =========================================================================
  // SCHEDULE STATES
  // =========================================================================
  const [seances, setSeances] = useState([]);
  const [loading, setLoading] = useState(false);

  // =========================================================================
  // NIVEAU DISPLAY & PRINT STATES
  // =========================================================================
  const [allSeancesNiveau, setAllSeancesNiveau] = useState([]);
  const [showNiveauTables, setShowNiveauTables] = useState(false);
  const niveauComponentRef = useRef(null);
  
  // =========================================================================
  // AUTO-GENERATION STATES
  // =========================================================================
  const [loadingAuto, setLoadingAuto] = useState(false);
  const [loadingBulk, setLoadingBulk] = useState(false);
  const [bulkProgress, setBulkProgress] = useState('');

  // =========================================================================
  // MODAL STATES (ADD / EDIT)
  // =========================================================================
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSeanceId, setEditingSeanceId] = useState(null); 
  const [formData, setFormData] = useState({
    matiere_id: '', enseignant_id: '', jour: 'Lundi', heure_debut: '09:00', heure_fin: '11:00'
  });

  // =========================================================================
  // STATES FOR "DOWNLOAD ALL" FEATURE
  // =========================================================================
  const [allSeances, setAllSeances] = useState([]);
  const allComponentRef = useRef(null);

  // =========================================================================
  // DROPDOWN MENUS STATES
  // =========================================================================
  const [showDownloadOptions, setShowDownloadOptions] = useState(false);
  const [showClearOptions, setShowClearOptions] = useState(false);
  
  // =========================================================================
  // NOTIFICATION HISTORY STATE
  // =========================================================================
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  const jours = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];
  const componentRef = useRef(null);
  const selectedClasse = classes.find(c => c.id === Number(selectedClasseId));
  
  const location = useLocation();

  // =========================================================================
  // CUSTOM NOTIFICATION SYSTEM (TOAST + HISTORY)
  // =========================================================================
  const notify = (message, type = 'success') => {
    // 1. Show the Toast
    if (type === 'success') toast.success(message, { duration: 4000 });
    else if (type === 'error') toast.error(message, { duration: 6000 });
    else toast(message);

    // 2. Save to History
    const newNotif = {
      id: Date.now(),
      message,
      type,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setNotifications(prev => [newNotif, ...prev]); 
  };

  // =========================================================================
  // PRINT & DOWNLOAD FUNCTIONS
  // =========================================================================
  const handlePrintSingle = useReactToPrint({
    contentRef: componentRef,
    documentTitle: selectedClasse ? `Emploi_${selectedClasse.nom_classe}` : 'Emploi_Classe',
  });

  const handlePrintAll = useReactToPrint({
    contentRef: allComponentRef,
    documentTitle: 'Tous_Les_Emplois_Classes',
  });

  const telechargerTous = async () => {
    if (!window.confirm("Générer le PDF pour TOUTES les classes ? Cela peut prendre quelques secondes.")) return;
    try {
      const res = await axiosClient.get('/seances');
      setAllSeances(res.data);
      setTimeout(() => {
        handlePrintAll();
      }, 1500);
    } catch {
      notify("Erreur lors de la préparation du PDF", 'error');
    }
  };

  const handlePrintNiveau = useReactToPrint({
    contentRef: niveauComponentRef,
    documentTitle: selectedNiveau 
      ? `Emplois_Niveau_${selectedNiveau}` 
      : 'Emplois_Niveau',
  });

  const telechargerNiveau = async () => {
    if (!selectedNiveau) {
      notify("Choisissez un niveau d'abord.", 'error');
      return;
    }
    if (!window.confirm(`Télécharger les emplois du niveau ${selectedNiveau} ?`)) return;

    try {
      const res = await axiosClient.get('/seances');
      const classesNiveau = classes.filter(c => c.niveau === parseInt(selectedNiveau));
      const ids = classesNiveau.map(c => c.id);
      const filtered = res.data.filter(s => ids.includes(s.classe_id));

      setAllSeancesNiveau(filtered);
      setShowNiveauTables(true);

      setTimeout(() => {
        handlePrintNiveau();
      }, 1200);

    } catch {
      notify("Erreur lors du téléchargement du niveau", 'error');
    }
  };

  // =========================================================================
  // DATA FETCHING (CRUD)
  // =========================================================================
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [resCls, resMat, resEns] = await Promise.all([
          axiosClient.get('/classes'),
          axiosClient.get('/matieres'),
          axiosClient.get('/enseignants')
        ]);
        setClasses(resCls.data); 
        setMatieres(resMat.data); 
        setEnseignants(resEns.data);
      } catch (error) { 
        console.error(error); 
      }
    };
    fetchInitialData();
  }, []);

  const fetchEmploi = useCallback(async () => {
    if (!selectedClasseId) return;
    setLoading(true);
    try {
      const res = await axiosClient.get(`/seances?classe_id=${selectedClasseId}`);
      setSeances(res.data);
    } catch (error) { 
      console.error(error); 
    } finally { 
      setLoading(false); 
    }
  }, [selectedClasseId]);

  useEffect(() => {
    if (selectedClasseId) fetchEmploi();
    else setSeances([]);
  }, [selectedClasseId, fetchEmploi]);

  useEffect(() => {
    if (!location.state?.classeId){ 
      setSelectedClasseId('');
    }
  }, [selectedNiveau, location.state?.classeId]); 

  useEffect(() => {
    const fetchNiveauSeances = async () => {
      if (selectedNiveau && !selectedClasseId) {
        try {
          const res = await axiosClient.get('/seances');
          const classesNiveau = classes.filter(c => c.niveau === parseInt(selectedNiveau));
          const ids = classesNiveau.map(c => c.id);
          const filtered = res.data.filter(s => ids.includes(s.classe_id));

          setAllSeancesNiveau(filtered);
          setShowNiveauTables(true);
        } catch (err) {
          console.error(err);
        }
      } else {
        setShowNiveauTables(false);
      }
    };
    fetchNiveauSeances();
  }, [selectedNiveau, selectedClasseId, classes]);

  useEffect(() => {
    if (location.state?.classeId) {
      setSelectedClasseId(location.state.classeId);
      setSelectedNiveau(location.state.niveau);
      setShowNiveauTables(false);
    }
  }, [location.state]);

  // =========================================================================
  // GENERATION & CLEAR FUNCTIONS
  // =========================================================================
  const handleAutoGenerateSingle = async () => {
    if (!selectedClasseId) return;
    if (!window.confirm("⚠️ Attention: L'emploi actuel de cette classe sera écrasé. Continuer ?")) return;
    
    setLoadingAuto(true);
    try {
      const res = await axiosClient.post('/generate-emploi', { classe_id: selectedClasseId });
      notify(res.data.message, 'success');
      fetchEmploi();
    } catch (err) {
      notify(err.response?.data?.message || "Erreur critique du serveur.", 'error');
    } finally {
      setLoadingAuto(false);
    }
  };

  const handleAutoGenerateByLevel = async () => {
    if (!selectedNiveau) {
      notify("Choisissez un niveau.", 'error');
      return;
    }
    
    setLoadingBulk(true);
    setBulkProgress("loading");

    try {
      const res = await axiosClient.post('/generate-all', { niveau: selectedNiveau });
      notify(res.data.message, 'success');
      fetchEmploi();
    } catch (err) {
      // 🔥 FIX: Now properly checks for the 422 error from the backend and triggers the 'error' (red) notification type.
      const isValidationOrLogicError = err.response?.status === 422;
      notify(
        err.response?.data?.message || "Erreur lors de la génération.", 
        isValidationOrLogicError ? 'error' : 'error'
      );
    } finally {
      setLoadingBulk(false);
      setBulkProgress('');
    }
  };

  const handleViderClasse = async () => {
    if (!selectedClasseId) { notify("Choisissez une classe d'abord.", 'error'); return; }
    if (!window.confirm(`Voulez-vous vraiment vider l'emploi de la classe sélectionnée ?`)) return;
    
    try {
      await axiosClient.delete(`/seances/clear-classe/${selectedClasseId}`);
      fetchEmploi();
      notify("L'emploi de la classe a été vidé.", 'success');
    } catch {
      notify("Erreur lors de la suppression de l'emploi.", 'error');
    }
  };

  const handleViderNiveau = async () => {
    if (!selectedNiveau) { notify("Choisissez un niveau d'abord.", 'error'); return; }
    if (!window.confirm(`⚠️ ATTENTION : Voulez-vous vraiment vider TOUS les emplois du Niveau ${selectedNiveau} ?`)) return;
    
    try {
      await axiosClient.post(`/seances/clear-niveau`, { niveau: selectedNiveau });
      fetchEmploi();
      if(selectedNiveau && !selectedClasseId) setAllSeancesNiveau([]); 
      notify(`Tous les emplois du Niveau ${selectedNiveau} ont été vidés.`, 'success');
    } catch {
      notify("Erreur lors de la suppression des emplois du niveau.", 'error');
    }
  };

  const handleViderTout = async () => {
    if (!window.confirm("🚨 ALERTE ROUGE : Voulez-vous vraiment vider TOUTE la base de données des emplois ? Cette action est irréversible !")) return;
    
    try {
      await axiosClient.post('/seances/reset'); 
      setSeances([]);
      setAllSeancesNiveau([]);
      notify("Tous les emplois ont été effacés avec succès.", 'success');
    } catch {
      notify("Erreur lors de la réinitialisation totale.", 'error');
    }
  };

  // =========================================================================
  // MODALS (ADD / EDIT)
  // =========================================================================
  const openAddModal = () => {
    if (!selectedClasseId) { notify("Choisissez une classe d'abord.", 'error'); return; }
    setEditingSeanceId(null);
    setFormData({ matiere_id: '', enseignant_id: '', jour: 'Lundi', heure_debut: '09:00', heure_fin: '11:00' });
    setIsModalOpen(true);
  };

  const openEditModal = (seance) => {
    setEditingSeanceId(seance.id);
    setFormData({
      matiere_id: seance.matiere_id, 
      enseignant_id: seance.enseignant_id,
      jour: seance.jour, 
      heure_debut: seance.heure_debut.slice(0, 5), 
      heure_fin: seance.heure_fin.slice(0, 5)
    });
    setIsModalOpen(true);
  };

  const handleSaveSeance = async (e) => {
    e.preventDefault();
    const payload = { ...formData, classe_id: selectedClasseId };
    try {
      if (editingSeanceId) {
        await axiosClient.put(`/seances/${editingSeanceId}`, payload);
        notify("Séance modifiée avec succès.", 'success');
      } else {
        await axiosClient.post('/seances', payload);
        notify("Séance ajoutée avec succès.", 'success');
      }
      setIsModalOpen(false); 
      fetchEmploi();
    } catch (error) { 
      notify(error.response?.data?.message || "Erreur de conflit d'horaire.", 'error'); 
    }
  };

  const handleDeleteSeance = async () => {
    if (!window.confirm("Supprimer cette séance ?")) return;
    try {
      await axiosClient.delete(`/seances/${editingSeanceId}`);
      notify("Séance supprimée.", 'success');
      setIsModalOpen(false); 
      fetchEmploi();
    } catch { 
      notify("Erreur lors de la suppression.", 'error'); 
    }
  };

  // =========================================================================
  // GRID STYLING & TABLE RENDERER
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

  const renderTable = (classeData, seancesData) => (
    <div className="print-container bg-white p-4 rounded-xl shadow-sm print:p-0 print:shadow-none mx-auto w-full max-w-[29.7cm] scale-[0.85] origin-top">
      <div className="text-center mb-8 border-b-4 border-black pb-4">
        <h1 className="text-4xl font-black uppercase tracking-tighter text-gray-900 mb-4">EMPLOI DU TEMPS</h1>
        <div className="flex justify-between items-end px-4">
          <span className="text-sm font-bold text-gray-500 uppercase tracking-widest">Année Scolaire: 2025/2026</span>
          <div className="text-right">
            <span className="block text-2xl font-black text-indigo-800 uppercase tracking-tight">Classe: {classeData?.nom_classe}</span>
            <span className="inline-block bg-gray-100 px-3 py-1 mt-1 rounded text-sm font-black text-gray-700 uppercase tracking-widest">Niveau {classeData?.niveau}</span>
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
                        onClick={() => openEditModal(s)} 
                        style={getGridStyleMatin(s.heure_debut, s.heure_fin)} 
                        className="border-2 border-gray-800 p-2 flex flex-col justify-center items-center bg-indigo-50/40 rounded-lg cursor-pointer hover:bg-indigo-100 hover:ring-2 hover:ring-indigo-400 transition-all print:cursor-default print:hover:ring-0 print:hover:bg-indigo-50/40"
                      >
                        <span className="text-[11px] font-black text-gray-900 bg-white border border-gray-300 px-3 rounded-full mb-1 shadow-sm">{s.heure_debut.slice(0,5)} - {s.heure_fin.slice(0,5)}</span>
                        <span className="text-sm font-black uppercase text-center text-indigo-900 tracking-tight mt-1">{s.matiere?.nom_matiere}</span>
                        <span className="text-[9px] font-bold text-indigo-600 uppercase mt-1 tracking-widest">{s.enseignant?.nom}</span>
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
                          onClick={() => openEditModal(s)} 
                          style={getGridStyleSoir(s.heure_debut, s.heure_fin)} 
                          className="border-2 border-gray-800 p-2 flex flex-col justify-center items-center bg-orange-50/40 rounded-lg cursor-pointer hover:bg-orange-100 hover:ring-2 hover:ring-orange-400 transition-all print:cursor-default print:hover:ring-0 print:hover:bg-orange-50/40"
                        >
                          <span className="text-[11px] font-black text-gray-900 bg-white border border-gray-300 px-3 rounded-full mb-1 shadow-sm">{s.heure_debut.slice(0,5)} - {s.heure_fin.slice(0,5)}</span>
                          <span className="text-sm font-black uppercase text-center text-orange-900 tracking-tight mt-1">{s.matiere?.nom_matiere}</span>
                          <span className="text-[9px] font-bold text-orange-600 uppercase mt-1 tracking-widest">{s.enseignant?.nom}</span>
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
      <div className="mt-4 text-[9px] font-bold text-right text-gray-400 uppercase italic">Document généré le {new Date().toLocaleDateString()} - School Planner System</div>
    </div>
  );

  const niveauxDisponibles = [...new Set(classes.map(c => c.niveau))].sort((a, b) => a - b);
  const classesFiltrees = selectedNiveau ? classes.filter(c => c.niveau === parseInt(selectedNiveau)) : classes;

  return (
    <div className="bg-gray-50 p-6 min-h-screen">
      <Toaster position="top-right" reverseOrder={false} />

      {/* 1. CONTROL PANEL */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6 no-print">
        <div className="flex flex-col gap-4">

          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-black text-gray-900 tracking-tighter uppercase flex items-center gap-2 ">
            <div className='flex items-center gap-2'>
              <MdOutlineCalendarMonth />
              EMPLOIS DES CLASSES
            </div>
            </h1>

            <div className="flex flex-wrap items-center justify-between gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
              <div className="flex flex-wrap items-center gap-3">
                {/* Niveau Selector */}
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-black text-gray-500 uppercase tracking-widest">Niveau:</span>
                  <select className="border-2 border-indigo-200 bg-white text-indigo-900 font-black px-4 py-2 rounded-lg text-xs outline-none focus:border-indigo-600 shadow-sm cursor-pointer" value={selectedNiveau} onChange={e => setSelectedNiveau(e.target.value)}>
                    <option value="">-- TOUS --</option>
                    {niveauxDisponibles.map(niv => <option key={niv} value={niv}>Niveau {niv}</option>)}
                  </select>
                </div>
                {/* Classe Selector */}
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-black text-gray-500 uppercase tracking-widest">Classe:</span>
                  <select className="border-2 border-indigo-200 bg-white text-indigo-900 font-black px-4 py-2 rounded-lg text-xs outline-none focus:border-indigo-600 shadow-sm disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed" value={selectedClasseId} onChange={e => setSelectedClasseId(e.target.value)}>
                    <option value="">-- CHOISIR --</option>
                    {classesFiltrees.map(cls => <option key={cls.id} value={cls.id}>{cls.nom_classe}</option>)}
                  </select>
                </div>

                {/* DOWNLOAD DROPDOWN */}
                <div className="relative ml-2">
                  <button
                    onClick={() => setShowDownloadOptions(!showDownloadOptions)}
                    className="bg-black hover:bg-gray-800 text-white p-2 rounded-xl shadow-lg transition-all cursor-pointer"
                  >
                    <FiDownload size={18} />
                  </button>

                  {showDownloadOptions && (
                    <div
                      className="absolute top-12 left-0 bg-white border rounded-xl shadow-lg py-2 z-50 w-56"
                      onMouseLeave={() => setShowDownloadOptions(false)}
                    >
                      <button onClick={() => { telechargerTous(); setShowDownloadOptions(false); }} className="w-full flex items-center gap-2 px-4 py-2 text-sm font-semibold hover:bg-indigo-50 hover:text-indigo-700 cursor-pointer">
                        <FiFileText size={16} /> Télécharger tout
                      </button>
                      <button onClick={() => { telechargerNiveau(); setShowDownloadOptions(false); }} disabled={!selectedNiveau} className="w-full flex items-center gap-2 px-4 py-2 text-sm font-semibold hover:bg-indigo-50 hover:text-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">
                        <FiCalendar size={16} /> Télécharger niveau
                      </button>
                      <button onClick={() => { handlePrintSingle(); setShowDownloadOptions(false); }} disabled={!selectedClasseId} className="w-full flex items-center gap-2 px-4 py-2 text-sm font-semibold hover:bg-indigo-50 hover:text-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">
                        <FaSchool size={16} /> Télécharger classe
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT SIDE ACTIONS */}
              <div className="flex flex-wrap items-center gap-2">
                {bulkProgress === "loading" && (
                  <div className="text-purple-600 font-black text-xs uppercase animate-pulse mr-4">
                    <div className="flex items-center gap-2">
                      <FiLoader size={18} className="animate-spin" /> Génération...
                    </div>
                  </div>
                )}

                <button onClick={openAddModal} disabled={!selectedClasseId} className="bg-blue-100 text-blue-700 hover:bg-blue-600 hover:text-white px-4 py-2.5 rounded-xl font-black text-xs uppercase transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm flex items-center gap-2">
                  <FiPlus size={16} /> Ajouter
                </button>
                
                <button onClick={handleAutoGenerateByLevel} disabled={loadingBulk || !selectedNiveau} className="bg-purple-100 text-purple-700 hover:bg-purple-600 hover:text-white px-4 py-2.5 rounded-xl font-black text-xs uppercase transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm flex items-center gap-2">
                  <MdAutoAwesome size={16} /> Générer Niveau
                </button>
                
                <button onClick={handleAutoGenerateSingle} disabled={loadingAuto || !selectedClasseId} className="bg-indigo-100 text-indigo-700 hover:bg-indigo-600 hover:text-white px-4 py-2.5 rounded-xl font-black text-xs uppercase transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm flex items-center gap-2">
                  <MdAutoAwesome size={16} /> Générer Classe
                </button>

                {/* NOTIFICATION BELL DROPDOWN */}
                <div className="relative ml-2">
                  <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 p-2.5 rounded-xl transition-all shadow-sm cursor-pointer relative"
                    title="Historique des Notifications"
                  >
                    <FiBell size={18} />
                    {notifications.length > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full shadow-md">
                        {notifications.length}
                      </span>
                    )}
                  </button>

                  {showNotifications && (
                    <div className="absolute top-12 right-0 bg-white border border-gray-200 rounded-xl shadow-2xl py-2 z-50 w-80 max-h-96 overflow-y-auto">
                      <div className="px-4 py-2 border-b flex justify-between items-center bg-gray-50/50 sticky top-0 backdrop-blur-md">
                        <span className="text-xs font-black text-gray-700 uppercase tracking-widest">Historique</span>
                        {notifications.length > 0 && (
                          <button onClick={() => setNotifications([])} className="text-[10px] text-red-500 font-bold hover:underline cursor-pointer uppercase tracking-wider">
                            Vider
                          </button>
                        )}
                      </div>
                      <div className="p-2 flex flex-col gap-2">
                        {notifications.length === 0 ? (
                          <div className="text-center text-xs font-bold text-gray-400 py-6 uppercase tracking-widest">Aucune notification</div>
                        ) : (
                          notifications.map(n => (
                            <div key={n.id} className={`p-3 rounded-lg text-xs border-l-4 ${n.type === 'error' ? 'bg-red-50 border-red-500 text-red-800' : 'bg-green-50 border-green-500 text-green-800'}`}>
                              <div className="flex justify-between items-center mb-1.5">
                                <span className="font-black uppercase text-[10px] tracking-wider opacity-80">{n.type === 'error' ? 'Erreur' : 'Succès'}</span>
                                <span className="text-[9px] font-bold opacity-60 bg-white/50 px-2 py-0.5 rounded-full">{n.time}</span>
                              </div>
                              <div className="font-semibold leading-relaxed whitespace-pre-line">{n.message}</div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* CLEAR OPTIONS DROPDOWN */}
                <div className="relative ml-1">
                  <button
                    onClick={() => setShowClearOptions(!showClearOptions)}
                    className="bg-red-100 hover:bg-red-600 text-red-600 hover:text-white p-2.5 rounded-xl transition-all shadow-sm cursor-pointer"
                    title="Vider les emplois"
                  >
                    <FiX size={18} strokeWidth={3} />
                  </button>

                  {showClearOptions && (
                    <div
                      className="absolute top-12 right-0 bg-white border border-red-100 rounded-xl shadow-xl py-2 z-50 w-64"
                      onMouseLeave={() => setShowClearOptions(false)}
                    >
                      <div className="px-4 py-2 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b mb-1">
                        Options de Suppression
                      </div>
                      <button onClick={() => { handleViderClasse(); setShowClearOptions(false); }} disabled={!selectedClasseId} className="w-full flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-red-50 hover:text-red-600 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">
                        <FiTrash2 size={14} /> Vider cette classe
                      </button>
                      <button onClick={() => { handleViderNiveau(); setShowClearOptions(false); }} disabled={!selectedNiveau} className="w-full flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-red-50 hover:text-red-600 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">
                        <FiTrash2 size={14} /> Vider le niveau complet
                      </button>
                      <div className="border-t my-1"></div>
                      <button onClick={() => { handleViderTout(); setShowClearOptions(false); }} className="w-full flex items-center gap-2 px-4 py-2 text-sm font-black text-red-600 hover:bg-red-600 hover:text-white transition-colors cursor-pointer">
                        <FiTrash2 size={14} /> Vider TOUS LES EMPLOIS
                      </button>
                    </div>
                  )}
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. VISUALIZATION ZONE */}
      {selectedClasseId ? (
        <div className="overflow-x-auto bg-gray-200 p-6 rounded-2xl print:p-0 print:bg-white no-scrollbar">
          {loading ? (
             <div className="py-20 text-center text-indigo-600 font-black animate-pulse uppercase">Chargement...</div>
          ) : (
            <div ref={componentRef}>
              {renderTable(selectedClasse, seances)}
            </div>
          )}
        </div>
      ) : (
        !selectedNiveau && ( 
        <div className="flex flex-col items-center justify-center py-32 text-gray-300 no-print">
          <span className="text-6xl mb-4"><FaSchool /></span><h2 className="text-2xl font-black uppercase tracking-widest">Sélectionnez une classe</h2>
        </div>
        )
      )}
      {showNiveauTables && selectedNiveau && !selectedClasseId && (
        <div className="mt-10 bg-gray-100 p-6 rounded-2xl">
          <h2 className="text-xl font-black mb-6 uppercase text-gray-800">
            <div className='flex items-center gap-2'>
              <FaBook size={18} /> Emplois du Niveau {selectedNiveau}
            </div>
          </h2>
          <div className="space-y-10">
            {classes
              .filter(cls => cls.niveau === parseInt(selectedNiveau))
              .map(cls => {
                const seancesClasse = allSeancesNiveau.filter(s => s.classe_id === cls.id);
                return (
                  <div key={cls.id}>
                    {renderTable(cls, seancesClasse)}
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* 3. HIDDEN CONTAINER FOR PRINTING */}
      <div className="hidden">
        <div ref={allComponentRef} className="w-full bg-white print:m-0 print:p-0">
          {classes.map((cls, index) => {
            const seancesDeCetteClasse = allSeances.filter(s => s.classe_id === cls.id);
            return (
              <div key={cls.id} style={{ pageBreakAfter: index === classes.length - 1 ? 'auto' : 'always' }}>
                {renderTable(cls, seancesDeCetteClasse)}
              </div>
            );
          })}
        </div>
      </div>
      <div className="hidden">
        <div ref={niveauComponentRef}>
          {classes
            .filter(cls => cls.niveau === parseInt(selectedNiveau))
            .map((cls, index, arr) => {
              const seancesClasse = allSeancesNiveau.filter(s => s.classe_id === cls.id);
              return (
                <div key={cls.id} style={{ pageBreakAfter: index === arr.length - 1 ? 'auto' : 'always' }}>
                  {renderTable(cls, seancesClasse)}
                </div>
              );
            })}
        </div>
      </div>

      {/* 4. CRUD MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 no-print">
          <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-lg border-t-8 border-indigo-600">
            <h2 className="text-2xl font-black mb-6 uppercase tracking-tighter text-gray-800">{editingSeanceId ? "Modifier" : "Ajouter"}</h2>
            <form onSubmit={handleSaveSeance} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-500 uppercase">Matière</label>
                  <select required className="w-full border-2 p-3 rounded-xl font-black text-xs uppercase text-indigo-900 focus:border-indigo-600 cursor-pointer" value={formData.matiere_id} onChange={(e) => setFormData({...formData, matiere_id: e.target.value, enseignant_id: ''})}>
                    <option value="">-- Choisir --</option>
                    {matieres.map(m => <option key={m.id} value={m.id}>{m.nom_matiere}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-500 uppercase">Enseignant</label>
                  {/* 🔥 FIXED TEACHER SELECT 🔥 */}
                  <select 
                    required 
                    disabled={!formData.matiere_id} 
                    className="w-full border-2 p-3 rounded-xl font-black text-xs uppercase text-indigo-900 focus:border-indigo-600 disabled:opacity-50 disabled:bg-gray-100 cursor-pointer disabled:cursor-not-allowed" 
                    value={formData.enseignant_id} 
                    onChange={(e) => setFormData({...formData, enseignant_id: e.target.value})}
                  >
                    <option value="">-- Choisir --</option>
                    {enseignants
                      .filter(p => !formData.matiere_id || Number(p.matiere_id) === Number(formData.matiere_id))
                      .filter(p => {
                        const currentNiv = selectedClasse ? selectedClasse.niveau : selectedNiveau;
                        if (!currentNiv || !p.niveaux || p.niveaux.length === 0) return true;
                        return p.niveaux.includes(String(currentNiv)) || p.niveaux.includes(Number(currentNiv));
                      })
                      .map(p => (
                        <option key={p.id} value={p.id}>{p.nom} {p.prenom}</option>
                      ))
                    }
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-500 uppercase">Jour</label>
                  <select required className="w-full border-2 p-3 rounded-xl font-black text-xs uppercase text-indigo-900 focus:border-indigo-600 cursor-pointer" value={formData.jour} onChange={(e) => setFormData({...formData, jour: e.target.value})}>
                    {jours.map(j => <option key={j} value={j}>{j}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-500 uppercase">Début</label>
                  <input type="time" required className="w-full border-2 p-3 rounded-xl font-black text-indigo-900 focus:border-indigo-600 cursor-pointer" value={formData.heure_debut} onChange={(e) => setFormData({...formData, heure_debut: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-500 uppercase">Fin</label>
                  <input type="time" required className="w-full border-2 p-3 rounded-xl font-black text-indigo-900 focus:border-indigo-600 cursor-pointer" value={formData.heure_fin} onChange={(e) => setFormData({...formData, heure_fin: e.target.value})} />
                </div>
              </div>
              <div className="flex justify-between pt-6 border-t mt-6">
                {editingSeanceId ? <button type="button" onClick={handleDeleteSeance} className="px-4 py-2 bg-red-100 text-red-600 rounded-xl hover:bg-red-600 hover:text-white font-black uppercase text-[10px] transition-all cursor-pointer">
                  <div className='flex items-center gap-2'>
                    <FiTrash2 size={18} /> Supprimer
                  </div>
                </button> : <div></div>}
                <div className="flex gap-2">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 bg-gray-100 text-gray-500 rounded-xl font-black uppercase text-xs transition-all hover:bg-gray-200 cursor-pointer">Annuler</button>
                  <button type="submit" className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-black uppercase text-xs shadow-lg transition-all hover:bg-indigo-700 cursor-pointer">✓ Enregistrer</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}