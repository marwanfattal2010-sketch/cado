"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, BarChart3, FileText, PackageSearch, Sparkles } from "lucide-react";

/**
 * The assistant panel (§5). Conversation lives in React state for the session
 * only — nothing is stored, so a question about takings does not outlive the
 * tab it was asked in.
 *
 * The panel never fabricates a reply: if the server says the key is missing it
 * says exactly that, and if a request fails it shows the failure rather than an
 * apologetic sentence that looks like an answer.
 */

type Msg = { role: "user" | "assistant"; content: string };

/**
 * Just enough markdown for what the assistant actually returns: paragraphs,
 * "- " bullets, and pipe tables. A full markdown library for three shapes would
 * be more dependency than feature.
 */
function Rich({ text }: { text: string }) {
  const lines = text.split("\n");
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim().startsWith("|")) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        const cells = lines[i].split("|").slice(1, -1).map((c) => c.trim());
        // The |---|---| separator row carries no data.
        if (!cells.every((c) => /^-{2,}$/.test(c))) rows.push(cells);
        i++;
      }
      const [head, ...body] = rows;
      blocks.push(
        <div key={key++} className="my-1.5 overflow-x-auto">
          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr>
                {head?.map((h, n) => (
                  <th key={n} className="border-b border-line px-1.5 py-1 text-left font-semibold text-muted">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {body.map((r, n) => (
                <tr key={n}>
                  {r.map((c, m) => (
                    <td key={m} className="border-b border-line/60 px-1.5 py-1 text-ink tnum">
                      {c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    if (line.trim().startsWith("- ")) {
      const items: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("- ")) {
        items.push(lines[i].trim().slice(2));
        i++;
      }
      blocks.push(
        <ul key={key++} className="my-1 list-disc space-y-0.5 pl-4">
          {items.map((t, n) => <li key={n}>{t}</li>)}
        </ul>
      );
      continue;
    }

    if (line.trim() === "") {
      i++;
      continue;
    }
    blocks.push(<p key={key++} className="my-0.5">{line}</p>);
    i++;
  }
  return <>{blocks}</>;
}

const CHIPS = [
  { icon: BarChart3, label: "Analytics", prompt: "Show revenue by store for the last 30 days." },
  { icon: FileText, label: "Reports", prompt: "Summarise this month's orders: how many, how much, and which stores." },
  { icon: PackageSearch, label: "Orders", prompt: "Which orders are stuck and need attention?" },
];

export function AssistantPanel() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [notConfigured, setNotConfigured] = useState(false);
  /** Set once the server tells us it answered without a model. */
  const [preview, setPreview] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [messages, busy]);

  const send = async (text: string) => {
    const question = text.trim();
    if (!question || busy) return;
    const next: Msg[] = [...messages, { role: "user", content: question }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json();
      if (data.preview) setPreview(true);
      if (res.status === 503 && data.error === "not_configured") {
        setNotConfigured(true);
        setMessages(next);
        return;
      }
      setMessages([
        ...next,
        {
          role: "assistant",
          content: res.ok ? data.reply : `That didn't work: ${data.message ?? data.error ?? res.statusText}`,
        },
      ]);
    } catch (e) {
      setMessages([...next, { role: "assistant", content: `That didn't work: ${(e as Error).message}` }]);
    } finally {
      setBusy(false);
    }
  };

  if (notConfigured) {
    return (
      <section className="rounded-card border border-line bg-surface p-4">
        <div className="mb-1 flex items-center gap-2">
          <Sparkles size={16} className="text-ribbon" />
          <h2 className="text-[14px] font-semibold text-ink">CADO Assistant</h2>
        </div>
        <p className="text-[13px] text-secondary">Assistant is not configured yet.</p>
        <p className="mt-1 text-[12px] text-muted">
          It needs an Anthropic API key on the server. Everything else on this page works without it.
        </p>
      </section>
    );
  }

  return (
    <section className="flex flex-col rounded-card border border-line bg-surface" style={{ height: 420 }}>
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        <Sparkles size={16} className="text-ribbon" />
        <div className="min-w-0 flex-1">
          <h2 className="text-[14px] font-semibold leading-4 text-ink">CADO Assistant</h2>
          <p className="text-[11px] text-muted">Ask about sales, orders, stores or customers.</p>
        </div>
        {preview ? (
          <span
            className="shrink-0 rounded-pill bg-status-amber-tint px-2 py-0.5 text-[10px] font-semibold text-status-amber"
            title="Real numbers from your database, but no AI yet — the shortcut questions work, free text needs the API key."
          >
            Preview
          </span>
        ) : null}
      </div>

      <div ref={scroller} className="flex-1 space-y-2.5 overflow-y-auto px-3 py-3">
        {messages.length === 0 ? (
          <div className="pt-4 text-center">
            <p className="text-[14px] font-medium text-ink">How can I help you today?</p>
            <div className="mt-3 flex flex-wrap justify-center gap-1.5">
              {CHIPS.map((c) => {
                const Icon = c.icon;
                return (
                  <button
                    key={c.label}
                    type="button"
                    onClick={() => setInput(c.prompt)}
                    className="inline-flex items-center gap-1.5 rounded-pill border border-line px-2.5 py-1.5 text-[12px] text-secondary transition-colors hover:border-line-strong hover:text-ink"
                  >
                    <Icon size={13} />
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <div
              key={i}
              className={`max-w-[92%] rounded-card px-3 py-2 text-[13px] leading-5 ${
                m.role === "user"
                  ? "ml-auto bg-ribbon-tint text-ink"
                  : "mr-auto border border-line bg-canvas text-secondary"
              }`}
            >
              <Rich text={m.content} />
            </div>
          ))
        )}
        {busy ? (
          <div className="mr-auto rounded-card border border-line bg-canvas px-3 py-2 text-[13px] text-muted">
            Thinking…
          </div>
        ) : null}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
        className="flex items-center gap-2 border-t border-line px-3 py-2.5"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={busy}
          placeholder="Ask anything about your shop…"
          className="h-9 flex-1 rounded-card border border-line bg-canvas px-2.5 text-[13px] text-ink outline-none placeholder:text-muted focus:border-line-strong"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          aria-label="Send"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-card bg-ribbon text-white transition-colors hover:bg-ribbon-deep disabled:opacity-40"
        >
          <ArrowUp size={16} />
        </button>
      </form>
    </section>
  );
}
