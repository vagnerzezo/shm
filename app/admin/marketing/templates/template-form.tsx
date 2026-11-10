"use client";

import { EyeIcon, XIcon } from "lucide-react";
import Link from "next/link";
import { useActionState, useRef, useState } from "react";
import type { Channel, Template } from "@/app/_lib/db";
import { saveTemplate } from "@/app/_lib/marketing-actions";
import { contentToHtml, htmlToText, renderHtmlTemplate, sanitizeHtml } from "@/app/_lib/email-html";
import { channelLabel, LIMITS, renderTemplate, sampleValues, variables } from "@/app/_lib/marketing-template";
import { cn } from "@/lib/utils";
import { card, fieldClass, labelClass, primaryButton, secondaryButton } from "../ui";
import { RichTextEditor, type RichTextEditorHandle } from "./rich-text-editor";

export function TemplateForm({ template, channel: initialChannel }: { template?: Template; channel: Channel }) {
  const [state, action, pending] = useActionState(saveTemplate, { error: null });
  const [channel, setChannel] = useState<Channel>(template?.channel ?? initialChannel);
  const [subject, setSubject] = useState(template?.subject ?? "");
  // E-mail é editado como HTML; templates antigos em texto puro são convertidos.
  const [body, setBody] = useState(() => {
    const initial = template?.body ?? "";
    return (template?.channel ?? initialChannel) === "email" ? contentToHtml(initial) : initial;
  });
  const [active, setActive] = useState(template?.active ?? true);
  // Campo onde a variável clicada entra: o último que teve foco.
  const target = useRef<"subject" | "body">("body");
  const subjectRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const editorRef = useRef<RichTextEditorHandle>(null);
  const previewRef = useRef<HTMLDialogElement>(null);

  function changeChannel(next: Channel) {
    if (next === channel) return;
    setBody((current) => (next === "email" ? contentToHtml(current) : htmlToText(current)));
    setChannel(next);
  }

  function insert(key: string) {
    const token = `{{${key}}}`;
    if (channel === "email" && target.current === "body") {
      editorRef.current?.insertText(token);
      return;
    }
    const useSubject = channel === "email" && target.current === "subject";
    const el = useSubject ? subjectRef.current : bodyRef.current;
    const value = useSubject ? subject : body;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    const next = value.slice(0, start) + token + value.slice(end);
    (useSubject ? setSubject : setBody)(next);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + token.length, start + token.length);
    });
  }

  const limit = LIMITS.body[channel];

  return (
    <form action={action} className={cn(card, "p-5")}>
      {template && <input type="hidden" name="id" value={template.id} />}

      <div className="flex min-w-0 flex-col gap-4">
        <h2 className="text-lg font-bold text-black">{template ? "Editar template" : "Novo template"}</h2>

        <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
          <label>
            <span className={labelClass}>Nome</span>
            <input
              name="nome"
              required
              maxLength={LIMITS.name}
              defaultValue={template?.name}
              placeholder="Ex.: Saudade — 20 dias"
              className={cn(fieldClass, "mt-1.5")}
            />
          </label>
          <label>
            <span className={labelClass}>Canal</span>
            <select
              name="canal"
              value={channel}
              onChange={(e) => changeChannel(e.target.value as Channel)}
              className={cn(fieldClass, "mt-1.5")}
            >
              <option value="email">E-mail</option>
              <option value="mensagem">Mensagem</option>
            </select>
          </label>
        </div>

        {channel === "email" && (
          <label>
            <span className={labelClass}>Assunto</span>
            <input
              ref={subjectRef}
              name="assunto"
              required
              maxLength={LIMITS.subject}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              onFocus={() => (target.current = "subject")}
              placeholder="Ex.: {{primeiro_nome}}, que tal renovar o visual?"
              className={cn(fieldClass, "mt-1.5")}
            />
          </label>
        )}

        <div>
          <span className="flex items-baseline justify-between">
            <span className={labelClass}>Conteúdo</span>
            <span className={cn("text-xs", body.length > limit ? "font-semibold text-red-700" : "text-black/50")}>
              {body.length}/{limit}
            </span>
          </span>
          {channel === "email" ? (
            <>
              <input type="hidden" name="conteudo" value={body} />
              <RichTextEditor
                ref={editorRef}
                value={body}
                onChange={setBody}
                onFocus={() => (target.current = "body")}
                placeholder="Oi, {{primeiro_nome}}! Faz {{dias_sem_visita}} dias desde o seu último {{ultimo_servico}}..."
              />
            </>
          ) : (
            <textarea
              ref={bodyRef}
              name="conteudo"
              required
              aria-label="Conteúdo"
              rows={6}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onFocus={() => (target.current = "body")}
              placeholder={"Oi, {{primeiro_nome}}!\nFaz {{dias_sem_visita}} dias desde o seu último {{ultimo_servico}}..."}
              className={cn(fieldClass, "mt-1.5 h-auto py-2.5 leading-relaxed")}
            />
          )}
        </div>

        <div>
          <p className={labelClass}>Variáveis — clique para inserir no campo selecionado</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {variables.map((v) => (
              <button
                key={v.key}
                type="button"
                title={v.label}
                onClick={() => insert(v.key)}
                className="rounded-md border border-black/15 bg-white px-2 py-1 font-mono text-xs text-black transition hover:border-black hover:bg-black/5"
              >
                {`{{${v.key}}}`}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <label className="flex items-center gap-2 text-sm text-black">
            <input
              type="checkbox"
              name="ativo"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="size-4 accent-[#121212]"
            />
            Ativo
          </label>
          <label className={cn("flex items-center gap-2 text-sm", active ? "text-black" : "text-black/40")}>
            <input
              type="checkbox"
              name="padrao"
              defaultChecked={template?.isDefault}
              disabled={!active}
              className="size-4 accent-[#121212]"
            />
            Template padrão de {channelLabel[channel].toLowerCase()}
          </label>
        </div>

        {state.error && (
          <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
            {state.error}
          </p>
        )}

        <div className="flex gap-2">
          <button type="submit" disabled={pending} className={primaryButton}>
            {pending ? "Salvando..." : "Salvar template"}
          </button>
          <button type="button" onClick={() => previewRef.current?.showModal()} className={secondaryButton}>
            <EyeIcon className="size-4" />
            Prévia
          </button>
          <Link href={`/admin/marketing/templates?canal=${channel}`} className={secondaryButton}>
            Cancelar
          </Link>
        </div>
      </div>

      <dialog
        ref={previewRef}
        aria-labelledby="previa-template"
        onClick={(event) => {
          if (event.target === event.currentTarget) event.currentTarget.close();
        }}
        className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-2xl overflow-hidden rounded-2xl bg-white p-0 text-black shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-sm open:flex open:flex-col"
      >
        <div className="flex items-start justify-between gap-4 border-b border-black/10 px-6 py-4">
          <div>
            <h2 id="previa-template" className="text-lg font-semibold">
              Prévia {channel === "email" ? "do e-mail" : "da mensagem"}
            </h2>
            <p className="text-xs text-black/60">Com dados de exemplo no lugar das variáveis.</p>
          </div>
          <button
            type="button"
            aria-label="Fechar prévia"
            onClick={() => previewRef.current?.close()}
            className="-mr-2 inline-flex size-9 items-center justify-center rounded-lg text-black/60 transition hover:bg-black/5 hover:text-black"
          >
            <XIcon className="size-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-black/[0.03] p-4 sm:p-6">
          {channel === "email" ? (
            <div className="overflow-hidden rounded-xl border border-black/10 bg-white">
              <div className="border-b border-black/10 px-5 py-3 text-sm">
                <p className="text-xs text-black/50">Assunto</p>
                <p className="font-semibold">{renderTemplate(subject, sampleValues) || "Sem assunto"}</p>
              </div>
              <div className="px-5 py-5" style={{ fontFamily: "Arial, sans-serif", fontSize: 15, color: "#121212" }}>
                {htmlToText(body) || /<img\b/i.test(body) ? (
                  <div
                    className="rich-content"
                    dangerouslySetInnerHTML={{ __html: renderHtmlTemplate(sanitizeHtml(body), sampleValues) }}
                  />
                ) : (
                  <p className="text-sm text-black/50">O conteúdo aparece aqui.</p>
                )}
                <hr className="my-6 border-black/15" />
                <p className="text-xs text-black/50">
                  Você recebe este e-mail porque autorizou comunicações do {sampleValues.estudio}. Para deixar de
                  receber, acesse sua conta.
                </p>
              </div>
            </div>
          ) : (
            <p className="w-fit max-w-full rounded-xl bg-[#121212] px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap text-white">
              {renderTemplate(body, sampleValues) || "O conteúdo aparece aqui."}
            </p>
          )}
        </div>
      </dialog>
    </form>
  );
}
