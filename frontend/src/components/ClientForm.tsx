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
      address: "45 Hẻm 3m, Đường Nguyễn Huệ, Quận 1, TP.HCM",
      casa_balance: "2500000000", risk_profile: "moderate",
      investment_goals: "Tăng trưởng tài sản dài hạn, đa dạng hóa danh mục",
      monthly_income: "80000000", occupation: "Giám đốc doanh nghiệp",
      existing_loans: "0", property_area_sqm: "75",
      property_type: "Nhà phố hẻm 3-6m", gold_holdings_tael: "5",
    },
  },
  {
    label: "Pham Minh Tuan — Bad Debt",
    badge: "Warning",
    variant: "secondary",
    data: {
      name: "Pham Minh Tuan", phone: "0912345678", id_number: "079201456789",
      address: "Quận 2, TP.HCM", casa_balance: "500000000",
      risk_profile: "conservative", investment_goals: "Bảo toàn vốn",
      monthly_income: "25000000", occupation: "Nhân viên văn phòng",
      existing_loans: "1200000000", property_area_sqm: "50",
      property_type: "Căn hộ chung cư", gold_holdings_tael: "0",
    },
  },
  {
    label: "Tran Van Gian Lan — Blacklisted",
    badge: "Blocked",
    variant: "destructive",
    data: {
      name: "Tran Van Gian Lan", phone: "0999999999", id_number: "001099000111",
      address: "Quận 7, TP.HCM", casa_balance: "1000000000",
      risk_profile: "aggressive", investment_goals: "Đầu tư ngắn hạn",
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
      address: "Quận Bình Thạnh, TP.HCM", casa_balance: "3800000000",
      risk_profile: "conservative", investment_goals: "Bảo toàn vốn, thu nhập cố định hàng tháng",
      monthly_income: "15000000", occupation: "Hưu trí",
      existing_loans: "0", property_area_sqm: "120",
      property_type: "Nhà phố hẻm 6m+", gold_holdings_tael: "10",
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
  lang: "en" | "vi";
}

export default function ClientForm({ onSubmit, loading, lang }: Props) {
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const t = {
    title: lang === "vi" ? "Thông tin khách hàng" : "Client Information",
    subtitle:
      lang === "vi"
        ? "Nhập thông tin khách hàng hoặc chọn kịch bản demo để kiểm thử các luồng khác nhau."
        : "Enter client details or select a demo scenario to test different outcomes.",
    scenarios: lang === "vi" ? "Kịch bản demo" : "Demo Scenarios",
    personal: lang === "vi" ? "Thông tin cá nhân" : "Personal Information",
    fullName: lang === "vi" ? "Họ và tên *" : "Full Name *",
    phone: lang === "vi" ? "Số điện thoại" : "Phone",
    id: lang === "vi" ? "CCCD" : "National ID (CCCD)",
    occupation: lang === "vi" ? "Nghề nghiệp" : "Occupation",
    address: lang === "vi" ? "Địa chỉ" : "Address",
    financial: lang === "vi" ? "Thông tin tài chính" : "Financial Information",
    casa: lang === "vi" ? "Số dư CASA (VND)" : "CASA Balance (VND)",
    income: lang === "vi" ? "Thu nhập hàng tháng (VND)" : "Monthly Income (VND)",
    loans: lang === "vi" ? "Khoản vay hiện tại (VND)" : "Existing Loans (VND)",
    risk: lang === "vi" ? "Khẩu vị rủi ro" : "Risk Profile",
    conservative: lang === "vi" ? "Thận trọng" : "Conservative",
    moderate: lang === "vi" ? "Cân bằng" : "Moderate",
    aggressive: lang === "vi" ? "Mạo hiểm" : "Aggressive",
    assets: lang === "vi" ? "Tài sản" : "Assets",
    area: lang === "vi" ? "Diện tích BĐS (m2)" : "Property Area (m2)",
    type: lang === "vi" ? "Loại hình BĐS" : "Property Type",
    select: lang === "vi" ? "Chọn..." : "Select...",
    gold: lang === "vi" ? "Vàng SJC (lượng)" : "Gold SJC (tael)",
    goals: lang === "vi" ? "Mục tiêu đầu tư" : "Investment Goals",
    start: lang === "vi" ? "Bắt đầu tư vấn" : "Start Advisory",
    processing: lang === "vi" ? "Đang xử lý..." : "Processing...",
  };

  const set = (key: keyof FormData, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const canSubmit = form.name.trim() && !loading;

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle>{t.title}</CardTitle>
        <CardDescription>{t.subtitle}</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Scenario buttons */}
        <div className="mb-4">
          <Label className="text-xs text-muted-foreground mb-2 block">{t.scenarios}</Label>
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
                <Badge variant={s.variant} className="ml-1.5 text-[10px]">
                  {lang === "vi" ? (s.badge === "Normal" ? "Bình thường" : s.badge === "Warning" ? "Cảnh báo" : "Chặn") : s.badge}
                </Badge>
              </Button>
            ))}
          </div>
        </div>

        <Separator className="mb-4" />

        {/* Personal info */}
        <div className="grid gap-4">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t.personal}</Label>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs">{t.fullName}</Label>
              <Input id="name" placeholder={lang === "vi" ? "Nguyễn Văn A" : "Nguyen Van A"} value={form.name} onChange={(e) => set("name", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-xs">{t.phone}</Label>
              <Input id="phone" placeholder="0901234567" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="id_number" className="text-xs">{t.id}</Label>
              <Input id="id_number" placeholder="079123456789" value={form.id_number} onChange={(e) => set("id_number", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="occupation" className="text-xs">{t.occupation}</Label>
              <Input id="occupation" placeholder={lang === "vi" ? "Giám đốc doanh nghiệp" : "Business director"} value={form.occupation} onChange={(e) => set("occupation", e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="address" className="text-xs">{t.address}</Label>
            <Input id="address" placeholder={lang === "vi" ? "45 Hẻm 3m, Đường Nguyễn Huệ, Quận 1, TP.HCM" : "45 Alley 3m, Nguyen Hue Street, District 1, HCMC"} value={form.address} onChange={(e) => set("address", e.target.value)} />
          </div>

          <Separator />

          {/* Financial info */}
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t.financial}</Label>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="casa_balance" className="text-xs">{t.casa}</Label>
              <Input id="casa_balance" type="number" placeholder="2,500,000,000" value={form.casa_balance} onChange={(e) => set("casa_balance", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="monthly_income" className="text-xs">{t.income}</Label>
              <Input id="monthly_income" type="number" placeholder="80,000,000" value={form.monthly_income} onChange={(e) => set("monthly_income", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="existing_loans" className="text-xs">{t.loans}</Label>
              <Input id="existing_loans" type="number" placeholder="0" value={form.existing_loans} onChange={(e) => set("existing_loans", e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="risk_profile" className="text-xs">{t.risk}</Label>
            <Select value={form.risk_profile} onValueChange={(v) => { if (v) set("risk_profile", v); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="conservative">{t.conservative}</SelectItem>
                <SelectItem value="moderate">{t.moderate}</SelectItem>
                <SelectItem value="aggressive">{t.aggressive}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Assets */}
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t.assets}</Label>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="property_area" className="text-xs">{t.area}</Label>
              <Input id="property_area" type="number" placeholder="75" value={form.property_area_sqm} onChange={(e) => set("property_area_sqm", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="property_type" className="text-xs">{t.type}</Label>
              <Select value={form.property_type} onValueChange={(v) => { if (v) set("property_type", v); }}>
                <SelectTrigger><SelectValue placeholder={t.select} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Nha pho mat tien">{lang === "vi" ? "Nhà phố mặt tiền" : "Townhouse frontage"}</SelectItem>
                  <SelectItem value="Nha pho hem 6m+">{lang === "vi" ? "Nhà phố hẻm 6m+" : "Townhouse alley 6m+"}</SelectItem>
                  <SelectItem value="Nha pho hem 3-6m">{lang === "vi" ? "Nhà phố hẻm 3-6m" : "Townhouse alley 3-6m"}</SelectItem>
                  <SelectItem value="Nha pho hem duoi 3m">{lang === "vi" ? "Nhà phố hẻm dưới 3m" : "Townhouse alley under 3m"}</SelectItem>
                  <SelectItem value="Can ho chung cu">{lang === "vi" ? "Căn hộ chung cư" : "Condominium"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gold" className="text-xs">{t.gold}</Label>
              <Input id="gold" type="number" placeholder="5" value={form.gold_holdings_tael} onChange={(e) => set("gold_holdings_tael", e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="goals" className="text-xs">{t.goals}</Label>
            <Textarea id="goals" placeholder={lang === "vi" ? "ví dụ: Tăng trưởng tài sản dài hạn..." : "e.g. Long-term wealth growth..."} value={form.investment_goals} onChange={(e) => set("investment_goals", e.target.value)} rows={2} />
          </div>

          <div className="flex gap-3 pt-2">
            <Button onClick={() => onSubmit(form)} disabled={!canSubmit} className="flex-1">
              {loading ? t.processing : t.start}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
