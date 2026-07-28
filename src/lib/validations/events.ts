import { z } from "zod";

export const createEventSchema = z.object({
  name: z.string().min(1, "Nama acara harus diisi"),
  date: z.string().min(1, "Tanggal harus diisi"),
  time: z.string().optional(),
  location: z.string().optional(),
  pic: z.string().optional(),
  description: z.string().optional(),
  status: z
    .enum(["DIRENCANAKAN", "BERLANGSUNG", "SELESAI", "DIBATALKAN"])
    .default("DIRENCANAKAN"),
});

export const updateEventSchema = z.object({
  name: z.string().min(1, "Nama acara harus diisi").optional(),
  date: z.string().optional(),
  time: z.string().optional(),
  location: z.string().optional(),
  pic: z.string().optional(),
  description: z.string().optional(),
  status: z
    .enum(["DIRENCANAKAN", "BERLANGSUNG", "SELESAI", "DIBATALKAN"])
    .optional(),
});

export const addEventItemSchema = z.object({
  eventId: z.string().min(1, "Acara harus dipilih"),
  itemId: z.string().min(1, "Barang harus dipilih"),
  quantityNeeded: z.number().int().min(1, "Jumlah minimal 1"),
  notes: z.string().optional(),
});

export const updateEventItemSchema = z.object({
  quantityNeeded: z.number().int().min(1, "Jumlah minimal 1").optional(),
  quantityPrepared: z.number().int().min(0, "Jumlah tidak boleh negatif").optional(),
  notes: z.string().optional(),
  status: z.enum(["BELUM", "SEBAGIAN", "SIAP", "SELESAI"]).optional(),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
export type AddEventItemInput = z.infer<typeof addEventItemSchema>;
export type UpdateEventItemInput = z.infer<typeof updateEventItemSchema>;