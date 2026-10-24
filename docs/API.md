# API Sözleşmesi — NeonBoard

Temel adres: `http://localhost:3001`. Tüm yanıtlar JSON; `DELETE` 204 gövdesizdir.
Hatalar **her zaman** şu zarfla döner:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "title zorunlu" } }
```

| Kod | Anlam |
| --- | --- |
| `VALIDATION_ERROR` | 400 · gövde/alan geçersiz |
| `NOT_FOUND` | 404 · id yok veya uç yok |
| `INTERNAL_ERROR` | 500 · beklenmeyen hata |

## Pano şeması

```json
{
  "columns": [
    {
      "id": "col-yapilacak",
      "title": "Yapılacak",
      "order": 0,
      "cards": [
        {
          "id": "c-01",
          "title": "Prisma şemasını yaz",
          "description": "…",
          "label": "backend",
          "dueDate": "2026-10-24T17:00:00.000Z",
          "order": 0
        }
      ]
    }
  ]
}
```

Alan adları birebir: `columnId`, `dueDate`, `order`. `nullable` alanlar `null` döner.

## Uç noktalar

### GET /api/health

```json
{ "status": "ok" }
```

### GET /api/board

Yukarıdaki pano şeması. Kolonlar ve kartlar `order` alanına göre sıralıdır.

### POST /api/columns

Gövde: `{ "title": "Yapılıyor" }` → **201**

```json
{ "id": "col-…", "title": "Yapılıyor", "order": 3, "cards": [] }
```

- Boş/boşluk başlık → 400.

### PATCH /api/columns/:id

Gövde: `{ "title"?: string, "order"?: number }` → **200** · güncel kolon.

- `order` verilirse kolon o indekse taşınır, tüm kolon sıraları 0..n-1 yeniden yazılır.
- Olmayan id → 404.

### DELETE /api/columns/:id

→ **204**. Kolonun kartları cascade silinir, kalan kolon sıraları sıkıştırılır.
Olmayan id → 404.

### POST /api/cards

Gövde:

```json
{
  "columnId": "col-yapilacak",
  "title": "Kart başlığı",
  "description": "opsiyonel",
  "label": "frontend",
  "dueDate": "2026-10-30"
}
```

→ **201** · oluşan kart. `columnId` yoksa veya boşsa 400; kolon yoksa 404.

### PATCH /api/cards/:id

Gövde (hepsi opsiyonel): `title`, `description`, `label`, `dueDate`.
→ **200** · güncel kart. Yalnızca gönderilen alanlar değişir. Olmayan id → 404.

### DELETE /api/cards/:id

→ **204**. Olmayan id → 404. Kalan kart sıraları sıkıştırılır.

### POST /api/cards/:id/move

Gövde:

```json
{ "toColumnId": "col-yapiliyor", "toIndex": 0 }
```

→ **200** · taşınan kart.

Kurallar:

- `toColumnId` yok/boş → 400.
- `toIndex` negatif veya tam sayı değilse → 400.
- Kart yok → 404; hedef kolon yok → 404.
- `toIndex` hedef uzunluğunu aşarsa sona eklenir.
- **Move sonrası kaynak ve hedef kolonda `order` değerleri 0,1,2,… boşluksuz ve
  tekrarsızdır.** Aynı kolon içinde taşımada da sıkıştırılır.

### GET /api/cards?q=&label=

→ **200**

```json
{ "cards": [ { "id": "…", "title": "…", "description": null, "label": "frontend", "dueDate": null, "order": 0 } ] }
```

- `q`: başlık + açıklama + etiket içinde metin araması.
- `label`: etiket eşitliği.
- İkisi birlikte **AND** çalışır.
- Büyük/küçük harf ve Türkçe karakter duyarsız: `İstanbul` ↔ `istanbul`, `IŞIK` ↔ `isik`.

### POST /api/import

Gövde: `{ "board": { "columns": [ … ] } }` → **200**

```json
{ "ok": true, "columns": 6, "cards": 120 }
```

Mevcut tüm veri silinir, gelen pano yüklenir. `GET /api/export` biçimiyle aynıdır.
Eksik `id`/`title` alanları üretilir; `order` yoksa dizi sırası kullanılır.
Geçersiz gövde → 400; işlem atomiktir (hata olursa eski veri korunur).

### GET /api/export

→ **200**

```json
{ "board": { "columns": [ … ] } }
```

## Doğrulama örnekleri

| İstek | Durum |
| --- | --- |
| `POST /api/columns` `{}` | 400 |
| `POST /api/columns` `{"title":"   "}` | 400 |
| `POST /api/cards` `{"title":"x"}` | 400 |
| `PATCH /api/cards/yok-boyle-id` | 404 |
| `DELETE /api/columns/yok-boyle-id` | 404 |
| `POST /api/cards/c-01/move` `{"toIndex":99}` | 400 |

## Hızlı doğrulama

```bash
curl http://localhost:3001/api/health
curl http://localhost:3001/api/board
curl -X POST http://localhost:3001/api/columns -H "Content-Type: application/json" -d '{}'
curl "http://localhost:3001/api/cards?q=istanbul&label=frontend"
```
