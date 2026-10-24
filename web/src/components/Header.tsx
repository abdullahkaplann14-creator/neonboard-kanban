import type { RefObject } from 'react';
import { IconPlus, IconSearch, IconX } from './Icons';
import { labelStyle } from '../utils';

type Status = 'online' | 'offline' | 'syncing';

type HeaderProps = {
  stats: { columns: number; cards: number; overdue: number };
  labels: { name: string; count: number }[];
  search: string;
  onSearch: (value: string) => void;
  label: string;
  onLabel: (value: string) => void;
  status: Status;
  searchRef: RefObject<HTMLInputElement>;
  onAddColumn: () => void;
};

const STATUS: Record<Status, { text: string; className: string }> = {
  online: { text: 'API ÇEVRİMİÇİ', className: 'status--online' },
  syncing: { text: 'BAĞLANIYOR', className: 'status--syncing' },
  offline: { text: 'API KAPALI', className: 'status--offline' },
};

export function Header({
  stats,
  labels,
  search,
  onSearch,
  label,
  onLabel,
  status,
  searchRef,
  onAddColumn,
}: HeaderProps) {
  const statusInfo = STATUS[status];

  return (
    <header className="topbar">
      <div className="topbar-row topbar-row--main">
        <div className="brand" aria-label="NeonBoard">
          <span className="brand-mark">
            <svg width="23" height="23" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <defs>
                <linearGradient id="brandGradient" x1="0" y1="0" x2="24" y2="24">
                  <stop offset="0" stopColor="#5ef2d6" />
                  <stop offset="1" stopColor="#ff4d9d" />
                </linearGradient>
              </defs>
              <rect x="3" y="3" width="5" height="18" rx="1.6" fill="url(#brandGradient)" />
              <rect
                x="9.5"
                y="3"
                width="5"
                height="12"
                rx="1.6"
                fill="url(#brandGradient)"
                opacity=".72"
              />
              <rect
                x="16"
                y="3"
                width="5"
                height="16"
                rx="1.6"
                fill="url(#brandGradient)"
                opacity=".9"
              />
            </svg>
          </span>
          <span className="brand-text">
            <span className="brand-name">
              NEON<span>BOARD</span>
            </span>
            <span className="brand-sub">KANBAN // YARIŞMA 01</span>
          </span>
        </div>

        <div className="topbar-stats" aria-label="Pano istatistikleri">
          <div className="stat">
            <b>{String(stats.columns).padStart(2, '0')}</b>
            <span>KOLON</span>
          </div>
          <div className="stat">
            <b>{String(stats.cards).padStart(2, '0')}</b>
            <span>KART</span>
          </div>
          <div className={`stat ${stats.overdue > 0 ? 'stat--alert' : ''}`}>
            <b>{String(stats.overdue).padStart(2, '0')}</b>
            <span>GECİKEN</span>
          </div>
        </div>

        <div className="topbar-actions">
          <span className={`status ${statusInfo.className}`}>
            <i className="status-dot" aria-hidden="true" />
            {statusInfo.text}
          </span>
          <button type="button" className="btn btn-primary add-column-btn" onClick={onAddColumn}>
            <IconPlus size={16} />
            <span>Yeni kolon</span>
          </button>
        </div>
      </div>

      <div className="topbar-row topbar-row--tools">
        <div className="search">
          <IconSearch size={16} className="search-icon" />
          <input
            ref={searchRef}
            type="search"
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            placeholder="Kartlarda ara — başlık, açıklama, etiket…"
            aria-label="Kartlarda ara"
            spellCheck={false}
            autoComplete="off"
          />
          {search ? (
            <button
              type="button"
              className="search-clear"
              onClick={() => onSearch('')}
              aria-label="Aramayı temizle"
            >
              <IconX size={14} />
            </button>
          ) : (
            <kbd className="search-kbd" aria-hidden="true">
              /
            </kbd>
          )}
        </div>

        <div className="chips" role="group" aria-label="Etiket filtresi">
          <button
            type="button"
            className={`chip ${label === '' ? 'is-active' : ''}`}
            onClick={() => onLabel('')}
          >
            Tümü
            <span className="chip-count">{stats.cards}</span>
          </button>
          {labels.map((item) => {
            const style = labelStyle(item.name);
            const active = label === item.name;
            return (
              <button
                type="button"
                key={item.name}
                className={`chip ${active ? 'is-active' : ''}`}
                onClick={() => onLabel(active ? '' : item.name)}
                title={`${item.name} etiketine göre filtrele`}
              >
                <i
                  className="chip-dot"
                  style={{ background: active ? '#04110e' : style.color }}
                  aria-hidden="true"
                />
                {item.name}
                <span className="chip-count">{item.count}</span>
              </button>
            );
          })}
        </div>

        <div className="keys" aria-hidden="true">
          <span>
            <kbd>N</kbd> yeni kart
          </span>
          <span>
            <kbd>/</kbd> ara
          </span>
          <span>
            <kbd>Esc</kbd> kapat
          </span>
        </div>
      </div>
    </header>
  );
}
