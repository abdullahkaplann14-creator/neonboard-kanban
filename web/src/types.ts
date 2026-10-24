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

export type Board = {
  columns: Column[];
};
