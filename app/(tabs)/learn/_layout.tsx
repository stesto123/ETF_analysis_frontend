import React from 'react';
import { Stack } from 'expo-router';
import { LearnProgressProvider } from '@/components/Learn/LearnProgressProvider';

export default function LearnLayout() {
  return (
    <LearnProgressProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      />
    </LearnProgressProvider>
  );
}
