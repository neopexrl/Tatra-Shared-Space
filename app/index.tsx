import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { palette, radii, shadow, spacing } from '../src/setup/theme';

export default function BankShellNativePlaceholder() {
  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.page}>
      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.title}>Tatra Bank Shell</Text>
          <Text style={styles.description}>
            Полноценный desktop mock теперь подключен для web. Здесь пока остается только переход в Shared Spaces.
          </Text>
          <Pressable accessibilityRole="button" onPress={() => router.push('/shared-spaces')} style={styles.cta}>
            <Text style={styles.ctaText}>Open Shared Spaces</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#111418',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#1A1D22',
    borderRadius: radii.lg,
    padding: spacing.xl,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    ...shadow.soft,
  },
  title: {
    color: palette.surface,
    fontSize: 30,
    fontWeight: '800',
    textAlign: 'center',
  },
  description: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  cta: {
    alignSelf: 'center',
    minWidth: 220,
    backgroundColor: 'rgba(15, 89, 104, 0.96)',
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
    ...shadow.soft,
  },
  ctaText: {
    color: palette.surface,
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
});
