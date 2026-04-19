import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  type DimensionValue,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const COLORS = {
  bgPage: '#1D1E23',
  bgBlack: '#000000',
  bgCard: '#28292E',
  bgCardPressed: '#32343A',
  textPrimary: '#FFFFFF',
  textSecondary: '#A5A5A9',
  textTertiary: '#6C6C70',
  textIban: '#6C6C70',
  accentBlue: '#3390DD',
  qpBlue: '#3E76CB',
  qpBurgundy: '#96194A',
  qpGreen: '#2A8947',
  success: '#39C69B',
  successDeep: '#136650',
  chartGreen: '#00764E',
  danger: '#C36259',
  purple: '#5B4ACA',
  orange: '#C94D17',
  yellow: '#C9B019',
  donutGrey: '#5A6B7A',
  donutBlue: '#025AA1',
  donutCyan: '#1E90D4',
  dividerLine: 'rgba(255, 255, 255, 0.08)',
};

const noop = () => {};

const SPOLU_ROOMS = [
  {
    id: 'praha-weekend',
    name: 'Praha weekend',
    subtitle: 'Trip · 3 members · 5 expenses',
    status: 'In balance',
    tone: 'ok' as const,
    balance: '247,50',
    footer: 'You owe 0,00 EUR',
    accent: COLORS.purple,
    avatars: [
      { label: 'V', color: COLORS.purple },
      { label: 'K', color: COLORS.danger },
      { label: 'P', color: COLORS.qpGreen },
    ],
  },
  {
    id: 'flatshare-april',
    name: 'Flatshare April',
    subtitle: 'Monthly · 2 members · Rent + utilities',
    status: 'Owe 45,00 EUR',
    tone: 'owe' as const,
    balance: '420,00',
    footer: 'Settle now ›',
    accent: COLORS.accentBlue,
    avatars: [
      { label: 'V', color: COLORS.purple },
      { label: 'J', color: COLORS.qpBurgundy },
    ],
  },
];

const QUICK_PAY = [
  { id: 'kv-1', label: 'KV', name: 'Kolesnikov Volodymyr', color: COLORS.qpBlue },
  { id: 'kv-2', label: 'KV', name: 'Kolesnikov Volodymyr', color: COLORS.qpBlue },
  { id: 'ko', label: 'KO', name: 'Kolomiets', color: COLORS.qpBurgundy },
  { id: 'mf', label: 'MF', name: 'Majiteľ Fer...', color: COLORS.qpGreen },
];

const EXCHANGE_RATES = [
  { id: 'czk', label: 'CZ', country: 'Czech Republic', code: 'CZK', value: '24,2970' },
  { id: 'gbp', label: 'GB', country: 'Great Britain', code: 'GBP', value: '0,8716' },
  { id: 'usd', label: 'US', country: 'USA', code: 'USD', value: '1,1835' },
];

const CARD_ACTIONS = [
  { id: 'e-commerce', icon: '◎', label: 'E-commerce' },
  { id: 'benefits', icon: '★', label: 'Card benefits' },
];

const DONUT_LEGEND = [
  { id: 'uncategorized', color: COLORS.donutGrey, label: 'Unclassified', share: '60%' },
  { id: 'savings', color: COLORS.orange, label: 'Savings and inve…', share: '17%' },
  { id: 'supermarket', color: COLORS.yellow, label: 'Supermarket', share: '9%' },
  { id: 'leisure', color: COLORS.donutBlue, label: 'Leisure time', share: '9%' },
  { id: 'other', color: COLORS.donutCyan, label: 'Other', share: '5%' },
];

const BOTTOM_NAV = [
  { id: 'home', icon: '⌂', label: 'Home', active: true },
  { id: 'transactions', icon: '⇄', label: 'Transactions' },
  { id: 'payment', icon: '↑', label: 'Payment', center: true },
  { id: 'offers', icon: '◎', label: 'Offers' },
  { id: 'more', icon: '≡', label: 'More' },
];

const SPOLU_HERO_COVERS = [
  'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1400&q=80',
  'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=1400&q=80',
  'https://images.unsplash.com/photo-1505764706515-aa95265c5abc?auto=format&fit=crop&w=1400&q=80',
];

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function formatAmount(value: number) {
  return value.toLocaleString('sk-SK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function parseAmountString(value: string) {
  return Number(value.replace(/\s/g, '').replace(',', '.')) || 0;
}

function useSoftLoop(duration = 2600, delay = 0) {
  const value = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(value, {
          toValue: 1,
          duration,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(value, {
          toValue: 0,
          duration,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();
    return () => animation.stop();
  }, [delay, duration, value]);

  return value;
}

function ActionLink({
  label,
  compact,
  onPress = noop,
}: {
  label: string;
  compact?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} hitSlop={8} style={styles.actionLinkWrap}>
      <Text style={[styles.actionLink, compact && styles.actionLinkCompact]}>{label}</Text>
    </Pressable>
  );
}

function TbLogo({ compact }: { compact: boolean }) {
  return (
    <View style={[styles.tbLogo, compact && styles.tbLogoCompact]} accessibilityLabel="Tatra banka logo">
      <Image
        source={require('../assets/brand/tatra-logo.png')}
        style={styles.tbLogoImage}
        resizeMode="contain"
      />
    </View>
  );
}

function Section({
  title,
  actionLabel,
  actionPress = noop,
  compact,
  children,
  showNewBadge,
}: {
  title: string;
  actionLabel?: string;
  actionPress?: () => void;
  compact: boolean;
  children: React.ReactNode;
  showNewBadge?: boolean;
}) {
  return (
    <View>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <Text style={[styles.sectionTitle, compact && styles.sectionTitleCompact]}>{title}</Text>
          {showNewBadge ? (
            <View style={styles.newBadge}>
              <Text style={styles.newBadgeText}>NEW</Text>
            </View>
          ) : null}
        </View>
        {actionLabel ? <ActionLink label={actionLabel} compact={compact} onPress={actionPress} /> : null}
      </View>
      {children}
    </View>
  );
}

function StatusPill({
  label,
  tone,
}: {
  label: string;
  tone: 'ok' | 'owe';
}) {
  return (
    <View style={[styles.pill, tone === 'ok' ? styles.pillOk : styles.pillOwe]}>
      <Text style={[styles.pillText, tone === 'ok' ? styles.pillTextOk : styles.pillTextOwe]}>{label}</Text>
    </View>
  );
}

function Avatar({
  label,
  color,
  first,
}: {
  label: string;
  color: string;
  first?: boolean;
}) {
  return (
    <View style={[styles.avatar, { backgroundColor: color }, !first && styles.avatarOverlap]}>
      <Text style={styles.avatarText}>{label}</Text>
    </View>
  );
}

function RoomCard({
  room,
  compact,
  onPress,
}: {
  room: (typeof SPOLU_ROOMS)[number];
  compact: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.roomCard,
        compact && styles.roomCardCompact,
        pressed && styles.roomCardPressed,
      ]}
    >
      <View style={[styles.roomAccent, { backgroundColor: room.accent }]} />

      <View style={styles.roomTop}>
        <View style={styles.roomTextBlock}>
          <Text style={[styles.roomName, compact && styles.roomNameCompact]}>{room.name}</Text>
          <Text style={[styles.roomSubtitle, compact && styles.roomSubtitleCompact]}>{room.subtitle}</Text>
          <StatusPill label={room.status} tone={room.tone} />
        </View>

        <View style={styles.roomBalanceBlock}>
          <Text style={[styles.roomBalance, compact && styles.roomBalanceCompact]}>
            {room.balance}
            <Text style={styles.inlineCurrency}> EUR</Text>
          </Text>
          <Text style={[styles.roomBalanceLabel, compact && styles.metaCompact]}>Pool balance</Text>
        </View>
      </View>

      <View style={styles.roomMembersRow}>
        <View style={styles.avatarRow}>
          {room.avatars.map((avatar, index) => (
            <Avatar
              key={`${room.id}-${avatar.label}`}
              label={avatar.label}
              color={avatar.color}
              first={index === 0}
            />
          ))}
        </View>
        <Text style={[styles.roomFooter, compact && styles.metaCompact]}>{room.footer}</Text>
      </View>
    </Pressable>
  );
}

