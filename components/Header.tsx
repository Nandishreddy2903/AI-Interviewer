
import React from 'react';
import { BrainCircuitIcon, LogOutIcon, HomeIcon } from './icons';

interface HeaderProps {
    onLogout: () => void;
    userEmail: string;
    showActions: boolean;
    onHome: () => void;
}

const Header: React.FC<HeaderProps> = ({ onLogout, userEmail, showActions, onHome }) => {
    return (
        <header className="w-full max-w-4xl py-4 flex justify-between items-center mb-8">
            <div className="flex items-center gap-3 cursor-pointer" onClick={onHome} title="Back to Dashboard">
                <BrainCircuitIcon className="w-8 h-8 text-brand-primary" />
                <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">AI Interviewer</h1>
            </div>
            {showActions && (
                 <div className="flex items-center gap-2 sm:gap-4">
                    <span className="hidden sm:inline text-dark-text text-sm">{userEmail}</span>
                     <button
                        onClick={onHome}
                        className="flex items-center gap-2 px-3 py-2 bg-dark-card hover:bg-dark-subtle text-dark-text font-semibold rounded-lg transition-colors text-sm"
                        title="Dashboard"
                    >
                        <HomeIcon className="w-4 h-4" />
                    </button>
                    <button
                        onClick={onLogout}
                        className="flex items-center gap-2 px-3 py-2 bg-dark-card hover:bg-dark-subtle text-dark-text font-semibold rounded-lg transition-colors text-sm"
                        title="Logout"
                    >
                        <LogOutIcon className="w-4 h-4" />
                    </button>
                </div>
            )}
        </header>
    );
};

export default Header;
