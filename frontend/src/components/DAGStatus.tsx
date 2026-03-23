import { Badge } from "@/components/ui/badge";

type Lang = "en" | "vi";

const NODES: Record<Lang, Array<{ id: string; label: string }>> = {
  en: [
    { id: "smart_paste_parser", label: "Parse Input" },
    { id: "pii_redactor", label: "PII Redaction" },
    { id: "gatekeeper", label: "AML/KYC" },
    { id: "rm_confirm_profile", label: "RM Review 1" },
    { id: "parallel", label: "Data Agents" },
    { id: "rm_review_agents", label: "RM Review 2" },
    { id: "synthesizer", label: "Synthesis" },
    { id: "rm_review_report", label: "RM Review 3" },
  ],
  vi: [
    { id: "smart_paste_parser", label: "Phân tích đầu vào" },
    { id: "pii_redactor", label: "Ẩn danh PII" },
    { id: "gatekeeper", label: "AML/KYC" },
    { id: "rm_confirm_profile", label: "RM duyệt 1" },
    { id: "parallel", label: "Tác tử dữ liệu" },
    { id: "rm_review_agents", label: "RM duyệt 2" },
    { id: "synthesizer", label: "Tổng hợp" },
    { id: "rm_review_report", label: "RM duyệt 3" },
  ],
};

const PARALLEL_NODES = [
  "real_estate_agent",
  "market_intel_agent",
  "gold_sjc_agent",
  "open_finance_agent",
];

interface Props {
  currentNode: string;
  completedNodes: string[];
  lang: Lang;
}

export default function DAGStatus({ currentNode, completedNodes, lang }: Props) {
  const nodes = NODES[lang];

  const getStatus = (nodeId: string) => {
    if (nodeId === "parallel") {
      const anyActive = PARALLEL_NODES.some((n) => n === currentNode);
      const allDone = PARALLEL_NODES.every((n) => completedNodes.includes(n));
      if (allDone) return "completed";
      if (anyActive) return "active";
      return "pending";
    }
    if (completedNodes.includes(nodeId)) return "completed";
    if (nodeId === currentNode) return "active";
    return "pending";
  };

  const getVariant = (status: string) => {
    if (status === "completed") return "default" as const;
    if (status === "active") return "secondary" as const;
    return "outline" as const;
  };

  return (
    <div className="flex items-center gap-1.5 flex-wrap mb-6">
      {nodes.map((node, i) => {
        const status = getStatus(node.id);
        return (
          <div key={node.id} className="flex items-center gap-1.5">
            <Badge
              variant={getVariant(status)}
              className={
                status === "active"
                  ? "animate-pulse"
                  : status === "pending"
                    ? "opacity-40"
                    : ""
              }
            >
              {status === "completed" && <span className="mr-1">&#10003;</span>}
              {node.label}
            </Badge>
            {i < nodes.length - 1 && (
              <span className="text-muted-foreground text-xs">&#8594;</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
