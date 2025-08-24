import React, { useState } from 'react';
import { BrainCircuitIcon } from './icons';
import { login as apiLogin, register as apiRegister } from '../services/api';

interface AuthScreenProps {
    onLogin: (email: string, token: string) => void;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoginView, setIsLoginView] = useState(true);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) {
            setError('Please enter both email and password.');
            return;
        }
        setLoading(true);
        setError('');
        try {
            let data;
            if (isLoginView) {
                data = await apiLogin(email, password);
            } else {
                data = await apiRegister(email, password);
            }
            onLogin(data.email, data.token);
        } catch (err) {
            const e = err as Error;
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };
    
    const toggleView = () => {
        setIsLoginView(!isLoginView);
        setError('');
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md">
                 <div className="flex items-center justify-center gap-3 mb-8">
                    <BrainCircuitIcon className="w-10 h-10 text-brand-primary" />
                    <h1 className="text-4xl font-bold text-white tracking-tight">AI Interviewer</h1>
                </div>

                <form onSubmit={handleSubmit} className="bg-dark-card shadow-2xl rounded-lg p-8">
                    <h2 className="text-2xl font-bold text-center text-white mb-6">
                        {isLoginView ? 'Welcome Back' : 'Create Account'}
                    </h2>
                    <div className="mb-4">
                        <label className="block text-dark-text text-sm font-bold mb-2" htmlFor="email">
                            Email
                        </label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="user@example.com"
                            className="w-full p-3 bg-dark-bg border border-dark-subtle rounded-lg text-dark-text focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-colors"
                        />
                    </div>
                    <div className="mb-6">
                        <label className="block text-dark-text text-sm font-bold mb-2" htmlFor="password">
                            Password
                        </label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="********"
                            className="w-full p-3 bg-dark-bg border border-dark-subtle rounded-lg text-dark-text focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-colors"
                        />
                    </div>
                    {error && <p className="text-red-400 text-center text-sm mb-4">{error}</p>}
                    <div className="flex items-center justify-between">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full px-8 py-3 bg-brand-primary hover:bg-brand-secondary text-white font-bold rounded-lg transition-colors disabled:bg-dark-subtle disabled:cursor-not-allowed"
                        >
                            {loading ? 'Processing...' : isLoginView ? 'Sign In' : 'Sign Up'}
                        </button>
                    </div>
                     <p className="text-center text-dark-subtle text-sm mt-6">
                        {isLoginView ? "Don't have an account?" : "Already have an account?"}
                        <button type="button" onClick={toggleView} className="font-semibold text-brand-primary hover:text-brand-secondary ml-1">
                            {isLoginView ? "Sign Up" : "Sign In"}
                        </button>
                    </p>
                </form>
            </div>
        </div>
    );
};

export default AuthScreen;
