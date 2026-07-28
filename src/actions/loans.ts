"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/actions/helpers";
import { createLoanSchema, updateLoanSchema } from "@/lib/validations/loans";

export async function getLoans() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false as const, error: "Unauthorized" };
    }

    const loans = await prisma.loan.findMany({
      where: { deletedAt: null },
      orderBy: { loanDate: "desc" },
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

export async function getLoanById(id: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false as const, error: "Unauthorized" };
    }

    const loan = await prisma.loan.findUnique({
      where: { id },
      include: {
        loanItems: {
          include: { item: true },
        },
      },
    });

    if (!loan || loan.deletedAt) {
      return { success: false as const, error: "Peminjaman tidak ditemukan" };
    }

    return { success: true as const, data: loan };
  } catch (error) {
    console.error("Error fetching loan:", error);
    return { success: false as const, error: "Gagal mengambil data peminjaman" };
  }
}

function calculateLoanStatus(
  planReturnDate: Date | null,
  returnDate: Date | null,
  currentStatus: string
): string {
  if (returnDate) return "DIKEMBALIKAN";
  if (currentStatus === "DIKEMBALIKAN") return "DIKEMBALIKAN";
  if (planReturnDate && new Date(planReturnDate) < new Date()) return "TERLAMBAT";
  return "DIPINJAM";
}

export async function createLoan(input: {
  borrowerName: string;
  borrowerPhone?: string;
  institution?: string;
  loanDate: string;
  planReturnDate?: string;
  notes?: string;
  items: Array<{ itemId: string; quantity: number }>;
}) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false as const, error: "Unauthorized" };
    }

    const parsed = createLoanSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false as const,
        error: parsed.error.issues.map((e) => e.message).join(", "),
      };
    }

    const {
      borrowerName,
      borrowerPhone,
      institution,
      loanDate,
      planReturnDate,
      notes,
      items,
    } = parsed.data;

    // Validate stock availability for each item
    for (const item of items) {
      const dbItem = await prisma.item.findUnique({
        where: { id: item.itemId },
      });

      if (!dbItem || dbItem.deletedAt) {
        return {
          success: false as const,
          error: `Barang dengan ID ${item.itemId} tidak ditemukan`,
        };
      }

      if (dbItem.availableStock < item.quantity) {
        return {
          success: false as const,
          error: `Stok "${dbItem.name}" tidak mencukupi. Tersedia: ${dbItem.availableStock}, Diminta: ${item.quantity}`,
        };
      }
    }

    // Auto-calculate status based on planReturnDate
    const planReturn = planReturnDate ? new Date(planReturnDate) : null;
    const status = planReturn && planReturn < new Date() ? "TERLAMBAT" : "DIPINJAM";

    // Use transaction for stock changes
    const loan = await prisma.$transaction(async (tx) => {
      // Create loan with items
      const newLoan = await tx.loan.create({
        data: {
          borrowerName: borrowerName.trim(),
          borrowerPhone: borrowerPhone || null,
          institution: institution || null,
          loanDate: new Date(loanDate),
          planReturnDate: planReturn,
          status,
          notes: notes || null,
          loanItems: {
            create: items.map((item) => ({
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

      // Decrease availableStock for each item
      for (const item of items) {
        await tx.item.update({
          where: { id: item.itemId },
          data: {
            availableStock: { decrement: item.quantity },
          },
        });
      }

      return newLoan;
    });

    await logActivity(
      session.user.id,
      "CREATE",
      `Membuat peminjaman oleh "${borrowerName}" dengan ${items.length} jenis barang`,
      "Loan",
      loan.id
    );

    return { success: true as const, data: loan };
  } catch (error) {
    console.error("Error creating loan:", error);
    return {
      success: false as const,
      error: "Gagal membuat peminjaman",
    };
  }
}

export async function updateLoan(
  id: string,
  input: {
    borrowerName?: string;
    borrowerPhone?: string;
    institution?: string;
    loanDate?: string;
    planReturnDate?: string;
    returnDate?: string;
    status?: string;
    notes?: string;
  }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false as const, error: "Unauthorized" };
    }

    const parsed = updateLoanSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false as const,
        error: parsed.error.issues.map((e) => e.message).join(", "),
      };
    }

    const existing = await prisma.loan.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) {
      return { success: false as const, error: "Peminjaman tidak ditemukan" };
    }

    const updateData: Record<string, unknown> = {};

    if (parsed.data.borrowerName !== undefined) {
      updateData.borrowerName = parsed.data.borrowerName.trim();
    }
    if (parsed.data.borrowerPhone !== undefined) {
      updateData.borrowerPhone = parsed.data.borrowerPhone || null;
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
    if (parsed.data.returnDate !== undefined) {
      updateData.returnDate = parsed.data.returnDate
        ? new Date(parsed.data.returnDate)
        : null;
    }
    if (parsed.data.status !== undefined) {
      updateData.status = parsed.data.status;
    }
    if (parsed.data.notes !== undefined) {
      updateData.notes = parsed.data.notes || null;
    }

    // Recalculate status if not explicitly provided and no return date change
    if (
      parsed.data.status === undefined &&
      parsed.data.returnDate === undefined &&
      parsed.data.planReturnDate === undefined
    ) {
      // Keep existing status, but auto-calculate based on planReturnDate
      updateData.status = calculateLoanStatus(
        existing.planReturnDate,
        existing.returnDate,
        existing.status
      );
    }

    const loan = await prisma.loan.update({
      where: { id },
      data: updateData,
      include: {
        loanItems: {
          include: { item: true },
        },
      },
    });

    await logActivity(
      session.user.id,
      "UPDATE",
      `Memperbarui peminjaman oleh "${loan.borrowerName}"`,
      "Loan",
      id
    );

    return { success: true as const, data: loan };
  } catch (error) {
    console.error("Error updating loan:", error);
    return {
      success: false as const,
      error: "Gagal memperbarui peminjaman",
    };
  }
}

