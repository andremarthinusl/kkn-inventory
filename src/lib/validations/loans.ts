import { z } from "zod";

const loanItemSchema = z.object({
  itemId: z.string().min(1, "Barang harus dipilih"),
  quantity: z.number().int().min(1, "Jumlah minimal 1"),
});

export const createLoanSchema = z.object({
  borrowerName: z.string().min(1, "Nama peminjam harus diisi"),
  borrowerPhone: z.string().optional(),
  institution: z.string().optional(),
  loanDate: z.string().min(1, "Tanggal pinjam harus diisi"),
  planReturnDate: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(loanItemSchema).min(1, "Minimal 1 barang"),
});

export const updateLoanSchema = z.object({
  borrowerName: z.string().min(1, "Nama peminjam harus diisi").optional(),
  borrowerPhone: z.string().optional(),
  institution: z.string().optional(),
  loanDate: z.string().optional(),
  planReturnDate: z.string().optional(),
  returnDate: z.string().optional(),
  status: z.enum(["DIPINJAM", "DIKEMBALIKAN", "TERLAMBAT"]).optional(),
  notes: z.string().optional(),
});

export type CreateLoanInput = z.infer<typeof createLoanSchema>;
export type UpdateLoanInput = z.infer<typeof updateLoanSchema>;