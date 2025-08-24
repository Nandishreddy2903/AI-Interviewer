import { useState, useEffect, useRef, useCallback } from 'react';

// The Web Speech API is experimental and may not be fully typed.
// These interfaces provide the necessary type safety for our hook.
interface SpeechRecognitionEvent extends Event {
    readonly resultIndex: number;
    readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
    readonly length: number;
    item(index: number): SpeechRecognitionResult;
    [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
    readonly isFinal: boolean;
    readonly length: number;
    item(index: number): SpeechRecognitionAlternative;
    [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
    readonly transcript: string;
    readonly confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
    readonly error: string;
    readonly message: string;
}

interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    onresult: (event: SpeechRecognitionEvent) => void;
    onerror: (event: SpeechRecognitionErrorEvent) => void;
    onend: () => void;
    start(): void;
    stop(): void;
}

interface SpeechRecognitionStatic {
    new(): SpeechRecognition;
}

// Add vendor-prefixed SpeechRecognition to the window object for TypeScript.
declare global {
    interface Window {
        SpeechRecognition: SpeechRecognitionStatic;
        webkitSpeechRecognition: SpeechRecognitionStatic;
    }
}

// Gracefully handle browser differences (e.g., Safari uses the 'webkit' prefix).
const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
const isSupported = !!SpeechRecognitionAPI;

export const useSpeechRecognition = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Set up the recognition instance on component mount.
  useEffect(() => {
    if (!isSupported) {
      setError("Speech recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true; // Keep listening even after a pause.
    recognition.interimResults = true; // Get results as they are spoken.
    recognition.lang = 'en-US';

    // Fired whenever the API has new results.
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      // Concatenate final results to build the full transcript.
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      setTranscript(finalTranscript);
    };

    // Handle common errors like denying microphone permission.
    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === 'no-speech' || event.error === 'audio-capture' || event.error === 'not-allowed') {
        setError(`Speech recognition error: ${event.error}. Please check your microphone permissions.`);
        setIsListening(false);
      }
    };
    
    // Fired when listening stops for any reason.
    recognition.onend = () => {
        setIsListening(false);
    };

    recognitionRef.current = recognition;
  }, []);

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      try {
        setTranscript(''); // Clear any old transcript.
        setError(null);
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        // This can happen if start() is called too quickly after stopping.
        console.error("Error starting speech recognition:", err);
        setError("Could not start listening. Please try again.");
      }
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, [isListening]);

  return { isListening, transcript, startListening, stopListening, error, isSupported };
};