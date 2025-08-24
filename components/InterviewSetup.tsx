
import React, { useState } from 'react';
import { INTERVIEW_ROLES, INTERVIEWER_PERSONAS, INTERVIEW_DIFFICULTIES } from '../constants';
import type { InterviewerPersona, InterviewDifficulty } from '../types';

interface InterviewSetupProps {
  onStart: (role: string, persona: InterviewerPersona, difficulty: InterviewDifficulty) => void;
}

const SetupCard: React.FC<{
    title: string;
    description: string;
    options: readonly { id: string; name: string; description: string }[];
    selectedValue: string | null;
    onSelect: (value: any) => void;
}> = ({ title, description, options, selectedValue, onSelect }) => (
    <div className="bg-dark-card p-6 rounded-lg animate-fade-in">
        <h3 className="text-2xl font-bold text-white mb-2">{title}</h3>
        <p className="text-dark-text mb-6">{description}</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {options.map((option) => (
                <button
                    key={option.id}
                    onClick={() => onSelect(option.id)}
                    className={`p-4 text-left rounded-lg transition-all duration-200 border-2 ${selectedValue === option.id ? 'bg-brand-primary border-brand-primary scale-105' : 'bg-dark-bg border-dark-subtle hover:border-brand-secondary'}`}
                >
                    <h4 className="font-bold text-white">{option.name}</h4>
                    <p className="text-sm text-dark-text">{option.description}</p>
                </button>
            ))}
        </div>
    </div>
);


const InterviewSetup: React.FC<InterviewSetupProps> = ({ onStart }) => {
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [selectedPersona, setSelectedPersona] = useState<InterviewerPersona | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<InterviewDifficulty | null>(null);

  const isSetupComplete = selectedRole && selectedPersona && selectedDifficulty;

  return (
    <div className="w-full text-center animate-fade-in space-y-8">
      <div>
         <h2 className="text-3xl sm:text-4xl font-bold text-white mb-2">Customize Your Interview</h2>
         <p className="text-lg text-dark-text max-w-2xl mx-auto">
            Select a role, an interviewer persona, and a difficulty level to begin.
        </p>
      </div>

      <div className="space-y-8 text-left">
         <SetupCard
            title="1. Select a Role"
            description="Choose the job role you want to practice for."
            options={INTERVIEW_ROLES.map(r => ({id: r, name: r, description: `Questions tailored for a ${r}.`}))}
            selectedValue={selectedRole}
            onSelect={setSelectedRole}
        />
        <SetupCard
            title="2. Choose Your Interviewer"
            description="Each persona offers a different interview style and experience."
            options={INTERVIEWER_PERSONAS}
            selectedValue={selectedPersona}
            onSelect={setSelectedPersona}
        />
        <SetupCard
            title="3. Set the Difficulty"
            description="This will adjust the complexity of the technical and behavioral questions."
            options={INTERVIEW_DIFFICULTIES}
            selectedValue={selectedDifficulty}
            onSelect={setSelectedDifficulty}
        />
      </div>

      <div className="pt-4">
          <button
            onClick={() => {
                if(isSetupComplete) {
                    onStart(selectedRole, selectedPersona, selectedDifficulty)
                }
            }}
            disabled={!isSetupComplete}
            className="px-12 py-4 bg-brand-primary hover:bg-brand-secondary text-white font-bold rounded-lg transition-all duration-300 text-lg disabled:bg-dark-subtle disabled:cursor-not-allowed disabled:scale-100 transform hover:scale-105"
          >
            {isSetupComplete ? 'Start Interview' : 'Complete Setup to Start'}
          </button>
      </div>
    </div>
  );
};

export default InterviewSetup;