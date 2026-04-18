import { useState, useEffect } from 'react';
import axiosClient from '../axiosClient';
import { FiPlus, FiTrash2, FiUser } from 'react-icons/fi';
import toast, { Toaster } from 'react-hot-toast';

export default function Utilisateurs() {
    const [users, setUsers] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    
    // Form state
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: ''
    });

    // Fetch users from database
    const fetchUsers = async () => {
        try {
            const response = await axiosClient.get('/users');
            setUsers(response.data);
        } catch (error) {
            console.error("Error fetching users", error);
            toast.error("Erreur lors du chargement des utilisateurs.");
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    // Handle form submission (Add User)
    const handleAddUser = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await axiosClient.post('/users', formData);
            toast.success("Utilisateur ajouté avec succès!");
            setIsModalOpen(false);
            setFormData({ name: '', email: '', password: '' }); // Reset form
            fetchUsers(); // Refresh table
        } catch (error) {
            toast.error(error.response?.data?.message || "Erreur lors de l'ajout.");
        } finally {
            setLoading(false);
        }
    };

    // Handle user deletion
    const handleDeleteUser = async (id) => {
        if (!window.confirm("Voulez-vous vraiment supprimer cet utilisateur ?")) return;
        try {
            await axiosClient.delete(`/users/${id}`);
            toast.success("Utilisateur supprimé.");
            fetchUsers();
        } catch  {
            toast.error("Erreur lors de la suppression.");
        }
    };

    return (
        <div className="bg-gray-50 p-6 min-h-screen">
            <Toaster position="top-right" />
            
            {/* Header & Add Button */}
            <div className="flex justify-between items-center mb-6 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h1 className="text-2xl font-black text-gray-900 tracking-tighter uppercase flex items-center gap-3">
                    <FiUser className="text-indigo-600" />
                    Gestion des Utilisateurs
                </h1>
                <button 
                    onClick={() => setIsModalOpen(true)}
                    className="bg-indigo-600 text-white hover:bg-indigo-700 px-6 py-3 rounded-xl font-black text-xs uppercase shadow-lg transition-all flex items-center gap-2"
                >
                    <FiPlus size={18} /> Nouvel Administrateur
                </button>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-100 text-xs font-black text-gray-500 uppercase tracking-widest">
                        <tr>
                            <th className="p-4">Nom Complet</th>
                            <th className="p-4">Email</th>
                            <th className="p-4">Date de Création</th>
                            <th className="p-4 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-sm font-semibold text-gray-700">
                        {users.map(user => (
                            <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                <td className="p-4 flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-black">
                                        {user.name.charAt(0).toUpperCase()}
                                    </div>
                                    {user.name}
                                </td>
                                <td className="p-4">{user.email}</td>
                                <td className="p-4">{new Date(user.created_at).toLocaleDateString()}</td>
                                <td className="p-4 text-center">
                                    <button 
                                        onClick={() => handleDeleteUser(user.id)}
                                        className="text-red-500 hover:text-red-700 bg-red-50 p-2 rounded-lg transition-colors"
                                        title="Supprimer"
                                    >
                                        <FiTrash2 size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Add User Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md border-t-8 border-indigo-600">
                        <h2 className="text-xl font-black mb-6 uppercase tracking-tighter text-gray-800">Ajouter un Utilisateur</h2>
                        <form onSubmit={handleAddUser} className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-gray-500 uppercase">Nom Complet</label>
                                <input 
                                    type="text" required 
                                    className="w-full border-2 p-3 rounded-xl font-black text-xs text-gray-900 focus:border-indigo-600" 
                                    value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} 
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-500 uppercase">Adresse Email</label>
                                <input 
                                    type="email" required 
                                    className="w-full border-2 p-3 rounded-xl font-black text-xs text-gray-900 focus:border-indigo-600" 
                                    value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} 
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-500 uppercase">Mot de Passe</label>
                                <input 
                                    type="password" required minLength="6"
                                    className="w-full border-2 p-3 rounded-xl font-black text-xs text-gray-900 focus:border-indigo-600" 
                                    value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} 
                                />
                            </div>
                            <div className="flex gap-2 pt-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="w-full py-3 bg-gray-100 text-gray-500 rounded-xl font-black uppercase text-xs hover:bg-gray-200 transition-colors">Annuler</button>
                                <button type="submit" disabled={loading} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-black uppercase text-xs hover:bg-indigo-700 transition-colors disabled:opacity-50">
                                    {loading ? 'Création...' : 'Créer'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}