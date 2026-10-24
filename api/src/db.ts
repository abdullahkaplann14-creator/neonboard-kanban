import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const DB_PATH = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : path.join(here, '..', 'data', 'kanban.db');

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

export const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS columns (
    id       TEXT PRIMARY KEY,
    title    TEXT NOT NULL,
    position INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS cards (
    id          TEXT PRIMARY KEY,
    column_id   TEXT NOT NULL REFERENCES columns(id) ON DELETE CASCADE,
    title       TEXT NOT NULL,
    description TEXT,
    label       TEXT,
    due_date    TEXT,
    position    INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS meta (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_cards_column ON cards(column_id, position);
`);

export type Card = {
  id: string;
  title: string;
  description: string | null;
  label: string | null;
  dueDate: string | null;
  order: number;
};

export type Column = {
  id: string;
  title: string;
  order: number;
  cards: Card[];
};

export type Board = { columns: Column[] };

type ColumnRow = { id: string; title: string; position: number };
type CardRow = {
  id: string;
  column_id: string;
  title: string;
  description: string | null;
  label: string | null;
  due_date: string | null;
  position: number;
};

export const newId = (prefix: string) =>
  `${prefix}-${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;

export function tx<T>(fn: () => T): T {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

const serializeCard = (row: CardRow): Card => ({
  id: row.id,
  title: row.title,
  description: row.description,
  label: row.label,
  dueDate: row.due_date,
  order: row.position,
});

const columnRows = () =>
  db.prepare('SELECT id, title, position FROM columns ORDER BY position, rowid').all() as ColumnRow[];

const cardRows = () =>
  db
    .prepare(
      `SELECT id, column_id, title, description, label, due_date, position
       FROM cards ORDER BY position, rowid`,
    )
    .all() as CardRow[];

export function getBoard(): Board {
  const cardsByColumn = new Map<string, Card[]>();
  for (const row of cardRows()) {
    const list = cardsByColumn.get(row.column_id) ?? [];
    list.push(serializeCard(row));
    cardsByColumn.set(row.column_id, list);
  }
  return {
    columns: columnRows().map((row) => ({
      id: row.id,
      title: row.title,
      order: row.position,
      cards: cardsByColumn.get(row.id) ?? [],
    })),
  };
}

export function getColumnRow(id: string): ColumnRow | undefined {
  return db.prepare('SELECT id, title, position FROM columns WHERE id = ?').get(id) as
    | ColumnRow
    | undefined;
}

export function getColumn(id: string): Column | null {
  const row = getColumnRow(id);
  if (!row) return null;
  const cards = (
    db
      .prepare(
        'SELECT id, column_id, title, description, label, due_date, position FROM cards WHERE column_id = ? ORDER BY position, rowid',
      )
      .all(id) as CardRow[]
  ).map(serializeCard);
  return { id: row.id, title: row.title, order: row.position, cards };
}

export function getCardRow(id: string): CardRow | undefined {
  return db
    .prepare(
      'SELECT id, column_id, title, description, label, due_date, position FROM cards WHERE id = ?',
    )
    .get(id) as CardRow | undefined;
}

export function getCard(id: string): Card | null {
  const row = getCardRow(id);
  return row ? serializeCard(row) : null;
}

const cardIdsInColumn = (columnId: string) =>
  (
    db
      .prepare('SELECT id FROM cards WHERE column_id = ? ORDER BY position, rowid')
      .all(columnId) as { id: string }[]
  ).map((row) => row.id);

const setCardPosition = db.prepare('UPDATE cards SET position = ? WHERE id = ?');

function renumberCards(columnId: string) {
  cardIdsInColumn(columnId).forEach((id, index) => setCardPosition.run(index, id));
}

export function createColumn(title: string): Column {
  const next =
    Number(
      (
        db.prepare('SELECT COALESCE(MAX(position), -1) + 1 AS next FROM columns').get() as {
          next: number;
        }
      ).next,
    ) || 0;
  const id = newId('col');
  db.prepare('INSERT INTO columns (id, title, position) VALUES (?, ?, ?)').run(id, title, next);
  return getColumn(id)!;
}

export function updateColumn(
  id: string,
  patch: { title?: string; order?: number },
): Column | null {
  const existing = getColumnRow(id);
  if (!existing) return null;

  tx(() => {
    if (patch.title !== undefined) {
      db.prepare('UPDATE columns SET title = ? WHERE id = ?').run(patch.title, id);
    }
    if (patch.order !== undefined) {
      const ids = columnRows()
        .map((row) => row.id)
        .filter((columnId) => columnId !== id);
      const target = Math.min(Math.max(patch.order, 0), ids.length);
      ids.splice(target, 0, id);
      const update = db.prepare('UPDATE columns SET position = ? WHERE id = ?');
      ids.forEach((columnId, index) => update.run(index, columnId));
    }
  });

  return getColumn(id);
}

export function deleteColumn(id: string): boolean {
  const existing = getColumnRow(id);
  if (!existing) return false;
  tx(() => {
    db.prepare('DELETE FROM columns WHERE id = ?').run(id);
    columnRows().forEach((row, index) => {
      db.prepare('UPDATE columns SET position = ? WHERE id = ?').run(index, row.id);
    });
  });
  return true;
}

export type CardInput = {
  columnId: string;
  title: string;
  description?: string | null;
  label?: string | null;
  dueDate?: string | null;
};

export function createCard(input: CardInput): Card | null {
  if (!getColumnRow(input.columnId)) return null;
  const next = cardIdsInColumn(input.columnId).length;
  const id = newId('card');
  db.prepare(
    `INSERT INTO cards (id, column_id, title, description, label, due_date, position)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.columnId,
    input.title,
    input.description ?? null,
    input.label ?? null,
    input.dueDate ?? null,
    next,
  );
  return getCard(id);
}

export function updateCard(
  id: string,
  patch: {
    title?: string;
    description?: string | null;
    label?: string | null;
    dueDate?: string | null;
  },
): Card | null {
  const existing = getCardRow(id);
  if (!existing) return null;

  const fields: string[] = [];
  const values: (string | null)[] = [];
  if (patch.title !== undefined) {
    fields.push('title = ?');
    values.push(patch.title);
  }
  if (patch.description !== undefined) {
    fields.push('description = ?');
    values.push(patch.description);
  }
  if (patch.label !== undefined) {
    fields.push('label = ?');
    values.push(patch.label);
  }
  if (patch.dueDate !== undefined) {
    fields.push('due_date = ?');
    values.push(patch.dueDate);
  }
  if (fields.length > 0) {
    db.prepare(`UPDATE cards SET ${fields.join(', ')} WHERE id = ?`).run(...values, id);
  }
  return getCard(id);
}

export function deleteCard(id: string): boolean {
  const existing = getCardRow(id);
  if (!existing) return false;
  tx(() => {
    db.prepare('DELETE FROM cards WHERE id = ?').run(id);
    renumberCards(existing.column_id);
  });
  return true;
}

export function moveCard(
  cardId: string,
  toColumnId: string,
  toIndex: number,
): { card?: Card; error?: 'card' | 'column' } {
  const card = getCardRow(cardId);
  if (!card) return { error: 'card' };
  if (!getColumnRow(toColumnId)) return { error: 'column' };

  tx(() => {
    if (card.column_id === toColumnId) {
      const ids = cardIdsInColumn(toColumnId).filter((id) => id !== cardId);
      const target = Math.min(Math.max(toIndex, 0), ids.length);
      ids.splice(target, 0, cardId);
      ids.forEach((id, index) => setCardPosition.run(index, id));
      return;
    }

    const sourceIds = cardIdsInColumn(card.column_id).filter((id) => id !== cardId);
    const targetIds = cardIdsInColumn(toColumnId);
    const target = Math.min(Math.max(toIndex, 0), targetIds.length);

    db.prepare('UPDATE cards SET column_id = ? WHERE id = ?').run(toColumnId, cardId);
    targetIds.splice(target, 0, cardId);

    sourceIds.forEach((id, index) => setCardPosition.run(index, id));
    targetIds.forEach((id, index) => setCardPosition.run(index, id));
  });

  return { card: getCard(cardId)! };
}

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

/** Türkçe duyarsız normalizasyon: İstanbul ↔ istanbul, IŞIK ↔ isik */
export function normalize(value: string): string {
  return value
    .replace(/[ıİIşŞğĞçÇöÖüÜ]/g, (char) => trMap[char] ?? char)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function searchCards(q: string, label: string): Card[] {
  const needle = normalize(q ?? '').trim();
  const wantedLabel = normalize(label ?? '').trim();
  return cardRows()
    .filter((row) => {
      if (wantedLabel && normalize(row.label ?? '').trim() !== wantedLabel) return false;
      if (!needle) return true;
      return normalize(`${row.title} ${row.description ?? ''} ${row.label ?? ''}`).includes(needle);
    })
    .map(serializeCard);
}

export type ImportBoard = {
  columns: {
    id?: string;
    title?: string;
    order?: number;
    cards?: {
      id?: string;
      title?: string;
      description?: string | null;
      label?: string | null;
      dueDate?: string | null;
      order?: number;
    }[];
  }[];
};

export function importBoard(board: ImportBoard): { columns: number; cards: number } {
  if (!board || !Array.isArray(board.columns)) {
    throw new Error('board.columns dizisi zorunlu');
  }

  let cardCount = 0;
  tx(() => {
    db.exec('DELETE FROM cards');
    db.exec('DELETE FROM columns');

    const orderedColumns = board.columns
      .map((column, index) => ({
        column,
        index,
        order: Number.isFinite(column.order) ? Number(column.order) : index,
      }))
      .sort((a, b) => a.order - b.order || a.index - b.index);

    db.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES ('seeded', '1')").run();

    orderedColumns.forEach(({ column }, columnIndex) => {
      const columnId =
        typeof column.id === 'string' && column.id.trim() ? column.id : newId('col');
      const columnTitle =
        typeof column.title === 'string' && column.title.trim()
          ? column.title.trim()
          : `Kolon ${columnIndex + 1}`;
      db.prepare('INSERT INTO columns (id, title, position) VALUES (?, ?, ?)').run(
        columnId,
        columnTitle,
        columnIndex,
      );

      const cards = Array.isArray(column.cards) ? column.cards : [];
      cards
        .map((card, index) => ({
          card,
          index,
          order: Number.isFinite(card.order) ? Number(card.order) : index,
        }))
        .sort((a, b) => a.order - b.order || a.index - b.index)
        .forEach(({ card }, cardIndex) => {
          const cardId = typeof card.id === 'string' && card.id.trim() ? card.id : newId('card');
          const cardTitle =
            typeof card.title === 'string' && card.title.trim()
              ? card.title.trim()
              : `Kart ${cardIndex + 1}`;
          db.prepare(
            `INSERT INTO cards (id, column_id, title, description, label, due_date, position)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
          ).run(
            cardId,
            columnId,
            cardTitle,
            typeof card.description === 'string' ? card.description : null,
            typeof card.label === 'string' ? card.label : null,
            typeof card.dueDate === 'string' ? card.dueDate : null,
            cardIndex,
          );
          cardCount += 1;
        });
    });
  });

  return { columns: board.columns.length, cards: cardCount };
}

/** Yalnızca ilk açılışta kök data/board.json dosyasından tohumla. */
export function seedIfEmpty(): void {
  const seeded = db.prepare("SELECT value FROM meta WHERE key = 'seeded'").get();
  if (seeded) return;

  const count = Number(
    (db.prepare('SELECT COUNT(*) AS count FROM columns').get() as { count: number }).count,
  );
  if (count > 0) {
    // Eski sürümden gelen veritabanı: yeniden tohumlamadan işaretle.
    db.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES ('seeded', '1')").run();
    return;
  }

  const seedPath = path.join(here, '..', '..', 'data', 'board.json');
  if (!fs.existsSync(seedPath)) return;

  try {
    const raw = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
    importBoard(raw.board ?? raw);
    console.log(`[seed] data/board.json yüklendi (${DB_PATH})`);
  } catch (error) {
    console.error('[seed] tohum verisi yüklenemedi:', error);
  }
}
