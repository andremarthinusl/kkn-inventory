"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { FolderTree, Plus, Pencil, Trash2, X, Check, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import {
  createCategory,
  updateCategory,
  deleteCategory,
  getCategories,
} from "./actions";

interface Category {
  id: string;
  name: string;
  icon: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  _count: { items: number };
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Add form state
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState("");

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editIcon, setEditIcon] = useState("");

  // Delete confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteName, setDeleteName] = useState("");

  const fetchCategories = useCallback(async () => {
    const result = await getCategories();
    if (result.success) {
      setCategories(result.data as unknown as Category[]);
    } else {
      toast.error(result.error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleAdd = async () => {
    if (!newName.trim()) {
      toast.error("Nama kategori tidak boleh kosong");
      return;
    }
    setSubmitting(true);
    const result = await createCategory(newName.trim(), newIcon.trim() || undefined);
    setSubmitting(false);

    if (result.success) {
      toast.success("Kategori berhasil ditambahkan");
      setNewName("");
      setNewIcon("");
      await fetchCategories();
    } else {
      toast.error(result.error);
    }
  };

  const handleEdit = async (id: string) => {
    if (!editName.trim()) {
      toast.error("Nama kategori tidak boleh kosong");
      return;
    }
    setSubmitting(true);
    const result = await updateCategory(id, {
      name: editName.trim(),
      icon: editIcon.trim() || undefined,
    });
    setSubmitting(false);

    if (result.success) {
      toast.success("Kategori berhasil diperbarui");
      setEditingId(null);
      setEditName("");
      setEditIcon("");
      await fetchCategories();
    } else {
      toast.error(result.error);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setSubmitting(true);
    const result = await deleteCategory(deleteId);
    setSubmitting(false);

    if (result.success) {
      toast.success("Kategori berhasil dihapus");
      setDeleteId(null);
      setDeleteName("");
      await fetchCategories();
    } else {
      toast.error(result.error);
    }
  };

  const startEditing = (category: Category) => {
    setEditingId(category.id);
    setEditName(category.name);
    setEditIcon(category.icon || "");
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditName("");
    setEditIcon("");
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Kategori Barang</h1>
          <p className="text-muted-foreground">Kelola kategori barang inventaris</p>
        </div>
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Kategori Barang</h1>
        <p className="text-muted-foreground">Kelola kategori barang inventaris</p>
      </div>

      {/* Add Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-muted-foreground" />
            Tambah Kategori Baru
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1">
              <label htmlFor="new-name" className="text-sm font-medium">
                Nama Kategori
              </label>
              <Input
                id="new-name"
                placeholder="Masukkan nama kategori"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAdd();
                }}
              />
            </div>
            <div className="w-full space-y-1 sm:w-40">
              <label htmlFor="new-icon" className="text-sm font-medium">
                Icon (opsional)
              </label>
              <Input
                id="new-icon"
                placeholder="Nama icon lucide"
                value={newIcon}
                onChange={(e) => setNewIcon(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAdd();
                }}
              />
            </div>
            <Button onClick={handleAdd} disabled={submitting} className="shrink-0">
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Tambah
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderTree className="h-5 w-5 text-muted-foreground" />
            Daftar Kategori
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-(--card-spacing)">
          {categories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FolderTree className="mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                Belum ada kategori. Tambahkan kategori pertama Anda.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px] sm:w-auto">Icon</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead className="hidden sm:table-cell w-20 text-center">
                      Jumlah Item
                    </TableHead>
                    <TableHead className="w-[100px] sm:w-[120px] text-right">
                      Aksi
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((category) => (
                    <TableRow key={category.id}>
                      {editingId === category.id ? (
                        <>
                          <TableCell>
                            <Input
                              placeholder="Icon"
                              value={editIcon}
                              onChange={(e) => setEditIcon(e.target.value)}
                              className="h-8"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              placeholder="Nama kategori"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="h-8"
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleEdit(category.id);
                                if (e.key === "Escape") cancelEditing();
                              }}
                              autoFocus
                            />
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-center" />
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="icon-xs"
                                variant="ghost"
                                onClick={() => handleEdit(category.id)}
                                disabled={submitting}
                              >
                                <Check className="h-3.5 w-3.5 text-green-600" />
                              </Button>
                              <Button
                                size="icon-xs"
                                variant="ghost"
                                onClick={cancelEditing}
                              >
                                <X className="h-3.5 w-3.5 text-muted-foreground" />
                              </Button>
                            </div>
                          </TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell>
                            {category.icon ? (
                              <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-muted text-sm font-medium">
                                {category.icon}
                              </span>
                            ) : (
                              <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-muted/50 text-muted-foreground/50 text-xs">
                                -
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="font-medium">
                            {category.name}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-center text-muted-foreground">
                            {category._count.items}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="icon-sm"
                                variant="ghost"
                                onClick={() => startEditing(category)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon-sm"
                                variant="ghost"
                                onClick={() => {
                                  setDeleteId(category.id);
                                  setDeleteName(category.name);
                                }}
                                disabled={category._count.items > 0}
                                title={
                                  category._count.items > 0
                                    ? "Tidak dapat menghapus kategori yang memiliki item"
                                    : "Hapus kategori"
                                }
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Kategori</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus kategori <strong>{deleteName}</strong>?
              Tindakan ini dapat dikembalikan oleh administrator.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={submitting}
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}