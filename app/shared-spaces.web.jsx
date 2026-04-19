import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { router } from 'expo-router';
import '../src/web-shell/bank-shell.css';
import {
  getUsers,
  getRooms,
  getRoomMembers,
  getTransactionsForRoom,
  sendToRoom,
  sendFromRoom,
  createRoom,
  addRoomMember,
  removeRoomMember,
  getRoomSpending,
  closeRoom,
  updateRoomName,
  getGoalsForRoom,
  createGoal,
  getChecks,
  getCheckListItems,
  createCheck,
  addCheckItem,
  batchAddCheckItems,
  toggleCheckItemClaim,
} from '../src/setup/supabase';
import { processDocumentBase64 } from '../src/utils/gemini-parser';
import {
  getNotificationsForUser,
  markNotificationRead,
  markAllNotificationsRead,
} from '../src/setup/notifications';
import {
  createRoomInvite,
  getPendingInvitesForUser,
  acceptRoomInvite,
  declineRoomInvite,
} from '../src/setup/invites';

/* ─── constants ─── */
const MEMBER_COLORS = ['#52c7bc', '#50a9ec', '#557fe8', '#c8b88f', '#54c36f', '#f26a4f', '#db02b5', '#f0da0a'];
const UNSPLASH_APP_NAME = 'tatra_shared_spaces';
const UNSPLASH_ACCESS_KEY = process.env.EXPO_PUBLIC_UNSPLASH_ACCESS_KEY || '';
const ROOM_COVER_STORAGE_KEY = 'tatra-room-cover-map-v1';
const ROOM_COVER_FALLBACKS = [
  {
    id: 'tb-cover-1',
    url: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&h=900&q=80',
    author: 'Timon Studler',
    authorUrl: `https://unsplash.com/@timonstudler?utm_source=${UNSPLASH_APP_NAME}&utm_medium=referral`,
  },
  {
    id: 'tb-cover-2',
    url: 'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?auto=format&fit=crop&w=1600&h=900&q=80',
    author: 'Anders Jildén',
    authorUrl: `https://unsplash.com/@andersjilden?utm_source=${UNSPLASH_APP_NAME}&utm_medium=referral`,
  },
  {
    id: 'tb-cover-3',
    url: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=1600&h=900&q=80',
    author: 'Luca Bravo',
    authorUrl: `https://unsplash.com/@lucabravo?utm_source=${UNSPLASH_APP_NAME}&utm_medium=referral`,
  },
  {
    id: 'tb-cover-4',
    url: 'https://images.unsplash.com/photo-1505764706515-aa95265c5abc?auto=format&fit=crop&w=1600&h=900&q=80',
    author: 'Jonatan Pie',
    authorUrl: `https://unsplash.com/@r3dmax?utm_source=${UNSPLASH_APP_NAME}&utm_medium=referral`,
  },
];
const sideItems = [
  'Prehľad',
  'Účty',
  'Debetné karty',
  'Kreditné karty',
  'Úvery',
  'Podielové fondy',
  'DDS dôchodok',
  'Poistné produkty',
  'Termínované vklady',
  'Cenné papiere',
  'Účty v iných bankách',
  'Ponuky',
];
const subItems = [
  'Prehľad',
  'Účty',
  'Debetné karty',
  'Kreditné karty',
  'Úvery',
  'Podielové fondy',
  'DDS dôchodok',
  'Poistné produkty',
  'Termínované vklady',
];

/* ─── helpers ─── */
function formatAmount(n) {
  return Number(n).toLocaleString('sk-SK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getInitial(name) {
  return name ? name.charAt(0).toUpperCase() : '?';
}

function getUnsplashHomeUrl() {
  return `https://unsplash.com/?utm_source=${UNSPLASH_APP_NAME}&utm_medium=referral`;
}

function hashString(value) {
  return [...value].reduce((acc, char) => ((acc << 5) - acc + char.charCodeAt(0)) | 0, 0);
}

function readRoomCoverMap() {
  if (typeof window === 'undefined') return {};

  try {
    return JSON.parse(window.localStorage.getItem(ROOM_COVER_STORAGE_KEY) || '{}');
  } catch (error) {
    return {};
  }
}

function writeRoomCoverMap(map) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(ROOM_COVER_STORAGE_KEY, JSON.stringify(map));
}

function getFallbackRoomCover(roomIban) {
  const index = Math.abs(hashString(roomIban)) % ROOM_COVER_FALLBACKS.length;
  return ROOM_COVER_FALLBACKS[index];
}

const INVITE_TOKEN_SECRET = 'tatra_shared_spaces_invite_secret';

function createInviteToken(roomIban) {
  const payload = `${roomIban}:${hashString(`${roomIban}${INVITE_TOKEN_SECRET}`)}`;
  return typeof window !== 'undefined' ? window.btoa(payload) : '';
}

function parseInviteToken(token) {
  if (!token || typeof window === 'undefined') return null;
  try {
    const decoded = window.atob(token);
    const [roomIban, signature] = decoded.split(':');
    if (!roomIban || !signature) return null;
    const expected = String(hashString(`${roomIban}${INVITE_TOKEN_SECRET}`));
    return signature === expected ? roomIban : null;
  } catch (error) {
    return null;
  }
}

function buildInviteUrl(roomIban) {
  if (typeof window === 'undefined') return '';
  return `${window.location.origin}${window.location.pathname}?invite=${encodeURIComponent(createInviteToken(roomIban))}`;
}

async function fetchUnsplashRoomCover() {
  if (!UNSPLASH_ACCESS_KEY || typeof fetch === 'undefined') return null;

  const response = await fetch(
    `https://api.unsplash.com/photos/random?query=${encodeURIComponent('landscape city travel architecture')}&orientation=landscape&content_filter=high`,
    {
      headers: {
        Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Unsplash request failed: ${response.status}`);
  }

  const photo = await response.json();

  if (!photo?.urls?.regular || !photo?.user?.name) {
    return null;
  }

  const profileUrl = `${photo.user.links.html}${photo.user.links.html.includes('?') ? '&' : '?'}utm_source=${UNSPLASH_APP_NAME}&utm_medium=referral`;

  return {
    id: photo.id,
    url: `${photo.urls.regular}&q=80&fm=jpg&fit=crop&w=1600&h=900`,
    author: photo.user.name,
    authorUrl: profileUrl,
  };
}

async function ensureRoomCover(roomIban) {
  const storedMap = readRoomCoverMap();

  if (storedMap[roomIban]?.url) {
    return storedMap[roomIban];
  }

  let cover = null;

  try {
    cover = await fetchUnsplashRoomCover();
  } catch (error) {
    cover = null;
  }

  if (!cover) {
    cover = getFallbackRoomCover(roomIban);
  }

  const nextMap = {
    ...storedMap,
    [roomIban]: cover,
  };

  writeRoomCoverMap(nextMap);
  return cover;
}

/* ─── data loading ─── */
async function loadFullData() {
  const [users, rooms] = await Promise.all([getUsers(), getRooms()]);

  const enrichedRooms = await Promise.all(
    rooms.map(async (room) => {
      const members = await getRoomMembers(room.room_iban);
      const transactions = await getTransactionsForRoom(room.room_iban);
      const goals = await getGoalsForRoom(room.room_iban);
      const spending = await getRoomSpending(room.room_iban);

      // enrich members with user info
      const enrichedMembers = members.map((m, i) => {
        const user = users.find((u) => u.user_iban === m.user_iban);
        // Check if this is the room creator (from created_by_user_iban)
        const isCreator = room.created_by_user_iban === m.user_iban;
        return {
          ...m,
          name: user?.name || user?.user_iban || m.user_iban,
          avatar: getInitial(user?.name || m.user_iban),
          color: MEMBER_COLORS[i % MEMBER_COLORS.length],
          userBalance: user?.balance || 0,
          role: m.role || (isCreator ? 'owner' : 'member'),
          spending: spending[m.user_iban] || 0,
        };
      });

      // get new data
      const checks = await getChecks(room.room_iban);
      const enrichedChecks = await Promise.all(
        checks.map(async (chk) => {
          const items = await getCheckListItems(chk.id);
          return { ...chk, items };
        })
      );

      return {
        ...room,
        members: enrichedMembers,
        transactions,
        memberCount: enrichedMembers.length,
        targetAmount: goals.length > 0 ? goals[0].amount : null,
        checks: enrichedChecks,
        spending,
      };
    })
  );

  return { users, rooms: enrichedRooms };
}

/* ─── bank shell ─── */
function Logo() {
  return (
    <div className="tb-logo" aria-label="Tatra banka demo logo">
      <img src="/mock-shell/images.png" alt="" />
    </div>
  );
}

function TopBar() {
  return (
    <header className="tb-topbar">
      <button className="tb-hamburger" type="button" aria-label="Menu">
        <span />
      </button>
      <Logo />

      <nav className="tb-main-nav" aria-label="Main navigation">
        <a className="is-active" href="#products">Produkty</a>
        <a href="#payments">Platby</a>
        <a href="#mafin">MaFin</a>
        <a href="#documents">Dokumenty</a>
        <a href="#settings">Nastavenia</a>
      </nav>

      <select className="tb-payment-select" defaultValue="">
        <option value="" disabled>Zadať platbu</option>
        <option>Nová platba</option>
      </select>

      <div className="tb-topbar-spacer" />

      <div className="tb-top-icons" aria-hidden="true">
        <span className="tb-icon help" />
        <span className="tb-icon mail" />
        <span className="tb-icon user" />
      </div>
      <button className="tb-logout" type="button">Odhlásiť</button>

      <div className="tb-mobile-icons" aria-hidden="true">
        <span className="tb-icon euro" />
        <span className="tb-icon mail" />
      </div>
    </header>
  );
}

function Sidebar() {
  return (
    <aside className="tb-sidebar">
      <nav className="tb-side-nav" aria-label="Product navigation">
        {sideItems.map((item, index) => (
          <a
            key={item}
            href={item === 'Prehľad' ? '/' : `#${item}`}
            onClick={(event) => {
              if (item === 'Prehľad') {
                event.preventDefault();
                router.push('/');
              }
            }}
            className={`${index === 1 ? 'is-active' : ''} ${item === 'Účty' ? 'has-dot' : ''}`}
          >
            {item}
          </a>
        ))}
      </nav>
    </aside>
  );
}

