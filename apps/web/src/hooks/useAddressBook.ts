import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";

/**
 * THE ADDRESS BOOK, on the `addresses` table.
 *
 * Not `user_addresses`. There are two address tables in this database and only
 * `addresses` is wired to anything: checkout writes it, `place_order`
 * validates `p_delivery_address_id` against it, and `orders` references it. A
 * row in `user_addresses` could never become a delivery. See migration 0104.
 *
 * Every write here goes through RLS with `profile_id = auth.uid()`, which is
 * the security boundary — not the `.eq("profile_id", ...)` filters below.
 * Those are there so the queries are honest about what they expect; deleting
 * them would change nothing about what a hostile client can reach.
 */

export type SavedAddress = {
  id: string;
  label: string;
  label_custom: string | null;
  city: string;
  area: string | null;
  street: string;
  building: string | null;
  floor: string | null;
  apartment: string | null;
  phone: string;
  notes: string | null;
  latitude: number | null;
  longitude: number | null;
  voice_path: string | null;
  voice_seconds: number | null;
  photo_paths: string[];
  is_default: boolean;
};

const COLUMNS =
  "id, label, label_custom, city, area, street, building, floor, apartment, phone, notes, latitude, longitude, voice_path, voice_seconds, photo_paths, is_default";

export function useAddressBook() {
  const { session } = useAuth();
  return useQuery({
    queryKey: ["address-book", session?.user.id ?? "guest"],
    // A guest has no address book. Not an empty one — none, so the sheet can
    // skip the whole section rather than rendering an empty "Saved addresses".
    enabled: !!session,
    queryFn: async (): Promise<SavedAddress[]> => {
      const { data, error } = await supabase
        .from("addresses")
        .select(COLUMNS)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as unknown as SavedAddress[];
    },
  });
}

/** One line: "Hamra Street, Blue Building · Floor 3". Empty parts drop out. */
export function addressLine(a: SavedAddress): string {
  return [a.street, a.building, a.floor && `Floor ${a.floor}`, a.apartment]
    .filter(Boolean)
    .join(", ");
}

/** "Home", "Work", or whatever they called it. Never the raw enum. */
export function addressTitle(a: SavedAddress): string {
  if (a.label === "other") return a.label_custom?.trim() || "Other";
  return a.label.charAt(0).toUpperCase() + a.label.slice(1);
}

export type AddressInput = {
  id?: string;
  label: string;
  label_custom: string | null;
  city: string;
  area: string | null;
  street: string;
  building: string | null;
  floor: string | null;
  apartment: string | null;
  phone: string;
  notes: string | null;
  latitude: number;
  longitude: number;
  is_default: boolean;
};

export function useSaveAddress() {
  const qc = useQueryClient();
  const { session } = useAuth();
  return useMutation({
    mutationFn: async (input: AddressInput): Promise<SavedAddress> => {
      if (!session) throw new Error("Sign in to save an address");
      const row = {
        ...input,
        profile_id: session.user.id,
        country: "LB",
        // `recipient_name` is NOT NULL with a '' default since 0104. The new
        // flow never asks for it — the buyer is the recipient, and a gift
        // carries its own recipient fields on the order.
      };
      const q = input.id
        ? supabase.from("addresses").update(row).eq("id", input.id).select(COLUMNS).single()
        : supabase.from("addresses").insert(row).select(COLUMNS).single();
      const { data, error } = await q;
      if (error) throw error;
      return data as unknown as SavedAddress;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["address-book"] }),
  });
}

export function useDeleteAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (a: SavedAddress) => {
      const { error } = await supabase.from("addresses").delete().eq("id", a.id);
      if (error) throw error;

      // MEDIA AFTER THE ROW, and only if the row actually went. The other
      // order leaves an address pointing at files that no longer exist, which
      // is a broken player in the UI; this order can leave orphaned files in
      // the bucket, which nobody sees. Known limitation: if this second call
      // fails the files stay. A storage lifecycle rule is the real fix.
      const paths = [a.voice_path, ...(a.photo_paths ?? [])].filter(
        (p): p is string => !!p
      );
      if (paths.length) {
        await supabase.storage.from("address-media").remove(paths);
      }
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["address-book"] }),
  });
}

export function useSetDefaultAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // Only this row is written. The trigger from 0104 clears whichever row
      // held the flag before, inside the same statement's transaction, so
      // there is no window where two addresses are both default.
      const { error } = await supabase
        .from("addresses")
        .update({ is_default: true })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["address-book"] }),
  });
}

/**
 * A playable URL for a private object, valid one hour.
 *
 * The bucket is private on purpose — a voice note explaining how to get into
 * someone's building and a photo of their front door are the two most
 * sensitive things this app holds. Signing on demand means a URL that leaks
 * from a screenshot or a log stops working the same day.
 */
export async function signedMediaUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from("address-media")
    .createSignedUrl(path, 3600);
  if (error) return null;
  return data?.signedUrl ?? null;
}
