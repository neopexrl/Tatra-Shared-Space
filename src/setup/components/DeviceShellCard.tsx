import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { palette, radii, shadow, spacing } from '../theme';

type DeviceShellCardProps = {
  audience: string;
  description: string;
  format: string;
  label: string;
};

export function DeviceShellCard({
  audience,
  description,
  format,
  label,
}: DeviceShellCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.format}>{format}</Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>placeholder</Text>
        </View>
      </View>

      <View style={styles.deviceFrame}>
        <View style={styles.deviceBar}>
          <View style={styles.camera} />
          <Text style={styles.deviceBarText}>Bank home screen slot</Text>
        </View>

        <View style={styles.preview}>
          <View style={styles.previewTop} />
          <View style={styles.previewHero} />
          <View style={styles.previewRow}>
            <View style={styles.previewChipLarge} />
            <View style={styles.previewChipSmall} />
          </View>
          <View style={styles.previewSection}>
            <Text style={styles.previewTitle}>Здесь будет скрин главного экрана Tatra.</Text>
            <Text style={styles.previewText}>
              До вставки реальных изображений этот блок остается нейтральной заглушкой с одной точкой входа
              в модуль Shared Spaces.
            </Text>
          </View>
        </View>
      </View>

      <Text style={styles.audience}>{audience}</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: palette.line,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadow.soft,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  label: {
    color: palette.ink,
    fontSize: 18,
    fontWeight: '800',
  },
  format: {
    color: palette.muted,
    fontSize: 13,
    marginTop: 4,
  },
  badge: {
    backgroundColor: palette.accentSoft,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  badgeText: {
    color: palette.accent,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  deviceFrame: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.line,
    overflow: 'hidden',
    backgroundColor: '#111A1F',
  },
  deviceBar: {
    height: 42,
    backgroundColor: '#17252C',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  camera: {
    width: 34,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#26363D',
  },
  deviceBarText: {
    color: '#B9C4C9',
    fontSize: 12,
    fontWeight: '700',
  },
  preview: {
    backgroundColor: '#F5F1EA',
    padding: spacing.md,
    gap: spacing.md,
    minHeight: 280,
  },
  previewTop: {
    height: 18,
    width: '46%',
    borderRadius: 999,
    backgroundColor: '#D6C9BC',
  },
  previewHero: {
    height: 112,
    borderRadius: radii.md,
    backgroundColor: '#E2D6CA',
  },
  previewRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  previewChipLarge: {
    flex: 1,
    height: 56,
    borderRadius: radii.sm,
    backgroundColor: '#E9DFD5',
  },
  previewChipSmall: {
    width: 92,
    height: 56,
    borderRadius: radii.sm,
    backgroundColor: '#DCC7B1',
  },
  previewSection: {
    backgroundColor: palette.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  previewTitle: {
    color: palette.ink,
    fontSize: 15,
    fontWeight: '800',
  },
  previewText: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 20,
  },
  audience: {
    color: palette.brand,
    fontSize: 13,
    fontWeight: '700',
  },
  description: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 21,
  },
});
