import React, { useState, useEffect, useCallback } from 'react';
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
  getGoalsForRoom,
  createGoal,
} from '../src/setup/supabase';
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
import { processDeadlineNotifications } from '../src/setup/deadline-jobs';

/* ─── constants ─── */
const MEMBER_COLORS = ['#52c7bc', '#50a9ec', '#557fe8', '#c8b88f', '#54c36f', '#f26a4f', '#db02b5', '#f0da0a'];

/* ─── helpers ─── */
function formatAmount(n) {
  return Number(n).toLocaleString('sk-SK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getInitial(name) {
  return name ? name.charAt(0).toUpperCase() : '?';
}

/* ─── data loading ─── */
async function loadFullData() {
  const [users, rooms] = await Promise.all([getUsers(), getRooms()]);

  const enrichedRooms = await Promise.all(
    rooms.map(async (room) => {
      const members = await getRoomMembers(room.room_iban);
      const transactions = await getTransactionsForRoom(room.room_iban);
      const goals = await getGoalsForRoom(room.room_iban);

      // enrich members with user info
      const enrichedMembers = members.map((m, i) => {
        const user = users.find((u) => u.user_iban === m.user_iban);
        return {
          ...m,
          name: user?.name || user?.user_iban || m.user_iban,
          avatar: getInitial(user?.name || m.user_iban),
          color: MEMBER_COLORS[i % MEMBER_COLORS.length],
          userBalance: user?.balance || 0,
        };
      });

      return {
        ...room,
        members: enrichedMembers,
        transactions,
        memberCount: enrichedMembers.length,
        targetAmount: goals.length > 0 ? goals[0].amount : null,
      };
    })
  );

  return { users, rooms: enrichedRooms };
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

  return (
    <div className="ss-detail">
      <BackHeader title={room.name || `Room ${room.room_iban}`} onBack={onBack} />

      {/* summary bar */}
      <div className="ss-summary-bar">
        <div className="ss-summary-item">
          <span className="ss-summary-label">Zostatok priestoru</span>
          <strong className="ss-summary-value">
            {formatAmount(room.balance)} EUR
            {room.targetAmount && <span style={{ color: '#8e9095', fontWeight: 500, fontSize: 14 }}> / {formatAmount(room.targetAmount)} EUR</span>}
          </strong>
        </div>
        <div className="ss-summary-divider" />
        <div className="ss-summary-item">
          <span className="ss-summary-label">Clenovia</span>
          <strong className="ss-summary-value">{room.members.length}</strong>
        </div>
        <div className="ss-summary-divider" />
        <div className="ss-summary-item">
          <span className="ss-summary-label">Transakcie</span>
          <strong className="ss-summary-value">{room.transactions.length}</strong>
        </div>
      </div>

      {/* tabs */}
      <div className="ss-tabs">
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
          Clenovia
        </button>
        <button
          type="button"
          className={tab === 'send' ? 'is-active' : ''}
          onClick={() => setTab('send')}
        >
          Poslat platbu
        </button>
      </div>

      {/* transactions tab */}
      {tab === 'transactions' && (
        <div className="ss-tab-panel">
          {room.transactions.length === 0 && (
            <div className="ss-empty">Ziadne transakcie v tomto priestore.</div>
          )}
          <div className="ss-expense-list">
            {room.transactions.map((tx, i) => {
              const isIncoming = tx.to_iban === room.room_iban;
              const otherIban = isIncoming ? tx.from_iban : tx.to_iban;
              const otherUser = users.find((u) => u.user_iban === otherIban);
              const otherName = otherUser?.name || otherIban;

              return (
                <div className="ss-expense-row" key={tx.id || i}>
                  <div className="ss-expense-main">
                    <span className="ss-expense-desc">
                      {isIncoming ? `${otherName} -- priestor` : `Priestor -- ${otherName}`}
                    </span>
                    <span className="ss-expense-meta">
                      {isIncoming ? 'Prijem do priestoru' : 'Vydaj z priestoru'}
                      {tx.time ? ` · ${new Date(tx.time).toLocaleDateString('sk-SK')}` : ''}
                    </span>
                  </div>
                  <div className="ss-expense-amount">
                    <strong
                      style={{
                        color: isIncoming ? 'var(--tb-green, #00d39a)' : '#ff5b7a',
                      }}
                    >
                      {isIncoming ? '+' : '-'}
                      {formatAmount(tx.amount)} EUR
                    </strong>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* members tab */}
      {tab === 'members' && (
        <div className="ss-tab-panel">
          <div className="ss-balance-chart">
            {room.members.map((m) => {
              const maxBal = Math.max(...room.members.map((mm) => Math.abs(mm.userBalance || 0)), 1);
              const pct = (Math.abs(m.userBalance || 0) / maxBal) * 100;
              return (
                <div className="ss-balance-row" key={m.user_iban}>
                  <span className="tb-avatar" style={{ background: m.color }}>
                    {m.avatar}
                  </span>
                  <span className="ss-balance-name">{m.name}</span>
                  <div className="ss-balance-bar-wrap">
                    <div
                      className={`ss-balance-bar ${(m.userBalance || 0) >= 0 ? 'positive' : 'negative'}`}
                      style={{ width: `${Math.max(pct, 4)}%` }}
                    />
                  </div>
                  <span
                    className={`ss-balance-amount ${(m.userBalance || 0) >= 0 ? 'positive' : 'negative'}`}
                  >
                    {formatAmount(m.userBalance || 0)} EUR
                  </span>
                </div>
              );
            })}
          </div>
          <button 
            className="ss-btn ss-btn-secondary" 
            type="button" 
            style={{ width: '100%', marginTop: 16 }} 
            onClick={() => setShowAddMember(true)}
          >
            + Pozvat clena
          </button>
        </div>
      )}

      {/* send tab */}
      {tab === 'send' && (
        <div className="ss-tab-panel">
          <div className="ss-add-expense-form">
            <label className="ss-label">Smer platby</label>
            <select
              className="ss-input"
              value={sendDirection}
              onChange={(e) => setSendDirection(e.target.value)}
            >
              <option value="to_room">Pouzivatel -- Priestor (vklad)</option>
              <option value="from_room">Priestor -- Pouzivatel (vyber)</option>
            </select>

            <label className="ss-label">
              {sendDirection === 'to_room' ? 'Z vasho uctu do priestoru' : 'Z priestoru na vas ucet'}
            </label>
            <div style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.05)', borderRadius: 6, marginBottom: 16, color: '#fff' }}>
              Moj ucet ({currentUserIban})
            </div>

            <label className="ss-label">Suma (EUR)</label>
            <input
              className="ss-input"
              type="number"
              placeholder="0.00"
              value={sendAmount}
              onChange={(e) => setSendAmount(e.target.value)}
            />

            <button
              className="ss-btn ss-btn-primary"
              type="button"
              style={{ width: '100%', marginTop: 8 }}
              disabled={sending || !sendAmount}
              onClick={handleSend}
            >
              {sending ? 'Spracovavam...' : 'Potvrdit platbu'}
            </button>
          </div>
        </div>
      )}

      {/* members strip */}
      <div className="ss-members-strip">
        <span className="ss-members-label">IBAN priestoru:</span>
        <span style={{ color: '#b8babf', fontSize: 13, fontFamily: 'monospace' }}>{room.room_iban}</span>
      </div>

      {showAddMember && (
        <AddMemberModal 
          room={room} 
          allUsers={users}
          currentUserIban={currentUserIban}
          onClose={() => setShowAddMember(false)} 
          onAdded={onRefresh} 
        />
      )}
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

  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      // create random IBAN
      const roomIban = `SK${Math.floor(10000000000000000000 + Math.random() * 90000000000000000000)}`;
      await createRoom(roomIban, name, 0, currentUserIban, type);

      // add the creator directly as a member
      await addRoomMember(roomIban, currentUserIban);

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

      await onCreated();
      onClose();
    } catch (err) {
      console.error('Failed to create space', err);
      alert('Chyba pri vytvarani: ' + err.message);
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
          <h2>Novy Shared Space</h2>
          <button className="ss-close-btn" type="button" onClick={onClose}>x</button>
        </div>
        <div className="ss-modal-body">
          <label className="ss-label">Nazov priestoru</label>
          <input className="ss-input" type="text" placeholder="napr. Tatry Trip, Byt Kosicka..." value={name} onChange={e => setName(e.target.value)} />

          <label className="ss-label">Typ</label>
          <div className="ss-type-picker" style={{ marginBottom: 16 }}>
            {[
              { type: 'trip', icon: 'T', label: 'Vylet' },
              { type: 'flat', icon: 'B', label: 'Byvanie' },
              { type: 'gift', icon: 'D', label: 'Darcek' },
              { type: 'other', icon: 'S', label: 'Ine' },
            ].map(t => (
              <button key={t.type} className={`ss-type-btn ${type === t.type ? 'active' : ''}`} type="button" onClick={() => setType(t.type)} style={type === t.type ? { borderColor: 'var(--tb-blue)', background: 'rgba(0,151,230,0.1)' } : {}}>
                <span>{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>

          <label className="ss-label">Cielova suma (nepovinne, v EUR)</label>
          <input className="ss-input" type="number" placeholder="napr. 500" value={targetAmount} onChange={e => setTargetAmount(e.target.value)} style={{ marginBottom: 16 }} />

          <label className="ss-label">Pozvat clenov (dostanu pozvanku)</label>
          <div style={{ maxHeight: 150, overflowY: 'auto', background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: 8, marginBottom: 16 }}>
            {allUsers && allUsers.filter(u => u.user_iban !== currentUserIban).map(u => (
              <label key={u.user_iban} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 8, cursor: 'pointer', color: 'white' }}>
                <input type="checkbox" checked={selectedUserIds.includes(u.user_iban)} onChange={() => toggleUser(u.user_iban)} />
                {u.name || u.user_iban}
              </label>
            ))}
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
  const [showNotifications, setShowNotifications] = useState(false);
  const [showInvites, setShowInvites] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingInviteCount, setPendingInviteCount] = useState(0);
  const [processingDeadlines, setProcessingDeadlines] = useState(false);

  // Current user selection — persisted in localStorage so it survives reloads.
  // Defaults to null; user must pick from the loaded user list.
  const [currentUserIban, setCurrentUserIban] = useState(() => {
    try { return localStorage.getItem('tatra_current_user_iban') || null; } catch { return null; }
  });

  const handleUserSwitch = (iban) => {
    setCurrentUserIban(iban);
    try { localStorage.setItem('tatra_current_user_iban', iban); } catch { /* noop */ }
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
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

  // Validate currentUserIban against loaded users.
  // If the stored IBAN is not in the user list, reset to first available user.
  // If no users exist, reset to null.
  useEffect(() => {
    if (!data?.users?.length) return;
    const validIbans = data.users.map(u => u.user_iban);
    if (!currentUserIban || !validIbans.includes(currentUserIban)) {
      handleUserSwitch(data.users[0].user_iban);
    }
  }, [data]);

  const refreshCounts = useCallback(async () => {
    if (!currentUserIban) return;
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

  const handleProcessDeadlines = async () => {
    setProcessingDeadlines(true);
    try {
      const result = await processDeadlineNotifications();
      const totalGoals = result.goals?.processed || 0;
      const totalRooms = result.rooms?.processed || 0;
      alert(`Spracovane: ${totalGoals} cielov, ${totalRooms} priestorov`);
      await refreshCounts();
    } catch (err) {
      console.error('Deadline processing failed:', err);
      alert('Chyba: ' + err.message);
    } finally {
      setProcessingDeadlines(false);
    }
  };

  const selectedRoom = data?.rooms?.find((r) => r.room_iban === selectedRoomIban);

  if (loading) {
    return (
      <div className="ss-page">
        <div className="ss-container">
          <BackHeader title="Shared Spaces" onBack={() => router.push('/')} />
          <LoadingState />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ss-page">
        <div className="ss-container">
          <BackHeader title="Shared Spaces" onBack={() => router.push('/')} />
          <ErrorState message={error} onRetry={fetchData} />
        </div>
      </div>
    );
  }

  // Filter rooms to only those where the selected user is a member
  const myRooms = currentUserIban
    ? data.rooms.filter(r => r.members.some(m => m.user_iban === currentUserIban))
    : data.rooms;

  const totalBalance = myRooms.reduce((a, r) => a + (r.balance || 0), 0);
  const totalTransactions = myRooms.reduce((a, r) => a + r.transactions.length, 0);

  return (
    <div className="ss-page">
      <div className="ss-container">
        {!selectedRoom ? (
          <>
            {/* Header with user selector, notification bell and invites button */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <BackHeader title="Shared Spaces" onBack={() => router.push('/')} />
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', paddingRight: 4 }}>
                {/* Current user selector */}
                <select
                  value={currentUserIban || ''}
                  onChange={(e) => handleUserSwitch(e.target.value)}
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 10,
                    padding: '7px 12px',
                    color: '#fff',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    maxWidth: 200,
                  }}
                >
                  {(data?.users || []).map(u => (
                    <option key={u.user_iban} value={u.user_iban} style={{ background: '#1a1d22', color: '#fff' }}>
                      {u.name || u.user_iban}
                    </option>
                  ))}
                </select>
                {/* Invites button */}
                <button
                  type="button"
                  onClick={() => { setShowInvites(true); }}
                  title="Pozvanky"
                  style={{
                    position: 'relative',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 10,
                    padding: '7px 14px',
                    cursor: 'pointer',
                    color: '#fff',
                    fontSize: 13,
                    fontWeight: 600,
                    transition: 'background 0.2s',
                  }}
                >
                  ✉ Pozvanky
                  {pendingInviteCount > 0 && (
                    <span style={{
                      position: 'absolute', top: -6, right: -6,
                      background: '#ff5b7a', color: '#fff', fontSize: 10, fontWeight: 800,
                      borderRadius: '50%', width: 18, height: 18,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>{pendingInviteCount}</span>
                  )}
                </button>

                {/* Notification bell */}
                <button
                  type="button"
                  onClick={() => { setShowNotifications(true); }}
                  title="Notifikacie"
                  style={{
                    position: 'relative',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 10,
                    width: 40, height: 40,
                    cursor: 'pointer',
                    fontSize: 18,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'background 0.2s',
                  }}
                >
                  🔔
                  {unreadCount > 0 && (
                    <span style={{
                      position: 'absolute', top: -4, right: -4,
                      background: '#ff5b7a', color: '#fff', fontSize: 10, fontWeight: 800,
                      borderRadius: '50%', minWidth: 18, height: 18, padding: '0 4px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>{unreadCount}</span>
                  )}
                </button>

                {/* Deadline processing trigger (testing) */}
                <button
                  type="button"
                  onClick={handleProcessDeadlines}
                  disabled={processingDeadlines}
                  title="Spracovat deadlines (testing)"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 10,
                    width: 40, height: 40,
                    cursor: processingDeadlines ? 'wait' : 'pointer',
                    fontSize: 16,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    opacity: processingDeadlines ? 0.5 : 1,
                    transition: 'background 0.2s, opacity 0.2s',
                  }}
                >
                  ⚙
                </button>
              </div>
            </div>

            <div className="ss-overview-bar">
              <div className="ss-overview-stat">
                <span>Celkovy zostatok</span>
                <strong>{formatAmount(totalBalance)} EUR</strong>
              </div>
              <div className="ss-overview-stat">
                <span>Moje priestory</span>
                <strong>{myRooms.length}</strong>
              </div>
              <div className="ss-overview-stat">
                <span>Celkom transakcii</span>
                <strong>{totalTransactions}</strong>
              </div>
            </div>

            <div className="ss-create-row">
              <button className="ss-btn ss-btn-create" type="button" onClick={() => setShowCreate(true)}>
                + Vytvorit novy priestor
              </button>
            </div>

            <div className="ss-space-list">
              {myRooms.map((room) => (
                <RoomCard
                  key={room.room_iban}
                  room={room}
                  onClick={() => setSelectedRoomIban(room.room_iban)}
                />
              ))}
              {myRooms.length === 0 && (
                <div className="ss-empty">Ziadne priestory pre tohto pouzivatela.</div>
              )}
            </div>
          </>
        ) : (
          <RoomDetail
            room={selectedRoom}
            users={data.users}
            currentUserIban={currentUserIban}
            onBack={() => setSelectedRoomIban(null)}
            onRefresh={fetchData}
          />
        )}
      </div>

      {showCreate && currentUserIban && (
        <CreateSpaceModal 
          allUsers={data?.users || []} 
          currentUserIban={currentUserIban}
          onClose={() => setShowCreate(false)} 
          onCreated={fetchData} 
        />
      )}

      {showNotifications && currentUserIban && (
        <NotificationsPanel
          userIban={currentUserIban}
          onClose={() => { setShowNotifications(false); refreshCounts(); }}
        />
      )}

      {showInvites && currentUserIban && (
        <InvitesPanel
          userIban={currentUserIban}
          onClose={() => { setShowInvites(false); refreshCounts(); }}
          onRefresh={fetchData}
          onCountsChanged={refreshCounts}
        />
      )}
    </div>
  );
}
