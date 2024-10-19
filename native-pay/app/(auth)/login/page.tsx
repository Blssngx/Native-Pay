"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { FiLoader } from "react-icons/fi";

const Login = () => {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { data: session, status: sessionStatus } = useSession();

  useEffect(() => {
    if (sessionStatus === "authenticated") {
      router.replace("/");
    }
  }, [sessionStatus, router]);

  const isValidEmail = (email: string) => {
    const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    const email = e.target[0].value.toLowerCase();
    const password = e.target[1].value;

    if (!isValidEmail(email)) {
      setError("Email is invalid");
      return;
    }

    if (!password || password.length < 8) {
      setError("Password is invalid");
      return;
    }

    setLoading(true); // Start loading

    const res = await signIn("credentials", {
      redirect: false,
      email,
      password,
    });

    setLoading(false); // End loading

    if (res?.error) {
      setError("Invalid email or password");
      if (res?.url) router.replace("/");
    } else {
      setError("");
    }
  };

  if (sessionStatus === "loading") {
    return <h1>Loading...</h1>;
  }

  return (
    sessionStatus !== "authenticated" && (
      <form onSubmit={handleSubmit}>
        <header className="backdrop-blur-sm bg-white bg-opacity-10 fixed w-full  z-10 flex  items-center justify-between border-none bg-transparent px-4">
          <div className="">
            <div className="w-full z-10 flex h-[57px] items-center justify-between border-none bg-transparent ">
              <div className="text-opacity-0 w-10"></div>
              <h1 className="text-center text-xl text-md font-bold">Log in</h1>
              <Link href={'/welcome'} className="rounded-full w-50 h-50 bg-white p-2">
                <h1 className="text-center text-md font-bold">
                  <svg width="19" height="18" viewBox="0 0 19 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M1.5 1L17.5 17" stroke="black" strokeWidth="2" strokeLinecap="round" />
                    <path d="M17 1L1 17" stroke="black" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </h1>
              </Link>
            </div>

            <input
              type="text"
              className="w-full mt-5 border border-2-[#F2F5F5] text-black rounded-md px-3 py-2 mb-4 focus:outline-none focus:border-blue-400 focus:text-black"
              placeholder="Email"
              required
            />
            <input
              type="password"
              className="w-full border border-2-[#F2F5F5] text-black rounded-md px-3 py-2 mb-4 focus:outline-none focus:border-blue-400 focus:text-black"
              placeholder="Password"
              required
            />
            {error && <p className="text-red-600 text-[16px] mb-4">{error}</p>}
            <div className="text-center mt-5">
              <p className="text-[#414141]">New User?</p>
              <Link
                className="block text-center text-black underline mt-2"
                href="/register"
              >
                Create a password
              </Link>
            </div>
            <div className="text-center mt-5">
              <p className="text-[#414141]">Having trouble signing in?</p>
              <Link
                className="block text-center text-black underline mt-2"
                href="/"
              >
                Reset password
              </Link>
            </div>
          </div>
        </header>

        <div className="absolute h-screen w-full flex flex-col bg-transparent">
          <footer className="fixed bottom-0 pt-5 pb-8 z-10 w-full px-4 backdrop-blur-sm ">
            <div className="mx-auto px-4 lg:px-8 flex justify-center items-center h-full">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#2AF26E] text-black font-semibold py-4 rounded-full shadow-md flex items-center justify-center"
              >
                {loading ? (
                  <FiLoader className="animate-spin h-5 w-5" />
                ) : (
                  "Continue"
                )}
              </button>
            </div>
          </footer>
        </div>
      </form>
    )
  );
};

export default Login;