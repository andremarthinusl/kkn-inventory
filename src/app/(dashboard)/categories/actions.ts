"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function createCategory(name: string, icon?: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false as const, error: "Unauthorized" };
    }

    const trimmedName = name.trim();
    if (!trimmedName) {
      return { success: false as const, error: "Nama kategori tidak boleh kosong" };
    }

    const existing = await prisma.category.findUnique({
      where: { name: trimmedName },
    });

    if (existing && !existing.deletedAt) {
      return { success: false as const, error: "Kategori dengan nama tersebut sudah ada" };
    }

    if (existing && existing.deletedAt) {
      // Re-activate soft-deleted category
      const updated = await prisma.category.update({
        where: { id: existing.id },
        data: {
          name: trimmedName,
          icon: icon || existing.icon,
          deletedAt: null,
        },
      });

      await prisma.activityLog.create({
        data: {
          userId: session.user.id,
          activityType: "CREATE",
          description: `Mengaktifkan kembali kategori "${trimmedName}"`,
          entityType: "Category",
          entityId: updated.id,
        },
      });

      return { success: true as const, data: updated };
    }

    const category = await prisma.category.create({
      data: {
        name: trimmedName,
        icon: icon || null,
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        activityType: "CREATE",
        description: `Membuat kategori baru "${trimmedName}"`,
        entityType: "Category",
        entityId: category.id,
      },
    });

    return { success: true as const, data: category };
  } catch (error) {
    console.error("Error creating category:", error);
    return { success: false as const, error: "Gagal membuat kategori" };
  }
}

export async function updateCategory(
  id: string,
  data: { name?: string; icon?: string }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false as const, error: "Unauthorized" };
    }

    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) {
      return { success: false as const, error: "Kategori tidak ditemukan" };
    }

    const updateData: { name?: string; icon?: string | null } = {};
    if (data.name !== undefined) {
      const trimmed = data.name.trim();
      if (!trimmed) {
        return { success: false as const, error: "Nama kategori tidak boleh kosong" };
      }

      if (trimmed !== existing.name) {
        const duplicate = await prisma.category.findUnique({
          where: { name: trimmed },
        });
        if (duplicate && duplicate.id !== id && !duplicate.deletedAt) {
          return { success: false as const, error: "Kategori dengan nama tersebut sudah ada" };
        }
      }

      updateData.name = trimmed;
    }

    if (data.icon !== undefined) {
      updateData.icon = data.icon || null;
    }

    const category = await prisma.category.update({
      where: { id },
      data: updateData,
    });

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        activityType: "UPDATE",
        description: `Memperbarui kategori "${category.name}"`,
        entityType: "Category",
        entityId: id,
      },
    });

    return { success: true as const, data: category };
  } catch (error) {
    console.error("Error updating category:", error);
    return { success: false as const, error: "Gagal memperbarui kategori" };
  }
}

export async function deleteCategory(id: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false as const, error: "Unauthorized" };
    }

    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) {
      return { success: false as const, error: "Kategori tidak ditemukan" };
    }

    await prisma.category.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        activityType: "DELETE",
        description: `Menghapus kategori "${existing.name}"`,
        entityType: "Category",
        entityId: id,
      },
    });

    return { success: true as const, data: null };
  } catch (error) {
    console.error("Error deleting category:", error);
    return { success: false as const, error: "Gagal menghapus kategori" };
  }
}

export async function getCategories() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false as const, error: "Unauthorized" };
    }

    const categories = await prisma.category.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
      include: { _count: { select: { items: true } } },
    });

    return { success: true as const, data: categories };
  } catch (error) {
    console.error("Error fetching categories:", error);
    return { success: false as const, error: "Gagal mengambil data kategori" };
  }
}