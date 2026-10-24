# KABUL — 30 madde / 100 puan

Sunum öncesi her satırı kontrol et. `[x]` yalnızca kanıt varsa işaretlenir.

## A · Backend (40 puan) — otomatik test

- [x] **B1** (3p) `:3001` ayakta, `GET /api/health` → `{"status":"ok"}`. Port sabit.
- [x] **B2** (5p) `GET /api/board` iç içe yapı; `columnId`, `dueDate`, `order` birebir.
- [x] **B3** (5p) Kolon POST 201 / PATCH 200 / DELETE 204; silmede kartlar cascade.
- [x] **B4** (5p) Kart POST 201 / PATCH 200 / DELETE 204; PATCH yalnız gönderilen alanı değiştirir.
- [x] **B5** (7p) `move`: hedef indeks doğru; iki kolonun order'ı 0,1,2… boşluksuz.
- [x] **B6** (4p) `GET /api/cards?q=&label=` birlikte çalışır; harf/Türkçe duyarsız.
- [x] **B7** (5p) Eksik/boş başlık 400, olmayan id 404, her hata `{error:{code,message}}`.
- [x] **B8** (4p) Sunucuyu kapat-aç: veri yerinde (SQLite `api/data/kanban.db`).
- [x] **B9** (2p) `POST /api/import` temizleyip yükler; `GET /api/export` aynı biçim.

## B · Frontend (30 puan) — canlı deneme

- [x] **F1** (5p) Kolon/kart ekle-düzenle-sil arayüzden; ağ sekmesinde API istekleri.
- [x] **F2** (5p) Kart başka kolona sürüklenir; yenilemede kalır.
- [x] **F3** (4p) Kart aynı kolon içinde sıralanır; yenilemede kalır.
- [x] **F4** (4p) Kart detayı; açıklama/etiket/son tarih düzenlenip kaydedilir.
- [x] **F5** (3p) Metin araması + etiket filtresi birlikte; sonuç yoksa mesaj.
- [x] **F6** (3p) Yükleniyor / boş / hata durumları ayrı ayrı görünür (API kapatıp dene).
- [x] **F7** (3p) İyimser güncelleme; API hata verirse eski hâle dönüş + uyarı.
- [x] **F8** (2p) `N` yeni kart, `/` arama odağı, `Esc` kapat.
- [x] **F9** (1p) 1024px altı kullanılabilir: yatay kaydırma, üst üste binme yok.

## C · Kenar durumlar (15 puan) — gizli veri

- [x] **E1** (5p) Gizli büyük pano import edilince donma yok; sürükleme akıcı.
- [x] **E2** (3p) 200 karakter başlık/açıklama düzeni bozmaz (sarma/kırpma var).
- [x] **E3** (3p) Türkçe karakterler doğru; arama `İstanbul` ↔ `istanbul`.
- [x] **E4** (2p) Geçmiş `dueDate` görsel olarak işaretli (kırmızı kenar + GECİKTİ).
- [x] **E5** (2p) Import sonrası yenileme aynı veriyi ve sırayı getirir.

## D · Süreç (10 puan)

- [x] **P1** (3p) `docs/PLAN.md`: yapı, şema, uçlar, sıra.
- [x] **P2** (2p) `AGENTS.md`: yığın, portlar, komutlar, kurallar.
- [x] **P3** (2p) En az 5 anlamlı commit (`feat:`, `fix:`, `docs:`…).
- [x] **P4** (3p) `README.md` kurulum komutları temiz klasörde çalışır.

## E · Cila (5 puan)

- [x] **C1** (2p) Tutarlı tipografi/boşluk/renk sistemi; jenerik şablon değil.
- [x] **C2** (2p) Sürükleme ve modal akıcı; bırakılacak yer belli (kolon parlaması + çip).
- [x] **C3** (1p) Boş durum metinleri insan diliyle.

## Gizli test provası (50. dakika)

```text
6 kolon ve 120 kart üret. Bazı başlıklar 200 karakter, bazıları Türkçe
karakterli, bazı dueDate'ler geçmiş. POST /api/import ile yükle; sonra:
 - sürükle-bırak
 - aramada "İSTANBUL"
 - sayfayı yenile
 - import sonrası sayı/sıra
Bulunan sorunları düzelt.
```

## Hızlı kanıt komutları

```bash
curl http://localhost:3001/api/health
npm run test:api
curl -X POST http://localhost:3001/api/columns -H "Content-Type: application/json" -d "{}"
curl -X POST http://localhost:3001/api/cards/c-01/move -H "Content-Type: application/json" -d '{"toColumnId":"col-yapiliyor","toIndex":0}'
```
