import type { Board, Card, Column } from './types';

const trMap: Record<string, string> = {
  ı: 'i',
  İ: 'i',
  I: 'i',
  ş: 's',
  Ş: 's',
  ğ: 'g',
  Ğ: 'g',
  ç: 'c',
  Ç: 'c',
  ö: 'o',
  Ö: 'o',
  ü: 'u',
  Ü: 'u',
};

/** Türkçe duyarsız arama: İstanbul ↔ istanbul, IŞIK ↔ isik */
export function normalize(value: string): string {
  return value
    .replace(/[ıİIşŞğĞçÇöÖüÜ]/g, (char) => trMap[char] ?? char)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function cardMatches(card: Card, needle: string, label: string): boolean {
  const q = normalize(needle).trim();
  const wantedLabel = normalize(label).trim();
  if (wantedLabel && normalize(card.label ?? '').trim() !== wantedLabel) return false;
  if (!q) return true;
  return normalize(`${card.title} ${card.description ?? ''} ${card.label ?? ''}`).includes(q);
}

export function filterBoard(board: Board, query: string, label: string): Board {
  return {
    columns: board.columns.map((column) => ({
      ...column,
      cards: column.cards.filter((card) => cardMatches(card, query, label)),
    })),
  };
}

export function countCards(board: Board | undefined): number {
  if (!board) return 0;
  return board.columns.reduce((sum, column) => sum + column.cards.length, 0);
}

export function parseDueDate(value: string): Date {
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (dateOnly) {
    return new Date(
      Number(dateOnly[1]),
      Number(dateOnly[2]) - 1,
      Number(dateOnly[3]),
      23,
      59,
      59,
      999,
    );
  }
  return new Date(value);
}

export function isOverdue(value: string | null | undefined): boolean {
  if (!value) return false;
  const date = parseDueDate(value);
  if (Number.isNaN(date.getTime())) return false;
  return date.getTime() < Date.now();
}

export function formatDue(value: string): string {
  const date = parseDueDate(value);
  if (Number.isNaN(date.getTime())) return value;
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
  }).format(date);
}

export function toDateInput(value: string | null): string {
  if (!value) return '';
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (dateOnly) return `${dateOnly[1]}-${dateOnly[2]}-${dateOnly[3]}`;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function findCard(
  board: Board,
  cardId: string,
): { card: Card; column: Column; index: number } | null {
  for (const column of board.columns) {
    const index = column.cards.findIndex((card) => card.id === cardId);
    if (index >= 0) return { card: column.cards[index], column, index };
  }
  return null;
}

const LABEL_PALETTE = [
  { color: '#7dffe9', background: 'rgba(94, 242, 214, 0.11)', borderColor: 'rgba(94, 242, 214, 0.34)' },
  { color: '#ff9cc8', background: 'rgba(255, 77, 157, 0.11)', borderColor: 'rgba(255, 77, 157, 0.34)' },
  { color: '#d6ff8f', background: 'rgba(182, 255, 94, 0.09)', borderColor: 'rgba(182, 255, 94, 0.28)' },
  { color: '#c3b1ff', background: 'rgba(148, 116, 255, 0.13)', borderColor: 'rgba(148, 116, 255, 0.34)' },
  { color: '#ffd98a', background: 'rgba(255, 193, 79, 0.11)', borderColor: 'rgba(255, 193, 79, 0.3)' },
];

export function labelStyle(label: string) {
  let hash = 0;
  for (let index = 0; index < label.length; index += 1) {
    hash = (hash * 31 + label.charCodeAt(index)) % 997;
  }
  return LABEL_PALETTE[hash % LABEL_PALETTE.length];
}

export const COLUMN_ACCENTS = ['#5ef2d6', '#ff4d9d', '#b6ff5e', '#a78bfa', '#ffc14f'];

/** İyimser taşıma: kartı hedef kolonun indeksine taşır, order değerlerini boşluksuz yazar. */
export function applyMove(
  board: Board,
  cardId: string,
  toColumnId: string,
  toIndex: number,
): Board {
  const source = board.columns.find((column) => column.cards.some((card) => card.id === cardId));
  const target = board.columns.find((column) => column.id === toColumnId);
  if (!source || !target) return board;

  const sourceIndex = source.cards.findIndex((card) => card.id === cardId);
  if (sourceIndex < 0) return board;

  const columns = board.columns.map((column) => ({
    ...column,
    cards: [...column.cards],
  }));
  const nextSource = columns.find((column) => column.id === source.id)!;
  const [moved] = nextSource.cards.splice(sourceIndex, 1);
  if (!moved) return board;

  const nextTarget = columns.find((column) => column.id === toColumnId)!;
  const index = clamp(toIndex, 0, nextTarget.cards.length);
  nextTarget.cards.splice(index, 0, moved);

  columns.forEach((column) => {
    column.cards = column.cards.map((card, cardIndex) => ({ ...card, order: cardIndex }));
  });

  return { columns };
}
