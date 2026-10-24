import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import type { Board as BoardModel } from '../types';
import type { BoardActions } from '../hooks/useBoardActions';
import { countCards, findCard } from '../utils';
import { CardFace } from './CardItem';
import { ColumnView } from './Column';
import { IconGrip, IconPlus, IconSearch, IconX } from './Icons';

type BoardViewProps = {
  board: BoardModel;
  view: BoardModel;
  actions: BoardActions;
  search: string;
  label: string;
  filterActive: boolean;
  onClearFilters: () => void;
  onOpenCard: (cardId: string) => void;
  composerColumnId: string | null;
  onOpenComposer: (columnId: string) => void;
  onCloseComposer: () => void;
  newColumnOpen: boolean;
  onOpenNewColumn: () => void;
  onCloseNewColumn: () => void;
};

const collisionDetection: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  if (hits.length > 0) {
    const cardHit = hits.find((collision) => !String(collision.id).startsWith('column:'));
    return cardHit ? [cardHit] : [hits[0]];
  }
  return rectIntersection(args);
};

export function BoardView({
  board,
  view,
  actions,
  search,
  label,
  filterActive,
  onClearFilters,
  onOpenCard,
  composerColumnId,
  onOpenComposer,
  onCloseComposer,
  newColumnOpen,
  onOpenNewColumn,
  onCloseNewColumn,
}: BoardViewProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overColumnId, setOverColumnId] = useState<string | null>(null);
  const dragEndedAt = useRef(0);
  const endRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  const canOpenCard = useCallback(() => Date.now() - dragEndedAt.current > 220, []);

  const activeCard = useMemo(() => {
    if (!activeId) return null;
    for (const column of board.columns) {
      const card = column.cards.find((item) => item.id === activeId);
      if (card) return card;
    }
    return null;
  }, [activeId, board]);

  const visibleCards = countCards(view);

  useEffect(() => {
    if (!newColumnOpen) return;
    const timer = window.setTimeout(() => {
      endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'end' });
    }, 60);
    return () => window.clearTimeout(timer);
  }, [newColumnOpen]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
    const data = event.active.data.current as { columnId?: string } | undefined;
    setOverColumnId(data?.columnId ?? null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const data = event.over?.data.current as { columnId?: string } | undefined;
    setOverColumnId(data?.columnId ?? null);
  };

  const handleDragCancel = () => {
    dragEndedAt.current = Date.now();
    setActiveId(null);
    setOverColumnId(null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    dragEndedAt.current = Date.now();
    setActiveId(null);
    setOverColumnId(null);

    const { active, over } = event;
    if (!over) return;

    const cardId = String(active.id);
    const overId = String(over.id);
    const source = findCard(board, cardId);
    if (!source) return;

    const data = over.data.current as
      | { type?: 'card' | 'column'; columnId?: string }
      | undefined;

    let toColumnId: string | null = null;
    let toIndex = 0;

    if (data?.type === 'column' && data.columnId) {
      toColumnId = data.columnId;
      const target = board.columns.find((column) => column.id === toColumnId);
      if (!target) return;
      toIndex = target.cards.length;
    } else if (data?.type === 'card' && data.columnId) {
      toColumnId = data.columnId;
      const target = board.columns.find((column) => column.id === toColumnId);
      if (!target) return;
      const index = target.cards.findIndex((card) => card.id === overId);
      toIndex = index >= 0 ? index : target.cards.length;
    } else {
      return;
    }

    if (source.column.id === toColumnId && source.index === toIndex) return;

    actions.moveCard.mutate({ cardId, toColumnId, toIndex });
  };

  const createColumn = async (title: string) => {
    await actions.createColumn.mutateAsync(title);
    onCloseNewColumn();
  };

  if (board.columns.length === 0) {
    return (
      <div className="board-shell">
        <EmptyBoard
          newColumnOpen={newColumnOpen}
          onOpen={onOpenNewColumn}
          onClose={onCloseNewColumn}
          onCreate={createColumn}
        />
      </div>
    );
  }

  return (
    <div className="board-shell">
      {filterActive && visibleCards === 0 ? (
        <div className="filter-empty" role="status">
          <span className="filter-empty-icon" aria-hidden="true">
            <IconSearch size={18} />
          </span>
          <div className="filter-empty-text">
            <strong>Eşleşen kart yok.</strong>
            <span>
              {search.trim() ? `“${search.trim()}” araması` : 'Seçili etiket'} için sonuç
              bulunamadı. Filtreleri temizleyip yeniden dene.
            </span>
          </div>
          <button type="button" className="btn btn-small" onClick={onClearFilters}>
            <IconX size={13} />
            Filtreleri temizle
          </button>
        </div>
      ) : null}

      <div className="board-meta">
        <span className="meta-live">
          <i aria-hidden="true" />
          CANLI
        </span>
        <span>
          <strong>{String(visibleCards).padStart(2, '0')}</strong> KART
        </span>
        <span>
          <strong>{String(board.columns.length).padStart(2, '0')}</strong> KOLON
        </span>
        {filterActive ? <span className="meta-filter">FİLTRELİ</span> : null}
        <span className="meta-hint">
          <IconGrip size={13} />
          Sürükle-bırak · anında kaydedilir
        </span>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className={`board ${activeId ? 'is-dragging' : ''}`}>
          {view.columns.map((column, index) => (
            <ColumnView
              key={column.id}
              column={column}
              index={index}
              actions={actions}
              onOpenCard={onOpenCard}
              canOpenCard={canOpenCard}
              composerOpen={composerColumnId === column.id}
              onOpenComposer={() => onOpenComposer(column.id)}
              onCloseComposer={onCloseComposer}
              isDropTarget={overColumnId === column.id}
              filterActive={filterActive}
            />
          ))}

          {newColumnOpen ? (
            <div className="new-column-wrap" ref={endRef}>
              <NewColumnForm onCreate={createColumn} onCancel={onCloseNewColumn} />
            </div>
          ) : (
            <button type="button" className="new-column-ghost" onClick={onOpenNewColumn}>
              <span className="ghost-plus" aria-hidden="true">
                <IconPlus size={16} />
              </span>
              <span>Yeni kolon</span>
            </button>
          )}
        </div>

        <DragOverlay
          dropAnimation={{ duration: 180, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' }}
        >
          {activeCard ? (
            <div className="card drag-overlay-card">
              <CardFace card={activeCard} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

function EmptyBoard({
  newColumnOpen,
  onOpen,
  onClose,
  onCreate,
}: {
  newColumnOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  onCreate: (title: string) => Promise<void>;
}) {
  return (
    <div className="empty-board">
      <div className="empty-board-inner">
        <div className="empty-art" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <p className="eyebrow">YENİ PANO</p>
        <h1>Pano tertemiz.</h1>
        <p className="empty-copy">
          İlk kolonu oluştur; kartlarını ekle, sürükle, taşı. Her değişiklik anında SQLite'a
          yazılır.
        </p>
        {newColumnOpen ? (
          <NewColumnForm onCreate={onCreate} onCancel={onClose} />
        ) : (
          <button type="button" className="btn btn-primary" onClick={onOpen}>
            <IconPlus size={16} />
            İlk kolonu oluştur
          </button>
        )}
        <div className="empty-keys" aria-hidden="true">
          <span>
            <kbd>N</kbd> yeni kart
          </span>
          <span>
            <kbd>/</kbd> ara
          </span>
        </div>
      </div>
    </div>
  );
}

function NewColumnForm({
  onCreate,
  onCancel,
}: {
  onCreate: (title: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => window.clearTimeout(timer);
  }, []);

  const submit = async (event?: FormEvent) => {
    event?.preventDefault();
    const text = title.trim();
    if (!text || saving) return;
    setSaving(true);
    try {
      await onCreate(text);
      setTitle('');
    } catch {
      /* hata toast ile bildirilir */
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="new-column-form" onSubmit={submit}>
      <span className="new-column-label">
        <IconPlus size={13} />
        YENİ KOLON
      </span>
      <input
        ref={inputRef}
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Kolon adı — örn. Yapılıyor"
        aria-label="Yeni kolon adı"
        maxLength={120}
        autoFocus
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.stopPropagation();
            onCancel();
          }
        }}
      />
      <div className="new-column-actions">
        <button type="button" className="btn btn-small btn-ghost" onClick={onCancel}>
          İptal
        </button>
        <button
          type="submit"
          className="btn btn-small btn-primary"
          disabled={!title.trim() || saving}
        >
          {saving ? 'Ekleniyor…' : 'Kolon ekle'}
        </button>
      </div>
    </form>
  );
}
