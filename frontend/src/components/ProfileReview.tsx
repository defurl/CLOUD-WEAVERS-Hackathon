import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";

const PROFILE_LABELS: Record<string, string> = {
  name: "Full Name",
  phone: "Phone",
  id_number: "National ID (CCCD)",
  address: "Address",
  casa_balance: "CASA Balance",
  risk_profile: "Risk Profile",
  investment_goals: "Investment Goals",
  monthly_income: "Monthly Income",
  occupation: "Occupation",
  existing_loans: "Existing Loans",
  property_area_sqm: "Property Area",
  property_type: "Property Type",
  gold_holdings_tael: "Gold Holdings",
};

const REDACTED_LABELS: Record<string, string> = {
  client_id: "Client ID (hashed)",
  district: "District (only)",
  casa_balance: "CASA Balance",
  risk_profile: "Risk Profile",
  investment_goals: "Investment Goals",
  monthly_income: "Monthly Income",
  occupation: "Occupation",
  existing_loans: "Existing Loans",
  property_area_sqm: "Property Area",
  property_type: "Property Type",
  gold_holdings_tael: "Gold Holdings",
};

const COMPLIANCE_BADGE: Record<string, { label: string; variant: "default" | "destructive" | "secondary" }> = {
  passed: { label: "PASSED", variant: "default" },
  warning: { label: "WARNING", variant: "secondary" },
  failed: { label: "FAILED", variant: "destructive" },
};

function formatValue(key: string, value: unknown): string {
  if (typeof value === "number") {
    if (["casa_balance", "monthly_income", "existing_loans"].includes(key)) {
      return new Intl.NumberFormat("vi-VN").format(value) + " VND";
    }
    if (key === "property_area_sqm") return `${value} m2`;
    if (key === "gold_holdings_tael") return `${value} tael`;
  }
  if (key === "risk_profile") {
    const m: Record<string, string> = { conservative: "Conservative", moderate: "Moderate", aggressive: "Aggressive" };
    return m[String(value)] || String(value);
  }
  return String(value);
}

interface Props {
  interruptData: Record<string, unknown>;
  onDecision: (approved: boolean, reason: string) => void;
  loading: boolean;
}

export default function ProfileReview({ interruptData, onDecision, loading }: Props) {
  const [reason, setReason] = useState("");
  const profile = (interruptData.client_profile || {}) as Record<string, unknown>;
  const redacted = (interruptData.redacted_profile || {}) as Record<string, unknown>;
  const complianceStatus = (interruptData.compliance_status as string) || "passed";
  const complianceReason = interruptData.compliance_reason as string;
  const complianceDetail = (interruptData.compliance_detail || {}) as Record<string, unknown>;

  const badgeInfo = COMPLIANCE_BADGE[complianceStatus] || COMPLIANCE_BADGE.passed;

  return (
    <Card className="shadow-md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Checkpoint 1: Review Client Profile</CardTitle>
            <CardDescription>Verify profile, PII redaction, and compliance results</CardDescription>
          </div>
          <Badge variant={badgeInfo.variant}>
            AML/KYC: {badgeInfo.label}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{complianceReason}</p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Compliance Detail */}
        {complianceDetail && Object.keys(complianceDetail).length > 0 && (
          <div className="rounded-lg border p-4 space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Compliance Checks</h3>
            {complianceDetail.aml_blacklist !== undefined && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">AML Blacklist</span>
                <Badge variant={complianceDetail.aml_blacklist ? "destructive" : "default"} className="text-[10px]">
                  {complianceDetail.aml_blacklist ? "HIT" : "CLEAR"}
                </Badge>
              </div>
            )}
            {complianceDetail.bad_debt !== undefined && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Bad Debt (CIC)</span>
                <Badge variant={complianceDetail.bad_debt ? "secondary" : "default"} className="text-[10px]">
                  {complianceDetail.bad_debt ? "FLAGGED" : "CLEAR"}
                </Badge>
              </div>
            )}
            {complianceDetail.pep !== undefined && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">PEP List</span>
                <Badge variant={complianceDetail.pep ? "secondary" : "default"} className="text-[10px]">
                  {complianceDetail.pep ? "MATCH" : "CLEAR"}
                </Badge>
              </div>
            )}
            {complianceDetail.bad_debt_group && (
              <p className="text-xs text-muted-foreground">
                Bad debt group: {String(complianceDetail.bad_debt_group)} — {String(complianceDetail.bad_debt_reason || "")}
              </p>
            )}
          </div>
        )}

        <Separator />

        {/* PII Redaction: Before / After */}
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            PII Redaction — Before vs After
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {/* Original */}
            <div className="rounded-lg border p-3">
              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase">Original (Raw)</p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Field</TableHead>
                    <TableHead className="text-xs">Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(profile)
                    .filter(([, v]) => v !== "" && v !== null && v !== undefined && v !== 0)
                    .map(([key, value]) => (
                      <TableRow key={key}>
                        <TableCell className="text-xs text-muted-foreground py-1.5">
                          {PROFILE_LABELS[key] || key}
                        </TableCell>
                        <TableCell className="text-xs py-1.5">{formatValue(key, value)}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
            {/* Redacted */}
            <div className="rounded-lg border border-green-200 bg-green-50/30 p-3">
              <p className="text-xs font-semibold text-green-700 mb-2 uppercase">Redacted (Safe)</p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Field</TableHead>
                    <TableHead className="text-xs">Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(redacted)
                    .filter(([, v]) => v !== "" && v !== null && v !== undefined && v !== 0)
                    .map(([key, value]) => (
                      <TableRow key={key}>
                        <TableCell className="text-xs text-muted-foreground py-1.5">
                          {REDACTED_LABELS[key] || key}
                        </TableCell>
                        <TableCell className="text-xs py-1.5">{formatValue(key, value)}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Name, ID, phone, and full address have been removed. Only district-level location is retained for property valuation.
          </p>
        </div>

        <div className="space-y-3 pt-2">
          <Textarea
            value={reason}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReason(e.target.value)}
            placeholder="Notes (optional)..."
            rows={2}
          />
          <div className="flex gap-3">
            <Button variant="destructive" onClick={() => onDecision(false, reason)} disabled={loading}>
              Reject
            </Button>
            <Button onClick={() => onDecision(true, reason)} disabled={loading}>
              {loading ? "Processing..." : "Approve & Run Agents"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
