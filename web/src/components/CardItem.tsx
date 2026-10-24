import type { CSSProperties } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Card } from '../types';
import { formatDue, isOverdue, labelStyle } from '../utils';
import { IconClock } from './Icons';

export function CardFace({ card }: { card: Card }) {
  const overdue = isOverdue(card.dueDate);

  return (
    <>
      <div className="card-top">
        {card.label ? (
          <span className="card-label" style={labelStyle(card.label)} title={card.label}>
            {card.label}
          </span>
        ) : (
          <span className="card-label card-label--empty">ETİKETSİZ</span>
        )}
        <span className="card-grip" aria-hidden="true">
          {[0, 1, 2, 3, 4, 5].map((dot) => (
            <i key={dot} />
          ))}
        </span>
      </div>

      <h3 className="card-title">{card.title}</h3>

      {card.description ? <p className="card-desc">{card.description}</p> : null}

      {card.dueDate ? (
        <div className="card-foot">
          <span className={`card-due ${overdue ? 'is-overdue' : ''}`}>
            <IconClock size={12} />
            {formatDue(card.dueDate)}
          </span>
          {overdue ? <span className="card-late">GECİKTİ</span> : null}
        </div>
      ) : null}
    </>
  );
}

type CardItemProps = {
  card: Card;
  columnId: string;
  onOpen: (cardId: string) => void;
  canOpen: () => boolean;
};

export function CardItem({ card, columnId, onOpen, canOpen }: CardItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: { type: 'card', columnId },
  });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={`card ${isDragging ? 'is-dragging' : ''} ${
        isOverdue(card.dueDate) ? 'card--overdue' : ''
      }`}
      {...attributes}
      {...listeners}
      role="button"
      tabIndex={0}
      aria-label={`${card.title} — kart detayını aç`}
      onClick={() => {
        if (canOpen()) onOpen(card.id);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          onOpen(card.id);
        }
      }}
    >
      <CardFace card={card} />
    </article>
  );
}
