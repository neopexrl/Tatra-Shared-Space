import React, { useState } from 'react';
import { router } from 'expo-router';
import '../src/web-shell/bank-shell.css';

/* ─── mock data ─── */
const MOCK_SPACES = [
  {
    id: 1,
    name: 'Tatry Trip',
    type: 'trip',
    created: '12.04.2026',
    members: [
      { id: 1, name: 'Marek', avatar: 'M', color: '#52c7bc', balance: -85.63 },
      { id: 2, name: 'Jana',  avatar: 'J', color: '#50a9ec', balance: 42.10 },
      { id: 3, name: 'Samo',  avatar: 'S', color: '#557fe8', balance: 120.00 },
      { id: 4, name: 'Lucia', avatar: 'L', color: '#c8b88f', balance: -76.47 },
    ],
    expenses: [
      { id: 1, desc: 'Ubytovanie – Chata pod Rysmi', amount: 180.00, paidBy: 'Samo', date: '13.04.2026', split: 'equal' },
      { id: 2, desc: 'Večera – Koliba Kamzík', amount: 72.50, paidBy: 'Jana', date: '13.04.2026', split: 'equal' },
      { id: 3, desc: 'Lístky na lanovku', amount: 56.00, paidBy: 'Samo', date: '14.04.2026', split: 'equal' },
      { id: 4, desc: 'Potraviny Billa', amount: 34.00, paidBy: 'Marek', date: '12.04.2026', split: 'equal' },
    ],
    totalSpent: 342.50,
    requests: [
      { id: 1, from: 'Samo', to: 'Marek', amount: 85.63, status: 'pending' },
      { id: 2, from: 'Jana', to: 'Lucia', amount: 76.47, status: 'pending' },
    ],
  },
  {
    id: 2,
    name: 'Byt Košická',
    type: 'flat',
    created: '01.01.2026',
    members: [
      { id: 1, name: 'Marek', avatar: 'M', color: '#52c7bc', balance: 0 },
      { id: 5, name: 'Peter', avatar: 'P', color: '#54c36f', balance: -413.33 },
      { id: 6, name: 'Eva',   avatar: 'E', color: '#f26a4f', balance: 413.33 },
    ],
    expenses: [
      { id: 5, desc: 'Nájom – Apríl', amount: 840.00, paidBy: 'Eva', date: '01.04.2026', split: 'equal' },
      { id: 6, desc: 'Elektrina Q1', amount: 186.00, paidBy: 'Eva', date: '05.04.2026', split: 'equal' },
      { id: 7, desc: 'Internet – UPC', amount: 29.00, paidBy: 'Marek', date: '01.04.2026', split: 'equal' },
      { id: 8, desc: 'Upratovanie', amount: 45.00, paidBy: 'Peter', date: '10.04.2026', split: 'equal' },
      { id: 9, desc: 'Voda Q1', amount: 140.00, paidBy: 'Eva', date: '15.04.2026', split: 'equal' },
    ],
    totalSpent: 1240.00,
    requests: [
      { id: 3, from: 'Eva', to: 'Peter', amount: 413.33, status: 'pending' },
    ],
  },
  {
    id: 3,
    name: 'Darček pre Tomáša',
    type: 'gift',
    created: '10.04.2026',
    members: [
      { id: 1, name: 'Marek', avatar: 'M', color: '#52c7bc', balance: 0 },
      { id: 2, name: 'Jana',  avatar: 'J', color: '#50a9ec', balance: 0 },
      { id: 7, name: 'Viki',  avatar: 'V', color: '#db02b5', balance: 0 },
    ],
    expenses: [
      { id: 10, desc: 'Apple AirPods Pro', amount: 279.00, paidBy: 'Jana', date: '15.04.2026', split: 'equal' },
    ],
    totalSpent: 279.00,
    requests: [],
  },
];

const TYPE_ICONS = { trip: 'T', flat: 'B', gift: 'D', other: 'S' };

/* ─── components ─── */

function BackHeader({ title, onBack }) {
  return (
    <div className="ss-header">
      <button className="ss-back" type="button" onClick={onBack}>← Späť</button>
      <h1 className="ss-title">{title}</h1>
    </div>
  );
}

