import { useState } from "react";
import axios from "axios";
import { toast } from "sonner";

interface UserData {
    id: string;
    name: string;
    email: string;
    imageUrl: string;
}

export const useUsers = () => {
    const [users, setUsers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    // fetch function wrapped in useCallback so we can reuse it

    const fetchUsers = async() => {
        const userId = localStorage.getItem("userId");
        console.log("The user id is ", userId);
        if (!userId) return;

        setIsLoading(true);
        try {
            const res = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/user/getAllUsers/${userId}`, {
                withCredentials: true
            });

            setUsers(res.data.users);
        } catch (error) {
            console.error("Something went wrong while getting users", error);
        } finally {
            setIsLoading(false);
        }
    }

    // fetch once on mount
    // useEffect(() => {
    //     fetchUsers();
    // }, [fetchUsers]);

    return { users, isLoading, fetchUsers };
};

export const useCreateChat = () => {
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const createChat = async (data: UserData) => {
        setIsLoading(true);
        try {
            const { id } = data;

            const userId = localStorage.getItem("userId");
            //senderId , receiverId , name 
            const res = await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/chat/singlechat`, {
                senderId: userId,
                receiverId: id,
            }, {
                withCredentials: true
            });
            toast.success(res.data.message);

        } catch (error) {
            console.log("Something went wrong while creating chat", error);
            setIsLoading(false);
            toast.error("Something went wrong while creating chat");
        } finally {
            setIsLoading(false);
        }

    }

    return { isLoading, createChat }

}

export const useGetUsersForGroupChat = () => {
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [users, setUsers] = useState([]);

    const getUsers = async () => {
        setIsLoading(true);
        const userId = localStorage.getItem("userId");
        if (!userId) {
            return;
        }

        try {
            const res = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/user/getUsers/${userId}`, {
                withCredentials: true
            });
            setUsers(res.data.users);
        } catch (error) {
            console.error("Something went wrong ", error);
            setIsLoading(false);
        } finally {
            setIsLoading(false);
        }

    }

    return { getUsers , users ,isLoading }
}
