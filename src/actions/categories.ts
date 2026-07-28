"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/actions/helpers";
import {
  createCategorySchema,
  updateCategorySchema,
} from "@/lib/validations/categories";

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

export async function getCategoryById(id: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false as const, error: "Unauthorized" };
    }

    const category = await prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { items: true } } },
    });

    if (!category || category.deletedAt) {
      return { success: false as const, error: "Kategori tidak ditemukan" };
    }

    return { success: true as const, data: category };
  } catch (error) {
    console.error("Error fetching category:", error);
    return { success: false as const, error: "Gagal mengambil data kategori" };
  }
}

export async function createCategory(input: { name: string; icon?: string }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false as const, error: "Unauthorized" };
    }

    const parsed = createCategorySchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false as const,
        error: parsed.error.issues.map((e) => e.message).join(", "),
      };
    }

    const { name, icon } = parsed.data;
    const trimmedName = name.trim();

    const existing = await prisma.category.findUnique({
      where: { name: trimmedName },
    });

    if (existing && !existing.deletedAt) {
      return {
        success: false as const,
        error: "Kategori dengan nama tersebut sudah ada",
      };
    }

    if (existing && existing.deletedAt) {
      const updated = await prisma.category.update({
        where: { id: existing.id },
        data: {
          name: trimmedName,
          icon: icon || existing.icon,
          deletedAt: null,
        },
      });

      await logActivity(
        session.user.id,
        "CREATE",
        `Mengaktifkan kembali kategori "${trimmedName}"`,
        "Category",
        updated.id
      );

      return { success: true as const, data: updated };
    }

    const category = await prisma.category.create({
      data: {
        name: trimmedName,
        icon: icon || null,
      },
    });

    await logActivity(
      session.user.id,
      "CREATE",
      `Membuat kategori baru "${trimmedName}"`,
      "Category",
      category.id
    );

    return { success: true as const, data: category };
  } catch (error) {
    console.error("Error creating category:", error);
    return { success: false as const, error: "Gagal membuat kategori" };
  }
}

export async function updateCategory(
  id: string,
  input: { name?: string; icon?: string }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false as const, error: "Unauthorized" };
    }

    const parsed = updateCategorySchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false as const,
        error: parsed.error.issues.map((e) => e.message).join(", "),
      };
    }

    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) {
      return { success: false as const, error: "Kategori tidak ditemukan" };
    }

    const updateData: { name?: string; icon?: string | null } = {};
    if (parsed.data.name !== undefined) {
      const trimmed = parsed.data.name.trim();
      if (!trimmed) {
        return {
          success: false as const,
          error: "Nama kategori tidak boleh kosong",
        };
      }

      if (trimmed !== existing.name) {
        const duplicate = await prisma.category.findUnique({
          where: { name: trimmed },
        });
        if (duplicate && duplicate.id !== id && !duplicate.deletedAt) {
          return {
            success: false as const,
            error: "Kategori dengan nama tersebut sudah ada",
          };
        }
      }

      updateData.name = trimmed;
    }

    if (parsed.data.icon !== undefined) {
      updateData.icon = parsed.data.icon || null;
    }

    const category = await prisma.category.update({
      where: { id },
      data: updateData,
    });

    await logActivity(
      session.user.id,
      "UPDATE",
      `Memperbarui kategori "${category.name}"`,
      "Category",
      id
    );

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

    await logActivity(
      session.user.id,
      "DELETE",
      `Menghapus kategori "${existing.name}"`,
      "Category",
      id
    );

    return { success: true as const, data: null };
  } catch (error) {
    console.error("Error deleting category:", error);
    return { success: false as const, error: "Gagal menghapus kategori" };
  }
}