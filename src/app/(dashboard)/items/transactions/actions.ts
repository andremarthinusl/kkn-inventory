"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function createItemTransaction(data: {
  itemId: string;
  type: "MASUK" | "KELUAR";
  quantity: number;
  source?: string;
  reason?: string;
  price?: number;
  notes?: string;
}) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false as const, error: "Unauthorized" };
    }

    if (data.quantity <= 0) {
      return { success: false as const, error: "Jumlah harus lebih dari 0" };
    }

    const item = await prisma.item.findUnique({ where: { id: data.itemId } });
    if (!item || item.deletedAt) {
      return { success: false as const, error: "Barang tidak ditemukan" };
    }

    if (data.type === "KELUAR") {
      if (item.availableStock < data.quantity) {
        return {
          success: false as const,
          error: `Stok "${item.name}" tidak mencukupi (tersedia: ${item.availableStock}, diminta: ${data.quantity})`,
        };
      }

      if (!data.reason?.trim()) {
        return { success: false as const, error: "Alasan pengeluaran harus diisi" };
      }
    }

    if (data.type === "MASUK" && !data.source?.trim()) {
      return { success: false as const, error: "Sumber barang harus diisi" };
    }

    const userId = session.user.id;
    // Create transaction and update stock in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const transaction = await tx.itemTransaction.create({
        data: {
          itemId: data.itemId,
          type: data.type,
          quantity: data.quantity,
          unit: item.unit,
          source: data.type === "MASUK" ? (data.source?.trim() || null) : null,
          reason: data.type === "KELUAR" ? (data.reason?.trim() || null) : null,
          price: data.price || null,
          notes: data.notes?.trim() || null,
          userId,
        },
        include: {
          item: true,
          user: { select: { name: true } },
        },
      });

      if (data.type === "MASUK") {
        await tx.item.update({
          where: { id: data.itemId },
          data: {
            totalStock: { increment: data.quantity },
            availableStock: { increment: data.quantity },
            status: "TERSEDIA",
          },
        });
      } else {
        await tx.item.update({
          where: { id: data.itemId },
          data: {
            totalStock: { decrement: data.quantity },
            availableStock: { decrement: data.quantity },
          },
        });
      }

      return transaction;
    });

    await prisma.activityLog.create({
      data: {
        userId,
        activityType: "CREATE",
        description:
          data.type === "MASUK"
            ? `Barang masuk: ${item.name} (${data.quantity} ${item.unit}) dari ${data.source}`
            : `Barang keluar: ${item.name} (${data.quantity} ${item.unit}) - ${data.reason}`,
        entityType: "ItemTransaction",
        entityId: result.id,
      },
    });

    return { success: true as const, data: result };
  } catch (error) {
    console.error("Error creating transaction:", error);
    return { success: false as const, error: "Gagal mencatat transaksi" };
  }
}

export async function getItemTransactions() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false as const, error: "Unauthorized" };
    }

    const transactions = await prisma.itemTransaction.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        item: true,
        user: { select: { name: true } },
      },
    });

    return { success: true as const, data: transactions };
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return { success: false as const, error: "Gagal mengambil data transaksi" };
  }
}

export async function getItemsForTransaction() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false as const, error: "Unauthorized" };
    }

    const items = await prisma.item.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
    });

    return { success: true as const, data: items };
  } catch (error) {
    console.error("Error fetching items:", error);
    return { success: false as const, error: "Gagal mengambil data barang" };
  }
}