import React, { useEffect, useState, useRef } from 'react';
import { useTextToSpeech } from '../hooks/useTextToSpeech';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { MicIcon, Volume2Icon, VolumeXIcon, BrainCircuitIcon, UserIcon, LightbulbIcon, CodeIcon } from './icons';
import type { ChatMessage } from '../types';
import { InterviewFlowState } from '../types';
import CodeEditor from './CodeEditor';

// Prism is loaded globally from index.html, but we declare it here for TypeScript.
declare const Prism: any;

interface InterviewScreenProps {
  flowState: InterviewFlowState;
  conversation: ChatMessage[];
  questionNumber: number;
  totalQuestions: number;
  answer: string;
  onAnswerChange: (value: string) => void;
  onSubmit: () => void;
  onGetHint: () => void;
  onSkipQuestion: () => void;
  isAwaitingResponse: boolean;
  userCode: string;
  onCodeChange: (value: string) => void;
  onSubmitCode: () => void;
}

const ChatBubble: React.FC<{ message: ChatMessage }> = ({ message }) => {
    const isAi = message.speaker === 'ai';
    const codeRef = useRef<HTMLElement>(null);

    // This effect runs after the component renders to apply syntax highlighting
    // to any code blocks that need it.
    useEffect(() => {
        if (codeRef.current && message.coding === 'solution') {
            try {
                Prism.highlightElement(codeRef.current);
            } catch (e) {
                console.error("Prism highlighting error:", e);
            }
        }
    }, [message.coding, message.content]); // Re-run if content or type changes.

    const renderContent = () => {
        // Render user-submitted code with syntax highlighting.
        if (message.coding === 'solution') {
            return (
                <pre className="!m-0 !p-0 !bg-transparent rounded-lg"><code ref={codeRef} className="language-javascript">
                    {message.content}
                </code></pre>
            );
        }
        // Render the AI's coding challenge with a distinct title and description.
        if (message.coding === 'challenge') {
            const parts = message.content.split('\n\n');
            const title = parts[0];
            const description = parts.slice(1).join('\n\n');
            return (
                 <div>
                    <h4 className="font-bold text-lg mb-2">{title}</h4>
                    <p className="whitespace-pre-wrap">{description}</p>
                </div>
            )
        }
        // Render a standard text message.
        return <p className="whitespace-pre-wrap">{message.content}</p>;
    };

    return (
        <div className={`flex items-start gap-3 w-full ${isAi ? '' : 'justify-end'}`}>
            {isAi && (
                <div className="w-8 h-8 rounded-full bg-brand-primary flex-shrink-0 flex items-center justify-center">
                    <BrainCircuitIcon className="w-5 h-5 text-white" />
                </div>
            )}
            <div className={`p-4 rounded-lg max-w-xl ${isAi ? 'bg-dark-bg text-white' : 'bg-brand-primary text-white'}`}>
                {renderContent()}
            </div>
             {!isAi && (
                <div className="w-8 h-8 rounded-full bg-dark-subtle flex-shrink-0 flex items-center justify-center">
                    <UserIcon className="w-5 h-5 text-white" />
                </div>
            )}
        </div>
    );
};


