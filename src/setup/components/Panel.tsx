import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { palette, radii, shadow, spacing } from '../theme';

type PanelProps = {
  children: React.ReactNode;
  eyebrow?: string;
  style?: StyleProp<ViewStyle>;
  title?: string;
};

export function Panel({ children, eyebrow, style, title }: PanelProps) {
  return (
    <View style={[styles.panel, style]}>
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      {title ? <Text style={styles.title}>{title}</Text> : null}
      <View style={styles.body}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: palette.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: palette.line,
    padding: spacing.lg,
    ...shadow.soft,
  },
  eyebrow: {
    color: palette.brand,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: spacing.sm,
  },
  title: {
    color: palette.ink,
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 28,
  },
  body: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
});
