"use client";

import { useRef, useState, useTransition } from "react";
import { replyToTicket, setTicketStatus } from "./actions";
import { t } from "@/lib/dictionary";

const MAX = 2000;

/**
 * The reply box and the close/reopen control for one ticket.
 *
 * Client-only because it needs pending state and an inline error — everything
 * it does still runs through a server action that re-checks the admin role.
 * The ticket id is a prop, but that is not a trust boundary: RLS only lets an
 * admin update support_tickets at all.
 */
export function TicketReply({
  ticketId,
  status,
}: {
  ticketId: string;
  status: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const boxRef = useRef<HTMLTextAreaElement>(null);
  const closed = status === "closed";

  const send = () =>
    startTransition(async () => {
      setError(null);
      const res = await replyToTicket(ticketId, body);
      if (res.ok) {
        setBody("");
        boxRef.current?.blur();
      } else {
        setError(res.message ?? t("common.error"));
      }
    });

  const toggle = () =>
    startTransition(async () => {
      setError(null);
      const res = await setTicketStatus(ticketId, closed ? "open" : "closed");
      if (!res.ok) setError(res.message ?? t("common.error"));
    });

  return (
    <div className="mt-3 border-t border-line pt-3">
      <label htmlFor={`reply-${ticketId}`} className="sr-only">
        {t("admin.support.reply.label")}
      </label>
      <textarea
        id={`reply-${ticketId}`}
        ref={boxRef}
        value={body}
        maxLength={MAX}
        rows={3}
        onChange={(e) => setBody(e.target.value)}
        disabled={pending}
        placeholder={t("admin.support.reply.placeholder")}
        className="w-full rounded-card border border-line bg-canvas px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-ribbon focus:outline-none disabled:opacity-50"
      />

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={send}
          disabled={pending || body.trim().length === 0}
          className="min-h-[44px] flex-1 rounded-pill bg-ribbon px-4 text-sm font-semibold text-white disabled:opacity-40 sm:flex-none"
        >
          {pending ? t("admin.support.reply.sending") : t("admin.support.reply.send")}
        </button>

        <button
          type="button"
          onClick={toggle}
          disabled={pending}
          className="min-h-[44px] rounded-pill border border-line px-4 text-sm font-semibold text-muted hover:text-ink disabled:opacity-40"
        >
          {closed ? t("admin.support.reopen") : t("admin.support.close")}
        </button>

        <span className="ml-auto text-xs tabular-nums text-muted">
          {body.length}/{MAX}
        </span>
      </div>

      {error ? <p className="mt-2 text-xs text-status-red">{error}</p> : null}
    </div>
  );
}
