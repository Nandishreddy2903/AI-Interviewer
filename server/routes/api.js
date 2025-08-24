import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { GoogleGenAI, Type } from "@google/genai";

import User from '../models/User.js';
import InterviewSession from '../models/InterviewSession.js';
import InProgressInterview from '../models/InProgressInterview.js';
import SolvedCodingProblem from '../models/SolvedCodingProblem.js';
import { protect } from '../middleware/auth.js';
import { SUPPORTED_LANGUAGES } from '../constants.js';

const router = express.Router();

// --- Reusable AI Logic ---

// Lazily initialize the AI client to provide a better error message if the key is missing.
let ai;
const getAiInstance = () => {
    if (!ai) {
        if (!process.env.API_KEY || process.env.API_KEY === 'your_google_gemini_api_key') {
             throw new Error("API_KEY is not configured. Please create a .env file in the /server directory and add your AI service API key. See README.md for details.");
        }
        ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    }
    return ai;
}

const model = 'gemini-2.5-flash';

// Schemas define the expected JSON structure from the model
const questionGenerationSchema = { type: Type.OBJECT, properties: { question: { type: Type.STRING } }, required: ["question"] };
const hintGenerationSchema = { type: Type.OBJECT, properties: { hint: { type: Type.STRING } }, required: ["hint"] };
// For coding questions, we ask for stringified JSON for test cases to handle any valid JSON type robustly.
const codingQuestionGenerationSchema = {
    type: Type.OBJECT,
    properties: {
        title: { type: Type.STRING },
        description: { type: Type.STRING },
        starterCode: { type: Type.STRING },
        testCase: {
            type: Type.OBJECT,
            properties: {
                input: {
                    type: Type.STRING,
                    description: "A valid JSON string representation of an array containing the arguments for the 'solve' function. Example: '[5, \"hello\"]' or '[ [1,2], [3,4] ]'."
                },
                expectedOutput: {
                    type: Type.STRING,
                    description: "A valid JSON string representation of the expected output value. Example: '\"world\"' or '10' or '[1, 2]' or '{\"key\": \"value\"}'."
                }
            },
            required: ["input", "expectedOutput"]
        }
    },
    required: ["title", "description", "starterCode", "testCase"]
};
const codingProblemListSchema = { type: Type.OBJECT, properties: { problems: { type: Type.ARRAY, items: codingQuestionGenerationSchema }}, required: ["problems"]};
const languageSpecificCodeSchema = {
    type: Type.OBJECT,
    properties: {
        starterCode: { type: Type.STRING },
        testCase: {
            type: Type.OBJECT,
            properties: {
                input: {
                    type: Type.STRING,
                    description: "A valid JSON string representation of an array containing the arguments for the 'solve' function. Example: '[5, \"hello\"]' or '[ [1,2], [3,4] ]'."
                },
                expectedOutput: {
                    type: Type.STRING,
                    description: "A valid JSON string representation of the expected output value. Example: '\"world\"' or '10' or '[1, 2]' or '{\"key\": \"value\"}'."
                }
            },
            required: ["input", "expectedOutput"]
        }
    },
    required: ["starterCode", "testCase"]
};
const feedbackGenerationSchema = {
    type: Type.OBJECT,
    properties: {
        overallFeedback: { type: Type.STRING }, overallScore: { type: Type.NUMBER },
        questionFeedback: {
            type: Type.ARRAY, items: {
                type: Type.OBJECT, properties: {
                    question: { type: Type.STRING }, answer: { type: Type.STRING },
                    feedback: { type: Type.STRING }, score: { type: Type.NUMBER },
                }, required: ["question", "answer", "feedback", "score"]
            }
        }
    }, required: ["overallFeedback", "overallScore", "questionFeedback"]
};

const personaPromptMap = {
    friendly: "Your persona is a friendly and encouraging HR Manager. Your goal is to make the candidate feel comfortable and assess their cultural fit and behavioral skills.",
    direct: "Your persona is a direct and focused Technical Lead. You value precision and technical depth. Get straight to the point and ask challenging questions.",
    supportive: "Your persona is a supportive Senior Peer. You are collaborative and interested in the candidate's thought process and problem-solving abilities. Guide them if they are stuck."
};

