import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const COLORS = {
  divider: '#000000',
  page: '#1D1E23',
  card: '#28292E',
  textPrimary: '#FFFFFF',
  textSecondary: '#A5A5A9',
  textTertiary: '#5F5F69',
  accentBlue: '#3390DD',
  accentBlueAlt: '#4A9EE0',
  success: '#2EB872',
  successChart: '#00764E',
  danger: '#E74C3C',
  warning: '#F5A623',
  purple: '#5B4ACA',
  dividerLine: 'rgba(255,255,255,0.08)',
};

const rooms = [
  {
    id: 'praha-weekend',
    name: 'Praha weekend',
    subtitle: 'Trip · 3 members · 5 expenses',
    balance: '247,50',
    status: 'In balance',
    statusTone: 'ok' as const,
    accent: COLORS.purple,
    footer: 'You owe 0,00 EUR',
    avatars: [
      { label: 'V', color: COLORS.purple },
      { label: 'K', color: COLORS.danger },
      { label: 'P', color: COLORS.success },
    ],
  },
  {
    id: 'flatshare-april',
    name: 'Flatshare April',
    subtitle: 'Monthly · 2 members · Rent + utilities',
    balance: '420,00',
    status: 'Owe 45,00 EUR',
    statusTone: 'owe' as const,
    accent: COLORS.warning,
    footer: 'Settle now ›',
    avatars: [
      { label: 'V', color: COLORS.purple },
      { label: 'J', color: COLORS.warning },
    ],
  },
];

const cardActions = [
  { icon: '◎', label: 'E-commerce' },
  { icon: '★', label: 'Card benefits' },
];

const bottomNav = [
  { icon: '⌂', label: 'Home', active: true },
  { icon: '⇄', label: 'Transactions' },
  { icon: '↑', label: 'Payment' },
  { icon: '◉', label: 'Offers' },
  { icon: '≡', label: 'More' },
];

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function TbLogo({ compact }: { compact: boolean }) {
  return (
    <View style={[styles.logo, compact && styles.logoCompact]} accessibilityLabel="Tatra banka logo">
      <View style={styles.logoBar} />
      <View style={styles.logoBar} />
      <View style={styles.logoBar} />
    </View>
  );
}

function SectionDivider() {
  return <View style={styles.sectionDivider} />;
}

function ActionLink({
  label,
  onPress,
  compact,
}: {
  label: string;
  onPress?: () => void;
  compact?: boolean;
}) {
  return (
    <Pressable onPress={onPress} style={styles.actionLinkWrap}>
      <Text style={[styles.actionLink, compact && styles.actionLinkCompact]}>{label}</Text>
    </Pressable>
  );
}

function SectionHeader({
  title,
  actionLabel,
  onActionPress,
  compact,
}: {
  title: string;
  actionLabel?: string;
  onActionPress?: () => void;
  compact?: boolean;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, compact && styles.sectionTitleCompact]}>{title}</Text>
      {actionLabel ? <ActionLink label={actionLabel} onPress={onActionPress} compact={compact} /> : null}
    </View>
  );
}

function Sparkline({ compact }: { compact: boolean }) {
  const bars = [15, 26, 20, 30, 19, 37, 28, 39];
  return (
    <View style={[styles.sparkline, compact && styles.sparklineCompact]}>
      {bars.map((height, index) => (
        <View key={index} style={styles.sparklineBarWrap}>
          <View style={[styles.sparklineBar, { height: compact ? height - 3 : height }]} />
        </View>
      ))}
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
    <View
      style={[
        styles.statusPill,
        tone === 'ok' ? styles.statusPillOk : styles.statusPillOwe,
      ]}
    >
      <Text
        style={[
          styles.statusPillText,
          tone === 'ok' ? styles.statusPillTextOk : styles.statusPillTextOwe,
        ]}
      >
        {label}
      </Text>
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
    <View
      style={[
        styles.avatar,
        { backgroundColor: color },
        !first && styles.avatarOverlap,
      ]}
    >
      <Text style={styles.avatarText}>{label}</Text>
    </View>
  );
}

