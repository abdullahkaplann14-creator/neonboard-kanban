import type { Board, Card, Column } from './types';

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...options,
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new ApiError(
      0,
      'NETWORK_ERROR',
      'API sunucusuna ulaşılamadı. :3001 çalışıyor mu?',
    );
  }

  if (response.status === 204) return undefined as T;

  const raw = await response.text();
  let payload: unknown = null;
  try {
    payload = raw ? JSON.parse(raw) : null;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const envelope = payload as { error?: { code?: string; message?: string } } | null;
    throw new ApiError(
      response.status,
      envelope?.error?.code ?? 'HTTP_ERROR',
      envelope?.error?.message ?? `İstek başarısız oldu (${response.status}).`,
    );
  }

  return payload as T;
}

export type CardInput = {
  columnId: string;
  title: string;
  description?: string | null;
  label?: string | null;
  dueDate?: string | null;
};

export type CardPatch = {
  title?: string;
  description?: string | null;
  label?: string | null;
  dueDate?: string | null;
};

export type ColumnPatch = {
  title?: string;
  order?: number;
};

export const api = {
  getBoard: () => request<Board>('/api/board'),

  createColumn: (title: string) =>
    request<Column>('/api/columns', {
      method: 'POST',
      body: JSON.stringify({ title }),
    }),

  updateColumn: (id: string, patch: ColumnPatch) =>
    request<Column>(`/api/columns/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }),

  deleteColumn: (id: string) =>
    request<void>(`/api/columns/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  createCard: (input: CardInput) =>
    request<Card>('/api/cards', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  updateCard: (id: string, patch: CardPatch) =>
    request<Card>(`/api/cards/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }),

  deleteCard: (id: string) =>
    request<void>(`/api/cards/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  moveCard: (id: string, toColumnId: string, toIndex: number) =>
    request<Card>(`/api/cards/${encodeURIComponent(id)}/move`, {
      method: 'POST',
      body: JSON.stringify({ toColumnId, toIndex }),
    }),
};

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return 'Beklenmeyen bir hata oluştu.';
}