function SpoluHeroCard({
  compact,
  onPress,
}: {
  compact: boolean;
  onPress: () => void;
}) {
  const [coverIndex, setCoverIndex] = useState(0);
  const [nextCoverIndex, setNextCoverIndex] = useState(1);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const interval = setInterval(() => {
      const next = (coverIndex + 1) % SPOLU_HERO_COVERS.length;
      setNextCoverIndex(next);
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 820,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          setCoverIndex(next);
          fadeAnim.setValue(0);
        }
      });
    }, 3800);

    return () => clearInterval(interval);
  }, [coverIndex, fadeAnim]);

  const totalBalance = useMemo(
    () => SPOLU_ROOMS.reduce((sum, room) => sum + parseAmountString(room.balance), 0),
    []
  );
  const pendingCount = SPOLU_ROOMS.filter((room) => room.tone === 'owe').length;
  const combinedAvatars = SPOLU_ROOMS.flatMap((room) => room.avatars).slice(0, 4);
  const maxBalance = Math.max(...SPOLU_ROOMS.map((room) => parseAmountString(room.balance)), 1);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.spoluHeroCard, compact && styles.spoluHeroCardCompact, pressed && styles.spoluHeroCardPressed]}
    >
      <Image source={{ uri: SPOLU_HERO_COVERS[coverIndex] }} style={styles.spoluHeroImage} resizeMode="cover" />
      <Animated.Image
        source={{ uri: SPOLU_HERO_COVERS[nextCoverIndex] }}
        style={[styles.spoluHeroImage, { opacity: fadeAnim }]}
        resizeMode="cover"
      />
      <View style={styles.spoluHeroImageTint} pointerEvents="none" />
      <View style={styles.spoluHeroContent}>
        <View style={styles.spoluHeroHeader}>
          <View style={styles.spoluHeroTitleWrap}>
            <Text style={[styles.spoluHeroTitle, compact && styles.spoluHeroTitleCompact]}>Spoločné výdavky</Text>
            <Text style={[styles.spoluHeroSubtitle, compact && styles.spoluHeroSubtitleCompact]}>
              Správa priestorov, príspevkov a vyrovnaní v jednom module.
            </Text>
          </View>
          <View style={styles.spoluHeroBadge}>
            <Text style={styles.spoluHeroBadgeText}>NOVÉ</Text>
          </View>
        </View>

        <View style={styles.spoluHeroStatsRow}>
          <View style={styles.spoluHeroStat}>
            <Text style={styles.spoluHeroStatValue}>{SPOLU_ROOMS.length}</Text>
            <Text style={styles.spoluHeroStatLabel}>Priestory</Text>
          </View>
          <View style={styles.spoluHeroStat}>
            <Text style={styles.spoluHeroStatValue}>{SPOLU_ROOMS.length}</Text>
            <Text style={styles.spoluHeroStatLabel}>Aktívne</Text>
          </View>
          <View style={styles.spoluHeroStat}>
            <Text style={styles.spoluHeroStatValue}>{pendingCount}</Text>
            <Text style={styles.spoluHeroStatLabel}>Čaká na úhradu</Text>
          </View>
        </View>

        <View style={styles.spoluHeroBalanceRow}>
          <View style={styles.spoluHeroBalanceCopy}>
            <Text style={styles.spoluHeroBalanceLabel}>Spoločný zostatok</Text>
            <Text style={[styles.spoluHeroBalanceValue, compact && styles.spoluHeroBalanceValueCompact]}>
              {totalBalance.toLocaleString('sk-SK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EUR
            </Text>
          </View>
          <View style={styles.spoluHeroButton}>
            <Text style={styles.spoluHeroButtonText}>Otvoriť</Text>
          </View>
        </View>

        <View style={styles.spoluHeroFooter}>
          <View style={styles.spoluHeroPeopleRow}>
            <View style={styles.avatarRow}>
              {combinedAvatars.map((avatar, index) => (
                <Avatar
                  key={`spolu-hero-${avatar.label}-${index}`}
                  label={avatar.label}
                  color={avatar.color}
                  first={index === 0}
                />
              ))}
            </View>
            <Text style={[styles.spoluHeroFooterSummary, compact && styles.metaCompact]}>
              {SPOLU_ROOMS.length} priestory • {formatAmount(totalBalance)} EUR celkom
            </Text>
          </View>

          <View style={styles.spoluHeroMiniList}>
            {SPOLU_ROOMS.map((room) => {
              const amount = parseAmountString(room.balance);
              const width = `${Math.max(12, (amount / maxBalance) * 100)}%` as DimensionValue;

              return (
                <View key={room.id} style={styles.spoluHeroMiniRow}>
                  <Text numberOfLines={1} style={styles.spoluHeroMiniName}>{room.name}</Text>
                  <View style={styles.spoluHeroMiniTrack}>
                    <View style={[styles.spoluHeroMiniFill, { width, backgroundColor: room.accent }]} />
                  </View>
                  <Text style={styles.spoluHeroMiniAmount}>{room.balance} EUR</Text>
                </View>
              );
            })}
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function Sparkline({ compact }: { compact: boolean }) {
  const heights = [16, 28, 22, 34, 25, 40, 29, 42];

  return (
    <View style={[styles.sparkline, compact && styles.sparklineCompact]}>
      {heights.map((height, index) => (
        <View key={index} style={styles.sparklineTrack}>
          <View style={[styles.sparklineBar, { height: compact ? height - 3 : height }]} />
        </View>
      ))}
    </View>
  );
}

function CardVisual({ compact }: { compact: boolean }) {
  const glowOne = useSoftLoop(3200, 0);
  const glowTwo = useSoftLoop(3800, 240);

  return (
    <View style={[styles.cardVisual, compact && styles.cardVisualCompact]}>
      <Animated.View
        style={[
          styles.cardGlowOne,
          {
            opacity: glowOne.interpolate({
              inputRange: [0, 1],
              outputRange: [0.24, 0.4],
            }),
            transform: [
              {
                translateX: glowOne.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-8, 12],
                }),
              },
              {
                translateY: glowOne.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -6],
                }),
              },
            ],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.cardGlowTwo,
          {
            opacity: glowTwo.interpolate({
              inputRange: [0, 1],
              outputRange: [0.3, 0.52],
            }),
            transform: [
              {
                translateX: glowTwo.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -14],
                }),
              },
              {
                translateY: glowTwo.interpolate({
                  inputRange: [0, 1],
                  outputRange: [6, -4],
                }),
              },
            ],
          },
        ]}
      />
      <Text style={styles.cardVisa}>VISA</Text>
      <View style={styles.cardChip} />
      <View style={styles.cardStripe} />
    </View>
  );
}

