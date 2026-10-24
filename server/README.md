# Timay — WebRTC Sinyal Sunucusu

Toplantı Odası'nda **gerçek çok-kullanıcılı canlı yayın** için küçük bir
WebSocket sinyal sunucusu. Yalnızca SDP/ICE sinyallerini yönlendirir; ses/görüntü
doğrudan tarayıcılar arasında (P2P) akar, bu sunucudan geçmez.

## Yerelde çalıştırma
```bash
cd server
npm install
npm start        # :8080 dinler
```

## Render'a deploy (Web Service)
1. Render → **New** → **Web Service** → aynı repo (`Rasyodata/timay-platform`).
2. Ayarlar:
   - **Root Directory:** `server`
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance:** Free yeterli (küçük toplantılar için mesh).
3. Deploy sonrası adresi al: `https://<servis-adi>.onrender.com`
   → WebSocket adresi: `wss://<servis-adi>.onrender.com`

## Frontend'e bağlama
Statik site (timay-platform) → **Environment** → ekle:
```
VITE_SIGNAL_URL = wss://<servis-adi>.onrender.com
```
Sonra statik siteyi **yeniden deploy et**. Artık Toplantı Odası → Yayına Katıl
gerçek P2P canlı yayını başlatır (kamera/mikrofon/ekran paylaşımı + izleyici linki).

> Not: Çoğu ağda Google STUN yeterlidir. Kurumsal/katı NAT'larda bağlantı için
> ayrıca bir **TURN** sunucusu gerekebilir (ör. coturn ya da bir TURN servisi);
> `src/lib/useYayin.ts` içindeki `iceServers` listesine eklenir.
