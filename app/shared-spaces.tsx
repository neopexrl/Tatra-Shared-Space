import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as Linking from 'expo-linking';
import {
  addCheckItem,
  addRoomMember,
  batchAddCheckItems,
  createCheck,
  createGoal,
  createRoom,
  getChecks,
  getCheckListItems,
  getGoalsForRoom,
  getRoomMembers,
  getRooms,
  getTransactionsForRoom,
  getUsers,
  sendFromRoom,
  sendToRoom,
  toggleCheckItemClaim,
} from '../src/setup/supabase';
import {
  getNotificationsForUser,
  markAllNotificationsRead,
  markNotificationRead,
} from '../src/setup/notifications';
import {
  acceptRoomInvite,
  createRoomInvite,
  declineRoomInvite,
  getPendingInvitesForUser,
} from '../src/setup/invites';
import { processDocumentBase64 } from '../src/utils/gemini-parser';

const COLORS = {
  bgPage: '#1D1E23',
  bgBlack: '#000000',
  bgCard: '#28292E',
  bgCardAlt: '#2F3036',
  bgPressed: '#32343A',
  textPrimary: '#FFFFFF',
  textSecondary: '#A5A5A9',
  textMuted: '#6C6C70',
  accentBlue: '#3390DD',
  accentBlueAlt: '#4A9EE0',
  purple: '#5B4ACA',
  success: '#39C69B',
  successDeep: '#136650',
  warning: '#D7A63C',
  warningBg: 'rgba(215,166,60,0.14)',
  danger: '#C36259',
  dangerBg: 'rgba(195,98,89,0.16)',
  cardLine: 'rgba(255,255,255,0.08)',
};

const MEMBER_COLORS = ['#52c7bc', '#50a9ec', '#557fe8', '#c8b88f', '#54c36f', '#f26a4f', '#db02b5', '#f0da0a'];
const ROOM_COVER_FALLBACKS = [
  'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&h=900&q=80',
  'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?auto=format&fit=crop&w=1600&h=900&q=80',
  'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=1600&h=900&q=80',
  'https://images.unsplash.com/photo-1505764706515-aa95265c5abc?auto=format&fit=crop&w=1600&h=900&q=80',
];

const INVITE_TOKEN_SECRET = 'tatra_shared_spaces_invite_secret';

type FilterTab = 'all' | 'active' | 'closed';
type SortBy = 'latest' | 'balance' | 'name';
type DetailTab = 'transactions' | 'members' | 'shopping' | 'send';
type SendDirection = 'to_room' | 'from_room';

type UserRow = {
  user_iban: string;
  name: string | null;
  balance?: number | string | null;
};

type RoomRow = {
  room_iban: string;
  name: string | null;
  balance?: number | string | null;
  closed_at?: string | null;
  is_closed?: boolean | null;
  status?: string | null;
  targetAmount?: number | string | null;
  memberCount?: number;
  members: MemberModel[];
  transactions: TransactionRow[];
  checks: CheckRow[];
};

type RoomMemberRow = {
  room_iban: string;
  user_iban: string;
};

type GoalRow = {
  id?: number;
  room_iban: string;
  amount: number | string;
  name?: string | null;
};

type TransactionRow = {
  id?: number | string;
  from_iban: string;
  to_iban: string;
  amount: number | string;
  created_at?: string | null;
};

type CheckListItemRow = {
  id: number;
  check_id: number;
  name: string;
  amount: number | string;
  user_iban: string | null;
};

type CheckRow = {
  id: number;
  room_iban: string;
  amount: number | string;
  location: string;
  created_at?: string | null;
  items: CheckListItemRow[];
};

type NotificationRow = {
  id: number;
  type: string;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
};

type InviteRow = {
  id: number;
  room_iban: string;
  room_name?: string;
  inviter_name?: string;
  invited_by_user_iban: string;
  status: string;
  created_at: string;
};

type MemberModel = RoomMemberRow & {
  name: string;
  avatar: string;
  color: string;
  userBalance: number;
};

type RoomModel = RoomRow & {
  balance: number;
  targetAmount: number;
  memberCount: number;
  isClosed: boolean;
  isActive: boolean;
  hasPending: boolean;
  progress: number;
  transactionCount: number;
  latestTransaction: TransactionRow | null;
  latestActivityTs: number;
  activityLabel: string;
  activityHint: string;
};

type ActivityRow = {
  id: string;
  roomIban: string;
  date?: string | null;
  roomName: string;
  description: string;
  amount: number;
  isPositive: boolean;
};

