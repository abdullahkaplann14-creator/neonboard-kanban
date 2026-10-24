import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { Column } from '../types';
import type { BoardActions } from '../hooks/useBoardActions';
import { COLUMN_ACCENTS } from '../utils';
import { CardItem } from './CardItem';
import { IconCheck, IconPencil, IconPlus, IconTrash, IconX } from './Icons';

type ColumnProps = {
  column: Column;
  index: number;
  actions: BoardActions;
  onOpenCard: (cardId: string) => void;
  canOpenCard: () => boolean;
  composerOpen: boolean;
  onOpenComposer: () => void;
  onCloseComposer: () => void;
  isDropTarget: boolean;
  filterActive: boolean;
};

export function ColumnView({
  column,
  index,
  actions,
  onOpenCard,
  canOpenCard,
  composerOpen,
  onOpenComposer,
  onCloseComposer,
  isDropTarget,
  filterActive,
}: ColumnProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(column.title);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const accent = COLUMN_ACCENTS[index % COLUMN_ACCENTS.length];
  const { setNodeRef, isOver } = useDroppable({
    id: `column:${column.id}`,
    data: { type: 'column', columnId: column.id },
  });
  const target = isDropTarget || isOver;

  useEffect(() => {
    if (!editing) setDraft(column.title);
  }, [column.title, editing]);

  const cancelEdit = () => {
    setDraft(column.title);
    setEditing(false);
  };

  const saveTitle = async (event?: FormEvent) => {
    event?.preventDefault();
    const text = draft.trim();
    if (!text) {
      cancelEdit();
      return;
    }
    if (text === column.title) {
      setEditing(false);
      return;
    }
    setBusy(true);
    try {
      await actions.updateColumn.mutateAsync({ id: column.id, patch: { title: text } });
      setEditing(false);
    } catch {
      /* hata toast ile bildirilir, düzenleme açık kalır */
    } finally {
      setBusy(false);
    }
  };

  const removeColumn = async () => {
    setBusy(true);
    try {
      await actions.deleteColumn.mutateAsync(column.id);
    } catch {
      /* hata toast ile bildirilir */
    } finally {
      setBusy(false);
      setConfirmDelete(false);
    }
  };

  const style = { '--col-accent': accent } as CSSProperties;

  return (
    <section
      className={`column ${target ? 'is-drop-target' : ''}`}
      style={style}
      aria-label={`${column.title} kolonu`}
    >
      <div className="column-accent" aria-hidden="true" />

      <header className="column-head">
        {editing ? (
          <form className="column-title-form" onSubmit={saveTitle}>
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  event.stopPropagation();
                  cancelEdit();
                }
              }}
              aria-label="Kolon başlığı"
              maxLength={120}
              autoFocus
            />
            <button
              type="submit"
              className="icon-btn icon-btn--ok"
              aria-label="Kolon adını kaydet"
              disabled={busy || !draft.trim()}
            >
              <IconCheck size={14} />
            </button>
            <button
              type="button"
              className="icon-btn"
              aria-label="Düzenlemeyi iptal et"
              onClick={cancelEdit}
            >
              <IconX size={14} />
            </button>
          </form>
        ) : (
          <>
            <span className="column-dot" aria-hidden="true" />
            <h2
              className="column-title"
              title={column.title}
              onDoubleClick={() => {
                setDraft(column.title);
                setEditing(true);
              }}
            >
              {column.title}
            </h2>
            <span className="column-count" aria-label={`${column.cards.length} kart`}>
              {column.cards.length}
            </span>
            {target ? <span className="column-drop-chip">BURAYA</span> : null}
            <div className="column-tools">
              <button
                type="button"
                className="icon-btn"
                title="Kolon adını düzenle"
                aria-label="Kolon adını düzenle"
                onClick={() => {
                  setDraft(column.title);
                  setEditing(true);
                }}
              >
                <IconPencil size={14} />
              </button>
              <button
                type="button"
                className="icon-btn icon-btn--danger"
                title="Kolonu sil"
                aria-label="Kolonu sil"
                onClick={() => setConfirmDelete(true)}
              >
                <IconTrash size={14} />
              </button>
            </div>
          </>
        )}
      </header>

      {confirmDelete ? (
        <div className="column-confirm" role="alert">
          <p>
            <strong>{column.title}</strong>
            {column.cards.length > 0
              ? ` kolonu ve içindeki ${column.cards.length} kart silinecek.`
              : ' kolonu silinecek.'}{' '}
            Bu işlem geri alınamaz.
          </p>
          <div className="column-confirm-actions">
            <button
              type="button"
              className="btn btn-small btn-danger"
              onClick={removeColumn}
              disabled={busy}
            >
              {busy ? 'Siliniyor…' : 'Evet, sil'}
            </button>
            <button
              type="button"
              className="btn btn-small btn-ghost"
              onClick={() => setConfirmDelete(false)}
              disabled={busy}
            >
              Vazgeç
            </button>
          </div>
        </div>
      ) : null}

      <div ref={setNodeRef} className={`column-body ${target ? 'is-target' : ''}`}>
        <div className="column-cards">
          {column.cards.length === 0 && !composerOpen ? (
            <div className="column-empty">
              <span className="empty-glyph" aria-hidden="true">
                <IconPlus size={15} />
              </span>
              <strong>{filterActive ? 'Filtreyle eşleşen kart yok' : 'Henüz kart yok'}</strong>
              <span>
                {filterActive
                  ? 'Aramayı değiştir veya filtreleri temizle.'
                  : 'İlk kartını ekleyerek bu kolonu hareketlendir.'}
              </span>
            </div>
          ) : null}

          <SortableContext
            items={column.cards.map((card) => card.id)}
            strategy={verticalListSortingStrategy}
          >
            {column.cards.map((card) => (
              <CardItem
                key={card.id}
                card={card}
                columnId={column.id}
                onOpen={onOpenCard}
                canOpen={canOpenCard}
              />
            ))}
          </SortableContext>

          {target && column.cards.length === 0 ? (
            <div className="drop-line">BURAYA BIRAK</div>
          ) : null}
        </div>

        {composerOpen ? (
          <CardComposer
            columnId={column.id}
            actions={actions}
            onClose={onCloseComposer}
          />
        ) : null}
      </div>

      {!composerOpen ? (
        <div className="column-foot">
          <button type="button" className="add-card-btn" onClick={onOpenComposer}>
            <IconPlus size={14} />
            Kart ekle
          </button>
        </div>
      ) : null}
    </section>
  );
}

