"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function createBorrowedItem(data: {
  itemName: string;
  ownerName: string;
  ownerPhone?: string;
  institution?: string;
  loanDate: Date;
  planReturnDate?: Date | null;
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

    const trimmedItemName = data.itemName.trim();
    if (!trimmedItemName) {
      return { success: false as const, error: "Nama barang tidak boleh kosong" };
    }

    const trimmedOwnerName = data.ownerName.trim();
    if (!trimmedOwnerName) {
      return { success: false as const, error: "Nama pemilik tidak boleh kosong" };
    }

    if (data.quantity <= 0) {
      return { success: false as const, error: "Jumlah barang harus lebih dari 0" };
    }

    const item = await prisma.borrowedItem.create({
      data: {
        itemName: trimmedItemName,
        ownerName: trimmedOwnerName,
        ownerPhone: data.ownerPhone?.trim() || null,
        institution: data.institution?.trim() || null,
        loanDate: new Date(data.loanDate),
        planReturnDate: data.planReturnDate ? new Date(data.planReturnDate) : null,
        quantity: data.quantity,
        unit: data.unit || "unit",
        conditionIn: data.conditionIn || null,
        notes: data.notes?.trim() || null,
        status: "DIPINJAM",
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        activityType: "CREATE",
        description: `Meminjam "${trimmedItemName}" dari ${trimmedOwnerName}`,
        entityType: "BorrowedItem",
        entityId: item.id,
      },
    });

    return { success: true as const, data: item };
  } catch (error) {
    console.error("Error creating borrowed item:", error);
    return { success: false as const, error: "Gagal mencatat barang dipinjam" };
  }
}

export async function returnBorrowedItem(id: string, conditionOut?: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false as const, error: "Unauthorized" };
    }

    const existing = await prisma.borrowedItem.findUnique({
      where: { id },
    });

    if (!existing) {
      return { success: false as const, error: "Data tidak ditemukan" };
    }

    if (existing.status === "DIKEMBALIKAN") {
      return { success: false as const, error: "Barang sudah dikembalikan" };
    }

    const item = await prisma.borrowedItem.update({
      where: { id },
      data: {
        status: "DIKEMBALIKAN",
        returnDate: new Date(),
        conditionOut: conditionOut || null,
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        activityType: "UPDATE",
        description: `Mengembalikan "${item.itemName}" ke ${item.ownerName}`,
        entityType: "BorrowedItem",
        entityId: id,
      },
    });

    return { success: true as const, data: item };
  } catch (error) {
    console.error("Error returning borrowed item:", error);
    return { success: false as const, error: "Gagal mengembalikan barang" };
  }
}

export async function deleteBorrowedItem(id: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false as const, error: "Unauthorized" };
    }

    const existing = await prisma.borrowedItem.findUnique({
      where: { id },
    });

    if (!existing) {
      return { success: false as const, error: "Data tidak ditemukan" };
    }

    // Soft delete: set status to DIKEMBALIKAN with a note
    await prisma.borrowedItem.update({
      where: { id },
      data: {
        status: "DIKEMBALIKAN",
        returnDate: new Date(),
        notes: existing.notes
          ? `${existing.notes} | Dihapus: ${new Date().toISOString()}`
          : `Dihapus: ${new Date().toISOString()}`,
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        activityType: "DELETE",
        description: `Menghapus data pinjaman "${existing.itemName}" dari ${existing.ownerName}`,
        entityType: "BorrowedItem",
        entityId: id,
      },
    });

    return { success: true as const, data: null };
  } catch (error) {
    console.error("Error deleting borrowed item:", error);
    return { success: false as const, error: "Gagal menghapus data" };
  }
}

export async function getBorrowedItems() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false as const, error: "Unauthorized" };
    }

    const items = await prisma.borrowedItem.findMany({
      orderBy: { createdAt: "desc" },
    });

    return { success: true as const, data: items };
  } catch (error) {
    console.error("Error fetching borrowed items:", error);
    return { success: false as const, error: "Gagal mengambil data barang dipinjam" };
  }
}