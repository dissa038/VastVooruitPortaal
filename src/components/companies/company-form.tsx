"use client";

import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";

const TYPE_OPTIONS = [
  { value: "CORPORATIE", label: "Corporatie" },
  { value: "BELEGGER", label: "Belegger" },
  { value: "MAKELAARSKANTOOR", label: "Makelaarskantoor" },
  { value: "AANNEMER", label: "Aannemer" },
  { value: "BOUWBEDRIJF", label: "Bouwbedrijf" },
  { value: "BANK", label: "Bank" },
  { value: "MONUMENTENSTICHTING", label: "Monumentenstichting" },
  { value: "VASTGOEDBEHEERDER", label: "Vastgoedbeheerder" },
  { value: "PARTNER", label: "Partner" },
  { value: "OVERIG", label: "Overig" },
] as const;

type CompanyType = (typeof TYPE_OPTIONS)[number]["value"];

interface CompanyFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company?: {
    _id: Id<"companies">;
    name: string;
    type: string;
    kvkNumber?: string | null;
    vatNumber?: string | null;
    email?: string | null;
    phone?: string | null;
    website?: string | null;
    address?: string | null;
    postcode?: string | null;
    city?: string | null;
    invoiceEmail?: string | null;
    invoiceAddress?: string | null;
    invoicePostcode?: string | null;
    invoiceCity?: string | null;
    paymentTermDays?: number | null;
    notes?: string | null;
  };
}

