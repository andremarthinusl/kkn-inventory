import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Package,
  Download,
  MapPin,
  FolderTree,
  Barcode,
  ClipboardList,
  ChevronLeft,
} from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ItemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const item = await prisma.item.findUnique({
    where: { id },
    include: { category: true, location: true },
  });

  if (!item || item.deletedAt) {
    notFound();
  }

  const conditionLabels: Record<string, string> = {
    BAIK: "Baik",
    RUSAK_RINGAN: "Rusak Ringan",
    RUSAK_BERAT: "Rusak Berat",
    HILANG: "Hilang",
  };

  const statusLabels: Record<string, string> = {
    TERSEDIA: "Tersedia",
    DIGUNAKAN: "Digunakan",
    DIPINJAMKAN: "Dipinjamkan",
    TIDAK_TERSEDIA: "Tidak Tersedia",
  };

  const statusColors: Record<string, string> = {
    TERSEDIA: "bg-green-100 text-green-800",
    DIGUNAKAN: "bg-blue-100 text-blue-800",
    DIPINJAMKAN: "bg-yellow-100 text-yellow-800",
    TIDAK_TERSEDIA: "bg-red-100 text-red-800",
  };

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const qrUrl = `${appUrl}/api/items/${id}/qrcode`;

  // Get recent activity for this item
  const recentActivity = await prisma.activityLog.findMany({
    where: { entityType: "Item", entityId: id },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { user: { select: { name: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/items"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Kembali
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Main Info */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-xl">{item.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {item.description || "Tidak ada deskripsi"}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                    statusColors[item.status] || ""
                  }`}
                >
                  {statusLabels[item.status] || item.status}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Total Stok</p>
                  <p className="text-lg font-semibold">
                    {item.totalStock} {item.unit}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tersedia</p>
                  <p className="text-lg font-semibold">
                    {item.availableStock} {item.unit}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Kondisi</p>
                  <p className="text-lg font-semibold">
                    {conditionLabels[item.condition] || item.condition}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <FolderTree className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Kategori</p>
                    <p className="text-sm font-medium">{item.category.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Lokasi</p>
                    <p className="text-sm font-medium">{item.location.name}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Activity History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <ClipboardList className="h-4 w-4 text-muted-foreground" />
                Riwayat Barang
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentActivity.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Belum ada riwayat
                </p>
              ) : (
                <div className="space-y-3">
                  {recentActivity.map((log) => (
                    <div key={log.id} className="flex items-start justify-between text-sm">
                      <div>
                        <p>{log.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {log.user.name}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap ml-4">
                        {new Date(log.createdAt).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* QR Code */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Barcode className="h-4 w-4 text-muted-foreground" />
                QR Code
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrUrl}
                alt={`QR Code untuk ${item.name}`}
                className="w-48 h-48"
              />
              <a
                href={qrUrl}
                download={`qrcode-${item.id}.svg`}
                className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <Download className="h-4 w-4" />
                Download QR Code
              </a>
              <p className="text-xs text-muted-foreground text-center">
                Scan QR Code untuk melihat detail barang
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}