const callAI = async (prompt, schema) => {
    const aiInstance = getAiInstance(); // Get the initialized instance
    const response = await aiInstance.models.generateContent({
        model, contents: prompt,
        config: { responseMimeType: "application/json", responseSchema: schema }
    });
    // The response.text is already a parsed JSON string because of responseSchema
    return JSON.parse(response.text);
};


// --- Helper Functions ---
const generateToken = (id, email) => {
  return jwt.sign({ id, email }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// New helper function to robustly parse the `expectedOutput` from the AI.
const robustParseOutput = (outputString) => {
    try {
        // This will correctly parse numbers, booleans, arrays, objects, and JSON-formatted strings (e.g., "\"hello\"").
        return JSON.parse(outputString);
    } catch (e) {
        // If JSON.parse fails, it's highly likely the model returned a raw, unquoted string
        // instead of a JSON-formatted string (e.g., "Hello World" instead of "\"Hello World\"").
        // In this common failure case, the raw string itself is the intended value.
        return outputString;
    }
}

// Safely parses test case JSON strings from the AI's response.
const parseTestCase = (testCase) => {
    if (typeof testCase.input !== 'string' || typeof testCase.expectedOutput !== 'string') {
        throw new Error('AI response for test case is not in the expected string format.');
    }
    try {
        // The `input` must be a valid JSON string representing an array for the function runner.
        const input = JSON.parse(testCase.input);
        if (!Array.isArray(input)) {
            throw new Error(`The 'input' field of a test case must be a string representing a JSON array. Received: ${testCase.input}`);
        }
        // The `expectedOutput` can be any value. Use the robust parser to handle raw strings from the AI.
        const expectedOutput = robustParseOutput(testCase.expectedOutput);
        
        return { input, expectedOutput };
    } catch (e) {
        console.error("Failed to parse test case JSON from AI:", { input: testCase.input, expectedOutput: testCase.expectedOutput });
        // The original error from JSON.parse is often not user-friendly, so provide a clearer one.
        if (e instanceof SyntaxError) {
             throw new Error(`The AI returned malformed JSON for the test case 'input'. It must be a valid JSON array string. Content: ${testCase.input}`);
        }
        throw e; // Re-throw other errors (like the custom one for non-array input).
    }
};

// --- Auth Routes ---
router.post('/users/register', async (req, res) => {
  const { email, password } = req.body;
  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }
    const user = await User.create({ email, password });
    res.status(201).json({
      email: user.email,
      token: generateToken(user._id, user.email),
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error during registration' });
  }
});

router.post('/users/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email }).select('+password');
    if (user && (await user.matchPassword(password))) {
      res.json({
        email: user.email,
        token: generateToken(user._id, user.email),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error during login' });
  }
});

// --- Coding Practice Routes ---
router.get('/coding-practice/history', protect, async (req, res) => {
    try {
        const history = await SolvedCodingProblem.find({ user: req.user.id }).sort({ solvedAt: -1 });
        res.json(history);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch coding practice history' });
    }
});

router.post('/coding-practice/solved', protect, async (req, res) => {
    try {
        const { challenge, solution, difficulty } = req.body;
        const newSolvedProblem = new SolvedCodingProblem({
            user: req.user.id,
            challenge,
            solution,
            difficulty,
        });
        const savedProblem = await newSolvedProblem.save();
        res.status(201).json(savedProblem);
    } catch (error) {
        console.error("Error saving solved problem:", error);
        res.status(400).json({ message: 'Failed to save solved problem' });
    }
});

// --- Interview History Routes ---
router.get('/interviews/history', protect, async (req, res) => {
    try {
        const history = await InterviewSession.find({ user: req.user.id }).sort({ date: -1 });
        res.json(history);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch interview history' });
    }
});

router.post('/interviews/history', protect, async (req, res) => {
    try {
        const newSession = new InterviewSession({ ...req.body, user: req.user.id });
        const savedSession = await newSession.save();
        res.status(201).json(savedSession);
    } catch (error) {
        res.status(400).json({ message: 'Failed to save interview session' });
    }
});

// --- In-Progress Interview Routes ---
router.get('/interviews/inprogress', protect, async (req, res) => {
    try {
        const interview = await InProgressInterview.findOne({ user: req.user.id });
        res.json(interview);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch in-progress interview' });
    }
});

router.post('/interviews/inprogress', protect, async (req, res) => {
    try {
        const interviewData = { ...req.body, user: req.user.id };
        const interview = await InProgressInterview.findOneAndUpdate(
            { user: req.user.id },
            interviewData,
            { new: true, upsert: true } // Create if it doesn't exist
        );
        res.json(interview);
    } catch (error) {
        res.status(400).json({ message: 'Failed to save in-progress interview' });
    }
});

router.delete('/interviews/inprogress', protect, async (req, res) => {
    try {
        await InProgressInterview.deleteOne({ user: req.user.id });
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: 'Failed to discard in-progress interview' });
    }
});

// --- AI Service Proxy Route ---
router.post('/ai/generate', protect, async (req, res) => {
    const { action, payload } = req.body;
    try {
        let result;
        switch (action) {
            case 'generateFirstQuestion': {
                const { role, persona, difficulty } = payload;
                const personaPrompt = personaPromptMap[persona];
                const prompt = `You are an expert technical interviewer. ${personaPrompt} You are conducting an interview for a ${difficulty}-level "${role}" position. Generate the first interview question. Keep the question simple, short, and directly relevant to the core skills of the role. Avoid long, multi-part questions. Return the question as a JSON object with a "question" key.`;
                result = await callAI(prompt, questionGenerationSchema);
                break;
            }
            case 'generateFollowUpQuestion': {
                const { role, persona, difficulty, conversation } = payload;
                const history = conversation.map(msg => `${msg.speaker === 'ai' ? 'Interviewer' : 'Candidate'}: ${msg.content}`).join('\n');
                const personaPrompt = personaPromptMap[persona];
                const prompt = `You are an expert AI interviewer. ${personaPrompt} You are conducting an interview for a ${difficulty}-level "${role}" position. Here is the conversation history:\n\n${history}\n\nBased on the candidate's last answer, ask a relevant follow-up question. This can be a new topic or a deeper dive. Start with a brief, encouraging, and varied transitional phrase (e.g., "Thanks for sharing that," "That's a very clear explanation," "I see," "That's an interesting point, let's explore it further," "Great, let's move on to..."). Avoid being repetitive. The question should be simple, short, and directly related to the previous answer or a core skill for the role. Avoid long, multi-part questions. Return the entire response as a JSON object with a "question" key.`;
                result = await callAI(prompt, questionGenerationSchema);
                break;
            }
             case 'generateCodingQuestion': {
                const { role, difficulty } = payload;
                // Note: It's important to specify the function name `solve` in the prompt, as that's what the client-side runner expects.
                const prompt = `Generate a ${difficulty}-level JavaScript coding challenge relevant to a "${role}" position. The challenge should be solvable within a few minutes. Ensure the function in the starter code is named \`solve\`. The 'input' and 'expectedOutput' properties of the 'testCase' object MUST be valid JSON strings. For 'input', this will be a string representing an array of arguments (e.g., "[5, \\"hello\\"]"). For 'expectedOutput', this will be a string representing the resulting value (e.g., "\\"world\\"" or "10"). Return the result as a JSON object matching the defined schema.`;
                result = await callAI(prompt, codingQuestionGenerationSchema);
                result.testCase = parseTestCase(result.testCase);
                break;
            }
            case 'generateCodingProblems': {
                 const { difficulty, count } = payload;
                 const prompt = `Generate ${count} distinct ${difficulty}-level JavaScript coding challenges. The challenges should be solvable within a few minutes. Ensure the function in each starter code is named \`solve\`. For each problem, the 'input' and 'expectedOutput' properties of the 'testCase' object MUST be valid JSON strings. For 'input', this will be a string representing an array of arguments. For 'expectedOutput', this will be a string representing the resulting value. Return the result as a JSON object containing a "problems" array.`;
                 result = await callAI(prompt, codingProblemListSchema);
                 result.problems = result.problems.map(p => ({
                    ...p,
                    testCase: parseTestCase(p.testCase)
                 }));
                 break;
            }
             case 'generateCodeForLanguage': {
                const { problemTitle, problemDescription, language } = payload;
                const languageName = SUPPORTED_LANGUAGES.find(l => l.id === language)?.name || 'the specified language';
                const prompt = `Given the following coding problem:\nTitle: "${problemTitle}"\nDescription: "${problemDescription}"\nPlease provide the necessary code components for this problem in ${languageName}. - The main function or method should be named 'solve' if possible, or follow standard conventions for the language. The 'input' and 'expectedOutput' properties of the 'testCase' object MUST be valid JSON strings. For 'input', this will be a string representing an array of arguments. For 'expectedOutput', this will be a string representing the resulting value. Return the result as a JSON object.`;
                result = await callAI(prompt, languageSpecificCodeSchema);
                result.testCase = parseTestCase(result.testCase);
                break;
            }
            case 'generateHint': {
                const { conversation } = payload;
                const lastQuestion = conversation.filter(msg => msg.speaker === 'ai').pop()?.content;
                if (!lastQuestion) throw new Error("Could not find the last question.");
                const prompt = `The user is stuck on the following interview question: "${lastQuestion}". Provide a brief, one or two-sentence hint to guide them in the right direction. Do not give away the answer. Your response should be helpful and encouraging. Frame your response as if you are the interviewer speaking directly to the candidate. Return the hint as a JSON object with a "hint" key.`;
                result = await callAI(prompt, hintGenerationSchema);
                break;
            }
            case 'getInterviewFeedback': {
                const { conversation } = payload;
                let formattedTranscript = "";
                let questionCounter = 1;
                for (let i = 0; i < conversation.length; i++) {
                    const msg = conversation[i];
                    if (msg.speaker === 'ai') {
                        const questionContent = msg.coding === 'challenge'
                            ? `(Coding Challenge) ${msg.content.split('\n\n')[0]}` // Use only the title for the transcript
                            : msg.content;

                        // Find the next user message which serves as the answer
                        const nextUserMessageIndex = conversation.findIndex((ans, j) => j > i && ans.speaker === 'user');

                        let answerContent = '(No answer provided)';
                        if (nextUserMessageIndex !== -1) {
                            const answerMsg = conversation[nextUserMessageIndex];
                            answerContent = answerMsg.coding === 'solution'
                                ? `\n\`\`\`javascript\n${answerMsg.content}\n\`\`\``
                                : answerMsg.content;
                            // Jump the loop forward past this answer to avoid processing it as a question
                            i = nextUserMessageIndex;
                        }

                        formattedTranscript += `Question ${questionCounter}: ${questionContent}\nAnswer ${questionCounter}: ${answerContent}\n\n`;
                        questionCounter++;
                    }
                }

                const prompt = `You are an expert interviewer providing constructive, supportive feedback. Here is the transcript of an interview:\n\n${formattedTranscript}\n\nYour feedback should be encouraging. For each question, analyze the answer for correctness, clarity, and depth. Some answers may be code blocks; evaluate them for correctness, efficiency, and readability. Provide an overall summary that starts with the candidate's strengths before discussing areas for improvement. Give an overall score from 1 to 10. Return the feedback as a JSON object.`;
                result = await callAI(prompt, feedbackGenerationSchema);
                break;
            }
            default:
                return res.status(400).json({ message: 'Invalid AI service action' });
        }
        res.json(result);
    } catch (error) {
        console.error('AI service proxy error:', error);
        
        const errorMessage = error.message || '';
        if (errorMessage.includes('insufficient authentication scopes') || errorMessage.includes('PERMISSION_DENIED')) {
            res.status(500).json({ 
                message: "An authentication error occurred with the AI service. This usually happens when the API key is missing or invalid. Please ensure your `.env` file in the `/server` directory is correctly set up with a valid `API_KEY` and that you have restarted the server after making changes." 
            });
        } else {
            res.status(500).json({ message: errorMessage || 'Error processing AI service request' });
        }
    }
});


export default router;