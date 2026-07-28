"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/actions/helpers";
import {
  createLocationSchema,
  updateLocationSchema,
} from "@/lib/validations/locations";

export async function getLocations() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false as const, error: "Unauthorized" };
    }

    const locations = await prisma.location.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
      include: { _count: { select: { items: true } } },
    });

    return { success: true as const, data: locations };
  } catch (error) {
    console.error("Error fetching locations:", error);
    return { success: false as const, error: "Gagal mengambil data lokasi" };
  }
}

export async function getLocationById(id: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false as const, error: "Unauthorized" };
    }

    const location = await prisma.location.findUnique({
      where: { id },
      include: { _count: { select: { items: true } } },
    });

    if (!location || location.deletedAt) {
      return { success: false as const, error: "Lokasi tidak ditemukan" };
    }

    return { success: true as const, data: location };
  } catch (error) {
    console.error("Error fetching location:", error);
    return { success: false as const, error: "Gagal mengambil data lokasi" };
  }
}

export async function createLocation(input: {
  name: string;
  address?: string;
}) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false as const, error: "Unauthorized" };
    }

    const parsed = createLocationSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false as const,
        error: parsed.error.issues.map((e) => e.message).join(", "),
      };
    }

    const { name, address } = parsed.data;
    const trimmedName = name.trim();

    const existing = await prisma.location.findUnique({
      where: { name: trimmedName },
    });

    if (existing && !existing.deletedAt) {
      return {
        success: false as const,
        error: "Lokasi dengan nama tersebut sudah ada",
      };
    }

    if (existing && existing.deletedAt) {
      const updated = await prisma.location.update({
        where: { id: existing.id },
        data: {
          name: trimmedName,
          address: address || existing.address,
          deletedAt: null,
        },
      });

      await logActivity(
        session.user.id,
        "CREATE",
        `Mengaktifkan kembali lokasi "${trimmedName}"`,
        "Location",
        updated.id
      );

      return { success: true as const, data: updated };
    }

    const location = await prisma.location.create({
      data: {
        name: trimmedName,
        address: address || null,
      },
    });

    await logActivity(
      session.user.id,
      "CREATE",
      `Membuat lokasi baru "${trimmedName}"`,
      "Location",
      location.id
    );

    return { success: true as const, data: location };
  } catch (error) {
    console.error("Error creating location:", error);
    return { success: false as const, error: "Gagal membuat lokasi" };
  }
}

export async function updateLocation(
  id: string,
  input: { name?: string; address?: string }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false as const, error: "Unauthorized" };
    }

    const parsed = updateLocationSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false as const,
        error: parsed.error.issues.map((e) => e.message).join(", "),
      };
    }

    const existing = await prisma.location.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) {
      return { success: false as const, error: "Lokasi tidak ditemukan" };
    }

    const updateData: { name?: string; address?: string | null } = {};
    if (parsed.data.name !== undefined) {
      const trimmed = parsed.data.name.trim();
      if (!trimmed) {
        return {
          success: false as const,
          error: "Nama lokasi tidak boleh kosong",
        };
      }

      if (trimmed !== existing.name) {
        const duplicate = await prisma.location.findUnique({
          where: { name: trimmed },
        });
        if (duplicate && duplicate.id !== id && !duplicate.deletedAt) {
          return {
            success: false as const,
            error: "Lokasi dengan nama tersebut sudah ada",
          };
        }
      }

      updateData.name = trimmed;
    }

    if (parsed.data.address !== undefined) {
      updateData.address = parsed.data.address.trim() || null;
    }

    const location = await prisma.location.update({
      where: { id },
      data: updateData,
    });

    await logActivity(
      session.user.id,
      "UPDATE",
      `Memperbarui lokasi "${location.name}"`,
      "Location",
      id
    );

    return { success: true as const, data: location };
  } catch (error) {
    console.error("Error updating location:", error);
    return { success: false as const, error: "Gagal memperbarui lokasi" };
  }
}

export async function deleteLocation(id: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false as const, error: "Unauthorized" };
    }

    const existing = await prisma.location.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) {
      return { success: false as const, error: "Lokasi tidak ditemukan" };
    }

    await prisma.location.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await logActivity(
      session.user.id,
      "DELETE",
      `Menghapus lokasi "${existing.name}"`,
      "Location",
      id
    );

    return { success: true as const, data: null };
  } catch (error) {
    console.error("Error deleting location:", error);
    return { success: false as const, error: "Gagal menghapus lokasi" };
  }
}