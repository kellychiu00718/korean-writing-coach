import type { ProgressState } from "@/lib/grammar";

const STYLE: Record<ProgressState | "none", string> = {
  none: "bg-white border-line",
  seen: "bg-white border-dashed border-ink",
  know: "bg-peach border-ink",
  use: "bg-sage border-ink",
};

export function StateDot({ state }: { state?: ProgressState }) {
  return <i aria-hidden="true" className={`inline-block size-3.5 rounded-full border-2 ${STYLE[state ?? "none"]}`} />;
}
