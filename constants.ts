
export const INTERVIEW_ROLES: string[] = [
  "Frontend React Developer",
  "Backend Node.js Developer",
  "Full-Stack Engineer",
  "Product Manager",
  "UI/UX Designer",
  "Data Scientist",
];

export const INTERVIEWER_PERSONAS = [
  { id: 'friendly' as const, name: 'Friendly HR Manager', description: 'Warm, encouraging, and focuses on behavioral and cultural fit.' },
  { id: 'direct' as const, name: 'Direct Technical Lead', description: 'Concise and focused on technical depth. Expects efficient answers.' },
  { id: 'supportive' as const, name: 'Supportive Senior Peer', description: 'Collaborative and aims to understand your thought process.' },
];

export const INTERVIEW_DIFFICULTIES = [
  { id: 'junior' as const, name: 'Junior Level', description: 'Focuses on fundamental concepts and basic problem-solving.' },
  { id: 'mid' as const, name: 'Mid-Level', description: 'Includes more complex scenarios and system design questions.' },
  { id: 'senior' as const, name: 'Senior Level', description: 'Challenges with advanced topics, architecture, and leadership.' },
];

export const SUPPORTED_LANGUAGES = [
    { id: 'javascript' as const, name: 'JavaScript', prismId: 'javascript' },
    { id: 'python' as const, name: 'Python', prismId: 'python' },
    { id: 'cpp' as const, name: 'C++', prismId: 'cpp' },
    { id: 'java' as const, name: 'Java', prismId: 'java' },
];
