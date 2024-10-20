"use client"
// Redirect.tsx
import React, { useEffect } from "react";
import { BotCard } from "@/components/ui/message";

interface RedirectProps {
  to: string;
}

const Redirect: React.FC<RedirectProps> = ({ to }) => {
  useEffect(() => {
    window.location.href = to;
  }, [to]);

  return (
      <p>Redirecting to the transaction page...</p>
  );
};

export default Redirect;