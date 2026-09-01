"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUp, Mic, Sparkles, Volume2, VolumeX, X } from "lucide-react";
import { TintCard, TintChip } from "./tint";
import { useSpeech, useSpeaker } from "../v5/useSpeech";

/**
 * The compact assistant (V4 §3.4). The V3 panel was 420px of mostly empty box;
 * this is a 260px card that holds three real prompts and an input, and the
 * conversation opens in a drawer so the card itself never grows.
 *
 * Replies come from the same /api/assistant endpoint. Nothing is ever faked: if
 * the server has no model configured it answers the shortcut questions from
 * real queries and marks itself Preview, and if it cannot answer at all the
 * widget says so rather than inventing a sentence.
 */

type Msg = { role: "user" | "assistant"; content: string };

const CHIPS = [
  { label: "Top stores this month", prompt: "Show revenue by store for the last 30 days." },
  { label: "Orders needing confirmation", prompt: "Which orders are stuck and need attention?" },
  { label: "Which products are selling", prompt: "Summarise this month's orders: how many, how much, and which stores." },
];

/** Just enough markdown for what the assistant returns: bullets and tables. */
function Rich({ text }: { text: string }) {
  const lines = text.split("\n");
  const out: React.ReactNode[] = [];
  let i = 0;
  let k = 0;
  while (i < lines.length) {
    const l = lines[i];
    if (l.trim().startsWith("|")) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        const cells = lines[i].split("|").slice(1, -1).map((c) => c.trim());
        if (!cells.every((c) => /^-{2,}$/.test(c))) rows.push(cells);
        i++;
      }
      const [head, ...body] = rows;
      out.push(
        <div key={k++} className="my-2 overflow-x-auto">
          <table className="w-full border-collapse text-[12.5px]">
            <thead>
              <tr>
                {head?.map((h, n) => (
                  <th key={n} className="border-b border-line px-2 py-1.5 text-left font-medium text-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {body.map((r, n) => (
                <tr key={n}>
                  {r.map((c, m) => (
                    <td key={m} className="border-b border-line/60 px-2 py-1.5 text-ink tnum">{c}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }
    if (l.trim().startsWith("- ")) {
      const items: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("- ")) { items.push(lines[i].trim().slice(2)); i++; }
      out.push(<ul key={k++} className="my-1 list-disc space-y-0.5 pl-4">{items.map((t, n) => <li key={n}>{t}</li>)}</ul>);
      continue;
    }
    if (l.trim() === "") { i++; continue; }
    out.push(<p key={k++} className="my-1">{l}</p>);
    i++;
  }
  return <>{out}</>;
}

export function AssistantWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const speaker = useSpeaker();
  const say = speaker.say;
  // Dictation sends as soon as the speaker stops — that is the whole point.
  const speech = useSpeech((text) => void send(text));

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [messages, busy]);

  const send = useCallback(async (text: string) => {
    const q = text.trim();
    if (!q || busy) return;
    const next: Msg[] = [...messages, { role: "user", content: q }];
    setMessages(next);
    setInput("");
    setOpen(true);
    setBusy(true);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json();
      if (data.preview) setPreview(true);
      const reply = res.ok
        ? data.reply
        : data.error === "not_configured"
          ? "The assistant isn't connected yet."
          : `That didn't work: ${data.message ?? res.statusText}`;
      setMessages([...next, { role: "assistant", content: reply }]);
      // Only reads it out if the speaker toggle is on; default is off.
      if (res.ok) say(reply);
    } catch (e) {
      setMessages([...next, { role: "assistant", content: `That didn't work: ${(e as Error).message}` }]);
    } finally {
      setBusy(false);
    }
  }, [busy, messages, say]);

  return (
    <>
      <TintCard tint="violet" className="flex flex-col p-4" style={{ maxHeight: 260 }}>
        <div className="mb-2.5 flex items-center gap-2.5">
          <TintChip><Sparkles size={17} /></TintChip>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold leading-5 text-ink">CADO Assistant</p>
            <p className="text-[12px] text-secondary">Ask about your shop</p>
          </div>
          <span
            className="rounded-pill px-1.5 py-0.5 text-[10px] font-semibold"
            style={{ color: "var(--tint)", background: "color-mix(in srgb, var(--tint) 18%, transparent)" }}
          >
            {preview ? "Preview" : "Beta"}
          </span>
        </div>

        <div className="mb-2.5 flex flex-wrap gap-1.5">
          {CHIPS.map((c) => (
            <button
              key={c.label}
              type="button"
              onClick={() => void send(c.prompt)}
              className="rounded-pill border border-line bg-surface/40 px-2.5 py-1 text-left text-[12px] text-secondary transition-colors hover:text-ink"
            >
              {c.label}
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); void send(input); }}
          className="mt-auto flex items-center gap-1.5"
        >
          <div className="relative flex h-10 min-w-0 flex-1 items-center rounded-[12px] border border-line bg-surface-sunk pr-1">
            <input
              value={speech.listening ? speech.interim : input}
              onChange={(e) => setInput(e.target.value)}
              disabled={speech.listening}
              placeholder={speech.listening ? "Listening…" : "Ask about sales, orders, stores…"}
              className="h-full min-w-0 flex-1 bg-transparent px-3 text-[13px] text-ink outline-none placeholder:text-muted"
            />
            {/* Hidden entirely where the browser has no speech engine — a mic
                button that cannot listen is worse than no mic button. */}
            {speech.supported ? (
              <button
                type="button"
                onClick={() => (speech.listening ? speech.stop() : speech.start())}
                aria-label={speech.listening ? "Stop listening" : "Speak your question"}
                title={speech.listening ? "Stop" : `Speak (${speech.lang === "ar-LB" ? "Arabic" : "English"})`}
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] transition-colors ${
                  speech.listening ? "bg-ribbon text-white" : "text-muted hover:text-ink"
                }`}
              >
                <Mic size={15} />
              </button>
            ) : null}
          </div>

          {speech.supported ? (
            <select
              value={speech.lang}
              onChange={(e) => speech.setLang(e.target.value as typeof speech.lang)}
              aria-label="Speech language"
              className="h-10 shrink-0 rounded-[12px] border border-line bg-surface-sunk px-1 text-[11px] text-secondary outline-none"
            >
              <option value="en-US">EN</option>
              <option value="ar-LB">AR</option>
            </select>
          ) : null}

          {speaker.supported ? (
            <button
              type="button"
              onClick={speaker.toggle}
              aria-pressed={speaker.on}
              aria-label={speaker.on ? "Stop reading answers aloud" : "Read answers aloud"}
              title={speaker.on ? "Reading answers aloud" : "Read answers aloud"}
              className={`flex h-10 w-9 shrink-0 items-center justify-center rounded-[12px] border border-line transition-colors ${
                speaker.on ? "text-ribbon" : "text-muted hover:text-ink"
              }`}
            >
              {speaker.on ? <Volume2 size={15} /> : <VolumeX size={15} />}
            </button>
          ) : null}

          <button
            type="submit"
            disabled={!input.trim() || busy || speech.listening}
            aria-label="Ask"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-ribbon text-white transition-colors hover:bg-ribbon-deep disabled:opacity-40"
          >
            <ArrowUp size={16} />
          </button>
        </form>
        {speech.error ? <p className="mt-1 text-[11.5px] text-status-red">{speech.error}</p> : null}
      </TintCard>

      {/* Conversation drawer — the widget never grows into the page. */}
      {open ? (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <aside
            className="relative flex h-full w-full max-w-[400px] flex-col border-l border-line bg-surface"
            style={{ animation: "rise 180ms ease-out both" }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="CADO Assistant"
          >
            <header className="flex items-center gap-2 border-b border-line px-4 py-3">
              <Sparkles size={16} style={{ color: "var(--tint-violet)" }} />
              <p className="flex-1 text-[14px] font-semibold text-ink">CADO Assistant</p>
              {preview ? (
                <span className="rounded-pill bg-status-amber-tint px-2 py-0.5 text-[10px] font-semibold text-status-amber">
                  Preview
                </span>
              ) : null}
              <button onClick={() => setOpen(false)} aria-label="Close" className="text-muted hover:text-ink">
                <X size={16} />
              </button>
            </header>

            <div ref={scroller} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {preview ? (
                <p className="rounded-[12px] border border-line bg-surface-sunk px-3 py-2 text-[12px] text-secondary">
                  Answering from your real data, without the AI yet — the three shortcut questions work; free-text
                  answers need CADO&rsquo;s AI key.
                </p>
              ) : null}
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`max-w-[92%] rounded-[14px] px-3 py-2 text-[13px] leading-5 ${
                    m.role === "user" ? "ml-auto bg-ribbon-tint text-ink" : "mr-auto bg-surface-sunk text-secondary"
                  }`}
                >
                  <Rich text={m.content} />
                </div>
              ))}
              {busy ? (
                <div className="mr-auto rounded-[14px] bg-surface-sunk px-3 py-2 text-[13px] text-muted">Thinking…</div>
              ) : null}
            </div>

            <form
              onSubmit={(e) => { e.preventDefault(); void send(input); }}
              className="flex items-center gap-1.5 border-t border-line px-3 py-3"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={busy}
                placeholder="Ask another question…"
                className="h-10 flex-1 rounded-[12px] border border-line bg-surface-sunk px-3 text-[13px] text-ink outline-none placeholder:text-muted"
              />
              <button
                type="submit"
                disabled={!input.trim() || busy}
                aria-label="Send"
                className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-ribbon text-white disabled:opacity-40"
              >
                <ArrowUp size={16} />
              </button>
            </form>
          </aside>
        </div>
      ) : null}
    </>
  );
}
