"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function logActivity(
  userId: string,
  activityType: string,
  description: string,
  entityType?: string,
  entityId?: string
) {
  try {
    await prisma.activityLog.create({
      data: {
        userId,
        activityType,
        description,
        entityType: entityType || null,
        entityId: entityId || null,
      },
    });
  } catch (error) {
    console.error("Error logging activity:", error);
  }
}