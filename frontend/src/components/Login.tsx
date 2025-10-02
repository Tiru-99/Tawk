'use client'

import { useState, useEffect } from "react"
import { Button } from "./ui/button"
import { Label } from "@radix-ui/react-label"
import { Loader2, Eye, EyeOff } from "lucide-react"
import { Toaster, toast } from "sonner"
import { Input } from "./ui/input"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import axios from 'axios';
import { useAuth } from "@/hooks/useAuth"


interface LoginFormData {
    email: string
    password: string
}

export default function Login() {
    const router = useRouter();
    const [formData, setFormData] = useState<LoginFormData>({
        email: "",
        password: ""
    });
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    //skip redirect set to true 
    const { isLoading: loading, isAuthenticated } = useAuth(true);

    useEffect(() => {
        if (!loading && isAuthenticated) {
            router.push('/');
        }
    }, [loading, isAuthenticated, router]);

    // simple validation logic
    const validateForm = () => {
        const { email, password } = formData;

        // check email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email.trim()) {
            return "Email is required";
        }
        if (!emailRegex.test(email)) {
            return "Enter a valid email address";
        }

        // check password
        if (!password.trim()) {
            return "Password is required";
        }
        if (password.length < 2) {
            return "Password must be at least 6 characters long";
        }

        return ""; // no error
    };


    const handleSubmit = async (e: any) => {
        e.preventDefault();
        const validationError = validateForm();

        if (validationError) {
            toast.error(validationError);
            return;
        }

        try {
            setIsLoading(true)
            const response = await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/user/login`, formData, {
                headers: {
                    "Content-Type": "application/json",
                },
                withCredentials: true
            })

            setIsLoading(false);
            toast.success("Successfully Logged In !")
            localStorage.setItem("userId", response.data.userId);
            localStorage.setItem("name", response.data.name);
            localStorage.setItem("imageUrl", response.data.imageUrl);
            localStorage.setItem("email", response.data.email)
            router.push('/');
        } catch (error: any) {
            console.log("Error : ", error);
            setError(error.response.data.message);

        } finally {
            setIsLoading(false);
        }
    }
    return (
        <>

            <Toaster position="top-center"></Toaster>
            <div className="relative">
                <div className="flex justify-center items-center min-h-screen bg-gray-100">
                    <div className=" flex w-full max-w-4xl bg-white rounded-md tracking-tight">
                        <div className="md:w-2/5 w-full flex-col justify-center p-12  items-center h-full">
                            <h2 className="text-left text-2xl font-semibold">Welcome Back !</h2>
                            <p className="text-gray-600 text-xs font-normal">Join our 100% free creative work</p>

                            <Button
                                className="flex items-center px-12 mt-6 bg-white text-gray-700 border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                onClick={() => toast.success("The developers are working on this feature!!")}
                            >
                                <Image src="/google.png" alt="Google logo" width={18} height={18} className="mr-2" />
                                <span className="text-sm font-medium">Sign in with Google</span>
                            </Button>

                            <div className="relative mt-4">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full h-px bg-gray-300"></div>
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-white px-2 text-muted-foreground">OR</span>
                                </div>
                            </div>

                            <form className="space-y-2" onSubmit={handleSubmit}>
                                <div className="space-y-1">
                                    <Label className="font-semibold text-xs">Email*</Label>
                                    <Input id="name"
                                        placeholder="Enter your email"
                                        required type="text"
                                        className="h-10 p-2"
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}></Input>
                                </div>

                                <div className="space-y-1">
                                    <Label htmlFor="password" className="font-semibold text-xs">
                                        Password*
                                    </Label>
                                    <div className="relative">
                                        <Input
                                            id="password"
                                            placeholder="Enter your password"
                                            required
                                            type={showPassword ? "text" : "password"}
                                            className="h-10 p-2 pr-10"
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                            onClick={() => setShowPassword(!showPassword)}
                                        >
                                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            <span className="sr-only">{showPassword ? "Hide password" : "Show password"}</span>
                                        </Button>
                                    </div>
                                </div>

                                <Button className="w-full bg-black text-white mt-8 h-10" type="submit" disabled={isLoading}>
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Please wait
                                        </>
                                    ) : (
                                        "Log In "
                                    )}
                                </Button>

                            </form>


                            {error && (
                                <div className="text-red-400 mt-3">{error}</div>
                            )}

                            <p className="text-sm font-light text-center mt-4">Dont Have an Account? <span className="text-black font-bold"><Link href='/signup'><u>Sign Up</u></Link></span></p>

                        </div>

                        <div className="w-3/5 relative hidden md:block">
                            <Image
                                src="/cover.jpg"
                                alt="Cover Image"
                                className="object-cover"
                                layout="fill"
                                priority
                            />
                        </div>

                    </div>
                </div>

                <div className="
                    mb-6 p-4 rounded-md 
                    bg-yellow-100 text-yellow-800 border border-yellow-300 text-sm 
                    space-y-2 
                    w-full max-w-md mx-auto 
                    absolute top-4 left-1/2 transform -translate-x-1/2
                ">
                    <p>
                        ⚠️ If you are using <strong>incognito mode</strong>, please allow third-party app cookies.
                    </p>
                    <p>
                        ❌ If something went wrong, it could be a firewall or network issue. Try again or check your connection.
                    </p>
                </div>
            </div>

        </>
    )
}