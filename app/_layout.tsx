import React from 'react';
import { Stack } from 'expo-router';
import { palette } from '../src/setup/theme';

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: palette.background },
      }}
    />
  );
}
