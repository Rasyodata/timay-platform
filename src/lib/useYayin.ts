import { useCallback, useEffect, useRef, useState } from "react";

// Toplantı Odası canlı yayın — gerçek WebRTC mesh (sinyal: native WebSocket).
// VITE_SIGNAL_URL ayarlı değilse hook devre dışı kalır (aktif=false) ve arayüz
// simülasyona döner.

export const SIGNAL_URL = (import.meta.env.VITE_SIGNAL_URL as string | undefined) || "";
export const yayinAktif = () => !!SIGNAL_URL;

const ICE: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export type Uzak = { id: string; ad: string; stream: MediaStream };
export type YayinDurum = "kapali" | "baglaniyor" | "canli" | "hata";

export function useYayin(roomId: string | null, ad: string, izleyici: boolean) {
  const [durum, setDurum] = useState<YayinDurum>("kapali");
  const [hata, setHata] = useState<string | null>(null);
  const [uzaklar, setUzaklar] = useState<Uzak[]>([]);
  const [mic, setMicState] = useState(true);
  const [kamera, setKameraState] = useState(true);
  const [ekranPaylasim, setEkranPaylasim] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const pcs = useRef<Map<string, RTCPeerConnection>>(new Map());
  const adlar = useRef<Map<string, string>>(new Map());
  const localRef = useRef<MediaStream | null>(null);
  const kameraTrackRef = useRef<MediaStreamTrack | null>(null);
  const screenRef = useRef<MediaStream | null>(null);
  const myId = useRef<string>("");

  const sinyalGonder = (obj: Record<string, unknown>) => { const ws = wsRef.current; if (ws && ws.readyState === 1) ws.send(JSON.stringify(obj)); };

  const uzakGuncelle = useCallback((id: string, stream: MediaStream, peerAd: string) => {
    setUzaklar((prev) => { const yok = !prev.find((u) => u.id === id); const ekli = yok ? [...prev, { id, ad: peerAd, stream }] : prev.map((u) => (u.id === id ? { ...u, stream, ad: peerAd } : u)); return ekli; });
  }, []);

  const pcKur = useCallback((peerId: string, peerAd: string, baslatan: boolean) => {
    if (pcs.current.has(peerId)) return pcs.current.get(peerId)!;
    const pc = new RTCPeerConnection(ICE);
    pcs.current.set(peerId, pc);
    adlar.current.set(peerId, peerAd);
    const ls = localRef.current;
    if (ls && !izleyici) ls.getTracks().forEach((t) => pc.addTrack(t, ls));
    else { try { pc.addTransceiver("video", { direction: "recvonly" }); pc.addTransceiver("audio", { direction: "recvonly" }); } catch { /* yoksay */ } }
    pc.onicecandidate = (e) => { if (e.candidate) sinyalGonder({ type: "signal", to: peerId, data: { ice: e.candidate } }); };
    pc.ontrack = (e) => { uzakGuncelle(peerId, e.streams[0], adlar.current.get(peerId) || peerAd); };
    pc.onconnectionstatechange = () => { if (["failed", "closed", "disconnected"].includes(pc.connectionState)) { /* bağlantı koptu */ } };
    if (baslatan) {
      pc.createOffer().then((o) => pc.setLocalDescription(o)).then(() => sinyalGonder({ type: "signal", to: peerId, data: { sdp: pc.localDescription } })).catch(() => {});
    }
    return pc;
  }, [izleyici, uzakGuncelle]);

  const temizle = useCallback(() => {
    pcs.current.forEach((pc) => pc.close()); pcs.current.clear(); adlar.current.clear();
    localRef.current?.getTracks().forEach((t) => t.stop()); localRef.current = null; kameraTrackRef.current = null;
    screenRef.current?.getTracks().forEach((t) => t.stop()); screenRef.current = null;
    wsRef.current?.close(); wsRef.current = null;
    setUzaklar([]); setEkranPaylasim(false); setLocalStream(null);
  }, []);

  const katil = useCallback(async () => {
    if (!SIGNAL_URL || !roomId) return;
    setDurum("baglaniyor"); setHata(null);
    // İzleyici medya almaz; yayıncı kamera+mikrofon açar
    if (!izleyici) {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localRef.current = s; kameraTrackRef.current = s.getVideoTracks()[0] || null; setLocalStream(s);
        s.getVideoTracks().forEach((t) => (t.enabled = kamera)); s.getAudioTracks().forEach((t) => (t.enabled = mic));
      } catch { setHata("Kamera/mikrofon izni verilmedi — yine de izleyici olarak bağlanabilirsiniz."); }
    }
    const ws = new WebSocket(SIGNAL_URL);
    wsRef.current = ws;
    ws.onopen = () => { ws.send(JSON.stringify({ type: "join", room: roomId, name: ad })); setDurum("canli"); };
    ws.onerror = () => { setDurum("hata"); setHata("Sinyal sunucusuna bağlanılamadı."); };
    ws.onclose = () => { if (durum !== "kapali") setDurum("kapali"); };
    ws.onmessage = async (ev) => {
      let msg: { type: string; id?: string; peers?: { id: string; name: string }[]; from?: string; name?: string; data?: { sdp?: RTCSessionDescriptionInit; ice?: RTCIceCandidateInit } };
      try { msg = JSON.parse(ev.data); } catch { return; }
      if (msg.type === "peers") {
        myId.current = msg.id || "";
        (msg.peers || []).forEach((p) => pcKur(p.id, p.name, true)); // yeni katılan mevcutlara teklif gönderir
      } else if (msg.type === "peer-joined") {
        if (msg.id && msg.name) adlar.current.set(msg.id, msg.name); // teklifini bekleriz
      } else if (msg.type === "peer-left") {
        if (msg.id) { pcs.current.get(msg.id)?.close(); pcs.current.delete(msg.id); setUzaklar((prev) => prev.filter((u) => u.id !== msg.id)); }
      } else if (msg.type === "signal" && msg.from && msg.data) {
        const from = msg.from; const d = msg.data;
        const pc = pcs.current.get(from) || pcKur(from, msg.name || adlar.current.get(from) || "Katılımcı", false);
        try {
          if (d.sdp) {
            await pc.setRemoteDescription(d.sdp);
            if (d.sdp.type === "offer") { const ans = await pc.createAnswer(); await pc.setLocalDescription(ans); sinyalGonder({ type: "signal", to: from, data: { sdp: pc.localDescription } }); }
          } else if (d.ice) { await pc.addIceCandidate(d.ice); }
        } catch { /* yoksay */ }
      }
    };
  }, [roomId, ad, izleyici, pcKur, kamera, mic, durum]);

  const ayril = useCallback(() => { temizle(); setDurum("kapali"); }, [temizle]);

  const setMic = useCallback((v: boolean) => { setMicState(v); localRef.current?.getAudioTracks().forEach((t) => (t.enabled = v)); }, []);
  const setKamera = useCallback((v: boolean) => { setKameraState(v); localRef.current?.getVideoTracks().forEach((t) => (t.enabled = v)); }, []);

  const ekranPaylas = useCallback(async () => {
    if (ekranPaylasim) {
      screenRef.current?.getTracks().forEach((t) => t.stop()); screenRef.current = null; setEkranPaylasim(false);
      const cam = kameraTrackRef.current; if (cam) pcs.current.forEach((pc) => pc.getSenders().find((s) => s.track?.kind === "video")?.replaceTrack(cam));
      return;
    }
    try {
      const scr = await navigator.mediaDevices.getDisplayMedia({ video: true });
      screenRef.current = scr; const track = scr.getVideoTracks()[0];
      pcs.current.forEach((pc) => pc.getSenders().find((s) => s.track?.kind === "video")?.replaceTrack(track));
      track.onended = () => { const cam = kameraTrackRef.current; if (cam) pcs.current.forEach((pc) => pc.getSenders().find((s) => s.track?.kind === "video")?.replaceTrack(cam)); screenRef.current = null; setEkranPaylasim(false); };
      setEkranPaylasim(true);
    } catch { /* iptal */ }
  }, [ekranPaylasim]);

  useEffect(() => () => temizle(), [temizle]);

  return { aktif: yayinAktif(), durum, hata, uzaklar, localStream, mic, kamera, ekranPaylasim, katil, ayril, setMic, setKamera, ekranPaylas };
}
