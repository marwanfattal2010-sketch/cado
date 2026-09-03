import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { FALLBACK_WINDOW, setDeliveryWindow, type DeliveryWindow } from "../lib/deliveryPromise";

/**
 * Load the shop's real opening hours once, at the top of the app, and publish
 * them to `deliveryPromise`.
 *
 * `app_settings` is world-readable (policy "public reads cado hours"), holds
 * exactly one row, and is the same row the server checks when an order is
 * placed — so the promise on a product card and the rule that would reject
 * that order cannot disagree.
 *
 * A failure here is not an error state: the fallback matches what the row
 * currently says, and the server rejects an out-of-hours order regardless of
 * what the page believed.
 */
export function useDeliveryWindow() {
  const query = useQuery({
    queryKey: ["delivery-window"],
    staleTime: 30 * 60 * 1000,
    retry: false,
    queryFn: async (): Promise<DeliveryWindow> => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("opens_at, closes_at, timezone")
        .maybeSingle();
      if (error || !data) return FALLBACK_WINDOW;
      // "21:00:00" -> 21. Minutes are ignored on purpose: the promise is
      // written in whole hours ("order by 9pm"), and a 21:30 cutoff would
      // make "9pm" a lie in the safe direction rather than the other way.
      const hour = (t: string | null, fallback: number) =>
        t ? Number(t.slice(0, 2)) : fallback;
      return {
        opensHour: hour(data.opens_at, FALLBACK_WINDOW.opensHour),
        cutoffHour: hour(data.closes_at, FALLBACK_WINDOW.cutoffHour),
        timezone: data.timezone ?? FALLBACK_WINDOW.timezone,
      };
    },
  });

  useEffect(() => {
    if (query.data) setDeliveryWindow(query.data);
  }, [query.data]);

  return query.data ?? FALLBACK_WINDOW;
}