function CardComposer({
  columnId,
  actions,
  onClose,
}: {
  columnId: string;
  actions: BoardActions;
  onClose: () => void;
}) {
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => textareaRef.current?.focus(), 30);
    return () => window.clearTimeout(timer);
  }, []);

  const submit = async (event?: FormEvent) => {
    event?.preventDefault();
    const text = title.trim();
    if (!text || saving) return;
    setSaving(true);
    try {
      await actions.createCard.mutateAsync({ columnId, title: text });
      setTitle('');
      window.setTimeout(() => textareaRef.current?.focus(), 0);
    } catch {
      /* hata toast ile bildirilir */
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="card-composer" onSubmit={submit}>
      <textarea
        ref={textareaRef}
        value={title}
        rows={2}
        placeholder="Karta bir başlık yaz…"
        aria-label="Yeni kart başlığı"
        maxLength={500}
        onChange={(event) => setTitle(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            void submit();
          } else if (event.key === 'Escape') {
            event.stopPropagation();
            onClose();
          }
        }}
      />
      <div className="composer-foot">
        <span className="composer-hint">
          <kbd>Enter</kbd> ekle · <kbd>Esc</kbd> iptal
        </span>
        <div className="composer-actions">
          <button type="button" className="btn btn-small btn-ghost" onClick={onClose}>
            İptal
          </button>
          <button
            type="submit"
            className="btn btn-small btn-primary"
            disabled={!title.trim() || saving}
          >
            {saving ? '…' : 'Ekle'}
          </button>
        </div>
      </div>
    </form>
  );
}
