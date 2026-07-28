"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function getEvents() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false as const, error: "Unauthorized" };
    }

    const events = await prisma.event.findMany({
      where: { deletedAt: null },
      include: {
        eventItems: {
          include: { item: true },
        },
      },
      orderBy: { date: "asc" },
    });

    return { success: true as const, data: events };
  } catch (error) {
    console.error("Error fetching events:", error);
    return { success: false as const, error: "Gagal mengambil data acara" };
  }
}

export async function createEvent(data: {
  name: string;
  date: string;
  time?: string;
  location?: string;
  pic?: string;
  description?: string;
  status?: string;
}) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false as const, error: "Unauthorized" };
    }

    const trimmedName = data.name.trim();
    if (!trimmedName) {
      return { success: false as const, error: "Nama acara tidak boleh kosong" };
    }

    const event = await prisma.event.create({
      data: {
        name: trimmedName,
        date: new Date(data.date),
        time: data.time || null,
        location: data.location || null,
        pic: data.pic || null,
        description: data.description || null,
        status: data.status || "DIRENCANAKAN",
      },
      include: {
        eventItems: {
          include: { item: true },
        },
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        activityType: "CREATE",
        description: `Membuat acara "${event.name}"`,
        entityType: "Event",
        entityId: event.id,
      },
    });

    return { success: true as const, data: event };
  } catch (error) {
    console.error("Error creating event:", error);
    return { success: false as const, error: "Gagal membuat acara" };
  }
}

export async function updateEvent(
  id: string,
  data: {
    name?: string;
    date?: string;
    time?: string;
    location?: string;
    pic?: string;
    description?: string;
    status?: string;
  }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false as const, error: "Unauthorized" };
    }

    const existing = await prisma.event.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) {
      return { success: false as const, error: "Acara tidak ditemukan" };
    }

    const updateData: Record<string, string | Date | null> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.date !== undefined) updateData.date = new Date(data.date);
    if (data.time !== undefined) updateData.time = data.time;
    if (data.location !== undefined) updateData.location = data.location;
    if (data.pic !== undefined) updateData.pic = data.pic;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.status !== undefined) updateData.status = data.status;

    const event = await prisma.event.update({
      where: { id },
      data: updateData,
      include: {
        eventItems: {
          include: { item: true },
        },
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        activityType: "UPDATE",
        description: `Memperbarui acara "${event.name}"`,
        entityType: "Event",
        entityId: event.id,
      },
    });

    return { success: true as const, data: event };
  } catch (error) {
    console.error("Error updating event:", error);
    return { success: false as const, error: "Gagal memperbarui acara" };
  }
}

export async function deleteEvent(id: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false as const, error: "Unauthorized" };
    }

    const existing = await prisma.event.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) {
      return { success: false as const, error: "Acara tidak ditemukan" };
    }

    const event = await prisma.event.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        activityType: "DELETE",
        description: `Menghapus acara "${event.name}"`,
        entityType: "Event",
        entityId: event.id,
      },
    });

    return { success: true as const, data: null };
  } catch (error) {
    console.error("Error deleting event:", error);
    return { success: false as const, error: "Gagal menghapus acara" };
  }
}

export async function addEventItem(data: {
  eventId: string;
  itemId: string;
  quantityNeeded: number;
}) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false as const, error: "Unauthorized" };
    }

    const existing = await prisma.eventItem.findFirst({
      where: { eventId: data.eventId, itemId: data.itemId },
    });
    if (existing) {
      return { success: false as const, error: "Barang sudah ditambahkan ke acara ini" };
    }

    const eventItem = await prisma.eventItem.create({
      data: {
        eventId: data.eventId,
        itemId: data.itemId,
        quantityNeeded: data.quantityNeeded,
        quantityPrepared: 0,
        status: "BELUM",
      },
      include: { item: true },
    });

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        activityType: "CREATE",
        description: `Menambahkan kebutuhan barang "${eventItem.item.name}" ke acara`,
        entityType: "EventItem",
        entityId: eventItem.id,
      },
    });

    return { success: true as const, data: eventItem };
  } catch (error) {
    console.error("Error adding event item:", error);
    return { success: false as const, error: "Gagal menambahkan barang" };
  }
}

export async function updateEventItem(
  id: string,
  data: {
    quantityNeeded?: number;
    quantityPrepared?: number;
    status?: string;
  }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false as const, error: "Unauthorized" };
    }

    const updateData: Record<string, string | number> = {};
    if (data.quantityNeeded !== undefined) updateData.quantityNeeded = data.quantityNeeded;
    if (data.quantityPrepared !== undefined) updateData.quantityPrepared = data.quantityPrepared;
    if (data.status !== undefined) {
      updateData.status = data.status;
    } else if (data.quantityPrepared !== undefined) {
      const item = await prisma.eventItem.findUnique({ where: { id } });
      if (item) {
        const needed = data.quantityNeeded ?? item.quantityNeeded;
        if (data.quantityPrepared >= needed) {
          updateData.status = "SIAP";
        } else if (data.quantityPrepared > 0) {
          updateData.status = "SEBAGIAN";
        } else {
          updateData.status = "BELUM";
        }
      }
    }

    const eventItem = await prisma.eventItem.update({
      where: { id },
      data: updateData,
      include: { item: true },
    });

    return { success: true as const, data: eventItem };
  } catch (error) {
    console.error("Error updating event item:", error);
    return { success: false as const, error: "Gagal memperbarui barang" };
  }
}

export async function removeEventItem(id: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false as const, error: "Unauthorized" };
    }

    await prisma.eventItem.delete({ where: { id } });

    return { success: true as const, data: null };
  } catch (error) {
    console.error("Error removing event item:", error);
    return { success: false as const, error: "Gagal menghapus barang" };
  }
}

export async function getItems() {
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