function TabletSubNav() {
  return (
    <nav className="tb-tablet-subnav" aria-label="Product subnavigation">
      {subItems.map((item, index) => (
        <a
          key={item}
          href={item === 'Prehľad' ? '/' : `#${item}`}
          onClick={(event) => {
            if (item === 'Prehľad') {
              event.preventDefault();
              router.push('/');
            }
          }}
          className={`${index === 1 ? 'is-active' : ''} ${item === 'Účty' ? 'has-dot' : ''}`}
        >
          {item}
        </a>
      ))}
    </nav>
  );
}

function SharedSpacesShell({ children }) {
  return (
    <div className="tb-shell ss-shell">
      <TopBar />
      <TabletSubNav />
      <Sidebar />
      <main className="tb-content">
        <div className="tb-content-inner ss-shell-inner">{children}</div>
      </main>
    </div>
  );
}

/* ─── components ─── */
function BackHeader({ title, onBack }) {
  return (
    <div className="ss-header">
      <button className="ss-back" type="button" onClick={onBack}>
        Spat
      </button>
      <h1 className="ss-title">{title}</h1>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="ss-empty" style={{ padding: '80px 0' }}>
      <div style={{ color: '#8e9095', fontSize: 15 }}>Nacitavam data...</div>
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="ss-empty" style={{ padding: '60px 0' }}>
      <div style={{ color: '#ff5b7a', fontSize: 14, marginBottom: 12 }}>{message}</div>
      <button className="ss-btn ss-btn-primary" type="button" onClick={onRetry}>
        Skusit znova
      </button>
    </div>
  );
}