function RoomCard({
  room,
  compact,
}: {
  room: (typeof rooms)[number];
  compact: boolean;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.roomCard,
        compact && styles.roomCardCompact,
        pressed && styles.roomCardPressed,
      ]}
      onPress={() => router.push('/shared-spaces')}
    >
      <View style={[styles.accentStrip, { backgroundColor: room.accent }]} />

      <View style={styles.roomTop}>
        <View style={styles.roomTopLeft}>
          <Text style={[styles.roomName, compact && styles.roomNameCompact]}>{room.name}</Text>
          <Text style={[styles.roomSub, compact && styles.roomSubCompact]}>{room.subtitle}</Text>
          <StatusPill label={room.status} tone={room.statusTone} />
        </View>

        <View style={[styles.roomBalance, compact && styles.roomBalanceCompact]}>
          <Text style={[styles.roomBalanceAmount, compact && styles.roomBalanceAmountCompact]}>
            {room.balance}
            <Text style={styles.currencyTiny}> EUR</Text>
          </Text>
          <Text style={[styles.roomSubMuted, compact && styles.roomSubCompact]}>Pool balance</Text>
        </View>
      </View>

      <View style={styles.membersRow}>
        <View style={styles.avatars}>
          {room.avatars.map((avatar, index) => (
            <Avatar
              key={`${room.id}-${avatar.label}`}
              label={avatar.label}
              color={avatar.color}
              first={index === 0}
            />
          ))}
        </View>
        <Text style={styles.membersCount}>{room.footer}</Text>
      </View>
    </Pressable>
  );
}

