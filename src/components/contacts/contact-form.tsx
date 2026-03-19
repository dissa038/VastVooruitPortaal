"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
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
import { Modal } from "@/components/ui/modal";

const ROLE_OPTIONS = [
  { value: "EIGENAAR", label: "Eigenaar" },
  { value: "HUURDER", label: "Huurder" },
  { value: "OPDRACHTGEVER", label: "Opdrachtgever" },
  { value: "BEWONER", label: "Bewoner" },
  { value: "CONTACTPERSOON", label: "Contactpersoon" },
  { value: "MAKELAAR", label: "Makelaar" },
  { value: "AANNEMER_CONTACT", label: "Aannemer contact" },
  { value: "OVERIG", label: "Overig" },
] as const;

type ContactRole = (typeof ROLE_OPTIONS)[number]["value"];

interface ContactFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact?: {
    _id: Id<"contacts">;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    postcode?: string | null;
    city?: string | null;
    role: string;
    companyId?: Id<"companies"> | null;
    notes?: string | null;
  };
}

export function ContactForm({ open, onOpenChange, contact }: ContactFormProps) {
  const createContact = useMutation(api.contacts.create);
  const updateContact = useMutation(api.contacts.update);
  const companies = useQuery(api.companies.list, {});

  const isEditing = !!contact;

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [postcode, setPostcode] = useState("");
  const [city, setCity] = useState("");
  const [role, setRole] = useState<ContactRole>("EIGENAAR");
  const [companyId, setCompanyId] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Populate form when editing
  useEffect(() => {
    if (contact) {
      setFirstName(contact.firstName ?? "");
      setLastName(contact.lastName ?? "");
      setEmail(contact.email ?? "");
      setPhone(contact.phone ?? "");
      setAddress(contact.address ?? "");
      setPostcode(contact.postcode ?? "");
      setCity(contact.city ?? "");
      setRole(contact.role as ContactRole);
      setCompanyId(contact.companyId ?? "");
      setNotes(contact.notes ?? "");
    } else {
      resetForm();
    }
  }, [contact, open]);

  function resetForm() {
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setAddress("");
    setPostcode("");
    setCity("");
    setRole("EIGENAAR");
    setCompanyId("");
    setNotes("");
    setErrors({});
  }

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!firstName.trim() && !lastName.trim()) {
      newErrors.name = "Voornaam of achternaam is verplicht";
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Ongeldig emailadres";
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
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        email: email || undefined,
        phone: phone || undefined,
        address: address || undefined,
        postcode: postcode || undefined,
        city: city || undefined,
        role: role as ContactRole,
        companyId: companyId ? (companyId as Id<"companies">) : undefined,
        notes: notes || undefined,
      };

      if (isEditing && contact) {
        await updateContact({ id: contact._id, ...data });
      } else {
        await createContact(data);
      }

      onOpenChange(false);
      resetForm();
    } catch (err) {
      console.error("Fout bij opslaan contact:", err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      isOpen={open}
      onClose={() => onOpenChange(false)}
      title={isEditing ? "Contact bewerken" : "Nieuw contact"}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name fields */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="firstName">Voornaam</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Jan"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastName">Achternaam</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Jansen"
              />
            </div>
          </div>
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name}</p>
          )}

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jan@voorbeeld.nl"
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email}</p>
            )}
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <Label htmlFor="phone">Telefoon</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="06-12345678"
            />
          </div>

          {/* Role */}
          <div className="space-y-1.5">
            <Label>Rol</Label>
            <Select value={role} onValueChange={(val: string | null) => { if (val) setRole(val as ContactRole); }}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecteer rol" />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Company */}
          <div className="space-y-1.5">
            <Label>Bedrijf</Label>
            <Select value={companyId} onValueChange={(val) => setCompanyId(val ?? "")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Geen bedrijf" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Geen bedrijf</SelectItem>
                {companies?.map((c) => (
                  <SelectItem key={c._id} value={c._id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Address */}
          <div className="space-y-1.5">
            <Label htmlFor="address">Adres</Label>
            <Input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Straatnaam 1"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="postcode">Postcode</Label>
              <Input
                id="postcode"
                value={postcode}
                onChange={(e) => setPostcode(e.target.value)}
                placeholder="1234 AB"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="city">Plaats</Label>
              <Input
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Amsterdam"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notities</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Eventuele opmerkingen..."
              rows={3}
            />
          </div>
      </form>

      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Annuleren
        </Button>
        <Button onClick={handleSubmit} disabled={saving}>
          {saving ? "Opslaan..." : isEditing ? "Bijwerken" : "Aanmaken"}
        </Button>
      </div>
    </Modal>
  );
}
