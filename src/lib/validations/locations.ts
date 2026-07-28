import { z } from "zod";

export const createLocationSchema = z.object({
  name: z.string().min(1, "Nama lokasi harus diisi"),
  address: z.string().optional(),
});

export const updateLocationSchema = z.object({
  name: z.string().min(1, "Nama lokasi harus diisi").optional(),
  address: z.string().optional(),
});

export type CreateLocationInput = z.infer<typeof createLocationSchema>;
export type UpdateLocationInput = z.infer<typeof updateLocationSchema>;