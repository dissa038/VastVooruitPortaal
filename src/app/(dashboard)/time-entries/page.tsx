"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// Types & constants
// ============================================================================

type WorkType =
  | "OPNAME"
  | "UITWERKING"
  | "CONTROLE"
  | "REGISTRATIE"
  | "PLANNING"
  | "ADMINISTRATIE"
  | "COMMERCIEEL"
  | "REISTIJD"
  | "NIEUWBOUW_DOSSIER"
  | "OVERLEG"
  | "OVERIG";

type TimeEntry = {
  _id: string;
  date: string;
  durationMinutes: number;
  workType: WorkType;
  description?: string;
  projectName?: string;
  orderReferenceCode?: string;
};

const WORK_TYPE_CONFIG: Record<
  WorkType,
  { label: string; color: string; bgColor: string }
> = {
  OPNAME: {
    label: "Opname",
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-500/20",
  },
  UITWERKING: {
    label: "Uitwerking",
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-500/20",
  },
  CONTROLE: {
    label: "Controle",
    color: "text-cyan-600 dark:text-cyan-400",
    bgColor: "bg-cyan-500/20",
  },
  REGISTRATIE: {
    label: "Registratie",
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-500/20",
  },
  PLANNING: {
    label: "Planning",
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-500/20",
  },
  ADMINISTRATIE: {
    label: "Administratie",
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-500/20",
  },
  COMMERCIEEL: {
    label: "Commercieel",
    color: "text-pink-600 dark:text-pink-400",
    bgColor: "bg-pink-500/20",
  },
  REISTIJD: {
    label: "Reistijd",
    color: "text-muted-foreground",
    bgColor: "bg-muted",
  },
  NIEUWBOUW_DOSSIER: {
    label: "Nieuwbouw dossier",
    color: "text-teal-600 dark:text-teal-400",
    bgColor: "bg-teal-500/20",
  },
  OVERLEG: {
    label: "Overleg",
    color: "text-indigo-600 dark:text-indigo-400",
    bgColor: "bg-indigo-500/20",
  },
  OVERIG: {
    label: "Overig",
    color: "text-muted-foreground",
    bgColor: "bg-muted",
  },
};

// ============================================================================
// Date helpers
// ============================================================================

