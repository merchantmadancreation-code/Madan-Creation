import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, Mail, Lock, AlertCircle, UserPlus, User } from 'lucide-react';
import logo from '../assets/logo.png';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const { login, signUp } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const from = location.state?.from?.pathname || "/";

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        const { error } = isSignUp
            ? await signUp(email, password, fullName)
            : await login(email, password);

        if (error) {
            setError(error.message);
            setLoading(false);
        } else if (isSignUp) {
            setError("Account created! Please sign in with your new credentials.");
            setIsSignUp(false);
            setLoading(false);
        } else {
            navigate(from, { replace: true });
        }
    };

    return (
        <div
            className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative bg-cover bg-center"
            style={{ backgroundImage: 'url("/silver-bg.png")' }}
        >
            {/* Light frosted overlay to make the login card stand out elegantly */}
            <div className="absolute inset-0 bg-white/40 backdrop-blur-md"></div>

            <div className="relative z-10 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="flex justify-center">
                    <div className="bg-white p-4 rounded-3xl shadow-xl shadow-sage-200/50">
                        <img src={logo} alt="Madan Creation" className="w-16 h-16 object-contain" />
                    </div>
                </div>
                <h2 className="mt-8 text-center text-3xl font-black text-sage-900 tracking-tight drop-shadow-sm">
                    Madan Creation
                </h2>
                <p className="mt-2 text-center text-[11px] font-bold text-sage-600 uppercase tracking-widest drop-shadow-sm">
                    {isSignUp ? 'New Account Registration' : 'Business Management Portal'}
                </p>
            </div>

            <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
                <div className="bg-white py-10 px-6 shadow-2xl shadow-sage-900/10 border border-sage-100 sm:rounded-3xl sm:px-12">
                    <form className="space-y-6" onSubmit={handleSubmit}>
                        {/* Error display */}
                        {error && (
                            <div className={`border-l-4 p-4 rounded-xl flex items-start gap-3 animate-in shake duration-300 ${error.includes('created')
                                ? 'bg-green-50 border-green-500 text-green-700'
                                : 'bg-red-50 border-red-500 text-red-700'
                                }`}>
                                <AlertCircle className={`w-5 h-5 mt-0.5 ${error.includes('created') ? 'text-green-500' : 'text-red-500'}`} />
                                <p className="text-sm font-medium">{error}</p>
                            </div>
                        )}

                        {isSignUp && (
                            <div className="space-y-1">
                                <label htmlFor="fullName" className="text-[10px] font-bold text-sage-400 uppercase tracking-wider ml-1">
                                    Full Name
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <User className="h-4 w-4 text-sage-300" />
                                    </div>
                                    <input
                                        id="fullName"
                                        type="text"
                                        required
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        className="block w-full pl-11 pr-4 py-3 bg-sage-50 border border-sage-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-sage-500/20 focus:border-sage-500 text-sm transition-all"
                                        placeholder="John Doe"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="space-y-1">
                            <label htmlFor="email" className="text-[10px] font-bold text-sage-400 uppercase tracking-wider ml-1">
                                Business Email
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Mail className="h-4 w-4 text-sage-300" />
                                </div>
                                <input
                                    id="email"
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="block w-full pl-11 pr-4 py-3 bg-sage-50 border border-sage-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-sage-500/20 focus:border-sage-500 text-sm transition-all"
                                    placeholder="name@company.com"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label htmlFor="password" className="text-[10px] font-bold text-sage-400 uppercase tracking-wider ml-1">
                                Secure Password
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Lock className="h-4 w-4 text-sage-300" />
                                </div>
                                <input
                                    id="password"
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="block w-full pl-11 pr-4 py-3 bg-sage-50 border border-sage-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-sage-500/20 focus:border-sage-500 text-sm transition-all"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg shadow-sage-500/20 text-sm font-bold text-white bg-sage-500 hover:bg-sage-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sage-500 transition-all disabled:opacity-50 disabled:scale-95"
                            >
                                {loading ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        {isSignUp ? <UserPlus className="w-5 h-5 mr-2" /> : <LogIn className="w-5 h-5 mr-2" />}
                                        {isSignUp ? 'Complete Registration' : 'Access System'}
                                    </>
                                )}
                            </button>
                        </div>
                    </form>

                    <div className="mt-8 pt-8 border-t border-sage-50 text-center">
                        <button
                            onClick={() => setIsSignUp(!isSignUp)}
                            className="text-xs font-bold text-sage-400 uppercase tracking-widest hover:text-sage-700 transition-colors"
                        >
                            {isSignUp ? 'Return to Sign In' : "Register New Account"}
                        </button>
                    </div>
                </div>
            </div>
            <div className="mt-12 text-center relative z-10">
                <p className="text-[10px] font-bold text-sage-600/70 uppercase tracking-[0.2em] drop-shadow-sm">
                    Powered by Madan Creation Tech
                </p>
            </div>
        </div>
    );
};

export default Login;
