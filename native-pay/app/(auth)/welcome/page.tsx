"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

const Login = () => {
    const router = useRouter();
    const [error, setError] = useState("");
    // const session = useSession();
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
        const email = e.target[0].value;
        const password = e.target[1].value;

        if (!isValidEmail(email)) {
            setError("Email is invalid");
            return;
        }

        if (!password || password.length < 8) {
            setError("Password is invalid");
            return;
        }

        const res = await signIn("credentials", {
            redirect: false,
            email,
            password,
        });

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
            <div className="absolute h-screen w-full flex flex-col bg-transparent pt-16">
                <section className="flex flex-col place-content-center text-center items-center justify-center">
                    <p className="text-md font-semibold px-2 mt-2">Spend your crypto anywhere in South Africa with the Flo debit card</p>
                    <div className="grid place-content-center p-12 ">
      
                    </div>
                </section>
                <footer className="fixed bottom-0 pt-5 pb-8 z-10 w-full px-4 backdrop-blur-sm ">
                    <div className="mx-auto px-4 lg:px-8 flex flex-col space-y-4 justify-center items-center h-full">
                        <Link
                            href={"/login"}
                            className="w-full text-center items-center border  bg-[#2AF26E] text-black font-semibold py-4 rounded-full shadow-md "
                        >
                            Log In
                        </Link>
                        <Link
                            href={"https://form.typeform.com/to/Y1e8LymR"}
                            className="w-full text-center items-center border  bg-[#F2F5F5] text-black font-semibold border py-4 rounded-full shadow-md "
                        >
                            Order a card
                        </Link>
                    </div>
                    <p className="text-xs mt-5 text-center">FiveWest is an authorised financial services provider (FSP No. 51619) and a licensed Systems Operator and TPPP with PASA.</p>
                    <div className="items-center justify-center flex w-full mt-2">
                    <div className="items-center text-sm text-center flex gap-4">
                        <Link href={"https://fivewest.co.za/contact"} className="text-sm underline">
                            Contact Us
                        </Link>
                        <Link href={"https://fivewest.co.za/"} className="text-sm underline">
                            FAQs
                        </Link>
                    </div>
                    </div>

                </footer>
            </div>

        )
    );
};

export default Login;