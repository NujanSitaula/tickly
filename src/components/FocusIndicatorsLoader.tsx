'use client';

import { useEffect } from 'react';
import { userPreferences } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

export default function FocusIndicatorsLoader() {
  const { user } = useAuth();

  useEffect(() => {
    async function loadFocusIndicatorsPreference() {
      if (!user) {
        // Default to enabled when not logged in
        document.documentElement.classList.remove('no-focus-indicators');
        return;
      }

      try {
        const pref = await userPreferences.get('show_focus_indicators');
        const enabled = pref?.data?.value !== 'false';
        
        if (enabled) {
          document.documentElement.classList.remove('no-focus-indicators');
        } else {
          document.documentElement.classList.add('no-focus-indicators');
        }
      } catch (error) {
        // Default to enabled on error
        document.documentElement.classList.remove('no-focus-indicators');
      }
    }

    loadFocusIndicatorsPreference();
  }, [user]);

  return null;
}
