import { z } from "zod";

export const createBorrowedItemSchema = z.object({
  itemName: z.string().min(1, "Nama barang harus diisi"),
  ownerName: z.string().min(1, "Nama pemilik harus diisi"),
  ownerPhone: z.string().optional(),
  institution: z.string().optional(),
  loanDate: z.string().min(1, "Tanggal pinjam harus diisi"),
  planReturnDate: z.string().optional(),
  quantity: z.number().int().min(1, "Jumlah minimal 1"),
  unit: z.string().min(1, "Satuan harus diisi").default("unit"),
  conditionIn: z.string().optional(),
  notes: z.string().optional(),
});

export const updateBorrowedItemSchema = z.object({
  itemName: z.string().min(1, "Nama barang harus diisi").optional(),
  ownerName: z.string().min(1, "Nama pemilik harus diisi").optional(),
  ownerPhone: z.string().optional(),
  institution: z.string().optional(),
  loanDate: z.string().optional(),
  planReturnDate: z.string().optional(),
  quantity: z.number().int().min(1, "Jumlah minimal 1").optional(),
  unit: z.string().optional(),
  conditionIn: z.string().optional(),
  conditionOut: z.string().optional(),
  status: z.enum(["DIPINJAM", "DIKEMBALIKAN", "TERLAMBAT"]).optional(),
  notes: z.string().optional(),
});

export const returnBorrowedItemSchema = z.object({
  returnDate: z.string().min(1, "Tanggal kembali harus diisi"),
  conditionOut: z.string().optional(),
  notes: z.string().optional(),
});

export type CreateBorrowedItemInput = z.infer<typeof createBorrowedItemSchema>;
export type UpdateBorrowedItemInput = z.infer<typeof updateBorrowedItemSchema>;
export type ReturnBorrowedItemInput = z.infer<typeof returnBorrowedItemSchema>;