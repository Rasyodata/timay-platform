import { useState } from "react";
import { Check, ClipboardCheck, FileText, Plus, Trash2, X } from "lucide-react";
import { useModules } from "@/context/ModulesContext";
import { useUsers } from "@/context/UsersContext";
import { useProjects } from "@/context/ProjectsContext";
import { useAudit } from "@/context/AuditContext";
import { AUDIT_CATEGORY_META } from "@/types/audit";
import { fmtTL } from "@/lib/format";
import { openTableReport } from "@/lib/tableReport";
import type { Project } from "@/types/projects";

const APPROVALS = "mod-T-0045";
const LEDGER = "mod-T-0046";
const HEDEF = "mod-T-0043";

const ISTEK_TIPLERI = ["Ödeme", "Tahsilat", "Gider", "Satın Alma", "Hedef Değiştirme", "Kar Değiştirme", "Görev Değiştirme", "Hak Sahibi Onayı"];
const USER_OPTS = ["Tuğba Yörük", "Halim Bey", "Kadir Fırat", "Şevket Kaan"];
const today = () => new Date().toISOString().slice(0, 10);

const input =
  "w-full rounded-lg border border-line bg-base/60 px-3 py-2 text-sm text-ink outline-none transition focus:border-neon-blue/50 focus:ring-1 focus:ring-neon-blue/40";
const money = (n: number) => fmtTL(n);

const durumChip: Record<string, string> = {
  "Onaylandı": "border-good/40 bg-good/10 text-good",
  "Reddedildi": "border-critical/40 bg-critical/10 text-critical",
  "Bekliyor": "border-warning/40 bg-warning/10 text-warning",
  "İncelemede": "border-neon-blue/40 bg-neon-blue/10 text-neon-blue",
};

