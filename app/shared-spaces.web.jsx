import React, { useState, useEffect, useCallback } from 'react';
import { router } from 'expo-router';
import '../src/web-shell/bank-shell.css';
import {
  supabase,
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

/* ─── constants ─── */
const MEMBER_COLORS = ['#52c7bc', '#50a9ec', '#557fe8', '#c8b88f', '#54c36f', '#f26a4f', '#db02b5', '#f0da0a'];
const CURRENT_USER_IBAN = '01'; // Mock logged-in user

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

function RoomDetail({ room, users, onBack, onRefresh }) {
  const [tab, setTab] = useState('transactions');
  const [sending, setSending] = useState(false);
  const [sendAmount, setSendAmount] = useState('');
  const [showSendForm, setShowSendForm] = useState(false);
  const [sendDirection, setSendDirection] = useState('to_room'); // 'to_room' or 'from_room'
  const [showAddMember, setShowAddMember] = useState(false);

  const handleSend = async () => {
    if (!sendAmount || Number(sendAmount) <= 0) return;
    setSending(true);
    try {
      if (sendDirection === 'to_room') {
        await sendToRoom(CURRENT_USER_IBAN, room.room_iban, Number(sendAmount));
      } else {
        await sendFromRoom(room.room_iban, CURRENT_USER_IBAN, Number(sendAmount));
      }
      setSendAmount('');
      setShowSendForm(false);
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
                      {tx.created_at ? ` · ${new Date(tx.created_at).toLocaleDateString('sk-SK')}` : ''}
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
              Moj ucet ({CURRENT_USER_IBAN})
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
          onClose={() => setShowAddMember(false)} 
          onAdded={onRefresh} 
        />
      )}
    </div>
  );
}

function AddMemberModal({ room, allUsers, onClose, onAdded }) {
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [loading, setLoading] = useState(false);

  // filter out users already in room
  const availableUsers = allUsers.filter(u => !room.members.some(m => m.user_iban === u.user_iban));

  const handleAdd = async () => {
    if (selectedUserIds.length === 0) return;
    setLoading(true);
    try {
      for (const userId of selectedUserIds) {
        await addRoomMember(room.room_iban, userId);
      }
      await onAdded();
      onClose();
    } catch (err) {
      console.error('Failed to add members', err);
      alert('Chyba pri pridavani: ' + err.message);
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
          {availableUsers.length === 0 ? (
            <div className="ss-empty">Vsetci pouzivatelia uz su v priestore.</div>
          ) : (
            <div style={{ maxHeight: 200, overflowY: 'auto', background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: 8, marginBottom: 16 }}>
              {availableUsers.map(u => (
                <label key={u.user_iban} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 8, cursor: 'pointer', color: 'white' }}>
                  <input type="checkbox" checked={selectedUserIds.includes(u.user_iban)} onChange={() => toggleUser(u.user_iban)} />
                  {u.name || u.user_iban}
                </label>
              ))}
            </div>
          )}

          <button className="ss-btn ss-btn-primary" type="button" style={{ width: '100%' }} disabled={selectedUserIds.length === 0 || loading} onClick={handleAdd}>
            {loading ? 'Pridavam...' : 'Pridat vybranych'}
          </button>
        </div>
      </div>
    </div>
  );
}

function CreateSpaceModal({ onClose, onCreated, allUsers }) {
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
      await createRoom(roomIban, name, 0);

      // add selected members (and the current user automatically)
      const membersToAdd = [...new Set([CURRENT_USER_IBAN, ...selectedUserIds])];
      for (const userId of membersToAdd) {
        await addRoomMember(roomIban, userId);
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

          <label className="ss-label">Pozvat clenov z kontaktov</label>
          <div style={{ maxHeight: 150, overflowY: 'auto', background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: 8, marginBottom: 16 }}>
            {allUsers && allUsers.filter(u => u.user_iban !== CURRENT_USER_IBAN).map(u => (
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

/* ─── main page ─── */
export default function SharedSpacesWebPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRoomIban, setSelectedRoomIban] = useState(null);
  const [showCreate, setShowCreate] = useState(false);

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

  const totalBalance = data.rooms.reduce((a, r) => a + (r.balance || 0), 0);
  const totalTransactions = data.rooms.reduce((a, r) => a + r.transactions.length, 0);

  return (
    <div className="ss-page">
      <div className="ss-container">
        {!selectedRoom ? (
          <>
            <BackHeader title="Shared Spaces" onBack={() => router.push('/')} />

            <div className="ss-overview-bar">
              <div className="ss-overview-stat">
                <span>Celkovy zostatok</span>
                <strong>{formatAmount(totalBalance)} EUR</strong>
              </div>
              <div className="ss-overview-stat">
                <span>Aktivne priestory</span>
                <strong>{data.rooms.length}</strong>
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
              {data.rooms.map((room) => (
                <RoomCard
                  key={room.room_iban}
                  room={room}
                  onClick={() => setSelectedRoomIban(room.room_iban)}
                />
              ))}
              {data.rooms.length === 0 && (
                <div className="ss-empty">Ziadne priestory.</div>
              )}
            </div>
          </>
        ) : (
          <RoomDetail
            room={selectedRoom}
            users={data.users}
            onBack={() => setSelectedRoomIban(null)}
            onRefresh={fetchData}
          />
        )}
      </div>

      {showCreate && (
        <CreateSpaceModal 
          allUsers={data?.users || []} 
          onClose={() => setShowCreate(false)} 
          onCreated={fetchData} 
        />
      )}
    </div>
  );
}
