import { supabase } from "./supabase";

export function productImageUrl(storagePath: string) {
  return supabase.storage.from("product-images").getPublicUrl(storagePath).data.publicUrl;
}

export function primaryImage(images: { storage_path: string; is_primary: boolean }[] | null | undefined) {
  if (!images || images.length === 0) return null;
  const primary = images.find((img) => img.is_primary) ?? images[0];
  return productImageUrl(primary.storage_path);
}
