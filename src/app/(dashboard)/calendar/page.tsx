"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  MapPin,
  User,
  Package,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
} from "date-fns";
import { id } from "date-fns/locale";
import { getEvents } from "../events/actions";

type EventItemData = {
  id: string;
  eventId: string;
  itemId: string;
  quantityNeeded: number;
  quantityPrepared: number;
  notes: string | null;
  status: string;
  item: { id: string; name: string; unit: string };
};

type EventWithItems = {
  id: string;
  name: string;
  date: Date;
  time: string | null;
  location: string | null;
  pic: string | null;
  description: string | null;
  status: string;
  eventItems: EventItemData[];
};

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  DIRENCANAKAN: { label: "Direncanakan", color: "text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30", dot: "bg-blue-500" },
  BERLANGSUNG: { label: "Berlangsung", color: "text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-900/30", dot: "bg-amber-500" },
  SELESAI: { label: "Selesai", color: "text-emerald-600 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/30", dot: "bg-emerald-500" },
  DIBATALKAN: { label: "Dibatalkan", color: "text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30", dot: "bg-red-500" },
};

const ITEM_STATUS_CONFIG: Record<string, { label: string }> = {
  BELUM: { label: "Belum" },
  SEBAGIAN: { label: "Sebagian" },
  SIAP: { label: "Siap" },
  SELESAI: { label: "Selesai" },
};

const DAY_NAMES = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