export function CompanyForm({ open, onOpenChange, company }: CompanyFormProps) {
  const createCompany = useMutation(api.companies.create);
  const updateCompany = useMutation(api.companies.update);

  const isEditing = !!company;

  const [name, setName] = useState("");
  const [type, setType] = useState<CompanyType>("OVERIG");
  const [kvkNumber, setKvkNumber] = useState("");
  const [vatNumber, setVatNumber] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [address, setAddress] = useState("");
  const [postcode, setPostcode] = useState("");
  const [city, setCity] = useState("");
  const [invoiceEmail, setInvoiceEmail] = useState("");
  const [invoiceAddress, setInvoiceAddress] = useState("");
  const [invoicePostcode, setInvoicePostcode] = useState("");
  const [invoiceCity, setInvoiceCity] = useState("");
  const [paymentTermDays, setPaymentTermDays] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (company) {
      setName(company.name ?? "");
      setType(company.type as CompanyType);
      setKvkNumber(company.kvkNumber ?? "");
      setVatNumber(company.vatNumber ?? "");
      setEmail(company.email ?? "");
      setPhone(company.phone ?? "");
      setWebsite(company.website ?? "");
      setAddress(company.address ?? "");
      setPostcode(company.postcode ?? "");
      setCity(company.city ?? "");
      setInvoiceEmail(company.invoiceEmail ?? "");
      setInvoiceAddress(company.invoiceAddress ?? "");
      setInvoicePostcode(company.invoicePostcode ?? "");
      setInvoiceCity(company.invoiceCity ?? "");
      setPaymentTermDays(company.paymentTermDays?.toString() ?? "");
      setNotes(company.notes ?? "");
    } else {
      resetForm();
    }
  }, [company, open]);

  function resetForm() {
    setName("");
    setType("OVERIG");
    setKvkNumber("");
    setVatNumber("");
    setEmail("");
    setPhone("");
    setWebsite("");
    setAddress("");
    setPostcode("");
    setCity("");
    setInvoiceEmail("");
    setInvoiceAddress("");
    setInvoicePostcode("");
    setInvoiceCity("");
    setPaymentTermDays("");
    setNotes("");
    setErrors({});
  }

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) {
      newErrors.name = "Bedrijfsnaam is verplicht";
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Ongeldig emailadres";
    }
    if (invoiceEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(invoiceEmail)) {
      newErrors.invoiceEmail = "Ongeldig emailadres";
    }
    if (paymentTermDays && isNaN(Number(paymentTermDays))) {
      newErrors.paymentTermDays = "Voer een geldig aantal dagen in";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      const data = {
        name,
        type: type as CompanyType,
        kvkNumber: kvkNumber || undefined,
        vatNumber: vatNumber || undefined,
        email: email || undefined,
        phone: phone || undefined,
        website: website || undefined,
        address: address || undefined,
        postcode: postcode || undefined,
        city: city || undefined,
        invoiceEmail: invoiceEmail || undefined,
        invoiceAddress: invoiceAddress || undefined,
        invoicePostcode: invoicePostcode || undefined,
        invoiceCity: invoiceCity || undefined,
        paymentTermDays: paymentTermDays
          ? Number(paymentTermDays)
          : undefined,
        notes: notes || undefined,
      };

      if (isEditing && company) {
        await updateCompany({ id: company._id, ...data });
      } else {
        await createCompany(data);
      }

      onOpenChange(false);
      resetForm();
    } catch (err) {
      console.error("Fout bij opslaan bedrijf:", err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {isEditing ? "Bedrijf bewerken" : "Nieuw bedrijf"}
          </SheetTitle>
          <SheetDescription>
            {isEditing
              ? "Pas de bedrijfsgegevens aan"
              : "Vul de gegevens in om een nieuw bedrijf aan te maken"}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4 px-4">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="name">Bedrijfsnaam *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Woningcorporatie Voorbeeld"
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name}</p>
            )}
          </div>

          {/* Type */}
          <div className="space-y-1.5">
            <Label>Type *</Label>
            <Select value={type} onValueChange={(val: string | null) => { if (val) setType(val as CompanyType); }}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecteer type" />
              </SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* KvK + BTW */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="kvk">KvK-nummer</Label>
              <Input
                id="kvk"
                value={kvkNumber}
                onChange={(e) => setKvkNumber(e.target.value)}
                placeholder="12345678"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="vat">BTW-nummer</Label>
              <Input
                id="vat"
                value={vatNumber}
                onChange={(e) => setVatNumber(e.target.value)}
                placeholder="NL123456789B01"
              />
            </div>
          </div>

          {/* Contact info */}
          <div className="space-y-1.5">
            <Label htmlFor="companyEmail">Email</Label>
            <Input
              id="companyEmail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="info@bedrijf.nl"
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="companyPhone">Telefoon</Label>
              <Input
                id="companyPhone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="038-1234567"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="companyWebsite">Website</Label>
              <Input
                id="companyWebsite"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://bedrijf.nl"
              />
            </div>
          </div>

          {/* Address */}
          <div className="space-y-1.5">
            <Label htmlFor="companyAddress">Adres</Label>
            <Input
              id="companyAddress"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Straatnaam 1"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="companyPostcode">Postcode</Label>
              <Input
                id="companyPostcode"
                value={postcode}
                onChange={(e) => setPostcode(e.target.value)}
                placeholder="1234 AB"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="companyCity">Plaats</Label>
              <Input
                id="companyCity"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Staphorst"
              />
            </div>
          </div>

          {/* Billing section */}
          <div className="border-t pt-4">
            <h3 className="text-sm font-medium mb-3">Facturatiegegevens</h3>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="invoiceEmail">Factuur email</Label>
                <Input
                  id="invoiceEmail"
                  type="email"
                  value={invoiceEmail}
                  onChange={(e) => setInvoiceEmail(e.target.value)}
                  placeholder="facturen@bedrijf.nl"
                />
                {errors.invoiceEmail && (
                  <p className="text-sm text-destructive">
                    {errors.invoiceEmail}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="invoiceAddress">Factuuradres</Label>
                <Input
                  id="invoiceAddress"
                  value={invoiceAddress}
                  onChange={(e) => setInvoiceAddress(e.target.value)}
                  placeholder="Postbus 123"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="invoicePostcode">Postcode</Label>
                  <Input
                    id="invoicePostcode"
                    value={invoicePostcode}
                    onChange={(e) => setInvoicePostcode(e.target.value)}
                    placeholder="1234 AB"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="invoiceCity">Plaats</Label>
                  <Input
                    id="invoiceCity"
                    value={invoiceCity}
                    onChange={(e) => setInvoiceCity(e.target.value)}
                    placeholder="Staphorst"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="paymentTermDays">Betalingstermijn (dagen)</Label>
                <Input
                  id="paymentTermDays"
                  type="number"
                  value={paymentTermDays}
                  onChange={(e) => setPaymentTermDays(e.target.value)}
                  placeholder="30"
                />
                {errors.paymentTermDays && (
                  <p className="text-sm text-destructive">
                    {errors.paymentTermDays}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="companyNotes">Notities</Label>
            <Textarea
              id="companyNotes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Eventuele opmerkingen..."
              rows={3}
            />
          </div>
        </form>

        <SheetFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuleren
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? "Opslaan..." : isEditing ? "Bijwerken" : "Aanmaken"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
