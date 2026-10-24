# AGENTS.md — NeonBoard

## Yığın

- **api/** — Node 24 + Express 4 + TypeScript (tsx) + `node:sqlite` + zod. Port **3001** (sabit).
- **web/** — Vite + React 18 + TypeScript + TanStack Query + `@dnd-kit`. Port **5173** (sabit).
- Stil: el yazımı CSS (tasarım sistemi `web/src/styles.css` içinde). Tailwind yok.
- Kök: npm workspaces + `concurrently`.

## Komutlar

```bash
npm install          # kökte: api + web bağımlılıkları
npm run dev          # ikisi birlikte: api :3001, web :5173
npm run test:api     # sözleşme duman testleri
npm run build        # web üretim derlemesi
```

## Değişmez kurallar

1. Portlar değişmez: **3001** / **5173**. Vite `/api` isteklerini 3001'e proxy'ler.
2. API yanıt alan adları sözleşmedeki gibi: `columnId`, `dueDate`, `order`. Snake_case yok.
3. Her hata `{ "error": { "code", "message" } }` zarfıyla döner.
4. Başarı kodları: POST 201, PATCH 200, DELETE 204, move 200.
5. `move` sonrası kaynak ve hedef kolonda `order` 0'dan başlar, boşluksuz ve tekrarsızdır.
6. Veri `api/data/kanban.db` SQLite dosyasında kalıcıdır. Bellek dizisi kullanılmaz.
7. Arayüz veriyi yalnızca API'den alır; frontend'de sabit pano verisi yoktur.
8. Sürükle-bırak iyimser çalışır; API hata verirse eski hâle dönülür ve toast gösterilir.
9. `npm run dev` her zaman çalışır durumda tutulur. Bozulan adım commit edilmez.
10. Her yeşil adımda anlamlı commit: `feat:`, `fix:`, `docs:`, `test:`.
