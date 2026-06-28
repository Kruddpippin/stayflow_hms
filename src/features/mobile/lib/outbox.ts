// Offline-first outbox for mobile housekeeping PWA
import { get, set, del, keys } from "idb-keyval";
import { supabase } from "@/lib/supabase";

export interface OutboxItem {
  id: string;
  entity: "housekeeping_task" | "room_status" | "task_photo" | "task_note" | "maintenance_order";
  op: "update_status" | "upload_photo" | "add_note" | "create_order";
  payload: Record<string, unknown>;
  idempotencyKey: string;
  createdAt: string;
  attempts: number;
  lastError?: string;
}

const OUTBOX_PREFIX = "outbox:";

export async function enqueueOutboxItem(item: Omit<OutboxItem, "id" | "createdAt" | "attempts">) {
  const id = crypto.randomUUID();
  const entry: OutboxItem = { ...item, id, createdAt: new Date().toISOString(), attempts: 0 };
  await set(`${OUTBOX_PREFIX}${id}`, entry);
  return entry;
}

export async function getOutboxItems(): Promise<OutboxItem[]> {
  const allKeys = await keys();
  const items: OutboxItem[] = [];
  for (const k of allKeys) {
    if (typeof k === "string" && k.startsWith(OUTBOX_PREFIX)) {
      const item = await get<OutboxItem>(k);
      if (item) items.push(item);
    }
  }
  return items.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function removeOutboxItem(id: string) {
  await del(`${OUTBOX_PREFIX}${id}`);
}

async function processItem(item: OutboxItem): Promise<boolean> {
  try {
    if (item.entity === "housekeeping_task" && item.op === "update_status") {
      const { task_id, status } = item.payload as { task_id: string; status: string };
      if (status === "done") {
        const { data, error } = await supabase.rpc("complete_housekeeping_task", { p_task_id: task_id });
        if (error) throw error;
        const result = data as Record<string, unknown>;
        if (result.error) throw new Error(result.error as string);
      } else {
        const { error } = await supabase.from("housekeeping_tasks").update({ status }).eq("id", task_id);
        if (error) throw error;
      }
      return true;
    }

    if (item.entity === "room_status" && item.op === "update_status") {
      const { room_id, status } = item.payload as { room_id: string; status: string };
      const { error } = await supabase.from("rooms").update({ status }).eq("id", room_id);
      if (error) throw error;
      return true;
    }

    if (item.entity === "task_photo" && item.op === "upload_photo") {
      const { facility_id, task_id, blob_base64, filename } = item.payload as {
        facility_id: string; task_id: string; blob_base64: string; filename: string;
      };
      const blob = Uint8Array.from(atob(blob_base64), (c) => c.charCodeAt(0));
      const path = `${facility_id}/${task_id}/${filename}`;
      const { error } = await supabase.storage.from("housekeeping-photos").upload(path, blob, {
        contentType: "image/jpeg", upsert: true,
      });
      if (error) throw error;
      return true;
    }

    if (item.entity === "maintenance_order" && item.op === "create_order") {
      const { error } = await supabase.from("maintenance_orders").insert(item.payload);
      if (error) throw error;
      return true;
    }

    return true;
  } catch (e) {
    item.lastError = (e as Error).message;
    item.attempts++;
    await set(`${OUTBOX_PREFIX}${item.id}`, item);
    return false;
  }
}

export async function flushOutbox(): Promise<{ flushed: number; failed: number }> {
  if (!navigator.onLine) return { flushed: 0, failed: 0 };

  const items = await getOutboxItems();
  let flushed = 0;
  let failed = 0;

  for (const item of items) {
    if (item.attempts >= 5) { failed++; continue; }
    const ok = await processItem(item);
    if (ok) {
      await removeOutboxItem(item.id);
      flushed++;
    } else {
      failed++;
    }
  }

  return { flushed, failed };
}
