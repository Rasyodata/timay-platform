import { useRef, useEffect } from "react";
import { Bold, Italic, Underline, Heading2, Heading3, List, ListOrdered, Link2, Code, Eraser } from "lucide-react";

/**
 * Hafif, bağımlılıksız zengin-metin editörü (contentEditable + execCommand).
 * HTML string tutar. Doküman başına key verilirse içerik senkron kalır.
 */
export default function RichTextEditor({ value, onChange }: { value: string; onChange: (html: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== (value || "")) ref.current.innerHTML = value || "";
    // sadece mount'ta ilk içeriği bas (key ile remount edildiğinden güvenli)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const exec = (cmd: string, arg?: string) => {
    document.execCommand(cmd, false, arg);
    ref.current?.focus();
    onChange(ref.current?.innerHTML || "");
  };
  const link = () => { const url = window.prompt("Bağlantı (URL):", "https://"); if (url) exec("createLink", url); };

  const Tool = ({ onDo, icon: Icon, title }: { onDo: () => void; icon: typeof Bold; title: string }) => (
    <button type="button" title={title} onMouseDown={(e) => { e.preventDefault(); onDo(); }}
      className="grid h-7 w-7 place-items-center rounded text-muted transition hover:bg-elevated hover:text-ink">
      <Icon size={14} />
    </button>
  );

  return (
    <div className="rounded-lg border border-line bg-panel">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-line bg-base/40 p-1">
        <Tool onDo={() => exec("bold")} icon={Bold} title="Kalın" />
        <Tool onDo={() => exec("italic")} icon={Italic} title="İtalik" />
        <Tool onDo={() => exec("underline")} icon={Underline} title="Altı çizili" />
        <span className="mx-1 h-5 w-px bg-line" />
        <Tool onDo={() => exec("formatBlock", "<h2>")} icon={Heading2} title="Başlık 2" />
        <Tool onDo={() => exec("formatBlock", "<h3>")} icon={Heading3} title="Başlık 3" />
        <Tool onDo={() => exec("insertUnorderedList")} icon={List} title="Madde listesi" />
        <Tool onDo={() => exec("insertOrderedList")} icon={ListOrdered} title="Numaralı liste" />
        <Tool onDo={() => exec("formatBlock", "<pre>")} icon={Code} title="Kod bloğu" />
        <span className="mx-1 h-5 w-px bg-line" />
        <Tool onDo={link} icon={Link2} title="Bağlantı" />
        <Tool onDo={() => exec("removeFormat")} icon={Eraser} title="Biçimi temizle" />
      </div>
      <div
        ref={ref}
        contentEditable
        onInput={() => onChange(ref.current?.innerHTML || "")}
        className="rich-content min-h-[260px] max-w-none p-3 text-sm leading-relaxed text-ink outline-none"
        suppressContentEditableWarning
      />
    </div>
  );
}
