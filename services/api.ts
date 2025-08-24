import type { InterviewSession, InProgressInterview, SolvedCodingProblem, CodingChallenge, Language, InterviewDifficulty } from '../types';

const API_URL = 'http://localhost:5000/api'; // The backend server URL.

// A helper function to handle API requests and errors.
async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('token');
  const headers = new Headers(options.headers || {});
  headers.append('Content-Type', 'application/json');

  if (token) {
    headers.append('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    // Try to parse the error message from the backend, otherwise use a generic message.
    const errorData = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(errorData.message || 'An unknown API error occurred');
  }
  // For DELETE requests or others that might not have a body
  if (response.status === 204) {
      return null as T;
  }

  return response.json();
}

// --- Auth ---
export const register = (email: string, password: string): Promise<{ email: string; token: string }> => {
  return apiRequest('/users/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
};

export const login = (email: string, password: string): Promise<{ email: string; token: string }> => {
  return apiRequest('/users/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
};

// --- History ---
export const getInterviewHistory = (): Promise<InterviewSession[]> => {
  return apiRequest('/interviews/history');
};

export const saveCompletedInterview = (session: InterviewSession): Promise<InterviewSession> => {
  return apiRequest('/interviews/history', {
    method: 'POST',
    body: JSON.stringify(session),
  });
};

// --- In-Progress Interviews ---
export const getInProgressInterview = (): Promise<InProgressInterview | null> => {
    return apiRequest('/interviews/inprogress');
};

export const saveInProgressInterview = (data: InProgressInterview): Promise<InProgressInterview> => {
    return apiRequest('/interviews/inprogress', {
        method: 'POST',
        body: JSON.stringify(data),
    });
};

export const discardInProgressInterview = (): Promise<void> => {
    return apiRequest('/interviews/inprogress', {
        method: 'DELETE',
    });
};


// --- AI Service Proxy ---
export const callAIService = (action: string, payload: object): Promise<any> => {
    return apiRequest('/ai/generate', {
        method: 'POST',
        body: JSON.stringify({ action, payload }),
    });
};

// --- Coding Practice ---
export const getSolvedCodingProblems = (): Promise<SolvedCodingProblem[]> => {
  return apiRequest('/coding-practice/history');
};

export const saveSolvedCodingProblem = (data: {
  challenge: CodingChallenge;
  solution: { language: Language; code: string };
  difficulty: InterviewDifficulty;
}): Promise<SolvedCodingProblem> => {
  return apiRequest('/coding-practice/solved', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};