function getWeekDays(weekOffset: number): Date[] {
  const today = new Date();
  const dayOfWeek = today.getDay();
  // Monday = start of week (Dutch convention)
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

function formatDayShort(d: Date): string {
  return d.toLocaleDateString("nl-NL", { weekday: "short" });
}

function formatDayDate(d: Date): string {
  return d.toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
}

function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}u`;
  return `${h}u ${m}m`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("nl-NL", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

// ============================================================================
// Mock data
// ============================================================================

const MOCK_ENTRIES: TimeEntry[] = [
  {
    _id: "1",
    date: "2026-03-16",
    durationMinutes: 480,
    workType: "OPNAME",
    description: "5 woningen Zwolle-Zuid",
    projectName: "Woonbron Batch 12",
    orderReferenceCode: "VV-2026-0234",
  },
  {
    _id: "2",
    date: "2026-03-16",
    durationMinutes: 90,
    workType: "REISTIJD",
    description: "Zwolle -> Deventer retour",
  },
  {
    _id: "3",
    date: "2026-03-17",
    durationMinutes: 360,
    workType: "UITWERKING",
    description: "Labels batch Woonbron",
    projectName: "Woonbron Batch 12",
  },
  {
    _id: "4",
    date: "2026-03-17",
    durationMinutes: 120,
    workType: "CONTROLE",
    description: "Peer review 3 labels",
  },
  {
    _id: "5",
    date: "2026-03-18",
    durationMinutes: 240,
    workType: "OPNAME",
    description: "2 woningen particulier",
    orderReferenceCode: "VV-2026-0240",
  },
  {
    _id: "6",
    date: "2026-03-18",
    durationMinutes: 60,
    workType: "ADMINISTRATIE",
    description: "Facturen voorbereiden",
  },
  {
    _id: "7",
    date: "2026-03-18",
    durationMinutes: 30,
    workType: "OVERLEG",
    description: "Teamoverleg planning",
  },
  {
    _id: "8",
    date: "2026-03-19",
    durationMinutes: 420,
    workType: "NIEUWBOUW_DOSSIER",
    description: "Dossier controle Bouwgroep Oost",
    projectName: "Bouwgroep Oost - Fase 2",
  },
  {
    _id: "9",
    date: "2026-03-19",
    durationMinutes: 60,
    workType: "COMMERCIEEL",
    description: "Offerte uitwerken vastgoedbelegger",
  },
  {
    _id: "10",
    date: "2026-03-20",
    durationMinutes: 300,
    workType: "REGISTRATIE",
    description: "EP-Online registraties batch",
  },
];

// ============================================================================
// Component
// ============================================================================

export default function TimeEntriesPage() {
  const [weekOffset, setWeekOffset] = useState(0);
  const weekDays = getWeekDays(weekOffset);

  // TODO: const entries = useQuery(api.timeEntries.listByWeek, { startDate, endDate });
  const entries = MOCK_ENTRIES;

  // Group entries by date for week view
  const entriesByDate = useMemo(() => {
    const map = new Map<string, TimeEntry[]>();
    for (const entry of entries) {
      const existing = map.get(entry.date) || [];
      existing.push(entry);
      map.set(entry.date, existing);
    }
    return map;
  }, [entries]);

  // Total minutes per day
  function dayTotal(date: Date): number {
    const dateStr = toDateString(date);
    const dayEntries = entriesByDate.get(dateStr) || [];
    return dayEntries.reduce((sum, e) => sum + e.durationMinutes, 0);
  }

  // Week total
  const weekTotal = weekDays.reduce((sum, d) => sum + dayTotal(d), 0);

  // Week label
  const weekLabel = `${weekDays[0].toLocaleDateString("nl-NL", { day: "numeric", month: "long" })} - ${weekDays[6].toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Uurregistratie</h1>
          <p className="text-sm text-muted-foreground">
            Registreer en bekijk gewerkte uren
          </p>
        </div>
        <Button className="shrink-0">
          <Plus className="size-4" />
          Tijd registreren
        </Button>
      </div>

      <Tabs defaultValue="week">
        <div className="overflow-x-auto no-scrollbar">
          <TabsList variant="line">
            <TabsTrigger value="week">Weekoverzicht</TabsTrigger>
            <TabsTrigger value="list">Lijstweergave</TabsTrigger>
          </TabsList>
        </div>

        {/* Week View */}
        <TabsContent value="week">
          <div className="space-y-4">
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

            {/* Week grid — horizontally scrollable on mobile */}
            <div className="overflow-x-auto no-scrollbar -mx-1 px-1">
            <div className="grid grid-cols-7 gap-2 min-w-[600px]">
              {weekDays.map((day) => {
                const dateStr = toDateString(day);
                const dayEntries = entriesByDate.get(dateStr) || [];
                const total = dayTotal(day);
                const isToday = toDateString(day) === toDateString(new Date());
                const isWeekend = day.getDay() === 0 || day.getDay() === 6;

                return (
                  <Card
                    key={dateStr}
                    className={cn(
                      "min-h-[160px]",
                      isToday && "ring-2 ring-primary",
                      isWeekend && "opacity-60"
                    )}
                    size="sm"
                  >
                    <CardHeader className="pb-0">
                      <div className="flex items-center justify-between">
                        <span
                          className={cn(
                            "text-xs font-medium capitalize",
                            isToday ? "text-primary" : "text-muted-foreground"
                          )}
                        >
                          {formatDayShort(day)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDayDate(day)}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-1">
                      {dayEntries.map((entry) => {
                        const config = WORK_TYPE_CONFIG[entry.workType];
                        return (
                          <div
                            key={entry._id}
                            className={cn(
                              "rounded-sm px-1.5 py-0.5 text-xs",
                              config.bgColor,
                              config.color
                            )}
                            title={entry.description || config.label}
                          >
                            <span className="font-medium">
                              {formatMinutes(entry.durationMinutes)}
                            </span>{" "}
                            {config.label}
                          </div>
                        );
                      })}
                      {total > 0 && (
                        <div className="mt-1 border-t pt-1 text-xs font-semibold text-foreground">
                          {formatMinutes(total)}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            </div>

            {/* Week total */}
            <div className="flex justify-end">
              <div className="rounded-sm bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary">
                Weektotaal: {formatMinutes(weekTotal)}
              </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-3">
              {Object.entries(WORK_TYPE_CONFIG).map(([key, config]) => (
                <div key={key} className="flex items-center gap-1.5 text-xs">
                  <div className={cn("size-2.5 rounded-sm", config.bgColor)} />
                  <span className="text-muted-foreground">{config.label}</span>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* List View */}
        <TabsContent value="list">
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Datum</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Opdracht</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Duur</TableHead>
                    <TableHead>Beschrijving</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="h-24 text-center text-muted-foreground"
                      >
                        Geen uren geregistreerd
                      </TableCell>
                    </TableRow>
                  ) : (
                    entries.map((entry) => {
                      const config = WORK_TYPE_CONFIG[entry.workType];
                      return (
                        <TableRow key={entry._id}>
                          <TableCell className="text-muted-foreground">
                            {formatDate(entry.date)}
                          </TableCell>
                          <TableCell>
                            {entry.projectName || (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="font-medium">
                            {entry.orderReferenceCode || (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <span
                              className={cn(
                                "inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-medium",
                                config.bgColor,
                                config.color
                              )}
                            >
                              {config.label}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatMinutes(entry.durationMinutes)}
                          </TableCell>
                          <TableCell className="max-w-[300px] truncate text-muted-foreground">
                            {entry.description || "-"}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
