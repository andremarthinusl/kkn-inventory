import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Package,
  CheckCircle2,
  PlayCircle,
  Handshake,
  ArrowLeftFromLine,
  AlertTriangle,
  XCircle,
  Calendar,
  ClipboardList,
  TrendingUp,
  Clock,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  const user = session?.user;

  const now = new Date();

  const [
    totalItems,
    availableItems,
    usedItems,
    loanedItems,
    borrowedItems,
    damagedItems,
    lostItems,
    totalEvents,
    upcomingEvents,
    activeLoans,
    recentActivity,
  ] = await Promise.all([
    prisma.item.count({ where: { deletedAt: null } }),
    prisma.item.count({
      where: { deletedAt: null, condition: "BAIK", status: { not: "DIPINJAMKAN" } },
    }),
    prisma.item.count({
      where: { deletedAt: null, status: "DIGUNAKAN" },
    }),
    prisma.loan.count({
      where: { deletedAt: null, status: "DIPINJAM" },
    }),
    prisma.borrowedItem.count({
      where: { status: "DIPINJAM" },
    }),
    prisma.item.count({
      where: { deletedAt: null, condition: "RUSAK_BERAT" },
    }),
    prisma.item.count({
      where: { deletedAt: null, condition: "HILANG" },
    }),
    prisma.event.count({ where: { deletedAt: null } }),
    prisma.event.findMany({
      where: { deletedAt: null, date: { gte: now } },
      orderBy: { date: "asc" },
      take: 5,
    }),
    prisma.loan.findMany({
      where: { deletedAt: null, status: "DIPINJAM" },
      orderBy: { planReturnDate: "asc" },
      take: 5,
      include: {
        loanItems: {
          include: { item: true },
        },
      },
    }),
    prisma.activityLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { user: { select: { name: true } } },
    }),
  ]);

  const stats = [
    { label: "Total Barang", value: totalItems, icon: Package, color: "text-blue-600" },
    { label: "Tersedia", value: availableItems, icon: CheckCircle2, color: "text-green-600" },
    { label: "Digunakan", value: usedItems, icon: PlayCircle, color: "text-orange-600" },
    { label: "Dipinjamkan", value: loanedItems, icon: Handshake, color: "text-purple-600" },
    { label: "Dipinjam", value: borrowedItems, icon: ArrowLeftFromLine, color: "text-indigo-600" },
    { label: "Rusak", value: damagedItems, icon: AlertTriangle, color: "text-yellow-600" },
    { label: "Hilang", value: lostItems, icon: XCircle, color: "text-red-600" },
    { label: "Total Acara", value: totalEvents, icon: ClipboardList, color: "text-cyan-600" },
  ];

  const formatDate = (d: Date) => {
    return d.toLocaleDateString("id-ID", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Selamat datang, {user?.name || "User"}
        </h1>
        <p className="text-muted-foreground">
          Dashboard logistik KKN
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </CardTitle>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Upcoming Events */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Calendar className="h-4 w-4 text-primary" />
              Acara Mendatang
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada acara</p>
            ) : (
              <div className="space-y-3">
                {upcomingEvents.map((event) => (
                  <div key={event.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{event.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(event.date)}
                        {event.time ? ` ${event.time}` : ""}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground capitalize">
                      {event.pic || "-"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active Loans / Returns */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Clock className="h-4 w-4 text-primary" />
              Peminjaman Aktif
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeLoans.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Tidak ada peminjaman aktif
              </p>
            ) : (
              <div className="space-y-3">
                {activeLoans.map((loan) => {
                  const isOverdue =
                    loan.planReturnDate && loan.planReturnDate < now;
                  return (
                    <div
                      key={loan.id}
                      className="flex items-center justify-between"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {loan.borrowerName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {loan.loanItems
                            .map((li) => li.item.name)
                            .join(", ")}
                        </p>
                      </div>
                      <div className="text-right">
                        {loan.planReturnDate && (
                          <span
                            className={`text-xs ${
                              isOverdue
                                ? "text-destructive font-medium"
                                : "text-muted-foreground"
                            }`}
                          >
                            {isOverdue ? "Terlambat!" : formatDate(loan.planReturnDate)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <TrendingUp className="h-4 w-4 text-primary" />
              Aktivitas Terbaru
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Belum ada aktivitas
              </p>
            ) : (
              <div className="space-y-3">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">
                        {activity.description}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {activity.user.name} &middot;{" "}
                        {formatDate(activity.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}