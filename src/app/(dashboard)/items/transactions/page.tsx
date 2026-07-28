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
  Search,
  Loader2,
  Package,
  User,
  LogIn,
  LogOut,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import {
  createItemTransaction,
  getItemTransactions,
  getItemsForTransaction,
} from "./actions";
import { cn } from "@/lib/utils";

interface Item {
  id: string;
  name: string;
  availableStock: number;
  totalStock: number;
  unit: string;
}

interface Transaction {
  id: string;
  type: string;
  quantity: number;
  unit: string;
  source: string | null;
  reason: string | null;
  price: number | null;
  notes: string | null;
  createdAt: Date;
  item: Item;
  user: { name: string | null } | null;
}

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"MASUK" | "KELUAR">("MASUK");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  const [formData, setFormData] = useState({
    itemId: "",
    quantity: 1,
    source: "",
    reason: "",
    price: 0,
    notes: "",
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    const [txnResult, itemsResult] = await Promise.all([
      getItemTransactions(),
      getItemsForTransaction(),
    ]);
    if (txnResult.success) {
      setTransactions(txnResult.data);
    } else {
      toast.error(txnResult.error || "Gagal memuat data transaksi");
    }
    if (itemsResult.success) {
      setItems(itemsResult.data);
    } else {
      toast.error(itemsResult.error || "Gagal memuat data barang");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const resetForm = () => {
    setFormData({
      itemId: "",
      quantity: 1,
      source: "",
      reason: "",
      price: 0,
      notes: "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);

    const result = await createItemTransaction({
      itemId: formData.itemId,
      type: activeTab,
      quantity: formData.quantity,
      source: activeTab === "MASUK" ? formData.source : undefined,
      reason: activeTab === "KELUAR" ? formData.reason : undefined,
      price: formData.price > 0 ? formData.price : undefined,
      notes: formData.notes || undefined,
    });

    if (result.success) {
      toast.success(
        activeTab === "MASUK"
          ? "Barang masuk berhasil dicatat"
          : "Barang keluar berhasil dicatat"
      );
      setDialogOpen(false);
      resetForm();
      loadData();
    } else {
      toast.error(result.error || "Gagal mencatat transaksi");
    }
    setFormLoading(false);
  };

  const getSelectedItem = () => {
    return items.find((i) => i.id === formData.itemId);
  };

  const filteredTransactions = transactions.filter((tx) => {
    const query = searchQuery.toLowerCase();
    return (
      tx.item.name.toLowerCase().includes(query) ||
      (tx.source || "").toLowerCase().includes(query) ||
      (tx.reason || "").toLowerCase().includes(query) ||
      (tx.notes || "").toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Transaksi Barang
          </h1>
          <p className="text-muted-foreground">
            Catat barang masuk dan keluar inventaris
          </p>
        </div>
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger render={<Button />}>
            <LogIn className="h-4 w-4" />
            Tambah Transaksi
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>
                  {activeTab === "MASUK" ? "Barang Masuk" : "Barang Keluar"}
                </DialogTitle>
                <DialogDescription>
                  {activeTab === "MASUK"
                    ? "Catat penerimaan barang masuk ke inventaris"
                    : "Catat pengeluaran barang dari inventaris"}
                </DialogDescription>
              </DialogHeader>

              {/* Tab selector inside dialog */}
              <div className="flex gap-1 rounded-lg bg-muted p-1 mt-4">
                <button
                  type="button"
                  className={cn(
                    "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    activeTab === "MASUK"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => setActiveTab("MASUK")}
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <LogIn className="h-4 w-4" />
                    Barang Masuk
                  </div>
                </button>
                <button
                  type="button"
                  className={cn(
                    "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    activeTab === "KELUAR"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => setActiveTab("KELUAR")}
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <LogOut className="h-4 w-4" />
                    Barang Keluar
                  </div>
                </button>
              </div>

              <div className="space-y-4 py-4">
                {/* Item Select */}
                <div className="space-y-2">
                  <Label htmlFor="itemId">Barang *</Label>
                  <select
                    id="itemId"
                    className="flex h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
                    value={formData.itemId}
                    onChange={(e) =>
                      setFormData({ ...formData, itemId: e.target.value })
                    }
                    required
                  >
                    <option value="">-- Pilih Barang --</option>
                    {items.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} (Stok: {item.availableStock} {item.unit})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quantity */}
                <div className="space-y-2">
                  <Label htmlFor="quantity">Jumlah *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min={1}
                    max={
                      activeTab === "KELUAR" && formData.itemId
                        ? getSelectedItem()?.availableStock || 999999
                        : undefined
                    }
                    placeholder="Masukkan jumlah"
                    value={formData.quantity || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        quantity: parseInt(e.target.value) || 0,
                      })
                    }
                    required
                  />
                  {formData.itemId && activeTab === "KELUAR" && (
                    <p className="text-xs text-muted-foreground">
                      Stok tersedia: {getSelectedItem()?.availableStock || 0}{" "}
                      {getSelectedItem()?.unit || "unit"}
                    </p>
                  )}
                </div>

                {/* Source (MASUK) */}
                {activeTab === "MASUK" && (
                  <div className="space-y-2">
                    <Label htmlFor="source">Sumber Barang *</Label>
                    <Input
                      id="source"
                      placeholder="Contoh: Pembelian, Donasi, Hibah"
                      value={formData.source}
                      onChange={(e) =>
                        setFormData({ ...formData, source: e.target.value })
                      }
                      required
                    />
                  </div>
                )}

                {/* Reason (KELUAR) */}
                {activeTab === "KELUAR" && (
                  <div className="space-y-2">
                    <Label htmlFor="reason">Alasan Pengeluaran *</Label>
                    <Input
                      id="reason"
                      placeholder="Contoh: Penggunaan harian, Kegiatan"
                      value={formData.reason}
                      onChange={(e) =>
                        setFormData({ ...formData, reason: e.target.value })
                      }
                      required
                    />
                  </div>
                )}

                {/* Price (MASUK only) */}
                {activeTab === "MASUK" && (
                  <div className="space-y-2">
                    <Label htmlFor="price">Harga (opsional)</Label>
                    <Input
                      id="price"
                      type="number"
                      min={0}
                      placeholder="0"
                      value={formData.price || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          price: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                )}

                {/* Notes */}
                <div className="space-y-2">
                  <Label htmlFor="notes">Keterangan (opsional)</Label>
                  <Input
                    id="notes"
                    placeholder="Catatan tambahan"
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
                    "Simpan Transaksi"
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
          placeholder="Cari transaksi..."
          className="pl-9"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
            Riwayat Transaksi
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredTransactions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {searchQuery
                ? "Transaksi tidak ditemukan"
                : "Belum ada transaksi"}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Barang</TableHead>
                  <TableHead>Tipe</TableHead>
                  <TableHead className="text-right">Jumlah</TableHead>
                  <TableHead>Sumber / Alasan</TableHead>
                  <TableHead>Harga</TableHead>
                  <TableHead>Keterangan</TableHead>
                  <TableHead>Petugas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="text-xs">
                      {formatDate(tx.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Package className="h-3 w-3 text-muted-foreground" />
                        {tx.item.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
                          tx.type === "MASUK"
                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                        )}
                      >
                        {tx.type === "MASUK" ? (
                          <LogIn className="h-3 w-3" />
                        ) : (
                          <LogOut className="h-3 w-3" />
                        )}
                        {tx.type === "MASUK" ? "MASUK" : "KELUAR"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {tx.quantity}{" "}
                      <span className="text-xs text-muted-foreground">
                        {tx.unit}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">
                      {tx.source || tx.reason || (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {tx.price ? (
                        <span className="font-medium">
                          Rp {tx.price.toLocaleString("id-ID")}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">
                      {tx.notes || "-"}
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3 text-muted-foreground" />
                        {tx.user?.name || "-"}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}