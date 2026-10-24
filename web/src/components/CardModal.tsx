import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { Card } from '../types';
import type { BoardActions } from '../hooks/useBoardActions';
import { isOverdue, labelStyle, normalize, toDateInput } from '../utils';
import {
  IconAlert,
  IconCalendar,
  IconCheck,
  IconTag,
  IconTrash,
  IconX,
} from './Icons';

type CardModalProps = {
  card: Card;
  columnTitle: string;
  labels: string[];
  actions: BoardActions;
  onClose: () => void;
};

export function CardModal({ card, columnTitle, labels, actions, onClose }: CardModalProps) {
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description ?? '');
  const [label, setLabel] = useState(card.label ?? '');
  const [dueDate, setDueDate] = useState(toDateInput(card.dueDate));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const formRef = useRef<HTMLFormElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  const save = async (event?: FormEvent) => {
    event?.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle || saving) return;
    setSaving(true);
    try {
      await actions.updateCard.mutateAsync({
        id: card.id,
        patch: {
          title: cleanTitle,
          description: description.trim() ? description.trim() : null,
          label: label.trim() ? label.trim() : null,
          dueDate: dueDate || null,
        },
      });
      onClose();
    } catch {
      /* iyimser güncelleme geri alındı; toast gösterildi */
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setDeleting(true);
    try {
      await actions.deleteCard.mutateAsync(card.id);
      onClose();
    } catch {
      setDeleting(false);
    }
  };

  const overdue = dueDate ? isOverdue(dueDate) : false;

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={`${card.title} kart detayı`}
      >
        <header className="modal-head">
          <div>
            <p className="eyebrow">KART DETAYI</p>
            <div className="modal-sub">
              <span>{columnTitle}</span>
              <i aria-hidden="true" />
              <span className="modal-id">#{card.id.slice(-7)}</span>
            </div>
          </div>
          <button type="button" className="icon-btn modal-close" onClick={onClose} aria-label="Kapat">
            <IconX size={18} />
          </button>
        </header>

        <form
          ref={formRef}
          onSubmit={save}
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
              event.preventDefault();
              formRef.current?.requestSubmit();
            }
          }}
        >
          <div className="field">
            <label className="field-label" htmlFor="card-title">
              Başlık
            </label>
            <textarea
              id="card-title"
              className="modal-title-input"
              value={title}
              rows={2}
              maxLength={500}
              autoFocus
              onChange={(event) => setTitle(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  descriptionRef.current?.focus();
                }
              }}
            />
          </div>

          <div className="field">
            <label className="field-label" htmlFor="card-description">
              Açıklama
            </label>
            <textarea
              ref={descriptionRef}
              id="card-description"
              className="input modal-desc"
              value={description}
              rows={5}
              maxLength={5000}
              placeholder="Kartla ilgili detayları buraya yaz…"
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>

          <div className="modal-grid">
            <div className="field">
              <label className="field-label" htmlFor="card-label">
                <IconTag size={13} />
                Etiket
              </label>
              <input
                id="card-label"
                className="input"
                value={label}
                list="label-options"
                maxLength={40}
                placeholder="örn. frontend"
                onChange={(event) => setLabel(event.target.value)}
              />
              <datalist id="label-options">
                {labels.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </div>

            <div className="field">
              <label className="field-label" htmlFor="card-due">
                <IconCalendar size={13} />
                Son tarih
              </label>
              <input
                id="card-due"
                type="date"
                className="input"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
              />
              {overdue ? (
                <span className="field-hint field-hint--danger">
                  <IconAlert size={12} />
                  Geçmiş tarih — kart gecikmiş olarak işaretlenir.
                </span>
              ) : null}
            </div>
          </div>

          {labels.length > 0 ? (
            <div className="quick-labels" aria-label="Hızlı etiket seçimi">
              {labels.map((name) => {
                const active = normalize(label) === normalize(name);
                return (
                  <button
                    type="button"
                    key={name}
                    className={`quick-label ${active ? 'is-active' : ''}`}
                    style={labelStyle(name)}
                    onClick={() => setLabel(active ? '' : name)}
                  >
                    {name}
                  </button>
                );
              })}
              {label ? (
                <button
                  type="button"
                  className="quick-label quick-label--clear"
                  onClick={() => setLabel('')}
                >
                  Etiketi kaldır
                </button>
              ) : null}
            </div>
          ) : null}

          <footer className="modal-foot">
            <div className="modal-danger">
              {confirmDelete ? (
                <div className="delete-confirm" role="alert">
                  <span>Kart kalıcı olarak silinsin mi?</span>
                  <button
                    type="button"
                    className="btn btn-small btn-danger"
                    onClick={remove}
                    disabled={deleting}
                  >
                    {deleting ? 'Siliniyor…' : 'Evet, sil'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-small btn-ghost"
                    onClick={() => setConfirmDelete(false)}
                    disabled={deleting}
                  >
                    Vazgeç
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="btn btn-small btn-ghost btn-danger-text"
                  onClick={() => setConfirmDelete(true)}
                >
                  <IconTrash size={14} />
                  Kartı sil
                </button>
              )}
            </div>

            <div className="modal-actions">
              <span className="modal-shortcut">
                <kbd>Ctrl</kbd> + <kbd>Enter</kbd> kaydet
              </span>
              <button type="button" className="btn" onClick={onClose}>
                Vazgeç
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving || !title.trim()}
              >
                {saving ? (
                  'Kaydediliyor…'
                ) : (
                  <>
                    <IconCheck size={15} />
                    Kaydet
                  </>
                )}
              </button>
            </div>
          </footer>
        </form>
      </div>
    </div>
  );
}
