"use client";

import { useState, useMemo } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import {
  PlusIcon,
  ChevronLeft,
  ChevronRight,
  CheckIcon,
  Building2,
  User,
  MapPin,
  Package,
  ClipboardCheck,
} from "lucide-react";

// ============================================================================
// Constants
// ============================================================================

type ClientType = "CORPORATIE" | "BELEGGER" | "PARTICULIER" | "MAKELAAR";

const CLIENT_TYPES: { value: ClientType; label: string; description: string; abbr: string; className: string }[] = [
  {
    value: "CORPORATIE",
    label: "Corporatie",
    description: "Contract-based, batch import, 35/65 facturatie",
    abbr: "CO",
    className: "border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20",
  },
  {
    value: "BELEGGER",
    label: "Belegger",
    description: "Offerte vereist, volume korting, netto 14 dagen",
    abbr: "BL",
    className: "border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20",
  },
  {
    value: "PARTICULIER",
    label: "Particulier",
    description: "Direct of offerte, iDEAL betaling voor levering",
    abbr: "PA",
    className: "border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20",
  },
  {
    value: "MAKELAAR",
    label: "Makelaar",
    description: "Via tussenpersoon, CC naar makelaar",
    abbr: "MK",
    className: "border-orange-500/30 bg-orange-500/10 hover:bg-orange-500/20",
  },
];

const BUILDING_TYPES = [
  { value: "APPARTEMENT", label: "Appartement" },
  { value: "RIJTJESWONING", label: "Rijtjeswoning" },
  { value: "TWEE_ONDER_EEN_KAP", label: "Twee-onder-een-kap" },
  { value: "VRIJSTAAND", label: "Vrijstaand" },
  { value: "BEDRIJFSPAND_LT_100", label: "Bedrijfspand < 100m\u00B2" },
  { value: "BEDRIJFSPAND_100_250", label: "Bedrijfspand 100-250m\u00B2" },
  { value: "BEDRIJFSPAND_251_500", label: "Bedrijfspand 251-500m\u00B2" },
  { value: "BEDRIJFSPAND_501_1000", label: "Bedrijfspand 501-1000m\u00B2" },
  { value: "BEDRIJFSPAND_1001_1500", label: "Bedrijfspand 1001-1500m\u00B2" },
  { value: "BEDRIJFSPAND_GT_1500", label: "Bedrijfspand > 1500m\u00B2" },
];

const SOURCES = [
  { value: "PORTAL", label: "Portaal" },
  { value: "EMAIL", label: "E-mail" },
  { value: "WEBSITE", label: "Website" },
  { value: "HOMEVISUALS", label: "HomeVisuals" },
  { value: "TELEFOON", label: "Telefoon" },
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "FORMULIER", label: "Formulier" },
  { value: "HANDMATIG", label: "Handmatig" },
];

// ============================================================================
// Steps config
// ============================================================================

type Step = {
  id: string;
  label: string;
  icon: React.ElementType;
};

const ALL_STEPS: Step[] = [
  { id: "clientType", label: "Klanttype", icon: User },
  { id: "company", label: "Bedrijf & Contact", icon: Building2 },
  { id: "address", label: "Adres", icon: MapPin },
  { id: "products", label: "Producten", icon: Package },
  { id: "review", label: "Overzicht", icon: ClipboardCheck },
];

function getStepsForClientType(clientType: ClientType | null): Step[] {
  if (!clientType) return ALL_STEPS;
  // Particulier without company can skip step 2
  if (clientType === "PARTICULIER") {
    return ALL_STEPS; // Still show company step — it's optional for particulier
  }
  return ALL_STEPS;
}

// ============================================================================
// Component
// ============================================================================