function SpaceCard({ space, onClick }) {
  const owes = space.members.find(m => m.name === 'Marek');
  const pendingCount = space.requests.filter(r => r.status === 'pending').length;

  return (
    <div className="ss-space-card" onClick={onClick}>
      <div className="ss-space-card-top">
        <span className="ss-space-icon">{TYPE_ICONS[space.type] || 'S'}</span>
        <div className="ss-space-card-info">
          <span className="ss-space-card-name">{space.name}</span>
          <span className="ss-space-card-date">Vytvorené {space.created}</span>
        </div>
        <span className="ss-space-card-total">{space.totalSpent.toLocaleString('sk-SK', { minimumFractionDigits: 2 })} EUR</span>
      </div>
      <div className="ss-space-card-bottom">
        <div className="ss-space-card-avatars">
          {space.members.slice(0, 4).map(m => (
            <span key={m.id} className="tb-avatar" style={{ background: m.color }}>{m.avatar}</span>
          ))}
          {space.members.length > 4 && <span className="tb-avatar" style={{ background: '#555' }}>+{space.members.length - 4}</span>}
        </div>
        <div className="ss-space-card-meta">
          {owes && owes.balance < 0 && (
            <span className="ss-badge ss-badge-owe">Dlžíte {Math.abs(owes.balance).toFixed(2)} €</span>
          )}
          {owes && owes.balance > 0 && (
            <span className="ss-badge ss-badge-owed">Dlžia vám {owes.balance.toFixed(2)} €</span>
          )}
          {owes && owes.balance === 0 && (
            <span className="ss-badge ss-badge-settled">Vyrovnané ✓</span>
          )}
          {pendingCount > 0 && (
            <span className="ss-badge ss-badge-pending">{pendingCount} žiadostí</span>
          )}
        </div>
      </div>
    </div>
  );
}

