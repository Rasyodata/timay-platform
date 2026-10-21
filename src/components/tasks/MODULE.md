# Görev Yönetimi Modülü (TASK.MANAGEMENT)

> "Bir kez geliştir — her projede kullan." KAAN PLATFORM Module Library ilkesine uygun,
> kendi kendine yeten (self-contained) görev yönetimi modülü.

## Amaç
Jira/ClickUp tarzı görev yönetimi + Claude AI otomasyonu. Tek dosyalık UI (`GorevYonetimi.tsx`)
ve tek dinamik tablo (`T-0056 Görev / İş Atama`) üzerine kuruludur; herhangi bir KAAN projesine
tak-çalıştır olarak eklenir.

## Üç yetenek (A / B / C)
- **A — Profesyonel görev sistemi:** Kanban panosu (durum sütunları, sürükle-bırak),
  atanan/öncelik filtreleri, **"Bana Ata"** (çalışan görevi üstlenir), süre takibi
  (tahmini/harcanan saat), ilerleme, etiketler, Pano/Tablo görünümü, detay modalı.
- **B — Yeniden kullanılabilir modül:** Bu klasör (`components/tasks/`) + `T-0056` tablosu
  tek başına taşınabilir. Bağımlılıklar yalnızca: `useModules`, `useUsers`, `RecordForm`.
  Yeni projeye kopyala → `view: "gorev-yonetimi"` route'unu ekle → biter.
- **C — Claude AI otomasyonu:** Görev detayında "Claude ile Çalıştır" → pipeline:
  analiz → alt görevlere böl → kod geliştir → test → doğrula → tamamla.
  Prototipte simülasyon; canlıda **Claude API + sandbox (kod/test) + CI** ile gerçek otomasyon,
  her adım loglanır ve insan onayına sunulur.

## Veri modeli (T-0056)
baslik, atanan (T-0001), oncelik, baslangic, termin, durum, ilerleme,
etiket (labels), tahmini_saat, harcanan_saat, ust_gorev (alt görev), bagimli (bağımlılık), aciklama.

## Entegrasyon adımları (başka projeye ekleme)
1. `components/tasks/` klasörünü kopyala.
2. `T-0056` tablosunu modül kütüphanesinden kur (ModulesContext seed).
3. `App.tsx` route + `nav.ts` kategori eşlemesi: `view: "gorev-yonetimi"`.
4. İstenirse hub'a kart ekle.

## Canlı (production) için C'nin gerçek kurulumu
- Backend servis + görev kuyruğu.
- Claude API (Messages / Tool-Runner) ile görev → alt görev planı üretimi.
- İzole sandbox'ta kod yazma/test (ör. container), sonuçların CI ile doğrulanması.
- Her adımın audit log'u + onay kademesi (bkz. İş Akış & Karar Yönetimi onay hiyerarşisi).
