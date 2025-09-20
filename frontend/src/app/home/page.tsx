"use client"
import HomePage from "@/components/Homepage";
import { useAuth } from "@/hooks/useAuth";
export default function Home(){
    const { isLoading  } = useAuth(); 

    if(isLoading){
        return <div>Loading...</div>
    }

    return (
        <>  
            <HomePage/>
        </>
    )
}