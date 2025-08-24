import type { InterviewFeedback, ChatMessage, InterviewerPersona, InterviewDifficulty, CodingChallenge, Language } from '../types';
import { callAIService } from './api';

/**
 * All AI model calls are proxied through our own backend server.
 * This is a critical security measure to protect the API key.
 * This service is the client-side interface for constructing requests
 * to the backend's various AI-driven features.
 */

export const generateFirstQuestion = async (role: string, persona: InterviewerPersona, difficulty: InterviewDifficulty): Promise<string> => {
    const { question } = await callAIService('generateFirstQuestion', { role, persona, difficulty });
    return question;
};

export const generateFollowUpQuestion = async (role: string, persona: InterviewerPersona, difficulty: InterviewDifficulty, conversation: ChatMessage[]): Promise<string> => {
    const { question } = await callAIService('generateFollowUpQuestion', { role, persona, difficulty, conversation });
    return question;
};

export const generateCodingQuestion = async (role: string, difficulty: InterviewDifficulty): Promise<CodingChallenge> => {
    const result = await callAIService('generateCodingQuestion', { role, difficulty });
    return result as CodingChallenge;
};

export const generateCodeForLanguage = async (
    problemTitle: string,
    problemDescription: string,
    language: Language
): Promise<{ starterCode: string; testCase: { input: any[]; expectedOutput: any; } }> => {
    const result = await callAIService('generateCodeForLanguage', { problemTitle, problemDescription, language });
    return result;
};

export const generateCodingProblems = async (difficulty: InterviewDifficulty, count: number = 3): Promise<CodingChallenge[]> => {
    const { problems } = await callAIService('generateCodingProblems', { difficulty, count });
    return problems;
};

export const generateHint = async (conversation: ChatMessage[]): Promise<string> => {
    const { hint } = await callAIService('generateHint', { conversation });
    return hint;
};

export const getInterviewFeedback = async (conversation: ChatMessage[]): Promise<InterviewFeedback> => {
    const result = await callAIService('getInterviewFeedback', { conversation });
    return result as InterviewFeedback;
};