export async function deleteLoan(id: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false as const, error: "Unauthorized" };
    }

    const existing = await prisma.loan.findUnique({
      where: { id },
      include: { loanItems: true },
    });

    if (!existing || existing.deletedAt) {
      return { success: false as const, error: "Peminjaman tidak ditemukan" };
    }

    // If loan is not returned yet, restore stock
    if (existing.status === "DIPINJAM" || existing.status === "TERLAMBAT") {
      await prisma.$transaction(async (tx) => {
        for (const loanItem of existing.loanItems) {
          await tx.item.update({
            where: { id: loanItem.itemId },
            data: {
              availableStock: { increment: loanItem.quantity },
            },
          });
        }

        await tx.loan.update({
          where: { id },
          data: { deletedAt: new Date() },
        });
      });
    } else {
      await prisma.loan.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
    }

    await logActivity(
      session.user.id,
      "DELETE",
      `Menghapus peminjaman oleh "${existing.borrowerName}"`,
      "Loan",
      id
    );

    return { success: true as const, data: null };
  } catch (error) {
    console.error("Error deleting loan:", error);
    return {
      success: false as const,
      error: "Gagal menghapus peminjaman",
    };
  }
}

export async function returnLoan(id: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false as const, error: "Unauthorized" };
    }

    const existing = await prisma.loan.findUnique({
      where: { id },
      include: { loanItems: true },
    });

    if (!existing || existing.deletedAt) {
      return { success: false as const, error: "Peminjaman tidak ditemukan" };
    }

    if (existing.status === "DIKEMBALIKAN") {
      return {
        success: false as const,
        error: "Peminjaman sudah dikembalikan sebelumnya",
      };
    }

    const now = new Date();

    // Use transaction to update loan status and restore stock
    const loan = await prisma.$transaction(async (tx) => {
      const updatedLoan = await tx.loan.update({
        where: { id },
        data: {
          status: "DIKEMBALIKAN",
          returnDate: now,
        },
        include: {
          loanItems: {
            include: { item: true },
          },
        },
      });

      // Increase availableStock back for each item
      for (const loanItem of existing.loanItems) {
        await tx.item.update({
          where: { id: loanItem.itemId },
          data: {
            availableStock: { increment: loanItem.quantity },
          },
        });
      }

      return updatedLoan;
    });

    await logActivity(
      session.user.id,
      "UPDATE",
      `Mengembalikan peminjaman oleh "${existing.borrowerName}"`,
      "Loan",
      id
    );

    return { success: true as const, data: loan };
  } catch (error) {
    console.error("Error returning loan:", error);
    return {
      success: false as const,
      error: "Gagal mengembalikan peminjaman",
    };
  }
}