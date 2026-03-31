import { useState, useEffect } from 'react';
import axios from 'axios';

export default function Configuration() {
  // =========================================================================
  // GLOBAL STATES
  // =========================================================================
  const [activeTab, setActiveTab] = useState('classes'); 
  const [loading, setLoading] = useState(true);
  
  // --- Classes States ---
  const [classes, setClasses] = useState([]);
  const [expandedGroups, setExpandedGroups] = useState({ 1: true, 2: true, 3: true, 4: true, 5: true, 6: true });
  
  // --- Subjects (Matières) States ---
  const [matieres, setMatieres] = useState([]);

  // --- Modal States (Add/Edit) ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState('classe'); 
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({});

  // =========================================================================
  // DATA FETCHING
  // =========================================================================
  const loadData = async () => {
    try {
      const [resCls, resMat] = await Promise.all([
        axios.get('http://127.0.0.1:8000/api/classes'),
        axios.get('http://127.0.0.1:8000/api/matieres')
      ]);
      setClasses(resCls.data);
      setMatieres(resMat.data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching data:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      await loadData();
    };
    fetchData();
  }, []);

  // =========================================================================
  // CLASSES ACTIONS
  // =========================================================================
  const toggleGroup = (niv) => setExpandedGroups(prev => ({ ...prev, [niv]: !prev[niv] }));

  const openAddClasse = () => {
    setModalType('classe'); 
    setEditingId(null);
    setFormData({ nom_classe: '', niveau: 1 });
    setIsModalOpen(true);
  };

  const openEditClasse = (cls) => {
    setModalType('classe'); 
    setEditingId(cls.id);
    setFormData({ nom_classe: cls.nom_classe, niveau: cls.niveau });
    setIsModalOpen(true);
  };

  // =========================================================================
  // SUBJECTS (MATIERES) ACTIONS
  // =========================================================================
  const openAddMatiere = () => {
    setModalType('matiere'); 
    setEditingId(null);
    setFormData({ nom_matiere: '', volume_horaire: 2 });
    setIsModalOpen(true);
  };

  const openEditMatiere = (mat) => {
    setModalType('matiere'); 
    setEditingId(mat.id);
    setFormData({ nom_matiere: mat.nom_matiere, volume_horaire: mat.volume_horaire });
    setIsModalOpen(true);
  };

  // =========================================================================
  // SUBMIT FORM (ADD/EDIT FOR BOTH)
  // =========================================================================
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const endpoint = modalType === 'classe' ? 'classes' : 'matieres';
      
      if (editingId) {
        await axios.put(`http://127.0.0.1:8000/api/${endpoint}/${editingId}`, formData);
      } else {
        await axios.post(`http://127.0.0.1:8000/api/${endpoint}`, formData);
      }
      
      setIsModalOpen(false);
      setEditingId(null);
      loadData();
    } catch (error) {
      // Show exact validation error from Laravel if available
      alert(error.response?.data?.message || `Erreur lors de l'enregistrement de la ${modalType}.`);
    }
  };

  // =========================================================================
  // DELETE RECORD (FOR BOTH)
  // =========================================================================
  const handleDelete = async (id, type) => {
    const msg = type === 'classe' 
      ? "Êtes-vous sûr de vouloir supprimer cette classe ? (Son emploi du temps sera également effacé !)"
      : "Êtes-vous sûr de vouloir supprimer cette matière ? (Assurez-vous qu'aucun professeur ne lui est assigné !)";
      
    if (window.confirm(`⚠️ ${msg}`)) {
      try {
        const endpoint = type === 'classe' ? 'classes' : 'matieres';
        await axios.delete(`http://127.0.0.1:8000/api/${endpoint}/${id}`);
        loadData();
      } catch  {
        alert("Erreur lors de la suppression !");
      }
    }
  };

  // =========================================================================
  // RENDERERS & HELPERS
  // =========================================================================
  
  // Group classes by level (Niveau)
  const classesGrouped = [...new Set(classes.map(c => c.niveau))].sort((a,b) => a - b).map(niv => ({
    niveau: niv, 
    liste: classes.filter(c => c.niveau === niv)
  }));

  // Total hours calculation for subjects
  const totalVolumeHoraire = matieres.reduce((sum, m) => sum + m.volume_horaire, 0);

  // Loading State
  if (loading) {
    return (
      <div className="p-6 text-center text-indigo-600 font-black animate-pulse mt-20 uppercase">
        Chargement de la configuration...
      </div>
    );
  }

  return (
    <div className="bg-gray-50 p-6 min-h-screen">
      
      {/* ================= HEADER & TABS ================= */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tighter uppercase">⚙️ CONFIGURATION</h1>
            <p className="text-xs font-bold text-gray-400 mt-1 uppercase tracking-widest">Gérez les Classes et les Matières</p>
          </div>
          <div className="flex bg-gray-100 p-1 rounded-xl shadow-inner border border-gray-200">
            <button 
              onClick={() => setActiveTab('classes')} 
              className={`px-8 py-2.5 rounded-lg font-black text-xs uppercase transition-all ${activeTab === 'classes' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-700'}`}
            >
              🏫 Classes
            </button>
            <button 
              onClick={() => setActiveTab('matieres')} 
              className={`px-8 py-2.5 rounded-lg font-black text-xs uppercase transition-all ${activeTab === 'matieres' ? 'bg-orange-500 text-white shadow-md' : 'text-gray-500 hover:text-gray-700'}`}
            >
              📚 Matières
            </button>
          </div>
        </div>

        {/* Separator and Add Button */}
        <div className="flex justify-between items-center pt-4 border-t-2 border-gray-50">
          <h2 className="text-lg font-black text-gray-700 uppercase">
            {activeTab === 'classes' ? 'Arborescence des Classes' : 'Programme des Matières'}
          </h2>
          <button 
            onClick={activeTab === 'classes' ? openAddClasse : openAddMatiere} 
            className={`px-6 py-2 rounded-xl font-black text-white uppercase text-xs shadow-lg transition-all ${activeTab === 'classes' ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200' : 'bg-orange-500 hover:bg-orange-600 shadow-orange-200'}`}
          >
            + {activeTab === 'classes' ? 'Nouvelle Classe' : 'Nouvelle Matière'}
          </button>
        </div>
      </div>

      {/* ================= TAB: CLASSES (TREE VIEW) ================= */}
      {activeTab === 'classes' && (
        <div className="space-y-4">
          {classesGrouped.length === 0 ? (
             <div className="text-center py-10 text-gray-400 font-bold uppercase text-sm bg-white rounded-xl border border-gray-200">
               Aucune classe n'a été ajoutée.
             </div>
          ) : (
            classesGrouped.map(groupe => (
              <div key={groupe.niveau} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                
                {/* Level Header (Accordion Toggle) */}
                <div onClick={() => toggleGroup(groupe.niveau)} className="bg-indigo-900 text-white p-4 cursor-pointer flex justify-between items-center select-none hover:bg-indigo-800 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{expandedGroups[groupe.niveau] ? '📂' : '📁'}</span>
                    <h3 className="font-black uppercase tracking-widest text-sm">NIVEAU {groupe.niveau}</h3>
                  </div>
                  <span className="bg-indigo-600 text-white px-3 py-1 rounded-full text-[10px] font-black">{groupe.liste.length} Classe(s)</span>
                </div>
                
                {/* Classes Grid */}
                {expandedGroups[groupe.niveau] && (
                  <div className="p-4 bg-gray-50 border-t border-gray-200">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {groupe.liste.map(cls => (
                        <div key={cls.id} className="bg-white border border-gray-200 hover:border-indigo-300 p-4 rounded-xl flex justify-between items-center shadow-sm hover:shadow-md transition-all group">
                          <span className="font-black text-sm text-gray-800 uppercase tracking-tight">🏫 {cls.nom_classe}</span>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openEditClasse(cls)} className="w-8 h-8 flex items-center justify-center bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-colors" title="Modifier">
                              ✏️
                            </button>
                            <button onClick={() => handleDelete(cls.id, 'classe')} className="w-8 h-8 flex items-center justify-center bg-red-50 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-colors" title="Supprimer">
                              🗑️
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* ================= TAB: SUBJECTS (MATIERES) ================= */}
      {activeTab === 'matieres' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-900 text-white text-[10px] uppercase tracking-widest">
              <tr>
                <th className="p-4 font-black">Nom de la Matière</th>
                <th className="p-4 font-black text-center">Volume Horaire (Hebdo)</th>
                <th className="p-4 font-black text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {matieres.length === 0 ? (
                <tr>
                  <td colSpan="3" className="p-8 text-center text-gray-400 font-bold uppercase text-sm">
                    Aucune matière trouvée.
                  </td>
                </tr>
              ) : (
                matieres.map(mat => (
                  <tr key={mat.id} className="hover:bg-orange-50/50 transition-colors">
                    <td className="p-4 font-black text-sm text-gray-800 uppercase">📚 {mat.nom_matiere}</td>
                    <td className="p-4 text-center">
                      <span className="bg-orange-100 text-orange-800 text-[11px] px-3 py-1 rounded-lg font-black shadow-sm">
                        {mat.volume_horaire} Heures
                      </span>
                    </td>
                    <td className="p-4 flex justify-end gap-2">
                      <button onClick={() => openEditMatiere(mat)} className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white font-bold text-[10px] uppercase transition-colors">Modifier</button>
                      <button onClick={() => handleDelete(mat.id, 'matiere')} className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-600 hover:text-white font-bold text-[10px] uppercase transition-colors">Supprimer</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          
          {/* Total Hours Counter */}
          <div className="p-4 bg-gray-50 flex justify-between items-center border-t border-gray-200">
            <span className="font-black text-sm uppercase text-gray-600">Total des Heures du Programme :</span>
            <span className={`font-black text-lg ${totalVolumeHoraire === 32 ? 'text-green-600' : 'text-red-600'}`}>
              {totalVolumeHoraire}h / 32h
            </span>
          </div>
        </div>
      )}

      {/* ================= DYNAMIC MODAL (ADD / EDIT) ================= */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md border-t-8 ${modalType === 'classe' ? 'border-indigo-600' : 'border-orange-500'}`}>
            <h2 className="text-2xl font-black mb-6 uppercase tracking-tighter text-gray-800">
              {editingId ? `Modifier ${modalType}` : `Ajouter ${modalType}`}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-5">
              
              {/* Form Fields for Classe */}
              {modalType === 'classe' ? (
                <>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Nom de la Classe</label>
                    <input 
                      type="text" 
                      required 
                      className="w-full border-2 p-3 rounded-xl focus:border-indigo-600 outline-none font-bold uppercase" 
                      value={formData.nom_classe || ''} 
                      onChange={(e) => setFormData({...formData, nom_classe: e.target.value})} 
                      placeholder="Ex: Groupe 1" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Niveau (ex: 3, 4, 5...)</label>
                    {/* Notice: Removed parseInt to fix the NaN bug when field is cleared */}
                    <input 
                      type="number" 
                      required 
                      min="1" 
                      max="10" 
                      className="w-full border-2 p-3 rounded-xl focus:border-indigo-600 outline-none font-black text-indigo-700" 
                      value={formData.niveau || ''} 
                      onChange={(e) => setFormData({...formData, niveau: e.target.value})} 
                      placeholder="Niveau" 
                    />
                  </div>
                </>
              ) : (
                /* Form Fields for Matière */
                <>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Nom de la Matière</label>
                    <input 
                      type="text" 
                      required 
                      className="w-full border-2 p-3 rounded-xl focus:border-orange-500 outline-none font-bold uppercase" 
                      value={formData.nom_matiere || ''} 
                      onChange={(e) => setFormData({...formData, nom_matiere: e.target.value})} 
                      placeholder="Ex: Mathématiques" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Volume Horaire (Heures/Semaine)</label>
                    <input 
                      type="number" 
                      min="1" 
                      max="20" 
                      required 
                      className="w-full border-2 p-3 rounded-xl focus:border-orange-500 outline-none font-black text-orange-700" 
                      value={formData.volume_horaire || ''} 
                      onChange={(e) => setFormData({...formData, volume_horaire: e.target.value})} 
                      placeholder="Ex: 7" 
                    />
                  </div>
                </>
              )}

              {/* Form Action Buttons */}
              <div className="flex justify-end gap-3 pt-6 border-t mt-6">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="px-6 py-3 bg-gray-100 text-gray-500 rounded-xl hover:bg-gray-200 font-black uppercase text-xs transition-all"
                >
                  Annuler
                </button>
                <button 
                  type="submit" 
                  className={`px-8 py-3 text-white rounded-xl font-black uppercase text-xs shadow-lg transition-all ${modalType === 'classe' ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200' : 'bg-orange-500 hover:bg-orange-600 shadow-orange-200'}`}
                >
                  ✓ Enregistrer
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}