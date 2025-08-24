import { SUPPORTED_LANGUAGES } from "./constants";

export type InterviewerPersona = 'friendly' | 'direct' | 'supportive';
export type InterviewDifficulty = 'junior' | 'mid' | 'senior';
export type Language = typeof SUPPORTED_LANGUAGES[number]['id'];

export enum InterviewFlowState {
  SETUP,
  GENERATING_QUESTION,
  AWAITING_ANSWER,
  GENERATING_HINT,
  GENERATING_CODING_QUESTION,
  AWAITING_CODE_SUBMISSION,
  GENERATING_FEEDBACK,
  COMPLETE,
  ERROR,
}

export interface ChatMessage {
  speaker: 'ai' | 'user';
  content: string;
  coding?: 'challenge' | 'solution';
}

export interface CodingChallenge {
    title: string;
    description: string;
    starterCode: string;
    testCase: {
        input: any[];
        expectedOutput: any;
    };
}

export interface QuestionFeedback {
  question: string;
  answer: string;
  feedback: string;
  score: number;
}

export interface InterviewFeedback {
  overallFeedback: string;
  overallScore: number;
  questionFeedback: QuestionFeedback[];
}

export interface InterviewSession {
    role: string;
    persona: InterviewerPersona;
    difficulty: InterviewDifficulty;
    date: string;
    feedback: InterviewFeedback;
}

export interface InProgressInterview {
    role: string;
    persona: InterviewerPersona;
    difficulty: InterviewDifficulty;
    conversation: ChatMessage[];
    questionCount: number;
    codingChallenge?: CodingChallenge | null;
    userCode?: string;
}

export interface SolvedCodingProblem {
  _id: string; // From MongoDB
  challenge: CodingChallenge;
  solution: {
    language: Language;
    code: string;
  };
  difficulty: InterviewDifficulty;
  solvedAt: string; // ISO date string
}