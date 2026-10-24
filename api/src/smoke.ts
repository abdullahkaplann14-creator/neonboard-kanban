import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Testler geçici bir SQLite dosyasında koşar; gerçek panoya dokunmaz.
const testDb = path.join(os.tmpdir(), `neonboard-smoke-${Date.now()}.db`);
process.env.DB_PATH = testDb;

const {
  createCard,
  createColumn,
  db,
  deleteColumn,
  getBoard,
  getCard,
  importBoard,
  moveCard,
  searchCards,
  seedIfEmpty,
  updateCard,
} = await import('./db.js');

const orderIsContiguous = (orders: number[]) =>
  orders.every((order, index) => order === index);

const totalCards = (board: ReturnType<typeof getBoard>) =>
  board.columns.reduce((sum, column) => sum + column.cards.length, 0);

let checks = 0;
const ok = (label: string) => {
  checks += 1;
  console.log(`  ✓ ${label}`);
};

try {
  seedIfEmpty();
  const initial = getBoard();
  assert.equal(initial.columns.length, 3);
  assert.equal(totalCards(initial), 9);
  ok('seed: 3 kolon / 9 kart');

  const testColumn = createColumn('Test Kolonu');
  assert.equal(testColumn.order, 3);
  assert.deepEqual(testColumn.cards, []);
  ok('kolon oluşturma ve sıra');

  const card = createCard({
    columnId: testColumn.id,
    title: 'İstanbul Lansmanı',
    description: "Şişli'de ĞÜŞİÖÇ karakter testi",
    label: 'Frontend',
  });
  assert.ok(card);
  assert.equal(card!.order, 0);
  ok('kart oluşturma');

  assert.equal(searchCards('İSTANBUL', '').length, 1);
  assert.equal(searchCards('istanbul', 'frontend').length, 1);
  assert.equal(searchCards('istanbul', 'backend').length, 0);
  assert.equal(searchCards('sisli', '').length, 1);
  ok('Türkçe duyarsız arama + etiket filtresi AND');

  const second = createCard({ columnId: testColumn.id, title: 'İkinci kart' });
  assert.ok(second);
  const moved = moveCard(second!.id, 'col-yapilacak', 0);
  assert.equal(moved.card?.order, 0);

  const afterMove = getBoard();
  const source = afterMove.columns.find((column) => column.id === testColumn.id)!;
  const target = afterMove.columns.find((column) => column.id === 'col-yapilacak')!;
  assert.equal(target.cards[0].id, second!.id);
  assert.ok(orderIsContiguous(source.cards.map((item) => item.order)));
  assert.ok(orderIsContiguous(target.cards.map((item) => item.order)));
  ok('kolonlar arası move + iki kolonda 0..n-1 sıra');

  moveCard(card!.id, testColumn.id, 0);
  assert.equal(
    getBoard().columns.find((column) => column.id === testColumn.id)!.cards[0].id,
    card!.id,
  );
  ok('aynı kolon içinde move');

  const before = getCard(card!.id)!;
  const patched = updateCard(card!.id, { description: 'sadece açıklama değişti' });
  assert.equal(patched?.title, before.title);
  assert.equal(patched?.description, 'sadece açıklama değişti');
  assert.equal(patched?.label, before.label);
  ok('PATCH yalnız gönderilen alanı değiştirir');

  const columnId = testColumn.id;
  assert.equal(deleteColumn(columnId), true);
  assert.equal(getCard(card!.id), null);
  assert.ok(orderIsContiguous(getBoard().columns.map((column) => column.order)));
  ok('kolon silme cascade + kolon sırası sıkıştırma');

  const summary = importBoard({
    columns: [
      {
        id: 'x1',
        title: 'Bir',
        order: 0,
        cards: [
          { id: 'k1', title: 'Kart 1', label: 'a', order: 0 },
          { id: 'k2', title: 'Kart 2', order: 1 },
        ],
      },
      { id: 'x2', title: 'İki', order: 1, cards: [] },
    ],
  });
  assert.equal(summary.columns, 2);
  assert.equal(summary.cards, 2);
  assert.deepEqual(getBoard().columns.map((column) => column.id), ['x1', 'x2']);
  assert.deepEqual(getBoard().columns[0].cards.map((item) => item.order), [0, 1]);
  ok('import temizleyip yükler, export biçimiyle aynı');

  const big = {
    columns: Array.from({ length: 6 }, (_, columnIndex) => ({
      title: `Kolon ${columnIndex}`,
      order: columnIndex,
      cards: Array.from({ length: 20 }, (_, cardIndex) => ({
        title: `${columnIndex}-${cardIndex} İstanbul`,
        order: cardIndex,
      })),
    })),
  };
  assert.deepEqual(importBoard(big), { columns: 6, cards: 120 });
  assert.equal(searchCards('İSTANBUL', '').length, 120);
  ok('6 kolon / 120 kart import + arama');

  assert.equal(createCard({ columnId: 'yok-boyle-kolon', title: 'x' }), null);
  ok('olmayan kolona kart → null (HTTP 404)');

  console.log(`\n[smoke] ${checks} kontrol geçti. API çekirdeği sağlam.`);
} finally {
  db.close();
  for (const suffix of ['', '-wal', '-shm']) {
    try {
      fs.rmSync(`${testDb}${suffix}`, { force: true });
    } catch {
      /* yok say */
    }
  }
}
