
import React, { useState } from 'react';
import type { InterviewFeedback, QuestionFeedback } from '../types';
import { ChevronDownIcon, ChevronUpIcon } from './icons';

interface FeedbackScreenProps {
  feedback: InterviewFeedback;
  onRestart: () => void;
  isHistoryView?: boolean;
}

const ScoreCircle: React.FC<{ score: number }> = ({ score }) => {
    const getColor = (s: number) => {
        if (s >= 8) return 'text-green-400 border-green-400';
        if (s >= 5) return 'text-yellow-400 border-yellow-400';
        return 'text-red-400 border-red-400';
    };

    return (
        <div className={`w-32 h-32 rounded-full border-4 flex items-center justify-center ${getColor(score)}`}>
            <span className="text-5xl font-bold">{score}</span>
            <span className="text-2xl mt-4">/10</span>
        </div>
    );
};

const FeedbackCard: React.FC<{ item: QuestionFeedback, index: number }> = ({ item, index }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="bg-dark-card rounded-lg overflow-hidden border border-dark-subtle">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full p-4 flex justify-between items-center text-left"
            >
                <span className="font-semibold text-lg text-white">Question {index + 1}</span>
                <div className="flex items-center gap-4">
                   <span className={`font-bold text-lg ${item.score >= 8 ? 'text-green-400' : item.score >= 5 ? 'text-yellow-400' : 'text-red-400'}`}>{item.score}/10</span>
                   {isOpen ? <ChevronUpIcon className="w-6 h-6" /> : <ChevronDownIcon className="w-6 h-6" />}
                </div>
            </button>
            {isOpen && (
                <div className="p-4 border-t border-dark-subtle animate-fade-in">
                    <p className="font-semibold text-dark-text mb-2">{item.question}</p>
                    <p className="italic bg-dark-bg p-3 rounded-md text-dark-text mb-4">Your answer: "{item.answer}"</p>
                    <h4 className="font-semibold text-brand-primary mb-2">Feedback:</h4>
                    <p className="text-dark-text whitespace-pre-wrap">{item.feedback}</p>
                </div>
            )}
        </div>
    );
};

const FeedbackScreen: React.FC<FeedbackScreenProps> = ({ feedback, onRestart, isHistoryView = false }) => {
  return (
    <div className="w-full animate-slide-in-up">
      <div className="text-center p-8 bg-dark-card rounded-lg mb-8">
        <h2 className="text-3xl font-bold text-white mb-4">{isHistoryView ? 'Interview Review' : 'Interview Complete!'}</h2>
        <div className="flex justify-center my-6">
            <ScoreCircle score={feedback.overallScore} />
        </div>
        <p className="text-lg text-dark-text max-w-3xl mx-auto">{feedback.overallFeedback}</p>
      </div>
      
      <h3 className="text-2xl font-bold text-white mb-4">Detailed Feedback</h3>
      <div className="space-y-4 mb-8">
        {feedback.questionFeedback.map((item, index) => (
          <FeedbackCard key={index} item={item} index={index} />
        ))}
      </div>

      <div className="text-center">
        <button
          onClick={onRestart}
          className="px-8 py-3 bg-brand-primary hover:bg-brand-secondary text-white font-bold rounded-lg transition-colors"
        >
          {isHistoryView ? 'Back to Dashboard' : 'Try Another Interview'}
        </button>
      </div>
    </div>
  );
};

export default FeedbackScreen;
