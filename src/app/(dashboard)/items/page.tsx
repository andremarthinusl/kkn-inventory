"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Package, Plus, Search, SlidersHorizontal, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  createItem,
  deleteItem,
  getCategories,
  getItems,
  getLocations,
  updateItem,
} from "./actions";

// ─── Constants ───────────────────────────────────────────

const CONDITION_OPTIONS = [
  { value: "BAIK", label: "Baik" },
  { value: "RUSAK_RINGAN", label: "Rusak Ringan" },
  { value: "RUSAK_BERAT", label: "Rusak Berat" },
  { value: "HILANG", label: "Hilang" },
] as const;

const STATUS_OPTIONS = [
  { value: "TERSEDIA", label: "Tersedia" },
  { value: "DIGUNAKAN", label: "Digunakan" },
  { value: "DIPINJAMKAN", label: "Dipinjamkan" },
  { value: "TIDAK_TERSEDIA", label: "Tidak Tersedia" },
] as const;

const CONDITION_BADGE: Record<string, string> = {
  BAIK: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  RUSAK_RINGAN:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  RUSAK_BERAT:
    "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  HILANG: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400",
};

const STATUS_BADGE: Record<string, string> = {
  TERSEDIA: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  DIGUNAKAN:
    "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  DIPINJAMKAN:
    "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  TIDAK_TERSEDIA:
    "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ");
}

// ─── Types ───────────────────────────────────────────────

type PrismaItem = Awaited<ReturnType<typeof getItems>>[number];
type Category = Awaited<ReturnType<typeof getCategories>>[number];
type Location = Awaited<ReturnType<typeof getLocations>>[number];

// ─── Main Page ───────────────────────────────────────────

