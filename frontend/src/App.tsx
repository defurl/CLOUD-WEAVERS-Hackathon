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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

type Step = "form" | "confirm_profile" | "review_agents" | "review_report" | "completed" | "rejected";
type Lang = "en" | "vi";

function App() {
  const [lang, setLang] = useState<Lang>("vi");
  const [step, setStep] = useState<Step>("form");
  const [sessionId, setSessionId] = useState("");
  const [interruptData, setInterruptData] = useState<Record<string, unknown> | null>(null);
  const [finalReport, setFinalReport] = useState("");
  const [currentNode, setCurrentNode] = useState("");
  const [completedNodes, setCompletedNodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleStart = async (data: FormData) => {
    setLoading(true);
    setError("");
    try {
      const res = await startAdvisoryForm(data);
      setSessionId(res.session_id);
      setCompletedNodes(["smart_paste_parser", "pii_redactor", "gatekeeper"]);

      if (res.interrupted && res.interrupt_data) {
        const iType = res.interrupt_data.type as string;
        setInterruptData(res.interrupt_data);
        if (iType === "confirm_profile") {
          setStep("confirm_profile");
          setCurrentNode("rm_confirm_profile");
        }
      } else {
        setStep("rejected");
        setError(
          (res.state.compliance_reason as string) || (lang === "vi" ? "Khách hàng không vượt qua kiểm tra AML/KYC" : "Client did not pass AML/KYC screening")
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : (lang === "vi" ? "Lỗi kết nối máy chủ" : "Server connection error"));
    } finally {
      setLoading(false);
    }
  };

  const handleProfileDecision = async (approved: boolean, reason: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await approveCheckpoint(sessionId, approved, reason);

      if (!approved) {
        setStep("rejected");
        setError(lang === "vi" ? "RM đã từ chối hồ sơ khách hàng" : "RM has rejected the client profile");
        return;
      }

      setCompletedNodes((prev) => [
        ...prev,
        "rm_confirm_profile",
        "real_estate_agent",
        "market_intel_agent",
        "gold_sjc_agent",
        "open_finance_agent",
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
      setError(e instanceof Error ? e.message : (lang === "vi" ? "Lỗi kết nối máy chủ" : "Server connection error"));
    } finally {
      setLoading(false);
    }
  };

  const handleAgentsDecision = async (approved: boolean, reason: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await approveCheckpoint(sessionId, approved, reason);

      if (!approved) {
        setStep("rejected");
        setError(lang === "vi" ? "RM đã đánh dấu vấn đề trong dữ liệu tác tử" : "RM flagged issues with agent data");
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
      setError(e instanceof Error ? e.message : (lang === "vi" ? "Lỗi kết nối máy chủ" : "Server connection error"));
    } finally {
      setLoading(false);
    }
  };

  const handleReportDecision = async (approved: boolean, reason: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await approveCheckpoint(sessionId, approved, reason);
      setCompletedNodes((prev) => [...prev, "rm_review_report"]);

      if (approved) {
        setFinalReport((res.state.advisory_report as string) || "");
        setStep("completed");
      } else {
        setStep("rejected");
        setError(lang === "vi" ? "RM yêu cầu chỉnh sửa báo cáo" : "RM requested report revision");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : (lang === "vi" ? "Lỗi kết nối máy chủ" : "Server connection error"));
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStep("form");
    setSessionId("");
    setInterruptData(null);
    setFinalReport("");
    setCurrentNode("");
    setCompletedNodes([]);
    setError("");
  };

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Viet-Advisory Orchestrator</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {lang === "vi" ? "Trợ lý AI cho Chuyên viên Quan hệ Khách hàng" : "AI Co-Pilot for Relationship Managers"}
              </p>
            </div>
            <div className="inline-flex rounded-md border p-1 bg-white">
              <Button
                type="button"
                size="sm"
                variant={lang === "vi" ? "default" : "ghost"}
                onClick={() => setLang("vi")}
              >
                VI
              </Button>
              <Button
                type="button"
                size="sm"
                variant={lang === "en" ? "default" : "ghost"}
                onClick={() => setLang("en")}
              >
                EN
              </Button>
            </div>
          </div>
          <Separator className="mt-4" />
        </div>

        {step !== "form" && (
          <DAGStatus currentNode={currentNode} completedNodes={completedNodes} lang={lang} />
        )}

        {error && (
          <Card className="border-destructive mb-6 shadow-sm">
            <CardContent className="pt-6">
              <p className="text-destructive text-sm">{error}</p>
              <Button variant="outline" onClick={reset} className="mt-3" size="sm">
                {lang === "vi" ? "Bắt đầu lại" : "Start Over"}
              </Button>
            </CardContent>
          </Card>
        )}

        {step === "form" && <ClientForm onSubmit={handleStart} loading={loading} lang={lang} />}

        {step === "confirm_profile" && interruptData && (
          <ProfileReview
            interruptData={interruptData}
            onDecision={handleProfileDecision}
            loading={loading}
            lang={lang}
          />
        )}

        {step === "review_agents" && interruptData && (
          <AgentResultsReview
            interruptData={interruptData}
            onDecision={handleAgentsDecision}
            loading={loading}
            lang={lang}
          />
        )}

        {step === "review_report" && interruptData && (
          <ReportReview
            interruptData={interruptData}
            onDecision={handleReportDecision}
            loading={loading}
            lang={lang}
          />
        )}

        {step === "completed" && (
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>{lang === "vi" ? "Báo cáo đã được phê duyệt" : "Report Approved"}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border bg-muted/30 p-6 max-h-150 overflow-y-auto prose prose-sm max-w-none
                prose-headings:text-foreground prose-p:text-foreground prose-li:text-foreground
                prose-strong:text-foreground prose-td:text-foreground prose-th:text-muted-foreground
                prose-table:w-full prose-th:border prose-td:border prose-th:px-3 prose-th:py-2
                prose-td:px-3 prose-td:py-2 prose-th:bg-muted prose-hr:border-border">
                <Markdown remarkPlugins={[remarkGfm]}>{finalReport}</Markdown>
              </div>
              <Button variant="outline" onClick={reset} className="mt-4">
                {lang === "vi" ? "Tạo phiên tư vấn mới" : "New Advisory Session"}
              </Button>
            </CardContent>
          </Card>
        )}

        {step === "rejected" && !error && (
          <Card className="border-destructive shadow-sm">
            <CardContent className="pt-6">
              <p className="text-sm">{lang === "vi" ? "Phiên tư vấn đã bị hủy." : "Advisory session has been cancelled."}</p>
              <Button variant="outline" onClick={reset} className="mt-3" size="sm">
                {lang === "vi" ? "Bắt đầu lại" : "Start Over"}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default App;
