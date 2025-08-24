import React, { useState } from 'react';
import type { InterviewSession, InProgressInterview } from '../types';
import { BrainCircuitIcon, BookOpenIcon, AlertTriangleIcon } from './icons';
import Modal from './Modal';

interface DashboardProps {
  onStart: () => void;
  onStartCodingPractice: () => void;
  history: InterviewSession[];
  onReview: (session: InterviewSession) => void;
  inProgressSession: InProgressInterview | null;
  onResume: () => void;
  onDiscard: () => void;
}

const ResumePrompt: React.FC<{ onResume: () => void; onDiscard: () => void }> = ({ onResume, onDiscard }) => (
    <div className="bg-yellow-900/50 border border-yellow-400 text-yellow-200 p-6 rounded-lg mb-8 text-center animate-fade-in">
        <h3 className="text-2xl font-bold mb-2">Interview in Progress</h3>
        <p className="mb-4">You have an unfinished interview session. Would you like to continue?</p>
        <div className="flex justify-center gap-4">
            <button onClick={onResume} className="px-6 py-2 bg-brand-primary hover:bg-brand-secondary text-white font-semibold rounded-lg">Resume</button>
            <button onClick={onDiscard} className="px-6 py-2 bg-dark-card hover:bg-dark-subtle text-dark-text font-semibold rounded-lg">Discard</button>
        </div>
    </div>
);

const AnalyticsSummary: React.FC<{ history: InterviewSession[] }> = ({ history }) => {
    if (history.length === 0) return null;

    const totalInterviews = history.length;
    const averageScore = history.reduce((acc, session) => acc + session.feedback.overallScore, 0) / totalInterviews;

    return (
        <div className="bg-dark-card p-6 rounded-lg mb-8 grid grid-cols-1 sm:grid-cols-2 gap-6 text-left">
            <div>
                <h3 className="text-lg font-semibold text-white mb-2">Performance Summary</h3>
                <p className="text-sm text-dark-text">A quick look at your progress so far.</p>
            </div>
            <div className="flex items-center justify-around bg-dark-bg p-4 rounded-lg">
                <div className="text-center">
                    <p className="text-3xl font-bold text-brand-primary">{totalInterviews}</p>
                    <p className="text-sm text-dark-text">Interviews Done</p>
                </div>
                <div className="text-center">
                     <p className="text-3xl font-bold text-brand-primary">{averageScore.toFixed(1)}<span className="text-xl text-dark-subtle">/10</span></p>
                    <p className="text-sm text-dark-text">Average Score</p>
                </div>
            </div>
        </div>
    );
};

const HistoryCard: React.FC<{ session: InterviewSession; onReview: () => void }> = ({ session, onReview }) => {
    const { role, date, feedback, persona, difficulty } = session;
    const score = feedback.overallScore;
    const getColor = (s: number) => {
        if (s >= 8) return 'border-l-green-400';
        if (s >= 5) return 'border-l-yellow-400';
        return 'border-l-red-400';
    };

    return (
        <div className={`bg-dark-card p-4 rounded-lg border-l-4 ${getColor(score)} flex justify-between items-center`}>
            <div>
                <h3 className="font-bold text-white text-lg">{role}</h3>
                <p className="text-sm text-dark-text capitalize">{`${difficulty} | ${persona}`}</p>
                <p className="text-sm text-dark-text mt-1">{new Date(date).toLocaleDateString()}</p>
            </div>
            <div className="flex items-center gap-4">
                 <span className={`font-bold text-xl ${score >= 8 ? 'text-green-400' : score >= 5 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {score}/10
                 </span>
                <button onClick={onReview} className="px-4 py-2 bg-brand-primary hover:bg-brand-secondary text-white font-semibold rounded-lg transition-colors text-sm">
                    Review
                </button>
            </div>
        </div>
    );
};


const Dashboard: React.FC<DashboardProps> = ({ onStart, onStartCodingPractice, history, onReview, inProgressSession, onResume, onDiscard }) => {
  const [isDiscardModalOpen, setIsDiscardModalOpen] = useState(false);
  
  const handleConfirmDiscard = () => {
    onDiscard();
    setIsDiscardModalOpen(false);
  };

  return (
    <>
      <div className="w-full animate-fade-in">
          {inProgressSession && <ResumePrompt onResume={onResume} onDiscard={() => setIsDiscardModalOpen(true)} />}
          
          <div className="grid md:grid-cols-2 gap-8 mb-8">
              <div className="bg-dark-card p-8 rounded-lg text-center flex flex-col items-center justify-center">
                  <div className="bg-brand-primary/20 p-4 rounded-full mb-4">
                      <BrainCircuitIcon className="w-10 h-10 text-brand-primary" />
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2">AI Interview</h2>
                  <p className="text-dark-text mb-6">
                    Sharpen your skills with a realistic, AI-powered interview experience.
                  </p>
                  <button
                      onClick={onStart}
                      className="w-full px-10 py-3 bg-brand-primary hover:bg-brand-secondary text-white font-bold rounded-lg transition-colors text-lg"
                  >
                      Start New Interview
                  </button>
              </div>
              <div className="bg-dark-card p-8 rounded-lg text-center flex flex-col items-center justify-center">
                   <div className="bg-purple-500/20 p-4 rounded-full mb-4">
                      <BookOpenIcon className="w-10 h-10 text-purple-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2">Coding Practice</h2>
                  <p className="text-dark-text mb-6">
                    Hone your problem-solving abilities in a dedicated coding environment.
                  </p>
                  <button
                      onClick={onStartCodingPractice}
                      className="w-full px-10 py-3 bg-dark-bg hover:bg-dark-subtle text-white font-bold rounded-lg transition-colors text-lg"
                  >
                      Go to Practice
                  </button>
              </div>
          </div>

        <div className="text-left">
          <AnalyticsSummary history={history} />
          <h3 className="text-2xl font-bold text-white mb-4">Interview History</h3>
          {history.length > 0 ? (
               <div className="space-y-4">
                  {history.map((session) => (
                      <HistoryCard key={session.date} session={session} onReview={() => onReview(session)} />
                  ))}
              </div>
          ) : (
              <div className="text-center bg-dark-card p-8 rounded-lg">
                  <div className="flex justify-center items-center gap-3 text-dark-text mb-4">
                      <BrainCircuitIcon className="w-8 h-8"/>
                  </div>
                  <p className="text-dark-text">You have no interview history yet. Complete an interview to see your results here.</p>
              </div>
          )}
        </div>
      </div>
      <Modal 
        isOpen={isDiscardModalOpen}
        onClose={() => setIsDiscardModalOpen(false)}
        title="Discard Interview?"
      >
        <div className="text-center">
            <div className="flex justify-center mb-4">
                <div className="p-3 bg-red-900/50 rounded-full">
                    <AlertTriangleIcon className="w-8 h-8 text-red-400" />
                </div>
            </div>
          <p className="text-dark-text mb-6">
            This will permanently delete your in-progress interview. This action cannot be undone.
          </p>
          <div className="flex justify-center gap-4">
            <button
              onClick={() => setIsDiscardModalOpen(false)}
              className="px-6 py-2 bg-dark-subtle hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmDiscard}
              className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors"
            >
              Discard
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default Dashboard;
