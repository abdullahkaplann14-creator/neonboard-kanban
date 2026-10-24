# PLAN — NeonBoard

> Tek doğruluk kaynağı. Mimari kararlar burada; kod değişince burası da güncellenir.

## 1. Hedef

Trello çekirdeğini klonlayan, **API sözleşmesine birebir uyan**, sürükle-bırak çalışan,
verisi SQLite'ta kalıcı olan ve neon estetiği taşıyan bir Kanban panosu.

- `api/` → Express 4 + TypeScript + `node:sqlite` + zod, **:3001**
- `web/` → Vite + React 18 + TypeScript + TanStack Query + `@dnd-kit`, **:5173**
- Kökte tek komut: `npm run dev` (concurrently, npm workspaces)
- Arayüz veriyi yalnızca `/api` üzerinden alır; Vite proxy ile CORS yok.

## 2. Klasör yapısı

```
ajan-kanban/
├── package.json            # workspaces + concurrently
├── AGENTS.md               # ajan kuralları (portlar, komutlar, commit)
├── README.md               # kurulum + çalıştırma
├── docs/
│   ├── PLAN.md             # bu dosya
│   ├── API.md              # değişmez sözleşme
│   └── KABUL.md            # 30 kabul kriteri kontrol listesi
├── data/board.json         # 3 kolon / 9 kart başlangıç verisi
├── api/
│   ├── package.json
│   ├── tsconfig.json
│   ├── data/kanban.db      # çalışma anında oluşur (git dışı)
│   └── src/
│       ├── index.ts        # Express, rotalar, doğrulama, hata zarfı
│       ├── db.ts           # SQLite şeması, sorgular, import/export, arama
│       ├── seed.ts         # panoyu demo verisine sıfırlar
│       └── smoke.ts        # sözleşme çekirdeği duman testi
└── web/
    ├── package.json
    ├── vite.config.ts      # /api → :3001 proxy
    └── src/
        ├── App.tsx         # sorgu, filtre, klavye, modal orkestrasyonu
        ├── api.ts          # tipli fetch istemcisi + hata zarfı
        ├── utils.ts        # TR-duyarsız arama, tarih, etiket rengi, move
        ├── styles.css      # neon tasarım sistemi
        ├── hooks/useBoardActions.ts  # iyimser mutation'lar + rollback
        └── components/     # Header, Board, Column, CardItem, CardModal…
```

## 3. Veri şeması (SQLite)

```sql
CREATE TABLE columns (
  id       TEXT PRIMARY KEY,
  title    TEXT NOT NULL,
  position INTEGER NOT NULL
);

CREATE TABLE cards (
  id          TEXT PRIMARY KEY,
  column_id   TEXT NOT NULL REFERENCES columns(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  label       TEXT,
  due_date    TEXT,
  position    INTEGER NOT NULL
);
```

- API'de `position` → `order` olarak eşlenir; snake_case sızdırılmaz.
- `PRAGMA foreign_keys = ON` → kolon silinince kartlar cascade silinir.
- `PRAGMA journal_mode = WAL` → hızlı yazma, dosya kalıcılığı.
- İlk açılışta tablo boşsa `data/board.json` içe aktarılır (seed).
- Sıra değerleri her taşıma/silme sonrası 0..n-1 olarak yeniden yazılır.

## 4. Uç noktalar

| Metot | Yol | Davranış |
| --- | --- | --- |
| GET | `/api/health` | `{status:"ok"}` |
| GET | `/api/board` | iç içe pano |
| POST | `/api/columns` | 201 · kolon |
| PATCH | `/api/columns/:id` | 200 · başlık/sıra |
| DELETE | `/api/columns/:id` | 204 · cascade |
| POST | `/api/cards` | 201 · kart |
| PATCH | `/api/cards/:id` | 200 · kısmi güncelleme |
| DELETE | `/api/cards/:id` | 204 |
| POST | `/api/cards/:id/move` | 200 · sıralar 0..n-1 |
| GET | `/api/cards?q=&label=` | `{cards:[…]}` · TR-duyarsız, AND |
| POST | `/api/import` | 200 · temizle + yükle |
| GET | `/api/export` | `{board:{…}}` |

Hata zarfı her hatada: `{error:{code,message}}`.
Doğrulama zod ile; 400 `VALIDATION_ERROR`, 404 `NOT_FOUND`.

## 5. Frontend veri akışı

1. `useQuery(['board'])` → `GET /api/board`.
2. Tüm mutation'lar `useBoardActions` içinde:
   - `onMutate`: `cancelQueries` → snapshot → cache'e iyimser yaz.
   - `onError`: snapshot'a geri dön + toast.
   - `onSettled`: `invalidateQueries` ile sunucu gerçeğini çek.
3. Sürükleme: `@dnd-kit` `PointerSensor` (6px eşik), kartlar `useSortable`,
   kolon gövdesi `useDroppable`. Bırakınca `POST /api/cards/:id/move`.
4. Arama/etiket filtresi istemcide `normalize()` ile; Türkçe büyük/küçük harf duyarsız.
5. Yükleniyor iskeleti, boş pano, boş kolon, hata paneli ve boş filtre mesajı ayrı ayrı.
6. Klavye: `N` ilk kolonda kart, `/` arama, `Esc` modal/composer kapat.

## 6. Yapım sırası (uygulanan)

1. İskelet: root workspaces, iki proje, `/api/health` yeşil.
2. SQLite şeması + seed + `/api/board`.
3. Kolon/kart CRUD + zod + hata zarfı.
4. `move` + sıra normalizasyonu + arama (TR-duyarsız).
5. Import/export + kalıcılık.
6. Frontend: sorgu, pano, kart/kolon CRUD, üç durum.
7. dnd-kit ile kolon içi + kolonlar arası taşıma.
8. Detay modalı, tarih işareti, uzun metin taşması.
9. Klavye, filtre, iyimser rollback, responsive.
10. Duman testi, README, gizli pano provası, commit'ler.

## 7. Bilinçli kararlar

- **Prisma yerine `node:sqlite`**: Node 24'te yerleşik, native derleme yok, yarışmada
  kurulum riski sıfır. Kalıcılık aynı: tek dosya.
- **Tailwind yerine el yazımı CSS**: neon tasarım sistemini tek dosyada tutmak,
  jenerik şablon görünümünden kaçınmak ve HMR'da sınıf avı yapmamak için.
- **`order` DB'de `position`**: SQL anahtar kelimesiyle çakışmamak için; API'de `order`.
- **Kart başlığı 3 satır, açıklama 2 satır clamp**: uzun metin kart düzenini bozmaz;
  tam metin modalda görünür.
- **Tarih yalnız gün ise gün sonu**: `YYYY-MM-DD` gün bitimine kadar gecikmiş sayılmaz.
