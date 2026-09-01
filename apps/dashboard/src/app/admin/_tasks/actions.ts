"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";

/**
 * The Home task list (V5 §1.4/§1.14). A shared to-do for CADO staff: any admin
 * can see and tick anything, but only whoever wrote a task can delete it —
 * ticking is collaborative, deleting is not. RLS in 0082 enforces both; these
 * actions re-derive the author from the session so `created_by` can never be
 * supplied by a form.
 */

type Result = { ok: boolean; message?: string };

const titleSchema = z.string().trim().min(1).max(200);

export async function addTask(formData: FormData): Promise<Result> {
  const admin = await requireAdmin();
  const parsed = titleSchema.safeParse(formData.get("title"));
  if (!parsed.success) return { ok: false, message: "Write something first." };

  const dueRaw = String(formData.get("due_date") ?? "").trim();
  const due = /^\d{4}-\d{2}-\d{2}$/.test(dueRaw) ? dueRaw : null;

  const supabase = await createServerClient();
  const { error } = await supabase
    .from("dashboard_tasks")
    .insert({ title: parsed.data, due_date: due, created_by: admin.id });
  if (error) return { ok: false, message: error.message };
  revalidatePath("/admin");
  return { ok: true };
}

export async function setTaskDone(id: string, done: boolean): Promise<Result> {
  await requireAdmin();
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { ok: false, message: "Unknown task." };
  const supabase = await createServerClient();
  const { error } = await supabase
    .from("dashboard_tasks")
    .update({ done, completed_at: done ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/admin");
  return { ok: true };
}

export async function deleteTask(id: string): Promise<Result> {
  await requireAdmin();
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { ok: false, message: "Unknown task." };
  const supabase = await createServerClient();
  // RLS allows this only for the task's author; a refusal comes back as 0 rows.
  const { data, error } = await supabase.from("dashboard_tasks").delete().eq("id", id).select("id");
  if (error) return { ok: false, message: error.message };
  if (!data?.length) return { ok: false, message: "Only whoever added a task can delete it." };
  revalidatePath("/admin");
  return { ok: true };
}
