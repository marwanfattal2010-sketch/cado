"use client";

import { useState, useTransition } from "react";
import { Check, Plus, Trash2 } from "lucide-react";
import { addTask, setTaskDone, deleteTask } from "@/app/admin/_tasks/actions";

/**
 * Tasks (V5 §1.14). A shared list for whoever runs CADO — the things that
 * aren't orders and won't appear anywhere else.
 *
 * Overdue is shown in red only when it genuinely is: strictly before today in
 * the browser's own date, never "due soon" dressed up as late.
 */

export type TaskRow = {
  id: string;
  title: string;
  done: boolean;
  due_date: string | null;
  created_by: string;
  author_name: string | null;
};

const todayKey = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString().slice(0, 10);
};

export function Tasks({ tasks }: { tasks: TaskRow[] }) {
  const [pending, start] = useTransition();
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showDone, setShowDone] = useState(false);

  const open = tasks.filter((t) => !t.done);
  const done = tasks.filter((t) => t.done);

  const run = (fn: () => Promise<{ ok: boolean; message?: string }>) =>
    start(async () => {
      setError(null);
      const res = await fn();
      if (!res.ok) setError(res.message ?? "That didn't work.");
    });

  return (
    <section className="flex h-full flex-col rounded-card border border-line bg-surface">
      <div className="flex h-12 items-center justify-between border-b border-line px-4">
        <h2 className="text-[15px] font-semibold text-ink">Tasks</h2>
        {open.length > 0 ? (
          <span className="text-[12px] text-muted tnum">{open.length} open</span>
        ) : null}
      </div>

      <div className="flex-1 overflow-y-auto">
        {open.length === 0 && done.length === 0 ? (
          <p className="px-4 py-8 text-center text-[13.5px] text-secondary">No tasks yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {open.map((t) => {
              const overdue = t.due_date != null && t.due_date < todayKey();
              return (
                <li key={t.id} className="group flex items-center gap-2.5 px-4 py-2.5">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => run(() => setTaskDone(t.id, true))}
                    aria-label={`Mark "${t.title}" done`}
                    className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border border-line-strong text-transparent transition-colors hover:border-ribbon hover:text-ribbon"
                  >
                    <Check size={12} />
                  </button>
                  <span className="min-w-0 flex-1 truncate text-[13.5px] text-ink">{t.title}</span>
                  {t.due_date ? (
                    <span
                      className="shrink-0 rounded-pill px-2 py-0.5 text-[11px] font-medium"
                      style={
                        overdue
                          ? { color: "var(--st-cancelled)", background: "color-mix(in srgb, var(--st-cancelled) 14%, transparent)" }
                          : { color: "var(--text-muted)", background: "var(--surface-sunk)" }
                      }
                    >
                      {new Date(t.due_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    </span>
                  ) : null}
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => run(() => deleteTask(t.id))}
                    aria-label={`Delete "${t.title}"`}
                    className="shrink-0 text-muted opacity-0 transition-opacity hover:text-status-red group-hover:opacity-100"
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {done.length > 0 ? (
          <div className="border-t border-line">
            <button
              type="button"
              onClick={() => setShowDone((v) => !v)}
              className="w-full px-4 py-2 text-left text-[12.5px] text-muted hover:text-ink"
            >
              Done ({done.length}) {showDone ? "▾" : "▸"}
            </button>
            {showDone ? (
              <ul className="divide-y divide-line">
                {done.map((t) => (
                  <li key={t.id} className="flex items-center gap-2.5 px-4 py-2">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => run(() => setTaskDone(t.id, false))}
                      aria-label={`Reopen "${t.title}"`}
                      className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] bg-ribbon text-white"
                    >
                      <Check size={12} />
                    </button>
                    <span className="min-w-0 flex-1 truncate text-[13px] text-muted line-through">
                      {t.title}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>

      <form
        action={(fd) => run(() => addTask(fd))}
        className="flex items-center gap-1.5 border-t border-line p-2.5"
      >
        <input
          name="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add a task"
          className="h-9 min-w-0 flex-1 rounded-[10px] border border-line bg-canvas px-2.5 text-[13px] text-ink outline-none placeholder:text-muted"
        />
        <input
          name="due_date"
          type="date"
          value={due}
          onChange={(e) => setDue(e.target.value)}
          className="h-9 w-[132px] shrink-0 rounded-[10px] border border-line bg-canvas px-2 text-[12.5px] text-ink outline-none"
          aria-label="Due date (optional)"
        />
        <button
          type="submit"
          disabled={pending || !title.trim()}
          aria-label="Add task"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-ribbon text-white disabled:opacity-40"
          onClick={() => setTimeout(() => { setTitle(""); setDue(""); }, 0)}
        >
          <Plus size={16} />
        </button>
      </form>
      {error ? <p className="px-3 pb-2 text-[12px] text-status-red">{error}</p> : null}
    </section>
  );
}