function QuickPayItem({
  item,
  compact,
  index,
}: {
  item: (typeof QUICK_PAY)[number];
  compact: boolean;
  index: number;
}) {
  const pulse = useSoftLoop(2100, index * 180);

  return (
    <Pressable onPress={noop} style={({ pressed }) => [styles.quickPayItem, pressed && styles.quickPayItemPressed]}>
      <View style={styles.quickPayAvatarWrap}>
        <Animated.View
          style={[
            styles.quickPayAvatarAura,
            {
              backgroundColor: item.color,
              opacity: pulse.interpolate({
                inputRange: [0, 1],
                outputRange: [0.08, 0.22],
              }),
              transform: [
                {
                  scale: pulse.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.92, 1.08],
                  }),
                },
              ],
            },
          ]}
        />
        <View style={[styles.quickPayAvatar, { backgroundColor: item.color }]}>
          <Text style={styles.quickPayAvatarText}>{item.label}</Text>
        </View>
      </View>
      <Text numberOfLines={2} style={[styles.quickPayName, compact && styles.quickPayNameCompact]}>
        {item.name}
      </Text>
    </Pressable>
  );
}

function LegendItem({
  label,
  color,
  share,
}: {
  label: string;
  color: string;
  share: string;
}) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: `${color}33` }]}>
        <View style={[styles.legendDotInner, { backgroundColor: color }]} />
      </View>
      <Text numberOfLines={1} style={styles.legendText}>
        {label}
      </Text>
      <Text style={styles.legendShare}>{share}</Text>
    </View>
  );
}

function PhotoStack() {
  const float = useSoftLoop(2800, 120);

  return (
    <Animated.View
      style={[
        styles.photoStack,
        {
          transform: [
            {
              translateY: float.interpolate({
                inputRange: [0, 1],
                outputRange: [2, -4],
              }),
            },
          ],
        },
      ]}
    >
      <View style={[styles.photoCard, styles.photoOne]} />
      <View style={[styles.photoCard, styles.photoTwo]} />
      <View style={[styles.photoCard, styles.photoThree]} />
    </Animated.View>
  );
}

function MapPlaceholder() {
  const pinPulse = useSoftLoop(1900, 0);
  const pinPulseAlt = useSoftLoop(2200, 280);

  return (
    <View style={styles.mapPlaceholder}>
      <View style={styles.mapCanvas}>
        <View style={[styles.mapStroke, styles.mapStrokeOne]} />
        <View style={[styles.mapStroke, styles.mapStrokeTwo]} />
        <Animated.View
          style={[
            styles.mapPin,
            styles.mapPinOne,
            {
              transform: [{ scale: pinPulse.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1.1] }) }],
              opacity: pinPulse.interpolate({ inputRange: [0, 1], outputRange: [0.72, 1] }),
            },
          ]}
        />
        <Animated.View
          style={[
            styles.mapPin,
            styles.mapPinTwo,
            {
              transform: [{ scale: pinPulseAlt.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1.1] }) }],
              opacity: pinPulseAlt.interpolate({ inputRange: [0, 1], outputRange: [0.72, 1] }),
            },
          ]}
        />
        <Animated.View
          style={[
            styles.mapPin,
            styles.mapPinThree,
            {
              transform: [{ scale: pinPulse.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1.08] }) }],
              opacity: pinPulse.interpolate({ inputRange: [0, 1], outputRange: [0.68, 0.96] }),
            },
          ]}
        />
        <Animated.View
          style={[
            styles.mapPin,
            styles.mapPinFour,
            {
              transform: [{ scale: pinPulseAlt.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.08] }) }],
              opacity: pinPulseAlt.interpolate({ inputRange: [0, 1], outputRange: [0.68, 0.96] }),
            },
          ]}
        />
        <Animated.View
          style={[
            styles.mapPin,
            styles.mapPinFive,
            {
              transform: [{ scale: pinPulse.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1.12] }) }],
              opacity: pinPulse.interpolate({ inputRange: [0, 1], outputRange: [0.7, 0.98] }),
            },
          ]}
        />
      </View>
      <Text style={styles.mapHint}>Turn on location services.</Text>
    </View>
  );
}

function RateFlag({ label }: { label: string }) {
  return (
    <View style={styles.rateFlag}>
      <Text style={styles.rateFlagText}>{label}</Text>
    </View>
  );
}

function RateRow({
  rate,
  compact,
}: {
  rate: (typeof EXCHANGE_RATES)[number];
  compact: boolean;
}) {
  return (
    <View style={styles.rateRow}>
      <RateFlag label={rate.label} />
      <Text numberOfLines={1} style={[styles.rateCountry, compact && styles.rateCountryCompact]}>
        {rate.country}
      </Text>
      <Text style={styles.rateCode}>{rate.code}</Text>
      <Text style={styles.rateValue}>{rate.value}</Text>
      <Text style={styles.rateTrend}>—</Text>
    </View>
  );
}

