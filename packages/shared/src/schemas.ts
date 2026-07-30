import { z } from "zod";
import { RECIPIENTS, OCCASION_SLUGS } from "./enums";

export const addressSchema = z.object({
  label: z.string().min(1),
  recipient_name: z.string().min(1),
  phone: z.string().min(6),
  city: z.string().min(1),
  area: z.string().min(1),
  street: z.string().min(1),
  building: z.string().optional(),
  floor: z.string().optional(),
  apartment: z.string().optional(),
  notes: z.string().optional(),
  is_default: z.boolean().optional(),
});
export type AddressInput = z.infer<typeof addressSchema>;

export const cartCustomizationSchema = z.object({
  message: z.string().max(300).optional(),
  gift_wrap: z.boolean().optional(),
  delivery_date: z.string().optional(),
  delivery_time_slot: z.string().optional(),
});
export type CartCustomization = z.infer<typeof cartCustomizationSchema>;

export const giftFinderQuerySchema = z.object({
  recipient: z.enum(RECIPIENTS),
  occasion: z.enum(OCCASION_SLUGS),
  budget_min: z.number().nonnegative(),
  budget_max: z.number().positive(),
});
export type GiftFinderQuery = z.infer<typeof giftFinderQuerySchema>;

export const productFormSchema = z.object({
  category_id: z.string().uuid(),
  title: z.string().min(2),
  description: z.string().optional(),
  price: z.number().positive(),
  compare_at_price: z.number().positive().optional(),
  stock_quantity: z.number().int().nonnegative(),
  gift_wrap_available: z.boolean().optional(),
  gift_wrap_price: z.number().nonnegative().optional(),
  recipient_tags: z.array(z.enum(RECIPIENTS)).default([]),
  occasion_tags: z.array(z.enum(OCCASION_SLUGS)).default([]),
});
export type ProductFormInput = z.infer<typeof productFormSchema>;
