"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/actions/helpers";
import { createTransactionSchema } from "@/lib/validations/transactions";

export async function getTransactions() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false as const, error: "Unauthorized" };
    }

    const transactions = await prisma.itemTransaction.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        item: {
          include: { category: true, location: true },
        },
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return { success: true as const, data: transactions };
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return {
      success: false as const,
      error: "Gagal mengambil data transaksi",
    };
  }
}

export async function getTransactionById(id: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false as const, error: "Unauthorized" };
    }

    const transaction = await prisma.itemTransaction.findUnique({
      where: { id },
      include: {
        item: {
          include: { category: true, location: true },
        },
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!transaction) {
      return { success: false as const, error: "Transaksi tidak ditemukan" };
    }

    return { success: true as const, data: transaction };
  } catch (error) {
    console.error("Error fetching transaction:", error);
    return {
      success: false as const,
      error: "Gagal mengambil data transaksi",
    };
  }
}

export async function createTransaction(input: {
  itemId: string;
  type: "MASUK" | "KELUAR";
  quantity: number;
  unit?: string;
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

    const parsed = createTransactionSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false as const,
        error: parsed.error.issues.map((e) => e.message).join(", "),
      };
    }

    const { itemId, type, quantity, unit, source, reason, price, notes } =
      parsed.data;
    const userId = session.user.id;

    // Verify item exists
    const item = await prisma.item.findUnique({ where: { id: itemId } });
    if (!item || item.deletedAt) {
      return { success: false as const, error: "Barang tidak ditemukan" };
    }

    // Use transaction for stock changes
    const result = await prisma.$transaction(async (tx) => {
      if (type === "MASUK") {
        // Barang Masuk: increase totalStock and availableStock
        await tx.item.update({
          where: { id: itemId },
          data: {
            totalStock: { increment: quantity },
            availableStock: { increment: quantity },
          },
        });
      } else {
        // Barang Keluar: decrease totalStock and availableStock
        if (item.availableStock < quantity) {
          throw new Error(
            `Stok "${item.name}" tidak mencukupi. Tersedia: ${item.availableStock}, Diminta: ${quantity}`
          );
        }

        await tx.item.update({
          where: { id: itemId },
          data: {
            totalStock: { decrement: quantity },
            availableStock: { decrement: quantity },
          },
        });
      }

      // Create the transaction record
      const transaction = await tx.itemTransaction.create({
        data: {
          itemId,
          type,
          quantity,
          unit: unit || item.unit,
          source: type === "MASUK" ? (source || null) : null,
          reason: type === "KELUAR" ? (reason || null) : null,
          price: price || null,
          notes: notes || null,
          userId,
        },
        include: {
          item: {
            include: { category: true, location: true },
          },
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      return transaction;
    });

    const actionLabel = type === "MASUK" ? "Barang Masuk" : "Barang Keluar";
    await logActivity(
      userId,
      "CREATE",
      `${actionLabel}: ${result.item.name} (${quantity} ${unit || result.item.unit})`,
      "ItemTransaction",
      result.id
    );

    return { success: true as const, data: result };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Gagal membuat transaksi";
    console.error("Error creating transaction:", error);
    return { success: false as const, error: message };
  }
}

export async function deleteTransaction(id: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false as const, error: "Unauthorized" };
    }

    const existing = await prisma.itemTransaction.findUnique({
      where: { id },
      include: { item: true },
    });

    if (!existing) {
      return { success: false as const, error: "Transaksi tidak ditemukan" };
    }

    // Reverse the stock change when deleting a transaction
    await prisma.$transaction(async (tx) => {
      if (existing.type === "MASUK") {
        // Reverse: decrease stock
        if (existing.item.totalStock < existing.quantity) {
          throw new Error(
            `Tidak dapat menghapus transaksi. Stok "${existing.item.name}" tidak mencukupi untuk pengembalian.`
          );
        }

        await tx.item.update({
          where: { id: existing.itemId },
          data: {
            totalStock: { decrement: existing.quantity },
            availableStock: { decrement: existing.quantity },
          },
        });
      } else {
        // Reverse: increase stock back
        await tx.item.update({
          where: { id: existing.itemId },
          data: {
            totalStock: { increment: existing.quantity },
            availableStock: { increment: existing.quantity },
          },
        });
      }

      await tx.itemTransaction.delete({ where: { id } });
    });

    await logActivity(
      session.user.id,
      "DELETE",
      `Menghapus transaksi ${existing.type === "MASUK" ? "masuk" : "keluar"}: ${existing.item.name}`,
      "ItemTransaction",
      id
    );

    return { success: true as const, data: null };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Gagal menghapus transaksi";
    console.error("Error deleting transaction:", error);
    return { success: false as const, error: message };
  }
}