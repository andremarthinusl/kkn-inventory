"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  FileText,
  FileSpreadsheet,
  Download,
  Package,
  Handshake,
  ArrowLeftFromLine,
  LogIn,
  LogOut,
  Calendar,
  ClipboardList,
  Loader2,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { getItems } from "@/app/(dashboard)/items/actions";
import { getLoans } from "@/app/(dashboard)/loans/actions";
import { getBorrowedItems } from "@/app/(dashboard)/borrowed-items/actions";
import { getItemTransactions as getTransactions } from "@/app/(dashboard)/items/transactions/actions";
import { getEvents } from "@/app/(dashboard)/events/actions";
import { getActivityLog } from "./actions";

const REPORTS = [
  {
    id: "inventory",
    label: "Inventaris Barang",
    desc: "Laporan seluruh barang inventaris",
    icon: Package,
    type: "inventory",
  },
  {
    id: "loans",
    label: "Barang Dipinjamkan",
    desc: "Laporan peminjaman barang ke pihak lain",
    icon: Handshake,
    type: "loans",
  },
  {
    id: "borrowed",
    label: "Barang Dipinjam",
    desc: "Laporan barang dipinjam dari pihak lain",
    icon: ArrowLeftFromLine,
    type: "borrowed",
  },
  {
    id: "transactions",
    label: "Barang Masuk / Keluar",
    desc: "Laporan transaksi barang",
    icon: LogIn,
    type: "transactions",
  },
  {
    id: "events",
    label: "Acara & Proker",
    desc: "Laporan seluruh acara dan program kerja",
    icon: Calendar,
    type: "events",
  },
  {
    id: "activity",
    label: "Riwayat Aktivitas",
    desc: "Laporan semua aktivitas pengguna",
    icon: TrendingUp,
    type: "activity",
  },
];

