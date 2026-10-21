import { useMemo, useState } from "react";
import { Gavel, Sparkles, Copy, Printer, Check, FileText, Scale } from "lucide-react";
import { useModules } from "@/context/ModulesContext";
import type { DynamicRecord } from "@/types/modules";
import type { View } from "@/App";

const DILEKCE_TURU = [
  "Dava Dilekçesi",
  "Cevap Dilekçesi",
  "İcra Takip Talebi",
  "İstinaf / Temyiz Dilekçesi",
  "İhtarname",
  "Bilirkişi İtiraz Dilekçesi",
];

// Dilekçe türüne göre tipik hukuki sebep ve deliller (Türk hukuku)
const SEBEPLER: Record<string, string> = {
  "Dava Dilekçesi": "HMK, TBK, TTK ve ilgili sair mevzuat.",
  "Cevap Dilekçesi": "HMK m.126 vd., TBK ve ilgili sair mevzuat.",
  "İcra Takip Talebi": "İİK m.58 vd., TBK ve ilgili sair mevzuat.",
  "İstinaf / Temyiz Dilekçesi": "HMK m.341 vd. / m.361 vd. ve ilgili sair mevzuat.",
  "İhtarname": "TBK m.117 vd., TNK ve ilgili sair mevzuat.",
  "Bilirkişi İtiraz Dilekçesi": "HMK m.281 ve ilgili sair mevzuat.",
};
const DELILLER = "Taraflar arasındaki sözleşme, ticari defter ve kayıtlar, yazışmalar, tanık beyanları, bilirkişi incelemesi, yemin ve her türlü yasal delil.";

const nl2 = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);

