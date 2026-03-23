import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import type { FormData } from "@/api";

const SCENARIOS: { label: string; badge: string; variant: "default" | "destructive" | "secondary"; data: FormData }[] = [
  {
    label: "Nguyen Van An — HNWI",
    badge: "Normal",
    variant: "default",
    data: {
      name: "Nguyen Van An", phone: "0901234567", id_number: "079123456789",
      address: "45 Hem 3m, Duong Nguyen Hue, Quan 1, TP.HCM",
      casa_balance: "2500000000", risk_profile: "moderate",
      investment_goals: "Tang truong tai san dai han, da dang hoa danh muc",
      monthly_income: "80000000", occupation: "Giam doc doanh nghiep",
      existing_loans: "0", property_area_sqm: "75",
      property_type: "Nha pho hem 3-6m", gold_holdings_tael: "5",
    },
  },
  {
    label: "Pham Minh Tuan — Bad Debt",
    badge: "Warning",
    variant: "secondary",
    data: {
      name: "Pham Minh Tuan", phone: "0912345678", id_number: "079201456789",
      address: "Quan 2, TP.HCM", casa_balance: "500000000",
      risk_profile: "conservative", investment_goals: "Bao toan von",
      monthly_income: "25000000", occupation: "Nhan vien van phong",
      existing_loans: "1200000000", property_area_sqm: "50",
      property_type: "Can ho chung cu", gold_holdings_tael: "0",
    },
  },
  {
    label: "Tran Van Gian Lan — Blacklisted",
    badge: "Blocked",
    variant: "destructive",
    data: {
      name: "Tran Van Gian Lan", phone: "0999999999", id_number: "001099000111",
      address: "Quan 7, TP.HCM", casa_balance: "1000000000",
      risk_profile: "aggressive", investment_goals: "Dau tu ngan han",
      monthly_income: "0", occupation: "",
      existing_loans: "0", property_area_sqm: "0",
      property_type: "", gold_holdings_tael: "0",
    },
  },
  {
    label: "Le Thi Mai — Retiree",
    badge: "Normal",
    variant: "default",
    data: {
      name: "Le Thi Mai", phone: "0908765432", id_number: "052088123456",
      address: "Quan Binh Thanh, TP.HCM", casa_balance: "3800000000",
      risk_profile: "conservative", investment_goals: "Bao toan von, thu nhap co dinh hang thang",
      monthly_income: "15000000", occupation: "Huu tri",
      existing_loans: "0", property_area_sqm: "120",
      property_type: "Nha pho hem 6m+", gold_holdings_tael: "10",
    },
  },
];

const EMPTY_FORM: FormData = {
  name: "", phone: "", id_number: "", address: "",
  casa_balance: "", risk_profile: "moderate", investment_goals: "",
  monthly_income: "", occupation: "", existing_loans: "",
  property_area_sqm: "", property_type: "", gold_holdings_tael: "",
};

interface Props {
  onSubmit: (data: FormData) => void;
  loading: boolean;
}

export default function ClientForm({ onSubmit, loading }: Props) {
  const [form, setForm] = useState<FormData>(EMPTY_FORM);

  const set = (key: keyof FormData, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const canSubmit = form.name.trim() && !loading;

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle>Client Information</CardTitle>
        <CardDescription>
          Enter client details or select a demo scenario to test different outcomes.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Scenario buttons */}
        <div className="mb-4">
          <Label className="text-xs text-muted-foreground mb-2 block">Demo Scenarios</Label>
          <div className="flex flex-wrap gap-2">
            {SCENARIOS.map((s) => (
              <Button
                key={s.data.id_number}
                variant="outline"
                size="sm"
                onClick={() => setForm(s.data)}
                disabled={loading}
                className="text-xs"
              >
                {s.label}
                <Badge variant={s.variant} className="ml-1.5 text-[10px]">{s.badge}</Badge>
              </Button>
            ))}
          </div>
        </div>

        <Separator className="mb-4" />

        {/* Personal info */}
        <div className="grid gap-4">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Personal Information</Label>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs">Full Name *</Label>
              <Input id="name" placeholder="Nguyen Van A" value={form.name} onChange={(e) => set("name", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-xs">Phone</Label>
              <Input id="phone" placeholder="0901234567" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="id_number" className="text-xs">National ID (CCCD)</Label>
              <Input id="id_number" placeholder="079123456789" value={form.id_number} onChange={(e) => set("id_number", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="occupation" className="text-xs">Occupation</Label>
              <Input id="occupation" placeholder="Giam doc doanh nghiep" value={form.occupation} onChange={(e) => set("occupation", e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="address" className="text-xs">Address</Label>
            <Input id="address" placeholder="45 Hem 3m, Duong Nguyen Hue, Quan 1, TP.HCM" value={form.address} onChange={(e) => set("address", e.target.value)} />
          </div>

          <Separator />

          {/* Financial info */}
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Financial Information</Label>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="casa_balance" className="text-xs">CASA Balance (VND)</Label>
              <Input id="casa_balance" type="number" placeholder="2,500,000,000" value={form.casa_balance} onChange={(e) => set("casa_balance", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="monthly_income" className="text-xs">Monthly Income (VND)</Label>
              <Input id="monthly_income" type="number" placeholder="80,000,000" value={form.monthly_income} onChange={(e) => set("monthly_income", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="existing_loans" className="text-xs">Existing Loans (VND)</Label>
              <Input id="existing_loans" type="number" placeholder="0" value={form.existing_loans} onChange={(e) => set("existing_loans", e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="risk_profile" className="text-xs">Risk Profile</Label>
            <Select value={form.risk_profile} onValueChange={(v) => { if (v) set("risk_profile", v); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="conservative">Conservative</SelectItem>
                <SelectItem value="moderate">Moderate</SelectItem>
                <SelectItem value="aggressive">Aggressive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Assets */}
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Assets</Label>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="property_area" className="text-xs">Property Area (m2)</Label>
              <Input id="property_area" type="number" placeholder="75" value={form.property_area_sqm} onChange={(e) => set("property_area_sqm", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="property_type" className="text-xs">Property Type</Label>
              <Select value={form.property_type} onValueChange={(v) => { if (v) set("property_type", v); }}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Nha pho mat tien">Nha pho mat tien</SelectItem>
                  <SelectItem value="Nha pho hem 6m+">Nha pho hem 6m+</SelectItem>
                  <SelectItem value="Nha pho hem 3-6m">Nha pho hem 3-6m</SelectItem>
                  <SelectItem value="Nha pho hem duoi 3m">Nha pho hem duoi 3m</SelectItem>
                  <SelectItem value="Can ho chung cu">Can ho chung cu</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gold" className="text-xs">Gold SJC (tael)</Label>
              <Input id="gold" type="number" placeholder="5" value={form.gold_holdings_tael} onChange={(e) => set("gold_holdings_tael", e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="goals" className="text-xs">Investment Goals</Label>
            <Textarea id="goals" placeholder="e.g. Tang truong tai san dai han..." value={form.investment_goals} onChange={(e) => set("investment_goals", e.target.value)} rows={2} />
          </div>

          <div className="flex gap-3 pt-2">
            <Button onClick={() => onSubmit(form)} disabled={!canSubmit} className="flex-1">
              {loading ? "Processing..." : "Start Advisory"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
