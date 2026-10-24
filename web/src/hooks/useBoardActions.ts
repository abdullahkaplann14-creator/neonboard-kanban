import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, errorMessage, type CardInput, type CardPatch, type ColumnPatch } from '../api';
import type { Board, Card, Column } from '../types';
import { applyMove, clamp } from '../utils';

export type Notify = (kind: 'error' | 'success' | 'info', message: string) => void;

const BOARD_KEY = ['board'] as const;
type Snapshot = { previous: Board | undefined };

const tempId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export function useBoardActions(notify: Notify) {
  const queryClient = useQueryClient();

  const snapshot = async (): Promise<Board | undefined> => {
    await queryClient.cancelQueries({ queryKey: BOARD_KEY });
    return queryClient.getQueryData<Board>(BOARD_KEY);
  };

  const rollback = (previous: Board | undefined) => {
    if (previous) queryClient.setQueryData(BOARD_KEY, previous);
  };

  const settle = () => {
    void queryClient.invalidateQueries({ queryKey: BOARD_KEY });
  };

  const reportError = (error: unknown) => notify('error', errorMessage(error));

  const createColumn = useMutation<Column, Error, string, Snapshot>({
    mutationFn: (title) => api.createColumn(title),
    onMutate: async (title) => {
      const previous = await snapshot();
      if (previous) {
        const optimistic: Column = {
          id: tempId('temp-col'),
          title,
          order: previous.columns.length,
          cards: [],
        };
        queryClient.setQueryData<Board>(BOARD_KEY, {
          columns: [...previous.columns, optimistic],
        });
      }
      return { previous };
    },
    onError: (error, _variables, context) => {
      rollback(context?.previous);
      reportError(error);
    },
    onSettled: settle,
  });

  const updateColumn = useMutation<
    Column,
    Error,
    { id: string; patch: ColumnPatch },
    Snapshot
  >({
    mutationFn: ({ id, patch }) => api.updateColumn(id, patch),
    onMutate: async ({ id, patch }) => {
      const previous = await snapshot();
      if (previous) {
        let columns = previous.columns.map((column) =>
          column.id === id
            ? {
                ...column,
                title: patch.title !== undefined ? patch.title : column.title,
              }
            : column,
        );
        if (patch.order !== undefined) {
          const moved = columns.find((column) => column.id === id);
          if (moved) {
            const rest = columns.filter((column) => column.id !== id);
            rest.splice(clamp(patch.order, 0, rest.length), 0, moved);
            columns = rest.map((column, index) => ({ ...column, order: index }));
          }
        }
        queryClient.setQueryData<Board>(BOARD_KEY, { columns });
      }
      return { previous };
    },
    onError: (error, _variables, context) => {
      rollback(context?.previous);
      reportError(error);
    },
    onSettled: settle,
  });

  const deleteColumn = useMutation<void, Error, string, Snapshot>({
    mutationFn: (id) => api.deleteColumn(id),
    onMutate: async (id) => {
      const previous = await snapshot();
      if (previous) {
        const columns = previous.columns
          .filter((column) => column.id !== id)
          .map((column, index) => ({ ...column, order: index }));
        queryClient.setQueryData<Board>(BOARD_KEY, { columns });
      }
      return { previous };
    },
    onError: (error, _variables, context) => {
      rollback(context?.previous);
      reportError(error);
    },
    onSettled: settle,
  });

  const createCard = useMutation<Card, Error, CardInput, Snapshot>({
    mutationFn: (input) => api.createCard(input),
    onMutate: async (input) => {
      const previous = await snapshot();
      if (previous) {
        const columns = previous.columns.map((column) => {
          if (column.id !== input.columnId) return column;
          const optimistic: Card = {
            id: tempId('temp-card'),
            title: input.title,
            description: input.description ?? null,
            label: input.label ?? null,
            dueDate: input.dueDate ?? null,
            order: column.cards.length,
          };
          return { ...column, cards: [...column.cards, optimistic] };
        });
        queryClient.setQueryData<Board>(BOARD_KEY, { columns });
      }
      return { previous };
    },
    onError: (error, _variables, context) => {
      rollback(context?.previous);
      reportError(error);
    },
    onSettled: settle,
  });

  const updateCard = useMutation<
    Card,
    Error,
    { id: string; patch: CardPatch },
    Snapshot
  >({
    mutationFn: ({ id, patch }) => api.updateCard(id, patch),
    onMutate: async ({ id, patch }) => {
      const previous = await snapshot();
      if (previous) {
        const columns = previous.columns.map((column) => ({
          ...column,
          cards: column.cards.map((card) => {
            if (card.id !== id) return card;
            return {
              ...card,
              ...(patch.title !== undefined ? { title: patch.title } : {}),
              ...(patch.description !== undefined ? { description: patch.description } : {}),
              ...(patch.label !== undefined ? { label: patch.label } : {}),
              ...(patch.dueDate !== undefined ? { dueDate: patch.dueDate } : {}),
            };
          }),
        }));
        queryClient.setQueryData<Board>(BOARD_KEY, { columns });
      }
      return { previous };
    },
    onError: (error, _variables, context) => {
      rollback(context?.previous);
      reportError(error);
    },
    onSettled: settle,
  });

  const deleteCard = useMutation<void, Error, string, Snapshot>({
    mutationFn: (id) => api.deleteCard(id),
    onMutate: async (id) => {
      const previous = await snapshot();
      if (previous) {
        const columns = previous.columns.map((column) => ({
          ...column,
          cards: column.cards
            .filter((card) => card.id !== id)
            .map((card, index) => ({ ...card, order: index })),
        }));
        queryClient.setQueryData<Board>(BOARD_KEY, { columns });
      }
      return { previous };
    },
    onError: (error, _variables, context) => {
      rollback(context?.previous);
      reportError(error);
    },
    onSettled: settle,
  });

  const moveCard = useMutation<
    Card,
    Error,
    { cardId: string; toColumnId: string; toIndex: number },
    Snapshot
  >({
    mutationFn: ({ cardId, toColumnId, toIndex }) => api.moveCard(cardId, toColumnId, toIndex),
    onMutate: async ({ cardId, toColumnId, toIndex }) => {
      const previous = await snapshot();
      if (previous) {
        queryClient.setQueryData<Board>(
          BOARD_KEY,
          applyMove(previous, cardId, toColumnId, toIndex),
        );
      }
      return { previous };
    },
    onError: (error, _variables, context) => {
      rollback(context?.previous);
      reportError(error);
    },
    onSettled: settle,
  });

  return {
    createColumn,
    updateColumn,
    deleteColumn,
    createCard,
    updateCard,
    deleteCard,
    moveCard,
  };
}

export type BoardActions = ReturnType<typeof useBoardActions>;
