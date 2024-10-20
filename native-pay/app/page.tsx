// app/page.tsx

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage(): JSX.Element {
  const router = useRouter();

  useEffect(() => {
    // Perform the client-side redirection
    router.push('/ai-screen');
  }, [router]);

  // Optionally, render a fallback UI
  return <p>Redirecting to AI Screen...</p>;
}