export default function CalendarPage() {
  const [events, setEvents] = useState<EventWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedDateEvents, setSelectedDateEvents] = useState<EventWithItems[]>([]);
  const [selectedDateStr, setSelectedDateStr] = useState("");

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getEvents();
      if (res.success) {
        setEvents(res.data);
      } else {
        toast.error(res.error);
      }
    } catch {
      toast.error("Gagal memuat data acara");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart);
  const calEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  function prevMonth() {
    setCurrentMonth((prev) => subMonths(prev, 1));
  }

  function nextMonth() {
    setCurrentMonth((prev) => addMonths(prev, 1));
  }

  function getEventsForDay(day: Date): EventWithItems[] {
    return events.filter((event) => isSameDay(new Date(event.date), day));
  }

  function handleDayClick(day: Date) {
    const dayEvents = getEventsForDay(day);
    if (dayEvents.length === 0) return;
    setSelectedDateEvents(dayEvents);
    setSelectedDateStr(format(day, "EEEE, dd MMMM yyyy", { locale: id }));
    setDetailOpen(true);
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Kalender</h1>
          <p className="text-muted-foreground">Lihat jadwal acara dan pengembalian barang</p>
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-48" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: 35 }).map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-lg" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Kalender</h1>
        <p className="text-muted-foreground">Lihat jadwal acara dan program kerja</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarIcon className="h-5 w-5 text-muted-foreground" />
              {format(currentMonth, "MMMM yyyy", { locale: id })}
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon-sm" onClick={prevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentMonth(new Date())}
                className="text-xs font-normal"
              >
                Hari Ini
              </Button>
              <Button variant="ghost" size="icon-sm" onClick={nextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Day names header */}
          <div className="grid grid-cols-7 mb-1">
            {DAY_NAMES.map((name) => (
              <div
                key={name}
                className="text-center text-xs font-medium text-muted-foreground py-2"
              >
                <span className="hidden sm:inline">{name}</span>
                <span className="sm:hidden">{name.charAt(0)}</span>
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
            {days.map((day) => {
              const dayEvents = getEventsForDay(day);
              const inMonth = isSameMonth(day, currentMonth);
              const today = isToday(day);

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => handleDayClick(day)}
                  disabled={dayEvents.length === 0}
                  className={cn(
                    "relative flex flex-col items-center justify-start p-1.5 min-h-[80px] sm:min-h-[100px] transition-colors",
                    "bg-card hover:bg-muted/50",
                    !inMonth && "opacity-40",
                    !inMonth && "pointer-events-none",
                    dayEvents.length === 0 && "cursor-default hover:bg-card",
                    today && "ring-2 ring-primary ring-inset rounded-md"
                  )}
                >
                  <span
                    className={cn(
                      "text-xs sm:text-sm font-medium mb-1",
                      today && "text-primary font-bold",
                      !inMonth && "text-muted-foreground"
                    )}
                  >
                    {format(day, "d")}
                  </span>
                  <div className="flex flex-col gap-0.5 w-full items-center">
                    {dayEvents.slice(0, 2).map((event) => {
                      const config = STATUS_CONFIG[event.status] || STATUS_CONFIG.DIRENCANAKAN;
                      return (
                        <div
                          key={event.id}
                          className={cn(
                            "hidden sm:flex items-center gap-1 w-full rounded px-1 py-0.5 text-[10px] leading-tight truncate",
                            config.color
                          )}
                        >
                          <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", config.dot)} />
                          <span className="truncate">{event.name}</span>
                        </div>
                      );
                    })}
                    {dayEvents.length === 1 && (
                      <div className="sm:hidden">
                        <span className={cn("block w-1.5 h-1.5 rounded-full", STATUS_CONFIG[dayEvents[0].status]?.dot || "bg-blue-500")} />
                      </div>
                    )}
                    {dayEvents.length > 1 && (
                      <div className="sm:hidden flex -space-x-1">
                        {dayEvents.slice(0, 3).map((event) => (
                          <span
                            key={event.id}
                            className={cn(
                              "block w-1.5 h-1.5 rounded-full ring-1 ring-card",
                              STATUS_CONFIG[event.status]?.dot || "bg-blue-500"
                            )}
                          />
                        ))}
                        {dayEvents.length > 3 && (
                          <span className="text-[9px] text-muted-foreground ml-0.5">+{dayEvents.length - 3}</span>
                        )}
                      </div>
                    )}
                    {dayEvents.length > 2 && (
                      <span className="hidden sm:block text-[10px] text-muted-foreground mt-0.5">
                        +{dayEvents.length - 2} lainnya
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-4">
            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
              <div key={key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className={cn("w-2 h-2 rounded-full", config.dot)} />
                {config.label}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Upcoming events summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            Acara {format(currentMonth, "MMMM yyyy", { locale: id })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {events.filter((e) => isSameMonth(new Date(e.date), currentMonth)).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Tidak ada acara pada bulan ini
            </p>
          ) : (
            <div className="space-y-2">
              {events
                .filter((e) => isSameMonth(new Date(e.date), currentMonth))
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                .map((event) => {
                  const config = STATUS_CONFIG[event.status] || STATUS_CONFIG.DIRENCANAKAN;
                  return (
                    <button
                      key={event.id}
                      onClick={() => {
                        setSelectedDateEvents([event]);
                        setSelectedDateStr(format(new Date(event.date), "EEEE, dd MMMM yyyy", { locale: id }));
                        setDetailOpen(true);
                      }}
                      className="flex items-center gap-3 w-full rounded-lg border p-3 text-left hover:bg-muted/50 transition-colors"
                    >
                      {/* Date column */}
                      <div className="flex flex-col items-center justify-center w-12 shrink-0">
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(event.date), "MMM", { locale: id })}
                        </span>
                        <span className="text-lg font-bold leading-tight">
                          {format(new Date(event.date), "dd")}
                        </span>
                      </div>
                      {/* Event info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{event.name}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                          {event.time && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {event.time}
                            </span>
                          )}
                          {event.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {event.location}
                            </span>
                          )}
                          {event.pic && (
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {event.pic}
                            </span>
                          )}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium shrink-0",
                          config.color
                        )}
                      >
                        <span className={cn("w-1.5 h-1.5 rounded-full mr-1", config.dot)} />
                        {config.label}
                      </span>
                    </button>
                  );
                })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Event Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedDateStr || "Detail Acara"}
            </DialogTitle>
            <DialogDescription>
              {selectedDateEvents.length} acara pada tanggal ini
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedDateEvents.map((event) => {
              const config = STATUS_CONFIG[event.status] || STATUS_CONFIG.DIRENCANAKAN;
              const totalItems = event.eventItems.length;
              const preparedCount = event.eventItems.filter(
                (ei) => ei.status === "SIAP" || ei.status === "SELESAI"
              ).length;
              const progress = totalItems > 0 ? Math.round((preparedCount / totalItems) * 100) : 0;

              return (
                <div key={event.id} className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-medium text-sm">{event.name}</h3>
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium mt-1",
                          config.color
                        )}
                      >
                        <span className={cn("w-1.5 h-1.5 rounded-full mr-1", config.dot)} />
                        {config.label}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <CalendarIcon className="h-3 w-3" />
                      {format(new Date(event.date), "dd MMM yyyy", { locale: id })}
                    </span>
                    {event.time && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {event.time}
                      </span>
                    )}
                    {event.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {event.location}
                      </span>
                    )}
                    {event.pic && (
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {event.pic}
                      </span>
                    )}
                  </div>

                  {event.description && (
                    <p className="text-xs text-muted-foreground">{event.description}</p>
                  )}

                  {/* Progress */}
                  {totalItems > 0 && (
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="flex items-center gap-1">
                          <Package className="h-3 w-3 text-muted-foreground" />
                          Persiapan Barang
                        </span>
                        <span className="font-medium">{preparedCount}/{totalItems} ({progress}%)</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            progress === 100 ? "bg-emerald-500" : "bg-primary"
                          )}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Item List */}
                  {event.eventItems.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium text-muted-foreground">Kebutuhan Barang:</p>
                      {event.eventItems.map((ei) => {
                        const shortage = ei.quantityNeeded - ei.quantityPrepared;
                        const statusLabel = ITEM_STATUS_CONFIG[ei.status]?.label || ei.status;
                        return (
                          <div
                            key={ei.id}
                            className="flex items-center justify-between rounded-md bg-muted/50 px-2.5 py-2 text-xs"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="font-medium truncate">{ei.item.name}</p>
                              <p className="text-muted-foreground">
                                Butuh: {ei.quantityNeeded} {ei.item.unit}
                                {ei.quantityPrepared > 0 && ` | Disiapkan: ${ei.quantityPrepared}`}
                                {shortage > 0 && (
                                  <span className="text-destructive ml-1">
                                    (Kurang: {shortage} {ei.item.unit})
                                  </span>
                                )}
                              </p>
                            </div>
                            <span
                              className={cn(
                                "inline-flex items-center rounded-full px-1.5 py-0.5 font-medium shrink-0 ml-2",
                                ei.status === "SIAP" || ei.status === "SELESAI"
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                  : ei.status === "SEBAGIAN"
                                  ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                  : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                              )}
                            >
                              {statusLabel}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {event.eventItems.length === 0 && (
                    <p className="text-xs text-muted-foreground italic">
                      Belum ada kebutuhan barang yang dicatat
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Tutup
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}