import React, { useState, useEffect } from 'react';
import Editor from 'react-simple-code-editor';
import { LoaderCircleIcon } from './icons';
import type { Language } from '../types';

// We're using PrismJS for syntax highlighting, which is loaded via a script tag in `index.html`.
// This `declare` tells TypeScript that a global `Prism` object will exist at runtime,
// so it doesn't complain about `Prism` being undefined.
declare const Prism: any;

interface CodeEditorProps {
    code: string;
    onCodeChange: (code: string) => void;
    onRun: () => void;
    isSubmitting: boolean;
    language: Language;
    isRunDisabled?: boolean;
    runButtonTooltip?: string;
}

// A simple mapping from our internal language IDs to the IDs Prism expects.
const prismLanguageMap = {
    javascript: 'javascript',
    python: 'python',
    cpp: 'cpp',
    java: 'java',
};

const CodeEditor: React.FC<CodeEditorProps> = ({ code, onCodeChange, onRun, isSubmitting, language, isRunDisabled = false, runButtonTooltip = '' }) => {
    // We need to keep track of whether Prism has finished loading the grammar for the current language.
    const [isPrismLanguageLoaded, setIsPrismLanguageLoaded] = useState(false);
    const prismLang = prismLanguageMap[language];

    useEffect(() => {
        // This effect is crucial for handling Prism's asynchronous language loading.
        // When the `language` prop changes, we need to make sure Prism has the right grammar ready.
        setIsPrismLanguageLoaded(false);

        // Basic safety check.
        if (typeof Prism === 'undefined' || !Prism.plugins?.autoloader) {
            console.warn("Prism or autoloader not available.");
            return;
        }

        if (Prism.languages[prismLang]) {
            // Good news! The language grammar is already loaded (e.g., JavaScript is often bundled by default).
            setIsPrismLanguageLoaded(true);
        } else {
            // The language isn't loaded, so we use Prism's autoloader plugin to fetch it.
            Prism.plugins.autoloader.loadLanguages([prismLang], () => {
                // This callback fires once the network request is complete and the grammar is ready.
                setIsPrismLanguageLoaded(true);
            });
        }
    }, [prismLang]); // This effect re-runs whenever the language changes.

    const highlight = (codeToHighlight: string) => {
        // We only attempt to highlight the code if we're sure Prism is ready.
        // Otherwise, it could throw an error or just return plain text.
        if (isPrismLanguageLoaded && Prism.languages[prismLang]) {
            try {
                 return Prism.highlight(codeToHighlight, Prism.languages[prismLang], prismLang);
            } catch (e) {
                // Just in case Prism has a hiccup, we don't want to crash the app.
                console.error("Prism highlighting error:", e);
                return codeToHighlight; // Fallback to unhighlighted code.
            }
        }
        return codeToHighlight; // Return plain text if Prism isn't ready yet.
    };

    return (
        <div className="w-full mt-auto flex flex-col h-full max-h-[50vh]">
            <div className="flex-grow bg-dark-bg rounded-t-lg border border-dark-subtle border-b-0 overflow-auto">
                 <Editor
                    value={code}
                    onValueChange={onCodeChange}
                    highlight={highlight}
                    padding={16}
                    style={{
                        // A classic coding editor font stack.
                        fontFamily: '"Fira code", "Fira Mono", monospace',
                        fontSize: 14,
                        color: '#d1d5db',
                        backgroundColor: '#111827',
                        minHeight: '100%',
                        outline: 'none',
                    }}
                    className="code-editor"
                    disabled={isSubmitting}
                />
            </div>
            <div className="flex items-center justify-end p-2 bg-dark-bg border border-dark-subtle rounded-b-lg">
                 <button
                    onClick={onRun}
                    disabled={isRunDisabled || !code.trim() || isSubmitting}
                    title={runButtonTooltip}
                    className="px-6 py-2 bg-brand-primary hover:bg-brand-secondary text-white font-bold rounded-lg transition-colors disabled:bg-dark-subtle disabled:cursor-not-allowed flex items-center gap-2"
                >
                    {isSubmitting ? (
                        <>
                            <LoaderCircleIcon className="w-5 h-5 animate-spin" />
                            Evaluating...
                        </>
                    ) : 'Run Code'}
                </button>
            </div>
        </div>
    );
};

export default CodeEditor;