export default function HukukDilekce({ onNavigate }: { onNavigate?: (v: View) => void }) {
  const { getModule } = useModules();
  const davalar = (getModule("mod-T-0016")?.records ?? []) as DynamicRecord[];
  const avukatlar = (getModule("mod-T-0017")?.records ?? []) as DynamicRecord[];

  const [davaId, setDavaId] = useState<string>("");
  const [avukatId, setAvukatId] = useState<string>("");
  const [tur, setTur] = useState<string>(DILEKCE_TURU[0]);
  const [mahkeme, setMahkeme] = useState<string>("");
  const [davaci, setDavaci] = useState<string>("");
  const [davali, setDavali] = useState<string>("");
  const [talep, setTalep] = useState<string>("");
  const [olaylar, setOlaylar] = useState<string>("");
  const [ciktiText, setCiktiText] = useState<string>("");
  const [kopyalandi, setKopyalandi] = useState(false);

  const dava = useMemo(() => davalar.find((d) => String(d.id) === davaId), [davalar, davaId]);
  const avukat = useMemo(() => avukatlar.find((a) => String(a.id) === avukatId), [avukatlar, avukatId]);

  // Dava seçilince ilgili alanları doldur
  const seçDava = (id: string) => {
    setDavaId(id);
    const d = davalar.find((x) => String(x.id) === id);
    if (d) {
      setDavali(String(d.karsi_taraf || ""));
      setTalep(String(d.dosya_konusu || ""));
      setOlaylar(String(d.aciklama || ""));
      if (String(d.islem_tipi) === "İcra") setTur("İcra Takip Talebi");
    }
  };

  const bugun = new Date();
  const tarihStr = `${String(bugun.getDate()).padStart(2, "0")}.${String(bugun.getMonth() + 1).padStart(2, "0")}.${bugun.getFullYear()}`;

  const olustur = () => {
    const icra = tur === "İcra Takip Talebi";
    const makam = mahkeme.trim() || (icra ? "… İCRA MÜDÜRLÜĞÜ'NE" : "… MAHKEMESİ SAYIN HÂKİMLİĞİ'NE");
    const davaciAd = davaci.trim() || "[Davacı / Alacaklı]";
    const davaliAd = davali.trim() || "[Davalı / Borçlu]";
    const konu = talep.trim() || String(dava?.dosya_konusu || "[Talep konusu]");
    const vekilSatiri = avukat
      ? `${String(avukat.avukat || "")}${avukat.baro ? ` (${avukat.baro}` : ""}${avukat.sicil_no ? ` · Sicil: ${avukat.sicil_no})` : avukat.baro ? ")" : ""}`
      : "[Vekil / Avukat]";
    const olayList = nl2(olaylar);
    const aciklamalar = olayList.length
      ? olayList.map((o, i) => `${i + 1}. ${o}`).join("\n")
      : `1. Müvekkil ile ${davaliAd} arasında "${konu}" konulu uyuşmazlık doğmuştur.\n2. Karşı tarafın yükümlülüklerini yerine getirmemesi nedeniyle işbu ${tur.toLowerCase()} sunulması zorunluluğu hasıl olmuştur.`;
    const sonuc = icra
      ? `Yukarıda açıklanan nedenlerle; borçlu ${davaliAd} aleyhine ${konu} alacağının ferileriyle birlikte tahsili amacıyla icra takibi başlatılmasını, ödeme emri tebliğini ve takibin kesinleşmesini saygıyla talep ederiz.`
      : `Yukarıda arz ve izah edilen nedenlerle; ${konu} talebimizin KABULÜNE, yargılama giderleri ile vekâlet ücretinin karşı tarafa YÜKLETİLMESİNE karar verilmesini saygılarımızla vekâleten arz ve talep ederiz. ${tarihStr}`;

    const baslikTaraf = icra ? "ALACAKLI" : "DAVACI";
    const karsiBaslik = icra ? "BORÇLU" : "DAVALI";

    const metin = [
      makam.toLocaleUpperCase("tr"),
      "",
      `${baslikTaraf}\t\t: ${davaciAd}`,
      `VEKİLİ\t\t: ${vekilSatiri}`,
      `${karsiBaslik}\t\t: ${davaliAd}`,
      `KONU\t\t: ${konu} talebimizden ibarettir.`,
      dava?.anlasma_butce ? `DEĞER\t\t: ${Number(dava.anlasma_butce).toLocaleString("tr-TR")} ₺` : "",
      "",
      "AÇIKLAMALAR",
      aciklamalar,
      "",
      `HUKUKİ SEBEPLER\t: ${SEBEPLER[tur] || "İlgili mevzuat."}`,
      `HUKUKİ DELİLLER\t: ${DELILLER}`,
      "",
      "SONUÇ VE İSTEM",
      sonuc,
      "",
      "Saygılarımla,",
      avukat ? `${baslikTaraf === "ALACAKLI" ? "Alacaklı" : "Davacı"} Vekili` : "",
      avukat ? String(avukat.avukat || "") : "",
    ].filter((l) => l !== "").join("\n");

    setCiktiText(metin);
    setKopyalandi(false);
  };

  const kopyala = async () => {
    try { await navigator.clipboard.writeText(ciktiText); setKopyalandi(true); setTimeout(() => setKopyalandi(false), 1800); } catch { /* ignore */ }
  };
  const yazdir = () => {
    const w = window.open("", "_blank", "width=800,height=1000");
    if (!w) return;
    w.document.write(`<pre style="font-family:'Times New Roman',serif;font-size:13pt;white-space:pre-wrap;line-height:1.6;padding:40px 50px">${ciktiText.replace(/</g, "&lt;")}</pre>`);
    w.document.close(); w.focus(); w.print();
  };

  const inp = "w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm text-ink outline-none transition focus:border-neon-blue focus:ring-2 focus:ring-neon-blue/20";
  const lbl = "mb-1 block text-xs font-semibold text-muted";

  return (
    <div className="mx-auto max-w-[1400px] space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-neon-blue/10 text-neon-blue"><Gavel size={20} /></span>
        <div>
          <h1 className="text-xl font-bold text-ink">Yapay Zeka Dilekçe Oluşturucu</h1>
          <p className="text-xs text-muted">Dava/icra dosyası ve avukat bilgilerinden Türk hukuk sistemine uygun dilekçe taslağı üretir.</p>
        </div>
        {onNavigate && (
          <button onClick={() => onNavigate("mod:mod-T-0016")} className="ml-auto flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm text-muted transition hover:bg-elevated hover:text-ink"><FileText size={15} /> Davalar</button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[380px_minmax(0,1fr)]">
        {/* Form */}
        <div className="card space-y-3 p-4">
          <div>
            <label className={lbl}>Dava / İcra Dosyası</label>
            <select value={davaId} onChange={(e) => seçDava(e.target.value)} className={inp}>
              <option value="">— Dosya seçin (opsiyonel) —</option>
              {davalar.map((d) => <option key={String(d.id)} value={String(d.id)}>{String(d.dosya_no)} · {String(d.dosya_konusu)}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>Vekil / Avukat</label>
            <select value={avukatId} onChange={(e) => setAvukatId(e.target.value)} className={inp}>
              <option value="">— Avukat seçin —</option>
              {avukatlar.map((a) => <option key={String(a.id)} value={String(a.id)}>{String(a.avukat)}{a.baro ? ` · ${a.baro}` : ""}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>Dilekçe Türü</label>
            <select value={tur} onChange={(e) => setTur(e.target.value)} className={inp}>
              {DILEKCE_TURU.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>Mahkeme / İcra Dairesi</label>
            <input value={mahkeme} onChange={(e) => setMahkeme(e.target.value)} placeholder="Örn: İstanbul 3. Asliye Ticaret Mahkemesi" className={inp} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={lbl}>Davacı / Alacaklı</label>
              <input value={davaci} onChange={(e) => setDavaci(e.target.value)} placeholder="Müvekkil" className={inp} />
            </div>
            <div>
              <label className={lbl}>Davalı / Borçlu</label>
              <input value={davali} onChange={(e) => setDavali(e.target.value)} placeholder="Karşı taraf" className={inp} />
            </div>
          </div>
          <div>
            <label className={lbl}>Talep Konusu</label>
            <input value={talep} onChange={(e) => setTalep(e.target.value)} placeholder="Örn: alacağın tahsili" className={inp} />
          </div>
          <div>
            <label className={lbl}>Olaylar / Açıklama <span className="font-normal text-faint">(her satır bir madde)</span></label>
            <textarea value={olaylar} onChange={(e) => setOlaylar(e.target.value)} rows={5} placeholder={"Taraflar arasında ... sözleşmesi imzalanmıştır.\nKarşı taraf ödeme yükümlülüğünü yerine getirmemiştir."} className={`${inp} resize-y`} />
          </div>
          <button onClick={olustur} className="flex w-full items-center justify-center gap-2 rounded-lg bg-neon-blue px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-110">
            <Sparkles size={16} /> Yapay Zeka ile Dilekçe Oluştur
          </button>
        </div>

        {/* Önizleme */}
        <div className="card flex min-h-[520px] flex-col p-4">
          <div className="mb-2 flex items-center justify-between gap-2 border-b border-line pb-2">
            <h2 className="flex items-center gap-1.5 text-sm font-bold text-ink"><Scale size={15} className="text-neon-blue" /> Dilekçe Önizleme</h2>
            {ciktiText && (
              <div className="flex items-center gap-1.5">
                <button onClick={kopyala} className="flex items-center gap-1 rounded-lg border border-line px-2.5 py-1 text-xs text-muted transition hover:bg-elevated hover:text-ink">{kopyalandi ? <><Check size={13} className="text-good" /> Kopyalandı</> : <><Copy size={13} /> Kopyala</>}</button>
                <button onClick={yazdir} className="flex items-center gap-1 rounded-lg border border-line px-2.5 py-1 text-xs text-muted transition hover:bg-elevated hover:text-ink"><Printer size={13} /> Yazdır / PDF</button>
              </div>
            )}
          </div>
          {ciktiText ? (
            <pre className="flex-1 overflow-auto whitespace-pre-wrap rounded-lg bg-base/40 p-4 text-[13px] leading-relaxed text-ink" style={{ fontFamily: "'Times New Roman', Georgia, serif" }}>{ciktiText}</pre>
          ) : (
            <div className="grid flex-1 place-items-center text-center">
              <div>
                <Gavel size={34} className="mx-auto mb-2 text-faint" />
                <p className="text-sm text-muted">Soldaki bilgileri doldurup <b className="text-ink">"Yapay Zeka ile Dilekçe Oluştur"</b>a tıklayın.</p>
                <p className="mt-1 text-[11px] text-faint">Taslak; HMK/İİK/TBK yapısına uygun üretilir. Göndermeden önce avukat kontrolü önerilir.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
