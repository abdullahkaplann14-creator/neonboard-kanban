import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import { z } from 'zod';
import {
  createCard,
  createColumn,
  deleteCard,
  deleteColumn,
  getBoard,
  getCard,
  getColumn,
  getColumnRow,
  importBoard,
  moveCard,
  searchCards,
  seedIfEmpty,
  updateCard,
  updateColumn,
  type CardInput,
} from './db.js';

const PORT = 3001;

const app = express();
app.use(cors());
app.use(express.json({ limit: '25mb' }));

const fail = (res: Response, status: number, code: string, message: string) =>
  res.status(status).json({ error: { code, message } });

const firstIssue = (error: z.ZodError, fallback = 'Geçersiz istek gövdesi') =>
  error.issues[0]?.message || fallback;

const nullableText = z.union([z.string(), z.null()]).optional();

const createColumnSchema = z.object({
  title: z.string({ required_error: 'title zorunlu' }).trim().min(1, 'title zorunlu'),
});

const updateColumnSchema = z.object({
  title: z.string().trim().min(1, 'title boş olamaz').optional(),
  order: z.number().int().min(0, 'order 0 veya daha büyük olmalı').optional(),
});

const createCardSchema = z.object({
  columnId: z.string({ required_error: 'columnId zorunlu' }).trim().min(1, 'columnId zorunlu'),
  title: z.string({ required_error: 'title zorunlu' }).trim().min(1, 'title zorunlu'),
  description: nullableText,
  label: nullableText,
  dueDate: nullableText,
});

const updateCardSchema = z.object({
  title: z.string().trim().min(1, 'title boş olamaz').optional(),
  description: nullableText,
  label: nullableText,
  dueDate: nullableText,
});

const moveCardSchema = z.object({
  toColumnId: z.string({ required_error: 'toColumnId zorunlu' }).trim().min(1, 'toColumnId zorunlu'),
  toIndex: z
    .number({ required_error: 'toIndex zorunlu', invalid_type_error: 'toIndex sayı olmalı' })
    .int('toIndex tam sayı olmalı')
    .min(0, 'toIndex 0 veya daha büyük olmalı'),
});

// ——— Sağlık ———
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// ——— Pano / dışa aktarma ———
app.get('/api/board', (_req, res) => {
  res.json(getBoard());
});

app.get('/api/export', (_req, res) => {
  res.json({ board: getBoard() });
});

app.post('/api/import', (req, res) => {
  const board = req.body?.board;
  if (!board || !Array.isArray(board.columns)) {
    return fail(res, 400, 'VALIDATION_ERROR', 'board.columns dizisi zorunlu');
  }
  try {
    const summary = importBoard(board);
    res.status(200).json({ ok: true, ...summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Pano yüklenemedi';
    fail(res, 400, 'VALIDATION_ERROR', message);
  }
});

// ——— Kolonlar ———
app.post('/api/columns', (req, res) => {
  const parsed = createColumnSchema.safeParse(req.body ?? {});
  if (!parsed.success) return fail(res, 400, 'VALIDATION_ERROR', firstIssue(parsed.error, 'title zorunlu'));
  res.status(201).json(createColumn(parsed.data.title));
});

app.patch('/api/columns/:id', (req, res) => {
  if (!getColumnRow(req.params.id)) {
    return fail(res, 404, 'NOT_FOUND', 'Kolon bulunamadı');
  }
  const parsed = updateColumnSchema.safeParse(req.body ?? {});
  if (!parsed.success) return fail(res, 400, 'VALIDATION_ERROR', firstIssue(parsed.error));
  const column = updateColumn(req.params.id, parsed.data);
  if (!column) return fail(res, 404, 'NOT_FOUND', 'Kolon bulunamadı');
  res.json(column);
});

app.delete('/api/columns/:id', (req, res) => {
  if (!deleteColumn(req.params.id)) {
    return fail(res, 404, 'NOT_FOUND', 'Kolon bulunamadı');
  }
  res.status(204).end();
});

// ——— Kartlar ———
app.get('/api/cards', (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q : '';
  const label = typeof req.query.label === 'string' ? req.query.label : '';
  res.json({ cards: searchCards(q, label) });
});

app.post('/api/cards', (req, res) => {
  const parsed = createCardSchema.safeParse(req.body ?? {});
  if (!parsed.success) return fail(res, 400, 'VALIDATION_ERROR', firstIssue(parsed.error));
  const input = parsed.data as CardInput;
  if (!getColumnRow(input.columnId)) {
    return fail(res, 404, 'NOT_FOUND', 'Kolon bulunamadı');
  }
  const card = createCard(input);
  if (!card) return fail(res, 404, 'NOT_FOUND', 'Kolon bulunamadı');
  res.status(201).json(card);
});

app.patch('/api/cards/:id', (req, res) => {
  if (!getCard(req.params.id)) {
    return fail(res, 404, 'NOT_FOUND', 'Kart bulunamadı');
  }
  const parsed = updateCardSchema.safeParse(req.body ?? {});
  if (!parsed.success) return fail(res, 400, 'VALIDATION_ERROR', firstIssue(parsed.error));
  const card = updateCard(req.params.id, parsed.data);
  if (!card) return fail(res, 404, 'NOT_FOUND', 'Kart bulunamadı');
  res.json(card);
});

app.delete('/api/cards/:id', (req, res) => {
  if (!deleteCard(req.params.id)) {
    return fail(res, 404, 'NOT_FOUND', 'Kart bulunamadı');
  }
  res.status(204).end();
});

app.post('/api/cards/:id/move', (req, res) => {
  const parsed = moveCardSchema.safeParse(req.body ?? {});
  if (!parsed.success) return fail(res, 400, 'VALIDATION_ERROR', firstIssue(parsed.error));

  const result = moveCard(req.params.id, parsed.data.toColumnId, parsed.data.toIndex);
  if (result.error === 'card') return fail(res, 404, 'NOT_FOUND', 'Kart bulunamadı');
  if (result.error === 'column') return fail(res, 404, 'NOT_FOUND', 'Hedef kolon bulunamadı');
  res.json(result.card);
});

app.get('/', (_req, res) => {
  res.json({
    name: 'NeonBoard API',
    status: 'ok',
    endpoints: ['/api/health', '/api/board', '/api/columns', '/api/cards', '/api/import', '/api/export'],
  });
});

app.use('/api', (_req, res) => {
  fail(res, 404, 'NOT_FOUND', 'Uç nokta bulunamadı');
});

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const isJsonError =
    err instanceof SyntaxError || (typeof err === 'object' && err !== null && 'type' in err);
  if (isJsonError) {
    return fail(res, 400, 'VALIDATION_ERROR', 'Geçersiz JSON gövdesi');
  }
  console.error('[api] beklenmeyen hata:', err);
  fail(res, 500, 'INTERNAL_ERROR', 'Sunucu hatası');
});

seedIfEmpty();

app.listen(PORT, () => {
  console.log(`[api] NeonBoard API hazır → http://localhost:${PORT}`);
  console.log(`[api] Sağlık kontrolü → http://localhost:${PORT}/api/health`);
});