function InviteAcceptancePage({ room, users, inviteUrl, inviteError, onAccept, onCancel }) {
  const availableUsers = users.filter((user) => !room.members.some((member) => member.user_iban === user.user_iban));
  const [selectedUser, setSelectedUser] = useState(availableUsers[0]?.user_iban || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (availableUsers.length > 0 && !selectedUser) {
      setSelectedUser(availableUsers[0].user_iban);
    }
  }, [availableUsers, selectedUser]);

  const handleAccept = async () => {
    if (!selectedUser) return;
    setLoading(true);
    try {
      await addRoomMember(room.room_iban, selectedUser);
      await onAccept(selectedUser);
    } catch (err) {
      console.error('Failed to accept invite', err);
      alert('Chyba pri akceptácií pozvánky: ' + err.message);
      setLoading(false);
    }
  };

  return (
    <div className="ss-dashboard">
      <BackHeader title="Pozvánka do priestoru" onBack={onCancel} />
      <div className="ss-empty" style={{ padding: 32, textAlign: 'left' }}>
        {inviteError ? (
          <div style={{ color: '#ff8fa0', marginBottom: 24 }}>{inviteError}</div>
        ) : (
          <>
            <p style={{ color: '#d4d7dc', marginBottom: 16 }}>
              Otvorili ste pozvánku do priestoru <strong>{room.name || room.room_iban}</strong>.
              Vyberte účet, ktorý chcete použiť na prihlásenie a pripojenie do priestoru.
            </p>
            <div className="ss-modal-body" style={{ padding: 24, background: '#1f2128', borderRadius: 16 }}>
              <label className="ss-label" style={{ marginBottom: 12 }}>Vyberte účet</label>
              <div style={{ display: 'grid', gap: 8, marginBottom: 16 }}>
                {availableUsers.map((user) => (
                  <button
                    key={user.user_iban}
                    type="button"
                    className={`ss-btn ${selectedUser === user.user_iban ? 'ss-btn-primary' : ''}`}
                    style={{ justifyContent: 'flex-start' }}
                    onClick={() => setSelectedUser(user.user_iban)}
                  >
                    {user.name || user.user_iban}
                  </button>
                ))}
                {availableUsers.length === 0 && (
                  <div className="ss-empty" style={{ padding: 16 }}>
                    Všetci používatelia sú už v tomto priestore.
                  </div>
                )}
              </div>
              {inviteUrl && (
                <div style={{ marginBottom: 16 }}>
                  <label className="ss-label">Pozvánka</label>
                  <div style={{ color: '#bfc1c8', wordBreak: 'break-all', fontSize: 13, background: '#101214', padding: 12, borderRadius: 10 }}>{inviteUrl}</div>
                </div>
              )}
              <button
                className="ss-btn ss-btn-primary"
                type="button"
                onClick={handleAccept}
                disabled={!selectedUser || loading || availableUsers.length === 0}
              >
                {loading ? 'Prijímam...' : 'Prijať pozvánku'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function InviteModal({ room, onClose }) {
  const inviteUrl = buildInviteUrl(room.room_iban);
  const [copied, setCopied] = useState(false);
  const qrSrc = inviteUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(inviteUrl)}`
    : '';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Clipboard error', err);
      setCopied(false);
    }
  };

  return (
    <div className="ss-modal-backdrop" onClick={onClose}>
      <div className="ss-modal ss-invite-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ss-modal-header ss-invite-modal-header">
          <div className="ss-invite-header-copy">
            <span className="ss-invite-eyebrow">Zdielanie priestoru</span>
            <h2>Pozvánka do priestoru</h2>
          </div>
          <button className="ss-close-btn" type="button" onClick={onClose} aria-label="Zavrieť">
            ×
          </button>
        </div>
        <div className="ss-modal-body ss-invite-modal-body">
          <div className="ss-invite-intro">
            <p>
              Odkaz možno poslať komukoľvek. Prijímateľ si potom vyberie účet z existujúcich používateľov.
            </p>
          </div>

          <div className="ss-invite-link-panel">
            <label className="ss-label">Priamy odkaz</label>
            <div className="ss-invite-link-row">
              <input
                className="ss-input"
                readOnly
                value={inviteUrl}
                style={{ flex: 1, minWidth: 0 }}
              />
              <button className="ss-btn ss-btn-primary ss-invite-copy-btn" type="button" onClick={handleCopy}>
                {copied ? 'Skopírované' : 'Kopírovať'}
              </button>
            </div>
          </div>

          {qrSrc && (
            <div className="ss-invite-qr-panel">
              <div className="ss-invite-qr-frame">
                <img className="ss-invite-qr-image" src={qrSrc} alt="QR kód pozvánky" />
              </div>
              <small className="ss-invite-qr-note">Naskenujte QR kód na priamu pozvánku.</small>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatShortDate(value) {
  if (!value) return 'Bez dátumu';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Bez dátumu';
  return date.toLocaleDateString('sk-SK');
}

function RoomCard({ room, onClick }) {
  return (
    <div className="ss-space-card" onClick={onClick}>
      <div className="ss-space-card-top">
        <span className="ss-space-icon">{getInitial(room.name || room.room_iban)}</span>
        <div className="ss-space-card-info">
          <span className="ss-space-card-name">{room.name || `Room ${room.room_iban}`}</span>
          <span className="ss-space-card-date">IBAN: {room.room_iban}</span>
        </div>
        <span className="ss-space-card-total">{formatAmount(room.balance)} EUR</span>
      </div>
      <div className="ss-space-card-bottom">
        <div className="ss-space-card-avatars">
          {room.members.slice(0, 5).map((m, i) => (
            <span key={m.user_iban || i} className="tb-avatar" style={{ background: m.color }}>
              {m.avatar}
            </span>
          ))}
          {room.members.length > 5 && (
            <span className="tb-avatar" style={{ background: '#555' }}>
              +{room.members.length - 5}
            </span>
          )}
        </div>
        <div className="ss-space-card-meta">
          <span className="ss-badge ss-badge-pending">{room.transactions.length} transakcii</span>
          {room.balance > 0 && <span className="ss-badge ss-badge-owed">{formatAmount(room.balance)} EUR</span>}
        </div>
      </div>
    </div>
  );
}

function RoomDetail({ room, users, currentUserIban, onBack, onRefresh }) {
  const [tab, setTab] = useState('transactions');
  const [sending, setSending] = useState(false);
  const [sendAmount, setSendAmount] = useState('');
  const [sendDirection, setSendDirection] = useState('to_room'); // 'to_room' or 'from_room'
  const [showAddMember, setShowAddMember] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [coverPhoto, setCoverPhoto] = useState(null);

  const [showAddCheck, setShowAddCheck] = useState(false);
  const [checkLocation, setCheckLocation] = useState('');
  const [checkAmount, setCheckAmount] = useState('');
  const [activeCheckId, setActiveCheckId] = useState(null);
  const [draftItems, setDraftItems] = useState({});
  const [isReceiptDragActive, setIsReceiptDragActive] = useState(false);
  const [parsingReceipt, setParsingReceipt] = useState(false);
  const fileInputRef = React.useRef(null);

  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closingRoom, setClosingRoom] = useState(false);
  const [showEditNameModal, setShowEditNameModal] = useState(false);
  const [editedRoomName, setEditedRoomName] = useState(room.name || '');
  const [removingMember, setRemovingMember] = useState(null);

  const processReceiptFile = async (file) => {
    if (!file) return;
    setParsingReceipt(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const rawResult = typeof reader.result === 'string' ? reader.result : '';
          const base64String = rawResult.split(',')[1];
          if (!base64String) {
            throw new Error('Súbor sa nepodarilo načítať.');
          }
          const result = await processDocumentBase64(file.type, base64String);
          if (result.type !== 'receipt') {
            alert('Nebol rozpoznany pokladnicny blok. Typ: ' + result.type);
            return;
          }
          const check = await createCheck(room.room_iban, Number(result.total), result.store || 'Neznamy obchod');
          if (result.items && result.items.length > 0) {
            await batchAddCheckItems(check.id, result.items);
          }
          await onRefresh();
        } catch (err) {
          console.error(err);
          alert('Chyba pri spracovani obrazka: ' + err.message);
        } finally {
          setParsingReceipt(false);
          setIsReceiptDragActive(false);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      setParsingReceipt(false);
      setIsReceiptDragActive(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    await processReceiptFile(file);
  };

  const handleAddCheck = async (e) => {
    e.preventDefault();
    if (!checkLocation || !checkAmount) return;
    await createCheck(room.room_iban, Number(checkAmount), checkLocation);
    setCheckLocation('');
    setCheckAmount('');
    setShowAddCheck(false);
    await onRefresh();
  };

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
    } catch (err) {
      console.error('Transaction failed:', err);
    } finally {
      setSending(false);
    }
  };

  const updateDraftItem = useCallback((checkId, field, value) => {
    setDraftItems((prev) => ({
      ...prev,
      [checkId]: {
        ...(prev[checkId] || { name: '', amount: '' }),
        [field]: value,
      },
    }));
  }, []);

  const handleAddDraftItem = useCallback(async (checkId) => {
    const draft = draftItems[checkId] || {};
    if (!draft.name || !draft.amount) return;
    await addCheckItem(checkId, draft.name, parseFloat(draft.amount), null);
    setDraftItems((prev) => ({
      ...prev,
      [checkId]: { name: '', amount: '' },
    }));
    await onRefresh();
  }, [draftItems, onRefresh]);

  const handleAssignCheckItem = useCallback(async (item, targetUserIban) => {
    const claimOwner = targetUserIban ?? item.user_iban;
    if (!claimOwner) return;
    await toggleCheckItemClaim(item.id, claimOwner, item.user_iban);
    await onRefresh();
  }, [onRefresh]);

  const handleCloseRoom = async () => {
    if (!isOwner) return;
    setClosingRoom(true);
    try {
      await closeRoom(room.room_iban);
      setShowCloseModal(false);
      await onRefresh();
    } catch (err) {
      console.error('Failed to close room:', err);
      alert('Chyba pri zatváraní priestoru: ' + err.message);
    } finally {
      setClosingRoom(false);
    }
  };

  const handleRemoveMember = async (memberIban) => {
    if (!isOwner || memberIban === currentUserIban) {
      alert('Nemôžete odstrániť seba samého alebo nemáte oprávnenie.');
      return;
    }
    setRemovingMember(memberIban);
    try {
      await removeRoomMember(room.room_iban, memberIban);
      await onRefresh();
    } catch (err) {
      console.error('Failed to remove member:', err);
      alert('Chyba pri odstraňovaní člena: ' + err.message);
    } finally {
      setRemovingMember(null);
    }
  };

  const handleEditRoomName = async () => {
    if (!isOwner || !editedRoomName.trim()) return;
    try {
      await updateRoomName(room.room_iban, editedRoomName.trim());
      setShowEditNameModal(false);
      await onRefresh();
    } catch (err) {
      console.error('Failed to update room name:', err);
      alert('Chyba pri zmene názvu: ' + err.message);
    }
  };

  useEffect(() => {
    let active = true;

    ensureRoomCover(room.room_iban).then((cover) => {
      if (active) {
        setCoverPhoto(cover);
      }
    });

    return () => {
      active = false;
    };
  }, [room.room_iban]);

  const targetAmount = Number(room.targetAmount || 0);
  const progress = targetAmount > 0 ? Math.max(0, Math.min((Number(room.balance || 0) / targetAmount) * 100, 100)) : 0;
  const latestTransactionDate = room.transactions?.[0]?.created_at;

  // Role and owner calculations
  const currentUserMember = room.members?.find((m) => m.user_iban === currentUserIban);
  const currentUserRole = currentUserMember?.role || 'member';
  const isOwner = currentUserRole === 'owner';

  // Settlement calculation
  const calculateSettlement = () => {
    const remaining = Number(room.balance || 0);
    if (remaining <= 0) return {};

    const memberContributions = {};
    const memberSpending = {};

    // Sum contributions from transactions
    (room.transactions || []).forEach((tx) => {
      if (tx.to_iban === room.room_iban && tx.from_iban) {
        memberContributions[tx.from_iban] = (memberContributions[tx.from_iban] || 0) + Number(tx.amount || 0);
      }
    });

    // Get spending
    room.members?.forEach((m) => {
      memberSpending[m.user_iban] = m.spending || 0;
    });

    // Calculate distribution based on contribution percentage
    const totalContributed = Object.values(memberContributions).reduce((a, b) => a + b, 0);
    const distribution = {};

    if (totalContributed > 0) {
      Object.keys(memberContributions).forEach((iban) => {
        const contrib = memberContributions[iban];
        const percent = contrib / totalContributed;
        distribution[iban] = {
          contribution: contrib,
          spending: memberSpending[iban] || 0,
          percentOfTotal: percent,
          refund: remaining * percent,
        };
      });
    }

    return distribution;
  };

  const settlement = calculateSettlement();

  const totalShoppingItems = (room.checks || []).reduce((sum, check) => sum + (check.items?.length || 0), 0);
  const unassignedShoppingItems = (room.checks || []).reduce(
    (sum, check) => sum + (check.items || []).filter((item) => !item.user_iban).length,
    0
  );
  const activeCheck = useMemo(
    () => (room.checks || []).find((check) => check.id === activeCheckId) || null,
    [room.checks, activeCheckId]
  );

  const transactionRows = [...(room.transactions || [])]
    .sort((a, b) => {
      const aTs = a?.created_at ? new Date(a.created_at).getTime() : 0;
      const bTs = b?.created_at ? new Date(b.created_at).getTime() : 0;
      return bTs - aTs;
    });

  return (
    <div className="ss-detail-page">
      <div className="ss-detail-hero">
        {coverPhoto?.url ? (
          <div
            className="ss-detail-hero-image"
            style={{ backgroundImage: `url(${coverPhoto.url})` }}
            aria-hidden="true"
          />
        ) : null}
        <div className="ss-detail-hero-fade" aria-hidden="true" />

        <div className="ss-detail-hero-content">
          <div className="ss-detail-header">
            <div className="ss-detail-heading">
              <div className="ss-detail-breadcrumb">
                <button className="ss-back ss-back-inline" type="button" onClick={onBack}>
                  ← Späť
                </button>
                <span className="ss-detail-iban-chip">{room.room_iban}</span>
              </div>
              <h1 className="ss-detail-title">{room.name || `Room ${room.room_iban}`}</h1>
              <p className="ss-detail-subtitle">
                Detail priestoru, platby a nákupy v rovnakom štýle ako zvyšok bank shellu.
              </p>
            </div>

            <div className="ss-detail-actions">
              <button className="ss-invite-btn" type="button" onClick={() => setShowInviteModal(true)}>
                Zdieľať pozvánku
              </button>
              <button className="ss-open-room" type="button" onClick={() => setShowAddMember(true)}>
                Pozvať člena
              </button>
              <button className="ss-kpi-cta ss-detail-pay-btn" type="button" onClick={() => setTab('send')}>
                Poslať platbu
              </button>
              <div className="ss-detail-icon-buttons">
                {isOwner && (
                  <>
                    <button
                      className="ss-icon-btn ss-icon-edit-btn"
                      type="button"
                      title="Zmeniť názov priestoru"
                      onClick={() => setShowEditNameModal(true)}
                    >
                      <span className="ss-icon-btn-glyph" aria-hidden="true">✎</span>
                      <span>Upraviť</span>
                    </button>
                    <button
                      className="ss-icon-btn ss-icon-close-btn"
                      type="button"
                      title="Zatvoriť priestor"
                      onClick={() => setShowCloseModal(true)}
                    >
                      <span className="ss-icon-btn-glyph" aria-hidden="true">⌦</span>
                      <span>Uzatvoriť</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="ss-kpi-row ss-detail-kpi-row">
            <div className="ss-kpi-card ss-detail-balance-card">
              <span className="ss-kpi-label">ZOSTATOK PRIESTORU</span>
              <strong className="ss-kpi-value">{formatAmount(room.balance)} EUR</strong>
              {targetAmount > 0 ? (
                <>
                  <div className="ss-detail-progress-meta">
                    <span>Cieľ {formatAmount(targetAmount)} EUR</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <div className="ss-detail-progress-bar" aria-hidden="true">
                    <span style={{ width: `${Math.max(progress, 6)}%` }} />
                  </div>
                </>
              ) : (
                <span className="ss-detail-kpi-note">Bez nastaveného cieľa</span>
              )}
            </div>
            <div className="ss-kpi-card">
              <span className="ss-kpi-label">ČLENOVIA</span>
              <strong className="ss-kpi-value">{room.members.length}</strong>
              <span className="ss-detail-kpi-note">v tomto priestore</span>
            </div>
            <div className="ss-kpi-card">
              <span className="ss-kpi-label">TRANSAKCIE</span>
              <strong className="ss-kpi-value">{room.transactions.length}</strong>
              <span className="ss-detail-kpi-note">
                {latestTransactionDate ? `naposledy ${formatShortDate(latestTransactionDate)}` : 'bez aktivity'}
              </span>
            </div>
            <div className="ss-kpi-card">
              <span className="ss-kpi-label">NÁKUPY</span>
              <strong className="ss-kpi-value">{(room.checks || []).length}</strong>
              <span className="ss-detail-kpi-note">bloky v priestore</span>
            </div>
          </div>
        </div>
      </div>

      <section className="ss-table-panel ss-detail-main-panel">
        <div className="ss-panel-toolbar ss-detail-toolbar">
          <div className="ss-dashboard-tabs" role="tablist" aria-label="Prepínať detail priestoru">
            <button
              type="button"
              className={tab === 'transactions' ? 'is-active' : ''}
              onClick={() => setTab('transactions')}
            >
              Transakcie
            </button>
            <button
              type="button"
              className={tab === 'members' ? 'is-active' : ''}
              onClick={() => setTab('members')}
            >
              Členovia
            </button>
            {Object.keys(settlement).length > 0 && (
              <button
                type="button"
                className={tab === 'settlement' ? 'is-active' : ''}
                onClick={() => setTab('settlement')}
              >
                Vyrovnanie
              </button>
            )}
            <button
              type="button"
              className={tab === 'shopping' ? 'is-active' : ''}
              onClick={() => setTab('shopping')}
            >
              Nákupy
            </button>
            <button
              type="button"
              className={tab === 'send' ? 'is-active' : ''}
              onClick={() => setTab('send')}
            >
              Poslať platbu
            </button>
          </div>
          <div className="ss-detail-toolbar-meta">
            <span>{room.memberCount || room.members.length} účastníci</span>
          </div>
        </div>

        {tab === 'transactions' && (
          <div className="ss-detail-panel-body">
            <div className="ss-detail-table">
              <div className="ss-detail-table-head ss-transaction-grid">
                <span>DÁTUM</span>
                <span>TYP</span>
                <span>POPIS</span>
                <span>SUMA</span>
              </div>

              {transactionRows.length === 0 && (
                <div className="ss-room-empty">Žiadne transakcie v tomto priestore.</div>
              )}

              {transactionRows.map((tx, i) => {
                const isIncoming = tx.to_iban === room.room_iban;
                const otherIban = isIncoming ? tx.from_iban : tx.to_iban;
                const otherUser = users.find((u) => u.user_iban === otherIban);
                const otherName = otherUser?.name || otherIban;

                return (
                  <div className="ss-detail-table-row ss-transaction-grid" key={tx.id || i}>
                    <span>{formatShortDate(tx.created_at)}</span>
                    <span>{isIncoming ? 'Príjem' : 'Výdaj'}</span>
                    <span>{isIncoming ? `${otherName} → priestor` : `Priestor → ${otherName}`}</span>
                    <strong className={isIncoming ? 'is-positive' : 'is-negative'}>
                      {isIncoming ? '+' : '-'}
                      {formatAmount(tx.amount)} EUR
                    </strong>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === 'members' && (
          <div className="ss-detail-panel-body">
            <div className="ss-detail-member-list">
              {room.members.map((m) => (
                <div className="ss-detail-member-row" key={m.user_iban}>
                  <div className="ss-detail-member-main">
                    <span className="tb-avatar" style={{ background: m.color }}>
                      {m.avatar}
                    </span>
                    <div className="ss-detail-member-copy">
                      <strong>
                        {m.name}
                        <span className="ss-member-role">({m.role === 'owner' ? 'Vlastník' : 'Člen'})</span>
                      </strong>
                      <span>{m.user_iban}</span>
                    </div>
                  </div>
                  <div className="ss-detail-member-meta">
                    {m.spending > 0 && (
                      <span className="ss-spending-badge">{formatAmount(m.spending)} EUR (nákup)</span>
                    )}
                    {isOwner && m.user_iban !== currentUserIban && (
                      <button
                        className="ss-remove-btn"
                        type="button"
                        disabled={removingMember === m.user_iban}
                        onClick={() => handleRemoveMember(m.user_iban)}
                      >
                        {removingMember === m.user_iban ? 'Odstraňujem...' : '✕'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="ss-detail-footer-actions">
              <button className="ss-open-room" type="button" onClick={() => setShowAddMember(true)}>
                + Pozvať člena
              </button>
            </div>
          </div>
        )}

        {tab === 'send' && (
          <div className="ss-detail-panel-body">
            <div className="ss-detail-form-grid">
              <div className="ss-kpi-card ss-detail-info-card">
                <span className="ss-kpi-label">SMER PLATBY</span>
                <select
                  className="ss-input"
                  value={sendDirection}
                  onChange={(e) => setSendDirection(e.target.value)}
                >
                  <option value="to_room">Používateľ → Priestor (vklad)</option>
                  <option value="from_room">Priestor → Používateľ (výber)</option>
                </select>
              </div>

              <div className="ss-kpi-card ss-detail-info-card">
                <span className="ss-kpi-label">ÚČET</span>
                <div className="ss-detail-account-box">
                  {sendDirection === 'to_room' ? `Môj účet (${currentUserIban})` : `Priestor (${room.room_iban})`}
                </div>
              </div>

              <div className="ss-kpi-card ss-detail-info-card ss-detail-send-card">
                <span className="ss-kpi-label">SUMA</span>
                <input
                  className="ss-input"
                  type="number"
                  placeholder="0.00"
                  value={sendAmount}
                  onChange={(e) => setSendAmount(e.target.value)}
                />
                <button
                  className="ss-kpi-cta ss-detail-submit"
                  type="button"
                  disabled={sending || !sendAmount}
                  onClick={handleSend}
                >
                  {sending ? 'Spracovávam...' : 'Potvrdiť platbu'}
                </button>
              </div>
            </div>
          </div>
        )}

        {tab === 'settlement' && (
          <div className="ss-detail-panel-body">
            <div className="ss-settlement-container">
              <div className="ss-settlement-info">
                <h3>Vyrovnanie zostatku priestoru</h3>
                <p className="ss-settlement-description">
                  Zostatok {formatAmount(room.balance)} EUR sa rozdelí medzi všetkých členov v pomere k ich príspevkom.
                </p>
              </div>

              <div className="ss-settlement-breakdown">
                {Object.entries(settlement).map(([memberIban, data]) => {
                  const member = room.members?.find((m) => m.user_iban === memberIban);
                  return (
                    <div className="ss-settlement-row" key={memberIban}>
                      <div className="ss-settlement-member">
                        <span className="tb-avatar" style={{ background: member?.color || '#ccc' }}>
                          {member?.avatar || '?'}
                        </span>
                        <div className="ss-settlement-member-copy">
                          <strong>{member?.name || memberIban}</strong>
                          <span className="ss-settlement-stat">
                            Príspevok: {formatAmount(data.contribution)} EUR
                          </span>
                          <span className="ss-settlement-stat">
                            Nákup: {formatAmount(data.spending)} EUR
                          </span>
                        </div>
                      </div>
                      <div className="ss-settlement-amount">
                        <span className="ss-settlement-percent">{Math.round(data.percentOfTotal * 100)}%</span>
                        <strong className="ss-settlement-refund">
                          +{formatAmount(data.refund)} EUR
                        </strong>
                      </div>
                    </div>
                  );
                })}
              </div>

              {isOwner && room.balance > 0 && (
                <div className="ss-settlement-actions">
                  <button
                    className="ss-kpi-cta ss-settlement-close-btn"
                    type="button"
                    onClick={() => setShowCloseModal(true)}
                  >
                    Vyrovnať a uzatvoriť priestor
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'shopping' && (
          <div className="ss-detail-panel-body">
            <div className="ss-shopping-workflow">
              <div className="ss-shopping-workflow-copy">
                <h3 className="ss-shopping-heading">Nákupy a účtenky</h3>
                <p className="ss-shopping-description">
                  Nahraj účtenku alebo pridaj nákup ručne. Potom len vyber, komu patrí jednotlivá položka.
                </p>
                <div className="ss-shopping-inline-meta">
                  <span>{(room.checks || []).length} nákupy</span>
                  <span>{totalShoppingItems} položiek</span>
                  <span>{unassignedShoppingItems} čaká na priradenie</span>
                </div>
              </div>

              <div className="ss-shopping-action-stack">
                <div className="ss-shopping-action-row">
                  <button className="ss-open-room" type="button" onClick={() => setShowAddCheck(!showAddCheck)}>
                    {showAddCheck ? 'Zrušiť manuálne pridanie' : '+ Pridať nákup'}
                  </button>
                </div>

                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  onChange={handleFileUpload}
                />

                <div
                  className={`ss-shopping-dropzone ${isReceiptDragActive ? 'is-active' : ''}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      fileInputRef.current?.click();
                    }
                  }}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setIsReceiptDragActive(true);
                  }}
                  onDragEnter={(event) => {
                    event.preventDefault();
                    setIsReceiptDragActive(true);
                  }}
                  onDragLeave={(event) => {
                    event.preventDefault();
                    setIsReceiptDragActive(false);
                  }}
                  onDrop={async (event) => {
                    event.preventDefault();
                    setIsReceiptDragActive(false);
                    await processReceiptFile(event.dataTransfer.files?.[0]);
                  }}
                >
                  <span className="ss-shopping-dropzone-icon" aria-hidden="true">⌁</span>
                  <div className="ss-shopping-dropzone-copy">
                    <strong>Skenovať účtenku</strong>
                    <span>Pretiahni ju sem alebo klikni pre upload.</span>
                  </div>
                  <span className={`ss-shopping-dropzone-state ${parsingReceipt ? 'is-loading' : ''}`}>
                    {parsingReceipt ? 'OCR spracovanie...' : 'OCR'}
                  </span>
                </div>
              </div>
            </div>

            {showAddCheck && (
              <div className="ss-shopping-manual-card">
                <div className="ss-shopping-manual-head">
                  <div>
                    <strong>Manuálne pridanie nákupu</strong>
                    <span>Vytvor nákup a položky doplníš alebo priradíš členom hneď potom.</span>
                  </div>
                </div>
                <div className="ss-shopping-manual-form">
                  <input
                    className="ss-input"
                    value={checkLocation}
                    onChange={(e) => setCheckLocation(e.target.value)}
                    placeholder="Miesto nákupu"
                  />
                  <input
                    className="ss-input"
                    type="number"
                    value={checkAmount}
                    onChange={(e) => setCheckAmount(e.target.value)}
                    placeholder="Suma (EUR)"
                  />
                  <button
                    className="ss-kpi-cta ss-detail-submit"
                    onClick={handleAddCheck}
                    disabled={!checkAmount || !checkLocation}
                  >
                    Uložiť nákup
                  </button>
                </div>
              </div>
            )}

            <div className="ss-shopping-card-list">
              {(room.checks || []).length === 0 && (
                <div className="ss-shopping-empty-state">
                  <strong>Zatiaľ tu nie sú žiadne nákupy</strong>
                  <span>Začni manuálnym pridaním alebo nahraj prvú účtenku a systém pripraví položky na rozdelenie.</span>
                </div>
              )}
              {(room.checks || []).map((chk) => (
                <div key={chk.id} className="ss-shopping-card">
                  <div className="ss-shopping-card-head">
                    <div className="ss-shopping-card-main">
                      <div className="ss-shopping-store-line">
                        <strong className="ss-shopping-store">{chk.location}</strong>
                      </div>

                      <div className="ss-shopping-card-meta">
                        <span>{formatShortDate(chk.created_at)}</span>
                        <span>{(chk.items || []).length} položiek</span>
                        <span>
                          {(chk.items || []).filter((item) => !item.user_iban).length > 0
                            ? `${(chk.items || []).filter((item) => !item.user_iban).length} nepriradené`
                            : 'Rozdelené'}
                        </span>
                      </div>
                    </div>

                    <div className="ss-shopping-card-side">
                      <strong className="ss-shopping-total">{formatAmount(chk.amount)} EUR</strong>
                      <button
                        className="ss-shopping-toggle"
                        type="button"
                        onClick={() => setActiveCheckId(chk.id)}
                      >
                        Detail
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </section>

      {activeCheck && (
        <ShoppingCheckModal
          check={activeCheck}
          room={room}
          users={users}
          draftItem={draftItems[activeCheck.id] || { name: '', amount: '' }}
          onClose={() => setActiveCheckId(null)}
          onUpdateDraftItem={updateDraftItem}
          onAddDraftItem={handleAddDraftItem}
          onAssignItem={handleAssignCheckItem}
        />
      )}

      {showAddMember && (
        <AddMemberModal 
          room={room} 
          allUsers={users}
          currentUserIban={currentUserIban}
          onClose={() => setShowAddMember(false)} 
          onAdded={onRefresh} 
        />
      )}
      {showInviteModal && (
        <InviteModal room={room} onClose={() => setShowInviteModal(false)} />
      )}
      {showCloseModal && (
        <div className="ss-modal-backdrop" onClick={() => setShowCloseModal(false)}>
          <div className="ss-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ss-modal-header">
              <h2>Zatvoriť priestor</h2>
              <button className="ss-close-btn" type="button" onClick={() => setShowCloseModal(false)}>x</button>
            </div>
            <div className="ss-modal-body">
              <p style={{ marginBottom: 16, color: 'rgba(255,255,255,0.8)' }}>
                Naozaj chcete zatvoriť tento priestor? Zostatok {formatAmount(room.balance)} EUR 
                sa rozdelí medzi všetkých členov v pomere k ich príspevkom.
              </p>
              <div style={{ background: 'rgba(255,255,255,0.04)', padding: 12, borderRadius: 8, marginBottom: 16 }}>
                <strong style={{ color: '#ffd700', fontSize: 14 }}>Poznámka:</strong>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 6 }}>
                  Túto akciu nie je možné vrátiť. Priestor sa nadobro zatvori.
                </p>
              </div>
            </div>
            <div className="ss-modal-footer" style={{ display: 'flex', gap: 8 }}>
              <button
                className="ss-btn ss-btn-secondary"
                type="button"
                onClick={() => setShowCloseModal(false)}
              >
                Zrušiť
              </button>
              <button
                className="ss-btn ss-btn-danger"
                type="button"
                disabled={closingRoom}
                onClick={handleCloseRoom}
              >
                {closingRoom ? 'Zatvára sa...' : '🔒 Potvrdiť zatvorenie'}
              </button>
            </div>
          </div>
        </div>
      )}
      {showEditNameModal && (
        <div className="ss-modal-backdrop" onClick={() => setShowEditNameModal(false)}>
          <div className="ss-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ss-modal-header">
              <h2>Zmeniť názov priestoru</h2>
              <button className="ss-close-btn" type="button" onClick={() => setShowEditNameModal(false)}>x</button>
            </div>
            <div className="ss-modal-body">
              <input
                className="ss-input"
                type="text"
                placeholder="Názov priestoru"
                value={editedRoomName}
                onChange={(e) => setEditedRoomName(e.target.value)}
              />
            </div>
            <div className="ss-modal-footer" style={{ display: 'flex', gap: 8 }}>
              <button
                className="ss-btn ss-btn-secondary"
                type="button"
                onClick={() => setShowEditNameModal(false)}
              >
                Zrušiť
              </button>
              <button
                className="ss-btn ss-btn-primary"
                type="button"
                onClick={handleEditRoomName}
                disabled={!editedRoomName.trim()}
              >
                Zmeniť názov
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ShoppingCheckModal({
  check,
  room,
  users,
  draftItem,
  onClose,
  onUpdateDraftItem,
  onAddDraftItem,
  onAssignItem,
}) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="ss-modal-backdrop" onClick={onClose}>
      <div
        className="ss-modal ss-shopping-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`shopping-check-title-${check.id}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ss-modal-header ss-shopping-modal-header">
          <div>
            <h2 id={`shopping-check-title-${check.id}`}>{check.location}</h2>
            <p className="ss-shopping-modal-subtitle">
              {formatShortDate(check.created_at)} · {(check.items || []).length} položiek · {formatAmount(check.amount)} EUR
            </p>
          </div>
          <button className="ss-close-btn" type="button" onClick={onClose} aria-label="Zavrieť detail nákupu">×</button>
        </div>

        <div className="ss-modal-body ss-shopping-modal-body">
          <div className="ss-shopping-items">
            {(check.items || []).length === 0 && (
              <div className="ss-shopping-empty-items">
                <strong>Zatiaľ bez položiek</strong>
                <span>Pridaj ich ručne alebo nahraj účtenku s rozpisom.</span>
              </div>
            )}

            {(check.items || []).map((item) => {
              const claimedUser = item.user_iban
                ? users.find((u) => u.user_iban === item.user_iban)
                : null;

              return (
                <div
                  key={item.id}
                  className={`ss-shopping-item ${claimedUser ? 'is-assigned' : 'is-unassigned'}`}
                >
                  <div className="ss-shopping-item-top">
                    <div className="ss-shopping-item-main">
                      <strong className="ss-shopping-item-name">{item.name}</strong>
                      <div className="ss-shopping-item-state">
                        <span className={`ss-shopping-status-pill ${claimedUser ? 'is-success' : 'is-warning'}`}>
                          {claimedUser ? `Priradené: ${claimedUser.name}` : 'Nepriradené'}
                        </span>
                      </div>
                    </div>

                    <strong className="ss-shopping-item-amount">{formatAmount(item.amount)} EUR</strong>
                  </div>

                  <div className="ss-shopping-assignment-row">
                    <span className="ss-shopping-assignment-label">Kto platí</span>
                    <div className="ss-shopping-assignees">
                      <button
                        type="button"
                        className={`ss-shopping-assignee ss-shopping-assignee-neutral ${!item.user_iban ? 'is-active is-warning' : ''}`}
                        onClick={() => onAssignItem(item, null)}
                      >
                        Nepriradené
                      </button>

                      {room.members.map((member) => {
                        const isAssigned = item.user_iban === member.user_iban;
                        return (
                          <button
                            key={member.user_iban}
                            type="button"
                            className={`ss-shopping-assignee ${isAssigned ? 'is-active' : ''}`}
                            onClick={() => onAssignItem(item, member.user_iban)}
                          >
                            <span className="tb-avatar" style={{ background: member.color }}>
                              {member.avatar}
                            </span>
                            <span className="ss-shopping-assignee-name">
                              {(member.name || member.user_iban).split(' ')[0]}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="ss-shopping-inline-add ss-shopping-inline-add-modal">
            <div className="ss-shopping-inline-add-copy">
              <strong>Pridať položku</strong>
              <span>Ak OCR niečo vynechal, doplň názov a sumu ručne.</span>
            </div>
            <div className="ss-shopping-inline-add-form">
              <input
                className="ss-input"
                placeholder="Názov položky..."
                value={draftItem.name || ''}
                onChange={(event) => onUpdateDraftItem(check.id, 'name', event.target.value)}
              />
              <input
                className="ss-input ss-detail-small-input"
                type="number"
                placeholder="Suma"
                value={draftItem.amount || ''}
                onChange={(event) => onUpdateDraftItem(check.id, 'amount', event.target.value)}
              />
              <button
                className="ss-open-room"
                type="button"
                onClick={() => onAddDraftItem(check.id)}
                disabled={!draftItem.name || !draftItem.amount}
              >
                Pridať
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AddMemberModal({ room, allUsers, currentUserIban, onClose, onAdded }) {
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const closeTimerRef = React.useRef(null);

  // Clean up auto-close timeout on unmount
  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  // filter out users already in room
  const availableUsers = allUsers.filter(u => !room.members.some(m => m.user_iban === u.user_iban));

  const handleInvite = async () => {
    if (selectedUserIds.length === 0) return;
    setLoading(true);
    const newResults = [];
    try {
      for (const userId of selectedUserIds) {
        try {
          await createRoomInvite(room.room_iban, userId, currentUserIban);
          newResults.push({ userId, ok: true });
        } catch (err) {
          newResults.push({ userId, ok: false, error: err.message });
        }
      }
      setResults(newResults);
      const anySuccess = newResults.some(r => r.ok);
      if (anySuccess) {
        await onAdded();
      }
      // Keep modal open briefly so user sees results, then auto-close
      closeTimerRef.current = setTimeout(() => onClose(), 1500);
    } catch (err) {
      console.error('Invite flow failed', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleUser = (userId) => {
    if (selectedUserIds.includes(userId)) {
      setSelectedUserIds(selectedUserIds.filter(id => id !== userId));
    } else {
      setSelectedUserIds([...selectedUserIds, userId]);
    }
  };

  return (
    <div className="ss-modal-backdrop" onClick={onClose}>
      <div className="ss-modal" onClick={e => e.stopPropagation()}>
        <div className="ss-modal-header">
          <h2>Pozvat clena</h2>
          <button className="ss-close-btn" type="button" onClick={onClose}>x</button>
        </div>
        <div className="ss-modal-body">
          {results.length > 0 ? (
            <div style={{ marginBottom: 16 }}>
              {results.map((r, i) => {
                const user = allUsers.find(u => u.user_iban === r.userId);
                return (
                  <div key={i} style={{ padding: 6, color: r.ok ? '#00d39a' : '#ff5b7a', fontSize: 13 }}>
                    {user?.name || r.userId}: {r.ok ? 'Pozvanka odoslana ✓' : r.error}
                  </div>
                );
              })}
            </div>
          ) : availableUsers.length === 0 ? (
            <div className="ss-empty">Vsetci pouzivatelia uz su v priestore.</div>
          ) : (
            <>
              <div style={{ maxHeight: 200, overflowY: 'auto', background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: 8, marginBottom: 16 }}>
                {availableUsers.map(u => (
                  <label key={u.user_iban} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 8, cursor: 'pointer', color: 'white' }}>
                    <input type="checkbox" checked={selectedUserIds.includes(u.user_iban)} onChange={() => toggleUser(u.user_iban)} />
                    {u.name || u.user_iban}
                  </label>
                ))}
              </div>
              <button className="ss-btn ss-btn-primary" type="button" style={{ width: '100%' }} disabled={selectedUserIds.length === 0 || loading} onClick={handleInvite}>
                {loading ? 'Posielam pozvanky...' : 'Poslat pozvanky'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function CreateSpaceModal({ onClose, onCreated, allUsers, currentUserIban }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('trip');
  const [targetAmount, setTargetAmount] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const typeOptions = [
    {
      type: 'trip',
      icon: 'T',
      label: 'Vylet',
      blurb: 'Cesty, vikendy a spolocne zazitky',
      image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80',
    },
    {
      type: 'flat',
      icon: 'B',
      label: 'Byvanie',
      blurb: 'Najom, energie a domace vydavky',
      image: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80',
    },
    {
      type: 'gift',
      icon: 'D',
      label: 'Darcek',
      blurb: 'Zbierka na darcek alebo event',
      image: 'https://images.unsplash.com/photo-1512909006721-3d6018887383?auto=format&fit=crop&w=900&q=80',
    },
    {
      type: 'other',
      icon: 'S',
      label: 'Ine',
      blurb: 'Flexibilny priestor pre cokolvek',
      image: 'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?auto=format&fit=crop&w=900&q=80',
    },
  ];
  const inviteCandidates = (allUsers || []).filter((u) => u.user_iban !== currentUserIban);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      // create random IBAN
      const roomIban = `SK${Math.floor(10000000000000000000 + Math.random() * 90000000000000000000)}`;
      await createRoom(roomIban, name, 0, currentUserIban, type);

      // add the creator directly as owner
      await addRoomMember(roomIban, currentUserIban, 'owner');

      // invite selected users (not direct add)
      for (const userId of selectedUserIds) {
        try {
          await createRoomInvite(roomIban, userId, currentUserIban);
        } catch (err) {
          console.warn(`Failed to invite ${userId}:`, err.message);
        }
      }

      // add target sum if exists
      if (targetAmount && Number(targetAmount) > 0) {
        await createGoal(roomIban, name, Number(targetAmount));
      }

      await ensureRoomCover(roomIban);

      await onCreated();
      onClose();
    } catch (err) {
      console.error('Failed to create space', err);
      alert('Chyba pri vytvarani: ' + err.message);
      setLoading(false);
    }
  };

  const toggleUser = (userId) => {
    setSelectedUserIds((current) =>
      current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId]
    );
  };

  return (
    <div className="ss-modal-backdrop" onClick={onClose}>
      <div className="ss-modal ss-create-space-modal" onClick={e => e.stopPropagation()}>
        <div className="ss-modal-header">
          <h2>Novy Shared Space</h2>
          <button className="ss-close-btn" type="button" onClick={onClose}>x</button>
        </div>
        <div className="ss-modal-body">
          <label className="ss-label">Nazov priestoru</label>
          <input className="ss-input" type="text" placeholder="napr. Tatry Trip, Byt Kosicka..." value={name} onChange={e => setName(e.target.value)} />

          <label className="ss-label">Typ</label>
          <div className="ss-type-picker ss-type-picker-rich" style={{ marginBottom: 16 }}>
            {typeOptions.map((t) => (
              <button
                key={t.type}
                className={`ss-type-btn ss-type-card ${type === t.type ? 'active' : ''}`}
                type="button"
                onClick={() => setType(t.type)}
              >
                <span
                  className="ss-type-btn-media"
                  aria-hidden="true"
                  style={{
                    backgroundImage: `linear-gradient(180deg, rgba(9,11,16,0.34) 0%, rgba(9,11,16,0.74) 100%), url("${t.image}")`,
                  }}
                />
                <span className="ss-type-btn-content">
                  <span className="ss-type-btn-badge">{t.icon}</span>
                  <span className="ss-type-btn-title">{t.label}</span>
                  <span className="ss-type-btn-subtitle">{t.blurb}</span>
                </span>
              </button>
            ))}
          </div>

          <label className="ss-label">Cielova suma (nepovinne, v EUR)</label>
          <input className="ss-input" type="number" placeholder="napr. 500" value={targetAmount} onChange={e => setTargetAmount(e.target.value)} style={{ marginBottom: 16 }} />

          <label className="ss-label">Pozvat clenov (dostanu pozvanku)</label>
          <div className="ss-member-picker">
            {inviteCandidates.map((u, index) => {
              const isSelected = selectedUserIds.includes(u.user_iban);
              return (
                <button
                  key={u.user_iban}
                  type="button"
                  className={`ss-member-option ${isSelected ? 'is-selected' : ''}`}
                  onClick={() => toggleUser(u.user_iban)}
                >
                  <span
                    className="ss-member-option-avatar"
                    style={{ background: MEMBER_COLORS[index % MEMBER_COLORS.length] }}
                  >
                    {getInitial(u.name || u.user_iban)}
                  </span>
                  <span className="ss-member-option-copy">
                    <span className="ss-member-option-name">{u.name || u.user_iban}</span>
                    <span className="ss-member-option-meta">
                      {isSelected ? 'Pozvanka bude odoslana' : 'Klepnutim oznacis ucet'}
                    </span>
                  </span>
                  <span className="ss-member-option-mark" aria-hidden="true">
                    {isSelected ? '✓' : '+'}
                  </span>
                </button>
              );
            })}
          </div>

          <button className="ss-btn ss-btn-primary" type="button" style={{ width: '100%' }} disabled={!name.trim() || loading} onClick={handleCreate}>
            {loading ? 'Vytvaram...' : 'Vytvorit priestor'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Notifications Panel ─── */
function NotificationsPanel({ userIban, onClose }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userIban) return;
    try {
      const data = await getNotificationsForUser(userIban);
      setNotifications(data || []);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [userIban]);

  useEffect(() => { load(); }, [load]);

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead(userIban);
      await load();
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await markNotificationRead(id);
      await load();
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const typeIcons = {
    room_invite: '✉',
    room_member_joined: '👤',
    goal_expiring_1h: '⏰',
    room_expiring_1h: '⏰',
  };

  return (
    <div className="ss-modal-backdrop" onClick={onClose}>
      <div className="ss-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <div className="ss-modal-header">
          <h2>Notifikacie {unreadCount > 0 && <span style={{ color: '#ff5b7a', fontSize: 14 }}>({unreadCount} neprecitanych)</span>}</h2>
          <button className="ss-close-btn" type="button" onClick={onClose}>x</button>
        </div>
        <div className="ss-modal-body" style={{ maxHeight: 400, overflowY: 'auto' }}>
          {unreadCount > 0 && (
            <button className="ss-btn ss-btn-secondary" type="button" style={{ width: '100%', marginBottom: 12, fontSize: 12 }} onClick={handleMarkAllRead}>
              Oznacit vsetky ako precitane
            </button>
          )}

          {loading ? (
            <div className="ss-empty">Nacitavam...</div>
          ) : notifications.length === 0 ? (
            <div className="ss-empty">Ziadne notifikacie.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {notifications.map(n => (
                <div
                  key={n.id}
                  onClick={() => !n.is_read && handleMarkRead(n.id)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 8,
                    background: n.is_read ? 'rgba(255,255,255,0.02)' : 'rgba(0,151,230,0.08)',
                    borderLeft: n.is_read ? '3px solid transparent' : '3px solid #0097e6',
                    cursor: n.is_read ? 'default' : 'pointer',
                    transition: 'background 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 16 }}>{typeIcons[n.type] || '🔔'}</span>
                    <strong style={{ color: '#fff', fontSize: 13, flex: 1 }}>{n.title}</strong>
                    <span style={{ color: '#666', fontSize: 11 }}>
                      {new Date(n.created_at).toLocaleString('sk-SK', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                    </span>
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 4, paddingLeft: 24 }}>{n.body}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Invites Panel ─── */
function InvitesPanel({ userIban, onClose, onRefresh, onCountsChanged }) {
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null); // invite id being processed

  const load = useCallback(async () => {
    if (!userIban) return;
    try {
      const data = await getPendingInvitesForUser(userIban);
      setInvites(data || []);
    } catch (err) {
      console.error('Failed to load invites:', err);
    } finally {
      setLoading(false);
    }
  }, [userIban]);

  useEffect(() => { load(); }, [load]);

  const handleAccept = async (inviteId) => {
    setProcessing(inviteId);
    try {
      await acceptRoomInvite(inviteId);
      await load();
      await onRefresh();
      if (onCountsChanged) await onCountsChanged();
    } catch (err) {
      console.error('Accept failed:', err);
      alert('Chyba: ' + err.message);
    } finally {
      setProcessing(null);
    }
  };

  const handleDecline = async (inviteId) => {
    setProcessing(inviteId);
    try {
      await declineRoomInvite(inviteId);
      await load();
      if (onCountsChanged) await onCountsChanged();
    } catch (err) {
      console.error('Decline failed:', err);
      alert('Chyba: ' + err.message);
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="ss-modal-backdrop" onClick={onClose}>
      <div className="ss-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <div className="ss-modal-header">
          <h2>Pozvanky ({invites.length})</h2>
          <button className="ss-close-btn" type="button" onClick={onClose}>x</button>
        </div>
        <div className="ss-modal-body" style={{ maxHeight: 400, overflowY: 'auto' }}>
          {loading ? (
            <div className="ss-empty">Nacitavam...</div>
          ) : invites.length === 0 ? (
            <div className="ss-empty">Ziadne cakajuce pozvanky.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {invites.map(inv => (
                <div key={inv.id} style={{
                  padding: '12px 14px',
                  borderRadius: 10,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}>
                  <div style={{ color: '#fff', fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
                    {inv.room_name || inv.room_iban}
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginBottom: 10 }}>
                    Pozval: {inv.inviter_name || inv.invited_by_user_iban}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      className="ss-btn ss-btn-primary"
                      type="button"
                      style={{ flex: 1, padding: '8px 0', fontSize: 13 }}
                      disabled={processing === inv.id}
                      onClick={() => handleAccept(inv.id)}
                    >
                      {processing === inv.id ? '...' : 'Prijat'}
                    </button>
                    <button
                      className="ss-btn ss-btn-secondary"
                      type="button"
                      style={{ flex: 1, padding: '8px 0', fontSize: 13 }}
                      disabled={processing === inv.id}
                      onClick={() => handleDecline(inv.id)}
                    >
                      {processing === inv.id ? '...' : 'Odmietnut'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── main page ─── */
export default function SharedSpacesWebPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRoomIban, setSelectedRoomIban] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [filterTab, setFilterTab] = useState('all');
  const [sortBy, setSortBy] = useState('latest');
  const [inviteToken, setInviteToken] = useState(null);
  const [inviteRoomIban, setInviteRoomIban] = useState(null);
  const [inviteError, setInviteError] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showInvites, setShowInvites] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingInviteCount, setPendingInviteCount] = useState(0);
  const [currentUserIban, setCurrentUserIban] = useState(() => {
    try { return localStorage.getItem('tatra_current_user_iban') || null; } catch { return null; }
  });

  const handleUserSwitch = (iban) => {
    setCurrentUserIban(iban);
    try { localStorage.setItem('tatra_current_user_iban', iban); } catch { /* noop */ }
  };

  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const result = await loadFullData();
      setData(result);
    } catch (err) {
      console.error('Failed to load data:', err);
      setError(err.message || 'Nepodarilo sa nacitat data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const inviteParam = params.get('invite');

    if (!inviteParam) return;
    const roomIban = parseInviteToken(inviteParam);

    setInviteToken(inviteParam);

    if (!roomIban) {
      setInviteError('Neplatná alebo expirovaná pozvánka.');
      return;
    }

    setInviteRoomIban(roomIban);
  }, []);

  useEffect(() => {
    if (!data?.users?.length) return;
    const validIbans = data.users.map((u) => u.user_iban);
    if (!currentUserIban || !validIbans.includes(currentUserIban)) {
      handleUserSwitch(data.users[0].user_iban);
    }
  }, [data, currentUserIban]);

  const refreshCounts = useCallback(async () => {
    if (!currentUserIban) {
      setUnreadCount(0);
      setPendingInviteCount(0);
      return;
    }
    try {
      const [notifs, invites] = await Promise.all([
        getNotificationsForUser(currentUserIban),
        getPendingInvitesForUser(currentUserIban),
      ]);
      setUnreadCount((notifs || []).filter(n => !n.is_read).length);
      setPendingInviteCount((invites || []).length);
    } catch (err) {
      console.error('Failed to load counts:', err);
    }
  }, [currentUserIban]);

  useEffect(() => {
    refreshCounts();
  }, [refreshCounts]);

  const selectedRoom = data?.rooms?.find((r) => r.room_iban === selectedRoomIban);
  const inviteRoom = inviteRoomIban ? data?.rooms?.find((r) => r.room_iban === inviteRoomIban) : null;
  const inviteUrl = inviteRoom ? buildInviteUrl(inviteRoom.room_iban) : '';

  const usersByIban = useMemo(
    () => new Map((data?.users || []).map((user) => [user.user_iban, user])),
    [data]
  );

  const roomModels = useMemo(() => {
    if (!data?.rooms) return [];

    return data.rooms.map((room) => {
      const balance = Number(room.balance || 0);
      const targetAmount = Number(room.targetAmount || 0);
      const sortedTransactions = [...(room.transactions || [])].sort((a, b) => {
        const aTs = a?.created_at ? new Date(a.created_at).getTime() : 0;
        const bTs = b?.created_at ? new Date(b.created_at).getTime() : 0;
        return bTs - aTs;
      });
      const latestTransaction = sortedTransactions[0] || null;
      const isClosed =
        Boolean(room.closed_at || room.is_closed || room.status === 'closed') ||
        (!sortedTransactions.length && balance <= 0 && room.members.length <= 1);
      const hasPending = !isClosed && targetAmount > 0 && balance > 0 && balance < targetAmount;
      const progress = targetAmount > 0 ? Math.max(0, Math.min((balance / targetAmount) * 100, 100)) : 0;
      const transactionCount = sortedTransactions.length;

      return {
        ...room,
        balance,
        targetAmount,
        isClosed,
        isActive: !isClosed,
        hasPending,
        progress,
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
  }, [data]);

  const activityRows = useMemo(() => {
    return roomModels
      .flatMap((room) =>
        room.transactions.map((tx, index) => {
          const isIncoming = tx.to_iban === room.room_iban;
          const counterpartyIban = isIncoming ? tx.from_iban : tx.to_iban;
          const counterparty = usersByIban.get(counterpartyIban);
          const counterpartyName = counterparty?.name || counterpartyIban || 'Neznámy používateľ';

          return {
            id: `${room.room_iban}-${tx.id || index}`,
            date: tx.created_at,
            roomName: room.name || room.room_iban,
            description: isIncoming
              ? `${counterpartyName} pridal príspevok do priestoru`
              : `${counterpartyName} dostal vyrovnanie z priestoru`,
            amount: Number(tx.amount || 0),
            isPositive: isIncoming,
          };
        })
      )
      .sort((a, b) => {
        const aTs = a.date ? new Date(a.date).getTime() : 0;
        const bTs = b.date ? new Date(b.date).getTime() : 0;
        return bTs - aTs;
      })
      .slice(0, 4);
  }, [roomModels, usersByIban]);

  if (loading) {
    return (
      <SharedSpacesShell>
        <div className="ss-dashboard">
          <BackHeader title="Shared Spaces" onBack={() => router.push('/')} />
          <LoadingState />
        </div>
      </SharedSpacesShell>
    );
  }

  if (error) {
    return (
      <SharedSpacesShell>
        <div className="ss-dashboard">
          <BackHeader title="Shared Spaces" onBack={() => router.push('/')} />
          <ErrorState message={error} onRetry={fetchData} />
        </div>
      </SharedSpacesShell>
    );
  }

  const onInviteCancel = () => {
    setInviteToken(null);
    setInviteRoomIban(null);
    setInviteError(null);
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, '', window.location.pathname);
    }
  };

  const handleInviteAccepted = async (acceptedUserIban) => {
    if (acceptedUserIban) {
      handleUserSwitch(acceptedUserIban);
    }
    await fetchData();
    setSelectedRoomIban(inviteRoom?.room_iban || null);
    onInviteCancel();
  };

  if (inviteToken && !loading) {
    if (inviteError || !inviteRoom) {
      return (
        <SharedSpacesShell>
          <div className="ss-dashboard">
            <BackHeader title="Pozvánka" onBack={onInviteCancel} />
            <ErrorState message={inviteError || 'Pozvánka nebola nájdená.'} onRetry={onInviteCancel} />
          </div>
        </SharedSpacesShell>
      );
    }

    return (
      <SharedSpacesShell>
        <InviteAcceptancePage
          room={inviteRoom}
          users={data?.users || []}
          inviteUrl={inviteUrl}
          inviteError={inviteError}
          onAccept={handleInviteAccepted}
          onCancel={onInviteCancel}
        />
      </SharedSpacesShell>
    );
  }

  const resolvedCurrentUserIban = (data?.users || []).some((user) => user.user_iban === currentUserIban)
    ? currentUserIban
    : data?.users?.[0]?.user_iban || null;
  const myRoomModels = resolvedCurrentUserIban
    ? roomModels.filter((room) => room.members.some((member) => member.user_iban === resolvedCurrentUserIban))
    : roomModels;
  const totalBalance = myRoomModels.reduce((sum, room) => sum + room.balance, 0);
  const activeSpaces = myRoomModels.filter((room) => room.isActive).length;
  const closedSpaces = myRoomModels.length - activeSpaces;
  const pendingSettlements = myRoomModels.filter((room) => room.hasPending).length;
  const visibleActivityRows = activityRows.filter((item) =>
    myRoomModels.some((room) => room.room_iban === item.id.split('-')[0])
  );
  const filteredRooms = [...myRoomModels]
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

  const renderListView = () => (
    <div className="ss-dashboard">
      <div className="ss-dashboard-header">
        <div className="ss-dashboard-title-wrap">
          <div className="ss-dashboard-title-row">
            <h1 className="ss-dashboard-title">SPOLOČNÉ VÝDAVKY</h1>
            <button className="ss-dashboard-refresh" type="button" onClick={fetchData} aria-label="Obnoviť dáta">
              ↻
            </button>
          </div>
        </div>
        <div className="ss-dashboard-actions">
          <div className="ss-dashboard-toolbar">
            <label className="ss-dashboard-user-field">
              <span className="ss-dashboard-toolbar-label">Účet</span>
              <select
                value={resolvedCurrentUserIban || ''}
                onChange={(event) => handleUserSwitch(event.target.value)}
              >
                {(data?.users || []).map((user) => (
                  <option key={user.user_iban} value={user.user_iban}>
                    {user.name || user.user_iban}
                  </option>
                ))}
              </select>
            </label>

            <div className="ss-dashboard-toolbar-divider" aria-hidden="true" />

            <button
              className="ss-dashboard-utility-btn ss-dashboard-utility-btn-pill"
              type="button"
              onClick={() => setShowInvites(true)}
            >
              <span className="ss-dashboard-utility-label">Pozvánky</span>
              {pendingInviteCount > 0 && (
                <span className="ss-dashboard-utility-count">{pendingInviteCount}</span>
              )}
            </button>

            <button
              className="ss-dashboard-utility-btn ss-dashboard-utility-btn-bell"
              type="button"
              aria-label="Notifikácie"
              onClick={() => setShowNotifications(true)}
            >
              <span className="ss-dashboard-bell-icon" aria-hidden="true">
                <span className="ss-dashboard-bell-cap" />
                <span className="ss-dashboard-bell-body" />
                <span className="ss-dashboard-bell-clapper" />
              </span>
              <span className="ss-dashboard-utility-label">Notifikácie</span>
              {unreadCount > 0 && (
                <span className="ss-dashboard-utility-count">{unreadCount}</span>
              )}
            </button>
          </div>

          <button className="ss-dashboard-link" type="button" onClick={() => router.push('/')}>
            Späť na prehľad
          </button>
        </div>
      </div>

      <div className="ss-kpi-row">
        <div className="ss-kpi-card">
          <span className="ss-kpi-label">CELKOVÝ ZOSTATOK</span>
          <strong className="ss-kpi-value">{formatAmount(totalBalance)} EUR</strong>
        </div>
        <div className="ss-kpi-card">
          <span className="ss-kpi-label">AKTÍVNE PRIESTORY</span>
          <strong className="ss-kpi-value">{activeSpaces}</strong>
        </div>
        <div className="ss-kpi-card">
          <span className="ss-kpi-label">ČAKAJÚCE VYROVNANIA</span>
          <strong className="ss-kpi-value">{pendingSettlements}</strong>
        </div>
        <div className="ss-kpi-card">
          <span className="ss-kpi-label">UZAVRETÉ PRIESTORY</span>
          <strong className="ss-kpi-value">{closedSpaces}</strong>
        </div>
        <div className="ss-kpi-cta-wrap">
          <button className="ss-kpi-cta" type="button" onClick={() => setShowCreate(true)}>
            <span>+</span>
            Vytvoriť priestor
          </button>
        </div>
      </div>

      <section className="ss-table-panel">
        <div className="ss-panel-toolbar">
          <div className="ss-dashboard-tabs" role="tablist" aria-label="Filtrovať priestory">
            <button
              type="button"
              className={filterTab === 'all' ? 'is-active' : ''}
              onClick={() => setFilterTab('all')}
            >
              Všetky priestory
            </button>
            <button
              type="button"
              className={filterTab === 'active' ? 'is-active' : ''}
              onClick={() => setFilterTab('active')}
            >
              Aktívne
            </button>
            <button
              type="button"
              className={filterTab === 'closed' ? 'is-active' : ''}
              onClick={() => setFilterTab('closed')}
            >
              Uzavreté
            </button>
          </div>

          <label className="ss-sort-field">
            <span>Zoradiť podľa:</span>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="latest">Posledná aktivita</option>
              <option value="balance">Najvyšší zostatok</option>
              <option value="name">Názov priestoru</option>
            </select>
          </label>
        </div>

        <div className="ss-room-table-wrap">
          <div className="ss-room-table">
            <div className="ss-room-table-head">
              <span>NÁZOV PRIESTORU</span>
              <span>ÚČASTNÍCI</span>
              <span>STAV</span>
              <span>AKTIVITA</span>
              <span>ZOSTATOK</span>
              <span>AKCIA</span>
            </div>

            {filteredRooms.length === 0 && (
              <div className="ss-room-empty">Zatiaľ tu nie sú žiadne priestory.</div>
            )}

            {filteredRooms.map((room) => (
              <div className="ss-room-row" key={room.room_iban}>
                <div className="ss-room-name-cell">
                  <span className="ss-room-letter">{getInitial(room.name || room.room_iban)}</span>
                  <div className="ss-room-name-copy">
                    <strong>{room.name || room.room_iban}</strong>
                    <span>{room.room_iban}</span>
                  </div>
                </div>

                <div className="ss-room-members-cell">
                  {room.members.slice(0, 3).map((member, index) => (
                    <span
                      key={member.user_iban || index}
                      className="tb-avatar"
                      style={{ background: member.color, marginLeft: index === 0 ? 0 : -6 }}
                    >
                      {member.avatar}
                    </span>
                  ))}
                  {room.members.length > 3 && (
                    <span className="tb-avatar ss-room-more-members">+{room.members.length - 3}</span>
                  )}
                  {room.members.length === 0 && <span className="ss-room-members-dash">-</span>}
                </div>

                <div className="ss-room-state-cell">
                  <span className={`ss-state-badge ${room.isClosed ? 'is-closed' : 'is-active'}`}>
                    {room.isClosed ? 'Uzavretý' : 'Aktívny'}
                  </span>
                </div>

                <div className="ss-room-activity-cell">
                  <span>{room.activityLabel}</span>
                  {room.activityHint && (
                    <small className={room.hasPending ? 'is-pending' : ''}>{room.activityHint}</small>
                  )}
                </div>

                <div className="ss-room-balance-cell">
                  <strong>{formatAmount(room.balance)} EUR</strong>
                </div>

                <div className="ss-room-action-cell">
                  <button
                    className="ss-open-room"
                    type="button"
                    onClick={() => setSelectedRoomIban(room.room_iban)}
                  >
                    Zobraziť
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="ss-activity-panel">
        <div className="ss-section-header">
          <h2>POSLEDNÁ AKTIVITA</h2>
          <button className="ss-section-link" type="button">Zobraziť všetku aktivitu</button>
        </div>

        <div className="ss-activity-table-wrap">
          <div className="ss-activity-table">
            <div className="ss-activity-table-head">
              <span>DÁTUM</span>
              <span>PRIESTOR</span>
              <span>POPIS</span>
              <span>SUMA</span>
            </div>

            {visibleActivityRows.length === 0 && (
              <div className="ss-room-empty">Posledná aktivita sa zobrazí po prvých transakciách.</div>
            )}

            {visibleActivityRows.map((item) => (
              <div className="ss-activity-row" key={item.id}>
                <span>{formatShortDate(item.date)}</span>
                <span>{item.roomName}</span>
                <span>{item.description}</span>
                <strong className={item.isPositive ? 'is-positive' : 'is-negative'}>
                  {item.isPositive ? '+' : '-'}
                  {formatAmount(item.amount)} EUR
                </strong>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );

  return (
    <SharedSpacesShell>
      {!selectedRoom ? (
        renderListView()
      ) : (
        <div className="ss-dashboard ss-detail-shell">
          <RoomDetail
            room={selectedRoom}
            users={data.users}
            currentUserIban={resolvedCurrentUserIban}
            onBack={() => setSelectedRoomIban(null)}
            onRefresh={fetchData}
          />
        </div>
      )}

      {showCreate && resolvedCurrentUserIban && (
        <CreateSpaceModal 
          allUsers={data?.users || []} 
          currentUserIban={resolvedCurrentUserIban}
          onClose={() => setShowCreate(false)} 
          onCreated={fetchData} 
        />
      )}

      {showNotifications && resolvedCurrentUserIban && (
        <NotificationsPanel
          userIban={resolvedCurrentUserIban}
          onClose={() => { setShowNotifications(false); refreshCounts(); }}
        />
      )}

      {showInvites && resolvedCurrentUserIban && (
        <InvitesPanel
          userIban={resolvedCurrentUserIban}
          onClose={() => { setShowInvites(false); refreshCounts(); }}
          onRefresh={fetchData}
          onCountsChanged={refreshCounts}
        />
      )}
    </SharedSpacesShell>
  );
}
