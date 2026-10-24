import { useEffect, useRef, useState } from "react";
import {
  Video, VideoOff, Mic, MicOff, PhoneOff, Maximize2, Radio, MonitorUp, Link2, Check, Eye,
  ZoomIn, ZoomOut, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, RotateCcw, Loader2,
} from "lucide-react";
import { useYayin } from "@/lib/useYayin";

// Gerçek WebRTC canlı yayın paneli (VITE_SIGNAL_URL ayarlıyken kullanılır).
function VideoTile({ stream, etiket, sehir, ben, transform, kameraKapali, bas }: { stream: MediaStream | null; etiket: string; sehir?: string; ben?: boolean; transform?: string; kameraKapali?: boolean; bas: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => { if (ref.current) ref.current.srcObject = stream; }, [stream]);
  return (
    <div className={`relative aspect-video overflow-hidden rounded-lg bg-gradient-to-br from-[#1E2540] to-[#0B1020] ${ben ? "ring-2 ring-neon-blue/60" : ""}`}>
      <video ref={ref} autoPlay muted={ben} playsInline className="absolute inset-0 h-full w-full object-cover" style={{ transform, display: kameraKapali ? "none" : "block" }} />
      {kameraKapali && <div className="flex h-full items-center justify-center"><span className="grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-neon-blue to-neon-violet text-lg font-bold text-white">{bas}</span></div>}
      {!kameraKapali && <span className="absolute left-1.5 top-1.5 h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />}
      <div className="absolute inset-x-1 bottom-1">
        <span className="truncate rounded bg-black/50 px-1.5 py-0.5 text-[9px] font-medium text-white">{etiket}{sehir && sehir !== "—" ? " · " + sehir : ""}</span>
      </div>
    </div>
  );
}

export default function CanliYayin({ meetingId, benAd, sehirOf, izleyici, davetLinki, linkKopya, katilimciSayi }: {
  meetingId: string; benAd: string; sehirOf: (n: string) => string; izleyici: boolean; davetLinki: () => void; linkKopya: boolean; katilimciSayi: number;
}) {
  const y = useYayin(meetingId, benAd, izleyici);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const transform = `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`;
  const canli = y.durum === "canli";

  return (
    <div className="mb-3 overflow-hidden rounded-xl border border-line bg-[#0B1020] p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-xs font-bold text-white"><Video size={14} className="text-neon-blue" /> Canlı Yayın{izleyici && <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[9px] font-bold text-amber-300">İZLEYİCİ MODU</span>}</h3>
        <div className="flex items-center gap-1.5">
          {!izleyici && <button onClick={davetLinki} title="Dışarıdan izleyici için davet linki kopyala" className="flex items-center gap-1 rounded-lg bg-white/10 px-2 py-1 text-[10px] font-medium text-white transition hover:bg-white/20">{linkKopya ? <><Check size={11} /> Kopyalandı</> : <><Link2 size={11} /> Davet Linki</>}</button>}
          <span className="flex items-center gap-1 rounded-full bg-critical/20 px-2 py-0.5 text-[10px] font-bold text-critical"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-critical" /> CANLI</span>
        </div>
      </div>

      {!canli ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white/5 p-3">
          <span className="flex items-center gap-2 text-xs text-white/60">
            {y.durum === "baglaniyor" && <Loader2 size={13} className="animate-spin" />}
            {y.durum === "hata" ? (y.hata || "Bağlantı hatası.") : y.durum === "baglaniyor" ? "Bağlanıyor…" : izleyici ? "Yayını izlemek için bağlan." : "Kameranı aç ve toplantıya katıl."}
          </span>
          <button onClick={y.katil} className="flex items-center gap-1.5 rounded-lg bg-neon-blue px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-neon-blue/90"><Video size={13} /> {izleyici ? "Yayına Bağlan" : "Yayına Katıl"}</button>
        </div>
      ) : (<>
        {y.hata && <p className="mb-2 rounded bg-amber-400/10 px-2 py-1 text-[10px] text-amber-300">{y.hata}</p>}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {!izleyici && <VideoTile stream={y.localStream} etiket="Siz" sehir={sehirOf(benAd)} ben transform={transform} kameraKapali={!y.kamera} bas={benAd.charAt(0)} />}
          {y.uzaklar.map((u) => <VideoTile key={u.id} stream={u.stream} etiket={u.ad} sehir={sehirOf(u.ad)} bas={u.ad.charAt(0)} />)}
          {y.uzaklar.length === 0 && <div className="col-span-2 flex aspect-video items-center justify-center rounded-lg bg-white/5 text-[11px] text-white/40 sm:col-span-3">Diğer katılımcılar bekleniyor…</div>}
        </div>

        {!izleyici && (<>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
            <span className="text-[10px] font-semibold text-white/50">Kamera ayarı</span>
            <button onClick={() => setPan((p) => ({ ...p, x: p.x + 20 }))} title="Sola" className="grid h-7 w-7 place-items-center rounded-lg bg-white/10 text-white transition hover:bg-white/20"><ArrowLeft size={13} /></button>
            <button onClick={() => setPan((p) => ({ ...p, x: p.x - 20 }))} title="Sağa" className="grid h-7 w-7 place-items-center rounded-lg bg-white/10 text-white transition hover:bg-white/20"><ArrowRight size={13} /></button>
            <button onClick={() => setPan((p) => ({ ...p, y: p.y + 20 }))} title="Yukarı" className="grid h-7 w-7 place-items-center rounded-lg bg-white/10 text-white transition hover:bg-white/20"><ArrowUp size={13} /></button>
            <button onClick={() => setPan((p) => ({ ...p, y: p.y - 20 }))} title="Aşağı" className="grid h-7 w-7 place-items-center rounded-lg bg-white/10 text-white transition hover:bg-white/20"><ArrowDown size={13} /></button>
            <span className="mx-0.5 h-4 w-px bg-white/15" />
            <button onClick={() => setZoom((z) => Math.min(3, +(z + 0.2).toFixed(1)))} title="Yakınlaş" className="grid h-7 w-7 place-items-center rounded-lg bg-white/10 text-white transition hover:bg-white/20"><ZoomIn size={13} /></button>
            <button onClick={() => setZoom((z) => Math.max(1, +(z - 0.2).toFixed(1)))} title="Uzaklaş" className="grid h-7 w-7 place-items-center rounded-lg bg-white/10 text-white transition hover:bg-white/20"><ZoomOut size={13} /></button>
            <span className="w-9 text-center text-[10px] text-white/50 nums">{Math.round(zoom * 100)}%</span>
            <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} title="Sıfırla" className="grid h-7 w-7 place-items-center rounded-lg bg-white/10 text-white transition hover:bg-white/20"><RotateCcw size={13} /></button>
          </div>
          <div className="mt-2 flex items-center justify-center gap-2">
            <button onClick={() => y.setMic(!y.mic)} title="Mikrofon" className={`grid h-9 w-9 place-items-center rounded-full transition ${y.mic ? "bg-white/10 text-white hover:bg-white/20" : "bg-critical/20 text-critical"}`}>{y.mic ? <Mic size={16} /> : <MicOff size={16} />}</button>
            <button onClick={() => y.setKamera(!y.kamera)} title="Kamera" className={`grid h-9 w-9 place-items-center rounded-full transition ${y.kamera ? "bg-white/10 text-white hover:bg-white/20" : "bg-critical/20 text-critical"}`}>{y.kamera ? <Video size={16} /> : <VideoOff size={16} />}</button>
            <button onClick={y.ekranPaylas} title="Ekran paylaş" className={`grid h-9 w-9 place-items-center rounded-full transition ${y.ekranPaylasim ? "bg-neon-blue text-white" : "bg-white/10 text-white hover:bg-white/20"}`}><MonitorUp size={16} /></button>
            <button onClick={y.ayril} title="Yayından ayrıl" className="grid h-9 w-9 place-items-center rounded-full bg-critical text-white transition hover:opacity-90"><PhoneOff size={16} /></button>
            <button title="Tam ekran" className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20"><Maximize2 size={16} /></button>
          </div>
        </>)}
        {izleyici && <div className="mt-2 flex justify-center"><button onClick={y.ayril} className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/20"><PhoneOff size={13} /> Yayından Ayrıl</button></div>}
        <p className="mt-1.5 flex items-center justify-center gap-1 text-center text-[10px] text-white/40"><Radio size={10} className="animate-pulse text-good" /> Gerçek P2P canlı yayın · <Eye size={10} /> {y.uzaklar.length + (izleyici ? 0 : 1)}/{katilimciSayi} bağlı</p>
      </>)}
    </div>
  );
}
