"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/actions/helpers";
import {
  createBorrowedItemSchema,
  updateBorrowedItemSchema,
  returnBorrowedItemSchema,
} from "@/lib/validations/borrowed-items";

export async function getBorrowedItems() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false as const, error: "Unauthorized" };
    }

    const items = await prisma.borrowedItem.findMany({
      orderBy: { loanDate: "desc" },
      include: {
        details: {
          include: { item: true },
        },
      },
    });

    return { success: true as const, data: items };
  } catch (error) {
    console.error("Error fetching borrowed items:", error);
    return {
      success: false as const,
      error: "Gagal mengambil data barang dipinjam",
    };
  }
}

export async function getBorrowedItemById(id: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false as const, error: "Unauthorized" };
    }

    const item = await prisma.borrowedItem.findUnique({
      where: { id },
      include: {
        details: {
          include: { item: true },
        },
      },
    });

    if (!item) {
      return {
        success: false as const,
        error: "Barang dipinjam tidak ditemukan",
      };
    }

    return { success: true as const, data: item };
  } catch (error) {
    console.error("Error fetching borrowed item:", error);
    return {
      success: false as const,
      error: "Gagal mengambil data barang dipinjam",
    };
  }
}

function calculateBorrowedItemStatus(
  planReturnDate: Date | null,
  returnDate: Date | null,
  currentStatus: string
): string {
  if (returnDate) return "DIKEMBALIKAN";
  if (currentStatus === "DIKEMBALIKAN") return "DIKEMBALIKAN";
  if (planReturnDate && new Date(planReturnDate) < new Date()) return "TERLAMBAT";
  return "DIPINJAM";
}

export async function createBorrowedItem(input: {
  itemName: string;
  ownerName: string;
  ownerPhone?: string;
  institution?: string;
  loanDate: string;
  planReturnDate?: string;
  quantity: number;
  unit?: string;
  conditionIn?: string;
  notes?: string;
}) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false as const, error: "Unauthorized" };
    }

    const parsed = createBorrowedItemSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false as const,
        error: parsed.error.issues.map((e) => e.message).join(", "),
      };
    }

    const {
      itemName,
      ownerName,
      ownerPhone,
      institution,
      loanDate,
      planReturnDate,
      quantity,
      unit,
      conditionIn,
      notes,
    } = parsed.data;

    // Auto-calculate status
    const planReturn = planReturnDate ? new Date(planReturnDate) : null;
    const status = planReturn && planReturn < new Date() ? "TERLAMBAT" : "DIPINJAM";

    const borrowedItem = await prisma.borrowedItem.create({
      data: {
        itemName: itemName.trim(),
        ownerName: ownerName.trim(),
        ownerPhone: ownerPhone || null,
        institution: institution || null,
        loanDate: new Date(loanDate),
        planReturnDate: planReturn,
        quantity,
        unit: unit || "unit",
        conditionIn: conditionIn || null,
        notes: notes || null,
        status,
      },
    });

    await logActivity(
      session.user.id,
      "CREATE",
      `Mencatat barang dipinjam "${itemName}" dari "${ownerName}" (${quantity} ${unit})`,
      "BorrowedItem",
      borrowedItem.id
    );

    return { success: true as const, data: borrowedItem };
  } catch (error) {
    console.error("Error creating borrowed item:", error);
    return {
      success: false as const,
      error: "Gagal mencatat barang dipinjam",
    };
  }
}

