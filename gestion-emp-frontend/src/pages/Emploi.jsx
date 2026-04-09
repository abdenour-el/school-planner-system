import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { useReactToPrint } from 'react-to-print';

export default function Emploi() {
  // --- Data states ---
  const [classes, setClasses] = useState([]);
  const [matieres, setMatieres] = useState([]);
  const [enseignants, setEnseignants] = useState([]);
  
  // --- Selection states ---
  const [selectedNiveau, setSelectedNiveau] = useState('');
  const [selectedClasseId, setSelectedClasseId] = useState('');
  
  // --- Schedule states ---
  const [seances, setSeances] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // --- Auto-generation states ---
  const [loadingAuto, setLoadingAuto] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(''); 

  // --- Modal states (Add/Edit) ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSeanceId, setEditingSeanceId] = useState(null); 
  const [formData, setFormData] = useState({
    matiere_id: '', enseignant_id: '', jour: 'Lundi', heure_debut: '09:00', heure_fin: '11:00'
  });

  // --- States for "DOWNLOAD ALL" feature ---
  const [allSeances, setAllSeances] = useState([]);
  const [isPreparingPDF, setIsPreparingPDF] = useState(false);
  const allComponentRef = useRef(null);


  const [loadingBulk, setLoadingBulk] = useState(false);
  const [bulkProgress, setBulkProgress] = useState('');

  const jours = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];
  const componentRef = useRef(null);
  const selectedClasse = classes.find(c => c.id === parseInt(selectedClasseId));
  
  // =========================================================================
  // PRINT/DOWNLOAD FUNCTIONS
  // =========================================================================
  
  // Print SINGLE class
  const handlePrintSingle = useReactToPrint({
    contentRef: componentRef,
    documentTitle: selectedClasse ? `Emploi_${selectedClasse.nom_classe}` : 'Emploi_Classe',
  });

  // Print ALL classes
  const handlePrintAll = useReactToPrint({
    contentRef: allComponentRef,
    documentTitle: 'Tous_Les_Emplois_Classes',
    onAfterPrint: () => setIsPreparingPDF(false)
  });

  // Fetch all data and trigger the "Print All" function
  const telechargerTous = async () => {
    if (!window.confirm("Générer le PDF pour TOUTES les classes ? Cela peut prendre quelques secondes.")) return;
    setIsPreparingPDF(true);
    try {
      const res = await axios.get('http://127.0.0.1:8000/api/seances');
      setAllSeances(res.data);
      // Wait for React to render the 32 hidden tables before printing
      setTimeout(() => {
        handlePrintAll();
      }, 1500);
    } catch  {
      alert("Erreur lors de la préparation du PDF");
      setIsPreparingPDF(false);
    }
  };

  // =========================================================================
  // DATA FETCHING (CRUD)
  // =========================================================================

  // 1. Load Initial Data
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [resCls, resMat, resEns] = await Promise.all([
          axios.get('http://127.0.0.1:8000/api/classes'),
          axios.get('http://127.0.0.1:8000/api/matieres'),
          axios.get('http://127.0.0.1:8000/api/enseignants')
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

  // 2. Load Selected Class Schedule
  const fetchEmploi = useCallback(async () => {
    if (!selectedClasseId) return;
    setLoading(true);
    try {
      const res = await axios.get(`http://127.0.0.1:8000/api/seances?classe_id=${selectedClasseId}`);
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

  // Reset class selection if level changes
  useEffect(() => {
    setSelectedClasseId('');
  }, [selectedNiveau]);

  // =========================================================================
  // GENERATION & MODALS
  // =========================================================================

  const handleAutoGenerateSingle = async () => {
    if (!selectedClasseId) return;
    if (!window.confirm("⚠️ Attention: L'emploi actuel de cette classe sera écrasé. Continuer ?")) return;
    
    setLoadingAuto(true);
    setGenerationProgress("Génération de la classe en cours...");
    try {
      const res = await axios.post('http://127.0.0.1:8000/api/generate-emploi', { classe_id: selectedClasseId });
      alert(res.data.message);
      fetchEmploi();
    } catch (err) {
      alert(err.response?.data?.message || "Erreur critique du serveur.");
    } finally {
      setLoadingAuto(false);
      setGenerationProgress('');
    }
  };

  const handleAutoGenerateByLevel = async () => {
    if (!selectedNiveau) {
      alert("Choisissez un niveau.");
      return;
    }

    setLoadingBulk(true);
    setBulkProgress("⏳ Génération en cours...");

    try {
      const res = await axios.post('http://127.0.0.1:8000/api/generate-all', {
        niveau: selectedNiveau
      });

      alert(res.data.message + "\n\n" + res.data.details.join("\n"));

      fetchEmploi();

    } catch (err) {
      alert(err.response?.data?.message || "Erreur.");
    } finally {
      setLoadingBulk(false);
      setBulkProgress('');
    }
  };

  const openAddModal = () => {
    if (!selectedClasseId) { alert("Choisissez une classe d'abord."); return; }
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
      if (editingSeanceId) await axios.put(`http://127.0.0.1:8000/api/seances/${editingSeanceId}`, payload);
      else await axios.post('http://127.0.0.1:8000/api/seances', payload);
      setIsModalOpen(false); 
      fetchEmploi();
    } catch (error) { 
      alert(error.response?.data?.message || "Erreur de conflit d'horaire."); 
    }
  };

  const handleDeleteSeance = async () => {
    if (!window.confirm("Supprimer cette séance ?")) return;
    try {
      await axios.delete(`http://127.0.0.1:8000/api/seances/${editingSeanceId}`);
      setIsModalOpen(false); 
      fetchEmploi();
    } catch  { 
      alert("Erreur lors de la suppression."); 
    }
  };

  // =========================================================================
  // GRID STYLING FUNCTIONS (Proportional Sizes)
  // =========================================================================
  
  const getGridStyleMatin = (debut, fin) => {
    const hDebut = parseInt(debut.substring(0, 2));
    const hFin = parseInt(fin.substring(0, 2));
    // Morning starts at 09:00, so 09 is column 1
    return { gridColumn: `${hDebut - 9 + 1} / span ${hFin - hDebut}` };
  };

  const getGridStyleSoir = (debut, fin) => {
    const hDebut = parseInt(debut.substring(0, 2));
    const hFin = parseInt(fin.substring(0, 2));
    // Afternoon starts at 16:00, so 16 is column 1
    return { gridColumn: `${hDebut - 16 + 1} / span ${hFin - hDebut}` };
  };

  // =========================================================================
  // CORE DISPLAY: FUNCTION TO RENDER THE TABLE
  // =========================================================================
  const renderTable = (classeData, seancesData) => (
    // Removed "min-h-[21cm]" to prevent 64-page overflow bug in printing
    <div className="print-container bg-white p-8 rounded-xl shadow-sm print:p-0 print:shadow-none mx-auto w-full max-w-[29.7cm]">
      
      {/* HEADER OF THE DOCUMENT */}
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

      {/* THE SCHEDULE TABLE */}
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
            // Filter and sort morning and afternoon sessions
            const morning = seancesData.filter(s => s.jour === jour && s.heure_debut < "14:00").sort((a,b) => a.heure_debut.localeCompare(b.heure_debut));
            const afternoon = seancesData.filter(s => s.jour === jour && s.heure_debut >= "14:00").sort((a,b) => a.heure_debut.localeCompare(b.heure_debut));
            
            return (
              <tr key={jour} className="h-28 print:h-24">
                <td className="border-2 border-black font-black text-center text-sm bg-gray-50 uppercase">{jour}</td>
                
                {/* MORNING (Grid Layout) */}
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
                
                {/* AFTERNOON (Grid Layout) */}
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
      
      {/* 1. CONTROL PANEL */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6 no-print">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-black text-gray-900 tracking-tighter uppercase">📅 EMPLOIS DES CLASSES</h1>
            <div className="flex flex-wrap items-center gap-4 bg-gray-50 p-3 rounded-xl border border-gray-100">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black text-gray-500 uppercase tracking-widest">Niveau:</span>
                <select className="border-2 border-indigo-200 bg-white text-indigo-900 font-black px-4 py-2 rounded-lg text-xs outline-none focus:border-indigo-600 shadow-sm" value={selectedNiveau} onChange={e => setSelectedNiveau(e.target.value)}>
                  <option value="">-- TOUS --</option>
                  {niveauxDisponibles.map(niv => <option key={niv} value={niv}>Niveau {niv}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black text-gray-500 uppercase tracking-widest">Classe:</span>
                <select className="border-2 border-indigo-200 bg-white text-indigo-900 font-black px-4 py-2 rounded-lg text-xs outline-none focus:border-indigo-600 shadow-sm disabled:opacity-50" value={selectedClasseId} onChange={e => setSelectedClasseId(e.target.value)}>
                  <option value="">-- CHOISIR --</option>
                  {classesFiltrees.map(cls => <option key={cls.id} value={cls.id}>{cls.nom_classe}</option>)}
                </select>
              </div>
            </div>
          </div>

          {loadingBulk && (
            <div className="text-purple-600 font-black text-xs uppercase animate-pulse">
              {bulkProgress}
            </div>
          )}
          <div className="flex flex-col items-end gap-3">
            {loadingAuto && <div className="text-indigo-600 font-black text-xs uppercase animate-pulse mb-1">⏳ {generationProgress}</div>}
            
            <button
              onClick={handleAutoGenerateByLevel}
              disabled={loadingBulk || !selectedNiveau}
              className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-xl font-black shadow-lg uppercase text-[10px] transition-all disabled:opacity-50"
            >
              ⚡ Générer Niveau
            </button>
            <div className="flex flex-wrap gap-2 justify-end">
              
              {/* DOWNLOAD ALL CLASSES BUTTON */}
              <button onClick={telechargerTous} disabled={isPreparingPDF || classes.length === 0} className="bg-black hover:bg-gray-800 text-white px-5 py-2.5 rounded-xl font-black shadow-lg uppercase text-[10px] transition-all disabled:opacity-50">
                {isPreparingPDF ? '⏳ PRÉPARATION...' : '📑 TÉLÉCHARGER TOUT (PDF)'}
              </button>

              {/* SINGLE CLASS ACTIONS */}
              {selectedClasseId && (
                <>
                  <button onClick={handleAutoGenerateSingle} disabled={loadingAuto} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-black shadow-lg shadow-indigo-200 uppercase text-[10px] transition-all disabled:opacity-50">
                    🪄 Générer
                  </button>
                  <button onClick={openAddModal} disabled={loadingAuto} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2.5 rounded-xl font-black shadow-lg shadow-orange-200 uppercase text-[10px] transition-all disabled:opacity-50">
                    + Séance
                  </button>
                  <button onClick={handlePrintSingle} disabled={loadingAuto} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-xl font-black shadow-lg shadow-green-200 uppercase text-[10px] transition-all disabled:opacity-50">
                    📄 TÉLÉCHARGER CLASSE (1)
                  </button>
                </>
              )}
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
        <div className="flex flex-col items-center justify-center py-32 text-gray-300 no-print">
          <span className="text-6xl mb-4">🏫</span><h2 className="text-2xl font-black uppercase tracking-widest">Sélectionnez une classe</h2>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 3. HIDDEN CONTAINER TO PRINT ALL CLASSES (32 PAGES MAXIMUM)           */}
      {/* ===================================================================== */}
      <div className="hidden">
        <div ref={allComponentRef} className="w-full bg-white print:m-0 print:p-0">
          {classes.map((cls, index) => {
            const seancesDeCetteClasse = allSeances.filter(s => s.classe_id === cls.id);
            return (
              <div 
                key={cls.id} 
                // Using standard CSS to enforce 1 page break per class strictly without extra margins
                style={{ pageBreakAfter: index === classes.length - 1 ? 'auto' : 'always' }}
              >
                {renderTable(cls, seancesDeCetteClasse)}
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
                  <select required className="w-full border-2 p-3 rounded-xl font-black text-xs uppercase text-indigo-900 focus:border-indigo-600" value={formData.matiere_id} onChange={(e) => setFormData({...formData, matiere_id: e.target.value, enseignant_id: ''})}>
                    <option value="">-- Choisir --</option>
                    {matieres.map(m => <option key={m.id} value={m.id}>{m.nom_matiere}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-500 uppercase">Enseignant</label>
                  <select required disabled={!formData.matiere_id} className="w-full border-2 p-3 rounded-xl font-black text-xs uppercase text-indigo-900 focus:border-indigo-600 disabled:opacity-50 disabled:bg-gray-100" value={formData.enseignant_id} onChange={(e) => setFormData({...formData, enseignant_id: e.target.value})}>
                    <option value="">-- Choisir --</option>
                    {enseignants.filter(p => !formData.matiere_id || p.matiere_id === parseInt(formData.matiere_id)).filter(p => !selectedNiveau || p.niveaux?.includes(selectedNiveau)).map(p => <option key={p.id} value={p.id}>{p.nom} {p.prenom}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-500 uppercase">Jour</label>
                  <select required className="w-full border-2 p-3 rounded-xl font-black text-xs uppercase text-indigo-900 focus:border-indigo-600" value={formData.jour} onChange={(e) => setFormData({...formData, jour: e.target.value})}>
                    {jours.map(j => <option key={j} value={j}>{j}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-500 uppercase">Début</label>
                  <input type="time" required className="w-full border-2 p-3 rounded-xl font-black text-indigo-900 focus:border-indigo-600" value={formData.heure_debut} onChange={(e) => setFormData({...formData, heure_debut: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-500 uppercase">Fin</label>
                  <input type="time" required className="w-full border-2 p-3 rounded-xl font-black text-indigo-900 focus:border-indigo-600" value={formData.heure_fin} onChange={(e) => setFormData({...formData, heure_fin: e.target.value})} />
                </div>
              </div>
              <div className="flex justify-between pt-6 border-t mt-6">
                {editingSeanceId ? <button type="button" onClick={handleDeleteSeance} className="px-4 py-2 bg-red-100 text-red-600 rounded-xl hover:bg-red-600 hover:text-white font-black uppercase text-[10px] transition-all">🗑️ Supprimer</button> : <div></div>}
                <div className="flex gap-2">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 bg-gray-100 text-gray-500 rounded-xl font-black uppercase text-xs transition-all hover:bg-gray-200">Annuler</button>
                  <button type="submit" className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-black uppercase text-xs shadow-lg transition-all hover:bg-indigo-700">✓ Enregistrer</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}