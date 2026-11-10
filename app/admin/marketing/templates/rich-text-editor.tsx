"use client";

import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Code,
  ImageIcon,
  Italic,
  Link,
  List,
  ListOrdered,
  RemoveFormatting,
  Strikethrough,
  Type,
  Underline,
  Unlink,
} from "lucide-react";
import { useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import { sanitizeHtml } from "@/app/_lib/email-html";
import { cn } from "@/lib/utils";

export type RichTextEditorHandle = {
  /** Insere texto na posição do cursor (ou no fim). */
  insertText: (text: string) => void;
};

type Mode = "visual" | "html";

type Props = {
  value: string;
  onChange: (html: string) => void;
  onFocus?: () => void;
  placeholder?: string;
  ref?: Ref<RichTextEditorHandle>;
};

type Tool = {
  label: string;
  icon?: React.ReactNode;
  text?: string;
  command: string;
  arg?: string;
  /** Comando com estado ligado/desligado (fica destacado). */
  stateful?: boolean;
};

const iconClass = "size-4";

const groups: Tool[][] = [
  [
    { label: "Negrito", icon: <Bold className={iconClass} />, command: "bold", stateful: true },
    { label: "Itálico", icon: <Italic className={iconClass} />, command: "italic", stateful: true },
    { label: "Sublinhado", icon: <Underline className={iconClass} />, command: "underline", stateful: true },
    { label: "Tachado", icon: <Strikethrough className={iconClass} />, command: "strikeThrough", stateful: true },
  ],
  [
    { label: "Título", text: "H2", command: "formatBlock", arg: "h2" },
    { label: "Subtítulo", text: "H3", command: "formatBlock", arg: "h3" },
    { label: "Parágrafo", text: "P", command: "formatBlock", arg: "p" },
  ],
  [
    { label: "Lista", icon: <List className={iconClass} />, command: "insertUnorderedList", stateful: true },
    { label: "Lista numerada", icon: <ListOrdered className={iconClass} />, command: "insertOrderedList", stateful: true },
  ],
  [
    { label: "Alinhar à esquerda", icon: <AlignLeft className={iconClass} />, command: "justifyLeft", stateful: true },
    { label: "Centralizar", icon: <AlignCenter className={iconClass} />, command: "justifyCenter", stateful: true },
    { label: "Alinhar à direita", icon: <AlignRight className={iconClass} />, command: "justifyRight", stateful: true },
  ],
];

const toolButton =
  "inline-flex h-8 min-w-8 items-center justify-center rounded-md px-1.5 text-xs font-bold text-black/80 transition hover:bg-black/10 hover:text-black disabled:opacity-40";

/** Editor visual de HTML para o conteúdo dos e-mails (com aba para o código). */
export function RichTextEditor({ value, onChange, onFocus, placeholder, ref }: Props) {
  const [mode, setMode] = useState<Mode>("visual");
  const [active, setActive] = useState<Record<string, boolean>>({});
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("https://");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const htmlRef = useRef<HTMLTextAreaElement>(null);
  const savedRange = useRef<Range | null>(null);

  // O conteúdo do editor é do navegador; só é reescrito ao montar e ao voltar do modo HTML.
  useEffect(() => {
    if (mode === "visual" && editorRef.current) editorRef.current.innerHTML = sanitizeHtml(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  useEffect(() => {
    document.execCommand("defaultParagraphSeparator", false, "p");
    document.execCommand("styleWithCSS", false, "false");

    function track() {
      const editor = editorRef.current;
      const selection = document.getSelection();
      if (!editor || !selection || selection.rangeCount === 0) return;
      const range = selection.getRangeAt(0);
      if (!editor.contains(range.commonAncestorContainer)) return;
      savedRange.current = range.cloneRange();
      const next: Record<string, boolean> = {};
      for (const tool of groups.flat()) {
        if (tool.stateful) next[tool.command] = document.queryCommandState(tool.command);
      }
      setActive(next);
    }
    document.addEventListener("selectionchange", track);
    return () => document.removeEventListener("selectionchange", track);
  }, []);

  function emit() {
    // Guarda já filtrado (o navegador adiciona estilos que o e-mail não usa).
    if (editorRef.current) onChange(sanitizeHtml(editorRef.current.innerHTML));
  }

  /** Devolve o foco ao editor com o cursor onde estava (ou no fim). */
  function restoreSelection() {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    const selection = document.getSelection();
    if (!selection) return;
    let range = savedRange.current;
    if (!range || !editor.contains(range.commonAncestorContainer)) {
      range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
    }
    selection.removeAllRanges();
    selection.addRange(range);
  }

  function exec(command: string, arg?: string) {
    restoreSelection();
    document.execCommand(command, false, arg);
    emit();
  }

  function insertHtml(html: string) {
    restoreSelection();
    document.execCommand("insertHTML", false, html);
    emit();
  }

  useImperativeHandle(ref, () => ({
    insertText(text: string) {
      if (mode === "html") {
        const el = htmlRef.current;
        const start = el?.selectionStart ?? value.length;
        const end = el?.selectionEnd ?? value.length;
        onChange(value.slice(0, start) + text + value.slice(end));
        requestAnimationFrame(() => {
          el?.focus();
          el?.setSelectionRange(start + text.length, start + text.length);
        });
        return;
      }
      restoreSelection();
      document.execCommand("insertText", false, text);
      emit();
    },
  }));

  async function uploadImages(files: File[]) {
    const images = files.filter((f) => f.type.startsWith("image/"));
    if (images.length === 0) return;
    setUploadError(null);
    setUploading(true);
    try {
      for (const file of images) {
        const form = new FormData();
        form.append("imagem", file);
        const response = await fetch("/api/marketing/imagens", { method: "POST", body: form });
        const data = (await response.json().catch(() => ({}))) as { url?: string; error?: string };
        if (!response.ok || !data.url) throw new Error(data.error ?? "Não foi possível enviar a imagem.");
        const alt = file.name.replace(/\.[^.]+$/, "").replace(/["<>&]/g, "");
        insertHtml(`<img src="${data.url}" alt="${alt}">`);
      }
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Não foi possível enviar a imagem.");
    } finally {
      setUploading(false);
    }
  }

  function openLink() {
    const anchor = savedRange.current?.startContainer.parentElement?.closest("a");
    setLinkUrl(anchor?.getAttribute("href") ?? "https://");
    setLinkOpen(true);
  }

  function applyLink() {
    const url = linkUrl.trim();
    setLinkOpen(false);
    if (!url || url === "https://") return;
    const range = savedRange.current;
    if (range && !range.collapsed) {
      exec("createLink", url);
    } else {
      const safe = url.replace(/"/g, "&quot;").replace(/</g, "&lt;");
      insertHtml(`<a href="${safe}">${safe}</a>`);
    }
  }

  function switchMode(next: Mode) {
    if (next === mode) return;
    if (next === "visual") onChange(sanitizeHtml(value));
    setLinkOpen(false);
    setMode(next);
  }

  const isEmpty = !/<img\b/i.test(value) && value.replace(/<[^>]*>|&nbsp;|\s/g, "") === "";

  return (
    <div className="mt-1.5">
      <div role="tablist" aria-label="Modo do editor" className="mb-2 inline-flex rounded-lg border border-black/15 bg-white p-0.5">
        {(
          [
            ["visual", "Visual", <Type key="i" className="size-3.5" />],
            ["html", "HTML", <Code key="i" className="size-3.5" />],
          ] as const
        ).map(([id, label, icon]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={mode === id}
            onClick={() => switchMode(id)}
            className={cn(
              "inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold transition",
              mode === id ? "bg-black/10 text-black" : "text-black/60 hover:text-black",
            )}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-lg border border-black/20 bg-white focus-within:border-black">
        {mode === "visual" && (
          <div
            role="toolbar"
            aria-label="Formatação"
            className="flex flex-wrap items-center gap-0.5 border-b border-black/10 bg-black/[0.03] px-2 py-1.5"
          >
            {groups.map((group, i) => (
              <div key={i} className="flex items-center gap-0.5">
                {i > 0 && <span aria-hidden className="mx-1 h-5 w-px bg-black/15" />}
                {group.map((tool) => (
                  <button
                    key={tool.label}
                    type="button"
                    title={tool.label}
                    aria-label={tool.label}
                    aria-pressed={tool.stateful ? Boolean(active[tool.command]) : undefined}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => exec(tool.command, tool.arg)}
                    className={cn(toolButton, active[tool.command] && "bg-black/10 text-black")}
                  >
                    {tool.icon ?? tool.text}
                  </button>
                ))}
              </div>
            ))}
            <span aria-hidden className="mx-1 h-5 w-px bg-black/15" />
            <button
              type="button"
              title="Inserir link"
              aria-label="Inserir link"
              onMouseDown={(e) => e.preventDefault()}
              onClick={openLink}
              className={cn(toolButton, linkOpen && "bg-black/10 text-black")}
            >
              <Link className={iconClass} />
            </button>
            <button
              type="button"
              title="Remover link"
              aria-label="Remover link"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => exec("unlink")}
              className={toolButton}
            >
              <Unlink className={iconClass} />
            </button>
            <button
              type="button"
              title="Inserir imagem"
              aria-label="Inserir imagem"
              disabled={uploading}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => fileRef.current?.click()}
              className={toolButton}
            >
              <ImageIcon className={iconClass} />
            </button>
            <span aria-hidden className="mx-1 h-5 w-px bg-black/15" />
            <button
              type="button"
              title="Limpar formatação"
              aria-label="Limpar formatação"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => exec("removeFormat")}
              className={toolButton}
            >
              <RemoveFormatting className={iconClass} />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/gif,image/webp"
              multiple
              hidden
              onChange={(e) => {
                void uploadImages([...(e.target.files ?? [])]);
                e.target.value = "";
              }}
            />
          </div>
        )}

        {mode === "visual" && linkOpen && (
          <div className="flex flex-wrap items-center gap-2 border-b border-black/10 px-3 py-2">
            <input
              autoFocus
              type="text"
              aria-label="Endereço do link"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  applyLink();
                }
                if (e.key === "Escape") setLinkOpen(false);
              }}
              placeholder="https://... ou {{link_agendamento}}"
              className="h-8 min-w-0 flex-1 rounded-md border border-black/20 px-2 text-sm focus:border-black focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setLinkUrl("{{link_agendamento}}")}
              className="h-8 rounded-md px-2 font-mono text-xs text-black/70 hover:bg-black/5 hover:text-black"
            >
              {"{{link_agendamento}}"}
            </button>
            <button type="button" onClick={applyLink} className="h-8 rounded-md bg-[#121212] px-3 text-xs font-semibold text-white">
              Aplicar
            </button>
            <button type="button" onClick={() => setLinkOpen(false)} className="h-8 rounded-md px-2 text-xs font-semibold text-black/60">
              Cancelar
            </button>
          </div>
        )}

        {mode === "visual" ? (
          <div className="relative">
            {isEmpty && placeholder && (
              <p aria-hidden className="pointer-events-none absolute inset-x-4 top-3 text-sm text-black/40">
                {placeholder}
              </p>
            )}
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              role="textbox"
              aria-multiline
              aria-label="Conteúdo"
              onInput={emit}
              onBlur={emit}
              onFocus={onFocus}
              onPaste={(e) => {
                const files = [...e.clipboardData.files];
                e.preventDefault();
                if (files.length > 0) {
                  void uploadImages(files);
                  return;
                }
                const html = e.clipboardData.getData("text/html");
                if (html) insertHtml(sanitizeHtml(html));
                else document.execCommand("insertText", false, e.clipboardData.getData("text/plain"));
                emit();
              }}
              onDrop={(e) => {
                const files = [...e.dataTransfer.files];
                if (files.length === 0) return;
                e.preventDefault();
                void uploadImages(files);
              }}
              className="rich-content min-h-52 px-4 py-3 text-sm text-black focus:outline-none"
            />
          </div>
        ) : (
          <textarea
            ref={htmlRef}
            aria-label="Conteúdo em HTML"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={onFocus}
            spellCheck={false}
            rows={12}
            className="block min-h-52 w-full resize-y px-4 py-3 font-mono text-xs leading-relaxed text-black focus:outline-none"
          />
        )}
      </div>

      {uploading && <p className="mt-1.5 text-xs text-black/60">Enviando imagem...</p>}
      {uploadError && (
        <p role="alert" className="mt-1.5 text-xs font-semibold text-red-700">
          {uploadError}
        </p>
      )}
      {mode === "visual" && !uploading && !uploadError && (
        <p className="mt-1.5 text-xs text-black/50">Dica: cole ou arraste imagens direto no texto (PNG, JPG, GIF ou WebP, até 5 MB).</p>
      )}
    </div>
  );
}
