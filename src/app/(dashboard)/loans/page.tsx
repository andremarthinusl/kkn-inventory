"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
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
  Handshake,
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
  FileText,
  Package,
} from "lucide-react";
import { toast } from "sonner";
import { getLoans, getAvailableItems, createLoan, returnLoan, deleteLoan } from "./actions";
import { cn } from "@/lib/utils";

interface Item {
  id: string;
  name: string;
  availableStock: number;
  totalStock: number;
  unit: string;
}

interface LoanItem {
  id: string;
  itemId: string;
  quantity: number;
  item: Item;
}

interface Loan {
  id: string;
  borrowerName: string;
  borrowerPhone: string | null;
  institution: string | null;
  loanDate: Date;
  planReturnDate: Date | null;
  returnDate: Date | null;
  status: string;
  notes: string | null;
  createdAt: Date;
  loanItems: LoanItem[];
}

interface FormItem {
  itemId: string;
  quantity: number;
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

export default function LoansPage() {
  const router = useRouter();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [availableItems, setAvailableItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  // Form state
  const [formLoading, setFormLoading] = useState(false);
  const [formData, setFormData] = useState({
    borrowerName: "",
    borrowerPhone: "",
    institution: "",
    loanDate: new Date().toISOString().split("T")[0],
    planReturnDate: "",
    notes: "",
    items: [] as FormItem[],
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    const [loansResult, itemsResult] = await Promise.all([
      getLoans(),
      getAvailableItems(),
    ]);
    if (loansResult.success) {
      setLoans(loansResult.data);
    } else {
      toast.error(loansResult.error || "Gagal memuat data");
    }
    if (itemsResult.success) {
      setAvailableItems(itemsResult.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Check for overdue loans
  useEffect(() => {
    const now = new Date();
    let hasChanges = false;
    const updatedLoans = loans.map((loan) => {
      if (
        loan.status === "DIPINJAM" &&
        loan.planReturnDate &&
        new Date(loan.planReturnDate) < now
      ) {
        hasChanges = true;
        return { ...loan, status: "TERLAMBAT" as string };
      }
      return loan;
    });
    if (hasChanges) {
      setLoans(updatedLoans);
    }
  }, [loans]);

  const handleAddItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, { itemId: "", quantity: 1 }],
    }));
  };

  const handleRemoveItem = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const handleItemChange = (index: number, field: keyof FormItem, value: string | number) => {
    setFormData((prev) => {
      const newItems = [...prev.items];
      newItems[index] = { ...newItems[index], [field]: value };
      return { ...prev, items: newItems };
    });
  };

  const handleCreateLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);

    const validItems = formData.items.filter(
      (item) => item.itemId && item.quantity > 0
    );

    if (validItems.length === 0) {
      toast.error("Minimal satu barang harus dipilih");
      setFormLoading(false);
      return;
    }

    const result = await createLoan({
      borrowerName: formData.borrowerName,
      borrowerPhone: formData.borrowerPhone || undefined,
      institution: formData.institution || undefined,
      loanDate: new Date(formData.loanDate),
      planReturnDate: formData.planReturnDate
        ? new Date(formData.planReturnDate)
        : null,
      notes: formData.notes || undefined,
      items: validItems,
    });

