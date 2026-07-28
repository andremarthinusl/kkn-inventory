"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function createLocation(name: string, address?: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false as const, error: "Unauthorized" };
    }

    const trimmedName = name.trim();
    if (!trimmedName) {
      return { success: false as const, error: "Nama lokasi tidak boleh kosong" };
    }

    const existing = await prisma.location.findUnique({
      where: { name: trimmedName },
    });

    if (existing && !existing.deletedAt) {
      return { success: false as const, error: "Lokasi dengan nama tersebut sudah ada" };
    }

    if (existing && existing.deletedAt) {
      // Re-activate soft-deleted location
      const updated = await prisma.location.update({
        where: { id: existing.id },
        data: {
          name: trimmedName,
          address: address || existing.address,
          deletedAt: null,
        },
      });

      await prisma.activityLog.create({
        data: {
          userId: session.user.id,
          activityType: "CREATE",
          description: `Mengaktifkan kembali lokasi "${trimmedName}"`,
          entityType: "Location",
          entityId: updated.id,
        },
      });

      return { success: true as const, data: updated };
    }

    const location = await prisma.location.create({
      data: {
        name: trimmedName,
        address: address || null,
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        activityType: "CREATE",
        description: `Membuat lokasi baru "${trimmedName}"`,
        entityType: "Location",
        entityId: location.id,
      },
    });

    return { success: true as const, data: location };
  } catch (error) {
    console.error("Error creating location:", error);
    return { success: false as const, error: "Gagal membuat lokasi" };
  }
}

export async function updateLocation(
  id: string,
  data: { name?: string; address?: string }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false as const, error: "Unauthorized" };
    }

    const existing = await prisma.location.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) {
      return { success: false as const, error: "Lokasi tidak ditemukan" };
    }

    const updateData: { name?: string; address?: string | null } = {};
    if (data.name !== undefined) {
      const trimmed = data.name.trim();
      if (!trimmed) {
        return { success: false as const, error: "Nama lokasi tidak boleh kosong" };
      }

      if (trimmed !== existing.name) {
        const duplicate = await prisma.location.findUnique({
          where: { name: trimmed },
        });
        if (duplicate && duplicate.id !== id && !duplicate.deletedAt) {
          return { success: false as const, error: "Lokasi dengan nama tersebut sudah ada" };
        }
      }

      updateData.name = trimmed;
    }

    if (data.address !== undefined) {
      updateData.address = data.address.trim() || null;
    }

    const location = await prisma.location.update({
      where: { id },
      data: updateData,
    });

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        activityType: "UPDATE",
        description: `Memperbarui lokasi "${location.name}"`,
        entityType: "Location",
        entityId: id,
      },
    });

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

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        activityType: "DELETE",
        description: `Menghapus lokasi "${existing.name}"`,
        entityType: "Location",
        entityId: id,
      },
    });

    return { success: true as const, data: null };
  } catch (error) {
    console.error("Error deleting location:", error);
    return { success: false as const, error: "Gagal menghapus lokasi" };
  }
}

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