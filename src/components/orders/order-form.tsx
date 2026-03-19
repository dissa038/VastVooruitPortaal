"use client";

import { useState } from "react";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
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
import { PlusIcon } from "lucide-react";

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

const PRODUCT_TYPES = [
  { value: "ENERGIELABEL", label: "Energielabel" },
  { value: "VERDUURZAMINGSADVIES", label: "Verduurzamingsadvies" },
  { value: "WWS_PUNTENTELLING", label: "WWS Puntentelling" },
  { value: "NEN2580_METING", label: "NEN2580 Meting" },
  { value: "BENG_BEREKENING", label: "BENG Berekening" },
  { value: "BLOWERDOORTEST", label: "Blowerdoortest" },
  { value: "HUURPRIJSCHECK", label: "Huurprijscheck" },
  { value: "MAATWERK", label: "Maatwerk" },
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

function generateReferenceCode(): string {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, "0");
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `VV-${year}${month}-${random}`;
}

export function OrderFormSheet({ children }: { children?: React.ReactElement }) {
  const [open, setOpen] = useState(false);
  const [postcode, setPostcode] = useState("");
  const [houseNumber, setHouseNumber] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [buildingType, setBuildingType] = useState("");
  const [productType, setProductType] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [source, setSource] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePostcodeLookup = () => {
    // TODO: BAG API integration — for now simulate
    if (postcode && houseNumber) {
      setStreet("Voorbeeldstraat");
      setCity("Staphorst");
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    const referenceCode = generateReferenceCode();

    // TODO: Call Convex mutation to create order
    // For now, log and close
    console.log("Creating order:", {
      referenceCode,
      postcode,
      houseNumber,
      street,
      city,
      buildingType,
      productType,
      contactName,
      contactEmail,
      contactPhone,
      source,
      notes,
    });

    // Simulate delay
    await new Promise((resolve) => setTimeout(resolve, 500));
    setIsSubmitting(false);
    setOpen(false);

    // Reset form
    setPostcode("");
    setHouseNumber("");
    setStreet("");
    setCity("");
    setBuildingType("");
    setProductType("");
    setContactName("");
    setContactEmail("");
    setContactPhone("");
    setSource("");
    setNotes("");
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          children ?? (
            <Button>
              <PlusIcon className="size-4" />
              Nieuwe opdracht
            </Button>
          )
        }
      />
      <SheetContent side="right" className="sm:max-w-lg w-full overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Nieuwe opdracht</SheetTitle>
          <SheetDescription>
            Vul de gegevens in voor een nieuwe opdracht. Het referentienummer wordt
            automatisch gegenereerd.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-6 px-4">
          {/* Address section */}
          <div className="flex flex-col gap-4">
            <h3 className="text-sm font-medium text-foreground">Adres</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="postcode">Postcode</Label>
                <Input
                  id="postcode"
                  placeholder="1234 AB"
                  value={postcode}
                  onChange={(e) => setPostcode(e.target.value)}
                  onBlur={handlePostcodeLookup}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="houseNumber">Huisnummer</Label>
                <Input
                  id="houseNumber"
                  placeholder="12a"
                  value={houseNumber}
                  onChange={(e) => setHouseNumber(e.target.value)}
                  onBlur={handlePostcodeLookup}
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
                  disabled={!!street}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="city">Plaats</Label>
                <Input
                  id="city"
                  placeholder="Wordt automatisch ingevuld"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  disabled={!!city}
                />
              </div>
            </div>
          </div>

          {/* Building & Product */}
          <div className="flex flex-col gap-4">
            <h3 className="text-sm font-medium text-foreground">Opdracht</h3>
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
            <div className="flex flex-col gap-1.5">
              <Label>Product</Label>
              <Select value={productType} onValueChange={(v) => setProductType(v ?? "")}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecteer product" />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCT_TYPES.map((pt) => (
                    <SelectItem key={pt.value} value={pt.value}>
                      {pt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
          </div>

          {/* Contact */}
          <div className="flex flex-col gap-4">
            <h3 className="text-sm font-medium text-foreground">Contactpersoon</h3>
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

          {/* Notes */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">Notities</Label>
            <textarea
              id="notes"
              className="flex min-h-20 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
              placeholder="Eventuele opmerkingen..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <SheetFooter>
          <SheetClose render={<Button variant="outline" />}>
            Annuleren
          </SheetClose>
          <Button
            onClick={handleSubmit}
            disabled={!postcode || !houseNumber || isSubmitting}
          >
            {isSubmitting ? "Aanmaken..." : "Opdracht aanmaken"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
