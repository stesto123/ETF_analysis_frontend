import React from 'react';
import { Stack, Redirect } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';

export default function AuthRoutesLayout() {
  const { isSignedIn } = useAuth();
  if (isSignedIn) {
    return <Redirect href={'/(tabs)'} />;
  }
  return <Stack screenOptions={{ headerShown: false }} />;
}
