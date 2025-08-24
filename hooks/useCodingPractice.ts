import { useState, useCallback, useEffect } from 'react';
import { generateCodingProblems, generateCodeForLanguage } from '../services/geminiService';
import { saveSolvedCodingProblem, getSolvedCodingProblems } from '../services/api';
import type { CodingChallenge, InterviewDifficulty, Language, SolvedCodingProblem } from '../types';

// A simple type for the result of a code evaluation.
type EvaluationResult = {
    success: boolean;
    message: string;
} | null;

/**
 * This hook encapsulates all the logic for the "Coding Practice" screen.
 * It handles fetching problems, selecting a problem, switching languages,
 * and running the user's code against a test case.
 */
export const useCodingPractice = () => {
    const [problems, setProblems] = useState<CodingChallenge[]>([]);
    const [selectedProblem, setSelectedProblem] = useState<CodingChallenge | null>(null);
    const [userCode, setUserCode] = useState('');
    const [evaluationResult, setEvaluationResult] = useState<EvaluationResult>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isEvaluating, setIsEvaluating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [currentLanguage, setCurrentLanguage] = useState<Language>('javascript');
    const [isSwitchingLanguage, setIsSwitchingLanguage] = useState(false);
    const [currentDifficulty, setCurrentDifficulty] = useState<InterviewDifficulty | null>(null);
    const [solvedHistory, setSolvedHistory] = useState<SolvedCodingProblem[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(true);

    const fetchHistory = useCallback(async () => {
        setIsLoadingHistory(true);
        try {
            const history = await getSolvedCodingProblems();
            setSolvedHistory(history);
        } catch (e) {
            console.error("Failed to fetch coding history:", e);
        } finally {
            setIsLoadingHistory(false);
        }
    }, []);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);
    
    // Fetches a new set of problems from the Gemini API based on difficulty.
    const fetchProblems = useCallback(async (difficulty: InterviewDifficulty) => {
        setIsLoading(true);
        setError(null);
        setProblems([]);
        setCurrentDifficulty(difficulty); // Remember the difficulty for the refresh button.
        try {
            const fetchedProblems = await generateCodingProblems(difficulty, 3);
            setProblems(fetchedProblems);
        } catch (e) {
            const err = e as Error;
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Allows the user to get a new batch of problems of the same difficulty.
    const refreshProblems = useCallback(() => {
        if (currentDifficulty) {
            fetchProblems(currentDifficulty);
        }
    }, [currentDifficulty, fetchProblems]);

    // Handles what happens when a user clicks on a problem from the list.
    const selectProblem = useCallback((problem: CodingChallenge) => {
        setSelectedProblem(problem);
        setUserCode(problem.starterCode);
        setEvaluationResult(null); // Clear old results.
        setCurrentLanguage('javascript'); // Always default to JS when selecting a new problem.
    }, []);

    // Resets the view from a specific problem back to the list of problems.
    const goBackToList = useCallback(() => {
        setSelectedProblem(null);
        setUserCode('');
        setEvaluationResult(null);
        // After finishing with a problem, refresh the list of problems if one was generated
        if (currentDifficulty) {
            fetchProblems(currentDifficulty);
        }
    }, [currentDifficulty, fetchProblems]);

    // A hard reset for the entire feature, usually used after an error.
    const reset = useCallback(() => {
        setProblems([]);
        setSelectedProblem(null);
        setUserCode('');
        setEvaluationResult(null);
        setIsLoading(false);
        setIsEvaluating(false);
        setError(null);
        setCurrentLanguage('javascript');
        setCurrentDifficulty(null);
        fetchHistory(); // Also refresh history on reset
    }, [fetchHistory]);

    // This is a cool feature. If the user switches languages, we ask the AI
    // to generate new starter code and test cases for that language.
    const changeLanguage = useCallback(async (newLanguage: Language) => {
        if (!selectedProblem || newLanguage === currentLanguage) return;

        setIsSwitchingLanguage(true);
        setEvaluationResult(null); // Clear evaluation results as they're no longer relevant.
        setError(null);

        try {
            const { starterCode, testCase } = await generateCodeForLanguage(
                selectedProblem.title,
                selectedProblem.description,
                newLanguage
            );

            // Update the selected problem with the new language-specific data.
            const updatedProblem = { ...selectedProblem, starterCode, testCase };
            setSelectedProblem(updatedProblem);
            setUserCode(starterCode);
            setCurrentLanguage(newLanguage);
        } catch (e) {
            const err = e as Error;
            // Let the user know if we couldn't fetch the new language data.
            setError(`Failed to load problem for ${newLanguage}: ${err.message}`);
        } finally {
            setIsSwitchingLanguage(false);
        }

    }, [selectedProblem, currentLanguage]);

    const runCode = useCallback(async () => {
        if (!userCode.trim() || !selectedProblem || !currentDifficulty) return;

        // SUPER IMPORTANT: We can only run JavaScript in the browser.
        // For other languages, we disable the run button and show a message.
        if (currentLanguage !== 'javascript') {
            setEvaluationResult({
                success: false,
                message: `Code execution for the ${currentLanguage} language is not supported in this environment.\nOnly JavaScript can be run in the browser.`
            });
            return;
        }

        setIsEvaluating(true);
        setEvaluationResult(null);
        await new Promise(resolve => setTimeout(resolve, 500)); // A little delay so the loading state is noticeable.

        let result: any;
        let executionError: string | null = null;
        
        try {
            // SECURITY NOTE: As mentioned elsewhere, `new Function()` is not safe for production.
            // This is a classic client-side sandbox approach for a demo. In a real app,
            // this would be a secure backend service (e.g., using Docker containers).
            const runner = new Function(`
                ${userCode}
                try {
                    const input = ${JSON.stringify(selectedProblem.testCase.input)};
                    const result = solve(...input);
                    return result;
                } catch(e) {
                    return { __error: e.message }; // Catch runtime errors inside the user's code.
                }
            `);
            result = runner();
            if (result && result.__error) {
                executionError = result.__error;
            }
        } catch (e) {
            // This catches syntax errors in the code itself.
            const err = e as Error;
            executionError = err.message;
        }

        if (executionError) {
            setEvaluationResult({ success: false, message: `Runtime Error: ${executionError}` });
        } else {
            const expectedOutput = selectedProblem.testCase.expectedOutput;
            // A simple way to deep-compare results.
            const success = JSON.stringify(result) === JSON.stringify(expectedOutput);
            if (success) {
                setEvaluationResult({ success: true, message: `Success! 🎉\nInput: ${JSON.stringify(selectedProblem.testCase.input)}\nOutput: ${JSON.stringify(result)}` });
                 try {
                    await saveSolvedCodingProblem({
                        challenge: selectedProblem,
                        solution: { language: currentLanguage, code: userCode },
                        difficulty: currentDifficulty,
                    });
                    fetchHistory();
                } catch(e) {
                    console.error("Failed to save solved problem:", e);
                }
            } else {
                setEvaluationResult({ 
                    success: false, 
                    message: `Test case failed.\nInput: ${JSON.stringify(selectedProblem.testCase.input)}\nExpected: ${JSON.stringify(expectedOutput)}\nGot: ${JSON.stringify(result)}` 
                });
            }
        }
        
        setIsEvaluating(false);

    }, [userCode, selectedProblem, currentLanguage, currentDifficulty, fetchHistory]);

    const reviewProblem = useCallback((problemFromHistory: SolvedCodingProblem) => {
        setSelectedProblem(problemFromHistory.challenge);
        setUserCode(problemFromHistory.solution.code);
        setCurrentLanguage(problemFromHistory.solution.language);
        setCurrentDifficulty(problemFromHistory.difficulty);
        setEvaluationResult(null);
        setProblems([]); // Clear the problem list view
    }, []);

    return {
        problems,
        selectedProblem,
        userCode,
        evaluationResult,
        isLoading,
        isEvaluating,
        error,
        fetchProblems,
        selectProblem,
        setUserCode,
        runCode,
        goBackToList,
        reset,
        refreshProblems,
        currentLanguage,
        changeLanguage,
        isSwitchingLanguage,
        solvedHistory,
        isLoadingHistory,
        reviewProblem,
    };
};