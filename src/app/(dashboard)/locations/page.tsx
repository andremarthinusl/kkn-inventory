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
import { MapPin, Plus, Pencil, Trash2, X, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  createLocation,
  updateLocation,
  deleteLocation,
  getLocations,
} from "./actions";

interface Location {
  id: string;
  name: string;
  address: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  _count: { items: number };
}

export default function LocationsPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Add form state
  const [newName, setNewName] = useState("");
  const [newAddress, setNewAddress] = useState("");

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editAddress, setEditAddress] = useState("");

  // Delete confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteName, setDeleteName] = useState("");

  const fetchLocations = useCallback(async () => {
    const result = await getLocations();
    if (result.success) {
      setLocations(result.data as unknown as Location[]);
    } else {
      toast.error(result.error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  const handleAdd = async () => {
    if (!newName.trim()) {
      toast.error("Nama lokasi tidak boleh kosong");
      return;
    }
    setSubmitting(true);
    const result = await createLocation(newName.trim(), newAddress.trim() || undefined);
    setSubmitting(false);

    if (result.success) {
      toast.success("Lokasi berhasil ditambahkan");
      setNewName("");
      setNewAddress("");
      await fetchLocations();
    } else {
      toast.error(result.error);
    }
  };

  const handleEdit = async (id: string) => {
    if (!editName.trim()) {
      toast.error("Nama lokasi tidak boleh kosong");
      return;
    }
    setSubmitting(true);
    const result = await updateLocation(id, {
      name: editName.trim(),
      address: editAddress.trim() || undefined,
    });
    setSubmitting(false);

    if (result.success) {
      toast.success("Lokasi berhasil diperbarui");
      setEditingId(null);
      setEditName("");
      setEditAddress("");
      await fetchLocations();
    } else {
      toast.error(result.error);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setSubmitting(true);
    const result = await deleteLocation(deleteId);
    setSubmitting(false);

    if (result.success) {
      toast.success("Lokasi berhasil dihapus");
      setDeleteId(null);
      setDeleteName("");
      await fetchLocations();
    } else {
      toast.error(result.error);
    }
  };

  const startEditing = (location: Location) => {
    setEditingId(location.id);
    setEditName(location.name);
    setEditAddress(location.address || "");
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditName("");
    setEditAddress("");
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Lokasi Penyimpanan</h1>
          <p className="text-muted-foreground">Kelola lokasi penyimpanan barang</p>
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
        <h1 className="text-2xl font-bold tracking-tight">Lokasi Penyimpanan</h1>
        <p className="text-muted-foreground">Kelola lokasi penyimpanan barang</p>
      </div>

      {/* Add Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-muted-foreground" />
            Tambah Lokasi Baru
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1">
              <label htmlFor="new-name" className="text-sm font-medium">
                Nama Lokasi
              </label>
              <Input
                id="new-name"
                placeholder="Masukkan nama lokasi"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAdd();
                }}
              />
            </div>
            <div className="flex-[2] space-y-1">
              <label htmlFor="new-address" className="text-sm font-medium">
                Alamat (opsional)
              </label>
              <Input
                id="new-address"
                placeholder="Masukkan alamat lokasi"
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
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
            <MapPin className="h-5 w-5 text-muted-foreground" />
            Daftar Lokasi
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-(--card-spacing)">
          {locations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <MapPin className="mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                Belum ada lokasi. Tambahkan lokasi pertama Anda.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead className="hidden sm:table-cell">Alamat</TableHead>
                    <TableHead className="hidden sm:table-cell w-20 text-center">
                      Jumlah Item
                    </TableHead>
                    <TableHead className="w-[100px] sm:w-[120px] text-right">
                      Aksi
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {locations.map((location) => (
                    <TableRow key={location.id}>
                      {editingId === location.id ? (
                        <>
                          <TableCell>
                            <Input
                              placeholder="Nama lokasi"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="h-8"
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleEdit(location.id);
                                if (e.key === "Escape") cancelEditing();
                              }}
                              autoFocus
                            />
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <Input
                              placeholder="Alamat"
                              value={editAddress}
                              onChange={(e) => setEditAddress(e.target.value)}
                              className="h-8"
                            />
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-center" />
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="icon-xs"
                                variant="ghost"
                                onClick={() => handleEdit(location.id)}
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
                          <TableCell className="font-medium">
                            {location.name}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-muted-foreground max-w-[200px] truncate">
                            {location.address || (
                              <span className="italic text-muted-foreground/50">
                                Tidak ada alamat
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-center text-muted-foreground">
                            {location._count.items}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="icon-sm"
                                variant="ghost"
                                onClick={() => startEditing(location)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon-sm"
                                variant="ghost"
                                onClick={() => {
                                  setDeleteId(location.id);
                                  setDeleteName(location.name);
                                }}
                                disabled={location._count.items > 0}
                                title={
                                  location._count.items > 0
                                    ? "Tidak dapat menghapus lokasi yang memiliki item"
                                    : "Hapus lokasi"
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
            <DialogTitle>Hapus Lokasi</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus lokasi <strong>{deleteName}</strong>?
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