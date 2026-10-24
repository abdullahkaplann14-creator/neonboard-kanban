import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, errorMessage } from './api';
import { useBoardActions } from './hooks/useBoardActions';
import { countCards, filterBoard, findCard, isOverdue, normalize } from './utils';
import { Header } from './components/Header';
import { BoardView } from './components/Board';
import { CardModal } from './components/CardModal';
import { Toasts, type ToastItem, type ToastKind } from './components/Toasts';
import { ErrorState, LoadingBoard } from './components/States';

export default function App() {
  const { data: board, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['board'],
    queryFn: api.getBoard,
  });

  const [search, setSearch] = useState('');
  const [label, setLabel] = useState('');
  const [openCardId, setOpenCardId] = useState<string | null>(null);
  const [composerColumnId, setComposerColumnId] = useState<string | null>(null);
  const [newColumnOpen, setNewColumnOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const searchRef = useRef<HTMLInputElement>(null);
  const toastSequence = useRef(0);

  const notify = useCallback((kind: ToastKind, message: string) => {
    const id = toastSequence.current + 1;
    toastSequence.current = id;
    setToasts((current) => [...current.slice(-3), { id, kind, message }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 5000);
  }, []);

  const actions = useBoardActions(notify);

  const labels = useMemo(() => {
    if (!board) return [] as { name: string; count: number }[];
    const grouped = new Map<string, { name: string; count: number }>();
    for (const column of board.columns) {
      for (const card of column.cards) {
        const name = card.label?.trim();
        if (!name) continue;
        const key = normalize(name);
        const existing = grouped.get(key);
        if (existing) existing.count += 1;
        else grouped.set(key, { name, count: 1 });
      }
    }
    return [...grouped.values()].sort((a, b) => a.name.localeCompare(b.name, 'tr'));
  }, [board]);

  const filterActive = search.trim().length > 0 || label.trim().length > 0;

  const view = useMemo(
    () => (board ? filterBoard(board, search, label) : null),
    [board, search, label],
  );

  const totalCards = useMemo(() => countCards(board), [board]);
  const visibleCards = useMemo(() => (view ? countCards(view) : 0), [view]);
  const overdueCount = useMemo(() => {
    if (!board) return 0;
    return board.columns.reduce(
      (sum, column) => sum + column.cards.filter((card) => isOverdue(card.dueDate)).length,
      0,
    );
  }, [board]);

  const openLocation = useMemo(
    () => (board && openCardId ? findCard(board, openCardId) : null),
    [board, openCardId],
  );

  useEffect(() => {
    if (openCardId && board && !openLocation) setOpenCardId(null);
  }, [board, openCardId, openLocation]);

  const clearFilters = useCallback(() => {
    setSearch('');
    setLabel('');
  }, []);

  const startNewColumn = useCallback(() => {
    setComposerColumnId(null);
    setNewColumnOpen(true);
  }, []);

  const openComposer = useCallback((columnId: string) => {
    setNewColumnOpen(false);
    setComposerColumnId(columnId);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (openCardId) {
          setOpenCardId(null);
          return;
        }
        if (composerColumnId) {
          setComposerColumnId(null);
          return;
        }
        if (newColumnOpen) {
          setNewColumnOpen(false);
          return;
        }
        return;
      }

      const target = event.target as HTMLElement | null;
      const isTyping =
        !!target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      if (isTyping || openCardId) return;

      if (event.key === '/') {
        event.preventDefault();
        searchRef.current?.focus();
        return;
      }

      if (
        (event.key === 'n' || event.key === 'N') &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey
      ) {
        event.preventDefault();
        if (board && board.columns.length > 0) {
          setComposerColumnId(board.columns[0].id);
          setNewColumnOpen(false);
        } else {
          setNewColumnOpen(true);
          notify('info', 'Önce bir kolon oluşturmalısın.');
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [board, openCardId, composerColumnId, newColumnOpen, notify]);

  const status = isError ? 'offline' : isLoading ? 'syncing' : 'online';

  return (
    <div className="app">
      <Header
        stats={{ columns: board?.columns.length ?? 0, cards: totalCards, overdue: overdueCount }}
        labels={labels}
        search={search}
        onSearch={setSearch}
        label={label}
        onLabel={setLabel}
        status={status}
        searchRef={searchRef}
        onAddColumn={startNewColumn}
      />

      <main className="main">
        {isLoading && !board ? <LoadingBoard /> : null}

        {!isLoading && !board ? (
          <ErrorState
            message={errorMessage(error)}
            onRetry={() => {
              void refetch();
            }}
          />
        ) : null}

        {board && view ? (
          <BoardView
            board={board}
            view={view}
            actions={actions}
            search={search}
            label={label}
            filterActive={filterActive}
            onClearFilters={clearFilters}
            onOpenCard={setOpenCardId}
            composerColumnId={composerColumnId}
            onOpenComposer={openComposer}
            onCloseComposer={() => setComposerColumnId(null)}
            newColumnOpen={newColumnOpen}
            onOpenNewColumn={startNewColumn}
            onCloseNewColumn={() => setNewColumnOpen(false)}
          />
        ) : null}

        <footer className="app-foot">
          <span className="foot-tag">
            NB<span>/01</span>
          </span>
          <span className={`foot-item ${isError ? 'foot-item--offline' : ''}`}>
            <i aria-hidden="true" />
            API :3001
          </span>
          <span className="foot-item">SQLITE · KALICI</span>
          <span className="foot-item foot-right">
            {visibleCards}/{totalCards} KART · {board?.columns.length ?? 0} KOLON
          </span>
        </footer>
      </main>

      <Toasts
        items={toasts}
        onDismiss={(id) =>
          setToasts((current) => current.filter((toast) => toast.id !== id))
        }
      />

      {openLocation ? (
        <CardModal
          key={openLocation.card.id}
          card={openLocation.card}
          columnTitle={openLocation.column.title}
          labels={labels.map((item) => item.name)}
          actions={actions}
          onClose={() => setOpenCardId(null)}
        />
      ) : null}
    </div>
  );
}
