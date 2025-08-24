import React from 'react';
import { useCodingPractice } from '../hooks/useCodingPractice';
import type { InterviewDifficulty, CodingChallenge, Language, SolvedCodingProblem } from '../types';
import { INTERVIEW_DIFFICULTIES, SUPPORTED_LANGUAGES } from '../constants';
import CodeEditor from './CodeEditor';
import LoadingView from './LoadingView';
import { RefreshCwIcon, LoaderCircleIcon, InfoIcon } from './icons';

const DifficultySelector: React.FC<{ onSelect: (difficulty: InterviewDifficulty) => void; isLoading: boolean }> = ({ onSelect, isLoading }) => (
    <div className="w-full text-center animate-fade-in">
        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-2">Coding Practice</h2>
        <p className="text-lg text-dark-text max-w-2xl mx-auto mb-8">
            Select a difficulty level to generate a set of practice problems.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {INTERVIEW_DIFFICULTIES.map((option) => (
                <button
                    key={option.id}
                    onClick={() => onSelect(option.id)}
                    disabled={isLoading}
                    className="p-6 text-center rounded-lg transition-all duration-200 border-2 bg-dark-card border-dark-subtle hover:border-brand-secondary hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <h4 className="font-bold text-white text-xl">{option.name}</h4>
                    <p className="text-sm text-dark-text mt-1">{option.description}</p>

                </button>
            ))}
        </div>
    </div>
);

const ProblemList: React.FC<{ problems: CodingChallenge[]; onSelect: (problem: CodingChallenge) => void; onRefresh: () => void; }> = ({ problems, onSelect, onRefresh }) => (
    <div className="w-full animate-fade-in">
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-2xl font-bold text-white">Choose a Problem</h3>
            <button
                onClick={onRefresh}
                className="flex items-center gap-2 px-4 py-2 bg-dark-card hover:bg-dark-subtle text-dark-text font-semibold rounded-lg transition-colors text-sm"
                title="Generate New Problems"
            >
                <RefreshCwIcon className="w-4 h-4" />
                Refresh
            </button>
        </div>
        <div className="space-y-4">
            {problems.map((problem, index) => (
                <div
                    key={index}
                    onClick={() => onSelect(problem)}
                    className="bg-dark-card p-4 rounded-lg border border-dark-subtle cursor-pointer hover:border-brand-primary transition-colors"
                >
                    <h4 className="font-semibold text-lg text-white">{problem.title}</h4>
                </div>
            ))}
        </div>
    </div>
);

