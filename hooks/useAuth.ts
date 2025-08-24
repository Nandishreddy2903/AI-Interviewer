import { useState, useEffect, useCallback } from 'react';

// A helper function to parse JWT tokens to get user data without a library.
// NOTE: This does NOT validate the token. Validation happens on the server.
const parseJwt = (token: string) => {
    try {
        return JSON.parse(atob(token.split('.')[1]));
    } catch (e) {
        return null;
    }
};

export const useAuth = () => {
    const [user, setUser] = useState<{ email: string } | null>(null);
    const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        try {
            const savedToken = localStorage.getItem('token');
            if (savedToken) {
                const decodedJwt = parseJwt(savedToken);
                // Check if the token is expired
                if (decodedJwt && decodedJwt.exp * 1000 > Date.now()) {
                    setUser({ email: decodedJwt.email });
                    setToken(savedToken);
                } else {
                    // Token is expired or invalid, remove it
                    localStorage.removeItem('token');
                    setUser(null);
                    setToken(null);
                }
            }
        } catch (e) {
            console.error("Error processing token on initial load", e);
            setUser(null);
            setToken(null);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const login = useCallback((email: string, receivedToken: string) => {
        localStorage.setItem('token', receivedToken);
        setToken(receivedToken);
        setUser({ email });
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
    }, []);

    return { user, token, login, logout, isLoading };
};
