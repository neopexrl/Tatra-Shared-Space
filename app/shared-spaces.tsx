import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { palette, radii, shadow, spacing } from '../src/setup/theme';

export default function SharedSpacesPlaceholderScreen() {
  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.page}>
      <View style={styles.content}>
        <View style={styles.placeholder}>
          <Text style={styles.title}>Shared Spaces</Text>
          <Text style={styles.description}>Тут пока будет заглушка следующей части сайта.</Text>
          <Pressable accessibilityRole="button" onPress={() => router.push('/')} style={styles.backButton}>
            <Text style={styles.backButtonText}>Back</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#F3EEE7',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  placeholder: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: palette.surface,
    borderRadius: radii.lg,
    padding: spacing.xl,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(23, 37, 44, 0.08)',
    ...shadow.soft,
  },
  title: {
    color: palette.ink,
    fontSize: 30,
    fontWeight: '800',
    textAlign: 'center',
  },
  description: {
    color: palette.muted,
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  backButton: {
    alignSelf: 'center',
    minWidth: 140,
    backgroundColor: palette.brand,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    ...shadow.soft,
  },
  backButtonText: {
    color: palette.surface,
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
});
