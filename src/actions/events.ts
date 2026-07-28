"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/actions/helpers";
import {
  createEventSchema,
  updateEventSchema,
  addEventItemSchema,
  updateEventItemSchema,
} from "@/lib/validations/events";

export async function getEvents() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false as const, error: "Unauthorized" };
    }

    const events = await prisma.event.findMany({
      where: { deletedAt: null },
      orderBy: { date: "desc" },
      include: {
        eventItems: {
          include: { item: true },
        },
      },
    });

    return { success: true as const, data: events };
  } catch (error) {
    console.error("Error fetching events:", error);
    return { success: false as const, error: "Gagal mengambil data acara" };
  }
}

export async function getEventById(id: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false as const, error: "Unauthorized" };
    }

    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        eventItems: {
          include: { item: true },
        },
      },
    });

    if (!event || event.deletedAt) {
      return { success: false as const, error: "Acara tidak ditemukan" };
    }

    return { success: true as const, data: event };
  } catch (error) {
    console.error("Error fetching event:", error);
    return { success: false as const, error: "Gagal mengambil data acara" };
  }
}

export async function createEvent(input: {
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

    const parsed = createEventSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false as const,
        error: parsed.error.issues.map((e) => e.message).join(", "),
      };
    }

    const { name, date, time, location, pic, description, status } =
      parsed.data;

    const event = await prisma.event.create({
      data: {
        name: name.trim(),
        date: new Date(date),
        time: time || null,
        location: location || null,
        pic: pic || null,
        description: description || null,
        status: status || "DIRENCANAKAN",
      },
      include: {
        eventItems: {
          include: { item: true },
        },
      },
    });

    await logActivity(
      session.user.id,
      "CREATE",
      `Membuat acara baru "${event.name}"`,
      "Event",
      event.id
    );

    return { success: true as const, data: event };
  } catch (error) {
    console.error("Error creating event:", error);
    return { success: false as const, error: "Gagal membuat acara" };
  }
}

export async function updateEvent(
  id: string,
  input: {
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

    const parsed = updateEventSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false as const,
        error: parsed.error.issues.map((e) => e.message).join(", "),
      };
    }

    const existing = await prisma.event.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) {
      return { success: false as const, error: "Acara tidak ditemukan" };
    }

    const updateData: Record<string, unknown> = {};

    if (parsed.data.name !== undefined) {
      updateData.name = parsed.data.name.trim();
    }
    if (parsed.data.date !== undefined) {
      updateData.date = new Date(parsed.data.date);
    }
    if (parsed.data.time !== undefined) {
      updateData.time = parsed.data.time || null;
    }
    if (parsed.data.location !== undefined) {
      updateData.location = parsed.data.location || null;
    }
    if (parsed.data.pic !== undefined) {
      updateData.pic = parsed.data.pic || null;
    }
    if (parsed.data.description !== undefined) {
      updateData.description = parsed.data.description || null;
    }
    if (parsed.data.status !== undefined) {
      updateData.status = parsed.data.status;
    }

    const event = await prisma.event.update({
      where: { id },
      data: updateData,
      include: {
        eventItems: {
          include: { item: true },
        },
      },
    });

    await logActivity(
      session.user.id,
      "UPDATE",
      `Memperbarui acara "${event.name}"`,
      "Event",
      id
    );

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

    await prisma.event.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await logActivity(
      session.user.id,
      "DELETE",
      `Menghapus acara "${existing.name}"`,
      "Event",
      id
    );

    return { success: true as const, data: null };
  } catch (error) {
    console.error("Error deleting event:", error);
    return { success: false as const, error: "Gagal menghapus acara" };
  }
}

// ========== Event Item Actions ==========

export async function addEventItem(input: {
  eventId: string;
  itemId: string;
  quantityNeeded: number;
  notes?: string;
}) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false as const, error: "Unauthorized" };
    }

    const parsed = addEventItemSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false as const,
        error: parsed.error.issues.map((e) => e.message).join(", "),
      };
    }

    const { eventId, itemId, quantityNeeded, notes } = parsed.data;

    // Verify event exists
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event || event.deletedAt) {
      return { success: false as const, error: "Acara tidak ditemukan" };
    }

    // Verify item exists
    const item = await prisma.item.findUnique({ where: { id: itemId } });
    if (!item || item.deletedAt) {
      return { success: false as const, error: "Barang tidak ditemukan" };
    }

    const eventItem = await prisma.eventItem.create({
      data: {
        eventId,
        itemId,
        quantityNeeded,
        notes: notes || null,
      },
      include: { item: true },
    });

    await logActivity(
      session.user.id,
      "CREATE",
      `Menambahkan kebutuhan barang "${item.name}" (${quantityNeeded} ${item.unit}) ke acara "${event.name}"`,
      "EventItem",
      eventItem.id
    );

    return { success: true as const, data: eventItem };
  } catch (error) {
    console.error("Error adding event item:", error);
    return {
      success: false as const,
      error: "Gagal menambahkan barang ke acara",
    };
  }
}

export async function updateEventItem(
  id: string,
  input: {
    quantityNeeded?: number;
    quantityPrepared?: number;
    notes?: string;
    status?: string;
  }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false as const, error: "Unauthorized" };
    }

    const parsed = updateEventItemSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false as const,
        error: parsed.error.issues.map((e) => e.message).join(", "),
      };
    }

    const existing = await prisma.eventItem.findUnique({
      where: { id },
      include: { item: true, event: true },
    });

    if (!existing) {
      return {
        success: false as const,
        error: "Item acara tidak ditemukan",
      };
    }

    const updateData: Record<string, unknown> = {};

    if (parsed.data.quantityNeeded !== undefined) {
      updateData.quantityNeeded = parsed.data.quantityNeeded;
    }
    if (parsed.data.quantityPrepared !== undefined) {
      updateData.quantityPrepared = parsed.data.quantityPrepared;
    }
    if (parsed.data.notes !== undefined) {
      updateData.notes = parsed.data.notes || null;
    }
    if (parsed.data.status !== undefined) {
      updateData.status = parsed.data.status;
    }

    const eventItem = await prisma.eventItem.update({
      where: { id },
      data: updateData,
      include: { item: true, event: true },
    });

    await logActivity(
      session.user.id,
      "UPDATE",
      `Memperbarui kebutuhan barang "${eventItem.item.name}" di acara "${eventItem.event.name}"`,
      "EventItem",
      id
    );

    return { success: true as const, data: eventItem };
  } catch (error) {
    console.error("Error updating event item:", error);
    return {
      success: false as const,
      error: "Gagal memperbarui barang acara",
    };
  }
}

export async function removeEventItem(id: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false as const, error: "Unauthorized" };
    }

    const existing = await prisma.eventItem.findUnique({
      where: { id },
      include: { item: true, event: true },
    });

    if (!existing) {
      return {
        success: false as const,
        error: "Item acara tidak ditemukan",
      };
    }

    await prisma.eventItem.delete({
      where: { id },
    });

    await logActivity(
      session.user.id,
      "DELETE",
      `Menghapus kebutuhan barang "${existing.item.name}" dari acara "${existing.event.name}"`,
      "EventItem",
      id
    );

    return { success: true as const, data: null };
  } catch (error) {
    console.error("Error removing event item:", error);
    return {
      success: false as const,
      error: "Gagal menghapus barang dari acara",
    };
  }
}