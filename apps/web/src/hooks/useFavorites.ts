import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";

export function useFavorites() {
  const { session } = useAuth();
  return useQuery({
    queryKey: ["favorites"],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("favorites")
        .select("id, product_id, product:products(id, title, price, currency, product_images(storage_path, is_primary))")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });
}

export function useFavoriteIds() {
  const favorites = useFavorites();
  return new Set((favorites.data ?? []).map((f) => f.product_id));
}

export function useToggleFavorite() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ productId, isFavorite }: { productId: string; isFavorite: boolean }) => {
      if (!session) throw new Error("must be logged in");
      if (isFavorite) {
        const { error } = await supabase
          .from("favorites")
          .delete()
          .eq("profile_id", session.user.id)
          .eq("product_id", productId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("favorites")
          .insert({ profile_id: session.user.id, product_id: productId });
        if (error) throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["favorites"] }),
  });
}
