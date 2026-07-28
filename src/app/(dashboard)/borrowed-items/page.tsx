"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ArrowLeftFromLine,
  Plus,
  RotateCcw,
  Trash2,
  Search,
  AlertTriangle,
  Loader2,
  User,
  Building2,
  Phone,
  Calendar,
  Package,
  ClipboardList,
} from "lucide-react";
import { toast } from "sonner";
import {
  getBorrowedItems,
  createBorrowedItem,
  returnBorrowedItem,
  deleteBorrowedItem,
} from "./actions";
import { cn } from "@/lib/utils";

interface BorrowedItem {
  id: string;
  itemName: string;
  ownerName: string;
  ownerPhone: string | null;
  institution: string | null;
  loanDate: Date;
  planReturnDate: Date | null;
  returnDate: Date | null;
  quantity: number;
  unit: string;
  conditionIn: string | null;
  conditionOut: string | null;
  status: string;
  notes: string | null;
  createdAt: Date;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  DIPINJAM: {
    label: "Dipinjam",
    className:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  },
  DIKEMBALIKAN: {
    label: "Dikembalikan",
    className:
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  },
  TERLAMBAT: {
    label: "Terlambat",
    className:
      "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  },
};

function getStatusConfig(status: string) {
  return statusConfig[status] || {
    label: status,
    className: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
  };
}

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function BorrowedItemsPage() {
  const [items, setItems] = useState<BorrowedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [returnItemId, setReturnItemId] = useState<string | null>(null);
  const [conditionOut, setConditionOut] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  const [formData, setFormData] = useState({
    itemName: "",
    ownerName: "",
    ownerPhone: "",
    institution: "",
    loanDate: new Date().toISOString().split("T")[0],
    planReturnDate: "",
    quantity: 1,
    unit: "unit",
    conditionIn: "",
    notes: "",
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    const result = await getBorrowedItems();
    if (result.success) {
      setItems(result.data);
    } else {
      toast.error(result.error || "Gagal memuat data");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Check for overdue items
  useEffect(() => {
    const now = new Date();
    const updatedItems = items.map((item) => {
      if (
        item.status === "DIPINJAM" &&
        item.planReturnDate &&
        new Date(item.planReturnDate) < now
      ) {
        return { ...item, status: "TERLAMBAT" as string };
      }
      return item;
    });
    const hasChanges = updatedItems.some(
      (item, i) => item.status !== items[i].status
    );
    if (hasChanges) {
      setItems(updatedItems);
    }
  }, [items]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);

    const result = await createBorrowedItem({
      itemName: formData.itemName,
      ownerName: formData.ownerName,
      ownerPhone: formData.ownerPhone || undefined,
      institution: formData.institution || undefined,
      loanDate: new Date(formData.loanDate),
      planReturnDate: formData.planReturnDate
        ? new Date(formData.planReturnDate)
        : null,
      quantity: formData.quantity,
      unit: formData.unit || "unit",
      conditionIn: formData.conditionIn || undefined,
      notes: formData.notes || undefined,
    });

    if (result.success) {
      toast.success("Barang dipinjam berhasil dicatat");
      setDialogOpen(false);
      setFormData({
        itemName: "",
        ownerName: "",
        ownerPhone: "",
        institution: "",
        loanDate: new Date().toISOString().split("T")[0],
        planReturnDate: "",
        quantity: 1,
        unit: "unit",
        conditionIn: "",
        notes: "",
      });
      loadData();
    } else {
      toast.error(result.error || "Gagal mencatat barang dipinjam");
    }
    setFormLoading(false);
  };

  const handleReturn = async () => {
    if (!returnItemId) return;
    setFormLoading(true);

    const result = await returnBorrowedItem(
      returnItemId,
      conditionOut || undefined
    );

    if (result.success) {
      toast.success("Barang berhasil dikembalikan");
      setReturnDialogOpen(false);
      setReturnItemId(null);
      setConditionOut("");
      loadData();
    } else {
      toast.error(result.error || "Gagal mengembalikan barang");
    }
    setFormLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus data barang dipinjam ini?")) return;
    const result = await deleteBorrowedItem(id);
    if (result.success) {
      toast.success("Data berhasil dihapus");
      loadData();
    } else {
      toast.error(result.error || "Gagal menghapus data");
    }
  };

  const openReturnDialog = (id: string) => {
    setReturnItemId(id);
    setConditionOut("");
    setReturnDialogOpen(true);
  };

  const filteredItems = items.filter((item) => {
    const query = searchQuery.toLowerCase();
    return (
      item.itemName.toLowerCase().includes(query) ||
      item.ownerName.toLowerCase().includes(query) ||
      (item.institution || "").toLowerCase().includes(query)
    );
  });

  const now = new Date();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Barang Dipinjam dari Pihak Lain
          </h1>
          <p className="text-muted-foreground">
            Kelola barang yang dipinjam dari pihak lain
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button />}>
            <Plus className="h-4 w-4" />
            Catat Barang Dipinjam
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle>Tambah Barang Dipinjam</DialogTitle>
                <DialogDescription>
                  Catat barang yang dipinjam dari pihak lain
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="itemName">Nama Barang *</Label>
                  <Input
                    id="itemName"
                    placeholder="Masukkan nama barang"
                    value={formData.itemName}
                    onChange={(e) =>
                      setFormData({ ...formData, itemName: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ownerName">Nama Pemilik *</Label>
                    <Input
                      id="ownerName"
                      placeholder="Nama pemilik barang"
                      value={formData.ownerName}
                      onChange={(e) =>
                        setFormData({ ...formData, ownerName: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ownerPhone">No. Telepon</Label>
                    <Input
                      id="ownerPhone"
                      placeholder="08123456789"
                      value={formData.ownerPhone}
                      onChange={(e) =>
                        setFormData({ ...formData, ownerPhone: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="institution">Instansi</Label>
                  <Input
                    id="institution"
                    placeholder="Nama instansi/organisasi"
                    value={formData.institution}
                    onChange={(e) =>
                      setFormData({ ...formData, institution: e.target.value })
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="loanDate">Tanggal Pinjam *</Label>
                    <Input
                      id="loanDate"
                      type="date"
                      value={formData.loanDate}
                      onChange={(e) =>
                        setFormData({ ...formData, loanDate: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="planReturnDate">Rencana Kembali</Label>
                    <Input
                      id="planReturnDate"
                      type="date"
                      value={formData.planReturnDate}
                      onChange={(e) =>
                        setFormData({ ...formData, planReturnDate: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Jumlah *</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min={1}
                      value={formData.quantity}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          quantity: parseInt(e.target.value) || 0,
                        })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unit">Satuan</Label>
                    <Input
                      id="unit"
                      placeholder="unit"
                      value={formData.unit}
                      onChange={(e) =>
                        setFormData({ ...formData, unit: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="conditionIn">Kondisi Saat Dipinjam</Label>
                  <Input
                    id="conditionIn"
                    placeholder="Contoh: Baik, Rusak ringan"
                    value={formData.conditionIn}
                    onChange={(e) =>
                      setFormData({ ...formData, conditionIn: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Keterangan</Label>
                  <Input
                    id="notes"
                    placeholder="Catatan tambahan (opsional)"
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={formLoading}>
                  {formLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    "Simpan"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Cari barang dipinjam..."
          className="pl-9"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Borrowed Items Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowLeftFromLine className="h-5 w-5 text-muted-foreground" />
            Daftar Barang Dipinjam
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredItems.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {searchQuery
                ? "Barang tidak ditemukan"
                : "Belum ada data barang dipinjam"}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Barang</TableHead>
                  <TableHead>Pemilik</TableHead>
                  <TableHead>Jumlah</TableHead>
                  <TableHead>Tanggal Pinjam</TableHead>
                  <TableHead>Rencana Kembali</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => {
                  const isOverdue =
                    item.status === "DIPINJAM" &&
                    item.planReturnDate &&
                    new Date(item.planReturnDate) < now;
                  const status = isOverdue ? "TERLAMBAT" : item.status;
                  const config = getStatusConfig(status);

                  return (
                    <TableRow
                      key={item.id}
                      className={cn(isOverdue && "bg-destructive/5")}
                    >
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium flex items-center gap-1">
                            <Package className="h-3 w-3 text-muted-foreground" />
                            {item.itemName}
                          </div>
                          {item.conditionIn && (
                            <div className="text-xs text-muted-foreground">
                              Kondisi: {item.conditionIn}
                            </div>
                          )}
                          {item.notes && (
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                              <ClipboardList className="h-3 w-3" />
                              {item.notes}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-sm">
                            <User className="h-3 w-3 text-muted-foreground" />
                            {item.ownerName}
                          </div>
                          {item.institution && (
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                              <Building2 className="h-3 w-3" />
                              {item.institution}
                            </div>
                          )}
                          {item.ownerPhone && (
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {item.ownerPhone}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">
                          {item.quantity}{" "}
                          <span className="text-muted-foreground text-xs">
                            {item.unit}
                          </span>
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {formatDate(item.loanDate)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {formatDate(item.planReturnDate)}
                          {isOverdue && (
                            <AlertTriangle className="h-3 w-3 text-destructive ml-1" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                            config.className
                          )}
                        >
                          {config.label}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {(status === "DIPINJAM" || isOverdue) && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openReturnDialog(item.id)}
                            >
                              <RotateCcw className="h-3 w-3" />
                              Kembali
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleDelete(item.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Return Dialog */}
      <Dialog open={returnDialogOpen} onOpenChange={setReturnDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Kembalikan Barang</DialogTitle>
            <DialogDescription>
              Catat kondisi barang saat dikembalikan
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-2">
              <Label htmlFor="conditionOut">Kondisi Saat Dikembalikan</Label>
              <Input
                id="conditionOut"
                placeholder="Contoh: Baik, Rusak ringan"
                value={conditionOut}
                onChange={(e) => setConditionOut(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleReturn} disabled={formLoading}>
              {formLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                "Konfirmasi Kembali"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}