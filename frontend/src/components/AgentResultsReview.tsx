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
}

function formatVND(amount: number): string {
  if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(1)} ty VND`;
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(0)} trieu VND`;
  return `${amount.toLocaleString("vi-VN")} VND`;
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

export default function AgentResultsReview({ interruptData, onDecision, loading }: Props) {
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

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle>Review Agent Results</CardTitle>
        <CardDescription>
          4 agents ran in parallel to collect data. Review the results before synthesis.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Real Estate */}
        <Section title="Real Estate Valuation" badge="real_estate_agent">
          <DataRow label="District" value={`Quan ${realEstate.district || "N/A"}`} />
          <DataRow label="Property Type" value={String(realEstate.property_type || "N/A")} />
          <DataRow label="Area" value={`${realEstate.area_sqm || 0} m2`} />
          <DataRow label="Alley Width" value={`${realEstate.alley_width_m || 0}m`} />
          <DataRow
            label="Estimated Value"
            value={formatVND(Number(realEstate.estimated_value_vnd || 0))}
          />
          <DataRow label="Source" value={String(realEstate.valuation_source || "N/A")} />
        </Section>

        {/* Market Intel */}
        <Section title="Market Intelligence" badge="market_intel_agent">
          <div className="space-y-1 mb-2">
            <DataRow label="GDP Growth" value={`${macro.gdp_growth_pct || 0}%`} />
            <DataRow label="Inflation" value={`${macro.inflation_pct || 0}%`} />
            <DataRow label="SBV Rate" value={`${macro.sbv_interest_rate_pct || 0}%`} />
            <DataRow label="VN-Index" value={Number(macro.vnindex || 0).toLocaleString()} />
          </div>
          {bonds.length > 0 && (
            <>
              <Separator />
              <p className="text-xs font-semibold text-muted-foreground uppercase mt-2">Recommended Bonds</p>
              {bonds.map((b, i) => (
                <div key={i} className="text-sm">
                  <span className="font-medium">{String(b.issuer)}</span>
                  {" — "}coupon {String(b.coupon_rate)}%, maturity {String(b.maturity)}, rating {String(b.credit_score)}
                </div>
              ))}
            </>
          )}
          {stocks.length > 0 && (
            <>
              <Separator />
              <p className="text-xs font-semibold text-muted-foreground uppercase mt-2">Recommended Stocks</p>
              {stocks.map((s, i) => (
                <div key={i} className="text-sm">
                  <span className="font-medium">{String(s.ticker)}</span> ({String(s.name)})
                  {" — "}P/E {String(s.pe_ratio)}, div {String(s.dividend_yield_pct)}%
                </div>
              ))}
            </>
          )}
          {investmentReasoning && (
            <>
              <Separator />
              <div className="mt-2 rounded bg-blue-50 border border-blue-200 p-3">
                <p className="text-xs font-semibold text-blue-700 uppercase mb-1">AI Reasoning</p>
                <p className="text-sm text-blue-900 whitespace-pre-line">{investmentReasoning}</p>
              </div>
            </>
          )}
        </Section>

        {/* Gold */}
        <Section title="Gold SJC" badge="gold_sjc_agent">
          <DataRow label="Buy Price" value={formatVND(Number(gold.sjc_buy_price || 0))} />
          <DataRow label="Sell Price" value={formatVND(Number(gold.sjc_sell_price || 0))} />
          <DataRow label="Holdings" value={`${gold.gold_holdings_tael || 0} tael`} />
          <DataRow label="Gold Value" value={formatVND(Number(gold.gold_value_vnd || 0))} />
          <DataRow label="Trend" value={String(gold.trend || "N/A")} />
        </Section>

        {/* Open Finance */}
        <Section title="Open Finance" badge="open_finance_agent">
          {externalAccounts.length > 0 ? (
            <>
              {externalAccounts.map((a, i) => (
                <DataRow
                  key={i}
                  label={`${a.bank} (${a.account_type})`}
                  value={formatVND(Number(a.balance_vnd || 0))}
                />
              ))}
              <Separator />
              <DataRow
                label="Total External"
                value={formatVND(Number(openFinance.total_external_balance || 0))}
              />
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No external accounts found</p>
          )}
        </Section>

        <div className="space-y-3 pt-2">
          <Textarea
            value={reason}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReason(e.target.value)}
            placeholder="Notes or corrections (optional)..."
            rows={2}
          />
          <div className="flex gap-3">
            <Button variant="destructive" onClick={() => onDecision(false, reason)} disabled={loading}>
              Flag Issues
            </Button>
            <Button onClick={() => onDecision(true, reason)} disabled={loading}>
              {loading ? "Processing..." : "Approve & Synthesize"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
