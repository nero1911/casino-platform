'use client';
import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Suspense } from 'react';

function CallbackInner() {
  const params = useSearchParams();
  const { login } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const token = params.get('token');
    const error = params.get('error');
    if (token) {
      login(token);
      router.replace('/');
    } else {
      router.replace(`/?error=${error || 'unknown'}`);
    }
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <div className="text-5xl animate-spin">🎰</div>
      <p className="text-gray-400">로그인 처리 중...</p>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense>
      <CallbackInner />
    </Suspense>
  );
}