const InterviewScreen: React.FC<InterviewScreenProps> = ({
  flowState,
  conversation,
  questionNumber,
  totalQuestions,
  answer,
  onAnswerChange,
  onSubmit,
  onGetHint,
  onSkipQuestion,
  isAwaitingResponse,
  userCode,
  onCodeChange,
  onSubmitCode,
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const { speak, cancel } = useTextToSpeech();
  const {
    isListening,
    transcript,
    startListening,
    stopListening,
    error: speechError,
    isSupported,
  } = useSpeechRecognition();
  const chatEndRef = useRef<HTMLDivElement>(null);
  const lastSpokenMessage = useRef<string | null>(null);

  const lastAiMessage = conversation.filter(m => m.speaker === 'ai').pop();
  const isCodingQuestion = flowState === InterviewFlowState.AWAITING_CODE_SUBMISSION;

  useEffect(() => {
    if (lastAiMessage && lastAiMessage.content !== lastSpokenMessage.current && !isMuted) {
      speak(lastAiMessage.content);
      lastSpokenMessage.current = lastAiMessage.content;
    }
    return () => {
      cancel();
    };
  }, [lastAiMessage, isMuted, speak, cancel]);

  useEffect(() => {
    if (transcript) {
      onAnswerChange(answer ? `${answer} ${transcript}` : transcript);
    }
  }, [transcript]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);


  const handleMicClick = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if(isAwaitingResponse) return;
    onSubmit();
  }

  return (
    <div className="w-full h-[80vh] p-4 sm:p-6 bg-dark-card rounded-lg shadow-2xl animate-slide-in-up flex flex-col">
      <div className="flex justify-between items-center mb-4 border-b border-dark-subtle pb-4">
         <h2 className="text-xl font-semibold flex items-center gap-2">
            {isCodingQuestion ? <><CodeIcon className="w-6 h-6 text-brand-secondary"/> Coding Challenge</> : `Question ${questionNumber} of ${totalQuestions}`}
         </h2>
         <div className="flex items-center gap-2">
            {!isCodingQuestion && (
              <button 
                onClick={onGetHint}
                className="flex items-center gap-2 px-3 py-2 bg-yellow-900/50 hover:bg-yellow-800/60 text-yellow-200 font-semibold rounded-lg transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                title="Get a Hint"
                disabled={isAwaitingResponse}
              >
                <LightbulbIcon className="w-4 h-4" />
                Hint
              </button>
            )}
            <button
              onClick={onSkipQuestion}
              className="px-3 py-2 bg-dark-card hover:bg-dark-subtle text-dark-text font-semibold rounded-lg transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              title="Skip Question"
              disabled={isAwaitingResponse}
            >
              Skip
            </button>
            <button onClick={() => setIsMuted(!isMuted)} className="text-dark-text hover:text-white transition-colors p-2 rounded-full hover:bg-dark-subtle" title={isMuted ? "Unmute" : "Mute"}>
                {isMuted ? <VolumeXIcon className="w-6 h-6" /> : <Volume2Icon className="w-6 h-6" />}
            </button>
         </div>
      </div>

      <div className="flex-grow overflow-y-auto pr-2 space-y-4 mb-4">
        {conversation.map((msg, index) => (
            <ChatBubble key={index} message={msg} />
        ))}
         <div ref={chatEndRef} />
      </div>
      
      {isCodingQuestion ? (
         <CodeEditor 
            code={userCode}
            onCodeChange={onCodeChange}
            onRun={onSubmitCode}
            isSubmitting={isAwaitingResponse}
            language="javascript"
         />
      ) : (
          <form onSubmit={handleSubmit} className="relative w-full mt-auto">
            <textarea
              value={answer}
              onChange={(e) => onAnswerChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                }
              }}
              placeholder={isListening ? "Listening..." : "Type or record your answer here..."}
              className="w-full h-24 p-4 pr-24 bg-dark-bg border border-dark-subtle rounded-lg text-dark-text focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-colors"
              aria-label="Your Answer"
              disabled={isAwaitingResponse}
            />
            <div className="absolute bottom-3 right-3 flex items-center gap-2">
                {isSupported && (
                    <button
                        type="button"
                        onClick={handleMicClick}
                        className={`p-3 rounded-full transition-colors ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-brand-primary hover:bg-brand-secondary text-white'}`}
                        title={isListening ? "Stop Recording" : "Start Recording"}
                        disabled={isAwaitingResponse}
                    >
                        <MicIcon className="w-5 h-5" />
                    </button>
                )}
                 <button
                    type="submit"
                    disabled={!answer.trim() || isAwaitingResponse}
                    className="px-6 py-3 bg-brand-primary hover:bg-brand-secondary text-white font-bold rounded-lg transition-colors disabled:bg-dark-subtle disabled:cursor-not-allowed"
                >
                    {questionNumber === totalQuestions ? 'Finish' : 'Send'}
                </button>
            </div>
          </form>
      )}
      {speechError && <p className="text-red-400 text-sm mt-2 text-center">{speechError}</p>}
    </div>
  );
};

export default InterviewScreen;