type FullData = {
  users: UserRow[];
  rooms: RoomRow[];
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function formatAmount(value: number | string | null | undefined) {
  return Number(value || 0).toLocaleString('sk-SK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatShortDate(value?: string | null) {
  if (!value) return 'Bez dátumu';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Bez dátumu';
  return date.toLocaleDateString('sk-SK');
}

function formatDateTime(value?: string | null) {
  if (!value) return 'Bez dátumu';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Bez dátumu';
  return date.toLocaleString('sk-SK', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getInitial(name?: string | null) {
  return name?.trim()?.charAt(0)?.toUpperCase() || '?';
}

function hashString(value: string) {
  return [...value].reduce((acc, char) => ((acc << 5) - acc + char.charCodeAt(0)) | 0, 0);
}

function getRoomCover(roomIban: string) {
  const index = Math.abs(hashString(roomIban)) % ROOM_COVER_FALLBACKS.length;
  return ROOM_COVER_FALLBACKS[index];
}

function createInviteToken(roomIban: string) {
  return `${roomIban}:${hashString(`${roomIban}${INVITE_TOKEN_SECRET}`)}`;
}

function parseInviteToken(token?: string | string[] | null) {
  const raw = Array.isArray(token) ? token[0] : token;
  if (!raw) return null;
  try {
    const [roomIban, signature] = raw.split(':');
    if (!roomIban || !signature) return null;
    return signature === String(hashString(`${roomIban}${INVITE_TOKEN_SECRET}`)) ? roomIban : null;
  } catch {
    return null;
  }
}

async function loadFullData(): Promise<FullData> {
  const users = ((await getUsers()) || []) as UserRow[];
  const rooms = ((await getRooms()) || []) as RoomRow[];

  const enrichedRooms = await Promise.all(
    rooms.map(async (room) => {
      const [members, transactions, goals, checks] = await Promise.all([
        getRoomMembers(room.room_iban) as Promise<RoomMemberRow[]>,
        getTransactionsForRoom(room.room_iban) as Promise<TransactionRow[]>,
        getGoalsForRoom(room.room_iban) as Promise<GoalRow[]>,
        getChecks(room.room_iban) as Promise<Omit<CheckRow, 'items'>[]>,
      ]);

      const enrichedMembers: MemberModel[] = members.map((member, index) => {
        const user = users.find((entry) => entry.user_iban === member.user_iban);
        return {
          ...member,
          name: user?.name || member.user_iban,
          avatar: getInitial(user?.name || member.user_iban),
          color: MEMBER_COLORS[index % MEMBER_COLORS.length],
          userBalance: Number(user?.balance || 0),
        };
      });

      const enrichedChecks: CheckRow[] = await Promise.all(
        (checks || []).map(async (check) => {
          const items = ((await getCheckListItems(check.id)) || []) as CheckListItemRow[];
          return {
            ...check,
            items,
          };
        }),
      );

      const primaryGoal = (goals || [])[0];

      return {
        ...room,
        balance: Number(room.balance || 0),
        members: enrichedMembers,
        transactions: transactions || [],
        memberCount: enrichedMembers.length,
        targetAmount: Number(primaryGoal?.amount || 0),
        checks: enrichedChecks,
      };
    }),
  );

  return {
    users,
    rooms: enrichedRooms,
  };
}

function FakeStatusBar({ compact }: { compact: boolean }) {
  return (
    <View style={styles.statusBar}>
      <Text style={[styles.statusBarText, compact && styles.statusBarTextCompact]}>20:44</Text>
      <View style={styles.statusBarRight}>
        <Text style={[styles.statusBarText, compact && styles.statusBarTextCompact]}>4G+</Text>
        <Text style={[styles.statusBarText, compact && styles.statusBarTextCompact]}>46%</Text>
      </View>
    </View>
  );
}

function Badge({
  text,
  tone = 'neutral',
}: {
  text: string;
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'blue';
}) {
  const toneStyle =
    tone === 'success'
      ? styles.badgeSuccess
      : tone === 'warning'
        ? styles.badgeWarning
        : tone === 'danger'
          ? styles.badgeDanger
          : tone === 'blue'
            ? styles.badgeBlue
            : styles.badgeNeutral;

  return (
    <View style={[styles.badge, toneStyle]}>
      <Text style={styles.badgeText}>{text}</Text>
    </View>
  );
}

function Avatar({
  label,
  color,
  overlap,
}: {
  label: string;
  color: string;
  overlap?: boolean;
}) {
  return (
    <View style={[styles.avatar, { backgroundColor: color }, overlap && styles.avatarOverlap]}>
      <Text style={styles.avatarText}>{label}</Text>
    </View>
  );
}

function HeaderButton({
  label,
  count,
  onPress,
}: {
  label: string;
  count?: number;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}>
      <Text style={styles.headerButtonText}>{label}</Text>
      {typeof count === 'number' && count > 0 ? (
        <View style={styles.headerCount}>
          <Text style={styles.headerCountText}>{count}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function ScreenHeader({
  title,
  subtitle,
  onBack,
  unreadCount,
  inviteCount,
  onNotifications,
  onInvites,
}: {
  title: string;
  subtitle?: string;
  onBack: () => void;
  unreadCount: number;
  inviteCount: number;
  onNotifications: () => void;
  onInvites: () => void;
}) {
  return (
    <View style={styles.screenHeader}>
      <View style={styles.screenHeaderTop}>
        <Pressable onPress={onBack} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
          <Text style={styles.backButtonText}>←</Text>
        </Pressable>
        <View style={styles.headerActions}>
          <HeaderButton label="Pozvánky" count={inviteCount} onPress={onInvites} />
          <HeaderButton label="🔔" count={unreadCount} onPress={onNotifications} />
        </View>
      </View>
      <Text style={styles.screenTitle}>{title}</Text>
      {subtitle ? <Text style={styles.screenSubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

function StatCard({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      {note ? <Text style={styles.statNote}>{note}</Text> : null}
    </View>
  );
}

function UserSwitcher({
  users,
  currentUserIban,
  onChange,
}: {
  users: UserRow[];
  currentUserIban: string | null;
  onChange: (iban: string) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.userChipRow}>
      {users.map((user) => {
        const active = user.user_iban === currentUserIban;
        return (
          <Pressable
            key={user.user_iban}
            onPress={() => onChange(user.user_iban)}
            style={({ pressed }) => [
              styles.userChip,
              active && styles.userChipActive,
              pressed && styles.pressed,
            ]}
          >
            <View style={[styles.userChipAvatar, active && styles.userChipAvatarActive]}>
              <Text style={styles.userChipAvatarText}>{getInitial(user.name || user.user_iban)}</Text>
            </View>
            <Text numberOfLines={1} style={[styles.userChipText, active && styles.userChipTextActive]}>
              {user.name || user.user_iban}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function FilterTabs({
  value,
  onChange,
}: {
  value: FilterTab;
  onChange: (next: FilterTab) => void;
}) {
  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'Všetky' },
    { key: 'active', label: 'Aktívne' },
    { key: 'closed', label: 'Uzavreté' },
  ];

  return (
    <View style={styles.segmentRow}>
      {tabs.map((tab) => (
        <Pressable
          key={tab.key}
          onPress={() => onChange(tab.key)}
          style={({ pressed }) => [
            styles.segmentButton,
            value === tab.key && styles.segmentButtonActive,
            pressed && styles.pressed,
          ]}
        >
          <Text style={[styles.segmentButtonText, value === tab.key && styles.segmentButtonTextActive]}>
            {tab.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function SortChips({
  value,
  onChange,
}: {
  value: SortBy;
  onChange: (next: SortBy) => void;
}) {
  const sorts: { key: SortBy; label: string }[] = [
    { key: 'latest', label: 'Aktivita' },
    { key: 'balance', label: 'Zostatok' },
    { key: 'name', label: 'Názov' },
  ];

  return (
    <View style={styles.sortRow}>
      <Text style={styles.sortLabel}>Zoradiť:</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sortChipRow}>
        {sorts.map((sort) => (
          <Pressable
            key={sort.key}
            onPress={() => onChange(sort.key)}
            style={({ pressed }) => [
              styles.sortChip,
              value === sort.key && styles.sortChipActive,
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.sortChipText, value === sort.key && styles.sortChipTextActive]}>
              {sort.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

function RoomListCard({
  room,
  onOpen,
}: {
  room: RoomModel;
  onOpen: () => void;
}) {
  return (
    <Pressable onPress={onOpen} style={({ pressed }) => [styles.roomCard, pressed && styles.pressed]}>
      <View style={[styles.roomAccent, { backgroundColor: room.hasPending ? COLORS.warning : COLORS.accentBlue }]} />
      <View style={styles.roomCardTop}>
        <View style={styles.roomCardTitleWrap}>
          <Text style={styles.roomCardTitle}>{room.name || room.room_iban}</Text>
          <Text style={styles.roomCardSubtitle}>{room.room_iban}</Text>
        </View>
        <View style={styles.roomCardBalanceWrap}>
          <Text style={styles.roomCardBalance}>{formatAmount(room.balance)} EUR</Text>
        </View>
      </View>

      <View style={styles.roomCardMeta}>
        <View style={styles.avatarRow}>
          {room.members.slice(0, 4).map((member, index) => (
            <Avatar
              key={member.user_iban}
              label={member.avatar}
              color={member.color}
              overlap={index > 0}
            />
          ))}
          {room.members.length > 4 ? (
            <View style={[styles.avatar, styles.avatarMore, styles.avatarOverlap]}>
              <Text style={styles.avatarText}>+{room.members.length - 4}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.roomBadgeRow}>
          <Badge text={room.isClosed ? 'Uzavretý' : 'Aktívny'} tone={room.isClosed ? 'neutral' : 'blue'} />
          {room.hasPending ? <Badge text="Čaká vyrovnanie" tone="warning" /> : null}
        </View>
      </View>

      <View style={styles.roomCardFooter}>
        <Text style={styles.roomCardHint}>{room.activityLabel}</Text>
        <Text style={styles.roomCardHint}>{room.activityHint || 'Bez detailu'}</Text>
      </View>
    </Pressable>
  );
}

function ActivityFeedCard({ item }: { item: ActivityRow }) {
  return (
    <View style={styles.feedCard}>
      <View style={styles.feedRow}>
        <View style={styles.feedMain}>
          <Text style={styles.feedTitle}>{item.roomName}</Text>
          <Text style={styles.feedSubtitle}>{item.description}</Text>
        </View>
        <Text style={[styles.feedAmount, item.isPositive ? styles.positiveAmount : styles.negativeAmount]}>
          {item.isPositive ? '+' : '-'}
          {formatAmount(item.amount)} EUR
        </Text>
      </View>
      <Text style={styles.feedDate}>{formatDateTime(item.date)}</Text>
    </View>
  );
}

function SectionTitle({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.sectionTitleRow}>
      <Text style={styles.sectionTitleText}>{title}</Text>
      {actionLabel ? (
        <Pressable onPress={onAction} style={({ pressed }) => [styles.inlineAction, pressed && styles.pressed]}>
          <Text style={styles.inlineActionText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function TransactionCard({
  tx,
  room,
  usersByIban,
}: {
  tx: TransactionRow;
  room: RoomModel;
  usersByIban: Map<string, UserRow>;
}) {
  const isIncoming = tx.to_iban === room.room_iban;
  const counterpartyIban = isIncoming ? tx.from_iban : tx.to_iban;
  const counterparty = usersByIban.get(counterpartyIban);
  const counterpartyName = counterparty?.name || counterpartyIban || 'Neznámy používateľ';

  return (
    <View style={styles.detailCard}>
      <View style={styles.detailCardTop}>
        <View>
          <Text style={styles.detailCardTitle}>{isIncoming ? 'Príjem' : 'Výdaj'}</Text>
          <Text style={styles.detailCardSubtitle}>
            {isIncoming ? `${counterpartyName} → priestor` : `Priestor → ${counterpartyName}`}
          </Text>
        </View>
        <Text style={[styles.detailCardAmount, isIncoming ? styles.positiveAmount : styles.negativeAmount]}>
          {isIncoming ? '+' : '-'}
          {formatAmount(tx.amount)} EUR
        </Text>
      </View>
      <Text style={styles.detailCardMeta}>{formatDateTime(tx.created_at)}</Text>
    </View>
  );
}

function MemberRow({ member }: { member: MemberModel }) {
  return (
    <View style={styles.detailCard}>
      <View style={styles.memberRow}>
        <View style={styles.memberRowLeft}>
          <Avatar label={member.avatar} color={member.color} />
          <View>
            <Text style={styles.detailCardTitle}>{member.name}</Text>
            <Text style={styles.detailCardSubtitle}>{member.user_iban}</Text>
          </View>
        </View>
        <Badge text="Člen" tone="blue" />
      </View>
    </View>
  );
}

function ShoppingCard({
  check,
  onOpen,
}: {
  check: CheckRow;
  onOpen: () => void;
}) {
  const unassigned = (check.items || []).filter((item) => !item.user_iban).length;
  return (
    <View style={styles.shoppingCard}>
      <View style={styles.shoppingCardTop}>
        <View style={styles.shoppingCardCopy}>
          <Text style={styles.detailCardTitle}>{check.location}</Text>
          <Text style={styles.detailCardSubtitle}>
            {formatShortDate(check.created_at)} · {(check.items || []).length} položiek
          </Text>
        </View>
        <Text style={styles.shoppingTotal}>{formatAmount(check.amount)} EUR</Text>
      </View>
      <View style={styles.shoppingCardBottom}>
        <Badge text={unassigned > 0 ? `${unassigned} nepriradené` : 'Rozdelené'} tone={unassigned > 0 ? 'warning' : 'success'} />
        <Pressable onPress={onOpen} style={({ pressed }) => [styles.detailButton, pressed && styles.pressed]}>
          <Text style={styles.detailButtonText}>Detail</Text>
        </Pressable>
      </View>
    </View>
  );
}

function DirectionToggle({
  value,
  onChange,
}: {
  value: SendDirection;
  onChange: (next: SendDirection) => void;
}) {
  return (
    <View style={styles.segmentRow}>
      <Pressable
        onPress={() => onChange('to_room')}
        style={({ pressed }) => [
          styles.segmentButton,
          value === 'to_room' && styles.segmentButtonActive,
          pressed && styles.pressed,
        ]}
      >
        <Text style={[styles.segmentButtonText, value === 'to_room' && styles.segmentButtonTextActive]}>
          Vklad
        </Text>
      </Pressable>
      <Pressable
        onPress={() => onChange('from_room')}
        style={({ pressed }) => [
          styles.segmentButton,
          value === 'from_room' && styles.segmentButtonActive,
          pressed && styles.pressed,
        ]}
      >
        <Text style={[styles.segmentButtonText, value === 'from_room' && styles.segmentButtonTextActive]}>
          Výber
        </Text>
      </Pressable>
    </View>
  );
}

function ModalFrame({
  visible,
  title,
  subtitle,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.modalCard} onPress={(event) => event.stopPropagation()}>
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleWrap}>
              <Text style={styles.modalTitle}>{title}</Text>
              {subtitle ? <Text style={styles.modalSubtitle}>{subtitle}</Text> : null}
            </View>
            <Pressable onPress={onClose} style={({ pressed }) => [styles.modalClose, pressed && styles.pressed]}>
              <Text style={styles.modalCloseText}>×</Text>
            </Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalBody}>
            {children}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function CreateSpaceModal({
  visible,
  currentUserIban,
  users,
  onClose,
  onCreated,
}: {
  visible: boolean;
  currentUserIban: string;
  users: UserRow[];
  onClose: () => void;
  onCreated: () => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [type, setType] = useState<'trip' | 'flat' | 'gift' | 'other'>('trip');
  const [targetAmount, setTargetAmount] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const availableUsers = users.filter((user) => user.user_iban !== currentUserIban);

  const toggleUser = (userIban: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userIban) ? prev.filter((item) => item !== userIban) : [...prev, userIban],
    );
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      const roomIban = `SK${Math.floor(10000000000000000000 + Math.random() * 90000000000000000000)}`;
      await (createRoom as (...args: unknown[]) => Promise<unknown>)(roomIban, name.trim(), 0, currentUserIban, type);
      await addRoomMember(roomIban, currentUserIban);

      for (const userIban of selectedUserIds) {
        try {
          await createRoomInvite(roomIban, userIban, currentUserIban);
        } catch (error) {
          console.warn('Invite failed', error);
        }
      }

      if (targetAmount && Number(targetAmount) > 0) {
        await createGoal(roomIban, name.trim(), Number(targetAmount));
      }

      setName('');
      setTargetAmount('');
      setSelectedUserIds([]);
      setType('trip');
      await onCreated();
      onClose();
    } catch (error) {
      console.error(error);
      Alert.alert('Chyba', error instanceof Error ? error.message : 'Priestor sa nepodarilo vytvoriť.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalFrame visible={visible} title="Nový priestor" subtitle="Vytvor priestor a pošli pozvánky členom." onClose={onClose}>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="Názov priestoru"
        placeholderTextColor={COLORS.textMuted}
      />

      <Text style={styles.formLabel}>Typ priestoru</Text>
      <View style={styles.typeGrid}>
        {[
          { key: 'trip', label: 'Výlet', icon: 'T' },
          { key: 'flat', label: 'Bývanie', icon: 'B' },
          { key: 'gift', label: 'Darček', icon: 'D' },
          { key: 'other', label: 'Iné', icon: 'S' },
        ].map((item) => (
          <Pressable
            key={item.key}
            onPress={() => setType(item.key as 'trip' | 'flat' | 'gift' | 'other')}
            style={({ pressed }) => [
              styles.typeButton,
              type === item.key && styles.typeButtonActive,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.typeButtonIcon}>{item.icon}</Text>
            <Text style={[styles.typeButtonLabel, type === item.key && styles.typeButtonLabelActive]}>
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <TextInput
        style={styles.input}
        value={targetAmount}
        onChangeText={setTargetAmount}
        placeholder="Cieľová suma (EUR)"
        keyboardType="numeric"
        placeholderTextColor={COLORS.textMuted}
      />

      <Text style={styles.formLabel}>Pozvať členov</Text>
      <View style={styles.listCard}>
        {availableUsers.map((user) => {
          const active = selectedUserIds.includes(user.user_iban);
          return (
            <Pressable
              key={user.user_iban}
              onPress={() => toggleUser(user.user_iban)}
              style={({ pressed }) => [
                styles.selectRow,
                active && styles.selectRowActive,
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.selectRowTitle, active && styles.selectRowTitleActive]}>
                {user.name || user.user_iban}
              </Text>
              <Text style={styles.selectRowMeta}>{active ? 'Vybrané' : 'Pridať pozvánku'}</Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        onPress={handleCreate}
        disabled={loading || !name.trim()}
        style={({ pressed }) => [
          styles.primaryButton,
          (loading || !name.trim()) && styles.buttonDisabled,
          pressed && styles.pressed,
        ]}
      >
        {loading ? <ActivityIndicator color={COLORS.textPrimary} /> : <Text style={styles.primaryButtonText}>Vytvoriť priestor</Text>}
      </Pressable>
    </ModalFrame>
  );
}

function AddMemberModal({
  visible,
  room,
  currentUserIban,
  users,
  onClose,
  onAdded,
}: {
  visible: boolean;
  room: RoomModel;
  currentUserIban: string;
  users: UserRow[];
  onClose: () => void;
  onAdded: () => Promise<void>;
}) {
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const availableUsers = users.filter(
    (user) => !room.members.some((member) => member.user_iban === user.user_iban),
  );

  const toggleUser = (userIban: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userIban) ? prev.filter((item) => item !== userIban) : [...prev, userIban],
    );
  };

  const handleInvite = async () => {
    if (selectedUserIds.length === 0) return;
    setLoading(true);
    try {
      for (const userIban of selectedUserIds) {
        await createRoomInvite(room.room_iban, userIban, currentUserIban);
      }
      setSelectedUserIds([]);
      await onAdded();
      onClose();
    } catch (error) {
      console.error(error);
      Alert.alert('Chyba', error instanceof Error ? error.message : 'Pozvánky sa nepodarilo odoslať.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalFrame visible={visible} title="Pozvať členov" subtitle={room.name || room.room_iban} onClose={onClose}>
      <View style={styles.listCard}>
        {availableUsers.length === 0 ? (
          <Text style={styles.emptyText}>Všetci používatelia sú už v priestore.</Text>
        ) : (
          availableUsers.map((user) => {
            const active = selectedUserIds.includes(user.user_iban);
            return (
              <Pressable
                key={user.user_iban}
                onPress={() => toggleUser(user.user_iban)}
                style={({ pressed }) => [
                  styles.selectRow,
                  active && styles.selectRowActive,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={[styles.selectRowTitle, active && styles.selectRowTitleActive]}>
                  {user.name || user.user_iban}
                </Text>
                <Text style={styles.selectRowMeta}>{active ? 'Vybrané' : 'Pozvať'}</Text>
              </Pressable>
            );
          })
        )}
      </View>

      <Pressable
        onPress={handleInvite}
        disabled={loading || selectedUserIds.length === 0}
        style={({ pressed }) => [
          styles.primaryButton,
          (loading || selectedUserIds.length === 0) && styles.buttonDisabled,
          pressed && styles.pressed,
        ]}
      >
        {loading ? <ActivityIndicator color={COLORS.textPrimary} /> : <Text style={styles.primaryButtonText}>Poslať pozvánky</Text>}
      </Pressable>
    </ModalFrame>
  );
}

function InviteShareModal({
  visible,
  room,
  onClose,
}: {
  visible: boolean;
  room: RoomModel;
  onClose: () => void;
}) {
  const token = createInviteToken(room.room_iban);
  const url = Linking.createURL('/shared-spaces', {
    queryParams: { invite: token },
  });

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Pridaj sa do priestoru ${room.name || room.room_iban}: ${url}`,
      });
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <ModalFrame visible={visible} title="Zdieľať pozvánku" subtitle={room.name || room.room_iban} onClose={onClose}>
      <View style={styles.infoCard}>
        <Text style={styles.infoText}>
          Odkaz otvorí aplikáciu priamo na prijatie pozvánky. Použi ho na jednoduché zdieľanie priestoru.
        </Text>
        <Text selectable style={styles.linkPreview}>
          {url}
        </Text>
      </View>
      <Pressable onPress={handleShare} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
        <Text style={styles.primaryButtonText}>Zdieľať pozvánku</Text>
      </Pressable>
    </ModalFrame>
  );
}

function NotificationsModal({
  visible,
  userIban,
  onClose,
}: {
  visible: boolean;
  userIban: string;
  onClose: () => void;
}) {
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const rows = ((await getNotificationsForUser(userIban)) || []) as NotificationRow[];
      setNotifications(rows);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [userIban]);

  useEffect(() => {
    if (!visible) return;
    load();
  }, [visible, load]);

  const handleMarkRead = async (id: number) => {
    try {
      await markNotificationRead(id);
      await load();
    } catch (error) {
      console.error(error);
    }
  };

  const handleMarkAll = async () => {
    try {
      await markAllNotificationsRead(userIban);
      await load();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <ModalFrame visible={visible} title="Notifikácie" subtitle={`${notifications.filter((item) => !item.is_read).length} neprečítaných`} onClose={onClose}>
      {loading ? (
        <ActivityIndicator color={COLORS.accentBlue} />
      ) : (
        <>
          {notifications.length > 0 ? (
            <Pressable onPress={handleMarkAll} style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
              <Text style={styles.secondaryButtonText}>Označiť všetko ako prečítané</Text>
            </Pressable>
          ) : null}
          <View style={styles.listCard}>
            {notifications.length === 0 ? (
              <Text style={styles.emptyText}>Žiadne notifikácie.</Text>
            ) : (
              notifications.map((notification) => (
                <Pressable
                  key={notification.id}
                  onPress={() => {
                    if (!notification.is_read) {
                      void handleMarkRead(notification.id);
                    }
                  }}
                  style={({ pressed }) => [
                    styles.notificationRow,
                    !notification.is_read && styles.notificationUnread,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.notificationTitle}>{notification.title}</Text>
                  <Text style={styles.notificationBody}>{notification.body}</Text>
                  <Text style={styles.notificationDate}>{formatDateTime(notification.created_at)}</Text>
                </Pressable>
              ))
            )}
          </View>
        </>
      )}
    </ModalFrame>
  );
}

function InvitesModal({
  visible,
  userIban,
  onClose,
  onRefreshAll,
}: {
  visible: boolean;
  userIban: string;
  onClose: () => void;
  onRefreshAll: () => Promise<void>;
}) {
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const rows = ((await getPendingInvitesForUser(userIban)) || []) as InviteRow[];
      setInvites(rows);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [userIban]);

  useEffect(() => {
    if (!visible) return;
    load();
  }, [visible, load]);

  const handleAccept = async (inviteId: number) => {
    setProcessingId(inviteId);
    try {
      await acceptRoomInvite(inviteId);
      await onRefreshAll();
      await load();
    } catch (error) {
      console.error(error);
      Alert.alert('Chyba', error instanceof Error ? error.message : 'Pozvánku sa nepodarilo prijať.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDecline = async (inviteId: number) => {
    setProcessingId(inviteId);
    try {
      await declineRoomInvite(inviteId);
      await onRefreshAll();
      await load();
    } catch (error) {
      console.error(error);
      Alert.alert('Chyba', error instanceof Error ? error.message : 'Pozvánku sa nepodarilo odmietnuť.');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <ModalFrame visible={visible} title="Pozvánky" subtitle={`${invites.length} čakajúcich`} onClose={onClose}>
      {loading ? (
        <ActivityIndicator color={COLORS.accentBlue} />
      ) : (
        <View style={styles.listCard}>
          {invites.length === 0 ? (
            <Text style={styles.emptyText}>Žiadne čakajúce pozvánky.</Text>
          ) : (
            invites.map((invite) => (
              <View key={invite.id} style={styles.inviteRow}>
                <View style={styles.inviteCopy}>
                  <Text style={styles.notificationTitle}>{invite.room_name || invite.room_iban}</Text>
                  <Text style={styles.notificationBody}>Pozval: {invite.inviter_name || invite.invited_by_user_iban}</Text>
                </View>
                <View style={styles.inviteActions}>
                  <Pressable
                    onPress={() => void handleAccept(invite.id)}
                    style={({ pressed }) => [styles.smallPrimaryButton, pressed && styles.pressed]}
                    disabled={processingId === invite.id}
                  >
                    <Text style={styles.smallPrimaryButtonText}>{processingId === invite.id ? '...' : 'Prijať'}</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => void handleDecline(invite.id)}
                    style={({ pressed }) => [styles.smallSecondaryButton, pressed && styles.pressed]}
                    disabled={processingId === invite.id}
                  >
                    <Text style={styles.smallSecondaryButtonText}>Odmietnuť</Text>
                  </Pressable>
                </View>
              </View>
            ))
          )}
        </View>
      )}
    </ModalFrame>
  );
}

function InviteAcceptanceView({
  room,
  users,
  onAccept,
  onCancel,
}: {
  room: RoomModel;
  users: UserRow[];
  onAccept: (iban: string) => Promise<void>;
  onCancel: () => void;
}) {
  const availableUsers = users.filter((user) => !room.members.some((member) => member.user_iban === user.user_iban));
  const [selectedUser, setSelectedUser] = useState<string>(availableUsers[0]?.user_iban || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedUser && availableUsers[0]) {
      setSelectedUser(availableUsers[0].user_iban);
    }
  }, [availableUsers, selectedUser]);

  const handleAccept = async () => {
    if (!selectedUser) return;
    setLoading(true);
    try {
      await addRoomMember(room.room_iban, selectedUser);
      await onAccept(selectedUser);
    } catch (error) {
      console.error(error);
      Alert.alert('Chyba', error instanceof Error ? error.message : 'Pozvánku sa nepodarilo prijať.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.centerStage}>
      <ScreenHeader
        title="Pozvánka"
        subtitle="Vyber účet, pod ktorým sa chceš pripojiť."
        onBack={onCancel}
        unreadCount={0}
        inviteCount={0}
        onNotifications={noop}
        onInvites={noop}
      />
      <View style={styles.heroCard}>
        <Text style={styles.heroTitle}>{room.name || room.room_iban}</Text>
        <Text style={styles.heroSubtitle}>{room.room_iban}</Text>
        <Text style={styles.heroNote}>Priestor otvoríš pod jedným z existujúcich používateľov.</Text>
      </View>
      <View style={styles.listCard}>
        {availableUsers.length === 0 ? (
          <Text style={styles.emptyText}>Všetci používatelia sú už v tomto priestore.</Text>
        ) : (
          availableUsers.map((user) => {
            const active = selectedUser === user.user_iban;
            return (
              <Pressable
                key={user.user_iban}
                onPress={() => setSelectedUser(user.user_iban)}
                style={({ pressed }) => [
                  styles.selectRow,
                  active && styles.selectRowActive,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={[styles.selectRowTitle, active && styles.selectRowTitleActive]}>
                  {user.name || user.user_iban}
                </Text>
                <Text style={styles.selectRowMeta}>{active ? 'Vybraný účet' : 'Použiť'}</Text>
              </Pressable>
            );
          })
        )}
      </View>
      <Pressable
        onPress={handleAccept}
        disabled={loading || !selectedUser}
        style={({ pressed }) => [
          styles.primaryButton,
          (loading || !selectedUser) && styles.buttonDisabled,
          pressed && styles.pressed,
        ]}
      >
        {loading ? <ActivityIndicator color={COLORS.textPrimary} /> : <Text style={styles.primaryButtonText}>Prijať pozvánku</Text>}
      </Pressable>
    </View>
  );
}

function ShoppingCheckModal({
  visible,
  check,
  room,
  draftItem,
  onClose,
  onUpdateDraftItem,
  onAddDraftItem,
  onAssignItem,
}: {
  visible: boolean;
  check: CheckRow | null;
  room: RoomModel;
  draftItem: { name: string; amount: string };
  onClose: () => void;
  onUpdateDraftItem: (checkId: number, field: 'name' | 'amount', value: string) => void;
  onAddDraftItem: (checkId: number) => Promise<void>;
  onAssignItem: (item: CheckListItemRow, targetUserIban: string | null) => Promise<void>;
}) {
  if (!check) return null;

  return (
    <ModalFrame
      visible={visible}
      title={check.location}
      subtitle={`${formatShortDate(check.created_at)} · ${(check.items || []).length} položiek · ${formatAmount(check.amount)} EUR`}
      onClose={onClose}
    >
      <View style={styles.shoppingItemList}>
        {(check.items || []).length === 0 ? (
          <Text style={styles.emptyText}>Žiadne položky. Doplň ich ručne.</Text>
        ) : (
          check.items.map((item) => {
            const claimedUser = item.user_iban
              ? room.members.find((member) => member.user_iban === item.user_iban) || null
              : null;
            return (
              <View key={item.id} style={styles.shoppingItemCard}>
                <View style={styles.shoppingItemTop}>
                  <View style={styles.shoppingItemCopy}>
                    <Text style={styles.detailCardTitle}>{item.name}</Text>
                    <Badge
                      text={claimedUser ? `Priradené: ${claimedUser.name}` : 'Nepriradené'}
                      tone={claimedUser ? 'success' : 'warning'}
                    />
                  </View>
                  <Text style={styles.shoppingItemAmount}>{formatAmount(item.amount)} EUR</Text>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.assignmentRow}>
                  <Pressable
                    onPress={() => void onAssignItem(item, null)}
                    style={({ pressed }) => [
                      styles.assignmentChip,
                      !item.user_iban && styles.assignmentChipActive,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={[styles.assignmentChipText, !item.user_iban && styles.assignmentChipTextActive]}>
                      Nepriradené
                    </Text>
                  </Pressable>
                  {room.members.map((member) => {
                    const active = item.user_iban === member.user_iban;
                    return (
                      <Pressable
                        key={member.user_iban}
                        onPress={() => void onAssignItem(item, member.user_iban)}
                        style={({ pressed }) => [
                          styles.assignmentChip,
                          active && styles.assignmentChipActive,
                          pressed && styles.pressed,
                        ]}
                      >
                        <Avatar label={member.avatar} color={member.color} />
                        <Text style={[styles.assignmentChipText, active && styles.assignmentChipTextActive]}>
                          {(member.name || member.user_iban).split(' ')[0]}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            );
          })
        )}
      </View>

      <View style={styles.inlineFormCard}>
        <Text style={styles.formTitle}>Pridať položku</Text>
        <TextInput
          style={styles.input}
          value={draftItem.name}
          onChangeText={(value) => onUpdateDraftItem(check.id, 'name', value)}
          placeholder="Názov položky"
          placeholderTextColor={COLORS.textMuted}
        />
        <View style={styles.inlineFormRow}>
          <TextInput
            style={[styles.input, styles.inlineInput]}
            value={draftItem.amount}
            onChangeText={(value) => onUpdateDraftItem(check.id, 'amount', value)}
            placeholder="Suma"
            keyboardType="numeric"
            placeholderTextColor={COLORS.textMuted}
          />
          <Pressable
            onPress={() => void onAddDraftItem(check.id)}
            disabled={!draftItem.name || !draftItem.amount}
            style={({ pressed }) => [
              styles.smallPrimaryButton,
              (!draftItem.name || !draftItem.amount) && styles.buttonDisabled,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.smallPrimaryButtonText}>Pridať</Text>
          </Pressable>
        </View>
      </View>
    </ModalFrame>
  );
}

function DetailShoppingSection({
  room,
  users,
  showAddCheck,
  setShowAddCheck,
  checkLocation,
  setCheckLocation,
  checkAmount,
  setCheckAmount,
  onAddCheck,
  onPickReceipt,
  parsingReceipt,
  onOpenCheck,
}: {
  room: RoomModel;
  users: UserRow[];
  showAddCheck: boolean;
  setShowAddCheck: React.Dispatch<React.SetStateAction<boolean>>;
  checkLocation: string;
  setCheckLocation: React.Dispatch<React.SetStateAction<string>>;
  checkAmount: string;
  setCheckAmount: React.Dispatch<React.SetStateAction<string>>;
  onAddCheck: () => Promise<void>;
  onPickReceipt: () => Promise<void>;
  parsingReceipt: boolean;
  onOpenCheck: (checkId: number) => void;
}) {
  const totalShoppingItems = (room.checks || []).reduce((sum, check) => sum + (check.items || []).length, 0);
  const unassignedShoppingItems = (room.checks || []).reduce(
    (sum, check) => sum + (check.items || []).filter((item) => !item.user_iban).length,
    0,
  );

  return (
    <View style={styles.detailSectionStack}>
      <View style={styles.heroCard}>
        <Text style={styles.heroTitle}>Nákupy a účtenky</Text>
        <Text style={styles.heroNote}>
          Nahraj účtenku alebo pridaj nákup ručne. Potom len rozdelíš položky medzi členov priestoru.
        </Text>
        <View style={styles.heroMetaRow}>
          <Badge text={`${(room.checks || []).length} nákupy`} tone="blue" />
          <Badge text={`${totalShoppingItems} položiek`} tone="neutral" />
          <Badge text={`${unassignedShoppingItems} čaká`} tone={unassignedShoppingItems > 0 ? 'warning' : 'success'} />
        </View>
      </View>

      <View style={styles.dualActionRow}>
        <Pressable
          onPress={() => setShowAddCheck((prev) => !prev)}
          style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
        >
          <Text style={styles.secondaryButtonText}>{showAddCheck ? 'Zrušiť' : '+ Pridať nákup'}</Text>
        </Pressable>
        <Pressable
          onPress={() => void onPickReceipt()}
          style={({ pressed }) => [styles.primaryButton, styles.ocrButton, pressed && styles.pressed]}
        >
          {parsingReceipt ? (
            <ActivityIndicator color={COLORS.textPrimary} />
          ) : (
            <Text style={styles.primaryButtonText}>Skenovať účtenku</Text>
          )}
        </Pressable>
      </View>

      {showAddCheck ? (
        <View style={styles.inlineFormCard}>
          <Text style={styles.formTitle}>Manuálne pridanie nákupu</Text>
          <TextInput
            style={styles.input}
            value={checkLocation}
            onChangeText={setCheckLocation}
            placeholder="Miesto nákupu"
            placeholderTextColor={COLORS.textMuted}
          />
          <TextInput
            style={styles.input}
            value={checkAmount}
            onChangeText={setCheckAmount}
            placeholder="Suma (EUR)"
            keyboardType="numeric"
            placeholderTextColor={COLORS.textMuted}
          />
          <Pressable
            onPress={() => void onAddCheck()}
            disabled={!checkLocation || !checkAmount}
            style={({ pressed }) => [
              styles.primaryButton,
              (!checkLocation || !checkAmount) && styles.buttonDisabled,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.primaryButtonText}>Uložiť nákup</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.detailSectionStack}>
        {(room.checks || []).length === 0 ? (
          <View style={styles.listCard}>
            <Text style={styles.emptyText}>Zatiaľ tu nie sú žiadne nákupy.</Text>
          </View>
        ) : (
          room.checks.map((check) => (
            <ShoppingCard key={check.id} check={check} onOpen={() => onOpenCheck(check.id)} />
          ))
        )}
      </View>
    </View>
  );
}

function DetailScreen({
  room,
  users,
  currentUserIban,
  onBack,
  onRefresh,
}: {
  room: RoomModel;
  users: UserRow[];
  currentUserIban: string;
  onBack: () => void;
  onRefresh: () => Promise<void>;
}) {
  const [tab, setTab] = useState<DetailTab>('transactions');
  const [sendAmount, setSendAmount] = useState('');
  const [sendDirection, setSendDirection] = useState<SendDirection>('to_room');
  const [sending, setSending] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showInviteShare, setShowInviteShare] = useState(false);
  const [showAddCheck, setShowAddCheck] = useState(false);
  const [checkLocation, setCheckLocation] = useState('');
  const [checkAmount, setCheckAmount] = useState('');
  const [parsingReceipt, setParsingReceipt] = useState(false);
  const [activeCheckId, setActiveCheckId] = useState<number | null>(null);
  const [draftItems, setDraftItems] = useState<Record<number, { name: string; amount: string }>>({});
  const usersByIban = useMemo(() => new Map(users.map((user) => [user.user_iban, user])), [users]);
  const activeCheck = room.checks.find((check) => check.id === activeCheckId) || null;
  const targetAmount = Number(room.targetAmount || 0);
  const progress = targetAmount > 0 ? Math.max(0, Math.min((room.balance / targetAmount) * 100, 100)) : 0;

  const updateDraftItem = useCallback((checkId: number, field: 'name' | 'amount', value: string) => {
    setDraftItems((prev) => ({
      ...prev,
      [checkId]: {
        ...(prev[checkId] || { name: '', amount: '' }),
        [field]: value,
      },
    }));
  }, []);

  const handleAddDraftItem = useCallback(async (checkId: number) => {
    const draft = draftItems[checkId];
    if (!draft?.name || !draft?.amount) return;
    await addCheckItem(checkId, draft.name, parseFloat(draft.amount), null);
    setDraftItems((prev) => ({
      ...prev,
      [checkId]: { name: '', amount: '' },
    }));
    await onRefresh();
  }, [draftItems, onRefresh]);

  const handleAssignCheckItem = useCallback(async (item: CheckListItemRow, targetUserIban: string | null) => {
    const currentOwner = item.user_iban;
    const claimOwner = targetUserIban ?? currentOwner;
    if (!claimOwner) {
      await toggleCheckItemClaim(item.id, '', currentOwner);
    } else {
      await toggleCheckItemClaim(item.id, claimOwner, currentOwner);
    }
    await onRefresh();
  }, [onRefresh]);

  const handleSend = async () => {
    if (!sendAmount || Number(sendAmount) <= 0) return;
    setSending(true);
    try {
      if (sendDirection === 'to_room') {
        await sendToRoom(currentUserIban, room.room_iban, Number(sendAmount));
      } else {
        await sendFromRoom(room.room_iban, currentUserIban, Number(sendAmount));
      }
      setSendAmount('');
      await onRefresh();
    } catch (error) {
      console.error(error);
      Alert.alert('Chyba', error instanceof Error ? error.message : 'Platba sa nepodarila.');
    } finally {
      setSending(false);
    }
  };

  const handleAddCheck = async () => {
    if (!checkLocation || !checkAmount) return;
    try {
      await createCheck(room.room_iban, Number(checkAmount), checkLocation);
      setCheckLocation('');
      setCheckAmount('');
      setShowAddCheck(false);
      await onRefresh();
    } catch (error) {
      console.error(error);
      Alert.alert('Chyba', error instanceof Error ? error.message : 'Nákup sa nepodarilo uložiť.');
    }
  };

  const handlePickReceipt = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Povolenie chýba', 'Aby bolo možné načítať účtenku, povoľ prístup k fotkám.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 1,
        base64: true,
      });

      if (result.canceled || !result.assets?.length) return;

      const asset = result.assets[0];
      if (!asset.base64) {
        Alert.alert('Chyba', 'Obrázok sa nepodarilo načítať.');
        return;
      }

      setParsingReceipt(true);
      const parsed = await processDocumentBase64(asset.mimeType || 'image/jpeg', asset.base64);

      if (parsed.type !== 'receipt') {
        Alert.alert('Nepodporovaný dokument', `Rozpoznaný typ: ${parsed.type}`);
        return;
      }

      const createdCheck = await createCheck(
        room.room_iban,
        Number(parsed.total || 0),
        parsed.store || 'Neznámy obchod',
      );

      if (parsed.items?.length) {
        await batchAddCheckItems(createdCheck.id, parsed.items);
      }

      await onRefresh();
    } catch (error) {
      console.error(error);
      Alert.alert('Chyba OCR', error instanceof Error ? error.message : 'Účtenku sa nepodarilo spracovať.');
    } finally {
      setParsingReceipt(false);
    }
  };

  const transactions = [...room.transactions].sort((a, b) => {
    const aTs = a.created_at ? new Date(a.created_at).getTime() : 0;
    const bTs = b.created_at ? new Date(b.created_at).getTime() : 0;
    return bTs - aTs;
  });

  return (
    <>
      <View style={styles.detailHero}>
        <ImageBackground source={{ uri: getRoomCover(room.room_iban) }} style={styles.detailHeroImage} imageStyle={styles.detailHeroImageStyle}>
          <View style={styles.detailHeroOverlay} />
          <View style={styles.detailHeroInner}>
            <View style={styles.detailHeroTop}>
              <Pressable onPress={onBack} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
                <Text style={styles.backButtonText}>←</Text>
              </Pressable>
              <View style={styles.detailHeroActions}>
                <Pressable onPress={() => setShowInviteShare(true)} style={({ pressed }) => [styles.iconAction, pressed && styles.pressed]}>
                  <Text style={styles.iconActionText}>↗</Text>
                </Pressable>
                <Pressable onPress={() => setShowAddMember(true)} style={({ pressed }) => [styles.iconAction, pressed && styles.pressed]}>
                  <Text style={styles.iconActionText}>+</Text>
                </Pressable>
              </View>
            </View>

            <Badge text={room.room_iban} tone="neutral" />
            <Text style={styles.detailHeroTitle}>{room.name || room.room_iban}</Text>
            <Text style={styles.detailHeroSubtitle}>Spoločný priestor, platby a nákupy v mobile.</Text>

            <View style={styles.detailHeroStats}>
              <StatCard label="Zostatok" value={`${formatAmount(room.balance)} EUR`} note={targetAmount > 0 ? `Cieľ ${formatAmount(targetAmount)} EUR` : 'Bez cieľa'} />
              <StatCard label="Členovia" value={String(room.members.length)} note="v priestore" />
            </View>

            {targetAmount > 0 ? (
              <View style={styles.progressCard}>
                <View style={styles.progressRow}>
                  <Text style={styles.progressLabel}>Progress</Text>
                  <Text style={styles.progressLabel}>{Math.round(progress)}%</Text>
                </View>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${Math.max(progress, 6)}%` }]} />
                </View>
              </View>
            ) : null}
          </View>
        </ImageBackground>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.detailTabRow}>
        {[
          { key: 'transactions', label: 'Transakcie' },
          { key: 'members', label: 'Členovia' },
          { key: 'shopping', label: 'Nákupy' },
          { key: 'send', label: 'Poslať' },
        ].map((item) => (
          <Pressable
            key={item.key}
            onPress={() => setTab(item.key as DetailTab)}
            style={({ pressed }) => [
              styles.tabChip,
              tab === item.key && styles.tabChipActive,
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.tabChipText, tab === item.key && styles.tabChipTextActive]}>{item.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.detailSectionStack}>
        {tab === 'transactions' ? (
          transactions.length === 0 ? (
            <View style={styles.listCard}>
              <Text style={styles.emptyText}>Žiadne transakcie v tomto priestore.</Text>
            </View>
          ) : (
            transactions.map((tx, index) => (
              <TransactionCard
                key={String(tx.id ?? index)}
                tx={tx}
                room={room}
                usersByIban={usersByIban}
              />
            ))
          )
        ) : null}

        {tab === 'members' ? (
          <>
            {room.members.map((member) => (
              <MemberRow key={member.user_iban} member={member} />
            ))}
            <Pressable onPress={() => setShowAddMember(true)} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
              <Text style={styles.primaryButtonText}>Pozvať člena</Text>
            </Pressable>
          </>
        ) : null}

        {tab === 'shopping' ? (
          <DetailShoppingSection
            room={room}
            users={users}
            showAddCheck={showAddCheck}
            setShowAddCheck={setShowAddCheck}
            checkLocation={checkLocation}
            setCheckLocation={setCheckLocation}
            checkAmount={checkAmount}
            setCheckAmount={setCheckAmount}
            onAddCheck={handleAddCheck}
            onPickReceipt={handlePickReceipt}
            parsingReceipt={parsingReceipt}
            onOpenCheck={setActiveCheckId}
          />
        ) : null}

        {tab === 'send' ? (
          <View style={styles.detailSectionStack}>
            <View style={styles.inlineFormCard}>
              <Text style={styles.formTitle}>Smer platby</Text>
              <DirectionToggle value={sendDirection} onChange={setSendDirection} />
            </View>

            <View style={styles.infoCard}>
              <Text style={styles.formTitle}>Zdroj / cieľ</Text>
              <Text style={styles.infoText}>
                {sendDirection === 'to_room'
                  ? `Môj účet (${currentUserIban}) → Priestor (${room.room_iban})`
                  : `Priestor (${room.room_iban}) → Môj účet (${currentUserIban})`}
              </Text>
            </View>

            <View style={styles.inlineFormCard}>
              <Text style={styles.formTitle}>Suma</Text>
              <TextInput
                style={styles.input}
                value={sendAmount}
                onChangeText={setSendAmount}
                placeholder="0.00"
                keyboardType="numeric"
                placeholderTextColor={COLORS.textMuted}
              />
              <Pressable
                onPress={() => void handleSend()}
                disabled={sending || !sendAmount}
                style={({ pressed }) => [
                  styles.primaryButton,
                  (sending || !sendAmount) && styles.buttonDisabled,
                  pressed && styles.pressed,
                ]}
              >
                {sending ? <ActivityIndicator color={COLORS.textPrimary} /> : <Text style={styles.primaryButtonText}>Potvrdiť platbu</Text>}
              </Pressable>
            </View>
          </View>
        ) : null}
      </View>

      <AddMemberModal
        visible={showAddMember}
        room={room}
        currentUserIban={currentUserIban}
        users={users}
        onClose={() => setShowAddMember(false)}
        onAdded={onRefresh}
      />
      <InviteShareModal visible={showInviteShare} room={room} onClose={() => setShowInviteShare(false)} />
      <ShoppingCheckModal
        visible={Boolean(activeCheck)}
        check={activeCheck}
        room={room}
        draftItem={activeCheck ? draftItems[activeCheck.id] || { name: '', amount: '' } : { name: '', amount: '' }}
        onClose={() => setActiveCheckId(null)}
        onUpdateDraftItem={updateDraftItem}
        onAddDraftItem={handleAddDraftItem}
        onAssignItem={handleAssignCheckItem}
      />
    </>
  );
}

function SharedSpacesListScreen({
  data,
  currentUserIban,
  onCurrentUserChange,
  onBackHome,
  onCreate,
  unreadCount,
  inviteCount,
  onNotifications,
  onInvites,
  onRefresh,
  onOpenRoom,
}: {
  data: FullData;
  currentUserIban: string | null;
  onCurrentUserChange: (iban: string) => void;
  onBackHome: () => void;
  onCreate: () => void;
  unreadCount: number;
  inviteCount: number;
  onNotifications: () => void;
  onInvites: () => void;
  onRefresh: () => Promise<void>;
  onOpenRoom: (roomIban: string) => void;
}) {
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [sortBy, setSortBy] = useState<SortBy>('latest');

  const usersByIban = useMemo(
    () => new Map((data.users || []).map((user) => [user.user_iban, user])),
    [data.users],
  );

  const roomModels = useMemo<RoomModel[]>(() => {
    return (data.rooms || []).map((room) => {
      const balance = Number(room.balance || 0);
      const targetAmount = Number(room.targetAmount || 0);
      const sortedTransactions = [...(room.transactions || [])].sort((a, b) => {
        const aTs = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bTs = b.created_at ? new Date(b.created_at).getTime() : 0;
        return bTs - aTs;
      });
      const latestTransaction = sortedTransactions[0] || null;
      const isClosed =
        Boolean(room.closed_at || room.is_closed || room.status === 'closed') ||
        (!sortedTransactions.length && balance <= 0 && room.members.length <= 1);
      const hasPending = !isClosed && targetAmount > 0 && balance > 0 && balance < targetAmount;
      const transactionCount = sortedTransactions.length;

      return {
        ...room,
        balance,
        targetAmount,
        memberCount: room.members.length,
        isClosed,
        isActive: !isClosed,
        hasPending,
        progress: targetAmount > 0 ? Math.max(0, Math.min((balance / targetAmount) * 100, 100)) : 0,
        transactionCount,
        latestTransaction,
        latestActivityTs: latestTransaction?.created_at ? new Date(latestTransaction.created_at).getTime() : 0,
        activityLabel:
          transactionCount === 0
            ? 'Bez transakcií'
            : `${transactionCount} ${transactionCount === 1 ? 'transakcia' : transactionCount < 5 ? 'transakcie' : 'transakcií'}`,
        activityHint: isClosed
          ? latestTransaction?.created_at
            ? `Uzavreté ${formatShortDate(latestTransaction.created_at)}`
            : 'Uzavretý priestor'
          : hasPending
            ? '1 čaká úhrada'
            : '',
      };
    });
  }, [data.rooms]);

  const myRooms = currentUserIban
    ? roomModels.filter((room) => room.members.some((member) => member.user_iban === currentUserIban))
    : roomModels;

  const filteredRooms = [...myRooms]
    .filter((room) => {
      if (filterTab === 'active') return room.isActive;
      if (filterTab === 'closed') return room.isClosed;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'balance') return b.balance - a.balance;
      if (sortBy === 'name') return (a.name || a.room_iban).localeCompare(b.name || b.room_iban, 'sk');
      return b.latestActivityTs - a.latestActivityTs;
    });

  const activityRows = useMemo<ActivityRow[]>(() => {
    return myRooms
      .flatMap((room) =>
        room.transactions.map((tx, index) => {
          const isIncoming = tx.to_iban === room.room_iban;
          const counterpartyIban = isIncoming ? tx.from_iban : tx.to_iban;
          const counterparty = usersByIban.get(counterpartyIban);
          const counterpartyName = counterparty?.name || counterpartyIban || 'Neznámy používateľ';

          return {
            id: `${room.room_iban}-${String(tx.id ?? index)}`,
            roomIban: room.room_iban,
            date: tx.created_at,
            roomName: room.name || room.room_iban,
            description: isIncoming
              ? `${counterpartyName} pridal príspevok do priestoru`
              : `${counterpartyName} dostal vyrovnanie z priestoru`,
            amount: Number(tx.amount || 0),
            isPositive: isIncoming,
          };
        }),
      )
      .sort((a, b) => {
        const aTs = a.date ? new Date(a.date).getTime() : 0;
        const bTs = b.date ? new Date(b.date).getTime() : 0;
        return bTs - aTs;
      })
      .slice(0, 5);
  }, [myRooms, usersByIban]);

  const totalBalance = myRooms.reduce((sum, room) => sum + room.balance, 0);
  const activeSpaces = myRooms.filter((room) => room.isActive).length;
  const closedSpaces = myRooms.length - activeSpaces;
  const pendingSettlements = myRooms.filter((room) => room.hasPending).length;

  return (
    <>
      <ScreenHeader
        title="Spoločné výdavky"
        subtitle="Správa priestorov, príspevkov a vyrovnaní v mobile."
        onBack={onBackHome}
        unreadCount={unreadCount}
        inviteCount={inviteCount}
        onNotifications={onNotifications}
        onInvites={onInvites}
      />

      <Pressable onPress={() => void onRefresh()} style={({ pressed }) => [styles.heroCard, pressed && styles.pressed]}>
        <Text style={styles.heroTitle}>Dashboard priestorov</Text>
        <Text style={styles.heroNote}>
          Prehľad tvojich skupinových výdavkov, aktívnych priestorov a poslednej aktivity.
        </Text>
      </Pressable>

      <SectionTitle title="Aktívny účet" />
      <UserSwitcher users={data.users} currentUserIban={currentUserIban} onChange={onCurrentUserChange} />

      <View style={styles.statGrid}>
        <StatCard label="Celkový zostatok" value={`${formatAmount(totalBalance)} EUR`} />
        <StatCard label="Aktívne priestory" value={String(activeSpaces)} />
        <StatCard label="Čakajúce vyrovnania" value={String(pendingSettlements)} />
        <StatCard label="Uzavreté priestory" value={String(closedSpaces)} />
      </View>

      <Pressable onPress={onCreate} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
        <Text style={styles.primaryButtonText}>+ Vytvoriť priestor</Text>
      </Pressable>

      <SectionTitle title="Priestory" />
      <FilterTabs value={filterTab} onChange={setFilterTab} />
      <SortChips value={sortBy} onChange={setSortBy} />

      <View style={styles.detailSectionStack}>
        {filteredRooms.length === 0 ? (
          <View style={styles.listCard}>
            <Text style={styles.emptyText}>Zatiaľ tu nie sú žiadne priestory.</Text>
          </View>
        ) : (
          filteredRooms.map((room) => (
            <RoomListCard key={room.room_iban} room={room} onOpen={() => onOpenRoom(room.room_iban)} />
          ))
        )}
      </View>

      <SectionTitle title="Posledná aktivita" actionLabel="Obnoviť" onAction={() => void onRefresh()} />
      <View style={styles.detailSectionStack}>
        {activityRows.length === 0 ? (
          <View style={styles.listCard}>
            <Text style={styles.emptyText}>Aktivita sa zobrazí po prvých transakciách.</Text>
          </View>
        ) : (
          activityRows.map((item) => <ActivityFeedCard key={item.id} item={item} />)
        )}
      </View>
    </>
  );
}

function LoadingScreen() {
  return (
    <View style={styles.centerStage}>
      <ActivityIndicator color={COLORS.accentBlue} size="large" />
      <Text style={styles.loadingText}>Načítavam Shared Spaces…</Text>
    </View>
  );
}

function ErrorScreen({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => Promise<void>;
}) {
  return (
    <View style={styles.centerStage}>
      <Text style={styles.errorTitle}>Nepodarilo sa načítať dáta</Text>
      <Text style={styles.errorText}>{message}</Text>
      <Pressable onPress={() => void onRetry()} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
        <Text style={styles.primaryButtonText}>Skúsiť znova</Text>
      </Pressable>
    </View>
  );
}

function noop() {}

export default function SharedSpacesNativeScreen() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ invite?: string | string[] }>();
  const compact = width < 370;
  const sectionPaddingX = clamp(width * 0.052, 16, 22);

  const [data, setData] = useState<FullData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserIban, setCurrentUserIban] = useState<string | null>(null);
  const [selectedRoomIban, setSelectedRoomIban] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showInvites, setShowInvites] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingInviteCount, setPendingInviteCount] = useState(0);

  const inviteRoomIban = useMemo(() => parseInviteToken(params.invite), [params.invite]);

  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const result = await loadFullData();
      setData(result);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Nepodarilo sa načítať dáta.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!data?.users?.length) return;
    if (!currentUserIban || !data.users.some((user) => user.user_iban === currentUserIban)) {
      setCurrentUserIban(data.users[0].user_iban);
    }
  }, [data, currentUserIban]);

  const refreshCounts = useCallback(async () => {
    if (!currentUserIban) {
      setUnreadCount(0);
      setPendingInviteCount(0);
      return;
    }
    try {
      const [notifications, invites] = await Promise.all([
        getNotificationsForUser(currentUserIban) as Promise<NotificationRow[]>,
        getPendingInvitesForUser(currentUserIban) as Promise<InviteRow[]>,
      ]);
      setUnreadCount((notifications || []).filter((item) => !item.is_read).length);
      setPendingInviteCount((invites || []).length);
    } catch (err) {
      console.error(err);
    }
  }, [currentUserIban]);

  useEffect(() => {
    void refreshCounts();
  }, [refreshCounts]);

  const selectedRoom = useMemo<RoomModel | null>(() => {
    if (!data?.rooms || !selectedRoomIban) return null;
    return (data.rooms.find((room) => room.room_iban === selectedRoomIban) as RoomModel | undefined) || null;
  }, [data?.rooms, selectedRoomIban]);

  const inviteRoom = useMemo<RoomModel | null>(() => {
    if (!data?.rooms || !inviteRoomIban) return null;
    return (data.rooms.find((room) => room.room_iban === inviteRoomIban) as RoomModel | undefined) || null;
  }, [data?.rooms, inviteRoomIban]);

  const handleInviteAccepted = useCallback(async (acceptedUserIban: string) => {
    setCurrentUserIban(acceptedUserIban);
    await fetchData();
    setSelectedRoomIban(inviteRoom?.room_iban || null);
    router.replace('/shared-spaces');
  }, [fetchData, inviteRoom?.room_iban]);

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.root}>
      <View style={styles.phone}>
        <View style={[styles.screenContainer, { paddingHorizontal: sectionPaddingX, paddingBottom: insets.bottom + 18 }]}>
          <FakeStatusBar compact={compact} />

          {loading ? (
            <LoadingScreen />
          ) : error || !data ? (
            <ErrorScreen message={error || 'Unknown error'} onRetry={fetchData} />
          ) : inviteRoomIban ? (
            inviteRoom ? (
              <InviteAcceptanceView
                room={inviteRoom}
                users={data.users}
                onAccept={handleInviteAccepted}
                onCancel={() => router.replace('/shared-spaces')}
              />
            ) : (
              <ErrorScreen message="Pozvánka nebola nájdená alebo je neplatná." onRetry={fetchData} />
            )
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.pageContent}>
              {!selectedRoom || !currentUserIban ? (
                <SharedSpacesListScreen
                  data={data}
                  currentUserIban={currentUserIban}
                  onCurrentUserChange={setCurrentUserIban}
                  onBackHome={() => router.push('/')}
                  onCreate={() => setShowCreate(true)}
                  unreadCount={unreadCount}
                  inviteCount={pendingInviteCount}
                  onNotifications={() => setShowNotifications(true)}
                  onInvites={() => setShowInvites(true)}
                  onRefresh={fetchData}
                  onOpenRoom={setSelectedRoomIban}
                />
              ) : (
                <DetailScreen
                  room={selectedRoom}
                  users={data.users}
                  currentUserIban={currentUserIban}
                  onBack={() => setSelectedRoomIban(null)}
                  onRefresh={fetchData}
                />
              )}
            </ScrollView>
          )}
        </View>
      </View>

      {data && currentUserIban ? (
        <>
          <CreateSpaceModal
            visible={showCreate}
            currentUserIban={currentUserIban}
            users={data.users}
            onClose={() => setShowCreate(false)}
            onCreated={fetchData}
          />
          <NotificationsModal
            visible={showNotifications}
            userIban={currentUserIban}
            onClose={() => {
              setShowNotifications(false);
              void refreshCounts();
            }}
          />
          <InvitesModal
            visible={showInvites}
            userIban={currentUserIban}
            onClose={() => {
              setShowInvites(false);
              void refreshCounts();
            }}
            onRefreshAll={async () => {
              await fetchData();
              await refreshCounts();
            }}
          />
        </>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bgBlack,
    alignItems: 'center',
  },
  phone: {
    flex: 1,
    width: '100%',
    maxWidth: 390,
    alignSelf: 'center',
    backgroundColor: COLORS.bgPage,
  },
  screenContainer: {
    flex: 1,
    backgroundColor: COLORS.bgPage,
  },
  pageContent: {
    gap: 18,
    paddingBottom: 20,
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 14,
    paddingBottom: 8,
  },
  statusBarText: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '500',
  },
  statusBarTextCompact: {
    fontSize: 14,
  },
  statusBarRight: {
    flexDirection: 'row',
    gap: 8,
  },
  centerStage: {
    flex: 1,
    justifyContent: 'center',
    gap: 16,
    paddingBottom: 36,
  },
  loadingText: {
    color: COLORS.textSecondary,
    fontSize: 15,
    textAlign: 'center',
  },
  errorTitle: {
    color: COLORS.textPrimary,
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  errorText: {
    color: COLORS.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  screenHeader: {
    gap: 10,
  },
  screenHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.cardLine,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    minHeight: 42,
    paddingHorizontal: 14,
    borderRadius: 21,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.cardLine,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerButtonText: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  headerCount: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accentBlue,
  },
  headerCountText: {
    color: COLORS.textPrimary,
    fontSize: 10,
    fontWeight: '700',
  },
  screenTitle: {
    color: COLORS.textPrimary,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.6,
  },
  screenSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
  heroCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.cardLine,
    gap: 10,
  },
  heroTitle: {
    color: COLORS.textPrimary,
    fontSize: 22,
    fontWeight: '700',
  },
  heroSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  heroNote: {
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  heroMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  userChipRow: {
    gap: 10,
    paddingRight: 12,
  },
  userChip: {
    minWidth: 124,
    maxWidth: 160,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.cardLine,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  userChipActive: {
    borderColor: COLORS.accentBlue,
    backgroundColor: 'rgba(51,144,221,0.12)',
  },
  userChipAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.bgCardAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userChipAvatarActive: {
    backgroundColor: COLORS.accentBlue,
  },
  userChipAvatarText: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  userChipText: {
    flex: 1,
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  userChipTextActive: {
    color: COLORS.textPrimary,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitleText: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  inlineAction: {
    paddingVertical: 4,
  },
  inlineActionText: {
    color: COLORS.accentBlue,
    fontSize: 13,
    fontWeight: '600',
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statCard: {
    width: '48.5%',
    minHeight: 110,
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.cardLine,
    justifyContent: 'space-between',
  },
  statLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  statValue: {
    color: COLORS.textPrimary,
    fontSize: 24,
    fontWeight: '700',
  },
  statNote: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  primaryButton: {
    minHeight: 50,
    borderRadius: 16,
    backgroundColor: COLORS.accentBlue,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  primaryButtonText: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButton: {
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.cardLine,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  secondaryButtonText: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  smallPrimaryButton: {
    minHeight: 40,
    minWidth: 86,
    borderRadius: 14,
    backgroundColor: COLORS.accentBlue,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  smallPrimaryButtonText: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  smallSecondaryButton: {
    minHeight: 40,
    minWidth: 86,
    borderRadius: 14,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.cardLine,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  smallSecondaryButtonText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  ocrButton: {
    flex: 1,
  },
  pressed: {
    opacity: 0.84,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 8,
  },
  segmentButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 14,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.cardLine,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  segmentButtonActive: {
    backgroundColor: 'rgba(51,144,221,0.12)',
    borderColor: COLORS.accentBlue,
  },
  segmentButtonText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  segmentButtonTextActive: {
    color: COLORS.textPrimary,
  },
  sortRow: {
    gap: 8,
  },
  sortLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  sortChipRow: {
    gap: 8,
    paddingRight: 12,
  },
  sortChip: {
    minHeight: 34,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.cardLine,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sortChipActive: {
    borderColor: COLORS.accentBlue,
    backgroundColor: 'rgba(51,144,221,0.12)',
  },
  sortChipText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  sortChipTextActive: {
    color: COLORS.textPrimary,
  },
  detailSectionStack: {
    gap: 12,
  },
  roomCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.cardLine,
    gap: 14,
    position: 'relative',
    overflow: 'hidden',
  },
  roomAccent: {
    position: 'absolute',
    left: 0,
    top: 14,
    bottom: 14,
    width: 4,
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3,
  },
  roomCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  roomCardTitleWrap: {
    flex: 1,
  },
  roomCardTitle: {
    color: COLORS.textPrimary,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 3,
  },
  roomCardSubtitle: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  roomCardBalanceWrap: {
    alignItems: 'flex-end',
  },
  roomCardBalance: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  roomCardMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: COLORS.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarOverlap: {
    marginLeft: -8,
  },
  avatarMore: {
    backgroundColor: COLORS.bgCardAlt,
  },
  avatarText: {
    color: COLORS.textPrimary,
    fontSize: 10,
    fontWeight: '700',
  },
  roomBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: 6,
    flex: 1,
  },
  roomCardFooter: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardLine,
    gap: 3,
  },
  roomCardHint: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  badge: {
    minHeight: 24,
    paddingHorizontal: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeNeutral: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  badgeSuccess: {
    backgroundColor: 'rgba(57,198,155,0.16)',
  },
  badgeWarning: {
    backgroundColor: COLORS.warningBg,
  },
  badgeDanger: {
    backgroundColor: COLORS.dangerBg,
  },
  badgeBlue: {
    backgroundColor: 'rgba(51,144,221,0.16)',
  },
  badgeText: {
    color: COLORS.textPrimary,
    fontSize: 11,
    fontWeight: '700',
  },
  feedCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.cardLine,
    gap: 10,
  },
  feedRow: {
    flexDirection: 'row',
    gap: 12,
  },
  feedMain: {
    flex: 1,
  },
  feedTitle: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  feedSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  feedAmount: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'right',
  },
  positiveAmount: {
    color: COLORS.success,
  },
  negativeAmount: {
    color: COLORS.danger,
  },
  feedDate: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  detailHero: {
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.cardLine,
  },
  detailHeroImage: {
    minHeight: 270,
    justifyContent: 'flex-end',
  },
  detailHeroImageStyle: {
    opacity: 0.82,
  },
  detailHeroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(16,17,21,0.55)',
  },
  detailHeroInner: {
    padding: 18,
    gap: 12,
  },
  detailHeroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailHeroActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconAction: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(16,17,21,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconActionText: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  detailHeroTitle: {
    color: COLORS.textPrimary,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.6,
  },
  detailHeroSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  detailHeroStats: {
    flexDirection: 'row',
    gap: 10,
  },
  progressCard: {
    backgroundColor: 'rgba(16,17,21,0.55)',
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: COLORS.accentBlue,
  },
  detailTabRow: {
    gap: 8,
    paddingVertical: 14,
    paddingRight: 12,
  },
  tabChip: {
    minHeight: 38,
    paddingHorizontal: 16,
    borderRadius: 19,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.cardLine,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabChipActive: {
    borderColor: COLORS.accentBlue,
    backgroundColor: 'rgba(51,144,221,0.12)',
  },
  tabChipText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  tabChipTextActive: {
    color: COLORS.textPrimary,
  },
  detailCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.cardLine,
    gap: 10,
  },
  detailCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  detailCardTitle: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  detailCardSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  detailCardMeta: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  detailCardAmount: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'right',
  },
  memberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'center',
  },
  memberRowLeft: {
    flexDirection: 'row',
    gap: 12,
    flex: 1,
    alignItems: 'center',
  },
  shoppingCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.cardLine,
    gap: 14,
  },
  shoppingCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  shoppingCardCopy: {
    flex: 1,
  },
  shoppingTotal: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  shoppingCardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  detailButton: {
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: COLORS.bgCardAlt,
    borderWidth: 1,
    borderColor: COLORS.cardLine,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailButtonText: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  inlineFormCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.cardLine,
    gap: 12,
  },
  infoCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.cardLine,
    gap: 10,
  },
  formTitle: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  formLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: COLORS.bgCardAlt,
    borderWidth: 1,
    borderColor: COLORS.cardLine,
    paddingHorizontal: 14,
    color: COLORS.textPrimary,
    fontSize: 14,
  },
  inlineFormRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  inlineInput: {
    flex: 1,
  },
  dualActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  infoText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  linkPreview: {
    color: COLORS.textPrimary,
    fontSize: 13,
    lineHeight: 20,
  },
  listCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.cardLine,
    overflow: 'hidden',
  },
  selectRow: {
    minHeight: 56,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardLine,
    justifyContent: 'center',
    gap: 4,
  },
  selectRowActive: {
    backgroundColor: 'rgba(51,144,221,0.12)',
  },
  selectRowTitle: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  selectRowTitleActive: {
    color: COLORS.textPrimary,
  },
  selectRowMeta: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    padding: 16,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  typeButton: {
    width: '47%',
    minHeight: 62,
    borderRadius: 16,
    backgroundColor: COLORS.bgCardAlt,
    borderWidth: 1,
    borderColor: COLORS.cardLine,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
    justifyContent: 'center',
  },
  typeButtonActive: {
    borderColor: COLORS.accentBlue,
    backgroundColor: 'rgba(51,144,221,0.12)',
  },
  typeButtonIcon: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  typeButtonLabel: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  typeButtonLabelActive: {
    color: COLORS.textPrimary,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.58)',
    justifyContent: 'center',
    padding: 18,
  },
  modalCard: {
    maxHeight: '84%',
    backgroundColor: COLORS.bgPage,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.cardLine,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardLine,
    gap: 12,
  },
  modalTitleWrap: {
    flex: 1,
    gap: 4,
  },
  modalTitle: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: '700',
  },
  modalSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  modalClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: {
    color: COLORS.textPrimary,
    fontSize: 24,
    lineHeight: 24,
  },
  modalBody: {
    padding: 18,
    gap: 14,
  },
  notificationRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardLine,
    gap: 6,
  },
  notificationUnread: {
    backgroundColor: 'rgba(51,144,221,0.10)',
  },
  notificationTitle: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  notificationBody: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  notificationDate: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  inviteRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardLine,
    gap: 12,
  },
  inviteCopy: {
    gap: 4,
  },
  inviteActions: {
    flexDirection: 'row',
    gap: 8,
  },
  detailHeroImagePlaceholder: {
    backgroundColor: COLORS.bgCard,
  },
  shoppingItemList: {
    gap: 10,
  },
  shoppingItemCard: {
    backgroundColor: COLORS.bgCardAlt,
    borderRadius: 16,
    padding: 14,
    gap: 12,
  },
  shoppingItemTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  shoppingItemCopy: {
    flex: 1,
    gap: 8,
  },
  shoppingItemAmount: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  assignmentRow: {
    gap: 8,
    paddingRight: 12,
  },
  assignmentChip: {
    minHeight: 38,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: COLORS.bgPage,
    borderWidth: 1,
    borderColor: COLORS.cardLine,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  assignmentChipActive: {
    borderColor: COLORS.accentBlue,
    backgroundColor: 'rgba(51,144,221,0.12)',
  },
  assignmentChipText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  assignmentChipTextActive: {
    color: COLORS.textPrimary,
  },
});
