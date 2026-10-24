import { IconPlus, IconRefresh, IconWifiOff } from './Icons';

export function LoadingBoard() {
  return (
    <div className="loading-wrap" aria-busy="true" aria-label="Pano yükleniyor">
      <div className="loading-meta">
        <span className="loading-spinner" aria-hidden="true" />
        PANO YÜKLENİYOR…
      </div>
      <div className="loading-board">
        {[0, 1, 2].map((column) => (
          <div className="skeleton-column" key={column}>
            <div className="skeleton skel-title" />
            <div className="skeleton skel-count" />
            {[0, 1, 2].map((card) => (
              <div
                key={card}
                className="skeleton skel-card"
                style={{ height: card === 1 ? 104 : 78 }}
              />
            ))}
          </div>
        ))}
        <div className="skeleton-column skeleton-column--ghost">
          <IconPlus size={18} />
          <span>YENİ KOLON</span>
        </div>
      </div>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="state-panel">
      <div className="state-icon" aria-hidden="true">
        <IconWifiOff size={30} />
      </div>
      <p className="eyebrow">BAĞLANTI KURULAMADI</p>
      <h2>API'ye ulaşamıyorum.</h2>
      <p>
        Pano verisi yalnızca API'den gelir. <code>:3001</code> portundaki sunucunun çalıştığından
        emin ol, sonra tekrar dene.
      </p>
      <code className="state-error">{message}</code>
      <div className="state-actions">
        <button type="button" className="btn btn-primary" onClick={onRetry}>
          <IconRefresh size={15} />
          Tekrar dene
        </button>
        <a
          className="btn"
          href="http://localhost:3001/api/health"
          target="_blank"
          rel="noreferrer"
        >
          /api/health
        </a>
      </div>
    </div>
  );
}