export function NewOrderFlow() {
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  // Step 1: Client type
  const [clientType, setClientType] = useState<ClientType | null>(null);

  // Step 2: Company & Contact
  const [companyId, setCompanyId] = useState<string>("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  // Step 3: Address
  const [postcode, setPostcode] = useState("");
  const [houseNumber, setHouseNumber] = useState("");
  const [houseNumberAddition, setHouseNumberAddition] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [buildingType, setBuildingType] = useState("");

  // Step 4: Products
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [source, setSource] = useState("");
  const [notes, setNotes] = useState("");

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Convex queries
  const companies = useQuery(api.companies.list, {});
  const products = useQuery(api.products.list, { isActive: true });

  // Calculate total (must be before flowConfig query)
  const calculatedTotal = useMemo(() => {
    if (!products) return 0;
    return selectedProductIds.reduce((sum, id) => {
      const product = products.find((p) => p._id === id);
      return sum + (product?.basePriceExVat ?? 0);
    }, 0);
  }, [selectedProductIds, products]);

  const flowConfig = useQuery(
    api.clientFlows.getFlowConfig,
    clientType ? { clientType, totalAmountCents: calculatedTotal } : "skip"
  );

  // Convex mutations
  const createAddress = useMutation(api.addresses.create);
  const createOrder = useMutation(api.orders.create);

  const steps = getStepsForClientType(clientType);

  // Navigation
  const canGoNext = () => {
    switch (currentStep) {
      case 0:
        return clientType !== null;
      case 1:
        // Company required for corporatie/belegger, optional for others
        if (clientType === "CORPORATIE" || clientType === "BELEGGER") {
          return companyId !== "";
        }
        return true; // optional for particulier/makelaar
      case 2:
        return postcode !== "" && houseNumber !== "" && street !== "" && city !== "";
      case 3:
        return selectedProductIds.length > 0;
      case 4:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handlePostcodeLookup = () => {
    // TODO: BAG API integration
    if (postcode && houseNumber && !street) {
      setStreet("—");
      setCity("—");
    }
  };

  const handleSubmit = async () => {
    if (!clientType) return;
    setIsSubmitting(true);

    try {
      // 1. Create address
      const addressId = await createAddress({
        street,
        houseNumber,
        houseNumberAddition: houseNumberAddition || undefined,
        postcode: postcode.replace(/\s/g, "").toUpperCase(),
        city,
        buildingType: buildingType || undefined,
      });

      // 2. Create order with client flow
      await createOrder({
        addressId,
        clientType,
        companyId: companyId ? (companyId as any) : undefined,
        totalPriceExVat: calculatedTotal,
        totalPriceInclVat: Math.round(calculatedTotal * 1.21),
        source: (source || "PORTAL") as any,
        notes: notes || undefined,
        buildingType: buildingType || undefined,
      });

      // Reset and close
      resetForm();
      setOpen(false);
    } catch (error) {
      console.error("Fout bij aanmaken opdracht:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setCurrentStep(0);
    setClientType(null);
    setCompanyId("");
    setContactName("");
    setContactEmail("");
    setContactPhone("");
    setPostcode("");
    setHouseNumber("");
    setHouseNumberAddition("");
    setStreet("");
    setCity("");
    setBuildingType("");
    setSelectedProductIds([]);
    setSource("");
    setNotes("");
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) resetForm();
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <PlusIcon className="size-4" />
        Nieuwe opdracht
      </Button>

      <Modal
        isOpen={open}
        onClose={() => handleOpenChange(false)}
        title={`Nieuwe opdracht — Stap ${currentStep + 1} van ${steps.length}: ${steps[currentStep]?.label}`}
      >
        {/* Step indicator */}
        <div>
            <div className="flex items-center gap-0">
              {steps.map((step, idx) => (
                <div key={step.id} className="flex items-center flex-1 min-w-0">
                  <div className="flex flex-col items-center gap-1">
                    <div
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-medium transition-colors",
                        idx < currentStep &&
                          "border-[var(--color-vv-green)] bg-[var(--color-vv-green)] text-white",
                        idx === currentStep &&
                          "border-[var(--color-vv-green)] bg-[var(--color-vv-green)]/10 text-[var(--color-vv-green)]",
                        idx > currentStep &&
                          "border-muted-foreground/30 text-muted-foreground/50"
                      )}
                    >
                      {idx < currentStep ? (
                        <CheckIcon className="size-3.5" />
                      ) : (
                        <span>{idx + 1}</span>
                      )}
                    </div>
                    <span
                      className={cn(
                        "text-[10px] text-center truncate max-w-14",
                        idx === currentStep
                          ? "font-medium text-foreground"
                          : "text-muted-foreground/50"
                      )}
                    >
                      {step.label}
                    </span>
                  </div>
                  {idx < steps.length - 1 && (
                    <div
                      className={cn(
                        "h-0.5 flex-1 mx-0.5 mt-[-1rem]",
                        idx < currentStep
                          ? "bg-[var(--color-vv-green)]"
                          : "bg-muted-foreground/20"
                      )}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

        {/* Step content */}
        <div className="flex flex-col gap-4 min-h-[300px]">
            {/* STEP 1: Client Type */}
            {currentStep === 0 && (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-muted-foreground">
                  Selecteer het klanttype. Dit bepaalt de workflow, facturatie en communicatie.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {CLIENT_TYPES.map((ct) => (
                    <button
                      key={ct.value}
                      type="button"
                      onClick={() => setClientType(ct.value)}
                      className={cn(
                        "flex flex-col items-start gap-2 rounded-lg border p-3 text-left transition-all",
                        ct.className,
                        clientType === ct.value
                          ? "ring-2 ring-primary"
                          : "opacity-70 hover:opacity-100"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs font-mono">
                          {ct.abbr}
                        </Badge>
                        <span className="text-sm font-medium">{ct.label}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {ct.description}
                      </span>
                    </button>
                  ))}
                </div>
                {clientType && flowConfig && (
                  <div className="rounded-lg border bg-muted/50 p-3 text-xs space-y-1">
                    <p className="font-medium text-foreground">Flow: {flowConfig.flow}</p>
                    <p>Betaaltermijn: {flowConfig.paymentTermDays === 0 ? "Direct (iDEAL)" : `${flowConfig.paymentTermDays} dagen`}</p>
                    {flowConfig.invoiceSplit.upfront > 0 && (
                      <p>Factuursplit: {flowConfig.invoiceSplit.upfront}% voorschot / {flowConfig.invoiceSplit.completion}% na afronding</p>
                    )}
                    {flowConfig.canSkipOfferte && (
                      <p className="text-[var(--color-vv-green)]">Offerte wordt overgeslagen</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* STEP 2: Company & Contact */}
            {currentStep === 1 && (
              <div className="flex flex-col gap-4">
                {(clientType === "CORPORATIE" || clientType === "BELEGGER" || clientType === "MAKELAAR") ? (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Selecteer het bedrijf en contactpersoon.
                    </p>
                    <div className="flex flex-col gap-1.5">
                      <Label>Bedrijf</Label>
                      <Select value={companyId} onValueChange={(v) => setCompanyId(v ?? "")}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecteer bedrijf..." />
                        </SelectTrigger>
                        <SelectContent>
                          {companies?.map((c) => (
                            <SelectItem key={c._id} value={c._id}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Voor particulieren is een bedrijf optioneel. Vul de contactgegevens in.
                  </p>
                )}

                <div className="flex flex-col gap-4">
                  <h3 className="text-sm font-medium">Contactpersoon</h3>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="contactName">Naam</Label>
                    <Input
                      id="contactName"
                      placeholder="Naam contactpersoon"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="contactEmail">E-mail</Label>
                      <Input
                        id="contactEmail"
                        type="email"
                        placeholder="email@voorbeeld.nl"
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="contactPhone">Telefoon</Label>
                      <Input
                        id="contactPhone"
                        type="tel"
                        placeholder="06-12345678"
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: Address */}
            {currentStep === 2 && (
              <div className="flex flex-col gap-4">
                <p className="text-sm text-muted-foreground">
                  Voer het adres in. Bij invullen van postcode + huisnummer worden straat en plaats automatisch opgezocht via de BAG.
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-1 flex flex-col gap-1.5">
                    <Label htmlFor="postcode">Postcode</Label>
                    <Input
                      id="postcode"
                      placeholder="1234 AB"
                      value={postcode}
                      onChange={(e) => setPostcode(e.target.value)}
                      onBlur={handlePostcodeLookup}
                    />
                  </div>
                  <div className="col-span-1 flex flex-col gap-1.5">
                    <Label htmlFor="houseNumber">Huisnr.</Label>
                    <Input
                      id="houseNumber"
                      placeholder="12"
                      value={houseNumber}
                      onChange={(e) => setHouseNumber(e.target.value)}
                      onBlur={handlePostcodeLookup}
                    />
                  </div>
                  <div className="col-span-1 flex flex-col gap-1.5">
                    <Label htmlFor="addition">Toev.</Label>
                    <Input
                      id="addition"
                      placeholder="a"
                      value={houseNumberAddition}
                      onChange={(e) => setHouseNumberAddition(e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="street">Straat</Label>
                    <Input
                      id="street"
                      placeholder="Wordt automatisch ingevuld"
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="city">Plaats</Label>
                    <Input
                      id="city"
                      placeholder="Wordt automatisch ingevuld"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Gebouwtype</Label>
                  <Select value={buildingType} onValueChange={(v) => setBuildingType(v ?? "")}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecteer gebouwtype" />
                    </SelectTrigger>
                    <SelectContent>
                      {BUILDING_TYPES.map((bt) => (
                        <SelectItem key={bt.value} value={bt.value}>
                          {bt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* STEP 4: Products & Pricing */}
            {currentStep === 3 && (
              <div className="flex flex-col gap-4">
                <p className="text-sm text-muted-foreground">
                  Selecteer de producten voor deze opdracht.
                  {clientType === "BELEGGER" && " Volumekorting wordt automatisch toegepast vanaf het 5e label."}
                  {clientType === "CORPORATIE" && " Contractprijzen worden automatisch toegepast."}
                </p>
                <div className="flex flex-col gap-2">
                  {products?.map((product) => {
                    const isSelected = selectedProductIds.includes(product._id);
                    return (
                      <button
                        key={product._id}
                        type="button"
                        onClick={() => {
                          setSelectedProductIds((prev) =>
                            isSelected
                              ? prev.filter((id) => id !== product._id)
                              : [...prev, product._id]
                          );
                        }}
                        className={cn(
                          "flex items-center justify-between rounded-lg border p-3 text-left transition-all",
                          isSelected
                            ? "border-[var(--color-vv-green)] bg-[var(--color-vv-green)]/5"
                            : "hover:bg-muted/50"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "flex h-5 w-5 items-center justify-center rounded border transition-colors",
                              isSelected
                                ? "border-[var(--color-vv-green)] bg-[var(--color-vv-green)] text-white"
                                : "border-muted-foreground/30"
                            )}
                          >
                            {isSelected && <CheckIcon className="size-3" />}
                          </div>
                          <div>
                            <span className="text-sm font-medium">{product.name}</span>
                            {product.description && (
                              <span className="block text-xs text-muted-foreground">
                                {product.description}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="text-sm font-medium text-muted-foreground">
                          {formatCurrency(product.basePriceExVat)}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {selectedProductIds.length > 0 && (
                  <div className="flex items-center justify-between rounded-lg border bg-muted/50 p-3">
                    <span className="text-sm font-medium">Totaal (excl. BTW)</span>
                    <span className="text-sm font-semibold">
                      {formatCurrency(calculatedTotal)}
                    </span>
                  </div>
                )}

                {clientType && flowConfig?.canSkipOfferte && (
                  <p className="text-xs text-[var(--color-vv-green)]">
                    {clientType === "CORPORATIE"
                      ? "Offerte wordt overgeslagen (contract-based)"
                      : `Totaal onder ${formatCurrency(100000)} — offerte wordt overgeslagen`}
                  </p>
                )}

                <div className="flex flex-col gap-1.5">
                  <Label>Bron</Label>
                  <Select value={source} onValueChange={(v) => setSource(v ?? "")}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Hoe is de opdracht binnengekomen?" />
                    </SelectTrigger>
                    <SelectContent>
                      {SOURCES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="notes">Notities</Label>
                  <textarea
                    id="notes"
                    className="flex min-h-16 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                    placeholder="Eventuele opmerkingen..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* STEP 5: Review */}
            {currentStep === 4 && (
              <div className="flex flex-col gap-4">
                <p className="text-sm text-muted-foreground">
                  Controleer de gegevens en maak de opdracht aan.
                </p>

                {/* Client type summary */}
                <div className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Klanttype</span>
                    <Badge variant="outline" className="text-xs">
                      {CLIENT_TYPES.find((ct) => ct.value === clientType)?.label ?? "—"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Flow</span>
                    <span className="text-xs font-medium">{flowConfig?.flow ?? "—"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Start status</span>
                    <span className="text-xs font-medium">{flowConfig?.initialStatus ?? "NIEUW"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Betaaltermijn</span>
                    <span className="text-xs font-medium">
                      {flowConfig?.paymentTermDays === 0 ? "Direct (iDEAL)" : `${flowConfig?.paymentTermDays ?? 14} dagen`}
                    </span>
                  </div>
                  {flowConfig && flowConfig.invoiceSplit.upfront > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Factuursplit</span>
                      <span className="text-xs font-medium">
                        {flowConfig.invoiceSplit.upfront}% / {flowConfig.invoiceSplit.completion}%
                      </span>
                    </div>
                  )}
                </div>

                {/* Address summary */}
                <div className="rounded-lg border p-3 space-y-1">
                  <span className="text-xs text-muted-foreground">Adres</span>
                  <p className="text-sm font-medium">
                    {street} {houseNumber}
                    {houseNumberAddition ? ` ${houseNumberAddition}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {postcode}, {city}
                  </p>
                  {buildingType && (
                    <p className="text-xs text-muted-foreground">
                      {BUILDING_TYPES.find((bt) => bt.value === buildingType)?.label}
                    </p>
                  )}
                </div>

                {/* Products summary */}
                <div className="rounded-lg border p-3 space-y-2">
                  <span className="text-xs text-muted-foreground">Producten</span>
                  {products
                    ?.filter((p) => selectedProductIds.includes(p._id))
                    .map((p) => (
                      <div key={p._id} className="flex items-center justify-between">
                        <span className="text-sm">{p.name}</span>
                        <span className="text-sm font-medium">
                          {formatCurrency(p.basePriceExVat)}
                        </span>
                      </div>
                    ))}
                  <div className="border-t pt-2 flex items-center justify-between">
                    <span className="text-sm font-medium">Totaal excl. BTW</span>
                    <span className="text-sm font-semibold">
                      {formatCurrency(calculatedTotal)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Totaal incl. BTW</span>
                    <span className="text-xs">
                      {formatCurrency(Math.round(calculatedTotal * 1.21))}
                    </span>
                  </div>
                </div>

                {/* Communication recipients */}
                {flowConfig && (
                  <div className="rounded-lg border p-3 space-y-1">
                    <span className="text-xs text-muted-foreground">Communicatie naar</span>
                    {flowConfig.communicationRecipients.map((r, i) => (
                      <p key={i} className="text-xs">
                        {r.role === "OPDRACHTGEVER" && "Opdrachtgever"}
                        {r.role === "BEWONER" && "Bewoner / Huurder"}
                        {r.role === "CORPORATIE_CONTACT" && "Corporatie contactpersoon"}
                        {r.role === "MAKELAAR" && "Makelaar (CC)"}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

        {/* Footer navigation */}
        <div className="flex w-full items-center justify-between pt-4">
          <Button
            variant="outline"
            onClick={currentStep === 0 ? () => setOpen(false) : handleBack}
          >
            {currentStep === 0 ? (
              "Annuleren"
            ) : (
              <>
                <ChevronLeft className="size-4" />
                Vorige
              </>
            )}
          </Button>

          {currentStep < steps.length - 1 ? (
            <Button onClick={handleNext} disabled={!canGoNext()}>
              Volgende
              <ChevronRight className="size-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !canGoNext()}
            >
              {isSubmitting ? "Aanmaken..." : "Opdracht aanmaken"}
            </Button>
          )}
        </div>
      </Modal>
    </>
  );
}
