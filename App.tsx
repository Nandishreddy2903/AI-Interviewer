import React, { useState, useEffect, useCallback } from 'react';
import { useInterviewState } from './hooks/useInterviewState';
import { InterviewFlowState, InterviewSession, InProgressInterview, InterviewerPersona, InterviewDifficulty } from './types';
import Header from './components/Header';
import InterviewSetup from './components/InterviewSetup';
import LoadingView from './components/LoadingView';
import InterviewScreen from './components/InterviewScreen';
import FeedbackScreen from './components/FeedbackScreen';
import Dashboard from './components/Dashboard';
import AuthScreen from './components/AuthScreen';
import CodingPracticeScreen from './components/CodingPracticeScreen';
import { BrainCircuitIcon } from './components/icons';
import { useAuth } from './hooks/useAuth';
import { getHistory, saveHistory } from './services/historyService';
import { getInProgressInterview, discardInProgressInterview } from './services/api';


type View = 'DASHBOARD' | 'SETUP' | 'INTERVIEW' | 'FEEDBACK' | 'CODING_PRACTICE';

export default function App(): React.ReactNode {
  const { user, token, login, logout, isLoading: isAuthLoading } = useAuth();
  const [view, setView] = useState<View>('DASHBOARD');
  const [history, setHistory] = useState<InterviewSession[]>([]);
  const [selectedFeedback, setSelectedFeedback] = useState<InterviewSession | null>(null);
  const [inProgressSession, setInProgressSession] = useState<InProgressInterview | null>(null);
  const [isDataLoading, setIsDataLoading] = useState(true);

  // This is the main state machine for the interview process.
  // We pass it a callback that fires when the interview is complete.
  const interviewState = useInterviewState(async (session) => {
    if (!user) return;
    // When an interview finishes, we save it to the DB via the API,
    // which then updates the history for the dashboard.
    await saveHistory(session);
    const newHistory = await getHistory();
    setHistory(newHistory);
    setSelectedFeedback(session);
    setView('FEEDBACK');
  });

  // This effect handles loading all user-specific data from the backend when they log in.
  useEffect(() => {
    const loadUserData = async () => {
      if (user && token) {
        setIsDataLoading(true);
        try {
          // Fetch both history and any in-progress interviews concurrently.
          const [historyData, inProgressData] = await Promise.all([
            getHistory(),
            getInProgressInterview()
          ]);
          setHistory(historyData);
          setInProgressSession(inProgressData);
        } catch (error) {
          console.error("Failed to load user data:", error);
          // If the token is invalid, log the user out.
          logout();
        } finally {
          setIsDataLoading(false);
        }
      } else {
        // User is logged out, so clear all their data from the app state.
        setHistory([]);
        setInProgressSession(null);
        setIsDataLoading(false);
      }
    };

    loadUserData();
  }, [user, token, logout]);

  const onStartSetup = () => setView('SETUP');
  const onStartCodingPractice = () => setView('CODING_PRACTICE');

  const onStartInterview = useCallback((role: string, persona: InterviewerPersona, difficulty: InterviewDifficulty) => {
    interviewState.startInterview(role, persona, difficulty);
    setView('INTERVIEW');
  }, [interviewState]);

  const onReviewFeedback = (session: InterviewSession) => {
    setSelectedFeedback(session);
    setView('FEEDBACK');
  };

  // This gets called from the feedback screen or the header's home button.
  const onBackToDashboard = async () => {
    setSelectedFeedback(null);
    interviewState.restartInterview(); // Make sure to clear out any old interview state.
    // Refresh history in case it changed
    if(user) {
        setHistory(await getHistory());
    }
    setView('DASHBOARD');
  }

  const handleResume = () => {
    if (inProgressSession) {
        interviewState.resumeInterview(inProgressSession);
        setView('INTERVIEW');
        setInProgressSession(null); // Clear the prompt from the dashboard
    }
  };

  const handleDiscard = async () => {
      await discardInProgressInterview();
      setInProgressSession(null);
  };

  // If we are still checking for a token, show a global loading screen.
  if (isAuthLoading) {
    return <LoadingView message="Authenticating..." />;
  }

  // If there's no user, the whole app is just the login screen.
  if (!user) {
    return <AuthScreen onLogin={login} />;
  }
  
  if (isDataLoading) {
    return (
        <div className="min-h-screen flex flex-col items-center p-4 sm:p-6 md:p-8">
            <Header onLogout={logout} userEmail={user.email} showActions={true} onHome={onBackToDashboard}/>
            <main className="w-full max-w-4xl flex-grow flex items-center justify-center">
                 <LoadingView message="Loading your dashboard..." />
            </main>
        </div>
    );
  }
  
  // This is the main router for our app. It decides which component to show
  // based on the current `view` and `interviewState.flowState`.
  const renderContent = () => {
    // If we're reviewing a specific feedback session, show that screen above all else.
    if (selectedFeedback) {
       return <FeedbackScreen feedback={selectedFeedback.feedback} onRestart={onBackToDashboard} isHistoryView={true} />;
    }
    
    switch (view) {
      case 'DASHBOARD':
        return <Dashboard 
                  onStart={onStartSetup} 
                  onStartCodingPractice={onStartCodingPractice}
                  history={history} 
                  onReview={onReviewFeedback}
                  inProgressSession={inProgressSession}
                  onResume={handleResume}
                  onDiscard={handleDiscard}
                />;
      case 'SETUP':
        return <InterviewSetup onStart={onStartInterview} />;
      case 'CODING_PRACTICE':
        return <CodingPracticeScreen />;
      case 'INTERVIEW':
        // A simple flag to check if the AI is currently "thinking".
        const isAwaitingAI = interviewState.flowState === InterviewFlowState.GENERATING_QUESTION || interviewState.flowState === InterviewFlowState.GENERATING_HINT || interviewState.flowState === InterviewFlowState.GENERATING_CODING_QUESTION;
        switch (interviewState.flowState) {
          // Show various loading messages depending on what the AI is doing.
          case InterviewFlowState.GENERATING_QUESTION:
            return <LoadingView message={interviewState.questionCount === 0 ? "Preparing your interview..." : "Thinking of a follow-up question..."} />;
           case InterviewFlowState.GENERATING_CODING_QUESTION:
            return <LoadingView message="Preparing a coding challenge..." />;
           case InterviewFlowState.GENERATING_HINT:
            return <LoadingView message="Thinking of a helpful hint..." />;
          // These are the two main states where the user is expected to do something.
          case InterviewFlowState.AWAITING_ANSWER:
          case InterviewFlowState.AWAITING_CODE_SUBMISSION:
              return (
                <InterviewScreen
                  flowState={interviewState.flowState}
                  conversation={interviewState.conversation}
                  questionNumber={interviewState.questionCount}
                  totalQuestions={interviewState.totalQuestions}
                  answer={interviewState.userAnswer}
                  onAnswerChange={interviewState.setUserAnswer}
                  onSubmit={interviewState.submitAnswer}
                  onGetHint={interviewState.getHint}
                  onSkipQuestion={interviewState.skipQuestion}
                  isAwaitingResponse={isAwaitingAI}
                  userCode={interviewState.userCode}
                  onCodeChange={interviewState.setUserCode}
                  onSubmitCode={interviewState.submitCode}
                />
              );
          case InterviewFlowState.GENERATING_FEEDBACK:
            return <LoadingView message="Analyzing your answers and generating detailed feedback..." />;
          case InterviewFlowState.COMPLETE:
            // This is a transitional state. We show a loading message while the onComplete callback
            // saves the data and prepares the feedback view. This prevents the InterviewScreen from re-rendering
            // and triggering the text-to-speech of the last question.
            return <LoadingView message="Finalizing results..." />;
          case InterviewFlowState.ERROR:
             return (
              <div className="text-center text-red-400 bg-red-900/50 p-8 rounded-lg animate-fade-in">
                <h2 className="text-2xl font-bold mb-4">An Error Occurred</h2>
                <p className="mb-6">{interviewState.error}</p>
                <button
                  onClick={onBackToDashboard}
                  className="px-6 py-2 bg-brand-primary hover:bg-brand-secondary text-white font-semibold rounded-lg transition-colors"
                >
                  Back to Dashboard
                </button>
              </div>
            );
          default:
             // Fallback for edge cases where the state might be something unexpected
             // but we still have a conversation history. Better to show the chat than a blank screen.
             if (interviewState.conversation.length > 0) {
                 return (
                    <InterviewScreen
                      flowState={interviewState.flowState}
                      conversation={interviewState.conversation}
                      questionNumber={interviewState.questionCount}
                      totalQuestions={interviewState.totalQuestions}
                      answer={interviewState.userAnswer}
                      onAnswerChange={interviewState.setUserAnswer}
                      onSubmit={interviewState.submitAnswer}
                      onGetHint={interviewState.getHint}
                      onSkipQuestion={interviewState.skipQuestion}
                      isAwaitingResponse={isAwaitingAI}
                      userCode={interviewState.userCode}
                      onCodeChange={interviewState.setUserCode}
                      onSubmitCode={interviewState.submitCode}
                    />
                 );
            }
            // The initial state before the first question is generated.
            return <LoadingView message="Loading interview..." />;
        }
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-4 sm:p-6 md:p-8">
      <Header onLogout={logout} userEmail={user.email} showActions={view !== 'INTERVIEW'} onHome={onBackToDashboard}/>
      <main className="w-full max-w-4xl flex-grow flex items-center justify-center">
        {renderContent()}
      </main>
      <footer className="w-full max-w-4xl text-center text-dark-subtle mt-8 text-sm">
        <p>&copy; 2024 AI Interviewer. All rights reserved.</p>
      </footer>
    </div>
  );
}