    if (result.success) {
      toast.success("Peminjaman berhasil dibuat");
      setDialogOpen(false);
      setFormData({
        borrowerName: "",
        borrowerPhone: "",
        institution: "",
        loanDate: new Date().toISOString().split("T")[0],
        planReturnDate: "",
        notes: "",
        items: [],
      });
      loadData();
    } else {
      toast.error(result.error || "Gagal membuat peminjaman");
    }
    setFormLoading(false);
  };

  const handleReturnLoan = async (loanId: string) => {
    const result = await returnLoan(loanId);
    if (result.success) {
      toast.success("Peminjaman berhasil dikembalikan");
      loadData();
    } else {
      toast.error(result.error || "Gagal mengembalikan peminjaman");
    }
  };

  const handleDeleteLoan = async (loanId: string) => {
    if (!confirm("Hapus peminjaman ini?")) return;
    const result = await deleteLoan(loanId);
    if (result.success) {
      toast.success("Peminjaman berhasil dihapus");
      loadData();
    } else {
      toast.error(result.error || "Gagal menghapus peminjaman");
    }
  };

  const filteredLoans = loans.filter((loan) => {
    const query = searchQuery.toLowerCase();
    return (
      loan.borrowerName.toLowerCase().includes(query) ||
      (loan.institution || "").toLowerCase().includes(query) ||
      loan.loanItems.some((li) => li.item.name.toLowerCase().includes(query))
    );
  });

  const now = new Date();

  const getSelectedItemQuantity = (itemId: string) => {
    const formItem = formData.items.find((i) => i.itemId === itemId);
    return formItem ? formItem.quantity : 0;
  };

  const getAvailableQuantityForItem = (itemId: string) => {
    const item = availableItems.find((i) => i.id === itemId);
    if (!item) return 0;
    const selectedInForm = formData.items
      .filter((i) => i.itemId === itemId)
      .reduce((sum, i) => sum + i.quantity, 0);
    return item.availableStock;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Peminjaman Barang</h1>
          <p className="text-muted-foreground">
            Kelola barang yang dipinjamkan ke pihak lain
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button />}>
            <Plus className="h-4 w-4" />
            Pinjamkan Barang
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <form onSubmit={handleCreateLoan}>
              <DialogHeader>
                <DialogTitle>Peminjaman Baru</DialogTitle>
                <DialogDescription>
                  Catat barang yang akan dipinjamkan ke pihak lain
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {/* Borrower Info */}
                <div className="space-y-2">
                  <Label htmlFor="borrowerName">Nama Peminjam *</Label>
                  <Input
                    id="borrowerName"
                    placeholder="Masukkan nama peminjam"
                    value={formData.borrowerName}
                    onChange={(e) =>
                      setFormData({ ...formData, borrowerName: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="borrowerPhone">No. Telepon</Label>
                    <Input
                      id="borrowerPhone"
                      placeholder="08123456789"
                      value={formData.borrowerPhone}
                      onChange={(e) =>
                        setFormData({ ...formData, borrowerPhone: e.target.value })
                      }
                    />
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

                {/* Items Selection */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Barang yang Dipinjamkan *</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddItem}
                    >
                      <Plus className="h-3 w-3" />
                      Tambah Barang
                    </Button>
                  </div>
                  {formData.items.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      Belum ada barang ditambahkan
                    </p>
                  )}
                  {formData.items.map((item, index) => {
                    const selectedItem = availableItems.find(
                      (i) => i.id === item.itemId
                    );
                    const maxStock = selectedItem
                      ? selectedItem.availableStock
                      : 0;
                    return (
                      <div key={index} className="flex items-end gap-2">
                        <div className="flex-1 space-y-1">
                          <Label className="text-xs">
                            Barang {index + 1}
                          </Label>
                          <select
                            className="flex h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
                            value={item.itemId}
                            onChange={(e) =>
                              handleItemChange(index, "itemId", e.target.value)
                            }
                            required
                          >
                            <option value="">-- Pilih Barang --</option>
                            {availableItems.map((availItem) => (
                              <option
                                key={availItem.id}
                                value={availItem.id}
                                disabled={
                                  availItem.id !== item.itemId &&
                                  getSelectedItemQuantity(availItem.id) > 0
                                }
                              >
                                {availItem.name} (Stok: {availItem.availableStock}{" "}
                                {availItem.unit})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="w-24 space-y-1">
                          <Label className="text-xs">Jumlah</Label>
                          <Input
                            type="number"
                            min={1}
                            max={maxStock}
                            placeholder="Qty"
                            value={item.quantity || ""}
                            onChange={(e) =>
                              handleItemChange(
                                index,
                                "quantity",
                                parseInt(e.target.value) || 0
                              )
                            }
                            required
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleRemoveItem(index)}
                          className="shrink-0"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    );
                  })}
                </div>

                {/* Notes */}
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
                <Button
                  type="submit"
                  disabled={formLoading}
                >
                  {formLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    "Simpan Peminjaman"
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
          placeholder="Cari peminjaman..."
          className="pl-9"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Loans Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Handshake className="h-5 w-5 text-muted-foreground" />
            Daftar Peminjaman
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredLoans.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {searchQuery
                ? "Peminjaman tidak ditemukan"
                : "Belum ada data peminjaman"}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Peminjam</TableHead>
                  <TableHead>Barang</TableHead>
                  <TableHead>Tanggal Pinjam</TableHead>
                  <TableHead>Rencana Kembali</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLoans.map((loan) => {
                  const isOverdue =
                    loan.status === "DIPINJAM" &&
                    loan.planReturnDate &&
                    new Date(loan.planReturnDate) < now;
                  const status = isOverdue ? "TERLAMBAT" : loan.status;
                  const config = getStatusConfig(status);

                  return (
                    <TableRow
                      key={loan.id}
                      className={cn(
                        isOverdue && "bg-destructive/5"
                      )}
                    >
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">
                            {loan.borrowerName}
                          </div>
                          {loan.institution && (
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                              <Building2 className="h-3 w-3" />
                              {loan.institution}
                            </div>
                          )}
                          {loan.borrowerPhone && (
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {loan.borrowerPhone}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {loan.loanItems.map((li) => (
                            <div
                              key={li.id}
                              className="flex items-center gap-1 text-sm"
                            >
                              <Package className="h-3 w-3 text-muted-foreground" />
                              {li.item.name}
                              <span className="text-muted-foreground">
                                x{li.quantity}
                              </span>
                            </div>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {formatDate(loan.loanDate)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {formatDate(loan.planReturnDate)}
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
                          {status === "DIPINJAM" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleReturnLoan(loan.id)}
                            >
                              <RotateCcw className="h-3 w-3" />
                              Kembali
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleDeleteLoan(loan.id)}
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
    </div>
  );
}