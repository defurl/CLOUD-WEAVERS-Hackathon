const API_BASE = "http://localhost:8000/api/advisory";

export interface StartResponse {
  session_id: string;
  state: Record<string, unknown>;
  interrupted: boolean;
  interrupt_data: Record<string, unknown> | null;
}

export interface ApproveResponse {
  state: Record<string, unknown>;
  interrupted: boolean;
  interrupt_data: Record<string, unknown> | null;
  completed: boolean;
}

export interface FormData {
  name: string;
  phone: string;
  id_number: string;
  address: string;
  casa_balance: string;
  risk_profile: string;
  investment_goals: string;
  monthly_income: string;
  occupation: string;
  existing_loans: string;
  property_area_sqm: string;
  property_type: string;
  gold_holdings_tael: string;
}

export async function fetchScenarios(): Promise<{ scenarios: Array<Record<string, string>> }> {
  const res = await fetch(`${API_BASE}/scenarios`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function startAdvisoryForm(data: FormData): Promise<StartResponse> {
  const res = await fetch(`${API_BASE}/start-form`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...data,
      casa_balance: parseFloat(data.casa_balance) || 0,
      monthly_income: parseFloat(data.monthly_income) || 0,
      existing_loans: parseFloat(data.existing_loans) || 0,
      property_area_sqm: parseFloat(data.property_area_sqm) || 0,
      gold_holdings_tael: parseFloat(data.gold_holdings_tael) || 0,
    }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function approveCheckpoint(
  sessionId: string,
  approved: boolean,
  reason = ""
): Promise<ApproveResponse> {
  const res = await fetch(`${API_BASE}/approve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId, approved, reason }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
