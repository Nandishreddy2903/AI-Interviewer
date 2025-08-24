import { saveCompletedInterview, getInterviewHistory } from './api';
import type { InterviewSession } from '../types';

/**
 * The history service now acts as a clean interface to our backend API.
 * The user's identity is handled by the JWT authentication token,
 * so we no longer need to pass the user's email around on the client.
 */

export const getHistory = async (): Promise<InterviewSession[]> => {
    try {
        return await getInterviewHistory();
    } catch (error) {
        console.error("Failed to fetch interview history:", error);
        // Return an empty array or re-throw the error, depending on desired UX.
        return []; 
    }
};

export const saveHistory = async (session: InterviewSession): Promise<void> => {
    try {
        // The history array is now managed on the server. We just save the one completed session.
        await saveCompletedInterview(session);
    } catch (error) {
        console.error("Failed to save interview history:", error);
        // You might want to throw the error to let the UI handle it.
        throw error;
    }
};
