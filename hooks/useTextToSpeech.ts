import { useCallback, useRef, useState, useEffect } from 'react';

// The browser's speech synthesis API can be quirky. One challenge
// is that it loads voices asynchronously. This hook handles that
// race condition to avoid trying to speak before a voice is selected.

// Helper function to find our preferred voice.
const findPreferredVoice = (voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null => {
    if (voices.length === 0) {
        return null;
    }

    // Try to find a high-quality US English voice, which are often provided by Google.
    let selectedVoice = voices.find(voice => voice.name === 'Google US English' && voice.lang.startsWith('en-US'));

    // Fallback: any other US English female voice.
    if (!selectedVoice) {
        selectedVoice = voices.find(voice => voice.lang.startsWith('en-US') && voice.name.toLowerCase().includes('female'));
    }
    
    // Final fallback: just the first available US English voice.
    if (!selectedVoice) {
        selectedVoice = voices.find(voice => voice.lang.startsWith('en-US'));
    }

    return selectedVoice || null;
};

export const useTextToSpeech = () => {
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
    const [preferredVoice, setPreferredVoice] = useState<SpeechSynthesisVoice | null>(null);
    // This state guards against the voice loading race condition.
    const [areVoicesReady, setAreVoicesReady] = useState(false);
    // If `speak` is called before voices are ready, we'll stash the text here.
    const queuedTextRef = useRef<string | null>(null);

    // This effect runs once on mount to find and set our preferred voice.
    useEffect(() => {
        if (!window.speechSynthesis) {
            console.warn("Speech synthesis not supported by this browser.");
            return;
        }

        const handleVoicesChanged = () => {
            const voices = window.speechSynthesis.getVoices();
            if (voices.length > 0) {
                const foundVoice = findPreferredVoice(voices);
                if (foundVoice) {
                    setPreferredVoice(foundVoice);
                } else {
                    console.warn("Could not find a preferred voice. Using browser default.");
                }
                // Flip the switch! It's now safe to speak.
                setAreVoicesReady(true);
                // We've got what we need, so we can remove the event listener.
                window.speechSynthesis.onvoiceschanged = null;
            }
        };

        // Sometimes the voices are already cached by the browser. Let's check.
        const initialVoices = window.speechSynthesis.getVoices();
        if (initialVoices.length > 0) {
            handleVoicesChanged();
        } else {
            // If not, we have to wait for the 'voiceschanged' event to fire.
            window.speechSynthesis.onvoiceschanged = handleVoicesChanged;
        }
        
        // Cleanup function to run when the component unmounts.
        return () => {
            if (window.speechSynthesis) {
                window.speechSynthesis.onvoiceschanged = null;
                // This is important to prevent the voice from continuing to speak after the component is gone.
                window.speechSynthesis.cancel();
            }
        };
    }, []);

    // This is the core function that actually triggers the browser to speak.
    const performSpeak = useCallback((text: string) => {
        if (!window.speechSynthesis || !areVoicesReady) return;

        const utterance = new SpeechSynthesisUtterance(text);
        utteranceRef.current = utterance;

        // Set some standard properties for the voice.
        utterance.lang = 'en-US';
        utterance.rate = 1; // Not too fast, not too slow.
        utterance.pitch = 1;
        
        if (preferredVoice) {
            utterance.voice = preferredVoice;
        }
        
        window.speechSynthesis.speak(utterance);
    }, [preferredVoice, areVoicesReady]);

    // This effect is the other half of our race condition solution.
    // As soon as `areVoicesReady` becomes true, this will check if there's any
    // text in the queue and speak it.
    useEffect(() => {
        if (areVoicesReady && queuedTextRef.current) {
            performSpeak(queuedTextRef.current);
            // Clear the queue so we don't speak it again.
            queuedTextRef.current = null;
        }
    }, [areVoicesReady, performSpeak]);

    // This is the public `speak` function that components will call.
    const speak = useCallback((text: string) => {
        if (!window.speechSynthesis) return;

        // If the AI is already talking, shut it up before starting the new message.
        // This prevents awkward overlaps.
        if (window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
        }

        if (areVoicesReady) {
            // Happy path: voices are loaded, so we can speak immediately.
            performSpeak(text);
        } else {
            // Bummer path: voices aren't ready yet. Queue the text and wait.
            queuedTextRef.current = text;
        }
    }, [areVoicesReady, performSpeak]);

    // A public function to stop the speech synthesis immediately.
    const cancel = useCallback(() => {
        if (window.speechSynthesis && window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
        }
    }, []);

    return { speak, cancel };
};