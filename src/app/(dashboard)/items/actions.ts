"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function createItem(data: {
  name: string;
  categoryId: string;
  locationId: string;
  totalStock: number;
  unit?: string;
  condition?: string;
  description?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const item = await prisma.item.create({
    data: {
      name: data.name,
      categoryId: data.categoryId,
      locationId: data.locationId,
      totalStock: data.totalStock,
      availableStock: data.totalStock,
      unit: data.unit || "unit",
      condition: data.condition || "BAIK",
      status: data.totalStock > 0 ? "TERSEDIA" : "TIDAK_TERSEDIA",
      description: data.description,
    },
  });

  await prisma.activityLog.create({
    data: {
      userId: session.user.id,
      activityType: "CREATE_ITEM",
      description: `Menambahkan barang ${item.name}`,
      entityType: "Item",
      entityId: item.id,
    },
  });

  return { success: true, data: item };
}

export async function updateItem(id: string, data: any) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const updateData: any = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
  if (data.locationId !== undefined) updateData.locationId = data.locationId;
  if (data.totalStock !== undefined) {
    updateData.totalStock = data.totalStock;
  }
  if (data.unit !== undefined) updateData.unit = data.unit;
  if (data.condition !== undefined) updateData.condition = data.condition;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.image !== undefined) updateData.image = data.image;

  const item = await prisma.item.update({ where: { id }, data: updateData });

  await prisma.activityLog.create({
    data: {
      userId: session.user.id,
      activityType: "UPDATE_ITEM",
      description: `Mengedit barang ${item.name}`,
      entityType: "Item",
      entityId: item.id,
    },
  });

  return { success: true, data: item };
}

export async function deleteItem(id: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const item = await prisma.item.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  await prisma.activityLog.create({
    data: {
      userId: session.user.id,
      activityType: "DELETE_ITEM",
      description: `Menghapus barang ${item.name}`,
      entityType: "Item",
      entityId: item.id,
    },
  });

  return { success: true };
}

export async function getItems(filters?: { categoryId?: string; locationId?: string; condition?: string; search?: string }) {
  const where: any = { deletedAt: null };
  if (filters?.categoryId) where.categoryId = filters.categoryId;
  if (filters?.locationId) where.locationId = filters.locationId;
  if (filters?.condition) where.condition = filters.condition;
  if (filters?.search) {
    where.name = { contains: filters.search, mode: "insensitive" };
  }

  const items = await prisma.item.findMany({
    where,
    include: { category: true, location: true },
    orderBy: { name: "asc" },
  });

  return items;
}

export async function getCategories() {
  try {
    const categories = await prisma.category.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
    });
    return categories;
  } catch (error) {
    console.error("Failed to fetch categories:", error);
    return [];
  }
}

export async function getLocations() {
  try {
    const locations = await prisma.location.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
    });
    return locations;
  } catch (error) {
    console.error("Failed to fetch locations:", error);
    return [];
  }
}