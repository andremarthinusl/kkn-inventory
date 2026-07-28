"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function getActivityLog() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false as const, error: "Unauthorized" };
    }

    const logs = await prisma.activityLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 1000,
      include: { user: { select: { name: true } } },
    });

    return { success: true as const, data: logs };
  } catch (error) {
    console.error("Error fetching activity log:", error);
    return { success: false as const, error: "Gagal mengambil data aktivitas" };
  }
}