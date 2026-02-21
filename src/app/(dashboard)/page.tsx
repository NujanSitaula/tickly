'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (!user || user.mode === 'advanced' || user.mode === undefined) {
      router.replace('/today');
    } else {
      router.replace('/inbox');
    }
  }, [router, user]);

  return null;
}
