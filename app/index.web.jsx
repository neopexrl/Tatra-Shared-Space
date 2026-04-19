import React, { useState, useEffect } from 'react';
import { router } from 'expo-router';
import '../src/web-shell/bank-shell.css';
import { getRooms } from '../src/setup/supabase';

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

const SHARED_HERO_BACKGROUNDS = [
  'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&h=700&q=80',
  'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?auto=format&fit=crop&w=1600&h=700&q=80',
  'https://images.unsplash.com/photo-1505764706515-aa95265c5abc?auto=format&fit=crop&w=1600&h=700&q=80',
  'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=1600&h=700&q=80',
];

function Logo() {
  return (
    <div className="tb-logo" aria-label="Tatra banka demo logo">
      <img src="/brand/tatra-logo.png" alt="" />
    </div>
  );
}

function TopBar() {
  return (
    <header className="tb-topbar">
      <button className="tb-hamburger" type="button" aria-label="Menu"><span /></button>
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
            className={`${index === 0 ? 'is-active' : ''} ${item === 'Účty' ? 'has-dot' : ''}`}
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
          className={`${index === 0 ? 'is-active' : ''} ${item === 'Účty' ? 'has-dot' : ''}`}
        >
          {item}
        </a>
      ))}
    </nav>
  );
}

