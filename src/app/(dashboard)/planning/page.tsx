"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  StatusBadge,
  appointmentStatusVariants,
} from "@/components/shared/status-badge";
import { ChevronLeft, ChevronRight, MapPin, Clock, User } from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// Types & helpers
// ============================================================================

type Appointment = {
  _id: string;
  date: string;
  startTime: string;
  endTime: string;
  address: string;
  city: string;
  adviseurName: string;
  orderReferenceCode: string;
  status: string;
  notes?: string;
};

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

// ============================================================================
// Mock data
// ============================================================================

const MOCK_APPOINTMENTS: Appointment[] = [
  {
    _id: "1",
    date: "2026-03-16",
    startTime: "09:00",
    endTime: "10:30",
    address: "Kerkstraat 12",
    city: "Zwolle",
    adviseurName: "Jan de Vries",
    orderReferenceCode: "VV-2026-0234",
    status: "VOLTOOID",
  },
  {
    _id: "2",
    date: "2026-03-16",
    startTime: "11:00",
    endTime: "12:00",
    address: "Molenweg 45",
    city: "Zwolle",
    adviseurName: "Jan de Vries",
    orderReferenceCode: "VV-2026-0235",
    status: "VOLTOOID",
  },
  {
    _id: "3",
    date: "2026-03-17",
    startTime: "09:30",
    endTime: "11:00",
    address: "Dorpsstraat 8",
    city: "Deventer",
    adviseurName: "Pieter Jansen",
    orderReferenceCode: "VV-2026-0238",
    status: "BEVESTIGD",
  },
  {
    _id: "4",
    date: "2026-03-18",
    startTime: "10:00",
    endTime: "11:30",
    address: "Stationsplein 3",
    city: "Kampen",
    adviseurName: "Jan de Vries",
    orderReferenceCode: "VV-2026-0240",
    status: "BEVESTIGD",
  },
  {
    _id: "5",
    date: "2026-03-18",
    startTime: "13:00",
    endTime: "14:00",
    address: "Laan van Meerdervoort 99",
    city: "Zwolle",
    adviseurName: "Mark Visser",
    orderReferenceCode: "VV-2026-0241",
    status: "GEPLAND",
  },
  {
    _id: "6",
    date: "2026-03-19",
    startTime: "08:30",
    endTime: "10:00",
    address: "Nieuwbouwlaan 1-20",
    city: "Hardenberg",
    adviseurName: "Pieter Jansen",
    orderReferenceCode: "VV-2026-0243",
    status: "GEPLAND",
    notes: "Nieuwbouw oplevering, 20 woningen",
  },
  {
    _id: "7",
    date: "2026-03-20",
    startTime: "09:00",
    endTime: "10:00",
    address: "Berkenlaan 15",
    city: "Staphorst",
    adviseurName: "Jan de Vries",
    orderReferenceCode: "VV-2026-0245",
    status: "GEPLAND",
  },
  {
    _id: "8",
    date: "2026-03-20",
    startTime: "14:00",
    endTime: "15:30",
    address: "Industrieweg 42",
    city: "Meppel",
    adviseurName: "Mark Visser",
    orderReferenceCode: "VV-2026-0246",
    status: "GEPLAND",
    notes: "Bedrijfspand, sleutels ophalen bij receptie",
  },
];

// Unique adviseurs for filtering
const ADVISEURS = ["Alle", "Jan de Vries", "Pieter Jansen", "Mark Visser"];

// ============================================================================
// Component
// ============================================================================

export default function PlanningPage() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedAdviseur, setSelectedAdviseur] = useState("Alle");
  const weekDays = getWeekDays(weekOffset);

  // TODO: const appointments = useQuery(api.appointments.listByWeek, { startDate, endDate });
  const appointments = MOCK_APPOINTMENTS;

  const filtered = useMemo(() => {
    if (selectedAdviseur === "Alle") return appointments;
    return appointments.filter((a) => a.adviseurName === selectedAdviseur);
  }, [appointments, selectedAdviseur]);

  const appointmentsByDate = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const apt of filtered) {
      const existing = map.get(apt.date) || [];
      existing.push(apt);
      map.set(apt.date, existing);
    }
    return map;
  }, [filtered]);

  const weekLabel = `${weekDays[0].toLocaleDateString("nl-NL", { day: "numeric", month: "long" })} - ${weekDays[6].toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">Planning</h1>
        <p className="text-sm text-muted-foreground">
          Weekoverzicht van afspraken per adviseur
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Week navigation */}
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => setWeekOffset((w) => w - 1)}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="text-sm font-medium min-w-[240px] text-center">
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
        <div className="flex items-center gap-1.5">
          {ADVISEURS.map((name) => (
            <Button
              key={name}
              variant={selectedAdviseur === name ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedAdviseur(name)}
            >
              {name}
            </Button>
          ))}
        </div>
      </div>

      {/* Calendar week view */}
      <div className="space-y-4">
        {weekDays.map((day) => {
          const dateStr = toDateString(day);
          const dayAppointments = appointmentsByDate.get(dateStr) || [];
          const isToday = dateStr === toDateString(new Date());
          const isWeekend = day.getDay() === 0 || day.getDay() === 6;

          if (isWeekend && dayAppointments.length === 0) return null;

          return (
            <div key={dateStr}>
              {/* Day header */}
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
    </div>
  );
}
