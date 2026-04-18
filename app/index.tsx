import React from 'react';
import { ImageBackground, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { palette, radii, shadow, spacing } from '../src/setup/theme';

const phoneShell = require('../assets/reference-screens/tatra-web-phone.png');
const tabletShell = require('../assets/reference-screens/tatra-web-tablet.png');
const laptopShell = require('../assets/reference-screens/tatra-web-laptop.png');

export default function BankShellScreen() {
  const { width, height } = useWindowDimensions();
  const viewportRatio = width / Math.max(height, 1);
  const isPhone = width < 768 || viewportRatio < 0.62;
  const isTablet = !isPhone && (width < 1280 || viewportRatio < 1.45);
  const backgroundSource = isPhone ? phoneShell : isTablet ? tabletShell : laptopShell;

  return (
    <View style={styles.page}>
      <ImageBackground imageStyle={styles.backgroundCoverImage} resizeMode="cover" source={backgroundSource} style={styles.background}>
        <View style={styles.backdropTint} />
      </ImageBackground>

      <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.safeArea}>
        <ImageBackground imageStyle={styles.backgroundContainImage} resizeMode="contain" source={backgroundSource} style={styles.foreground}>
          <View style={[styles.overlay, isPhone ? styles.overlayMobile : styles.overlayDesktop]}>
            <Pressable accessibilityRole="button" onPress={() => router.push('/shared-spaces')} style={styles.cta}>
              <Text style={styles.ctaText}>Open Shared Spaces</Text>
            </Pressable>
          </View>
        </ImageBackground>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#050807',
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  backgroundCoverImage: {
    resizeMode: 'cover',
    transform: [{ scale: 1.03 }],
  },
  backdropTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5, 8, 7, 0.26)',
  },
  safeArea: {
    flex: 1,
  },
  foreground: {
    flex: 1,
  },
  backgroundContainImage: {
    resizeMode: 'contain',
  },
  overlay: {
    flex: 1,
    padding: spacing.lg,
  },
  overlayMobile: {
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: spacing.xl,
  },
  overlayDesktop: {
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    paddingBottom: spacing.xl,
  },
  cta: {
    minWidth: 220,
    backgroundColor: 'rgba(15, 89, 104, 0.94)',
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
    ...shadow.soft,
  },
  ctaText: {
    color: palette.surface,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
});
