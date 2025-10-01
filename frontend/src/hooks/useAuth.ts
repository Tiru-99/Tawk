import { useEffect, useState } from "react";
import axios from 'axios';
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export const useAuth = (skipRedirect: boolean = false) => {
    const router = useRouter();
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const res = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/user/checkauth`, {
                    withCredentials: true,
                });

                setIsAuthenticated(res.data.authenticated);

                // Only redirect if we're supposed to AND user is not authenticated
                if (!skipRedirect && !res.data.authenticated) {
                    toast.error("Please sign in to access this page");
                    router.push("/login");
                }

            } catch (error: any) {
                console.log("Something went wrong while getting auth", error);
                setIsAuthenticated(false);
                
                if (!skipRedirect) {
                    toast.error("Something went wrong!");
                    router.push("/login");
                }
            } finally {
                setIsLoading(false);
            }
        }

        checkAuth();
    }, [router, skipRedirect]);

    return { isAuthenticated, isLoading }
}

export const useLogout = () => {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const doLogout = async () => {
        setIsLoading(true);

        try {
            await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/user/logout`, {
                withCredentials: true,
            });

            toast.success("Logged out successfully!");
            router.push("/login");
        } catch (error) {
            console.error("Something went wrong while logging out", error);
            toast.error("Internal Server Error !");
        } finally {
            setIsLoading(false);
        }
    };

    return { isLoading, doLogout };
};