const SolvedHistoryList: React.FC<{
    history: SolvedCodingProblem[];
    onReview: (item: SolvedCodingProblem) => void;
    isLoading: boolean;
}> = ({ history, onReview, isLoading }) => {
    if (isLoading) {
        return (
            <div className="flex justify-center items-center p-8 mt-8">
                <LoaderCircleIcon className="w-8 h-8 animate-spin" />
            </div>
        );
    }

    if (history.length === 0) {
        return (
            <div className="text-center bg-dark-card p-8 rounded-lg mt-8">
                <p className="text-dark-text">You haven't solved any practice problems yet.</p>
            </div>
        );
    }

    return (
        <div className="w-full mt-12 animate-fade-in">
            <h3 className="text-2xl font-bold text-white mb-4">Solved Problems</h3>
            <div className="space-y-4">
                {history.map((item) => (
                    <div
                        key={item._id}
                        className="bg-dark-card p-4 rounded-lg flex justify-between items-center"
                    >
                        <div>
                            <h4 className="font-bold text-white text-lg">{item.challenge.title}</h4>
                            <p className="text-sm text-dark-text capitalize">{`${item.difficulty} | ${SUPPORTED_LANGUAGES.find(l => l.id === item.solution.language)?.name}`}</p>
                            <p className="text-sm text-dark-text mt-1">{new Date(item.solvedAt).toLocaleDateString()}</p>
                        </div>
                        <button
                            onClick={() => onReview(item)}
                            className="px-4 py-2 bg-brand-primary hover:bg-brand-secondary text-white font-semibold rounded-lg transition-colors text-sm"
                        >
                            Review
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};


const ProblemView: React.FC<{
    problem: CodingChallenge;
    userCode: string;
    onCodeChange: (code: string) => void;
    onRun: () => void;
    onBack: () => void;
    evaluationResult: { success: boolean; message: string } | null;
    isEvaluating: boolean;
    currentLanguage: Language;
    onLanguageChange: (language: Language) => void;
    isSwitchingLanguage: boolean;
}> = ({ problem, userCode, onCodeChange, onRun, onBack, evaluationResult, isEvaluating, currentLanguage, onLanguageChange, isSwitchingLanguage }) => {
    
    const isRunDisabled = isEvaluating || isSwitchingLanguage || currentLanguage !== 'javascript';
    const runButtonTooltip = currentLanguage !== 'javascript' 
        ? 'Execution is only available for JavaScript in this demo.' 
        : '';
    
    return (
        <div className="w-full h-[80vh] flex flex-col gap-4 animate-fade-in">
            <div className="flex-shrink-0">
                <button onClick={onBack} className="text-brand-primary hover:underline mb-4">&larr; Back to Problems</button>
                <div className="flex justify-between items-start gap-4">
                    <div className="flex-grow">
                        <h2 className="text-2xl font-bold text-white mb-2">{problem.title}</h2>
                        <p className="text-dark-text whitespace-pre-wrap">{problem.description}</p>
                    </div>
                     <div className="relative ml-4 flex-shrink-0">
                         <label htmlFor="language-select" className="sr-only">Select Language</label>
                         <select
                            id="language-select"
                            value={currentLanguage}
                            onChange={(e) => onLanguageChange(e.target.value as Language)}
                            disabled={isSwitchingLanguage}
                            className="bg-dark-card border border-dark-subtle rounded-md pl-3 pr-8 py-2 text-white focus:ring-2 focus:ring-brand-primary appearance-none"
                         >
                            {SUPPORTED_LANGUAGES.map(lang => (
                                <option key={lang.id} value={lang.id}>{lang.name}</option>
                            ))}
                         </select>
                         {isSwitchingLanguage && <LoaderCircleIcon className="w-5 h-5 absolute top-1/2 right-2 -translate-y-1/2 animate-spin text-dark-text" />}
                    </div>
                </div>
            </div>
            {currentLanguage !== 'javascript' && (
                <div className="flex-shrink-0 p-3 bg-blue-900/50 border border-blue-400 text-blue-200 rounded-lg text-sm flex items-center gap-3 animate-fade-in">
                    <InfoIcon className="w-5 h-5 flex-shrink-0" />
                    <span>
                        <strong>Note:</strong> Live code execution is only supported for JavaScript in this demo. You can still write and edit code for {SUPPORTED_LANGUAGES.find(l => l.id === currentLanguage)?.name}.
                    </span>
                </div>
            )}
            <div className="flex-grow flex flex-col min-h-0">
                 <CodeEditor
                    code={userCode}
                    onCodeChange={onCodeChange}
                    onRun={onRun}
                    isSubmitting={isEvaluating}
                    language={currentLanguage}
                    isRunDisabled={isRunDisabled}
                    runButtonTooltip={runButtonTooltip}
                />
            </div>
            {evaluationResult && (
                <div className={`mt-2 p-4 rounded-lg text-white text-sm whitespace-pre-wrap font-mono ${evaluationResult.success ? 'bg-green-900/50 border border-green-400' : 'bg-red-900/50 border border-red-400'}`}>
                    {evaluationResult.message}
                </div>
            )}
        </div>
    );
};

const CodingPracticeScreen: React.FC = () => {
    const {
        problems,
        selectedProblem,
        userCode,
        evaluationResult,
        isLoading,
        isEvaluating,
        error,
        fetchProblems,
        selectProblem,
        setUserCode,
        runCode,
        goBackToList,
        reset,
        refreshProblems,
        currentLanguage,
        changeLanguage,
        isSwitchingLanguage,
        solvedHistory,
        isLoadingHistory,
        reviewProblem,
    } = useCodingPractice();

    if (error) {
        return (
            <div className="text-center text-red-400 bg-red-900/50 p-8 rounded-lg animate-fade-in">
                <h2 className="text-2xl font-bold mb-4">An Error Occurred</h2>
                <p className="mb-6">{error}</p>
                 <button
                  onClick={reset}
                  className="px-6 py-2 bg-brand-primary hover:bg-brand-secondary text-white font-semibold rounded-lg transition-colors"
                >
                  Try Again
                </button>
            </div>
        );
    }
    
    if (isLoading) {
        return <LoadingView message="Generating coding problems..." />;
    }

    if (selectedProblem) {
        return (
            <ProblemView
                problem={selectedProblem}
                userCode={userCode}
                onCodeChange={setUserCode}
                onRun={runCode}
                onBack={goBackToList}
                evaluationResult={evaluationResult}
                isEvaluating={isEvaluating}
                currentLanguage={currentLanguage}
                onLanguageChange={changeLanguage}
                isSwitchingLanguage={isSwitchingLanguage}
            />
        );
    }

    if (problems.length > 0) {
        return <ProblemList problems={problems} onSelect={selectProblem} onRefresh={refreshProblems} />;
    }

    return (
        <div className="w-full max-w-4xl mx-auto">
            <DifficultySelector onSelect={fetchProblems} isLoading={isLoading} />
            <SolvedHistoryList 
                history={solvedHistory}
                onReview={reviewProblem}
                isLoading={isLoadingHistory}
            />
        </div>
    );
};

export default CodingPracticeScreen;