function LineChart({ area = false }) {
  return (
    <svg className={area ? 'tb-area-chart' : 'tb-line-chart'} viewBox="0 0 260 130" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id={area ? 'areaGradient' : 'lineGradient'} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#169fe9" stopOpacity="0.92" />
          <stop offset="100%" stopColor="#169fe9" stopOpacity="0.15" />
        </linearGradient>
      </defs>
      <g stroke="rgba(255,255,255,.12)" strokeWidth="1">
        <line x1="0" y1="20" x2="260" y2="20" />
        <line x1="0" y1="55" x2="260" y2="55" />
        <line x1="0" y1="90" x2="260" y2="90" />
        <line x1="40" y1="0" x2="40" y2="116" />
        <line x1="104" y1="0" x2="104" y2="116" />
        <line x1="168" y1="0" x2="168" y2="116" />
        <line x1="230" y1="0" x2="230" y2="116" />
      </g>
      {area ? (
        <path
          d="M0 116 L0 98 L13 93 L25 90 L39 85 L51 83 L65 78 L78 75 L91 72 L104 70 L118 68 L130 67 L143 65 L157 62 L169 60 L181 58 L194 55 L207 52 L220 48 L234 42 L247 36 L260 30 L260 116 Z"
          fill="url(#areaGradient)"
        />
      ) : (
        <path
          d="M0 104 L0 74 L6 74 L6 38 L13 40 L13 23 L22 34 L31 37 L42 35 L47 43 L52 38 L59 39 L61 5 L65 68 L73 70 L83 88 L96 101 L111 105 L126 104 L140 97 L145 32 L153 36 L166 45 L175 62 L184 69 L193 71 L196 43 L203 49 L210 56 L218 52 L224 85 L232 88 L237 87 L240 106 L249 107 L252 75 L260 81"
          fill="none"
          stroke="#109ce8"
          strokeWidth="3"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

function AccountWidget() {
  return (
    <section className="tb-widget tb-account-card">
      <div className="tb-widget-header">Účet</div>
      <div className="tb-account-body">
        <div className="tb-account-meta">
          <div>
            <span className="tb-account-name">EUR UCET</span>
            <span className="tb-iban">SK0511000000290000005</span>
          </div>
          <span className="tb-amount">3 840,07 EUR</span>
        </div>
        <div className="tb-chart">
          <div className="tb-chart-y"><span>6 000</span><span>4 000</span><span>2 000</span><span>0</span></div>
          <LineChart />
        </div>
      </div>
      <div className="tb-account-footer"><span>◉ SPORENIE K ÚČTU</span><span>2 304,00 EUR</span></div>
    </section>
  );
}

function NewsWidget() {
  return (
    <section className="tb-widget tb-news-card">
      <div className="tb-widget-header">Tipy a novinky</div>
      <div className="tb-news-body">
        <div className="tb-hourglass" aria-hidden="true" />
        <div>
          <h2 className="tb-news-title">Zlepšite si svoj dôchodok on-line!</h2>
          <p className="tb-news-text">
            Zistite, aký bude váš dôchodok už dnes. Vyskúšajte našu <strong>dôchodkovú kalkulačku on-line</strong> a pozrite sa, ako si môžete vylepšiť svoj dôchodok priamo v Internet bankingu.
          </p>
        </div>
      </div>
      <div className="tb-bullets"><span /><span /><span /><span className="active" /></div>
      <button className="tb-more" type="button">Viac</button>
    </section>
  );
}

function SpendingReportWidget() {
  const colors = ['#52c7bc', '#50a9ec', '#557fe8', '#c8b88f', '#54c36f'];
  return (
    <section className="tb-widget tb-report-card">
      <div className="tb-widget-header">Spending report</div>
      <div className="tb-report-body">
        <div className="tb-report-label">Rozdiel</div>
        <div className="tb-report-diff">+ 748,57 EUR</div>
        <div className="tb-report-numbers">
          <span className="income">Príjmy<strong>1 824,95 EUR</strong></span>
          <span className="spend">Výdavky<strong>1 076,38 EUR</strong></span>
        </div>
        <div className="tb-donut-row">
          <div className="tb-donut" />
          <div className="tb-legend">
            {['Úvery', 'Kreditná karta', 'Náklady na bývanie', 'Kultúra', 'Telefón, internet, TV'].map((item, index) => (
              <span key={item}><i style={{ background: colors[index] }} />{item}</span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function SharedSpacesWidget() {
  const [rooms, setRooms] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [activeBackground, setActiveBackground] = useState(0);

  useEffect(() => {
    getRooms()
      .then((data) => { setRooms(data || []); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setActiveBackground((current) => (current + 1) % SHARED_HERO_BACKGROUNDS.length);
    }, 3800);

    return () => window.clearInterval(intervalId);
  }, []);

  const formatMoney = (amount) =>
    Number(amount || 0).toLocaleString('sk-SK', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const getTargetAmount = (room) => {
    const explicitTarget = Number(room.target_amount ?? room.targetAmount ?? 0);
    if (explicitTarget > 0) return explicitTarget;

    const balance = Number(room.balance || 0);
    if (balance <= 0) return 600;
    return Math.max(Math.ceil((balance * 1.8) / 100) * 100, 600);
  };

  const activeRooms = rooms.filter((room) => Number(room.balance || 0) > 0);
  const totalBalance = rooms.reduce((sum, room) => sum + Number(room.balance || 0), 0);
  const activeCount = activeRooms.length;
  const pendingCount = activeRooms.filter((room) => {
    const targetAmount = getTargetAmount(room);
    return Number(room.balance || 0) > 0 && Number(room.balance || 0) < targetAmount;
  }).length;
  const pendingLabel = pendingCount === 1 ? 'Čaká na úhradu' : 'Čakajú na úhradu';
  const badgeRooms = rooms.slice(0, 4);

  return (
    <section className="tb-shared-hero-card">
      <div className="tb-shared-hero-backgrounds" aria-hidden="true">
        {SHARED_HERO_BACKGROUNDS.map((imageUrl, index) => (
          <span
            key={imageUrl}
            className={`tb-shared-hero-bg ${index === activeBackground ? 'is-active' : ''}`}
            style={{ backgroundImage: `url(${imageUrl})` }}
          />
        ))}
        <span className="tb-shared-hero-overlay" />
        <span className="tb-shared-hero-fade" />
      </div>

      <div className="tb-shared-hero-inner">
        <span className="tb-shared-hero-badge">NOVÉ</span>

        <div className="tb-shared-hero-main">
          <div className="tb-shared-hero-copy">
            <h3 className="tb-shared-hero-title">Spoločné výdavky</h3>
            <p className="tb-shared-hero-text">
              Správa spoločných priestorov, príspevkov a vyrovnaní v jednom module.
            </p>
          </div>

          <div className="tb-shared-hero-side">
            <div className="tb-shared-hero-stats-wrap">
              <div className="tb-shared-hero-stats">
                <span>
                  <strong>{loaded ? rooms.length : '—'}</strong>
                  <small>Priestorov</small>
                </span>
                <span>
                  <strong>{loaded ? activeCount : '—'}</strong>
                  <small>Aktívne</small>
                </span>
                <span>
                  <strong>{loaded ? pendingCount : '—'}</strong>
                  <small>{pendingLabel}</small>
                </span>
              </div>
              <div className="tb-shared-hero-balance">
                <span>Spoločný zostatok</span>
                <strong>{loaded ? `${formatMoney(totalBalance)} EUR` : 'Načítavam'}</strong>
              </div>
            </div>

            <button className="tb-shared-hero-open" type="button" onClick={() => router.push('/shared-spaces')}>
              Otvoriť <span>›</span>
            </button>
          </div>
        </div>

        <div className="tb-shared-hero-footer">
          <div className="tb-shared-hero-participants">
            <div className="tb-shared-hero-icons">
              {badgeRooms.map((room, index) => (
                <span
                  key={room.room_iban}
                  className={`tb-shared-hero-icon is-${index + 1}`}
                  aria-label={room.name || room.room_iban}
                >
                  {room.name ? room.name.charAt(0).toUpperCase() : '•'}
                </span>
              ))}
              {!loaded && (
                <>
                  <span className="tb-shared-hero-icon is-1">•</span>
                  <span className="tb-shared-hero-icon is-2">•</span>
                  <span className="tb-shared-hero-icon is-3">•</span>
                </>
              )}
            </div>
            <span className="tb-shared-hero-footer-note">
              {loaded ? `${rooms.length} priestorov • ${formatMoney(totalBalance)} EUR celkom` : 'Načítavam priestory...'}
            </span>
          </div>

          <div className="tb-shared-hero-tickers">
            {rooms.slice(0, 2).map((room) => {
              const targetAmount = getTargetAmount(room);
              const progress = Math.max(8, Math.min((Number(room.balance || 0) / targetAmount) * 100, 100));

              return (
                <div className="tb-shared-hero-ticker" key={room.room_iban}>
                  <span className="tb-shared-hero-ticker-name">{room.name || room.room_iban}</span>
                  <span className="tb-shared-hero-ticker-track" aria-hidden="true">
                    <span className="tb-shared-hero-ticker-fill" style={{ width: `${progress}%` }} />
                  </span>
                  <strong>{formatMoney(room.balance)} EUR</strong>
                </div>
              );
            })}
            {loaded && rooms.length === 0 && (
              <div className="tb-shared-hero-empty">Zatiaľ tu nie sú žiadne priestory.</div>
            )}
            {!loaded && <div className="tb-shared-hero-empty">Načítavam priestory...</div>}
          </div>
        </div>
      </div>
    </section>
  );
}

function PensionWidget() {
  return (
    <section className="tb-widget tb-pension-card">
      <div className="tb-widget-header">DDS dôchodok</div>
      <div className="tb-pension-body">
        <div className="tb-stat-row"><span>Nasporená suma</span><strong>3 674,63 EUR</strong></div>
        <div className="tb-stat-row"><span>ID zmluvy</span><strong>10111111.01</strong></div>
        <LineChart area />
      </div>
      <div className="tb-pension-footer"><span>Dátum aktualizácie</span><strong>18.03.2019</strong></div>
    </section>
  );
}

function RatesWidget() {
  const rows = [
    ['🇨🇿', 'CZK', '25,6440', 'down'],
    ['🇨🇭', 'CHF', '1,1296', 'down'],
    ['🇺🇸', 'USD', '1,1379', 'up'],
    ['🇬🇧', 'GBP', '0,8665', 'up'],
  ];
  return (
    <section className="tb-widget tb-rates-card">
      <div className="tb-widget-header">Kurzový lístok</div>
      <div className="tb-rates-body">
        {rows.map(([flag, currency, value, dir]) => (
          <div className="tb-rate-row" key={currency}>
            <span className="tb-flag">{flag}</span>
            <span>{currency}</span>
            <strong>{value}</strong>
            <span className={`tb-rate-arrow ${dir}`}>{dir === 'up' ? '⌃' : '⌄'}</span>
          </div>
        ))}
      </div>
      <div className="tb-rates-footer"><span>Platný od 22.03.2019</span><strong>Devíza stred</strong></div>
    </section>
  );
}

function MainContent() {
  return (
    <main className="tb-content">
      <div className="tb-content-inner">
        <div className="tb-page-actions">
          <a className="tb-add-widget" href="#add-widget">Pridať widget <b>+</b></a>
        </div>
        <SharedSpacesWidget />
        <div className="tb-widgets-grid">
          <AccountWidget />
          <NewsWidget />
          <SpendingReportWidget />
          <PensionWidget />
          <RatesWidget />
        </div>
      </div>
    </main>
  );
}

export default function BankShellWebPage() {
  return (
    <div className="tb-shell">
      <TopBar />
      <TabletSubNav />
      <Sidebar />
      <MainContent />
      <button className="tb-assist-button" type="button" aria-label="Voice assistant">⌁</button>
    </div>
  );
}
