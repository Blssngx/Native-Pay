// app/success/page.tsx

'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function Success() {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    const completePayment = async () => {
      try {
        const response = await fetch('/api/redirect' + window.location.search, {
          method: 'GET',
        });

        const data = await response.json();

        if (data.success) {
          setStatus('success');
        } else {
          setStatus('error');
        }
      } catch (error) {
        setStatus('error');
      }
    };

    completePayment();
  }, []);

  if (status === 'loading') {
    return <p>Processing payment...</p>;
  }

  if (status === 'success') {
    return <p>Payment completed successfully!</p>;
  }

  return <p>Failed to complete payment.</p>;
}