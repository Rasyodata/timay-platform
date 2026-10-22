import { useState } from "react";
import {
  Wallet, CalendarDays, Activity, UserPlus, ListChecks, Clock, Users, Gauge, LogOut,
  Monitor, Package, ShoppingCart, GraduationCap, Wrench, FileText, ChevronLeft, ChevronRight, Check,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useModules } from "@/context/ModulesContext";
import { useUsers } from "@/context/UsersContext";
import type { DynamicRecord } from "@/types/modules";

const MOD = "mod-T-0076";
type Cfg = { icon: LucideIcon; renk: string; tutar?: boolean; tarihAralik?: boolean; ilgili?: "cari" | "user" | "text"; ilgiliLabel?: string; termin?: boolean; donem?: boolean; hedefDept?: boolean; onay: string[] };

const SIRA = [
  "Personel Avans", "Yıllık İzin", "Hastalık / Mazeret İzni", "Masraf / Harcama", "İşe Giriş", "İş Başvurusu",
  "Tedarikçi Ödeme", "Görev Oluşturma", "Mesai / Vardiya", "Personel Transfer", "Performans Değerlendirme",
  "İşten Ayrılış", "IT / Destek", "Malzeme / Kırtasiye", "Satın Alma", "Eğitim", "Bakım / Arıza", "Müşteri / Kiracı", "Diğer",
];
const CFG: Record<string, Cfg> = {
  "Personel Avans": { icon: Wallet, renk: "#1E7A46", tutar: true, onay: ["Departman Müdürü", "Finans"] },
  "Yıllık İzin": { icon: CalendarDays, renk: "#B5731A", tarihAralik: true, onay: ["Departman Müdürü", "İK"] },
  "Hastalık / Mazeret İzni": { icon: Activity, renk: "#C1292E", tarihAralik: true, onay: ["Departman Müdürü", "İK"] },
  "Masraf / Harcama": { icon: Wallet, renk: "#0891B2", tutar: true, onay: ["Departman Müdürü", "Finans"] },
  "İşe Giriş": { icon: UserPlus, renk: "#4B3FB0", ilgili: "text", ilgiliLabel: "Aday / Personel", onay: ["İK", "Genel Müdür"] },
  "İş Başvurusu": { icon: UserPlus, renk: "#4B3FB0", ilgili: "text", ilgiliLabel: "Aday", onay: ["İK"] },
  "Tedarikçi Ödeme": { icon: Wallet, renk: "#0A4EA2", ilgili: "cari", ilgiliLabel: "Tedarikçi (Cari)", tutar: true, onay: ["Finans", "Genel Müdür"] },
  "Görev Oluşturma": { icon: ListChecks, renk: "#1E7A46", termin: true, onay: ["Yönetici"] },
  "Mesai / Vardiya": { icon: Clock, renk: "#0891B2", tarihAralik: true, onay: ["Departman Müdürü"] },
  "Personel Transfer": { icon: Users, renk: "#9C2A6B", ilgili: "user", ilgiliLabel: "Personel", hedefDept: true, onay: ["Departman Müdürü", "İK"] },
  "Performans Değerlendirme": { icon: Gauge, renk: "#9C2A6B", ilgili: "user", ilgiliLabel: "Personel", donem: true, onay: ["İK"] },
  "İşten Ayrılış": { icon: LogOut, renk: "#C1292E", ilgili: "user", ilgiliLabel: "Personel", onay: ["Departman Müdürü", "İK", "Genel Müdür"] },
  "IT / Destek": { icon: Monitor, renk: "#0A4EA2", onay: ["IT Yöneticisi"] },
  "Malzeme / Kırtasiye": { icon: Package, renk: "#B5731A", tutar: true, onay: ["Departman Müdürü"] },
  "Satın Alma": { icon: ShoppingCart, renk: "#4B3FB0", tutar: true, onay: ["Departman Müdürü", "Genel Müdür"] },
  "Eğitim": { icon: GraduationCap, renk: "#0d9488", onay: ["Departman Müdürü", "İK"] },
  "Bakım / Arıza": { icon: Wrench, renk: "#C1292E", onay: ["Operasyon"] },
  "Müşteri / Kiracı": { icon: Users, renk: "#B5731A", onay: ["Operasyon"] },
  "Diğer": { icon: FileText, renk: "#5A6B82", onay: ["Yönetici"] },
};
const DEPTS = ["Yazılım", "Finans", "Pazarlama", "Satış", "İK", "Operasyon", "Hukuk", "Genel"];
const ONCELIK = ["Düşük", "Normal", "Yüksek", "Acil"];
const DONEMLER = ["2026-Q1", "2026-Q2", "2026-Q3", "2026-Q4"];
const today = () => new Date().toISOString().slice(0, 10);

