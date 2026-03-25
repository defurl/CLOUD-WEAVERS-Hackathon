import { Badge } from "@/components/ui/badge";

type Lang = "en" | "vi";

interface NodeDef { id: string; label: Record<Lang, string>; isHuman?: boolean }

const NODES: NodeDef[] = [
  { id: "smart_paste_parser", label: { en: "Parse Input", vi: "Phân tích đầu vào" } },
  { id: "pii_redactor",       label: { en: "PII Redaction", vi: "Ẩn danh PII" } },
  { id: "gatekeeper",         label: { en: "AML / KYC", vi: "AML / KYC" } },
  { id: "rm_confirm_profile", label: { en: "RM Review 1", vi: "RM duyệt 1" }, isHuman: true },
  { id: "parallel",           label: { en: "Data Agents ×4", vi: "4 Tác tử dữ liệu" } },
  { id: "rm_review_agents",   label: { en: "RM Review 2", vi: "RM duyệt 2" }, isHuman: true },
  { id: "synthesizer",        label: { en: "AI Synthesis", vi: "Tổng hợp AI" } },
  { id: "rm_review_report",   label: { en: "RM Review 3", vi: "RM duyệt 3" }, isHuman: true },
];

const PARALLEL_NODES = ["real_estate_agent", "market_intel_agent", "gold_sjc_agent", "open_finance_agent"];

interface Props {
  currentNode: string;
  completedNodes: string[];
  lang: Lang;
  failedNode?: string;
}

export default function DAGStatus({ currentNode, completedNodes, lang, failedNode }: Props) {
  const getStatus = (nodeId: string) => {
    if (failedNode && (nodeId === failedNode || (nodeId === "parallel" && PARALLEL_NODES.includes(failedNode)))) {
      return "failed";
    }
    if (nodeId === "parallel") {
      const allDone = PARALLEL_NODES.every((n) => completedNodes.includes(n));
      if (allDone) return "completed";
      if (PARALLEL_NODES.some((n) => n === currentNode)) return "active";
      return "pending";
    }
    if (completedNodes.includes(nodeId)) return "completed";
    if (nodeId === currentNode) return "active";
    return "pending";
  };

  return (
    <div className="flex flex-col gap-1">
      {NODES.map((node, i) => {
        const status = getStatus(node.id);
        return (
          <div key={node.id} className="flex flex-col items-start gap-0.5">
            <div className={`flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-xs transition-all
              ${status === "completed" ? "bg-primary/10 text-primary font-medium" : ""}
              ${status === "active" ? "bg-blue-50 border border-blue-200 text-blue-700 font-medium animate-pulse" : ""}
              ${status === "failed" ? "bg-red-50 border border-red-200 text-red-700 font-medium" : ""}
              ${status === "pending" ? "text-muted-foreground/50" : ""}
            `}>
              <span className="w-4 text-center flex-shrink-0">
                {status === "completed" && "✓"}
                {status === "active" && "●"}
                {status === "failed" && "✕"}
                {status === "pending" && "○"}
              </span>
              <span>{node.label[lang]}</span>
              {node.isHuman && (
                <Badge variant="outline" className="ml-auto text-[9px] py-0 h-4 px-1 font-normal">
                  {lang === "vi" ? "người" : "human"}
                </Badge>
              )}
            </div>
            {i < NODES.length - 1 && (
              <div className="w-4 flex justify-center ml-2">
                <div className={`w-px h-3 ${status === "completed" ? "bg-primary/40" : "bg-border"}`} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
