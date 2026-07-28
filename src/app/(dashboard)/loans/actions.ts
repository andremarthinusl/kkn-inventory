"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export interface CreateLoanItemInput {
  itemId: string;
  quantity: number;
}

export async function createLoan(data: {
  borrowerName: string;
  borrowerPhone?: string;
  institution?: string;
  loanDate: Date;
  planReturnDate?: Date | null;
  notes?: string;
  items: CreateLoanItemInput[];
}) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false as const, error: "Unauthorized" };
    }

    const trimmedName = data.borrowerName.trim();
    if (!trimmedName) {
      return { success: false as const, error: "Nama peminjam tidak boleh kosong" };
    }

    if (!data.items || data.items.length === 0) {
      return { success: false as const, error: "Minimal satu barang harus dipilih" };
    }

    // Validate items exist and have enough stock
    for (const item of data.items) {
      const dbItem = await prisma.item.findUnique({ where: { id: item.itemId } });
      if (!dbItem || dbItem.deletedAt) {
        return {
          success: false as const,
          error: `Barang dengan ID ${item.itemId} tidak ditemukan`,
        };
      }
      if (dbItem.availableStock < item.quantity) {
        return {
          success: false as const,
          error: `Stok "${dbItem.name}" tidak mencukupi (tersedia: ${dbItem.availableStock}, diminta: ${item.quantity})`,
        };
      }
    }

    // Create loan and loan items, update stock in a transaction
    const loan = await prisma.$transaction(async (tx) => {
      const newLoan = await tx.loan.create({
        data: {
          borrowerName: trimmedName,
          borrowerPhone: data.borrowerPhone?.trim() || null,
          institution: data.institution?.trim() || null,
          loanDate: new Date(data.loanDate),
          planReturnDate: data.planReturnDate ? new Date(data.planReturnDate) : null,
          notes: data.notes?.trim() || null,
          status: "DIPINJAM",
          loanItems: {
            create: data.items.map((item) => ({
              itemId: item.itemId,
              quantity: item.quantity,
            })),
          },
        },
        include: {
          loanItems: {
            include: { item: true },
          },
        },
      });

      // Reduce available stock for each item
      for (const item of data.items) {
        await tx.item.update({
          where: { id: item.itemId },
          data: {
            availableStock: { decrement: item.quantity },
            status: item.quantity > 0 ? "DIPINJAMKAN" : undefined,
          },
        });
      }

      return newLoan;
    });

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        activityType: "CREATE",
        description: `Membuat peminjaman oleh "${trimmedName}" dengan ${data.items.length} barang`,
        entityType: "Loan",
        entityId: loan.id,
      },
    });

    return { success: true as const, data: loan };
  } catch (error) {
    console.error("Error creating loan:", error);
    return { success: false as const, error: "Gagal membuat peminjaman" };
  }
}

export async function returnLoan(loanId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false as const, error: "Unauthorized" };
    }

    const loan = await prisma.loan.findUnique({
      where: { id: loanId },
      include: { loanItems: true },
    });

    if (!loan || loan.deletedAt) {
      return { success: false as const, error: "Peminjaman tidak ditemukan" };
    }

    if (loan.status === "DIKEMBALIKAN") {
      return { success: false as const, error: "Peminjaman sudah dikembalikan" };
    }

    // Update loan status and restore stock in a transaction
    const updatedLoan = await prisma.$transaction(async (tx) => {
      const updated = await tx.loan.update({
        where: { id: loanId },
        data: {
          status: "DIKEMBALIKAN",
          returnDate: new Date(),
        },
        include: {
          loanItems: {
            include: { item: true },
          },
        },
      });

      // Restore available stock for each item
      for (const loanItem of loan.loanItems) {
        await tx.item.update({
          where: { id: loanItem.itemId },
          data: {
            availableStock: { increment: loanItem.quantity },
          },
        });

        // Check if item can go back to TERSEDIA
        const activeLoansUsingItem = await tx.loanItem.count({
          where: {
            itemId: loanItem.itemId,
            loan: {
              deletedAt: null,
              status: "DIPINJAM",
            },
          },
        });

        if (activeLoansUsingItem === 0) {
          const activeEventItems = await tx.eventItem.count({
            where: {
              itemId: loanItem.itemId,
              status: { not: "SELESAI" },
            },
          });

          if (activeEventItems === 0) {
            await tx.item.update({
              where: { id: loanItem.itemId },
              data: { status: "TERSEDIA" },
            });
          }
        }
      }

      return updated;
    });

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        activityType: "UPDATE",
        description: `Mengembalikan peminjaman oleh "${loan.borrowerName}"`,
        entityType: "Loan",
        entityId: loanId,
      },
    });

    return { success: true as const, data: updatedLoan };
  } catch (error) {
    console.error("Error returning loan:", error);
    return { success: false as const, error: "Gagal mengembalikan peminjaman" };
  }
}

export async function deleteLoan(loanId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false as const, error: "Unauthorized" };
    }

    const loan = await prisma.loan.findUnique({
      where: { id: loanId },
    });

    if (!loan || loan.deletedAt) {
      return { success: false as const, error: "Peminjaman tidak ditemukan" };
    }

    await prisma.loan.update({
      where: { id: loanId },
      data: { deletedAt: new Date() },
    });

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        activityType: "DELETE",
        description: `Menghapus peminjaman oleh "${loan.borrowerName}"`,
        entityType: "Loan",
        entityId: loanId,
      },
    });

    return { success: true as const, data: null };
  } catch (error) {
    console.error("Error deleting loan:", error);
    return { success: false as const, error: "Gagal menghapus peminjaman" };
  }
}

export async function getLoans() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false as const, error: "Unauthorized" };
    }

    const loans = await prisma.loan.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      include: {
        loanItems: {
          include: { item: true },
        },
      },
    });

    return { success: true as const, data: loans };
  } catch (error) {
    console.error("Error fetching loans:", error);
    return { success: false as const, error: "Gagal mengambil data peminjaman" };
  }
}

export async function getAvailableItems() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false as const, error: "Unauthorized" };
    }

    const items = await prisma.item.findMany({
      where: {
        deletedAt: null,
        availableStock: { gt: 0 },
      },
      orderBy: { name: "asc" },
    });

    return { success: true as const, data: items };
  } catch (error) {
    console.error("Error fetching items:", error);
    return { success: false as const, error: "Gagal mengambil data barang" };
  }
}