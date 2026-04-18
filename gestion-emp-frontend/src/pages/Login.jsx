import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import { FaSchool } from 'react-icons/fa';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await axios.post('http://127.0.0.1:8000/api/login', {
                email: email,
                password: password
            });

            localStorage.setItem('auth_token', response.data.access_token);
            localStorage.setItem('user_name', response.data.user.name);

            toast.success('Connexion réussie! Redirection...', { icon: '🔐' });

            setTimeout(() => {
                navigate('/'); 
            }, 1000);

        } catch (error) {
            toast.error(error.response?.data?.message || 'Identifiants incorrects. Veuillez réessayer.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <Toaster position="top-right" />
            
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="flex justify-center text-indigo-600 text-5xl">
                    <FaSchool />
                </div>
                <h2 className="mt-6 text-center text-3xl font-black tracking-tight text-gray-900 uppercase">
                    School Planner System
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600 font-bold tracking-widest uppercase">
                    Espace Administration
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow-xl sm:rounded-2xl sm:px-10 border-t-8 border-indigo-600">
                    <form className="space-y-6" onSubmit={handleLogin}>
                        
                        <div>
                            <label className="block text-xs font-black text-gray-700 uppercase tracking-widest">
                                Adresse Email
                            </label>
                            <div className="mt-1">
                                <input
                                    type="email"
                                    required
                                    className="appearance-none block w-full px-4 py-3 border-2 border-gray-200 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-indigo-500 font-bold text-gray-900 transition-colors"
                                    placeholder="admin@iqrae.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-black text-gray-700 uppercase tracking-widest">
                                Mot de Passe
                            </label>
                            <div className="mt-1">
                                <input
                                    type="password"
                                    required
                                    className="appearance-none block w-full px-4 py-3 border-2 border-gray-200 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-indigo-500 font-bold text-gray-900 transition-colors"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-black uppercase tracking-widest text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all"
                            >
                                {loading ? 'Connexion...' : 'Se Connecter'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}