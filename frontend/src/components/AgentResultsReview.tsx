import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";

interface Props {
  interruptData: Record<string, unknown>;
  onDecision: (approved: boolean, reason: string) => void;
  loading: boolean;
  lang: "en" | "vi";
}

function formatVND(amount: number, lang: "en" | "vi"): string {
  if (lang === "en") {
    if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(1)}B VND`;
    if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(0)}M VND`;
    return `${amount.toLocaleString("en-US")} VND`;
  }
  if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(1)} ty VND`;
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(0)} trieu VND`;
  return `${amount.toLocaleString("vi-VN")} VND`;
}

function normalizeVietnameseText(value: string, lang: "en" | "vi"): string {
  if (lang !== "vi") return value;
  const map: Record<string, string> = {
    "Quan ": "Quận ",
    "Bat dong san": "Bất động sản",
    "Ngan hang": "Ngân hàng",
    "Cong nghe": "Công nghệ",
    "Tieu dung": "Tiêu dùng",
    "Ban le": "Bán lẻ",
    "Thep": "Thép",
    "Nang luong": "Năng lượng",
    "Chung khoan": "Chứng khoán",
    "Phan phoi CN": "Phân phối CN",
  };
  return Object.entries(map).reduce((acc, [from, to]) => acc.replaceAll(from, to), value);
}

function Section({ title, badge, children }: { title: string; badge?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border p-4 space-y-2">
      <div className="flex items-center gap-2">
        <h3 className="font-semibold text-sm">{title}</h3>
        {badge && <Badge variant="secondary" className="text-[10px]">{badge}</Badge>}
      </div>
      {children}
    </div>
  );
}

function DataRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{String(value)}</span>
    </div>
  );
}

