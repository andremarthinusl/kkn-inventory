import { z } from "zod";

export const createTransactionSchema = z.object({
  itemId: z.string().min(1, "Barang harus dipilih"),
  type: z.enum(["MASUK", "KELUAR"]),
  quantity: z.number().int().min(1, "Jumlah minimal 1"),
  unit: z.string().min(1, "Satuan harus diisi").default("unit"),
  source: z.string().optional(),
  reason: z.string().optional(),
  price: z.number().positive("Harga harus positif").optional(),
  notes: z.string().optional(),
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;