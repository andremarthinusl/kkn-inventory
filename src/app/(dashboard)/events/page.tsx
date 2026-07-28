"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Plus,
  MoreVertical,
  Pencil,
  Trash2,
  Package,
  Loader2,
  BadgeAlert,
  BadgeCheck,
  BadgeX,
  Eye,
  ClipboardList,
  CircleDot,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import {
  getEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  addEventItem,
  updateEventItem,
  removeEventItem,
  getItems,
} from "./actions";

type EventWithItems = {
  id: string;
  name: string;
  date: Date;
  time: string | null;
  location: string | null;
  pic: string | null;
  description: string | null;
  status: string;
  eventItems: Array<{
    id: string;
    eventId: string;
    itemId: string;
    quantityNeeded: number;
    quantityPrepared: number;
    notes: string | null;
    status: string;
    item: { id: string; name: string; unit: string };
  }>;
};
type Item = { id: string; name: string; availableStock: number; unit: string; }; // simplified from getItems return

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  DIRENCANAKAN: { label: "Direncanakan", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", icon: CircleDot },
  BERLANGSUNG: { label: "Berlangsung", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", icon: BadgeAlert },
  SELESAI: { label: "Selesai", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400", icon: BadgeCheck },
  DIBATALKAN: { label: "Dibatalkan", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400", icon: BadgeX },
};

const ITEM_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  BELUM: { label: "Belum", color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" },
  SEBAGIAN: { label: "Sebagian", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  SIAP: { label: "Siap", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  SELESAI: { label: "Selesai", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
};

const STATUS_OPTIONS = [
  { value: "DIRENCANAKAN", label: "Direncanakan" },
  { value: "BERLANGSUNG", label: "Berlangsung" },
  { value: "SELESAI", label: "Selesai" },
  { value: "DIBATALKAN", label: "Dibatalkan" },
];

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.DIRENCANAKAN;
  const Icon = config.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium", config.color)}>
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}

function ItemStatusBadge({ status }: { status: string }) {
  const config = ITEM_STATUS_CONFIG[status] || ITEM_STATUS_CONFIG.BELUM;
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", config.color)}>
      {config.label}
    </span>
  );
}

export default function EventsPage() {
  const [events, setEvents] = useState<EventWithItems[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formOpen, setFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventWithItems | null>(null);
  const [formName, setFormName] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formTime, setFormTime] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formPic, setFormPic] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formStatus, setFormStatus] = useState("DIRENCANAKAN");

  // Item dialog state
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventWithItems | null>(null);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [itemQuantity, setItemQuantity] = useState(1);

  // Detail dialog state
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailEvent, setDetailEvent] = useState<EventWithItems | null>(null);

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingEvent, setDeletingEvent] = useState<EventWithItems | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [eventsRes, itemsRes] = await Promise.all([getEvents(), getItems()]);
      if (eventsRes.success) {
        setEvents(eventsRes.data);
      } else {
        toast.error(eventsRes.error);
      }
      if (itemsRes.success) {
        setItems(itemsRes.data);
      } else {
        toast.error(itemsRes.error);
      }
    } catch {
      toast.error("Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function resetForm() {
    setFormName("");
    setFormDate("");
    setFormTime("");
    setFormLocation("");
    setFormPic("");
    setFormDescription("");
    setFormStatus("DIRENCANAKAN");
    setEditingEvent(null);
  }

  function openAddForm() {
    resetForm();
    setFormOpen(true);
  }

  function openEditForm(event: EventWithItems) {
    setEditingEvent(event);
    setFormName(event.name);
    setFormDate(format(new Date(event.date), "yyyy-MM-dd"));
    setFormTime(event.time || "");
    setFormLocation(event.location || "");
    setFormPic(event.pic || "");
    setFormDescription(event.description || "");
    setFormStatus(event.status);
    setFormOpen(true);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);

    try {
      if (editingEvent) {
        const res = await updateEvent(editingEvent.id, {
          name: formName,
          date: formDate,
          time: formTime || undefined,
          location: formLocation || undefined,
          pic: formPic || undefined,
          description: formDescription || undefined,
          status: formStatus,
        });
        if (res.success) {
          toast.success("Acara berhasil diperbarui");
          setFormOpen(false);
          fetchData();
        } else {
          toast.error(res.error);
        }
      } else {
        const res = await createEvent({
          name: formName,
          date: formDate,
          time: formTime || undefined,
          location: formLocation || undefined,
          pic: formPic || undefined,
          description: formDescription || undefined,
          status: formStatus,
        });
        if (res.success) {
          toast.success("Acara berhasil dibuat");
          setFormOpen(false);
          fetchData();
        } else {
          toast.error(res.error);
        }
      }
    } catch {
      toast.error("Terjadi kesalahan");
    } finally {
      setSubmitting(false);
    }
  }

  function openItemDialog(event: EventWithItems) {
    setSelectedEvent(event);
    setSelectedItemId("");
    setItemQuantity(1);
    setItemDialogOpen(true);
  }

  async function handleAddItem() {
    if (!selectedEvent || !selectedItemId || itemQuantity < 1) {
      toast.error("Pilih barang dan masukkan jumlah");
      return;
    }
    setSubmitting(true);
    try {
      const res = await addEventItem({
        eventId: selectedEvent.id,
        itemId: selectedItemId,
        quantityNeeded: itemQuantity,
      });
      if (res.success) {
        toast.success("Barang berhasil ditambahkan");
        setItemDialogOpen(false);
        fetchData();
      } else {
        toast.error(res.error);
      }
    } catch {
      toast.error("Terjadi kesalahan");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemoveItem(itemId: string) {
    try {
      const res = await removeEventItem(itemId);
      if (res.success) {
        toast.success("Barang berhasil dihapus dari acara");
        fetchData();
      } else {
        toast.error(res.error);
      }
    } catch {
      toast.error("Terjadi kesalahan");
    }
  }

  async function handleUpdateItemStatus(itemId: string, status: string) {
    try {
      const res = await updateEventItem(itemId, { status });
      if (res.success) {
        toast.success("Status barang diperbarui");
        fetchData();
      } else {
        toast.error(res.error);
      }
    } catch {
      toast.error("Terjadi kesalahan");
    }
  }

  async function handleUpdateItemQuantity(itemId: string, quantityPrepared: number) {
    try {
      const res = await updateEventItem(itemId, { quantityPrepared });
      if (res.success) {
        fetchData();
      } else {
        toast.error(res.error);
      }
    } catch {
      toast.error("Terjadi kesalahan");
    }
  }

  function openDetail(event: EventWithItems) {
    setDetailEvent(event);
    setDetailOpen(true);
  }

  function confirmDelete(event: EventWithItems) {
    setDeletingEvent(event);
    setDeleteDialogOpen(true);
  }

  async function handleDelete() {
    if (!deletingEvent) return;
    setSubmitting(true);
    try {
      const res = await deleteEvent(deletingEvent.id);
      if (res.success) {
        toast.success("Acara berhasil dihapus");
        setDeleteDialogOpen(false);
        setDeletingEvent(null);
        fetchData();
      } else {
        toast.error(res.error);
      }
    } catch {
      toast.error("Terjadi kesalahan");
    } finally {
      setSubmitting(false);
    }
  }

  function getItemsNotInEvent(): Item[] {
    if (!selectedEvent) return items;
    const addedItemIds = new Set(selectedEvent.eventItems.map((ei) => ei.itemId));
    return items.filter((item) => !addedItemIds.has(item.id));
  }

  const upcomingEvents = events.filter((e) => e.status === "DIRENCANAKAN" || e.status === "BERLANGSUNG");
  const pastEvents = events.filter((e) => e.status === "SELESAI" || e.status === "DIBATALKAN");

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Acara / Program Kerja</h1>
          <p className="text-muted-foreground">Kelola seluruh acara dan program kerja KKN</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Acara / Program Kerja</h1>
          <p className="text-muted-foreground">Kelola seluruh acara dan program kerja KKN</p>
        </div>
        <Button onClick={openAddForm}>
          <Plus className="h-4 w-4" />
          Tambah Acara
        </Button>
      </div>

      {/* Upcoming Events */}
      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          Acara Mendatang / Berlangsung
          <span className="text-sm font-normal text-muted-foreground">({upcomingEvents.length})</span>
        </h2>
        {upcomingEvents.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <Calendar className="mx-auto h-8 w-8 text-muted-foreground/50" />
                <p className="mt-2 text-sm text-muted-foreground">Belum ada acara mendatang</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={openAddForm}>
                  <Plus className="h-4 w-4" />
                  Buat Acara Baru
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {upcomingEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onEdit={() => openEditForm(event)}
                onDelete={() => confirmDelete(event)}
                onDetail={() => openDetail(event)}
                onAddItem={() => openItemDialog(event)}
                onRemoveItem={handleRemoveItem}
                onUpdateItemStatus={handleUpdateItemStatus}
                onUpdateItemQuantity={handleUpdateItemQuantity}
              />
            ))}
          </div>
        )}
      </div>

      {/* Past Events */}
      {pastEvents.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
            Riwayat Acara
            <span className="text-sm font-normal text-muted-foreground">({pastEvents.length})</span>
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pastEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onEdit={() => openEditForm(event)}
                onDelete={() => confirmDelete(event)}
                onDetail={() => openDetail(event)}
                onAddItem={() => openItemDialog(event)}
                onRemoveItem={handleRemoveItem}
                onUpdateItemStatus={handleUpdateItemStatus}
                onUpdateItemQuantity={handleUpdateItemQuantity}
              />
            ))}
          </div>
        </div>
      )}

      {/* Add/Edit Event Dialog */}
      <Dialog open={formOpen} onOpenChange={(open) => { if (!open) resetForm(); setFormOpen(open); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingEvent ? "Edit Acara" : "Tambah Acara"}</DialogTitle>
            <DialogDescription>
              {editingEvent ? "Ubah informasi acara yang sudah ada" : "Buat acara atau program kerja baru"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nama Acara</Label>
              <Input
                id="name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Nama acara / program kerja"
                required
                disabled={submitting}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Tanggal</Label>
                <Input
                  id="date"
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  required
                  disabled={submitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time">Waktu</Label>
                <Input
                  id="time"
                  type="time"
                  value={formTime}
                  onChange={(e) => setFormTime(e.target.value)}
                  disabled={submitting}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Lokasi</Label>
              <Input
                id="location"
                value={formLocation}
                onChange={(e) => setFormLocation(e.target.value)}
                placeholder="Tempat pelaksanaan"
                disabled={submitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pic">Penanggung Jawab (PIC)</Label>
              <Input
                id="pic"
                value={formPic}
                onChange={(e) => setFormPic(e.target.value)}
                placeholder="Nama penanggung jawab"
                disabled={submitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Deskripsi</Label>
              <textarea
                id="description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Deskripsi acara (opsional)"
                className="h-20 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 resize-none dark:bg-input/30"
                disabled={submitting}
              />
            </div>
            {editingEvent && (
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value)}
                  className="h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 dark:bg-input/30"
                  disabled={submitting}
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            )}
            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>
                Batal
              </DialogClose>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  editingEvent ? "Simpan Perubahan" : "Buat Acara"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Item Dialog */}
      <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah Kebutuhan Barang</DialogTitle>
            <DialogDescription>
              {selectedEvent ? `Tambahkan barang untuk "${selectedEvent.name}"` : "Pilih barang yang dibutuhkan"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="item">Barang</Label>
              <select
                id="item"
                value={selectedItemId}
                onChange={(e) => setSelectedItemId(e.target.value)}
                className="h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 dark:bg-input/30"
              >
                <option value="">-- Pilih Barang --</option>
                {getItemsNotInEvent().map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} (Stok: {item.availableStock} {item.unit})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity">Jumlah Dibutuhkan</Label>
              <Input
                id="quantity"
                type="number"
                min={1}
                value={itemQuantity}
                onChange={(e) => setItemQuantity(parseInt(e.target.value) || 1)}
                disabled={submitting}
              />
            </div>
            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>
                Batal
              </DialogClose>
              <Button onClick={handleAddItem} disabled={submitting || !selectedItemId}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Menambahkan...
                  </>
                ) : (
                  "Tambah Barang"
                )}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-lg">
          {detailEvent && (
            <>
              <DialogHeader>
                <DialogTitle>{detailEvent.name}</DialogTitle>
                <DialogDescription>
                  <StatusBadge status={detailEvent.status} />
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>{format(new Date(detailEvent.date), "EEEE, dd MMMM yyyy", { locale: id })}</span>
                  </div>
                  {detailEvent.time && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>{detailEvent.time}</span>
                    </div>
                  )}
                  {detailEvent.location && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{detailEvent.location}</span>
                    </div>
                  )}
                  {detailEvent.pic && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <User className="h-4 w-4" />
                      <span>{detailEvent.pic}</span>
                    </div>
                  )}
                </div>
                {detailEvent.description && (
                  <p className="text-sm text-muted-foreground">{detailEvent.description}</p>
                )}

                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    Kebutuhan Barang ({detailEvent.eventItems.length})
                  </h4>
                  {detailEvent.eventItems.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Belum ada barang yang ditambahkan</p>
                  ) : (
                    <div className="space-y-2">
                      {detailEvent.eventItems.map((ei) => (
                        <div key={ei.id} className="flex items-center justify-between rounded-lg border p-2.5 text-sm">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{ei.item.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Butuh: {ei.quantityNeeded} {ei.item.unit}
                              {ei.quantityPrepared > 0 && (
                                <> | Disiapkan: {ei.quantityPrepared} {ei.item.unit}</>
                              )}
                              {ei.quantityPrepared < ei.quantityNeeded && (
                                <> | Kurang: {ei.quantityNeeded - ei.quantityPrepared} {ei.item.unit}</>
                              )}
                            </p>
                          </div>
                          <ItemStatusBadge status={ei.status} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter>
                <DialogClose render={<Button variant="outline" />}>
                  Tutup
                </DialogClose>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Hapus Acara</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus acara ini? Data akan diarsipkan (soft delete).
            </DialogDescription>
          </DialogHeader>
          {deletingEvent && (
            <p className="text-sm font-medium">{deletingEvent.name}</p>
          )}
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Batal
            </DialogClose>
            <Button variant="destructive" onClick={handleDelete} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Menghapus...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Hapus
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Event Card sub-component
function EventCard({
  event,
  onEdit,
  onDelete,
  onDetail,
  onAddItem,
  onRemoveItem,
  onUpdateItemStatus,
  onUpdateItemQuantity,
}: {
  event: EventWithItems;
  onEdit: () => void;
  onDelete: () => void;
  onDetail: () => void;
  onAddItem: () => void;
  onRemoveItem: (id: string) => void;
  onUpdateItemStatus: (id: string, status: string) => void;
  onUpdateItemQuantity: (id: string, quantity: number) => void;
}) {
  const totalItems = event.eventItems.length;
  const preparedItems = event.eventItems.filter((ei) => ei.status === "SIAP" || ei.status === "SELESAI").length;
  const progress = totalItems > 0 ? Math.round((preparedItems / totalItems) * 100) : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-sm truncate">{event.name}</CardTitle>
            <CardDescription className="flex flex-col gap-0.5 mt-1">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(new Date(event.date), "dd MMM yyyy", { locale: id })}
                {event.time && (
                  <>
                    <Clock className="h-3 w-3 ml-1" />
                    {event.time}
                  </>
                )}
              </span>
              <StatusBadge status={event.status} />
            </CardDescription>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger className="shrink-0">
              <Button variant="ghost" size="icon-sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onDetail}>
                <Eye className="h-4 w-4" />
                Detail
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onAddItem}>
                <Plus className="h-4 w-4" />
                Tambah Barang
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={onDelete}>
                <Trash2 className="h-4 w-4" />
                Hapus
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Event Info */}
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
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

        {/* Progress Bar */}
        {totalItems > 0 && (
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">Persiapan Barang</span>
              <span className="font-medium">{preparedItems}/{totalItems} ({progress}%)</span>
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
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Package className="h-3 w-3" />
              Kebutuhan Barang
            </p>
            {event.eventItems.slice(0, 3).map((ei) => (
              <div key={ei.id} className="flex items-center justify-between rounded-md bg-muted/50 px-2 py-1.5">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium truncate">{ei.item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {ei.quantityNeeded} {ei.item.unit}
                    {ei.quantityPrepared > 0 && ` (siap: ${ei.quantityPrepared})`}
                    {ei.quantityNeeded - ei.quantityPrepared > 0 && (
                      <span className="text-destructive"> - kurang {ei.quantityNeeded - ei.quantityPrepared}</span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-1 ml-2">
                  <ItemStatusBadge status={ei.status} />
                  <DropdownMenu>
                    <DropdownMenuTrigger>
                      <Button variant="ghost" size="icon-xs">
                        <MoreVertical className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" sideOffset={2}>
                      <DropdownMenuItem onClick={() => onUpdateItemStatus(ei.id, "BELUM")}>Belum</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onUpdateItemStatus(ei.id, "SEBAGIAN")}>Sebagian</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onUpdateItemStatus(ei.id, "SIAP")}>Siap</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onUpdateItemStatus(ei.id, "SELESAI")}>Selesai</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem variant="destructive" onClick={() => onRemoveItem(ei.id)}>
                        Hapus
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
            {event.eventItems.length > 3 && (
              <button
                onClick={onDetail}
                className="w-full text-xs text-muted-foreground hover:text-foreground text-center py-1"
              >
                +{event.eventItems.length - 3} barang lainnya
              </button>
            )}
          </div>
        )}

        {event.eventItems.length === 0 && (
          <Button variant="outline" size="sm" className="w-full" onClick={onAddItem}>
            <Plus className="h-3 w-3" />
            Tambah Kebutuhan Barang
          </Button>
        )}
      </CardContent>
    </Card>
  );
}