export default function AgentResultsReview({ interruptData, onDecision, loading, lang }: Props) {
  const [reason, setReason] = useState("");
  const realEstate = (interruptData.real_estate || {}) as Record<string, unknown>;
  const marketIntel = (interruptData.market_intel || {}) as Record<string, unknown>;
  const gold = (interruptData.gold || {}) as Record<string, unknown>;
  const openFinance = (interruptData.open_finance || {}) as Record<string, unknown>;

  const macro = (marketIntel.macro_indicators || {}) as Record<string, unknown>;
  const bonds = (marketIntel.recommended_bonds || []) as Array<Record<string, unknown>>;
  const stocks = (marketIntel.recommended_stocks || []) as Array<Record<string, unknown>>;
  const investmentReasoning = marketIntel.investment_reasoning as string | undefined;
  const externalAccounts = (openFinance.external_accounts || []) as Array<Record<string, unknown>>;
  const t = {
    title: lang === "vi" ? "Duyệt kết quả tác tử" : "Review Agent Results",
    subtitle:
      lang === "vi"
        ? "4 tác tử đã chạy song song để thu thập dữ liệu. Vui lòng duyệt trước khi tổng hợp."
        : "4 agents ran in parallel to collect data. Review the results before synthesis.",
    district: lang === "vi" ? "Quận" : "District",
    propertyType: lang === "vi" ? "Loại hình BĐS" : "Property Type",
    area: lang === "vi" ? "Diện tích" : "Area",
    alley: lang === "vi" ? "Độ rộng hẻm" : "Alley Width",
    estimate: lang === "vi" ? "Giá trị ước tính" : "Estimated Value",
    source: lang === "vi" ? "Nguồn" : "Source",
    market: lang === "vi" ? "Thông tin thị trường" : "Market Intelligence",
    gdp: lang === "vi" ? "Tăng trưởng GDP" : "GDP Growth",
    infl: lang === "vi" ? "Lạm phát" : "Inflation",
    sbv: lang === "vi" ? "Lãi suất SBV" : "SBV Rate",
    bonds: lang === "vi" ? "Trái phiếu đề xuất" : "Recommended Bonds",
    stocks: lang === "vi" ? "Cổ phiếu đề xuất" : "Recommended Stocks",
    ai: lang === "vi" ? "Lập luận AI" : "AI Reasoning",
    gold: lang === "vi" ? "Vàng SJC" : "Gold SJC",
    buy: lang === "vi" ? "Giá mua" : "Buy Price",
    sell: lang === "vi" ? "Giá bán" : "Sell Price",
    holdings: lang === "vi" ? "Số lượng nắm giữ" : "Holdings",
    value: lang === "vi" ? "Giá trị vàng" : "Gold Value",
    trend: lang === "vi" ? "Xu hướng" : "Trend",
    of: "Open Finance",
    total: lang === "vi" ? "Tổng bên ngoài" : "Total External",
    none: lang === "vi" ? "Không có tài khoản ngoài hệ thống" : "No external accounts found",
    notes: lang === "vi" ? "Ghi chú hoặc chỉnh sửa (tùy chọn)..." : "Notes or corrections (optional)...",
    reject: lang === "vi" ? "Gắn cờ vấn đề" : "Flag Issues",
    approve: lang === "vi" ? "Phê duyệt và tổng hợp" : "Approve & Synthesize",
    processing: lang === "vi" ? "Đang xử lý..." : "Processing...",
  };

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle>{t.title}</CardTitle>
        <CardDescription>{t.subtitle}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Real Estate */}
        <Section title={lang === "vi" ? "Định giá bất động sản" : "Real Estate Valuation"} badge="real_estate_agent">
          <DataRow label={t.district} value={normalizeVietnameseText(`${lang === "vi" ? "Quận" : "District"} ${realEstate.district || "N/A"}`, lang)} />
          <DataRow label={t.propertyType} value={normalizeVietnameseText(String(realEstate.property_type || "N/A"), lang)} />
          <DataRow label={t.area} value={`${realEstate.area_sqm || 0} m2`} />
          <DataRow label={t.alley} value={`${realEstate.alley_width_m || 0}m`} />
          <DataRow
            label={t.estimate}
            value={formatVND(Number(realEstate.estimated_value_vnd || 0), lang)}
          />
          <DataRow label={t.source} value={String(realEstate.valuation_source || "N/A")} />
        </Section>

        {/* Market Intel */}
        <Section title={t.market} badge="market_intel_agent">
          <div className="space-y-1 mb-2">
            <DataRow label={t.gdp} value={`${macro.gdp_growth_pct || 0}%`} />
            <DataRow label={t.infl} value={`${macro.inflation_pct || 0}%`} />
            <DataRow label={t.sbv} value={`${macro.sbv_interest_rate_pct || 0}%`} />
            <DataRow label="VN-Index" value={Number(macro.vnindex || 0).toLocaleString()} />
          </div>
          {bonds.length > 0 && (
            <>
              <Separator />
              <p className="text-xs font-semibold text-muted-foreground uppercase mt-2">{t.bonds}</p>
              {bonds.map((b, i) => (
                <div key={i} className="text-sm">
                  <span className="font-medium">{normalizeVietnameseText(String(b.issuer), lang)}</span>
                  {" — "}coupon {String(b.coupon_rate)}%, maturity {String(b.maturity)}, rating {String(b.credit_score)}
                </div>
              ))}
            </>
          )}
          {stocks.length > 0 && (
            <>
              <Separator />
              <p className="text-xs font-semibold text-muted-foreground uppercase mt-2">{t.stocks}</p>
              {stocks.map((s, i) => (
                <div key={i} className="text-sm">
                  <span className="font-medium">{String(s.ticker)}</span> ({normalizeVietnameseText(String(s.name), lang)})
                  {" — "}P/E {String(s.pe_ratio)}, div {String(s.dividend_yield_pct)}%
                </div>
              ))}
            </>
          )}
          {investmentReasoning && (
            <>
              <Separator />
              <div className="mt-2 rounded bg-blue-50 border border-blue-200 p-3">
                <p className="text-xs font-semibold text-blue-700 uppercase mb-1">{t.ai}</p>
                <p className="text-sm text-blue-900 whitespace-pre-line">{investmentReasoning}</p>
              </div>
            </>
          )}
        </Section>

        {/* Gold */}
        <Section title={t.gold} badge="gold_sjc_agent">
          <DataRow label={t.buy} value={formatVND(Number(gold.sjc_buy_price || 0), lang)} />
          <DataRow label={t.sell} value={formatVND(Number(gold.sjc_sell_price || 0), lang)} />
          <DataRow label={t.holdings} value={`${gold.gold_holdings_tael || 0} tael`} />
          <DataRow label={t.value} value={formatVND(Number(gold.gold_value_vnd || 0), lang)} />
          <DataRow label={t.trend} value={String(gold.trend || "N/A")} />
        </Section>

        {/* Open Finance */}
        <Section title={t.of} badge="open_finance_agent">
          {externalAccounts.length > 0 ? (
            <>
              {externalAccounts.map((a, i) => (
                <DataRow
                  key={i}
                  label={`${a.bank} (${a.account_type})`}
                  value={formatVND(Number(a.balance_vnd || 0), lang)}
                />
              ))}
              <Separator />
              <DataRow
                label={t.total}
                value={formatVND(Number(openFinance.total_external_balance || 0), lang)}
              />
            </>
          ) : (
            <p className="text-sm text-muted-foreground">{t.none}</p>
          )}
        </Section>

        <div className="space-y-3 pt-2">
          <Textarea
            value={reason}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReason(e.target.value)}
            placeholder={t.notes}
            rows={2}
          />
          <div className="flex gap-3">
            <Button variant="destructive" onClick={() => onDecision(false, reason)} disabled={loading}>
              {t.reject}
            </Button>
            <Button onClick={() => onDecision(true, reason)} disabled={loading}>
              {loading ? t.processing : t.approve}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
