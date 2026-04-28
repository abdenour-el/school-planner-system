import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FiEdit, FiTrash2, FiSearch } from "react-icons/fi";
import { MdFolder, MdFolderOpen } from "react-icons/md";
import { LuSchool, LuBookOpen } from 'react-icons/lu';
import { FaBook } from "react-icons/fa";
import toast, { Toaster } from 'react-hot-toast';
import axiosClient from '../axiosClient';

export default function Configuration() {
  const navigate = useNavigate();
  const location = useLocation();

  // =========================================================================
  // 1. DERIVED STATE (L-7el dyal l-Erreur l-wla)
  // =========================================================================
  // B blast ma n-diro useState w useEffect, kan-qraw l-Lien nishaan.
  const activeTab = location.pathname.includes('/matieres') ? 'matieres' : 'classes';

  // =========================================================================
  // 2. GLOBAL STATES
  // =========================================================================
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
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
  // 3. DATA FETCHING (L-7el dyal l-Erreur t-taniya b useCallback)
  // =========================================================================
  const loadData = useCallback(async () => {
    try {
      const [resCls, resMat] = await Promise.all([
        axiosClient.get('/classes'),
        axiosClient.get('/matieres')
      ]);
      setClasses(resCls.data);
      setMatieres(resMat.data);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erreur lors du chargement des données.");
    } finally {
      setLoading(false);
    }
  }, []); // 👈 useCallback kat-7mi la fonction mn les re-renders

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Vider la recherche mli kay-t-beddel l-onglet
  useEffect(() => {
    setSearchQuery('');
  }, [activeTab]);

  // =========================================================================
  // 4. CLASSES ACTIONS
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
  // 5. SUBJECTS (MATIERES) ACTIONS
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
  // 6. SUBMIT FORM (ADD/EDIT FOR BOTH)
  // =========================================================================
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const endpoint = modalType === 'classe' ? '/classes' : '/matieres';
      
      if (editingId) {
        await axiosClient.put(`${endpoint}/${editingId}`, formData);
        toast.success(`${modalType === 'classe' ? 'Classe' : 'Matière'} modifiée avec succès!`);
      } else {
        await axiosClient.post(endpoint, formData);
        toast.success(`${modalType === 'classe' ? 'Classe' : 'Matière'} ajoutée avec succès!`);
      }
      
      setIsModalOpen(false);
      setEditingId(null);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || `Erreur lors de l'enregistrement de la ${modalType}.`);
    }
  };

  // =========================================================================
  // 7. DELETE RECORD (FOR BOTH)
  // =========================================================================
  const handleDelete = async (id, type) => {
    const msg = type === 'classe' 
      ? "Êtes-vous sûr de vouloir supprimer cette classe ? (Son emploi du temps sera également effacé !)"
      : "Êtes-vous sûr de vouloir supprimer cette matière ? (Assurez-vous qu'aucun professeur ne lui est assigné !)";
      
    if (window.confirm(`⚠️ ${msg}`)) {
      try {
        const endpoint = type === 'classe' ? '/classes' : '/matieres';
        await axiosClient.delete(`${endpoint}/${id}`);
        toast.success(`${type === 'classe' ? 'Classe' : 'Matière'} supprimée!`);
        loadData();
      } catch {
        toast.error("Erreur lors de la suppression !");
      }
    }
  };

  // =========================================================================
  // 8. RENDERERS & HELPERS (FILTERING LOGIC)
  // =========================================================================
  
  // Filter and group classes based on search query
  const filteredClasses = classes.filter(c => c.nom_classe.toLowerCase().includes(searchQuery.toLowerCase()));
  const classesGrouped = [...new Set(filteredClasses.map(c => c.niveau))].sort((a,b) => a - b).map(niv => ({
    niveau: niv, 
    liste: filteredClasses.filter(c => c.niveau === niv)
  }));

  // Filter subjects based on search query
  const filteredMatieres = matieres.filter(m => m.nom_matiere.toLowerCase().includes(searchQuery.toLowerCase()));

  // Calculate total volume horaire
  const totalVolumeHoraire = matieres.reduce((sum, m) => sum + m.volume_horaire, 0);

  // Loading State
  if (loading) {
    return (
      <div className="p-6 text-center text-indigo-600 font-black animate-pulse mt-20 uppercase tracking-widest">
        Chargement de la configuration...
      </div>
    );
  }

  return (
    <div className="bg-gray-50 p-6 min-h-screen">
      <Toaster position="top-right" /> 
      
      {/* ================= HEADER & TABS ================= */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tighter uppercase">⚙️ CONFIGURATION</h1>
            <p className="text-xs font-bold text-gray-400 mt-1 uppercase tracking-widest">Gérez les Classes et les Matières</p>
          </div>
          <div className="flex bg-gray-50 p-1.5 rounded-xl shadow-inner border border-gray-200">
            <button 
              onClick={() => navigate('/classes')} 
              className={`px-8 py-2.5 rounded-lg font-black text-xs uppercase transition-all cursor-pointer
                ${activeTab === 'classes' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center gap-2">
                <LuSchool className="text-lg" /> Classes
              </div>
            </button>
            <button 
              onClick={() => navigate('/matieres')} 
              className={`px-8 py-2.5 rounded-lg font-black text-xs uppercase transition-all cursor-pointer
                ${activeTab === 'matieres' ? 'bg-orange-500 text-white shadow-md' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center gap-2">
                <LuBookOpen className="text-lg" /> Matières
              </div>
            </button>
          </div>
        </div>

        {/* Separator, Search and Add Button */}
        <div className="flex flex-col md:flex-row justify-between items-center pt-5 border-t border-gray-100 gap-4">
          
          {/* Universal Search Bar */}
          <div className="relative w-full md:w-72">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <FiSearch />
            </div>
            <input 
              type="text" 
              placeholder={`Rechercher une ${activeTab === 'classes' ? 'classe' : 'matière'}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-bold text-gray-700 focus:outline-none focus:border-indigo-500 transition-colors bg-gray-50 focus:bg-white"
            />
          </div>

          <button 
            onClick={activeTab === 'classes' ? openAddClasse : openAddMatiere} 
            className={`px-6 py-2.5 rounded-xl font-black text-white uppercase text-xs shadow-lg transition-all cursor-pointer ${activeTab === 'classes' ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200' : 'bg-orange-500 hover:bg-orange-600 shadow-orange-200'}`}
          >
            + {activeTab === 'classes' ? 'Nouvelle Classe' : 'Nouvelle Matière'}
          </button>
        </div>
      </div>

      {/* ================= TAB: CLASSES (TREE VIEW) ================= */}
      {activeTab === 'classes' && (
        <div className="space-y-4">
          {classesGrouped.length === 0 ? (
             <div className="text-center py-16 text-gray-400 font-black uppercase text-lg tracking-widest bg-white rounded-2xl border border-gray-200 border-dashed">
               Aucune classe trouvée.
             </div>
          ) : (
            classesGrouped.map(groupe => (
              <div key={groupe.niveau} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                
                {/* Level Header (Accordion Toggle) */}
                <div onClick={() => toggleGroup(groupe.niveau)} className="bg-white hover:bg-gray-50 border-b border-gray-100 text-gray-800 p-5 cursor-pointer flex justify-between items-center select-none transition-colors group">
                  <div className="flex items-center gap-4">
                    <span className="text-indigo-600 bg-indigo-50 p-2 rounded-xl group-hover:bg-indigo-100 transition-colors">
                      {expandedGroups[groupe.niveau] ? <MdFolderOpen size={24} /> : <MdFolder size={24} /> }
                    </span>
                    <h3 className="font-black uppercase tracking-widest text-sm bg-gray-100 p-2 rounded-lg">NIVEAU {groupe.niveau}</h3>
                  </div>
                  <span className="bg-indigo-100 text-indigo-800 px-4 py-1.5 rounded-lg text-xs font-black tracking-widest uppercase shadow-sm">
                    {groupe.liste.length} Classe(s)
                  </span>
                </div>
                
                {/* Classes Grid */}
                {expandedGroups[groupe.niveau] && (
                  <div className="p-5 bg-gray-50/50">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {groupe.liste.map(cls => (
                        <div 
                          key={cls.id}
                          onClick={() => navigate('/emploi', { state: { classeId: cls.id, niveau: cls.niveau } })}
                          className="bg-white border border-gray-200 hover:border-indigo-400 p-4 rounded-xl flex justify-between items-center shadow-sm hover:shadow-md transition-all group cursor-pointer"
                        >
                          <span className="font-black text-sm text-gray-800 uppercase tracking-tight">
                            <div className="flex items-center gap-3">
                              <LuSchool size={20} className="text-indigo-500" />
                              {cls.nom_classe}
                            </div>
                          </span>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={(e) => {
                              e.stopPropagation();
                              openEditClasse(cls);
                            }}
                              className="w-8 h-8 flex items-center justify-center bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-colors cursor-pointer" title="Modifier"
                            >
                              <FiEdit size={16} />
                            </button>
                            <button onClick={(e) => { 
                              e.stopPropagation();
                              handleDelete(cls.id, 'classe')
                            }}
                            className="w-8 h-8 flex items-center justify-center bg-red-50 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-colors cursor-pointer" title="Supprimer"
                            >
                              <FiTrash2 size={16} />
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
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 text-[10px] uppercase tracking-widest">
              <tr>
                <th className="py-4 px-6 font-black">Nom de la Matière</th>
                <th className="py-4 px-6 font-black text-center">Volume Horaire (Hebdo)</th>
                <th className="py-4 px-6 font-black text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredMatieres.length === 0 ? (
                <tr>
                  <td colSpan="3" className="p-16 text-center text-gray-400 font-black uppercase tracking-widest text-lg border-dashed border border-gray-200 m-4 rounded-xl">
                    Aucune matière trouvée.
                  </td>
                </tr>
              ) : (
                filteredMatieres.map(mat => (
                  <tr key={mat.id} className="hover:bg-orange-50/40 transition-colors">
                    <td className="py-4 px-6 font-black text-sm text-gray-900 uppercase tracking-tight">
                      <span className="flex items-center gap-3">
                        <span className="text-orange-500 bg-orange-50 p-2 rounded-lg">
                          <FaBook size={18} />
                        </span>
                        {mat.nom_matiere}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className="bg-orange-100 border border-orange-200 text-orange-800 text-[11px] px-3 py-1.5 rounded-lg font-black shadow-sm tracking-widest uppercase">
                        {mat.volume_horaire} Heures
                      </span>
                    </td>
                    <td className="py-4 px-6 flex justify-end gap-2">
                      <button onClick={() => openEditMatiere(mat)} className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white font-black text-[10px] uppercase tracking-widest transition-colors cursor-pointer shadow-sm">
                        <div className='flex items-center gap-2'>
                          <FiEdit size={14} /> Modifier
                        </div>
                      </button>
                      <button onClick={() => handleDelete(mat.id, 'matiere')} className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-600 hover:text-white font-black text-[10px] uppercase tracking-widest transition-colors cursor-pointer shadow-sm">
                        <div className='flex items-center gap-2'>
                          <FiTrash2 size={14} /> Supprimer
                        </div>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          
          {/* Total Hours Counter */}
          <div className="p-5 bg-gray-50 flex justify-between items-center border-t border-gray-100">
            <span className="font-black text-xs uppercase tracking-widest text-gray-500">Total des Heures du Programme :</span>
            <span className={`font-black text-lg px-4 py-1 rounded-xl shadow-sm ${totalVolumeHoraire === 32 ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-50 text-red-600 border border-red-100'}`}>
              {totalVolumeHoraire}h / 32h
            </span>
          </div>
        </div>
      )}

      {/* ================= DYNAMIC MODAL (ADD / EDIT) ================= */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
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
                      className="w-full border-2 border-gray-200 p-3 rounded-xl focus:border-indigo-600 outline-none font-bold uppercase text-gray-900 transition-colors" 
                      value={formData.nom_classe || ''} 
                      onChange={(e) => setFormData({...formData, nom_classe: e.target.value})} 
                      placeholder="Ex: Groupe 1" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Niveau (ex: 1, 2, 3...)</label>
                    <input 
                      type="number" 
                      required 
                      min="1" 
                      max="10" 
                      className="w-full border-2 border-gray-200 p-3 rounded-xl focus:border-indigo-600 outline-none font-black text-indigo-700 transition-colors" 
                      value={formData.niveau || ''} 
                      onChange={(e) => setFormData({...formData, niveau: e.target.value})} 
                      placeholder="Ex: 3" 
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
                      className="w-full border-2 border-gray-200 p-3 rounded-xl focus:border-orange-500 outline-none font-bold uppercase text-gray-900 transition-colors" 
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
                      className="w-full border-2 border-gray-200 p-3 rounded-xl focus:border-orange-500 outline-none font-black text-orange-700 transition-colors" 
                      value={formData.volume_horaire || ''} 
                      onChange={(e) => setFormData({...formData, volume_horaire: e.target.value})} 
                      placeholder="Ex: 7" 
                    />
                  </div>
                </>
              )}

              {/* Form Action Buttons */}
              <div className="flex justify-end gap-3 pt-6 border-t border-gray-100 mt-6">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="px-6 py-3 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 font-black uppercase text-xs tracking-widest transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button 
                  type="submit" 
                  className={`px-8 py-3 text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-lg transition-all cursor-pointer ${modalType === 'classe' ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200' : 'bg-orange-500 hover:bg-orange-600 shadow-orange-200'}`}
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