export default function ProjectApprovals({ project }: { project: Project }) {
  const { getModule, addRecord, updateRecord, deleteRecord } = useModules();
  const { currentUser, canViewField, can } = useUsers();
  const { addTask } = useProjects();
  const { entries } = useAudit();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [draft, setDraft] = useState<Record<string, unknown>>({ istek_tipi: "Ödeme", durum: "Bekliyor", talep_eden: currentUser.name });

  const mod = getModule(APPROVALS);
  if (!mod) return <div className="card p-5 text-sm text-muted">İş Onay Süreçleri tablosu bulunamadı.</div>;

  const showAmounts = canViewField("ONLY_MANAGERS");
  const canApprove = can("uye_yonet"); // onay yetkisi (yönetici/sahip)

  // Onaylanınca ilgili bölümü güncelle.
  const applyEffect = (tip: string, tutar: number, konu: string) => {
    const by = currentUser.name;
    if (["Ödeme", "Tahsilat", "Gider", "Satın Alma"].includes(tip)) {
      const tipiMap: Record<string, string> = { Ödeme: "Ödeme", Tahsilat: "Tahsilat", Gider: "Ödeme", "Satın Alma": "Satın Alma" };
      const turu = tip === "Tahsilat" || tip === "Satın Alma" ? "Cari" : "Gider";
      addRecord(LEDGER, { tarih: today(), hareket_tipi: tipiMap[tip], hareket_turu: turu, cari: "", harcama_yetkisi: by, aciklama: `Onay: ${konu}`, tutar });
      return "Proje Hesabı'na işlendi";
    }
    if (tip === "Hedef Değiştirme" || tip === "Kar Değiştirme") {
      const hedef = getModule(HEDEF);
      const first = hedef?.records[0];
      if (hedef && first) {
        // Gerçekleşen artık Satış Tablosu'ndan (T-0036) otomatik gelir; onaylar hedeflenen kârı günceller.
        updateRecord(HEDEF, String(first.id), { hedef_kar: tutar });
        return "Hedef ve Kar tablosu güncellendi";
      }
      return "Hedef ve Kar tablosu boş";
    }
    if (tip === "Görev Değiştirme") {
      addTask(project.id, { name: konu, owner: by, status: "yapilacak", priority: "orta", start: today(), end: project.endDate, progress: 0 });
      return "Görev olarak eklendi";
    }
    if (tip === "Hak Sahibi Onayı") {
      return "Hak sahibi onayı kaydedildi (proje künyesi — Hak Sahibi ve Beklentisi)";
    }
    return "";
  };

  const decide = (rec: Record<string, unknown>, onay: boolean) => {
    updateRecord(APPROVALS, String(rec.id), { durum: onay ? "Onaylandı" : "Reddedildi", onaylayan: currentUser.name });
    if (onay) {
      const applied = applyEffect(String(rec.istek_tipi), Number(rec.tutar) || 0, String(rec.konu));
      setNote(`"${rec.konu}" onaylandı → ${applied}.`);
    } else {
      setNote(`"${rec.konu}" reddedildi.`);
    }
  };

  const addReq = () => {
    if (!String(draft.konu ?? "").trim()) return setNote("Konu zorunlu.");
    addRecord(APPROVALS, { ...draft, tarih: today(), durum: "Bekliyor" });
    setDraft({ istek_tipi: "Ödeme", durum: "Bekliyor", talep_eden: currentUser.name });
    setOpen(false);
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
    <section className="card p-5 lg:col-span-2">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-1.5 text-base font-semibold text-ink"><ClipboardCheck size={16} className="text-neon-violet" /> İş Onay Süreçleri</h3>
          <p className="text-[11px] text-muted"><span className="nums">{mod.code}</span> · {mod.records.length} talep · onaylanınca ilgili bölüm otomatik güncellenir</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => openTableReport(mod)} className="chip border-neon-violet/40 bg-neon-violet/10 text-neon-violet transition hover:bg-neon-violet/20">
            <FileText size={14} /> Rapor Al
          </button>
          <button onClick={() => setOpen((v) => !v)} className="chip border-neon-blue/40 bg-neon-blue/10 text-neon-blue transition hover:bg-neon-blue/20">
            <Plus size={14} /> Talep Ekle
          </button>
        </div>
      </div>

      {note && <div className="mb-4 rounded-xl border border-good/30 bg-good/10 px-3 py-2 text-xs text-good">{note}</div>}

      {open && (
        <div className="mb-4 rounded-xl border border-line bg-white/[0.02] p-4">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <label className="block"><span className="mb-1 block text-xs text-muted">Konu *</span>
              <input className={input} value={String(draft.konu ?? "")} onChange={(e) => setDraft((d) => ({ ...d, konu: e.target.value }))} /></label>
            <label className="block"><span className="mb-1 block text-xs text-muted">İstek Tipi *</span>
              <select className={input} value={String(draft.istek_tipi)} onChange={(e) => setDraft((d) => ({ ...d, istek_tipi: e.target.value }))}>
                {ISTEK_TIPLERI.map((o) => <option key={o} value={o}>{o}</option>)}
              </select></label>
            <label className="block"><span className="mb-1 block text-xs text-muted">Talep Eden</span>
              <select className={input} value={String(draft.talep_eden ?? "")} onChange={(e) => setDraft((d) => ({ ...d, talep_eden: e.target.value }))}>
                {USER_OPTS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select></label>
            <label className="block"><span className="mb-1 block text-xs text-muted">Tutar / Yeni Değer (₺)</span>
              <input type="number" className={input} value={String(draft.tutar ?? "")} onChange={(e) => setDraft((d) => ({ ...d, tutar: e.target.valueAsNumber || "" }))} /></label>
            <label className="block sm:col-span-2"><span className="mb-1 block text-xs text-muted">Açıklama</span>
              <input className={input} value={String(draft.aciklama ?? "")} onChange={(e) => setDraft((d) => ({ ...d, aciklama: e.target.value }))} /></label>
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={addReq} className="rounded-lg bg-neon-blue px-4 py-2 text-sm font-semibold text-white transition hover:bg-neon-blue/90">Talebi Gönder</button>
            <button onClick={() => setOpen(false)} className="rounded-lg border border-line px-4 py-2 text-sm text-ink transition hover:bg-elevated">Vazgeç</button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-line text-left">
              <th className="px-3 py-2 font-medium text-muted">Konu</th>
              <th className="px-3 py-2 font-medium text-muted">İstek Tipi</th>
              <th className="px-3 py-2 font-medium text-muted">Talep Eden</th>
              <th className="px-3 py-2 font-medium text-muted">Onaylayan</th>
              <th className="px-3 py-2 text-right font-medium text-muted">Tutar/Değer</th>
              <th className="px-3 py-2 font-medium text-muted">Durum</th>
              <th className="px-3 py-2 text-right font-medium text-muted">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {mod.records.map((rec) => {
              const r = rec as Record<string, unknown>;
              const durum = String(r.durum);
              const pending = durum === "Bekliyor" || durum === "İncelemede";
              return (
                <tr key={String(r.id)} className="border-b border-line/60 transition hover:bg-white/[0.02]">
                  <td className="px-3 py-2.5 font-medium text-ink">{String(r.konu ?? "—")}</td>
                  <td className="px-3 py-2.5"><span className="chip border-neon-violet/30 bg-neon-violet/10 text-neon-violet">{String(r.istek_tipi ?? "—")}</span></td>
                  <td className="px-3 py-2.5 text-muted">{String(r.talep_eden || "—")}</td>
                  <td className="px-3 py-2.5 text-muted">{String(r.onaylayan || "—")}</td>
                  <td className="px-3 py-2.5 text-right text-ink nums">{showAmounts ? money(Number(r.tutar)) : "•••••"}</td>
                  <td className="px-3 py-2.5"><span className={`chip ${durumChip[durum] ?? "border-line text-muted"}`}>{durum}</span></td>
                  <td className="px-3 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {canApprove && pending && (
                        <>
                          <button onClick={() => decide(r, true)} title="Onayla" className="rounded-md border border-good/40 bg-good/10 p-1 text-good transition hover:bg-good/20"><Check size={14} /></button>
                          <button onClick={() => decide(r, false)} title="Reddet" className="rounded-md border border-critical/40 bg-critical/10 p-1 text-critical transition hover:bg-critical/20"><X size={14} /></button>
                        </>
                      )}
                      {canApprove && (
                        <button onClick={() => deleteRecord(APPROVALS, String(r.id))} title="Sil" className="rounded-md p-1 text-muted transition hover:text-critical"><Trash2 size={14} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {mod.records.length === 0 && <tr><td colSpan={7} className="px-3 py-8 text-center text-sm text-muted">Talep yok.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[11px] text-faint">Onayla → istek tipine göre: finansal istekler Proje Hesabı'na, Hedef/Kar Değiştirme Hedef ve Kar tablosuna, Görev Değiştirme görev board'una işlenir.</p>
    </section>

    {/* İşlem Logları — sağ panel */}
    <aside className="card flex flex-col p-5">
      <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-muted">
        <ClipboardCheck size={15} /> İşlem Logları
      </h3>
      <ol className="space-y-2.5 overflow-y-auto">
        {entries.slice(0, 20).map((e) => {
          const cat = AUDIT_CATEGORY_META[e.category];
          return (
            <li key={e.id} className="flex gap-2">
              <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${cat.dot}`} />
              <div className="min-w-0">
                <p className="text-xs leading-snug text-ink">{e.action}{e.target ? <span className="text-muted"> · {e.target}</span> : null}</p>
                {e.meta && <p className="text-[10px] text-neon-amber nums">{e.meta}</p>}
                <p className="text-[10px] text-faint">{e.actor} · {new Date(e.at).toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</p>
              </div>
            </li>
          );
        })}
        {entries.length === 0 && <li className="text-xs text-muted">Henüz işlem yok.</li>}
      </ol>
    </aside>
    </div>
  );
}
