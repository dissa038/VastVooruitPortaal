"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  ChevronLeft,
  MapPin,
  Briefcase,
  Clock,
  Car,
  Building2,
  HardHat,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { productTypeLabels } from "@/lib/format";

// ============================================================================
// Travel willingness labels
// ============================================================================

const travelLabels: Record<string, string> = {
  LOW: "Laag",
  MEDIUM: "Gemiddeld",
  HIGH: "Hoog",
};

const travelColors: Record<string, string> = {
  LOW: "text-red-400",
  MEDIUM: "text-yellow-400",
  HIGH: "text-emerald-400",
};

// ============================================================================
// Component
// ============================================================================

export default function AdviseursPage() {
  const adviseurs = useQuery(api.adviseurProfiles.list, {});
  const toggleAvailability = useMutation(api.adviseurProfiles.toggleAvailability);

  const isLoading = adviseurs === undefined;

  const handleToggle = async (profileId: string, currentValue: boolean) => {
    await toggleAvailability({
      id: profileId as any,
      isAvailable: !currentValue,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/planning">
            <Button variant="outline" size="icon-sm">
              <ChevronLeft className="size-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold">EP-Adviseurs</h1>
            <p className="text-sm text-muted-foreground">
              Beheer adviseurprofielen, specialisaties en beschikbaarheid
            </p>
          </div>
        </div>
      </div>

      {/* Stats strip */}
      {adviseurs && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card size="sm">
            <CardContent>
              <p className="text-xs text-muted-foreground">Totaal adviseurs</p>
              <p className="text-2xl font-semibold">{adviseurs.length}</p>
            </CardContent>
          </Card>
          <Card size="sm">
            <CardContent>
              <p className="text-xs text-muted-foreground">Beschikbaar</p>
              <p className="text-2xl font-semibold text-emerald-400">
                {adviseurs.filter((a) => a.isAvailable).length}
              </p>
            </CardContent>
          </Card>
          <Card size="sm">
            <CardContent>
              <p className="text-xs text-muted-foreground">Niet beschikbaar</p>
              <p className="text-2xl font-semibold text-red-400">
                {adviseurs.filter((a) => !a.isAvailable).length}
              </p>
            </CardContent>
          </Card>
          <Card size="sm">
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Totale weekcapaciteit
              </p>
              <p className="text-2xl font-semibold">
                {adviseurs.reduce((sum, a) => sum + a.weeklyCapacityHours, 0)}u
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Adviseur</TableHead>
                <TableHead>Locatie</TableHead>
                <TableHead>Specialisaties</TableHead>
                <TableHead>Reisbereidheid</TableHead>
                <TableHead>Capaciteit</TableHead>
                <TableHead>Beschikbaar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-10 rounded-full" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : adviseurs && adviseurs.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Adviseur</TableHead>
                <TableHead>Locatie</TableHead>
                <TableHead className="hidden md:table-cell">Specialisaties</TableHead>
                <TableHead className="hidden lg:table-cell">Reisbereidheid</TableHead>
                <TableHead className="hidden sm:table-cell">Capaciteit</TableHead>
                <TableHead>Beschikbaar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {adviseurs.map((adviseur) => (
                <TableRow key={adviseur._id}>
                  <TableCell>
                    <div>
                      <span className="font-medium text-foreground">
                        {adviseur.firstName} {adviseur.lastName}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {adviseur.email}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-sm">
                      <MapPin className="size-3.5 text-muted-foreground" />
                      <div>
                        <span>{adviseur.homeCity}</span>
                        <span className="block text-xs text-muted-foreground">
                          {adviseur.homePostcode}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {adviseur.specializations.map((spec) => (
                        <Badge
                          key={spec}
                          variant="outline"
                          className="text-[10px]"
                        >
                          {productTypeLabels[spec] ?? spec}
                        </Badge>
                      ))}
                      {adviseur.canDoNieuwbouw && (
                        <Badge variant="outline" className="text-[10px] border-cyan-500/30 text-cyan-400">
                          <HardHat className="size-2.5 mr-0.5" />
                          Nieuwbouw
                        </Badge>
                      )}
                      {adviseur.canDoUtiliteit && (
                        <Badge variant="outline" className="text-[10px] border-purple-500/30 text-purple-400">
                          <Building2 className="size-2.5 mr-0.5" />
                          Utiliteit
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <div className="flex items-center gap-1.5">
                      <Car className="size-3.5 text-muted-foreground" />
                      <span
                        className={cn(
                          "text-sm",
                          travelColors[adviseur.travelWillingness] ?? ""
                        )}
                      >
                        {travelLabels[adviseur.travelWillingness] ?? adviseur.travelWillingness}
                      </span>
                      {adviseur.maxTravelDistanceKm && (
                        <span className="text-xs text-muted-foreground">
                          (max {adviseur.maxTravelDistanceKm} km)
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <div className="flex items-center gap-1.5">
                      <Clock className="size-3.5 text-muted-foreground" />
                      <span className="text-sm">
                        {adviseur.weeklyCapacityHours}u/week
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={adviseur.isAvailable}
                      onCheckedChange={() =>
                        handleToggle(adviseur._id, adviseur.isAvailable)
                      }
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed bg-card/50 py-16">
          <div className="text-center">
            <h3 className="text-sm font-medium text-foreground">
              Nog geen adviseurprofielen
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Maak profielen aan voor EP-adviseurs om de planning te activeren.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