export default function ReportsPage() {
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);

  async function generateCSV(type: string) {
    setGenerating(type);
    try {
      let data: Record<string, unknown>[] = [];
      let headers: string[] = [];
      let rows: string[][] = [];

      switch (type) {
        case "inventory": {
          const items = await getItems();
          data = (Array.isArray(items) ? items : []) as Record<string, unknown>[];
          headers = ["Nama", "Kategori", "Lokasi", "Total Stok", "Tersedia", "Satuan", "Kondisi", "Status"];
          rows = data.map((item: Record<string, unknown>) => [
            item.name as string,
            (item.category as { name: string })?.name || "",
            (item.location as { name: string })?.name || "",
            String(item.totalStock ?? 0),
            String(item.availableStock ?? 0),
            item.unit as string,
            translateCondition(item.condition as string),
            translateStatus(item.status as string),
          ]);
          break;
        }
        case "loans": {
          const res = await getLoans();
          data = (res.success ? res.data : []) as Record<string, unknown>[];
          headers = ["Peminjam", "HP", "Instansi", "Tgl Pinjam", "Rencana Kembali", "Status", "Barang"];
          rows = data.map((loan: Record<string, unknown>) => [
            loan.borrowerName as string,
            (loan.borrowerPhone as string) || "-",
            (loan.institution as string) || "-",
            formatDate(loan.loanDate as Date),
            formatDate(loan.planReturnDate as Date | null),
            translateLoanStatus(loan.status as string),
            (loan.loanItems as Array<Record<string, unknown>>)
              ?.map((li: Record<string, unknown>) => `${(li.item as Record<string, unknown>)?.name} (${li.quantity})`)
              .join("; ") || "",
          ]);
          break;
        }
        case "borrowed": {
          const res = await getBorrowedItems();
          data = (res.success ? res.data : []) as Record<string, unknown>[];
          headers = ["Barang", "Pemilik", "HP", "Tgl Pinjam", "Rencana Kembali", "Jumlah", "Status"];
          rows = data.map((item: Record<string, unknown>) => [
            item.itemName as string,
            item.ownerName as string,
            (item.ownerPhone as string) || "-",
            formatDate(item.loanDate as Date),
            formatDate(item.planReturnDate as Date | null),
            String(item.quantity ?? 0),
            translateLoanStatus(item.status as string),
          ]);
          break;
        }
        case "transactions": {
          const res = await getTransactions();
          data = (res.success ? res.data : []) as Record<string, unknown>[];
          headers = ["Tgl", "Barang", "Tipe", "Jumlah", "Sumber/Alasan", "User"];
          rows = data.map((tx: Record<string, unknown>) => [
            formatDate(tx.createdAt as Date),
            (tx.item as Record<string, unknown>)?.name as string,
            tx.type === "MASUK" ? "Masuk" : "Keluar",
            `${tx.quantity} ${tx.unit}`,
            (tx.source as string) || (tx.reason as string) || "-",
            (tx.user as Record<string, unknown>)?.name as string || "-",
          ]);
          break;
        }
        case "events": {
          const res = await getEvents();
          data = (res.success ? res.data : []) as Record<string, unknown>[];
          headers = ["Nama Acara", "Tgl", "Waktu", "Lokasi", "PJ", "Status"];
          rows = data.map((ev: Record<string, unknown>) => [
            ev.name as string,
            formatDate(ev.date as Date),
            (ev.time as string) || "-",
            (ev.location as string) || "-",
            (ev.pic as string) || "-",
            translateEventStatus(ev.status as string),
          ]);
          break;
        }
        case "activity": {
          const res = await getActivityLog();
          data = (res.success ? res.data : []) as Record<string, unknown>[];
          headers = ["Tgl", "User", "Aktivitas", "Tipe"];
          rows = data.map((log: Record<string, unknown>) => [
            formatDate(log.createdAt as Date),
            (log.user as Record<string, unknown>)?.name as string || "-",
            log.description as string,
            (log.activityType as string) || "-",
          ]);
          break;
        }
      }

      const csvContent = [
        headers.join(","),
        ...rows.map((r) =>
          r
            .map((cell) =>
              cell.includes(",") || cell.includes('"') ? `"${cell.replace(/"/g, '""')}"` : cell
            )
            .join(",")
        ),
      ].join("\n");

      const bom = "﻿";
      const blob = new Blob([bom + csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `laporan-${type}-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Laporan berhasil diunduh");
    } catch (e) {
      console.error(e);
      toast.error("Gagal membuat laporan");
    } finally {
      setGenerating(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Laporan</h1>
        <p className="text-muted-foreground">
          Export laporan inventaris dan logistik (format CSV)
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {REPORTS.map((report) => {
          const Icon = report.icon;
          return (
            <Card key={report.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Icon className="h-4 w-4 text-primary" />
                  {report.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{report.desc}</p>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => generateCSV(report.type)}
                  disabled={generating === report.type}
                >
                  {generating === report.type ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  Export CSV
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// Helpers
function translateCondition(c: string) {
  const map: Record<string, string> = { BAIK: "Baik", RUSAK_RINGAN: "Rusak Ringan", RUSAK_BERAT: "Rusak Berat", HILANG: "Hilang" };
  return map[c] || c;
}

function translateStatus(s: string) {
  const map: Record<string, string> = { TERSEDIA: "Tersedia", DIGUNAKAN: "Digunakan", DIPINJAMKAN: "Dipinjamkan", TIDAK_TERSEDIA: "Tidak Tersedia" };
  return map[s] || s;
}

function translateLoanStatus(s: string) {
  const map: Record<string, string> = { DIPINJAM: "Dipinjam", DIKEMBALIKAN: "Dikembalikan", TERLAMBAT: "Terlambat" };
  return map[s] || s;
}

function translateEventStatus(s: string) {
  const map: Record<string, string> = { DIRENCANAKAN: "Direncanakan", BERLANGSUNG: "Berlangsung", SELESAI: "Selesai", DIBATALKAN: "Dibatalkan" };
  return map[s] || s;
}

function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}