function BottomNavBar({
  compact,
  bottomInset,
}: {
  compact: boolean;
  bottomInset: number;
}) {
  return (
    <View style={[styles.bottomNav, { paddingBottom: bottomInset + (compact ? 12 : 18) }]}>
      {bottomNav.map((item) => (
        <Pressable key={item.label} style={styles.navItem}>
          <Text style={[styles.navIcon, compact && styles.navIconCompact, item.active && styles.navItemActive]}>
            {item.icon}
          </Text>
          <Text style={[styles.navLabel, compact && styles.navLabelCompact, item.active && styles.navItemActive]}>
            {item.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

export default function NativeTatraHomeScreen() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const compact = width < 370;
  const sectionPaddingX = clamp(width * 0.052, 16, 22);
  const sectionPaddingTop = compact ? 18 : 20;
  const sectionPaddingBottom = compact ? 20 : 24;
  const dividerHeight = compact ? 9 : 11;
  const topBarPaddingTop = compact ? 12 : 16;
  const topBarPaddingBottom = compact ? 14 : 18;
  const scrollBottom = 100 + insets.bottom + (compact ? 4 : 0);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.root}>
      <View style={styles.phone}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollBottom }]}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              styles.topBar,
              {
                paddingHorizontal: sectionPaddingX,
                paddingTop: topBarPaddingTop,
                paddingBottom: topBarPaddingBottom,
              },
            ]}
          >
            <View style={styles.mailWrap}>
              <Text style={styles.mailIcon}>✉</Text>
              <View style={styles.mailBadge}>
                <Text style={styles.mailBadgeText}>5</Text>
              </View>
            </View>
            <TbLogo compact={compact} />
            <ActionLink label="Customize" compact={compact} />
          </View>

          <View style={[styles.sectionDivider, { height: dividerHeight }]} />

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
            <SectionHeader title="Accounts" compact={compact} />
            <View style={[styles.innerCard, compact && styles.innerCardCompact]}>
              <Text style={styles.accountName}>Kolesnikov Volodymyr</Text>
              <Text style={styles.iban}>
                <Text style={styles.ibanEm}>SK05 1100</Text> 0000 00
                <Text style={styles.ibanEm}>29</Text> 3258 4439
              </Text>

              <View style={styles.balanceRow}>
                <View>
                  <Text style={styles.balanceLabel}>Account balance</Text>
                  <Text style={styles.balanceAmount}>
                    3,71
                    <Text style={styles.currencyLabel}> EUR</Text>
                  </Text>
                </View>
                <Sparkline compact={compact} />
              </View>
            </View>
          </View>

          <View style={[styles.sectionDivider, { height: dividerHeight }]} />

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
            <SectionHeader
              title="Spolu"
              actionLabel="See all"
              onActionPress={() => router.push('/shared-spaces')}
              compact={compact}
            />

            {rooms.map((room) => (
              <RoomCard key={room.id} room={room} compact={compact} />
            ))}

            <Pressable style={[styles.addRoomButton, compact && styles.addRoomButtonCompact]}>
              <View style={styles.addIconCircle}>
                <Text style={styles.addIconText}>+</Text>
              </View>
              <Text style={[styles.addRoomText, compact && styles.addRoomTextCompact]}>Create new Spolu room</Text>
            </Pressable>
          </View>

          <View style={[styles.sectionDivider, { height: dividerHeight }]} />

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
            <SectionHeader title="Cards" actionLabel="List of cards" compact={compact} />

            <View style={[styles.cardVisual, compact && styles.cardVisualCompact]}>
              <View style={styles.cardGlow} />
              <Text style={styles.cardVisa}>VISA</Text>
              <View style={styles.cardChip} />
            </View>

            <View style={styles.cardDots}>
              <View style={[styles.cardDot, styles.cardDotActive]} />
              <View style={styles.cardDot} />
            </View>

            <View style={styles.cardBalanceRow}>
              <View>
                <Text style={styles.cardHolder}>Volodymyr Kolesnikov</Text>
                <Text style={styles.cardNumber}>4405 77** **** 2183</Text>
              </View>
              <View style={styles.cardBalanceRight}>
                <Text style={styles.cardBalanceAmount}>
                  3,71
                  <Text style={styles.currencyTiny}> EUR</Text>
                </Text>
                <Text style={styles.cardBalanceSub}>Disposable balance</Text>
              </View>
            </View>

            <View style={styles.cardActions}>
              {cardActions.map((action) => (
                <Pressable key={action.label} style={styles.cardAction}>
                  <Text style={styles.cardActionIcon}>{action.icon}</Text>
                  <Text style={styles.cardActionText}>{action.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={[styles.sectionDivider, { height: dividerHeight }]} />

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
            <SectionHeader title="Savings" actionLabel="List of savings" compact={compact} />

            <View style={[styles.innerCard, compact && styles.innerCardCompact, styles.savingsCard]}>
              <View style={[styles.accentStrip, styles.savingsAccent]} />
              <View style={styles.savingsTop}>
                <View>
                  <Text style={styles.accountName}>Kolesnikov Volodymyr</Text>
                  <Text style={styles.iban}>Savings account</Text>
                </View>
                <Text style={styles.balanceAmount}>
                  270,00
                  <Text style={styles.currencyLabel}> EUR</Text>
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>

        <BottomNavBar compact={compact} bottomInset={insets.bottom} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.divider,
    alignItems: 'center',
  },
  phone: {
    flex: 1,
    width: '100%',
    backgroundColor: COLORS.page,
    alignSelf: 'center',
    maxWidth: 390,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 104,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mailWrap: {
    width: 28,
    height: 28,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mailIcon: {
    color: COLORS.accentBlue,
    fontSize: 18,
    lineHeight: 18,
  },
  mailBadge: {
    position: 'absolute',
    top: -2,
    right: -4,
    minWidth: 17,
    height: 17,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: COLORS.accentBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mailBadgeText: {
    color: COLORS.textPrimary,
    fontSize: 10,
    fontWeight: '600',
  },
  logo: {
    width: 42,
    height: 24,
    flexDirection: 'row',
    gap: 3,
    transform: [{ skewX: '-18deg' }],
  },
  logoCompact: {
    width: 38,
    height: 22,
  },
  logoBar: {
    flex: 1,
    backgroundColor: COLORS.textPrimary,
    borderRadius: 1,
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
    fontSize: 14,
  },
  sectionDivider: {
    height: 11,
    backgroundColor: COLORS.divider,
  },
  section: {
    backgroundColor: COLORS.page,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontSize: 26,
    fontWeight: '500',
    letterSpacing: -0.3,
  },
  sectionTitleCompact: {
    fontSize: 23,
  },
  innerCard: {
    backgroundColor: COLORS.card,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 20,
  },
  innerCardCompact: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 18,
  },
  accountName: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 6,
  },
  iban: {
    color: COLORS.textTertiary,
    fontSize: 14,
    letterSpacing: 0.6,
    marginBottom: 24,
  },
  ibanEm: {
    color: '#B8B8BC',
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: COLORS.dividerLine,
  },
  balanceLabel: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginBottom: 5,
  },
  balanceAmount: {
    color: COLORS.textPrimary,
    fontSize: 22,
    fontWeight: '500',
  },
  currencyLabel: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '400',
    letterSpacing: 0.5,
  },
  sparkline: {
    width: 130,
    height: 45,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  sparklineCompact: {
    width: 112,
    height: 40,
  },
  sparklineBarWrap: {
    width: 12,
    height: '100%',
    justifyContent: 'flex-end',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 118, 78, 0.12)',
  },
  sparklineBar: {
    width: 10,
    borderRadius: 2,
    backgroundColor: COLORS.successChart,
    opacity: 0.95,
  },
  roomCard: {
    position: 'relative',
    backgroundColor: COLORS.card,
    borderRadius: 10,
    paddingTop: 16,
    paddingRight: 20,
    paddingBottom: 16,
    paddingLeft: 22,
    marginBottom: 10,
  },
  roomCardCompact: {
    paddingRight: 16,
    paddingLeft: 18,
  },
  roomCardPressed: {
    backgroundColor: '#32343A',
  },
  accentStrip: {
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
    marginBottom: 14,
    gap: 12,
  },
  roomTopLeft: {
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
  roomSub: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  roomSubCompact: {
    fontSize: 12,
  },
  roomSubMuted: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginTop: 4,
  },
  roomBalance: {
    alignItems: 'flex-end',
  },
  roomBalanceCompact: {
    alignItems: 'flex-start',
  },
  roomBalanceAmount: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: '500',
  },
  roomBalanceAmountCompact: {
    fontSize: 18,
  },
  currencyTiny: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  statusPill: {
    alignSelf: 'flex-start',
    marginTop: 4,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  statusPillOk: {
    backgroundColor: 'rgba(46, 184, 114, 0.18)',
  },
  statusPillOwe: {
    backgroundColor: 'rgba(231, 76, 60, 0.18)',
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '500',
  },
  statusPillTextOk: {
    color: COLORS.success,
  },
  statusPillTextOwe: {
    color: COLORS.danger,
  },
  membersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.dividerLine,
  },
  avatars: {
    flexDirection: 'row',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarOverlap: {
    marginLeft: -9,
  },
  avatarText: {
    color: COLORS.textPrimary,
    fontSize: 11,
    fontWeight: '600',
  },
  membersCount: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginLeft: 'auto',
  },
  addRoomButton: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  addRoomButtonCompact: {
    paddingHorizontal: 16,
  },
  addIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.accentBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addIconText: {
    color: COLORS.textPrimary,
    fontSize: 22,
    fontWeight: '400',
    lineHeight: 22,
  },
  addRoomText: {
    color: COLORS.textPrimary,
    fontSize: 15,
  },
  addRoomTextCompact: {
    fontSize: 14,
  },
  cardVisual: {
    width: '100%',
    aspectRatio: 1.586,
    borderRadius: 14,
    backgroundColor: '#202744',
    overflow: 'hidden',
    marginBottom: 16,
    position: 'relative',
  },
  cardVisualCompact: {
    borderRadius: 12,
    marginBottom: 14,
  },
  cardGlow: {
    position: 'absolute',
    top: -20,
    left: -30,
    width: 220,
    height: 150,
    borderRadius: 110,
    backgroundColor: '#33456A',
    opacity: 0.5,
  },
  cardVisa: {
    position: 'absolute',
    top: 16,
    right: 18,
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 2,
    fontStyle: 'italic',
  },
  cardChip: {
    position: 'absolute',
    bottom: 14,
    right: 18,
    width: 28,
    height: 22,
    borderRadius: 3,
    backgroundColor: '#A69063',
  },
  cardDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 14,
  },
  cardDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.textTertiary,
  },
  cardDotActive: {
    backgroundColor: COLORS.accentBlue,
  },
  cardBalanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 4,
  },
  cardHolder: {
    color: COLORS.textPrimary,
    fontSize: 17,
    fontWeight: '500',
    marginBottom: 2,
  },
  cardNumber: {
    color: COLORS.textTertiary,
    fontSize: 14,
  },
  cardBalanceRight: {
    alignItems: 'flex-end',
  },
  cardBalanceAmount: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '500',
  },
  cardBalanceSub: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 18,
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
    fontSize: 16,
  },
  cardActionText: {
    color: COLORS.accentBlue,
    fontSize: 14,
  },
  savingsCard: {
    position: 'relative',
    paddingLeft: 26,
  },
  savingsAccent: {
    backgroundColor: COLORS.purple,
  },
  savingsTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  bottomNav: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 8,
    paddingBottom: 22,
    backgroundColor: COLORS.page,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  navItem: {
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  navIcon: {
    color: COLORS.textSecondary,
    fontSize: 22,
    lineHeight: 22,
  },
  navIconCompact: {
    fontSize: 20,
    lineHeight: 20,
  },
  navLabel: {
    color: COLORS.textSecondary,
    fontSize: 10.5,
  },
  navLabelCompact: {
    fontSize: 10,
  },
  navItemActive: {
    color: COLORS.accentBlue,
  },
});
