"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  StatusBadge,
  appointmentStatusVariants,
} from "@/components/shared/status-badge";
import {
  ChevronLeft,
  ChevronRight,
  MapPin,
  Clock,
  User,
  PlusIcon,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// Helpers
// ============================================================================

function getWeekDays(weekOffset: number): Date[] {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  monday.setDate(
    today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1) + weekOffset * 7
  );
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function toDateString(d: Date): string {
  return d.toISOString().split("T")[0];
}

function formatDayFull(d: Date): string {
  return d.toLocaleDateString("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function extractTime(isoString: string): string {
  // Extract HH:mm from ISO datetime or "HH:mm" string
  if (isoString.includes("T")) {
    return isoString.split("T")[1].substring(0, 5);
  }
  return isoString.substring(0, 5);
}

function extractDate(isoString: string): string {
  return isoString.split("T")[0];
}

// ============================================================================
// New Appointment Dialog
// ============================================================================

function NewAppointmentDialog() {
  const [open, setOpen] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [adviseurId, setAdviseurId] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:30");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get orders that are ready for planning
  const acceptedOrders = useQuery(api.orders.listEnriched, {
    status: "GEACCEPTEERD",
  });

  // Get adviseurs
  const adviseurs = useQuery(api.adviseurProfiles.list, {});

  // Get selected order for match scores
  const selectedOrder = acceptedOrders?.find((o) => o._id === orderId);

  // Get match scores when we have a selected order + date
  const matchScores = useQuery(
    api.adviseurProfiles.getMatchScoresForOrder,
    selectedOrder
      ? {
          orderPostcode: selectedOrder.city ?? "",
          orderBuildingType: undefined,
          preferredDate: date || undefined,
        }
      : "skip"
  );

  const createAppointment = useMutation(api.appointments.create);

  const handleSubmit = async () => {
    if (!orderId || !adviseurId || !date) return;
    setIsSubmitting(true);
    try {
      await createAppointment({
        orderId: orderId as any,
        adviseurId: adviseurId as any,
        startTime: `${date}T${startTime}:00`,
        endTime: `${date}T${endTime}:00`,
        notes: notes || undefined,
      });
      setOpen(false);
      resetForm();
    } catch (error) {
      console.error("Fout bij aanmaken afspraak:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setOrderId("");
    setAdviseurId("");
    setDate("");
    setStartTime("09:00");
    setEndTime("10:30");
    setNotes("");
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <PlusIcon className="size-4" />
        Nieuwe afspraak
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nieuwe afspraak inplannen</DialogTitle>
            <DialogDescription>
              Selecteer een opdracht, adviseur en tijdstip.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            {/* Order selection */}
            <div className="flex flex-col gap-1.5">
              <Label>Opdracht</Label>
              <Select value={orderId} onValueChange={(v) => setOrderId(v ?? "")}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecteer opdracht..." />
                </SelectTrigger>
                <SelectContent>
                  {acceptedOrders?.map((order) => (
                    <SelectItem key={order._id} value={order._id}>
                      {order.referenceCode} — {order.addressLine}, {order.city}
                    </SelectItem>
                  ))}
                  {(!acceptedOrders || acceptedOrders.length === 0) && (
                    <SelectItem value="_none" disabled>
                      Geen opdrachten beschikbaar
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Date + time */}
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="apt-date">Datum</Label>
                <Input
                  id="apt-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="apt-start">Start</Label>
                <Input
                  id="apt-start"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="apt-end">Einde</Label>
                <Input
                  id="apt-end"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>

            {/* Adviseur selection with match scores */}
            <div className="flex flex-col gap-1.5">
              <Label>Adviseur</Label>
              {matchScores && matchScores.length > 0 ? (
                <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
                  {matchScores.map((score) => (
                    <button
                      key={score.userId}
                      type="button"
                      onClick={() => setAdviseurId(score.userId)}
                      className={cn(
                        "flex items-center justify-between rounded-lg border p-2.5 text-left transition-all text-sm",
                        adviseurId === score.userId
                          ? "border-[var(--color-vv-green)] bg-[var(--color-vv-green)]/5"
                          : "hover:bg-muted/50"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <User className="size-4 text-muted-foreground" />
                        <div>
                          <span className="font-medium">
                            {score.firstName} {score.lastName}
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            {score.homeCity ?? score.homePostcode}
                            {!score.isAvailable && " — niet beschikbaar"}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Star className="size-3.5 text-yellow-500" />
                        <span
                          className={cn(
                            "text-xs font-semibold",
                            score.totalScore >= 70
                              ? "text-emerald-400"
                              : score.totalScore >= 40
                                ? "text-yellow-400"
                                : "text-red-400"
                          )}
                        >
                          {score.totalScore}%
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <Select value={adviseurId} onValueChange={(v) => setAdviseurId(v ?? "")}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecteer adviseur..." />
                  </SelectTrigger>
                  <SelectContent>
                    {adviseurs?.map((a) => (
                      <SelectItem key={a.userId} value={a.userId}>
                        {a.firstName} {a.lastName} — {a.homeCity}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Notes */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="apt-notes">Notities</Label>
              <textarea
                id="apt-notes"
                className="flex min-h-16 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                placeholder="Eventuele opmerkingen..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Annuleren
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!orderId || !adviseurId || !date || isSubmitting}
            >
              {isSubmitting ? "Inplannen..." : "Afspraak inplannen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ============================================================================
// Main Planning Page
// ============================================================================

export default function PlanningPage() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedAdviseur, setSelectedAdviseur] = useState("Alle");
  const weekDays = getWeekDays(weekOffset);

  const startDate = toDateString(weekDays[0]);
  const endDate = toDateString(weekDays[6]);

  // Real Convex query for appointments
  const rawAppointments = useQuery(api.appointments.list, {
    startDate,
    endDate,
  });

  // Get adviseurs for filter buttons
  const adviseurProfiles = useQuery(api.adviseurProfiles.list, {});

  // Build adviseur names for filter
  const adviseurNames = useMemo(() => {
    if (!adviseurProfiles) return ["Alle"];
    const names = adviseurProfiles.map((a) => `${a.firstName} ${a.lastName}`);
    return ["Alle", ...names];
  }, [adviseurProfiles]);

  // Map appointments to display format
  const appointments = useMemo(() => {
    if (!rawAppointments) return [];
    return rawAppointments.map((apt) => ({
      _id: apt._id,
      date: extractDate(apt.startTime),
      startTime: extractTime(apt.startTime),
      endTime: extractTime(apt.endTime),
      address: apt.addressLine,
      city: apt.city,
      adviseurName: apt.adviseurName,
      orderReferenceCode: apt.orderReferenceCode,
      status: apt.status,
      notes: apt.notes ?? undefined,
    }));
  }, [rawAppointments]);

  const filtered = useMemo(() => {
    if (selectedAdviseur === "Alle") return appointments;
    return appointments.filter((a) => a.adviseurName === selectedAdviseur);
  }, [appointments, selectedAdviseur]);

  const appointmentsByDate = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    for (const apt of filtered) {
      const existing = map.get(apt.date) || [];
      existing.push(apt);
      map.set(apt.date, existing);
    }
    return map;
  }, [filtered]);

  const isLoading = rawAppointments === undefined;

  const weekLabel = `${weekDays[0].toLocaleDateString("nl-NL", { day: "numeric", month: "long" })} - ${weekDays[6].toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Planning</h1>
          <p className="text-sm text-muted-foreground">
            Weekoverzicht van afspraken per adviseur
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/planning/adviseurs">
            <Button variant="outline">
              <User className="size-4" />
              Adviseurs
            </Button>
          </Link>
          <NewAppointmentDialog />
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
        {/* Week navigation */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => setWeekOffset((w) => w - 1)}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="flex-1 text-sm font-medium text-center sm:min-w-[240px] sm:flex-none">
            {weekLabel}
          </span>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => setWeekOffset((w) => w + 1)}
          >
            <ChevronRight className="size-4" />
          </Button>
          {weekOffset !== 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setWeekOffset(0)}
            >
              Vandaag
            </Button>
          )}
        </div>

        {/* Adviseur filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          {adviseurNames.map((name) => (
            <Button
              key={name}
              variant={selectedAdviseur === name ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedAdviseur(name)}
              className="shrink-0"
            >
              {name}
            </Button>
          ))}
        </div>
      </div>

      {/* Calendar week view */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-40 rounded bg-muted animate-pulse" />
              <div className="h-20 rounded-lg border border-dashed bg-muted/30 animate-pulse" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {weekDays.map((day) => {
            const dateStr = toDateString(day);
            const dayAppointments = appointmentsByDate.get(dateStr) || [];
            const isToday = dateStr === toDateString(new Date());
            const isWeekend = day.getDay() === 0 || day.getDay() === 6;

            if (isWeekend && dayAppointments.length === 0) return null;

            return (
              <div key={dateStr}>
                <div
                  className={cn(
                    "mb-2 text-sm font-medium capitalize",
                    isToday ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {formatDayFull(day)}
                  {isToday && (
                    <span className="ml-2 rounded-sm bg-primary/10 px-1.5 py-0.5 text-xs text-primary">
                      vandaag
                    </span>
                  )}
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    ({dayAppointments.length} afspraken)
                  </span>
                </div>

                {dayAppointments.length === 0 ? (
                  <div className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
                    Geen afspraken
                  </div>
                ) : (
                  <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                    {dayAppointments.map((apt) => (
                      <Card
                        key={apt._id}
                        size="sm"
                        className="cursor-pointer transition-all hover:ring-2 hover:ring-primary/20"
                      >
                        <CardContent className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-sm font-medium">
                              <Clock className="size-3.5 text-muted-foreground" />
                              {apt.startTime} - {apt.endTime}
                            </div>
                            <StatusBadge
                              status={apt.status}
                              variants={appointmentStatusVariants}
                            />
                          </div>

                          <div className="flex items-start gap-1.5 text-sm">
                            <MapPin className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                            <span>
                              {apt.address}, {apt.city}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                              <User className="size-3" />
                              {apt.adviseurName}
                            </div>
                            <span className="font-mono">
                              {apt.orderReferenceCode}
                            </span>
                          </div>

                          {apt.notes && (
                            <p className="border-t pt-1.5 text-xs text-muted-foreground">
                              {apt.notes}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
