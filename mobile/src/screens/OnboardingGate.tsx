import { router } from 'expo-router';
import { useEffect } from 'react';
import { useOnboarding } from '../api/queries';

// Opened at most once per app run, so closing it never traps the user.
let offered = false;

// @MOB-112 Opens the optional onboarding after sign-in until the user finishes or skips it.
// A failed load just means it is not offered this time.
export function OnboardingGate() {
  const query = useOnboarding(!offered);
  useEffect(() => {
    if (!offered && query.data?.show) {
      offered = true;
      router.push('/onboarding');
    }
  }, [query.data?.show]);
  return null;
}