export default function ItemsPage() {
  // Data
  const [items, setItems] = useState<PrismaItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterLocation, setFilterLocation] = useState("");
  const [filterCondition, setFilterCondition] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PrismaItem | null>(null);
  const [saving, setSaving] = useState(false);

  // Delete confirm
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ─── Fetch Data ──────────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [itemsData, categoriesData, locationsData] = await Promise.all([
        getItems({
          search: search || undefined,
          categoryId: filterCategory || undefined,
          locationId: filterLocation || undefined,
          condition: filterCondition || undefined,
        }),
        getCategories(),
        getLocations(),
      ]);

      setItems(itemsData as PrismaItem[]);
      setCategories(categoriesData as Category[]);
      setLocations(locationsData as Location[]);
    } catch {
      toast.error("Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }, [search, filterCategory, filterLocation, filterCondition]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ─── Filter badge count ──────────────────────────────
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filterCategory) count++;
    if (filterLocation) count++;
    if (filterCondition) count++;
    if (filterStatus) count++;
    return count;
  }, [filterCategory, filterLocation, filterCondition, filterStatus]);

  // ─── Save Handler ────────────────────────────────────
  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);

    try {
      const form = event.currentTarget;
      const formData = new FormData(form);

      const rawName = formData.get("name") as string;
      const rawCategoryId = formData.get("categoryId") as string;
      const rawLocationId = formData.get("locationId") as string;
      const rawTotalStock = parseInt(formData.get("totalStock") as string, 10);
      const rawUnit = (formData.get("unit") as string) || "unit";
      const rawCondition = (formData.get("condition") as string) || "BAIK";
      const rawStatus = (formData.get("status") as string) || "TERSEDIA";
      const rawDescription = (formData.get("description") as string) || "";

      if (!rawName.trim()) {
        toast.error("Nama barang harus diisi");
        setSaving(false);
        return;
      }
      if (!rawCategoryId) {
        toast.error("Kategori harus dipilih");
        setSaving(false);
        return;
      }
      if (!rawLocationId) {
        toast.error("Lokasi harus dipilih");
        setSaving(false);
        return;
      }
      if (isNaN(rawTotalStock) || rawTotalStock < 0) {
        toast.error("Stok harus berupa angka positif");
        setSaving(false);
        return;
      }

      if (editingItem) {
        const result = await updateItem(editingItem.id, {
          name: rawName.trim(),
          categoryId: rawCategoryId,
          locationId: rawLocationId,
          totalStock: rawTotalStock,
          unit: rawUnit,
          condition: rawCondition,
          status: rawStatus,
          description: rawDescription || undefined,
        });

        if (result.success) {
          toast.success("Barang berhasil diperbarui");
          setDialogOpen(false);
          setEditingItem(null);
          fetchData();
        } else {
          toast.error("Gagal memperbarui barang");
        }
      } else {
        const result = await createItem({
          name: rawName.trim(),
          categoryId: rawCategoryId,
          locationId: rawLocationId,
          totalStock: rawTotalStock,
          unit: rawUnit,
          condition: rawCondition,
          description: rawDescription || undefined,
        });

        if (result.success) {
          toast.success("Barang berhasil ditambahkan");
          setDialogOpen(false);
          fetchData();
        } else {
          toast.error("Gagal menambahkan barang");
        }
      }
    } catch {
      toast.error("Terjadi kesalahan saat menyimpan");
    } finally {
      setSaving(false);
    }
  }

  // ─── Delete Handler ───────────────────────────────────
  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const result = await deleteItem(id);
      if (result.success) {
        toast.success("Barang berhasil dihapus");
        fetchData();
      } else {
        toast.error("Gagal menghapus barang");
      }
    } catch {
      toast.error("Terjadi kesalahan saat menghapus");
    } finally {
      setDeletingId(null);
    }
  }

  // ─── Open Edit Dialog ────────────────────────────────
  function openEdit(item: PrismaItem) {
    setEditingItem(item);
    setDialogOpen(true);
  }

  // ─── Open Create Dialog ──────────────────────────────
  function openCreate() {
    setEditingItem(null);
    setDialogOpen(true);
  }

  // ─── Filter reset ─────────────────────────────────────
  function resetFilters() {
    setFilterCategory("");
    setFilterLocation("");
    setFilterCondition("");
    setFilterStatus("");
    setSearch("");
  }

  // ─── Filtered items (client-side status filter) ───────
  const filteredItems = useMemo(() => {
    if (!filterStatus) return items;
    return items.filter((item) => item.status === filterStatus);
  }, [items, filterStatus]);

  // ─── Render ───────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Master Barang</h1>
          <p className="text-muted-foreground">
            Kelola seluruh barang inventaris KKN
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button />}>
            <Plus className="size-4" />
            Tambah Barang
          </DialogTrigger>
          <ItemFormDialog
            categories={categories}
            locations={locations}
            editingItem={editingItem}
            saving={saving}
            onSubmit={handleSave}
          />
        </Dialog>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cari barang..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowFilters(!showFilters)}
            className="relative"
          >
            <SlidersHorizontal className="size-4" />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </div>

        {showFilters && (
          <Card size="sm">
            <CardContent className="flex flex-wrap items-end gap-3 pt-3">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Kategori</Label>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="h-8 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <option value="">Semua Kategori</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Lokasi</Label>
                <select
                  value={filterLocation}
                  onChange={(e) => setFilterLocation(e.target.value)}
                  className="h-8 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <option value="">Semua Lokasi</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Kondisi</Label>
                <select
                  value={filterCondition}
                  onChange={(e) => setFilterCondition(e.target.value)}
                  className="h-8 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <option value="">Semua Kondisi</option>
                  {CONDITION_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Status</Label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="h-8 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <option value="">Semua Status</option>
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              {activeFilterCount > 0 && (
                <Button variant="ghost" size="sm" onClick={resetFilters}>
                  Reset Filter
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Desktop: Table */}
      <div className="hidden md:block">
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <ItemsTableSkeleton />
            ) : filteredItems.length === 0 ? (
              <EmptyState />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama Barang</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead>Lokasi</TableHead>
                    <TableHead className="text-center">Stok Total</TableHead>
                    <TableHead className="text-center">Stok Tersedia</TableHead>
                    <TableHead>Satuan</TableHead>
                    <TableHead>Kondisi</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {item.name}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {item.category?.name || "-"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {item.location?.name || "-"}
                      </TableCell>
                      <TableCell className="text-center">{item.totalStock}</TableCell>
                      <TableCell className="text-center">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                            item.availableStock > 0
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
                              : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                          )}
                        >
                          {item.availableStock}
                        </span>
                      </TableCell>
                      <TableCell>{item.unit}</TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                            CONDITION_BADGE[item.condition] || ""
                          )}
                        >
                          {CONDITION_OPTIONS.find(
                            (o) => o.value === item.condition
                          )?.label || item.condition}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                            STATUS_BADGE[item.status] || ""
                          )}
                        >
                          {STATUS_OPTIONS.find(
                            (o) => o.value === item.status
                          )?.label || item.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
                            <svg className="size-4" viewBox="0 0 16 16" fill="currentColor">
                              <circle cx="8" cy="3" r="1.5" />
                              <circle cx="8" cy="8" r="1.5" />
                              <circle cx="8" cy="13" r="1.5" />
                            </svg>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(item)}>
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => window.location.href = `/items/${item.id}`}>
                              Detail & QR
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => handleDelete(item.id)}
                              disabled={deletingId === item.id}
                            >
                              {deletingId === item.id ? "Menghapus..." : "Hapus"}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Mobile: Cards */}
      <div className="grid gap-3 md:hidden">
        {loading ? (
          <>
            <MobileSkeleton />
            <MobileSkeleton />
            <MobileSkeleton />
          </>
        ) : filteredItems.length === 0 ? (
          <EmptyState />
        ) : (
          filteredItems.map((item) => (
            <Card key={item.id} size="sm">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="truncate">{item.name}</span>
                  <DropdownMenu>
                    <DropdownMenuTrigger render={<Button variant="ghost" size="icon-xs" />}>
                      <svg className="size-4" viewBox="0 0 16 16" fill="currentColor">
                        <circle cx="8" cy="3" r="1.5" />
                        <circle cx="8" cy="8" r="1.5" />
                        <circle cx="8" cy="13" r="1.5" />
                      </svg>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEdit(item)}>
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => window.location.href = `/items/${item.id}`}>
                        Detail & QR
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => handleDelete(item.id)}
                        disabled={deletingId === item.id}
                      >
                        {deletingId === item.id ? "Menghapus..." : "Hapus"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Kategori:</span>{" "}
                    {item.category?.name || "-"}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Lokasi:</span>{" "}
                    {item.location?.name || "-"}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Stok:</span>{" "}
                    {item.totalStock} {item.unit}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Tersedia:</span>{" "}
                    {item.availableStock}
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                      CONDITION_BADGE[item.condition] || ""
                    )}
                  >
                    {CONDITION_OPTIONS.find(
                      (o) => o.value === item.condition
                    )?.label || item.condition}
                  </span>
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                      STATUS_BADGE[item.status] || ""
                    )}
                  >
                    {STATUS_OPTIONS.find((o) => o.value === item.status)
                      ?.label || item.status}
                  </span>
                </div>
                {item.description && (
                  <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
                    {item.description}
                  </p>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Item Form Dialog ────────────────────────────────────

function ItemFormDialog({
  categories,
  locations,
  editingItem,
  saving,
  onSubmit,
}: {
  categories: Category[];
  locations: Location[];
  editingItem: PrismaItem | null;
  saving: boolean;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
}) {
  return (
    <DialogContent className="sm:max-w-lg">
      <form onSubmit={onSubmit}>
        <DialogHeader>
          <DialogTitle>
            {editingItem ? "Edit Barang" : "Tambah Barang Baru"}
          </DialogTitle>
          <DialogDescription>
            {editingItem
              ? "Ubah informasi barang yang sudah ada"
              : "Isi detail barang baru untuk ditambahkan ke inventaris"}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Nama Barang */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Nama Barang</Label>
            <Input
              id="name"
              name="name"
              defaultValue={editingItem?.name || ""}
              placeholder="Masukkan nama barang"
              required
            />
          </div>

          {/* Kategori & Lokasi */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="categoryId">Kategori</Label>
              <select
                id="categoryId"
                name="categoryId"
                defaultValue={editingItem?.categoryId || ""}
                className="h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                required
              >
                <option value="">Pilih Kategori</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="locationId">Lokasi</Label>
              <select
                id="locationId"
                name="locationId"
                defaultValue={editingItem?.locationId || ""}
                className="h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                required
              >
                <option value="">Pilih Lokasi</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Stok & Satuan */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="totalStock">Jumlah Stok</Label>
              <Input
                id="totalStock"
                name="totalStock"
                type="number"
                min={0}
                defaultValue={editingItem?.totalStock ?? 0}
                placeholder="0"
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="unit">Satuan</Label>
              <select
                id="unit"
                name="unit"
                defaultValue={editingItem?.unit || "unit"}
                className="h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="unit">Unit</option>
                <option value="buah">Buah</option>
                <option value="lembar">Lembar</option>
                <option value="meter">Meter</option>
                <option value="liter">Liter</option>
                <option value="kilogram">Kilogram</option>
                <option value="pasang">Pasang</option>
                <option value="set">Set</option>
                <option value="pcs">Pcs</option>
              </select>
            </div>
          </div>

          {/* Kondisi & Status */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="condition">Kondisi</Label>
              <select
                id="condition"
                name="condition"
                defaultValue={editingItem?.condition || "BAIK"}
                className="h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {CONDITION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                name="status"
                defaultValue={editingItem?.status || "TERSEDIA"}
                className="h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Deskripsi */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="description">Deskripsi (opsional)</Label>
            <textarea
              id="description"
              name="description"
              rows={3}
              defaultValue={editingItem?.description || ""}
              placeholder="Masukkan deskripsi barang"
              className="h-20 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="submit" disabled={saving}>
            {saving
              ? "Menyimpan..."
              : editingItem
              ? "Simpan Perubahan"
              : "Tambah Barang"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

// ─── Empty State ─────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <Package className="size-6 text-muted-foreground" />
      </div>
      <h3 className="mt-4 text-sm font-medium">Belum ada barang</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Tambah barang baru untuk memulai inventaris
      </p>
    </div>
  );
}

// ─── Skeletons ───────────────────────────────────────────

function ItemsTableSkeleton() {
  return (
    <div className="p-4 space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 animate-pulse">
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-8 w-8" />
        </div>
      ))}
    </div>
  );
}

function MobileSkeleton() {
  return (
    <Card size="sm">
      <CardHeader>
        <Skeleton className="h-5 w-3/4" />
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
        </div>
        <div className="mt-2 flex gap-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      </CardContent>
    </Card>
  );
}