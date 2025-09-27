"use client"

import { Button } from "./ui/button"
import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/useAuth"
import { Label } from "@radix-ui/react-label"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import axios from "axios"
import { Input } from "./ui/input"
import Image from "next/image"
import { Toaster, toast } from "sonner"
import Link from "next/link"
import type React from "react"
import { useRouter } from "next/navigation"

interface FormData {
  email: string
  name: string
  password: string
  confirmPassword: string
}

export default function Signup() {
  const [formData, setFormData] = useState<FormData>({
    email: "",
    name: "",
    password: "",
    confirmPassword: "",
  })
  const router = useRouter(); 
  const [showPassword, setShowPassword] = useState<boolean>(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { isLoading: loading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.push('/');
    }
  }, [loading, isAuthenticated, router]);

  // simple validation logic
  const validateForm = () => {
    const { email, password, name } = formData;
    if (!name.trim()) {
      return "Name is required !"
    }

    if (name.length < 2) {
      return "Name should be greater than 2 words"
    }
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


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const validationError = validateForm();

    if (validationError) {
      toast.error(validationError);
      return;
    }
    setIsLoading(true)
    setError("")

    const { confirmPassword, ...dataToSend } = formData

    if (confirmPassword !== formData.password) {
      setError("The password and confirm password are not matching")
      setIsLoading(false)
      return
    }

    try {
      const response = await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/user/signup`, dataToSend, {
        headers: {
          "Content-Type": "application/json",
        },
      })

      console.log("response", response)
      toast.success("Successfully signed up!")
    } catch (error: any) {
      setError(error.response?.data?.message || "An error occurred during sign up")
      console.log("Something went wrong", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <Toaster position="top-center" />
      <div className="flex justify-center items-center min-h-screen bg-gray-100 px-8">
        <div className="flex w-full max-w-4xl bg-white rounded-md tracking-tight">
          <div className="md:w-2/5 w-full flex-col justify-center p-12 items-center h-full">
            <h2 className="text-left text-2xl font-semibold">Create Account</h2>
            <p className="text-gray-600 text-xs font-normal">Join our 100% free creative work</p>

            <Button className="flex items-center px-12 mt-6 w-full bg-white text-gray-700 border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              onClick={() => toast.success("The developers are working on this feature !!")}>
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
                <Label className="font-semibold text-xs">Username*</Label>
                <Input
                  id="name"
                  placeholder="Enter your username"
                  required
                  type="text"
                  className="h-10 p-2"
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                ></Input>
              </div>

              <div className="space-y-1">
                <Label className="font-semibold text-xs">Email*</Label>
                <Input
                  id="email"
                  placeholder="Enter your email"
                  required
                  type="email"
                  className="h-10 p-2"
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                ></Input>
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

              <div className="space-y-1">
                <Label htmlFor="confirmPassword" className="font-semibold text-xs">
                  Confirm Password*
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    placeholder="Enter your password"
                    required
                    type={showConfirmPassword ? "text" : "password"}
                    className="h-10 p-2 pr-10"
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    <span className="sr-only">{showConfirmPassword ? "Hide password" : "Show password"}</span>
                  </Button>
                </div>
              </div>

              {error && (
                <div className="mt-4">
                  <p className="text-red-400 text-sm text-center">{error}</p>
                </div>
              )}

              <Button className="w-full bg-black text-white mt-8 h-10" type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Please wait
                  </>
                ) : (
                  "Sign Up"
                )}
              </Button>
            </form>

            <p className="text-sm font-light text-center mt-4">
              Already have an account ?{" "}
              <span className="text-black font-bold hover:cursor-pointer">
                <Link href='/login'><u>Log In</u></Link>
              </span>
            </p>
          </div>

          <div className="w-3/5 relative hidden md:block">
            <Image src="/cover.jpg" alt="Cover Image" className="object-cover" layout="fill" priority />
          </div>
        </div>
      </div>
    </>
  )
}

