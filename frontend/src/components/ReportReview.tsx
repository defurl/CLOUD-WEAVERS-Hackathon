import { useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  interruptData: Record<string, unknown>;
  onDecision: (approved: boolean, reason: string) => void;
  loading: boolean;
}

export default function ReportReview({ interruptData, onDecision, loading }: Props) {
  const [reason, setReason] = useState("");
  const report = (interruptData.advisory_report || "") as string;

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle>Review Advisory Report</CardTitle>
        <CardDescription>Please review the report before sending to the client</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border bg-muted/30 p-6 max-h-150 overflow-y-auto prose prose-sm max-w-none
          prose-headings:text-foreground prose-p:text-foreground prose-li:text-foreground
          prose-strong:text-foreground prose-td:text-foreground prose-th:text-muted-foreground
          prose-table:w-full prose-th:border prose-td:border prose-th:px-3 prose-th:py-2
          prose-td:px-3 prose-td:py-2 prose-th:bg-muted prose-hr:border-border">
          <Markdown remarkPlugins={[remarkGfm]}>{report}</Markdown>
        </div>

        <div className="mt-4 space-y-3">
          <Textarea
            value={reason}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReason(e.target.value)}
            placeholder="Revision notes (optional)..."
            rows={2}
          />
          <div className="flex gap-3">
            <Button variant="destructive" onClick={() => onDecision(false, reason)} disabled={loading}>
              Request Revision
            </Button>
            <Button onClick={() => onDecision(true, reason)} disabled={loading}>
              {loading ? "Processing..." : "Approve & Send to Client"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