export default function TalepForm({ initial, onClose, initialTur }: { initial: DynamicRecord | "new"; onClose: () => void; initialTur?: string }) {
  const { getModule, addRecord, updateRecord } = useModules();
  const { users } = useUsers();
  const rec = initial === "new" ? null : initial;
  const cariList = ((getModule("mod-T-0077")?.records ?? []) as DynamicRecord[]).map((r) => String(r.ad)).filter(Boolean);

  const [tur, setTur] = useState<string>(rec ? String(rec.talep_turu || "") : (initialTur ?? ""));
  const [konu, setKonu] = useState(String(rec?.konu ?? initialTur ?? ""));
  const [talepEden, setTalepEden] = useState(String(rec?.talep_eden ?? ""));
  const [departman, setDepartman] = useState(String(rec?.departman ?? ""));
  const [oncelik, setOncelik] = useState(String(rec?.oncelik ?? "Normal"));
  const [tutar, setTutar] = useState(String(rec?.tutar ?? ""));
  const [bas, setBas] = useState(String(rec?.baslangic ?? ""));
  const [bit, setBit] = useState(String(rec?.bitis ?? ""));
  const [ilgili, setIlgili] = useState(String(rec?.ilgili ?? ""));
  const [hedefDept, setHedefDept] = useState("");
  const [donem, setDonem] = useState("2026-Q4");
  const [termin, setTermin] = useState("");
  const [aciklama, setAciklama] = useState(String(rec?.aciklama ?? ""));

  const cfg = tur ? CFG[tur] : null;
  const gun = cfg?.tarihAralik && bas && bit ? Math.max(0, Math.round((+new Date(bit) - +new Date(bas)) / 86400000) + 1) : 0;

  const kaydet = () => {
    if (!tur || !konu.trim()) return;
    const data: Record<string, unknown> = {
      konu: konu.trim(), talep_turu: tur, talep_eden: talepEden, departman, oncelik,
      durum: rec ? String(rec.durum) : "Yeni", tarih: rec?.tarih ?? today(),
      onay_zinciri: (cfg?.onay ?? []).join(" → "), aciklama,
    };
    if (cfg?.tutar) data.tutar = Number(tutar) || 0;
    if (cfg?.tarihAralik) { data.baslangic = bas; data.bitis = bit; data.gun = gun; }
    if (cfg?.ilgili) data.ilgili = ilgili;
    if (cfg?.donem) data.aciklama = `Dönem: ${donem}${aciklama ? " · " + aciklama : ""}`;
    if (cfg?.hedefDept && hedefDept) data.aciklama = `Hedef departman: ${hedefDept}${aciklama ? " · " + aciklama : ""}`;
    if (cfg?.termin && termin) data.baslangic = termin;
    if (rec) updateRecord(MOD, String(rec.id), data);
    else {
      const nums = ((getModule(MOD)?.records ?? []) as DynamicRecord[]).map((r) => { const m = String(r.talep_no ?? "").match(/(\d+)\s*$/); return m ? parseInt(m[1]) : 0; });
      data.talep_no = `TLP-${new Date().getFullYear()}-${String(Math.max(0, ...nums) + 1).padStart(3, "0")}`;
      addRecord(MOD, data);
    }
    onClose();
  };

  const inp = "w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm text-ink outline-none focus:border-neon-blue";
  const Lbl = ({ children }: { children: React.ReactNode }) => <span className="mb-1 block text-[11px] font-medium text-muted">{children}</span>;

  // Form türü seçimi
  if (!tur) {
    return (
      <div>
        <p className="mb-3 text-sm text-muted">Hangi talebi/formu oluşturmak istiyorsun?</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {SIRA.map((t) => {
            const c = CFG[t]; const Icon = c.icon;
            return (
              <button key={t} onClick={() => { setTur(t); if (!konu) setKonu(t); }} className="flex items-center gap-2 rounded-xl border border-line bg-base/40 p-3 text-left transition hover:-translate-y-0.5 hover:border-neon-blue/40">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg" style={{ background: `${c.renk}18`, color: c.renk }}><Icon size={16} /></span>
                <span className="text-xs font-medium text-ink">{t}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const Icon = cfg!.icon;
  return (
    <div className="space-y-3">
      {/* Başlık + form değiştir */}
      <div className="flex items-center gap-2">
        {!rec && <button onClick={() => setTur("")} className="grid h-8 w-8 place-items-center rounded-lg border border-line text-muted hover:bg-elevated"><ChevronLeft size={16} /></button>}
        <span className="grid h-9 w-9 place-items-center rounded-xl" style={{ background: `${cfg!.renk}18`, color: cfg!.renk }}><Icon size={18} /></span>
        <div><p className="text-sm font-bold text-ink">{tur}</p><p className="text-[11px] text-muted">Talep formu</p></div>
      </div>

      {/* Onay zinciri */}
      <div className="rounded-xl border border-line bg-base/40 p-3">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">Onay Zinciri</p>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-full bg-neon-blue/10 px-2.5 py-1 text-[11px] font-medium text-neon-blue">Talep</span>
          {cfg!.onay.map((o, i) => (
            <span key={i} className="flex items-center gap-1.5">
              <ChevronRight size={13} className="text-faint" />
              <span className="rounded-full border border-line bg-panel px-2.5 py-1 text-[11px] text-ink">{o}</span>
            </span>
          ))}
          <ChevronRight size={13} className="text-faint" />
          <span className="flex items-center gap-1 rounded-full bg-good/10 px-2.5 py-1 text-[11px] font-medium text-good"><Check size={11} /> Tamamlandı</span>
        </div>
      </div>

      {/* Alanlar */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block sm:col-span-2"><Lbl>Konu *</Lbl><input className={inp} value={konu} onChange={(e) => setKonu(e.target.value)} placeholder="Talep konusu" /></label>
        <label className="block"><Lbl>Talep Eden</Lbl>
          <select className={inp} value={talepEden} onChange={(e) => setTalepEden(e.target.value)}><option value="">Seçin…</option>{users.map((u) => <option key={u.id}>{u.name}</option>)}</select></label>
        <label className="block"><Lbl>Departman</Lbl>
          <select className={inp} value={departman} onChange={(e) => setDepartman(e.target.value)}><option value="">Seçin…</option>{DEPTS.map((d) => <option key={d}>{d}</option>)}</select></label>

        {cfg!.tutar && <label className="block"><Lbl>Tutar (₺)</Lbl><input type="number" className={inp} value={tutar} onChange={(e) => setTutar(e.target.value)} /></label>}
        <label className="block"><Lbl>Öncelik</Lbl><select className={inp} value={oncelik} onChange={(e) => setOncelik(e.target.value)}>{ONCELIK.map((o) => <option key={o}>{o}</option>)}</select></label>

        {cfg!.tarihAralik && (
          <>
            <label className="block"><Lbl>Başlangıç</Lbl><input type="date" className={inp} value={bas} onChange={(e) => setBas(e.target.value)} /></label>
            <label className="block"><Lbl>Bitiş</Lbl><input type="date" className={inp} value={bit} onChange={(e) => setBit(e.target.value)} /></label>
            {gun > 0 && <div className="sm:col-span-2 rounded-lg bg-neon-blue/10 px-3 py-2 text-sm font-medium text-neon-blue">Toplam: {gun} gün</div>}
          </>
        )}
        {cfg!.termin && <label className="block"><Lbl>Termin</Lbl><input type="date" className={inp} value={termin} onChange={(e) => setTermin(e.target.value)} /></label>}
        {cfg!.donem && <label className="block"><Lbl>Dönem</Lbl><select className={inp} value={donem} onChange={(e) => setDonem(e.target.value)}>{DONEMLER.map((d) => <option key={d}>{d}</option>)}</select></label>}

        {cfg!.ilgili === "cari" && <label className="block sm:col-span-2"><Lbl>{cfg!.ilgiliLabel}</Lbl>
          <input className={inp} list="cariList" value={ilgili} onChange={(e) => setIlgili(e.target.value)} placeholder="Cari seçin / yazın" />
          <datalist id="cariList">{cariList.map((c) => <option key={c} value={c} />)}</datalist></label>}
        {cfg!.ilgili === "user" && <label className="block sm:col-span-2"><Lbl>{cfg!.ilgiliLabel}</Lbl>
          <select className={inp} value={ilgili} onChange={(e) => setIlgili(e.target.value)}><option value="">Seçin…</option>{users.map((u) => <option key={u.id}>{u.name}</option>)}</select></label>}
        {cfg!.ilgili === "text" && <label className="block sm:col-span-2"><Lbl>{cfg!.ilgiliLabel}</Lbl><input className={inp} value={ilgili} onChange={(e) => setIlgili(e.target.value)} placeholder="Ad Soyad" /></label>}

        {cfg!.hedefDept && <label className="block sm:col-span-2"><Lbl>Hedef Departman</Lbl><select className={inp} value={hedefDept} onChange={(e) => setHedefDept(e.target.value)}><option value="">Seçin…</option>{DEPTS.map((d) => <option key={d}>{d}</option>)}</select></label>}

        <label className="block sm:col-span-2"><Lbl>Açıklama / Gerekçe</Lbl><textarea className={inp} rows={2} value={aciklama} onChange={(e) => setAciklama(e.target.value)} /></label>
      </div>

      <div className="flex justify-end gap-2 border-t border-line pt-3">
        <button onClick={onClose} className="rounded-lg border border-line px-4 py-2 text-sm text-muted hover:text-ink">Vazgeç</button>
        <button onClick={kaydet} disabled={!konu.trim()} className="rounded-lg bg-neon-blue px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 disabled:opacity-50">{rec ? "Güncelle" : "Talep Oluştur"}</button>
      </div>
    </div>
  );
}
