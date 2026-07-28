import { z } from "zod";

export const createItemSchema = z.object({
  name: z.string().min(1, "Nama barang harus diisi"),
  categoryId: z.string().min(1, "Kategori harus dipilih"),
  locationId: z.string().min(1, "Lokasi harus dipilih"),
  totalStock: z.number().int().min(0, "Stok tidak boleh negatif"),
  availableStock: z.number().int().min(0, "Stok tidak boleh negatif").optional(),
  unit: z.string().min(1, "Satuan harus diisi").default("unit"),
  condition: z.enum(["BAIK", "RUSAK_RINGAN", "RUSAK_BERAT", "HILANG"]).default("BAIK"),
  status: z.enum(["TERSEDIA", "DIGUNAKAN", "DIPINJAMKAN", "TIDAK_TERSEDIA"]).default("TERSEDIA"),
  description: z.string().optional(),
  image: z.string().optional(),
});

export const updateItemSchema = z.object({
  name: z.string().min(1, "Nama barang harus diisi").optional(),
  categoryId: z.string().min(1, "Kategori harus dipilih").optional(),
  locationId: z.string().min(1, "Lokasi harus dipilih").optional(),
  totalStock: z.number().int().min(0, "Stok tidak boleh negatif").optional(),
  availableStock: z.number().int().min(0, "Stok tidak boleh negatif").optional(),
  unit: z.string().min(1, "Satuan harus diisi").optional(),
  condition: z.enum(["BAIK", "RUSAK_RINGAN", "RUSAK_BERAT", "HILANG"]).optional(),
  status: z.enum(["TERSEDIA", "DIGUNAKAN", "DIPINJAMKAN", "TIDAK_TERSEDIA"]).optional(),
  description: z.string().optional(),
  image: z.string().optional(),
});

export type CreateItemInput = z.infer<typeof createItemSchema>;
export type UpdateItemInput = z.infer<typeof updateItemSchema>;