import { useLogout } from "@/hooks/useAuth";

export default function HomePage(){
    const { isLoading , doLogout} = useLogout(); 
    return(
        <>
            <div>
                Hi this is the homepage bro , 
                <button
                onClick={doLogout}>{isLoading ? "logging out" : "log out"}</button>
            </div>
        </>
    )
}