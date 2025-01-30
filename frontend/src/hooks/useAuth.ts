'use client'
import { useEffect, useState } from "react";
import axios from "axios";

const useAuth = () => {
    const [isAuthenticated, setIsAuthenticated] = useState<Boolean | null>(null); // Initially null
    const [isLoading, setIsLoading] = useState<Boolean>(true);

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const res = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/user/checkauth`, {
                    withCredentials: true,
                });

                setIsAuthenticated(res.status === 200);
            } catch (error) {
                console.error("Authentication check failed:", error);
                setIsAuthenticated(false);
            } finally {
                setIsLoading(false);
            }
        };

        checkAuth();
    }, []);

    return { isAuthenticated, isLoading };
};

export default useAuth;
