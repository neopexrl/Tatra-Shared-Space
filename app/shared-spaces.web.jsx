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
  getGoalsForRoom,
  createGoal,
  getChecks,
  getCheckListItems,
  createCheck,
  addCheckItem,
  getReminders,
  createReminder,
  toggleReminder,
  batchAddCheckItems,
  toggleCheckItemClaim,
} from '../src/setup/supabase';
import { processDocumentBase64 } from '../src/utils/gemini-parser';

/* ─── constants ─── */
const MEMBER_COLORS = ['#52c7bc', '#50a9ec', '#557fe8', '#c8b88f', '#54c36f', '#f26a4f', '#db02b5', '#f0da0a'];
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

      // get new data
      const checks = await getChecks(room.room_iban);
      const reminders = await getReminders(room.room_iban);
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
        reminders,
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
        <span className="tb-icon cart" />
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
            href={`#${item}`}
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
          href={`#${item}`}
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
  const [showSendForm, setShowSendForm] = useState(false);
  const [sendDirection, setSendDirection] = useState('to_room'); // 'to_room' or 'from_room'
  const [showAddMember, setShowAddMember] = useState(false);

  const [showAddCheck, setShowAddCheck] = useState(false);
  const [checkLocation, setCheckLocation] = useState('');
  const [checkAmount, setCheckAmount] = useState('');
  const [reminderText, setReminderText] = useState('');
  const [parsingReceipt, setParsingReceipt] = useState(false);
  const fileInputRef = React.useRef(null);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setParsingReceipt(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64String = reader.result.split(',')[1];
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
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      setParsingReceipt(false);
    }
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

  const handleAddReminder = async (e) => {
    e.preventDefault();
    if (!reminderText) return;
    await createReminder(room.room_iban, currentUserIban, reminderText);
    setReminderText('');
    await onRefresh();
  };

  const handleToggleReminder = async (rem) => {
    await toggleReminder(rem.id, !rem.is_completed);
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
          className={tab === 'shopping' ? 'is-active' : ''}
          onClick={() => setTab('shopping')}
        >
          Nakupy
        </button>
        <button
          type="button"
          className={tab === 'reminders' ? 'is-active' : ''}
          onClick={() => setTab('reminders')}
        >
          Pripomienky
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
              return (
                <div className="ss-balance-row" key={m.user_iban} style={{ padding: '8px 0' }}>
                  <span className="tb-avatar" style={{ background: m.color }}>
                    {m.avatar}
                  </span>
                  <span className="ss-balance-name" style={{ flex: 1, fontSize: '16px' }}>{m.name}</span>
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

      {/* shopping tab */}
      {tab === 'shopping' && (
        <div className="ss-tab-panel">
          <div style={{ marginBottom: 16 }}>
            <button className="ss-btn ss-btn-secondary" onClick={() => setShowAddCheck(!showAddCheck)} style={{ width: '100%', marginBottom: 8 }}>
              {showAddCheck ? 'Zrusit' : '+ Pridat nakup (Manualne)'}
            </button>
            <input type="file" accept="image/*" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileUpload} />
            <button className="ss-btn ss-btn-primary" onClick={() => fileInputRef.current?.click()} style={{ width: '100%' }} disabled={parsingReceipt}>
              {parsingReceipt ? 'OSKENOVAT BLOK (Spracovavam...)' : 'OSKENOVAT BLOK (FOTO)'}
            </button>
          </div>
          {showAddCheck && (
            <div className="ss-add-expense-form" style={{ marginBottom: 20 }}>
              <label className="ss-label">Miesto nakupu (Obchod)</label>
              <input className="ss-input" value={checkLocation} onChange={e => setCheckLocation(e.target.value)} placeholder="Tesco, Billa..." />
              <label className="ss-label">Suma (EUR)</label>
              <input className="ss-input" type="number" value={checkAmount} onChange={e => setCheckAmount(e.target.value)} placeholder="0.00" />
              <button className="ss-btn ss-btn-primary" onClick={handleAddCheck} style={{ width: '100%', marginTop: 8 }} disabled={!checkAmount || !checkLocation}>
                Ulozit nakup
              </button>
            </div>
          )}
          <div className="ss-expense-list">
            {(room.checks || []).length === 0 && <div className="ss-empty">Ziadne nakupy.</div>}
            {(room.checks || []).map(chk => (
              <div key={chk.id} style={{ background: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 8, marginBottom: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <strong style={{ color: '#fff' }}>{chk.location}</strong>
                  <strong style={{ color: 'var(--tb-green)' }}>{formatAmount(chk.amount)} EUR</strong>
                </div>
                <div style={{ paddingLeft: 12, borderLeft: '2px solid rgba(255,255,255,0.1)' }}>
                  {(chk.items || []).map(item => {
                    const claimedUser = item.user_iban ? users.find(u => u.user_iban === item.user_iban) : null;
                    const isMine = item.user_iban === currentUserIban;
                    return (
                      <div 
                        key={item.id} 
                        style={{ 
                          display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#aaa', marginTop: 4, 
                          cursor: 'pointer', padding: '4px 6px', background: isMine ? 'rgba(0,211,154,0.1)' : 'transparent', 
                          borderRadius: 4, alignItems: 'center'
                        }}
                        onClick={async () => {
                          await toggleCheckItemClaim(item.id, currentUserIban, item.user_iban);
                          onRefresh();
                        }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: isMine ? 1 : 0.8, color: isMine ? '#fff' : '#aaa' }}>
                          <span style={{ 
                            width: 16, height: 16, borderRadius: '50%', background: claimedUser ? 'var(--tb-blue)' : '#444', 
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#fff' 
                          }}>
                            {claimedUser ? getInitial(claimedUser.name || claimedUser.user_iban) : ''}
                          </span>
                          {item.name}
                        </span>
                        <span style={{ color: isMine ? '#fff' : '#aaa' }}>{formatAmount(item.amount)} EUR</span>
                      </div>
                    );
                  })}
                  <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                    <input className="ss-input" placeholder="Nova polozka..." id={`item-name-${chk.id}`} style={{ padding: '6px 10px', minHeight: 'unset', fontSize: 13 }} />
                    <input className="ss-input" type="number" placeholder="Suma" id={`item-amt-${chk.id}`} style={{ width: 80, padding: '6px 10px', minHeight: 'unset', fontSize: 13 }} />
                    <button className="ss-btn ss-btn-secondary" style={{ padding: '4px 12px', minHeight: 'unset', fontSize: 13 }} onClick={async () => {
                      const nameInput = document.getElementById(`item-name-${chk.id}`);
                      const amtInput = document.getElementById(`item-amt-${chk.id}`);
                      if (!nameInput.value || !amtInput.value) return;
                      await addCheckItem(chk.id, nameInput.value, parseFloat(amtInput.value), currentUserIban);
                      nameInput.value = '';
                      amtInput.value = '';
                      onRefresh();
                    }}>+</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* reminders tab */}
      {tab === 'reminders' && (
        <div className="ss-tab-panel">
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <input 
              className="ss-input" 
              placeholder="Napis pripomienku..." 
              value={reminderText}
              onChange={e => setReminderText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAddReminder(e); }}
            />
            <button className="ss-btn ss-btn-primary" onClick={handleAddReminder}>Pridat</button>
          </div>
          <div className="ss-expense-list">
            {(room.reminders || []).length === 0 && <div className="ss-empty">Ziadne pripomienky.</div>}
            {(room.reminders || []).map(rem => (
              <div 
                key={rem.id} 
                style={{ 
                  display: 'flex', alignItems: 'center', padding: '12px 16px', background: 'rgba(255,255,255,0.03)', 
                  borderRadius: 8, marginBottom: 8, cursor: 'pointer', opacity: rem.is_completed ? 0.5 : 1
                }}
                onClick={() => handleToggleReminder(rem)}
              >
                <div style={{ 
                  width: 18, height: 18, borderRadius: 4, border: '2px solid var(--tb-blue)', 
                  marginRight: 12, background: rem.is_completed ? 'var(--tb-blue)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  {rem.is_completed && <span style={{ color: '#fff', fontSize: 12 }}>✓</span>}
                </div>
                <span style={{ color: '#fff', textDecoration: rem.is_completed ? 'line-through' : 'none' }}>
                  {rem.message}
                </span>
              </div>
            ))}
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
      await createRoom(roomIban, name, 0);

      // add selected members (and the current user automatically)
      const membersToAdd = [...new Set([currentUserIban, ...selectedUserIds])];
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

/* ─── main page ─── */
export default function SharedSpacesWebPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRoomIban, setSelectedRoomIban] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [filterTab, setFilterTab] = useState('all');
  const [sortBy, setSortBy] = useState('latest');

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

  const selectedRoom = data?.rooms?.find((r) => r.room_iban === selectedRoomIban);
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

  const currentUser = data.users?.[0];
  const currentUserIban = currentUser?.user_iban;
  const totalBalance = roomModels.reduce((sum, room) => sum + room.balance, 0);
  const activeSpaces = roomModels.filter((room) => room.isActive).length;
  const closedSpaces = roomModels.length - activeSpaces;
  const pendingSettlements = roomModels.filter((room) => room.hasPending).length;
  const filteredRooms = [...roomModels]
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
        <button className="ss-dashboard-link" type="button" onClick={() => router.push('/')}>
          Späť na prehľad
        </button>
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
              <span />
              <span />
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

                <div className="ss-room-menu-cell">
                  <button className="ss-kebab" type="button" aria-label="Ďalšie možnosti">
                    ⋮
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
              <span />
            </div>

            {activityRows.length === 0 && (
              <div className="ss-room-empty">Posledná aktivita sa zobrazí po prvých transakciách.</div>
            )}

            {activityRows.map((item) => (
              <div className="ss-activity-row" key={item.id}>
                <span>{formatShortDate(item.date)}</span>
                <span>{item.roomName}</span>
                <span>{item.description}</span>
                <strong className={item.isPositive ? 'is-positive' : 'is-negative'}>
                  {item.isPositive ? '+' : '-'}
                  {formatAmount(item.amount)} EUR
                </strong>
                <button className="ss-activity-info" type="button" aria-label="Detail aktivity">
                  i
                </button>
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
            currentUserIban={currentUserIban}
            onBack={() => setSelectedRoomIban(null)}
            onRefresh={fetchData}
          />
        </div>
      )}

      {showCreate && currentUserIban && (
        <CreateSpaceModal 
          allUsers={data?.users || []} 
          currentUserIban={currentUserIban}
          onClose={() => setShowCreate(false)} 
          onCreated={fetchData} 
        />
      )}
    </SharedSpacesShell>
  );
}