export async function updateBorrowedItem(
  id: string,
  input: {
    itemName?: string;
    ownerName?: string;
    ownerPhone?: string;
    institution?: string;
    loanDate?: string;
    planReturnDate?: string;
    quantity?: number;
    unit?: string;
    conditionIn?: string;
    conditionOut?: string;
    status?: string;
    notes?: string;
  }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false as const, error: "Unauthorized" };
    }

    const parsed = updateBorrowedItemSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false as const,
        error: parsed.error.issues.map((e) => e.message).join(", "),
      };
    }

    const existing = await prisma.borrowedItem.findUnique({ where: { id } });
    if (!existing) {
      return {
        success: false as const,
        error: "Barang dipinjam tidak ditemukan",
      };
    }

    const updateData: Record<string, unknown> = {};

    if (parsed.data.itemName !== undefined) {
      updateData.itemName = parsed.data.itemName.trim();
    }
    if (parsed.data.ownerName !== undefined) {
      updateData.ownerName = parsed.data.ownerName.trim();
    }
    if (parsed.data.ownerPhone !== undefined) {
      updateData.ownerPhone = parsed.data.ownerPhone || null;
    }
    if (parsed.data.institution !== undefined) {
      updateData.institution = parsed.data.institution || null;
    }
    if (parsed.data.loanDate !== undefined) {
      updateData.loanDate = new Date(parsed.data.loanDate);
    }
    if (parsed.data.planReturnDate !== undefined) {
      updateData.planReturnDate = parsed.data.planReturnDate
        ? new Date(parsed.data.planReturnDate)
        : null;
    }
    if (parsed.data.quantity !== undefined) {
      updateData.quantity = parsed.data.quantity;
    }
    if (parsed.data.unit !== undefined) {
      updateData.unit = parsed.data.unit;
    }
    if (parsed.data.conditionIn !== undefined) {
      updateData.conditionIn = parsed.data.conditionIn || null;
    }
    if (parsed.data.conditionOut !== undefined) {
      updateData.conditionOut = parsed.data.conditionOut || null;
    }
    if (parsed.data.status !== undefined) {
      updateData.status = parsed.data.status;
    }
    if (parsed.data.notes !== undefined) {
      updateData.notes = parsed.data.notes || null;
    }

    // Recalculate status if no explicit status provided
    if (parsed.data.status === undefined) {
      updateData.status = calculateBorrowedItemStatus(
        parsed.data.planReturnDate !== undefined
          ? parsed.data.planReturnDate
            ? new Date(parsed.data.planReturnDate)
            : null
          : existing.planReturnDate,
        existing.returnDate,
        existing.status
      );
    }

    const borrowedItem = await prisma.borrowedItem.update({
      where: { id },
      data: updateData,
    });

    await logActivity(
      session.user.id,
      "UPDATE",
      `Memperbarui barang dipinjam "${borrowedItem.itemName}"`,
      "BorrowedItem",
      id
    );

    return { success: true as const, data: borrowedItem };
  } catch (error) {
    console.error("Error updating borrowed item:", error);
    return {
      success: false as const,
      error: "Gagal memperbarui barang dipinjam",
    };
  }
}

export async function deleteBorrowedItem(id: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false as const, error: "Unauthorized" };
    }

    const existing = await prisma.borrowedItem.findUnique({ where: { id } });
    if (!existing) {
      return {
        success: false as const,
        error: "Barang dipinjam tidak ditemukan",
      };
    }

    await prisma.borrowedItem.delete({ where: { id } });

    await logActivity(
      session.user.id,
      "DELETE",
      `Menghapus barang dipinjam "${existing.itemName}"`,
      "BorrowedItem",
      id
    );

    return { success: true as const, data: null };
  } catch (error) {
    console.error("Error deleting borrowed item:", error);
    return {
      success: false as const,
      error: "Gagal menghapus barang dipinjam",
    };
  }
}

export async function returnBorrowedItem(
  id: string,
  input: {
    returnDate: string;
    conditionOut?: string;
    notes?: string;
  }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false as const, error: "Unauthorized" };
    }

    const parsed = returnBorrowedItemSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false as const,
        error: parsed.error.issues.map((e) => e.message).join(", "),
      };
    }

    const existing = await prisma.borrowedItem.findUnique({ where: { id } });
    if (!existing) {
      return {
        success: false as const,
        error: "Barang dipinjam tidak ditemukan",
      };
    }

    if (existing.status === "DIKEMBALIKAN") {
      return {
        success: false as const,
        error: "Barang sudah dikembalikan sebelumnya",
      };
    }

    const { returnDate, conditionOut, notes } = parsed.data;

    const borrowedItem = await prisma.borrowedItem.update({
      where: { id },
      data: {
        status: "DIKEMBALIKAN",
        returnDate: new Date(returnDate),
        conditionOut: conditionOut || null,
        notes: notes !== undefined ? notes : existing.notes,
      },
    });

    await logActivity(
      session.user.id,
      "UPDATE",
      `Mengembalikan barang "${existing.itemName}" dari "${existing.ownerName}"`,
      "BorrowedItem",
      id
    );

    return { success: true as const, data: borrowedItem };
  } catch (error) {
    console.error("Error returning borrowed item:", error);
    return {
      success: false as const,
      error: "Gagal mengembalikan barang dipinjam",
    };
  }
}