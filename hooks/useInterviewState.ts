import { useState, useCallback, useEffect } from 'react';
import { InterviewFlowState, InterviewSession, ChatMessage, InProgressInterview, InterviewerPersona, InterviewDifficulty, CodingChallenge } from '../types';
import { generateFirstQuestion, generateFollowUpQuestion, getInterviewFeedback, generateHint, generateCodingQuestion } from '../services/geminiService';
import { saveInProgressInterview, discardInProgressInterview } from '../services/api';

// Some constants to control the interview flow.
const MAX_QUESTIONS = 5;
const CODING_CHALLENGE_AT_QUESTION = 2; // The coding challenge will be the 2nd question.

/**
 * This is the heart of the interview logic. It's a custom hook that manages the entire state
 * and flow of a single interview session, from start to finish.
 * @param onComplete A callback function that gets triggered when the interview is successfully completed.
 */
export const useInterviewState = (onComplete: (session: InterviewSession) => void) => {
  const [flowState, setFlowState] = useState<InterviewFlowState>(InterviewFlowState.SETUP);
  const [role, setRole] = useState<string>('');
  const [persona, setPersona] = useState<InterviewerPersona>('friendly');
  const [difficulty, setDifficulty] = useState<InterviewDifficulty>('mid');
  const [conversation, setConversation] = useState<ChatMessage[]>([]);
  const [userAnswer, setUserAnswer] = useState('');
  const [userCode, setUserCode] = useState('');
  const [codingChallenge, setCodingChallenge] = useState<CodingChallenge | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [questionCount, setQuestionCount] = useState(0);

  // This effect is our "auto-save" feature.
  // Whenever a key piece of interview state changes, we save it to the database via the API.
  useEffect(() => {
    const isInterviewActive = flowState === InterviewFlowState.AWAITING_ANSWER || 
                              flowState === InterviewFlowState.AWAITING_CODE_SUBMISSION ||
                              flowState === InterviewFlowState.GENERATING_QUESTION;

    if (isInterviewActive && role) { // Check for role to ensure interview has started
        const stateToSave: InProgressInterview = { role, persona, difficulty, conversation, questionCount, codingChallenge, userCode };
        saveInProgressInterview(stateToSave).catch(err => console.error("Failed to save progress:", err));
    }
  }, [flowState, role, persona, difficulty, conversation, questionCount, codingChallenge, userCode]);

  const startInterview = useCallback(async (selectedRole: string, selectedPersona: InterviewerPersona, selectedDifficulty: InterviewDifficulty) => {
    // Reset everything to a clean state before starting.
    setFlowState(InterviewFlowState.GENERATING_QUESTION);
    setError(null);
    setRole(selectedRole);
    setPersona(selectedPersona);
    setDifficulty(selectedDifficulty);
    setConversation([]);
    setQuestionCount(0);
    setUserAnswer('');
    setUserCode('');
    setCodingChallenge(null);
    try {
      const firstQuestion = await generateFirstQuestion(selectedRole, selectedPersona, selectedDifficulty);
      setConversation([{ speaker: 'ai', content: firstQuestion }]);
      setQuestionCount(1);
      setFlowState(InterviewFlowState.AWAITING_ANSWER);
    } catch (e) {
      const err = e as Error;
      setError(err.message);
      setFlowState(InterviewFlowState.ERROR);
    }
  }, []);

  const resumeInterview = useCallback((savedState: InProgressInterview) => {
    // This function takes a saved session object and restores the interview state.
    setRole(savedState.role);
    setPersona(savedState.persona);
    setDifficulty(savedState.difficulty);
    setConversation(savedState.conversation);
    setQuestionCount(savedState.questionCount);
    setCodingChallenge(savedState.codingChallenge || null);
    setUserCode(savedState.userCode || '');
    setUserAnswer('');
    setError(null);
    // Put the user right back where they were, whether it was answering a question or coding.
    setFlowState(savedState.codingChallenge ? InterviewFlowState.AWAITING_CODE_SUBMISSION : InterviewFlowState.AWAITING_ANSWER);
  }, []);

  const getHint = useCallback(async () => {
    setFlowState(InterviewFlowState.GENERATING_HINT);
    try {
        const hint = await generateHint(conversation);
        setConversation(prev => [...prev, {speaker: 'ai', content: `Of course, here is a hint: ${hint}`}]);
    } catch (e) {
        const err = e as Error;
        // Even if hint generation fails, we should tell the user what happened.
        setConversation(prev => [...prev, {speaker: 'ai', content: `Sorry, I couldn't generate a hint at the moment. ${err.message}`}]);
    } finally {
        // Always return to the awaiting answer state, regardless of success or failure.
        setFlowState(InterviewFlowState.AWAITING_ANSWER);
    }
  }, [conversation]);

  const advanceInterview = useCallback(async (currentConversation: ChatMessage[]) => {
    // This function contains the shared logic for advancing the interview,
    // whether an answer was submitted or a question was skipped.
    if (questionCount === CODING_CHALLENGE_AT_QUESTION) {
      setFlowState(InterviewFlowState.GENERATING_CODING_QUESTION);
      try {
        const challenge = await generateCodingQuestion(role, difficulty);
        setCodingChallenge(challenge);
        setUserCode(challenge.starterCode);
        setConversation(prev => [...prev, { speaker: 'ai', content: `${challenge.title}\n\n${challenge.description}`, coding: 'challenge' }]);
        setFlowState(InterviewFlowState.AWAITING_CODE_SUBMISSION);
      } catch (e) {
        const err = e as Error;
        setError(err.message);
        setFlowState(InterviewFlowState.ERROR);
      }
      return;
    }

    if (questionCount < MAX_QUESTIONS) {
      setFlowState(InterviewFlowState.GENERATING_QUESTION);
      try {
        const nextQuestion = await generateFollowUpQuestion(role, persona, difficulty, currentConversation);
        setConversation(prev => [...prev, { speaker: 'ai', content: nextQuestion }]);
        setQuestionCount(prev => prev + 1);
        setFlowState(InterviewFlowState.AWAITING_ANSWER);
      } catch (e) {
        const err = e as Error;
        setError(err.message);
        setFlowState(InterviewFlowState.ERROR);
      }
    } else {
      setFlowState(InterviewFlowState.GENERATING_FEEDBACK);
      try {
        await discardInProgressInterview();
        const generatedFeedback = await getInterviewFeedback(currentConversation);
        const session: InterviewSession = { role, persona, difficulty, date: new Date().toISOString(), feedback: generatedFeedback };
        onComplete(session);
        setFlowState(InterviewFlowState.COMPLETE);
      } catch (e) {
        const err = e as Error;
        setError(err.message);
        setFlowState(InterviewFlowState.ERROR);
      }
    }
  }, [role, persona, difficulty, questionCount, onComplete]);
  
  const submitAnswer = useCallback(async () => {
    if (!userAnswer.trim()) return;
    const newConversation: ChatMessage[] = [...conversation, { speaker: 'user', content: userAnswer }];
    setConversation(newConversation);
    setUserAnswer('');
    await advanceInterview(newConversation);
  }, [conversation, userAnswer, advanceInterview]);
  
  // This helper function contains the logic for what to do after the coding challenge is finished (either by submission or skipping).
  const continueAfterCodingChallenge = useCallback(async (currentConversation: ChatMessage[]) => {
      setCodingChallenge(null); // Mark challenge as completed.
      setUserCode(''); // Clear the code editor.

      if (questionCount < MAX_QUESTIONS) {
          setFlowState(InterviewFlowState.GENERATING_QUESTION);
          try {
              const nextQuestion = await generateFollowUpQuestion(role, persona, difficulty, currentConversation);
              setConversation(prev => [...prev, { speaker: 'ai', content: nextQuestion }]);
              setQuestionCount(prev => prev + 1);
              setFlowState(InterviewFlowState.AWAITING_ANSWER);
          } catch (e) {
              const err = e as Error;
              setError(err.message);
              setFlowState(InterviewFlowState.ERROR);
          }
      } else {
          setFlowState(InterviewFlowState.GENERATING_FEEDBACK);
          try {
              await discardInProgressInterview();
              const generatedFeedback = await getInterviewFeedback(currentConversation);
              onComplete({ role, persona, difficulty, date: new Date().toISOString(), feedback: generatedFeedback });
              setFlowState(InterviewFlowState.COMPLETE);
          } catch (e) {
              const err = e as Error;
              setError(err.message);
              setFlowState(InterviewFlowState.ERROR);
          }
      }
  }, [role, persona, difficulty, questionCount, onComplete]);


  const skipQuestion = useCallback(async () => {
      if (flowState === InterviewFlowState.AWAITING_CODE_SUBMISSION) {
          // Skipping a coding challenge.
          const newConversation: ChatMessage[] = [...conversation, { speaker: 'user', content: '(Skipped the coding challenge)' }];
          setConversation(newConversation);
          await continueAfterCodingChallenge(newConversation);
      } else {
          // Skipping a regular question.
          const newConversation: ChatMessage[] = [...conversation, { speaker: 'user', content: '(Skipped this question)' }];
          setConversation(newConversation);
          setUserAnswer('');
          await advanceInterview(newConversation);
      }
  }, [conversation, advanceInterview, continueAfterCodingChallenge, flowState]);
  

  const submitCode = useCallback(async () => {
      if (!userCode.trim() || !codingChallenge) return;

      setFlowState(InterviewFlowState.GENERATING_QUESTION); // We can reuse this state for a generic "Evaluating..." loading screen.
      const newConversation: ChatMessage[] = [...conversation, { speaker: 'user', content: userCode, coding: 'solution' }];
      setConversation(newConversation);
      
      let result: any;
      let executionError: string | null = null;

      try {
        // TODO: This client-side code execution is NOT safe for a production application.
        // It's acceptable for a portfolio project where users only run their own code
        // in their own browser. A production version would need a sandboxed
        // execution environment on the server.
        const runner = new Function(`
          ${userCode}
          try {
            const input = ${JSON.stringify(codingChallenge.testCase.input)};
            const result = solve(...input);
            return result;
          } catch(e) {
            // We catch errors inside the runner to provide better feedback to the user.
            return { __error: e.message };
          }
        `);
        result = runner();
        if (result && result.__error) {
           executionError = result.__error;
        }
      } catch (e) {
        // This catches syntax errors in the user's code before it even runs.
        const err = e as Error;
        executionError = err.message;
      }
      
      await new Promise(resolve => setTimeout(resolve, 500)); // A small delay to make the "Evaluating..." state feel real.

      if (executionError) {
          const errorMessage: ChatMessage = { speaker: 'ai', content: `Your code produced an error: ${executionError}. Please fix it and try again.` };
          setConversation(prev => [...prev, errorMessage]);
          setFlowState(InterviewFlowState.AWAITING_CODE_SUBMISSION);
          return;
      }
      
      if (JSON.stringify(result) === JSON.stringify(codingChallenge.testCase.expectedOutput)) {
          // On correct submission, add a success message and continue the interview.
          const successMessage: ChatMessage = { speaker: 'ai', content: "That's correct! Great job." };
          const successConversation = [...newConversation, successMessage];
          setConversation(successConversation);
          await continueAfterCodingChallenge(successConversation);
      } else {
          // The code ran, but the answer was wrong.
          const feedbackContent = `That's not quite right. For the input \`${JSON.stringify(codingChallenge.testCase.input)}\`, your code returned \`${JSON.stringify(result)}\`, but the expected output was \`${JSON.stringify(codingChallenge.testCase.expectedOutput)}\`. Please try again.`;
          const feedbackMessage: ChatMessage = { speaker: 'ai', content: feedbackContent };
          setConversation(prev => [...prev, feedbackMessage]);
          setFlowState(InterviewFlowState.AWAITING_CODE_SUBMISSION);
      }
  }, [userCode, codingChallenge, conversation, continueAfterCodingChallenge]);
  
  // A clean-up function to reset the state completely.
  const restartInterview = useCallback(async () => {
    setFlowState(InterviewFlowState.SETUP);
    setConversation([]);
    setUserAnswer('');
    setUserCode('');
    setCodingChallenge(null);
    setError(null);
    setRole('');
    setQuestionCount(0);
    // Important: also clear any saved in-progress interview from the database.
    try {
        await discardInProgressInterview();
    } catch(e) {
        console.error("Could not discard in-progress interview on restart:", e);
    }
  }, []);

  return {
    flowState,
    startInterview,
    submitAnswer,
    skipQuestion,
    submitCode,
    getHint,
    conversation,
    questionCount,
    totalQuestions: MAX_QUESTIONS,
    userAnswer,
    setUserAnswer,
    userCode,
    setUserCode,
    error,
    restartInterview,
    resumeInterview,
  };
};