function BottomNav({ compact, bottomInset }: { compact: boolean; bottomInset: number }) {
  return (
    <View style={[styles.bottomNav, { paddingBottom: bottomInset + 16 }]}>
      {BOTTOM_NAV.map((item) => (
        <Pressable key={item.id} onPress={noop} style={({ pressed }) => [styles.bottomNavItem, pressed && styles.bottomNavItemPressed]}>
          <View style={styles.bottomNavIconSlot}>
            {item.center ? (
              <View style={styles.centerNavIconWrap}>
                <Text style={[styles.bottomNavIcon, styles.bottomNavIconActive, compact && styles.bottomNavIconCompact]}>
                  {item.icon}
                </Text>
              </View>
            ) : (
              <Text
                style={[
                  styles.bottomNavIcon,
                  compact && styles.bottomNavIconCompact,
                  item.active && styles.bottomNavIconActive,
                ]}
              >
                {item.icon}
              </Text>
            )}
          </View>
          <Text style={[styles.bottomNavLabel, item.active && styles.bottomNavIconActive]}>{item.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export default function IndexRoute() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const mailPulse = useSoftLoop(1500, 0);
  const compact = width < 370;
  const sectionPaddingX = clamp(width * 0.052, 16, 22);
  const sectionPaddingTop = compact ? 18 : 20;
  const sectionPaddingBottom = compact ? 20 : 24;
  const dividerHeight = compact ? 9 : 11;
  const thickDividerHeight = compact ? 13 : 15;
  const bottomOffset = 96 + insets.bottom;

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.root}>
      <View style={styles.phone}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomOffset }]}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              styles.topBar,
              {
                paddingHorizontal: sectionPaddingX,
                paddingTop: compact ? 14 : 16,
                paddingBottom: compact ? 16 : 18,
              },
            ]}
          >
            <View style={styles.topBarSide}>
              <Pressable onPress={noop} style={styles.mailIcon}>
                <Text style={styles.mailGlyph}>✉</Text>
                <Animated.View
                  style={[
                    styles.mailBadge,
                    {
                      transform: [
                        {
                          scale: mailPulse.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.96, 1.08],
                          }),
                        },
                      ],
                      opacity: mailPulse.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.9, 1],
                      }),
                    },
                  ]}
                >
                  <Text style={styles.mailBadgeText}>5</Text>
                </Animated.View>
              </Pressable>
            </View>

            <View style={styles.topBarCenter}>
              <TbLogo compact={compact} />
            </View>

            <View style={[styles.topBarSide, styles.topBarSideRight]}>
              <ActionLink label="Customize" compact={compact} />
            </View>
          </View>

          <View style={[styles.divider, { height: thickDividerHeight }]} />

          <View
            style={[
              styles.section,
              {
                paddingHorizontal: sectionPaddingX,
                paddingTop: sectionPaddingTop,
                paddingBottom: sectionPaddingBottom,
              },
            ]}
          >
            <Section title="Accounts" compact={compact}>
              <View style={styles.innerCard}>
                <Text style={[styles.accountName, compact && styles.accountNameCompact]}>Kolesnikov Volodymyr</Text>
                <Text style={[styles.iban, compact && styles.metaCompact]}>
                  <Text style={styles.ibanHighlight}>SK05</Text> <Text style={styles.ibanHighlight}>1100</Text>{' '}
                  <Text style={styles.ibanTail}>0000 0029 3258 4439</Text>
                </Text>

                <View style={styles.balanceRow}>
                  <View>
                    <Text style={[styles.balanceLabel, compact && styles.metaCompact]}>Account balance</Text>
                    <Text style={[styles.balanceAmount, compact && styles.balanceAmountCompact]}>
                      3,71
                      <Text style={styles.inlineCurrency}> EUR</Text>
                    </Text>
                  </View>
                  <Sparkline compact={compact} />
                </View>
              </View>
            </Section>
          </View>

          <View style={[styles.divider, { height: dividerHeight }]} />

          <View
            style={[
              styles.section,
              {
                paddingHorizontal: sectionPaddingX,
                paddingTop: sectionPaddingTop,
                paddingBottom: sectionPaddingBottom,
              },
            ]}
          >
            <Section title="Cards" actionLabel="List of cards" compact={compact}>
              <CardVisual compact={compact} />

              <View style={styles.cardDots}>
                <View style={[styles.cardDot, styles.cardDotActive]} />
                <View style={styles.cardDot} />
              </View>

              <View style={styles.cardInfoRow}>
                <View>
                  <Text style={[styles.cardHolder, compact && styles.accountNameCompact]}>Volodymyr Kolesnikov</Text>
                  <Text style={[styles.cardNumber, compact && styles.metaCompact]}>4405 77** **** 2183</Text>
                </View>
                <View style={styles.cardBalanceRight}>
                  <Text style={[styles.cardBalanceAmount, compact && styles.cardBalanceAmountCompact]}>
                    3,71
                    <Text style={styles.inlineCurrency}> EUR</Text>
                  </Text>
                  <Text style={[styles.cardBalanceSub, compact && styles.metaCompact]}>Disposable balance</Text>
                </View>
              </View>

              <View style={styles.cardActionRow}>
                {CARD_ACTIONS.map((action) => (
                  <Pressable key={action.id} onPress={noop} style={styles.cardAction}>
                    <Text style={styles.cardActionIcon}>{action.icon}</Text>
                    <Text style={[styles.cardActionText, compact && styles.metaCompact]}>{action.label}</Text>
                  </Pressable>
                ))}
              </View>
            </Section>
          </View>

          <View style={[styles.divider, { height: dividerHeight }]} />

          <View
            style={[
              styles.section,
              {
                paddingHorizontal: sectionPaddingX,
                paddingTop: sectionPaddingTop,
                paddingBottom: sectionPaddingBottom,
              },
            ]}
          >
            <Section title="Savings" actionLabel="List of savings" compact={compact}>
              <View style={styles.savingsCard}>
                <View style={styles.savingsAccent} />
                <View style={styles.savingsTop}>
                  <View>
                    <Text style={[styles.accountName, compact && styles.accountNameCompact]}>Kolesnikov Volodymyr</Text>
                    <Text style={[styles.savingsSub, compact && styles.metaCompact]}>
                      to account: <Text style={styles.savingsSubValue}>Kolesnikov Volodymyr</Text>
                    </Text>
                  </View>
                  <Text style={[styles.savingsAmount, compact && styles.balanceAmountCompact]}>
                    270,00
                    <Text style={styles.inlineCurrency}> EUR</Text>
                  </Text>
                </View>
                <View style={styles.savingsHint}>
                  <View style={styles.infoIcon}>
                    <Text style={styles.infoIconText}>i</Text>
                  </View>
                  <Text style={[styles.savingsHintText, compact && styles.metaCompact]}>
                    For successful saving we recommend to create a goal.
                  </Text>
                </View>
              </View>
            </Section>
          </View>

          <View style={[styles.divider, { height: dividerHeight }]} />

          <View
            style={[
              styles.section,
              {
                paddingHorizontal: sectionPaddingX,
                paddingTop: sectionPaddingTop,
                paddingBottom: sectionPaddingBottom,
              },
            ]}
          >
            <Section
              title="Spolu"
              actionLabel="See all"
              actionPress={() => router.push('/shared-spaces')}
              compact={compact}
            >
              <SpoluHeroCard compact={compact} onPress={() => router.push('/shared-spaces')} />

              <Pressable
                onPress={() => router.push('/shared-spaces')}
                style={({ pressed }) => [styles.addRoomButton, pressed && styles.addRoomButtonPressed]}
              >
                <View style={styles.addRoomIcon}>
                  <Text style={styles.addRoomIconText}>+</Text>
                </View>
                <Text style={[styles.addRoomLabel, compact && styles.addRoomLabelCompact]}>Create new Spolu room</Text>
              </Pressable>
            </Section>
          </View>

          <View style={[styles.divider, { height: dividerHeight }]} />

          <View
            style={[
              styles.section,
              {
                paddingHorizontal: sectionPaddingX,
                paddingTop: sectionPaddingTop,
                paddingBottom: sectionPaddingBottom,
              },
            ]}
          >
            <Section title="Quick pay" actionLabel="List of beneficiaries" compact={compact}>
              <View style={styles.quickPayGrid}>
                {QUICK_PAY.map((item, index) => (
                  <QuickPayItem key={item.id} item={item} compact={compact} index={index} />
                ))}
              </View>
            </Section>
          </View>

          <View style={[styles.divider, { height: dividerHeight }]} />

          <View
            style={[
              styles.section,
              {
                paddingHorizontal: sectionPaddingX,
                paddingTop: sectionPaddingTop,
                paddingBottom: sectionPaddingBottom,
              },
            ]}
          >
            <Section title="Spending report" actionLabel="Detail" compact={compact}>
              <View style={styles.spendingDiff}>
                <Text style={[styles.spendingDiffLabel, compact && styles.metaCompact]}>Difference</Text>
                <Text style={styles.spendingDiffValue}>
                  <Text style={styles.spendingDiffMinus}>—</Text>19,84
                  <Text style={styles.inlineCurrency}> EUR</Text>
                </Text>
              </View>

              <View style={styles.spendingSummaryRow}>
                <View style={styles.spendingSummaryCol}>
                  <Text style={[styles.spendingSummaryLabel, compact && styles.metaCompact]}>Expenses</Text>
                  <Text style={styles.spendingExpenses}>
                    1 025,34
                    <Text style={styles.inlineCurrency}> EUR</Text>
                  </Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.spendingSummaryCol}>
                  <Text style={[styles.spendingSummaryLabel, compact && styles.metaCompact]}>Incomes</Text>
                  <Text style={styles.spendingIncomes}>
                    1 005,50
                    <Text style={styles.inlineCurrency}> EUR</Text>
                  </Text>
                </View>
              </View>

              <View style={[styles.spendingMain, compact && styles.spendingMainCompact]}>
                <View style={styles.legendList}>
                  {DONUT_LEGEND.slice(0, 4).map((item) => (
                    <LegendItem key={item.id} label={item.label} color={item.color} share={item.share} />
                  ))}
                </View>
              </View>
            </Section>
          </View>

          <View style={[styles.divider, { height: dividerHeight }]} />

          <View
            style={[
              styles.section,
              {
                paddingHorizontal: sectionPaddingX,
                paddingTop: sectionPaddingTop,
                paddingBottom: sectionPaddingBottom,
              },
            ]}
          >
            <Section title="Loans" actionLabel="Add product" compact={compact}>
              <View style={styles.illustrationRow}>
                <PhotoStack />
                <Text style={[styles.illustrationText, compact && styles.illustrationTextCompact]}>
                  Ask for a Loan and we will contact you with an offer.
                </Text>
              </View>
            </Section>
          </View>

          <View style={[styles.divider, { height: dividerHeight }]} />

          <View
            style={[
              styles.section,
              {
                paddingHorizontal: sectionPaddingX,
                paddingTop: sectionPaddingTop,
                paddingBottom: sectionPaddingBottom,
              },
            ]}
          >
            <Section title="Branches and ATMs" actionLabel="Show" compact={compact}>
              <MapPlaceholder />
            </Section>
          </View>

          <View style={[styles.divider, { height: dividerHeight }]} />

          <View
            style={[
              styles.section,
              {
                paddingHorizontal: sectionPaddingX,
                paddingTop: sectionPaddingTop,
                paddingBottom: sectionPaddingBottom,
              },
            ]}
          >
            <Section title="Exchange rates" actionLabel="Detail" compact={compact}>
              <View>
                {EXCHANGE_RATES.map((rate) => (
                  <RateRow key={rate.id} rate={rate} compact={compact} />
                ))}
              </View>
            </Section>
          </View>

          <View style={[styles.divider, { height: dividerHeight }]} />

          <View
            style={[
              styles.section,
              {
                paddingHorizontal: sectionPaddingX,
                paddingTop: sectionPaddingTop,
                paddingBottom: sectionPaddingBottom,
              },
            ]}
          >
            <Section title="DDS pension" actionLabel="Add product" compact={compact}>
              <View style={styles.illustrationRow}>
                <View style={styles.ddsLogoWrap}>
                  <Text style={styles.ddsLogo}>DDS</Text>
                </View>
                <Text style={[styles.illustrationText, compact && styles.illustrationTextCompact]}>
                  Open a DDS pension saving and secure a better pension.
                </Text>
              </View>
            </Section>
          </View>

          <View style={[styles.divider, { height: dividerHeight }]} />

          <View
            style={[
              styles.section,
              {
                paddingHorizontal: sectionPaddingX,
                paddingTop: sectionPaddingTop,
                paddingBottom: sectionPaddingBottom,
              },
            ]}
          >
            <Section title="Assets and Liabilities" actionLabel="Detail" compact={compact}>
              <View style={styles.assetsDiff}>
                <Text style={[styles.spendingDiffLabel, compact && styles.metaCompact]}>Difference:</Text>
                <Text style={styles.assetsDiffValue}>
                  <Text style={styles.assetsDiffPlus}>+</Text>273,71
                  <Text style={styles.inlineCurrency}> EUR</Text>
                </Text>
              </View>

              <View style={styles.assetsGrid}>
                <View style={styles.assetsCol}>
                  <Text style={[styles.assetsLabel, compact && styles.metaCompact]}>Assets</Text>
                  <Text style={styles.assetsValuePositive}>
                    273,71
                    <Text style={styles.inlineCurrency}> EUR</Text>
                  </Text>
                  <View style={[styles.assetsBar, styles.assetsBarFilled]}>
                    <Text style={styles.assetsBarText}>100 %</Text>
                  </View>
                </View>

                <View style={styles.assetsCol}>
                  <Text style={[styles.assetsLabel, compact && styles.metaCompact]}>Liabilities</Text>
                  <Text style={styles.assetsValueNegative}>
                    0,00
                    <Text style={styles.inlineCurrency}> EUR</Text>
                  </Text>
                  <View style={[styles.assetsBar, styles.assetsBarEmpty]} />
                </View>
              </View>
            </Section>
          </View>

          <View style={[styles.divider, { height: dividerHeight }]} />

          <View
            style={[
              styles.section,
              {
                paddingHorizontal: sectionPaddingX,
                paddingTop: sectionPaddingTop,
                paddingBottom: sectionPaddingBottom,
              },
            ]}
          >
            <Section title="Mutual funds" actionLabel="Add product" compact={compact}>
              <View style={styles.illustrationRow}>
                <View style={styles.chessWrap}>
                  <Text style={styles.chessPiece}>♘</Text>
                  <Text style={[styles.chessPiece, styles.chessPieceDark]}>♞</Text>
                  <Text style={[styles.chessPiece, styles.chessPieceSide]}>♜</Text>
                </View>
                <Text style={[styles.illustrationText, compact && styles.illustrationTextCompact]}>
                  Make the right move for your savings and let them grow.
                </Text>
              </View>
            </Section>
          </View>
        </ScrollView>

        <BottomNav compact={compact} bottomInset={insets.bottom} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bgPage,
  },
  phone: {
    flex: 1,
    width: '100%',
    backgroundColor: COLORS.bgPage,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 110,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  topBarSide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  topBarSideRight: {
    alignItems: 'flex-end',
  },
  topBarCenter: {
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mailIcon: {
    width: 26,
    height: 26,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  mailGlyph: {
    color: COLORS.accentBlue,
    fontSize: 19,
    lineHeight: 19,
  },
  mailBadge: {
    position: 'absolute',
    top: -4,
    right: -5,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: COLORS.accentBlue,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mailBadgeText: {
    color: COLORS.textPrimary,
    fontSize: 10,
    fontWeight: '600',
  },
  tbLogo: {
    width: 94,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tbLogoCompact: {
    width: 84,
    height: 40,
  },
  tbLogoImage: {
    width: '100%',
    height: '100%',
  },
  actionLinkWrap: {
    paddingVertical: 2,
  },
  actionLink: {
    color: COLORS.accentBlue,
    fontSize: 16,
    fontWeight: '400',
  },
  actionLinkCompact: {
    fontSize: 15,
  },
  divider: {
    backgroundColor: COLORS.bgBlack,
  },
  section: {
    backgroundColor: COLORS.bgPage,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 18,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontSize: 26,
    fontWeight: '500',
    letterSpacing: -0.4,
  },
  sectionTitleCompact: {
    fontSize: 23,
  },
  newBadge: {
    backgroundColor: COLORS.purple,
    borderRadius: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    transform: [{ translateY: -4 }],
  },
  newBadgeText: {
    color: COLORS.textPrimary,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
  },
  innerCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 20,
  },
  accountName: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 5,
  },
  accountNameCompact: {
    fontSize: 17,
  },
  iban: {
    color: COLORS.textIban,
    fontSize: 14,
    letterSpacing: 0.5,
    marginBottom: 22,
  },
  ibanHighlight: {
    color: '#D8D8DC',
  },
  ibanTail: {
    color: COLORS.textIban,
  },
  metaCompact: {
    fontSize: 13,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: COLORS.dividerLine,
    paddingTop: 16,
    gap: 16,
  },
  balanceLabel: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginBottom: 4,
  },
  balanceAmount: {
    color: COLORS.textPrimary,
    fontSize: 22,
    fontWeight: '500',
  },
  balanceAmountCompact: {
    fontSize: 20,
  },
  inlineCurrency: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '400',
    marginLeft: 3,
  },
  sparkline: {
    width: 130,
    height: 42,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  sparklineCompact: {
    width: 112,
    height: 38,
  },
  sparklineTrack: {
    width: 11,
    height: '100%',
    justifyContent: 'flex-end',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,118,78,0.12)',
  },
  sparklineBar: {
    width: 10,
    borderRadius: 2,
    backgroundColor: COLORS.chartGreen,
  },
  cardVisual: {
    width: '100%',
    aspectRatio: 1.586,
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#2A2433',
  },
  cardVisualCompact: {
    marginBottom: 14,
  },
  cardGlowOne: {
    position: 'absolute',
    top: -18,
    left: -20,
    width: 180,
    height: 120,
    borderRadius: 90,
    backgroundColor: '#8B7BA8',
    opacity: 0.32,
  },
  cardGlowTwo: {
    position: 'absolute',
    bottom: -18,
    right: -14,
    width: 140,
    height: 100,
    borderRadius: 70,
    backgroundColor: '#4A4156',
    opacity: 0.42,
  },
  cardVisa: {
    position: 'absolute',
    top: 14,
    right: 16,
    color: COLORS.textPrimary,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 1,
    fontStyle: 'italic',
  },
  cardChip: {
    position: 'absolute',
    bottom: 14,
    right: 16,
    width: 26,
    height: 20,
    borderRadius: 3,
    backgroundColor: '#8F7546',
  },
  cardStripe: {
    position: 'absolute',
    bottom: 14,
    left: 14,
    width: 14,
    height: 12,
    backgroundColor: COLORS.textPrimary,
    borderRadius: 2,
    transform: [{ rotate: '45deg' }],
  },
  cardDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 18,
  },
  cardDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4A4A52',
  },
  cardDotActive: {
    backgroundColor: COLORS.accentBlue,
  },
  cardInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  cardHolder: {
    color: COLORS.textPrimary,
    fontSize: 17,
    fontWeight: '500',
    marginBottom: 4,
  },
  cardNumber: {
    color: COLORS.textIban,
    fontSize: 13,
  },
  cardBalanceRight: {
    alignItems: 'flex-end',
  },
  cardBalanceAmount: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '500',
  },
  cardBalanceAmountCompact: {
    fontSize: 17,
  },
  cardBalanceSub: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 3,
  },
  cardActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: COLORS.dividerLine,
  },
  cardAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardActionIcon: {
    color: COLORS.accentBlue,
    fontSize: 17,
  },
  cardActionText: {
    color: COLORS.accentBlue,
    fontSize: 14,
  },
  savingsCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  savingsAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: COLORS.purple,
  },
  savingsTop: {
    paddingTop: 16,
    paddingRight: 20,
    paddingBottom: 14,
    paddingLeft: 22,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.dividerLine,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 14,
  },
  savingsSub: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  savingsSubValue: {
    color: COLORS.textPrimary,
  },
  savingsAmount: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: '500',
  },
  savingsHint: {
    paddingTop: 14,
    paddingRight: 20,
    paddingBottom: 16,
    paddingLeft: 22,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  infoIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.textTertiary,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1,
  },
  infoIconText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontStyle: 'italic',
    fontWeight: '500',
  },
  savingsHintText: {
    flex: 1,
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  spoluHeroCard: {
    minHeight: 278,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#24262B',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  spoluHeroCardCompact: {
    minHeight: 264,
  },
  spoluHeroCardPressed: {
    opacity: 0.94,
  },
  spoluHeroImage: {
    ...StyleSheet.absoluteFillObject,
  },
  spoluHeroImageTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(14, 16, 22, 0.58)',
  },
  spoluHeroContent: {
    flex: 1,
    paddingTop: 18,
    paddingRight: 18,
    paddingBottom: 16,
    paddingLeft: 18,
    backgroundColor: 'rgba(19, 21, 27, 0.48)',
  },
  spoluHeroHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  spoluHeroTitleWrap: {
    flex: 1,
    gap: 8,
  },
  spoluHeroTitle: {
    color: COLORS.textPrimary,
    fontSize: 28,
    lineHeight: 30,
    fontWeight: '700',
  },
  spoluHeroTitleCompact: {
    fontSize: 24,
    lineHeight: 27,
  },
  spoluHeroSubtitle: {
    maxWidth: 220,
    color: 'rgba(255,255,255,0.82)',
    fontSize: 14,
    lineHeight: 20,
  },
  spoluHeroSubtitleCompact: {
    fontSize: 13,
    lineHeight: 18,
  },
  spoluHeroBadge: {
    minHeight: 32,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(51,144,221,0.52)',
    backgroundColor: 'rgba(24, 32, 44, 0.42)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spoluHeroBadgeText: {
    color: '#DCEEFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  spoluHeroStatsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  spoluHeroStat: {
    flex: 1,
    paddingLeft: 12,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255,255,255,0.12)',
  },
  spoluHeroStatValue: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 3,
  },
  spoluHeroStatLabel: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 12,
    lineHeight: 16,
  },
  spoluHeroBalanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  spoluHeroBalanceCopy: {
    flex: 1,
    gap: 4,
  },
  spoluHeroBalanceLabel: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  spoluHeroBalanceValue: {
    color: COLORS.textPrimary,
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '700',
  },
  spoluHeroBalanceValueCompact: {
    fontSize: 22,
    lineHeight: 26,
  },
  spoluHeroButton: {
    minWidth: 116,
    height: 48,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: COLORS.accentBlue,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.accentBlue,
    shadowOpacity: 0.22,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
  },
  spoluHeroButtonText: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  spoluHeroFooter: {
    marginTop: 'auto',
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    gap: 12,
  },
  spoluHeroPeopleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  spoluHeroFooterSummary: {
    flex: 1,
    color: 'rgba(255,255,255,0.72)',
    fontSize: 13,
  },
  spoluHeroMiniList: {
    gap: 8,
  },
  spoluHeroMiniRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  spoluHeroMiniName: {
    width: 86,
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '500',
  },
  spoluHeroMiniTrack: {
    flex: 1,
    height: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  spoluHeroMiniFill: {
    height: '100%',
    borderRadius: 999,
  },
  spoluHeroMiniAmount: {
    width: 84,
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'right',
  },
  roomCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 10,
    paddingTop: 16,
    paddingRight: 20,
    paddingBottom: 16,
    paddingLeft: 22,
    marginBottom: 10,
    position: 'relative',
  },
  roomCardCompact: {
    paddingRight: 16,
    paddingLeft: 18,
  },
  roomCardPressed: {
    backgroundColor: COLORS.bgCardPressed,
  },
  roomAccent: {
    position: 'absolute',
    left: 0,
    top: 12,
    bottom: 12,
    width: 4,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  roomTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  roomTextBlock: {
    flex: 1,
  },
  roomName: {
    color: COLORS.textPrimary,
    fontSize: 17,
    fontWeight: '500',
    marginBottom: 3,
  },
  roomNameCompact: {
    fontSize: 16,
  },
  roomSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginBottom: 6,
  },
  roomSubtitleCompact: {
    fontSize: 12,
  },
  roomBalanceBlock: {
    alignItems: 'flex-end',
  },
  roomBalance: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: '500',
  },
  roomBalanceCompact: {
    fontSize: 18,
  },
  roomBalanceLabel: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginTop: 4,
  },
  pill: {
    alignSelf: 'flex-start',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  pillOk: {
    backgroundColor: 'rgba(57,198,155,0.15)',
  },
  pillOwe: {
    backgroundColor: 'rgba(195,98,89,0.18)',
  },
  pillText: {
    fontSize: 11,
    fontWeight: '500',
  },
  pillTextOk: {
    color: COLORS.success,
  },
  pillTextOwe: {
    color: COLORS.danger,
  },
  roomMembersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.dividerLine,
  },
  avatarRow: {
    flexDirection: 'row',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: COLORS.bgCard,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarOverlap: {
    marginLeft: -9,
  },
  avatarText: {
    color: COLORS.textPrimary,
    fontSize: 10,
    fontWeight: '600',
  },
  roomFooter: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginLeft: 'auto',
  },
  addRoomButton: {
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(51,144,221,0.18)',
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.03)',
    paddingHorizontal: 18,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  addRoomButtonPressed: {
    opacity: 0.86,
  },
  addRoomIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.accentBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addRoomIconText: {
    color: COLORS.textPrimary,
    fontSize: 22,
    lineHeight: 22,
  },
  addRoomLabel: {
    color: COLORS.textPrimary,
    fontSize: 14,
  },
  addRoomLabelCompact: {
    fontSize: 13,
  },
  quickPayGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  quickPayItem: {
    flex: 1,
    backgroundColor: COLORS.bgCard,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingTop: 14,
    paddingBottom: 12,
    alignItems: 'center',
  },
  quickPayItemPressed: {
    opacity: 0.84,
    transform: [{ scale: 0.985 }],
  },
  quickPayAvatarWrap: {
    width: 52,
    height: 52,
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickPayAvatarAura: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  quickPayAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickPayAvatarText: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  quickPayName: {
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 15,
    textAlign: 'center',
    minHeight: 30,
  },
  quickPayNameCompact: {
    fontSize: 11,
    lineHeight: 14,
  },
  spendingDiff: {
    alignItems: 'center',
    marginBottom: 10,
  },
  spendingDiffLabel: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginBottom: 4,
  },
  spendingDiffValue: {
    color: COLORS.danger,
    fontSize: 20,
    fontWeight: '500',
  },
  spendingDiffMinus: {
    color: COLORS.danger,
    marginRight: 4,
  },
  spendingSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 28,
    marginBottom: 24,
    paddingBottom: 4,
  },
  spendingSummaryCol: {
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: COLORS.dividerLine,
  },
  spendingSummaryLabel: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginBottom: 3,
  },
  spendingExpenses: {
    color: COLORS.danger,
    fontSize: 18,
    fontWeight: '500',
  },
  spendingIncomes: {
    color: COLORS.success,
    fontSize: 18,
    fontWeight: '500',
  },
  spendingMain: {
    width: '100%',
  },
  spendingMainCompact: {
  },
  legendList: {
    width: '100%',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  legendDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendDotInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 14,
  },
  legendShare: {
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  illustrationRow: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
  },
  illustrationText: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 14,
    lineHeight: 20,
  },
  illustrationTextCompact: {
    fontSize: 13,
    lineHeight: 18,
  },
  photoStack: {
    width: 90,
    height: 70,
    position: 'relative',
  },
  photoCard: {
    position: 'absolute',
    width: 42,
    height: 42,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: COLORS.textPrimary,
  },
  photoOne: {
    top: 5,
    left: 0,
    backgroundColor: '#8B6F5A',
    transform: [{ rotate: '-8deg' }],
  },
  photoTwo: {
    top: 8,
    left: 25,
    backgroundColor: '#A8B5C4',
    transform: [{ rotate: '3deg' }],
  },
  photoThree: {
    top: 22,
    left: 14,
    backgroundColor: '#6B5A48',
    transform: [{ rotate: '-3deg' }],
  },
  mapPlaceholder: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  mapCanvas: {
    width: 200,
    height: 80,
    position: 'relative',
  },
  mapStroke: {
    position: 'absolute',
    borderWidth: 1.2,
    borderColor: 'rgba(255,255,255,0.35)',
    borderRadius: 20,
  },
  mapStrokeOne: {
    left: 18,
    top: 22,
    width: 164,
    height: 34,
  },
  mapStrokeTwo: {
    left: 38,
    top: 18,
    width: 118,
    height: 44,
  },
  mapPin: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.accentBlue,
  },
  mapPinOne: {
    left: 52,
    top: 40,
  },
  mapPinTwo: {
    left: 74,
    top: 32,
  },
  mapPinThree: {
    left: 99,
    top: 36,
  },
  mapPinFour: {
    left: 143,
    top: 32,
  },
  mapPinFive: {
    left: 164,
    top: 40,
  },
  mapHint: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  rateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.dividerLine,
  },
  rateFlag: {
    width: 28,
    height: 20,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rateFlagText: {
    color: COLORS.bgBlack,
    fontSize: 10,
    fontWeight: '700',
  },
  rateCountry: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 15,
  },
  rateCountryCompact: {
    fontSize: 14,
  },
  rateCode: {
    width: 40,
    color: COLORS.textIban,
    fontSize: 14,
    textAlign: 'center',
  },
  rateValue: {
    width: 80,
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'right',
  },
  rateTrend: {
    width: 14,
    color: COLORS.textTertiary,
    textAlign: 'center',
  },
  ddsLogoWrap: {
    width: 90,
    height: 70,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ddsLogo: {
    color: '#C8C8CC',
    fontSize: 40,
    fontWeight: '700',
    fontStyle: 'italic',
    letterSpacing: -2,
  },
  assetsDiff: {
    alignItems: 'center',
    marginBottom: 22,
  },
  assetsDiffValue: {
    color: COLORS.textPrimary,
    fontSize: 32,
    fontWeight: '500',
  },
  assetsDiffPlus: {
    color: COLORS.success,
    marginRight: 6,
  },
  assetsGrid: {
    flexDirection: 'row',
    gap: 24,
  },
  assetsCol: {
    flex: 1,
    alignItems: 'center',
  },
  assetsLabel: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginBottom: 4,
  },
  assetsValuePositive: {
    color: COLORS.success,
    fontSize: 17,
    fontWeight: '500',
    marginBottom: 14,
  },
  assetsValueNegative: {
    color: COLORS.danger,
    fontSize: 17,
    fontWeight: '500',
    marginBottom: 14,
  },
  assetsBar: {
    width: '100%',
    height: 140,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  assetsBarFilled: {
    backgroundColor: COLORS.successDeep,
  },
  assetsBarEmpty: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: COLORS.textTertiary,
  },
  assetsBarText: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '500',
  },
  chessWrap: {
    width: 90,
    height: 70,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  chessPiece: {
    color: '#D8D8DC',
    fontSize: 28,
  },
  chessPieceDark: {
    color: '#A5A5A9',
  },
  chessPieceSide: {
    fontSize: 26,
  },
  bottomNav: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    paddingHorizontal: 6,
    backgroundColor: COLORS.bgPage,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  bottomNavItem: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    justifyContent: 'flex-end',
  },
  bottomNavItemPressed: {
    opacity: 0.82,
  },
  bottomNavIconSlot: {
    width: '100%',
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerNavIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: COLORS.accentBlue,
    backgroundColor: COLORS.bgPage,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomNavIcon: {
    color: COLORS.textSecondary,
    fontSize: 21,
    lineHeight: 21,
  },
  bottomNavIconCompact: {
    fontSize: 19,
    lineHeight: 19,
  },
  bottomNavIconActive: {
    color: COLORS.accentBlue,
  },
  bottomNavLabel: {
    color: COLORS.textSecondary,
    fontSize: 10.5,
    lineHeight: 12,
    textAlign: 'center',
  },
});
