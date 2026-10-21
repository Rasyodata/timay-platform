# Timay Platform — Overview Dashboard (Frontend)

Proje · Yatırım · Ortaklık · Emlak süreçlerini tek ekranda yöneten, canlı ve
dinamik bir **React + TypeScript + Tailwind CSS** dashboard prototipi.
Grafikler **Recharts** ile çizilir; veriler `src/data/mockData.ts` içindeki
gerçekçi mock verilerden gelir ve `DashboardContext` üzerinden canlı simüle edilir.

## Çalıştırma

```bash
cd frontend
npm install        # veya pnpm install
npm run dev        # http://localhost:5173
```

Diğer komutlar:

```bash
npm run build      # tip kontrolü + production build (dist/)
npm run preview    # build çıktısını önizle
npm run lint       # tsc --noEmit
```

## Mimari

```
src/
├─ App.tsx                     # Shell: Sidebar + Navbar + Dashboard
├─ types.ts                    # Alan modelleri (Project, Metric, Activity…)
├─ context/
│  └─ DashboardContext.tsx     # State: filtre, arama, seçili proje, canlı tick
├─ data/mockData.ts            # Gerçekçi mock veriler + kategori/durum meta
├─ lib/format.ts               # TRY / yüzde / tarih biçimlendirme (tr-TR)
├─ components/
│  ├─ layout/
│  │  ├─ Sidebar.tsx           # Daralabilir sol navigasyon
│  │  └─ Navbar.tsx            # Arama, canlı toggle, bildirim, profil
│  ├─ ui/Sparkline.tsx         # Yeniden kullanılabilir mini grafik
│  └─ dashboard/
│     ├─ Dashboard.tsx         # ► Ana bileşen (widget düzeni)
│     ├─ MetricCard.tsx        # Sparkline'lı metrik kartları
│     ├─ FilterBar.tsx         # Kategori segmentasyonu + arama
│     ├─ PerformanceChart.tsx  # Alan grafiği (getiri + değerleme)
│     ├─ ProjectPipeline.tsx   # Canlı proje takip grid'i
│     ├─ PartnershipPanel.tsx  # Ortaklar + aktivite akışı
│     └─ ProjectDrawer.tsx     # Sağdan açılan detay paneli
└─ index.css                   # Tailwind katmanları + tema yardımcıları
```

## Tasarım sistemi

- **Koyu mod öncelikli**, neon vurgulu tema (`tailwind.config.js` → `colors`).
- Grafik serisi renkleri (**mavi `#3987e5` · zümrüt `#199e70` · mor `#9085e9` ·
  amber `#c98500`**) koyu zemine karşı **renk körlüğü (CVD) ve kontrast** açısından
  doğrulanmıştır; kimlik asla yalnızca renge bırakılmaz (lejant + doğrudan etiket).
- Tek eksen kuralı: getiri ve değerleme aynı TRY ölçeğinde olduğundan tek Y ekseni
  kullanılır (çift eksen anti-pattern'inden kaçınılmıştır).

## Backend'e bağlama

Mock katmanı tek noktada: `src/data/mockData.ts`. Gerçek API'ye geçerken
`DashboardContext` içindeki seed importlarını `fetch("/api/...")` çağrılarıyla
değiştirmek yeterlidir; bileşen arayüzleri (props) değişmez.
