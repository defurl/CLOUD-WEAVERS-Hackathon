import { useState } from "react";
import ClientForm from "./components/ClientForm";
import ProfileReview from "./components/ProfileReview";
import AgentResultsReview from "./components/AgentResultsReview";
import ReportReview from "./components/ReportReview";
import DAGStatus from "./components/DAGStatus";
import { startAdvisoryForm, approveCheckpoint } from "./api";
import type { FormData } from "./api";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

type Step =
  | "form"
  | "confirm_profile"
  | "review_agents"
  | "review_report"
  | "completed"
  | "aml_blocked"      // Hard stop — AML/KYC failed before any checkpoint
  | "rm_cancelled"     // RM rejected at CP1 or CP2
  | "revise_report";   // RM wants to edit report at CP3

type Lang = "en" | "vi";

interface RejectionInfo {
  checkpoint: "aml" | "cp1" | "cp2" | "cp3";
  reason: string;
  complianceDetail?: Record<string, unknown>;
  savedFormData?: FormData;
}

function App() {
  const [lang, setLang] = useState<Lang>("vi");
  const [step, setStep] = useState<Step>("form");
  const [sessionId, setSessionId] = useState("");
  const [interruptData, setInterruptData] = useState<Record<string, unknown> | null>(null);
  const [finalReport, setFinalReport] = useState("");
  const [editedReport, setEditedReport] = useState("");
  const [currentNode, setCurrentNode] = useState("");
  const [completedNodes, setCompletedNodes] = useState<string[]>([]);
  const [failedNode, setFailedNode] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [rejection, setRejection] = useState<RejectionInfo | null>(null);
  const [savedFormData, setSavedFormData] = useState<FormData | null>(null);

  const t = (vi: string, en: string) => lang === "vi" ? vi : en;

  const handleStart = async (data: FormData) => {
    setLoading(true);
    setSavedFormData(data);
    try {
      const res = await startAdvisoryForm(data);
      setSessionId(res.session_id);
      setCompletedNodes(["smart_paste_parser", "pii_redactor", "gatekeeper"]);
      setFailedNode(undefined);

      if (res.interrupted && res.interrupt_data) {
        setInterruptData(res.interrupt_data);
        setStep("confirm_profile");
        setCurrentNode("rm_confirm_profile");
      } else {
        // AML hard block — no interrupt, DAG terminated at gatekeeper
        const detail = (res.state.compliance_detail || {}) as Record<string, unknown>;
        const reason = (res.state.compliance_reason as string) || t("Không vượt qua kiểm tra AML/KYC", "Did not pass AML/KYC screening");
        setFailedNode("gatekeeper");
        setRejection({ checkpoint: "aml", reason, complianceDetail: detail, savedFormData: data });
        setStep("aml_blocked");
      }
    } catch (e) {
      setRejection({ checkpoint: "aml", reason: e instanceof Error ? e.message : t("Lỗi kết nối máy chủ", "Server connection error") });
      setStep("aml_blocked");
    } finally {
      setLoading(false);
    }
  };

  const handleProfileDecision = async (approved: boolean, reason: string) => {
    setLoading(true);
    try {
      const res = await approveCheckpoint(sessionId, approved, reason);

      if (!approved) {
        setFailedNode("rm_confirm_profile");
        setRejection({ checkpoint: "cp1", reason: reason || t("RM từ chối hồ sơ", "RM rejected profile"), savedFormData: savedFormData ?? undefined });
        setStep("rm_cancelled");
        return;
      }

      setCompletedNodes((prev) => [
        ...prev, "rm_confirm_profile",
        "real_estate_agent", "market_intel_agent", "gold_sjc_agent", "open_finance_agent",
      ]);

      if (res.interrupted && res.interrupt_data) {
        setInterruptData(res.interrupt_data);
        setStep("review_agents");
        setCurrentNode("rm_review_agents");
      } else if (res.completed) {
        setFinalReport((res.state.advisory_report as string) || "");
        setStep("completed");
      }
    } catch (e) {
      setRejection({ checkpoint: "cp1", reason: e instanceof Error ? e.message : t("Lỗi kết nối", "Connection error") });
      setStep("rm_cancelled");
    } finally {
      setLoading(false);
    }
  };

  const handleAgentsDecision = async (approved: boolean, reason: string) => {
    setLoading(true);
    try {
      const res = await approveCheckpoint(sessionId, approved, reason);

      if (!approved) {
        setFailedNode("rm_review_agents");
        setRejection({ checkpoint: "cp2", reason: reason || t("RM gắn cờ vấn đề trong dữ liệu", "RM flagged data issues"), savedFormData: savedFormData ?? undefined });
        setStep("rm_cancelled");
        return;
      }

      setCompletedNodes((prev) => [...prev, "rm_review_agents", "synthesizer"]);

      if (res.interrupted && res.interrupt_data) {
        setInterruptData(res.interrupt_data);
        setStep("review_report");
        setCurrentNode("rm_review_report");
      } else if (res.completed) {
        setFinalReport((res.state.advisory_report as string) || "");
        setStep("completed");
      }
    } catch (e) {
      setRejection({ checkpoint: "cp2", reason: e instanceof Error ? e.message : t("Lỗi kết nối", "Connection error") });
      setStep("rm_cancelled");
    } finally {
      setLoading(false);
    }
  };

  const handleReportDecision = async (approved: boolean, reason: string) => {
    setLoading(true);
    try {
      const res = await approveCheckpoint(sessionId, approved, reason);

      if (approved) {
        setCompletedNodes((prev) => [...prev, "rm_review_report"]);
        setFinalReport((res.state.advisory_report as string) || "");
        setStep("completed");
      } else {
        // Don't terminate — let RM edit inline
        const report = (interruptData?.advisory_report as string) || "";
        setEditedReport(report);
        setRejection({ checkpoint: "cp3", reason: reason || t("RM yêu cầu chỉnh sửa", "RM requested revision") });
        setStep("revise_report");
      }
    } catch (e) {
      setRejection({ checkpoint: "cp3", reason: e instanceof Error ? e.message : t("Lỗi kết nối", "Connection error") });
      setStep("revise_report");
    } finally {
      setLoading(false);
    }
  };

  const handleApproveEdited = () => {
    setCompletedNodes((prev) => [...prev, "rm_review_report"]);
    setFinalReport(editedReport);
    setStep("completed");
  };

  const reset = () => {
    setStep("form");
    setSessionId("");
    setInterruptData(null);
    setFinalReport("");
    setEditedReport("");
    setCurrentNode("");
    setCompletedNodes([]);
    setFailedNode(undefined);
    setRejection(null);
    setSavedFormData(null);
  };

  const restoreForm = () => {
    setStep("form");
    setCurrentNode("");
    setCompletedNodes([]);
    setFailedNode(undefined);
    setRejection(null);
  };

  const checkpointLabel = (cp: RejectionInfo["checkpoint"]) => {
    const map: Record<typeof cp, string> = {
      aml: "AML/KYC Gatekeeper",
      cp1: t("Checkpoint 1 — Hồ sơ khách hàng", "Checkpoint 1 — Client Profile"),
      cp2: t("Checkpoint 2 — Dữ liệu tác tử", "Checkpoint 2 — Agent Data"),
      cp3: t("Checkpoint 3 — Báo cáo", "Checkpoint 3 — Report"),
    };
    return map[cp];
  };

  const showSidebar = step !== "form";

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className={`mx-auto px-4 py-8 ${showSidebar ? "max-w-6xl flex gap-6 items-start" : "max-w-2xl"}`}>

        {/* ── Sidebar ── */}
        {showSidebar && (
          <aside className="w-64 shrink-0 sticky top-8 space-y-4">
            {/* Branding */}
            <div>
              <h1 className="text-base font-semibold tracking-tight">Viet-Advisory</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t("Trợ lý AI cho CVQHKH", "AI Co-Pilot for RMs")}
              </p>
            </div>
            <Separator />

            {/* DAG Progress */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                {t("Tiến trình DAG", "DAG Progress")}
              </p>
              <DAGStatus
                currentNode={currentNode}
                completedNodes={completedNodes}
                lang={lang}
                failedNode={failedNode}
              />
            </div>

            <Separator />

            {/* Session info */}
            {sessionId && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                  {t("Phiên làm việc", "Session")}
                </p>
                <p className="text-[10px] text-muted-foreground font-mono break-all">{sessionId.slice(0, 18)}…</p>
              </div>
            )}

            {/* Lang toggle */}
            <div className="inline-flex rounded-md border p-0.5 bg-white">
              <Button type="button" size="sm" variant={lang === "vi" ? "default" : "ghost"}
                className="h-6 px-2 text-xs" onClick={() => setLang("vi")}>VI</Button>
              <Button type="button" size="sm" variant={lang === "en" ? "default" : "ghost"}
                className="h-6 px-2 text-xs" onClick={() => setLang("en")}>EN</Button>
            </div>
          </aside>
        )}

        {/* ── Main content ── */}
        <div className={showSidebar ? "flex-1 min-w-0 space-y-4" : "space-y-6"}>

          {/* Header when on form step */}
          {!showSidebar && (
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">Viet-Advisory Orchestrator</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {t("Trợ lý AI cho Chuyên viên Quan hệ Khách hàng", "AI Co-Pilot for Relationship Managers")}
                </p>
              </div>
              <div className="inline-flex rounded-md border p-1 bg-white">
                <Button type="button" size="sm" variant={lang === "vi" ? "default" : "ghost"} onClick={() => setLang("vi")}>VI</Button>
                <Button type="button" size="sm" variant={lang === "en" ? "default" : "ghost"} onClick={() => setLang("en")}>EN</Button>
              </div>
            </div>
          )}

          {/* ── FORM ── */}
          {step === "form" && <ClientForm onSubmit={handleStart} loading={loading} lang={lang} />}

          {/* ── CP1: Profile Review ── */}
          {step === "confirm_profile" && interruptData && (
            <ProfileReview interruptData={interruptData} onDecision={handleProfileDecision} loading={loading} lang={lang} />
          )}

          {/* ── CP2: Agent Results ── */}
          {step === "review_agents" && interruptData && (
            <AgentResultsReview interruptData={interruptData} onDecision={handleAgentsDecision} loading={loading} lang={lang} />
          )}

          {/* ── CP3: Report Review ── */}
          {step === "review_report" && interruptData && (
            <ReportReview interruptData={interruptData} onDecision={handleReportDecision} loading={loading} lang={lang} />
          )}

          {/* ── Completed ── */}
          {step === "completed" && (
            <Card className="shadow-md">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle>{t("Báo cáo đã được phê duyệt", "Report Approved")}</CardTitle>
                  <Badge variant="default">{t("Hoàn thành", "Complete")}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border bg-muted/30 p-6 max-h-[600px] overflow-y-auto prose prose-sm max-w-none
                  prose-headings:text-foreground prose-p:text-foreground prose-li:text-foreground
                  prose-strong:text-foreground prose-td:text-foreground prose-th:text-muted-foreground
                  prose-table:w-full prose-th:border prose-td:border prose-th:px-3 prose-th:py-2
                  prose-td:px-3 prose-td:py-2 prose-th:bg-muted prose-hr:border-border">
                  <Markdown remarkPlugins={[remarkGfm]}>{finalReport}</Markdown>
                </div>
                <Button variant="outline" onClick={reset} className="mt-4">
                  {t("Tạo phiên tư vấn mới", "New Advisory Session")}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* ── AML Blocked ── */}
          {step === "aml_blocked" && rejection && (
            <Card className="shadow-md border-destructive">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-destructive">{t("Bị chặn: AML/KYC Thất bại", "Blocked: AML/KYC Failed")}</CardTitle>
                  <Badge variant="destructive">FAILED</Badge>
                </div>
                <CardDescription>
                  {t("Hệ thống đã dừng xử lý. Không thể tiếp tục với hồ sơ này.", "Processing halted. Cannot proceed with this client.")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                  <p className="text-xs font-semibold text-destructive uppercase mb-1">
                    {t("Lý do", "Reason")}
                  </p>
                  <p className="text-sm">{rejection.reason}</p>
                </div>

                {rejection.complianceDetail && Object.keys(rejection.complianceDetail).length > 0 && (
                  <div className="rounded-lg border p-4 space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase">
                      {t("Chi tiết kiểm tra", "Check Details")}
                    </p>
                    {(["aml_check", "bad_debt_check", "pep_check"] as const).map((key) => {
                      const val = rejection.complianceDetail?.[key];
                      if (!val) return null;
                      const isFail = String(val).includes("FAIL") || String(val).includes("WARNING");
                      return (
                        <div key={key} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{key.replace(/_check$/, "").toUpperCase()}</span>
                          <Badge variant={isFail ? "destructive" : "default"} className="text-[10px]">
                            {String(val)}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" onClick={reset}>
                    {t("Khách hàng mới", "New Client")}
                  </Button>
                  {rejection.savedFormData && (
                    <Button variant="ghost" onClick={restoreForm}>
                      {t("Sửa thông tin đã nhập", "Edit Submitted Info")}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── RM Cancelled (CP1 or CP2) ── */}
          {step === "rm_cancelled" && rejection && (
            <Card className="shadow-md border-amber-300">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle>{t("Phiên bị huỷ bởi RM", "Session Cancelled by RM")}</CardTitle>
                  <Badge variant="secondary">{t("Đã huỷ", "Cancelled")}</Badge>
                </div>
                <CardDescription>{checkpointLabel(rejection.checkpoint)}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4">
                  <p className="text-xs font-semibold text-amber-700 uppercase mb-1">
                    {t("Ghi chú của RM", "RM Notes")}
                  </p>
                  <p className="text-sm">{rejection.reason || t("(Không có ghi chú)", "(No notes provided)")}</p>
                </div>

                <p className="text-xs text-muted-foreground">
                  {t(
                    "Phiên làm việc này đã kết thúc. Bạn có thể bắt đầu phiên mới hoặc quay lại sửa thông tin.",
                    "This session has ended. You can start a new session or go back to edit the submitted information.",
                  )}
                </p>

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" onClick={reset}>
                    {t("Phiên mới", "New Session")}
                  </Button>
                  {rejection.savedFormData && (
                    <Button variant="ghost" onClick={restoreForm}>
                      {t("Quay lại và sửa form", "Go Back & Edit Form")}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Report Revision (CP3) ── */}
          {step === "revise_report" && (
            <Card className="shadow-md">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle>{t("Chỉnh sửa báo cáo", "Edit Report")}</CardTitle>
                  <Badge variant="secondary">{t("Đang chỉnh sửa", "Editing")}</Badge>
                </div>
                <CardDescription>
                  {rejection?.reason
                    ? `${t("Ghi chú RM", "RM note")}: ${rejection.reason}`
                    : t("Chỉnh sửa trực tiếp nội dung báo cáo bên dưới.", "Edit the report content directly below.")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <textarea
                  className="w-full rounded-md border bg-muted/20 p-4 font-mono text-xs resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                  rows={28}
                  value={editedReport}
                  onChange={(e) => setEditedReport(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => setStep("review_report")}>
                    {t("Quay lại xem trước", "Back to Preview")}
                  </Button>
                  <Button onClick={handleApproveEdited} disabled={!editedReport.trim()}>
                    {t("Phê duyệt phiên bản đã sửa", "Approve Edited Version")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