function SpaceDetail({ space, onBack }) {
  const [tab, setTab] = useState('expenses');
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showScanReceipt, setShowScanReceipt] = useState(false);
  const [scanStep, setScanStep] = useState(0);

  const simulateScan = () => {
    setShowScanReceipt(true);
    setScanStep(0);
    setTimeout(() => setScanStep(1), 800);
    setTimeout(() => setScanStep(2), 1800);
    setTimeout(() => setScanStep(3), 2600);
  };

  return (
    <div className="ss-detail">
      <BackHeader title={space.name} onBack={onBack} />

      {/* summary bar */}
      <div className="ss-summary-bar">
        <div className="ss-summary-item">
          <span className="ss-summary-label">Celkové výdavky</span>
          <strong className="ss-summary-value">{space.totalSpent.toLocaleString('sk-SK', { minimumFractionDigits: 2 })} EUR</strong>
        </div>
        <div className="ss-summary-divider" />
        <div className="ss-summary-item">
          <span className="ss-summary-label">Členovia</span>
          <strong className="ss-summary-value">{space.members.length}</strong>
        </div>
        <div className="ss-summary-divider" />
        <div className="ss-summary-item">
          <span className="ss-summary-label">Na osobu ø</span>
          <strong className="ss-summary-value">{(space.totalSpent / space.members.length).toFixed(2)} EUR</strong>
        </div>
      </div>

      {/* tabs */}
      <div className="ss-tabs">
        <button type="button" className={tab === 'expenses' ? 'is-active' : ''} onClick={() => setTab('expenses')}>Výdavky</button>
        <button type="button" className={tab === 'balances' ? 'is-active' : ''} onClick={() => setTab('balances')}>Zostatky</button>
        <button type="button" className={tab === 'requests' ? 'is-active' : ''} onClick={() => setTab('requests')}>
          Žiadosti
          {space.requests.filter(r => r.status === 'pending').length > 0 && (
            <i className="ss-tab-badge">{space.requests.filter(r => r.status === 'pending').length}</i>
          )}
        </button>
      </div>

      {/* tab content */}
      {tab === 'expenses' && (
        <div className="ss-tab-panel">
          <div className="ss-actions-row">
            <button className="ss-btn ss-btn-primary" type="button" onClick={() => setShowAddExpense(!showAddExpense)}>+ Pridať výdavok</button>
            <button className="ss-btn ss-btn-secondary" type="button" onClick={simulateScan}>Skenovať účtenku</button>
          </div>

          {showAddExpense && (
            <div className="ss-add-expense-form">
              <input className="ss-input" type="text" placeholder="Popis výdavku" />
              <input className="ss-input" type="number" placeholder="Suma (EUR)" />
              <select className="ss-input">
                {space.members.map(m => <option key={m.id}>{m.name}</option>)}
              </select>
              <select className="ss-input">
                <option>Rozdeliť rovnomerne</option>
                <option>Vlastné sumy</option>
              </select>
              <button className="ss-btn ss-btn-primary" type="button" onClick={() => setShowAddExpense(false)}>Uložiť</button>
            </div>
          )}

          {showScanReceipt && (
            <div className="ss-receipt-scan">
              <div className="ss-receipt-header">
                <strong>Skenovanie účtenky</strong>
                <button className="ss-close-btn" type="button" onClick={() => { setShowScanReceipt(false); setScanStep(0); }}>✕</button>
              </div>
              <div className="ss-receipt-steps">
                <div className={`ss-receipt-step ${scanStep >= 0 ? 'active' : ''} ${scanStep > 0 ? 'done' : ''}`}>
                  <span className="ss-step-dot" />
                  <span>Načítavanie obrázka...</span>
                </div>
                <div className={`ss-receipt-step ${scanStep >= 1 ? 'active' : ''} ${scanStep > 1 ? 'done' : ''}`}>
                  <span className="ss-step-dot" />
                  <span>AI rozpoznáva položky...</span>
                </div>
                <div className={`ss-receipt-step ${scanStep >= 2 ? 'active' : ''} ${scanStep > 2 ? 'done' : ''}`}>
                  <span className="ss-step-dot" />
                  <span>Rozdeľovanie sumy...</span>
                </div>
                <div className={`ss-receipt-step ${scanStep >= 3 ? 'active' : ''}`}>
                  <span className="ss-step-dot" />
                  <span>Hotovo!</span>
                </div>
              </div>
              {scanStep >= 3 && (
                <div className="ss-receipt-result">
                  <div className="ss-receipt-item"><span>Bryndzové halušky ×2</span><strong>17,80 €</strong></div>
                  <div className="ss-receipt-item"><span>Pivo Zlatý Bažant ×4</span><strong>11,60 €</strong></div>
                  <div className="ss-receipt-item"><span>Kapustnica</span><strong>6,90 €</strong></div>
                  <div className="ss-receipt-item"><span>Kofola 0.5l ×2</span><strong>5,20 €</strong></div>
                  <div className="ss-receipt-item ss-receipt-total"><span>Spolu</span><strong>41,50 €</strong></div>
                  <button className="ss-btn ss-btn-primary" type="button" style={{ marginTop: 12, width: '100%' }} onClick={() => { setShowScanReceipt(false); setScanStep(0); }}>Pridať do výdavkov</button>
                </div>
              )}
            </div>
          )}

          <div className="ss-expense-list">
            {space.expenses.map(exp => (
              <div className="ss-expense-row" key={exp.id}>
                <div className="ss-expense-main">
                  <span className="ss-expense-desc">{exp.desc}</span>
                  <span className="ss-expense-meta">Zaplatil {exp.paidBy} · {exp.date}</span>
                </div>
                <div className="ss-expense-amount">
                  <strong>{exp.amount.toFixed(2)} EUR</strong>
                  <span className="ss-expense-split">÷ {space.members.length} = {(exp.amount / space.members.length).toFixed(2)} €</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'balances' && (
        <div className="ss-tab-panel">
          <div className="ss-balance-chart">
            {space.members.map(m => {
              const maxAbs = Math.max(...space.members.map(mm => Math.abs(mm.balance)), 1);
              const pct = Math.abs(m.balance) / maxAbs * 100;
              return (
                <div className="ss-balance-row" key={m.id}>
                  <span className="tb-avatar" style={{ background: m.color }}>{m.avatar}</span>
                  <span className="ss-balance-name">{m.name}</span>
                  <div className="ss-balance-bar-wrap">
                    <div
                      className={`ss-balance-bar ${m.balance >= 0 ? 'positive' : 'negative'}`}
                      style={{ width: `${Math.max(pct, 4)}%` }}
                    />
                  </div>
                  <span className={`ss-balance-amount ${m.balance >= 0 ? 'positive' : 'negative'}`}>
                    {m.balance >= 0 ? '+' : ''}{m.balance.toFixed(2)} €
                  </span>
                </div>
              );
            })}
          </div>

          <div className="ss-settle-section">
            <h3 className="ss-settle-title">Optimálne vyrovnanie</h3>
            {space.members
              .filter(m => m.balance < 0)
              .map(debtor => {
                const creditor = space.members.find(m => m.balance > 0);
                if (!creditor) return null;
                return (
                  <div className="ss-settle-row" key={debtor.id}>
                    <span className="tb-avatar" style={{ background: debtor.color }}>{debtor.avatar}</span>
                    <span className="ss-settle-arrow">→</span>
                    <span className="tb-avatar" style={{ background: creditor.color }}>{creditor.avatar}</span>
                    <strong className="ss-settle-amount">{Math.abs(debtor.balance).toFixed(2)} EUR</strong>
                    <button className="ss-btn ss-btn-send" type="button">Poslať žiadosť</button>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {tab === 'requests' && (
        <div className="ss-tab-panel">
          {space.requests.length === 0 && (
            <div className="ss-empty">Žiadne žiadosti o platbu.</div>
          )}
          {space.requests.map(req => (
            <div className="ss-request-row" key={req.id}>
              <div className="ss-request-info">
                <span className="ss-request-names">{req.from} → {req.to}</span>
                <strong className="ss-request-amount">{req.amount.toFixed(2)} EUR</strong>
              </div>
              <div className="ss-request-actions">
                {req.status === 'pending' && req.to === 'Marek' && (
                  <>
                    <button className="ss-btn ss-btn-approve" type="button">✓ Potvrdiť</button>
                    <button className="ss-btn ss-btn-decline" type="button">✕ Odmietnuť</button>
                  </>
                )}
                {req.status === 'pending' && req.to !== 'Marek' && (
                  <span className="ss-badge ss-badge-pending">Čaká na potvrdenie</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* members */}
      <div className="ss-members-strip">
        <span className="ss-members-label">Členovia:</span>
        {space.members.map(m => (
          <span key={m.id} className="tb-avatar" style={{ background: m.color }} title={m.name}>{m.avatar}</span>
        ))}
        <button className="ss-invite-btn" type="button">+ Pozvať</button>
      </div>
    </div>
  );
}

function CreateSpaceModal({ onClose }) {
  return (
    <div className="ss-modal-backdrop" onClick={onClose}>
      <div className="ss-modal" onClick={e => e.stopPropagation()}>
        <div className="ss-modal-header">
          <h2>Nový Shared Space</h2>
          <button className="ss-close-btn" type="button" onClick={onClose}>✕</button>
        </div>
        <div className="ss-modal-body">
          <label className="ss-label">Názov priestoru</label>
          <input className="ss-input" type="text" placeholder="napr. Tatry Trip, Byt Košická..." />

          <label className="ss-label">Typ</label>
          <div className="ss-type-picker">
            {[
              { type: 'trip', icon: 'T', label: 'Výlet' },
              { type: 'flat', icon: 'B', label: 'Bývanie' },
              { type: 'gift', icon: 'D', label: 'Darček' },
              { type: 'other', icon: 'S', label: 'Iné' },
            ].map(t => (
              <button key={t.type} className="ss-type-btn" type="button">
                <span>{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>

          <label className="ss-label">Pozvať členov</label>
          <input className="ss-input" type="text" placeholder="Meno alebo e-mail" />

          <button className="ss-btn ss-btn-primary" type="button" style={{ width: '100%', marginTop: 16 }} onClick={onClose}>
            Vytvoriť priestor
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── main page ─── */

export default function SharedSpacesWebPage() {
  const [selected, setSelected] = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  const selectedSpace = MOCK_SPACES.find(s => s.id === selected);

  return (
    <div className="ss-page">
      <div className="ss-container">
        {!selectedSpace ? (
          <>
            <BackHeader title="Shared Spaces" onBack={() => router.push('/')} />

            <div className="ss-overview-bar">
              <div className="ss-overview-stat">
                <span>Celkové zdieľané výdavky</span>
                <strong>{MOCK_SPACES.reduce((a, s) => a + s.totalSpent, 0).toLocaleString('sk-SK', { minimumFractionDigits: 2 })} EUR</strong>
              </div>
              <div className="ss-overview-stat">
                <span>Aktívne priestory</span>
                <strong>{MOCK_SPACES.length}</strong>
              </div>
              <div className="ss-overview-stat">
                <span>Otvorené žiadosti</span>
                <strong>{MOCK_SPACES.reduce((a, s) => a + s.requests.filter(r => r.status === 'pending').length, 0)}</strong>
              </div>
            </div>

            <div className="ss-create-row">
              <button className="ss-btn ss-btn-create" type="button" onClick={() => setShowCreate(true)}>
                + Vytvoriť nový priestor
              </button>
            </div>

            <div className="ss-space-list">
              {MOCK_SPACES.map(space => (
                <SpaceCard key={space.id} space={space} onClick={() => setSelected(space.id)} />
              ))}
            </div>
          </>
        ) : (
          <SpaceDetail space={selectedSpace} onBack={() => setSelected(null)} />
        )}
      </div>

      {showCreate && <CreateSpaceModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}
