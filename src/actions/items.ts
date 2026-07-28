"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/actions/helpers";
import { createItemSchema, updateItemSchema } from "@/lib/validations/items";

export async function getItems() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false as const, error: "Unauthorized" };
    }

    const items = await prisma.item.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
      include: {
        category: true,
        location: true,
      },
    });

    return { success: true as const, data: items };
  } catch (error) {
    console.error("Error fetching items:", error);
    return { success: false as const, error: "Gagal mengambil data barang" };
  }
}

export async function getItemById(id: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false as const, error: "Unauthorized" };
    }

    const item = await prisma.item.findUnique({
      where: { id },
      include: {
        category: true,
        location: true,
      },
    });

    if (!item || item.deletedAt) {
      return { success: false as const, error: "Barang tidak ditemukan" };
    }

    return { success: true as const, data: item };
  } catch (error) {
    console.error("Error fetching item:", error);
    return { success: false as const, error: "Gagal mengambil data barang" };
  }
}

export async function createItem(input: {
  name: string;
  categoryId: string;
  locationId: string;
  totalStock: number;
  availableStock?: number;
  unit?: string;
  condition?: string;
  status?: string;
  description?: string;
  image?: string;
}) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false as const, error: "Unauthorized" };
    }

    const parsed = createItemSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false as const,
        error: parsed.error.issues.map((e) => e.message).join(", "),
      };
    }

    const {
      name,
      categoryId,
      locationId,
      totalStock,
      unit,
      condition,
      status,
      description,
      image,
    } = parsed.data;

    // Verify category exists and not deleted
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
    });
    if (!category || category.deletedAt) {
      return {
        success: false as const,
        error: "Kategori tidak ditemukan",
      };
    }

    // Verify location exists and not deleted
    const location = await prisma.location.findUnique({
      where: { id: locationId },
    });
    if (!location || location.deletedAt) {
      return {
        success: false as const,
        error: "Lokasi tidak ditemukan",
      };
    }

    // On create: set totalStock = availableStock = quantity from input
    const item = await prisma.item.create({
      data: {
        name: name.trim(),
        categoryId,
        locationId,
        totalStock,
        availableStock: totalStock,
        unit: unit || "unit",
        condition: condition || "BAIK",
        status: status || "TERSEDIA",
        description: description || null,
        image: image || null,
      },
      include: {
        category: true,
        location: true,
      },
    });

    await logActivity(
      session.user.id,
      "CREATE",
      `Menambahkan barang baru "${item.name}" (${totalStock} ${unit})`,
      "Item",
      item.id
    );

    return { success: true as const, data: item };
  } catch (error) {
    console.error("Error creating item:", error);
    return { success: false as const, error: "Gagal membuat barang" };
  }
}

export async function updateItem(
  id: string,
  input: {
    name?: string;
    categoryId?: string;
    locationId?: string;
    totalStock?: number;
    availableStock?: number;
    unit?: string;
    condition?: string;
    status?: string;
    description?: string;
    image?: string;
  }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false as const, error: "Unauthorized" };
    }

    const parsed = updateItemSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false as const,
        error: parsed.error.issues.map((e) => e.message).join(", "),
      };
    }

    const existing = await prisma.item.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) {
      return { success: false as const, error: "Barang tidak ditemukan" };
    }

    const updateData: Record<string, unknown> = {};

    if (parsed.data.name !== undefined) {
      updateData.name = parsed.data.name.trim();
    }

    if (parsed.data.categoryId !== undefined) {
      const category = await prisma.category.findUnique({
        where: { id: parsed.data.categoryId },
      });
      if (!category || category.deletedAt) {
        return {
          success: false as const,
          error: "Kategori tidak ditemukan",
        };
      }
      updateData.categoryId = parsed.data.categoryId;
    }

    if (parsed.data.locationId !== undefined) {
      const location = await prisma.location.findUnique({
        where: { id: parsed.data.locationId },
      });
      if (!location || location.deletedAt) {
        return {
          success: false as const,
          error: "Lokasi tidak ditemukan",
        };
      }
      updateData.locationId = parsed.data.locationId;
    }

    if (parsed.data.totalStock !== undefined) {
      updateData.totalStock = parsed.data.totalStock;
    }

    if (parsed.data.availableStock !== undefined) {
      updateData.availableStock = parsed.data.availableStock;
    }

    if (parsed.data.unit !== undefined) {
      updateData.unit = parsed.data.unit;
    }

    if (parsed.data.condition !== undefined) {
      updateData.condition = parsed.data.condition;
    }

    if (parsed.data.status !== undefined) {
      updateData.status = parsed.data.status;
    }

    if (parsed.data.description !== undefined) {
      updateData.description = parsed.data.description || null;
    }

    if (parsed.data.image !== undefined) {
      updateData.image = parsed.data.image || null;
    }

    const item = await prisma.item.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
        location: true,
      },
    });

    await logActivity(
      session.user.id,
      "UPDATE",
      `Memperbarui barang "${item.name}"`,
      "Item",
      id
    );

    return { success: true as const, data: item };
  } catch (error) {
    console.error("Error updating item:", error);
    return { success: false as const, error: "Gagal memperbarui barang" };
  }
}

export async function deleteItem(id: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false as const, error: "Unauthorized" };
    }

    const existing = await prisma.item.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) {
      return { success: false as const, error: "Barang tidak ditemukan" };
    }

    // Check if item is referenced in active events
    const activeEventItems = await prisma.eventItem.findFirst({
      where: {
        itemId: id,
        event: {
          deletedAt: null,
          status: { in: ["DIRENCANAKAN", "BERLANGSUNG"] },
        },
      },
    });

    if (activeEventItems) {
      return {
        success: false as const,
        error: "Barang tidak dapat dihapus karena masih digunakan dalam acara yang sedang berlangsung",
      };
    }

    // Check if item is referenced in active loans
    const activeLoanItems = await prisma.loanItem.findFirst({
      where: {
        itemId: id,
        loan: {
          deletedAt: null,
          status: { in: ["DIPINJAM", "TERLAMBAT"] },
        },
      },
    });

    if (activeLoanItems) {
      return {
        success: false as const,
        error: "Barang tidak dapat dihapus karena masih dipinjam",
      };
    }

    await prisma.item.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await logActivity(
      session.user.id,
      "DELETE",
      `Menghapus barang "${existing.name}"`,
      "Item",
      id
    );

    return { success: true as const, data: null };
  } catch (error) {
    console.error("Error deleting item:", error);
    return { success: false as const, error: "Gagal menghapus barang" };
  }
}