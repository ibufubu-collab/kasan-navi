import { DIFFICULTY_LABEL, Difficulty, SANTEI_TYPE_LABEL } from "@/data/kasan-master";

const DIFFICULTY_CLS: Record<Difficulty, string> = {
  easy: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  medium: "bg-sky-50 text-sky-700 ring-1 ring-sky-200",
  hard: "bg-slate-100 text-slate-500 ring-1 ring-slate-200",
};

export function DifficultyChip({ difficulty }: { difficulty: Difficulty }) {
  return (
    <span
      className={`shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ${DIFFICULTY_CLS[difficulty]}`}
    >
      {DIFFICULTY_LABEL[difficulty]}
    </span>
  );
}

export function SanteiChip({ type }: { type: "auto" | "action" }) {
  const cls =
    type === "auto"
      ? "bg-violet-50 text-violet-700 ring-1 ring-violet-200"
      : "bg-orange-50 text-orange-700 ring-1 ring-orange-200";
  return (
    <span className={`shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ${cls}`}>
      {SANTEI_TYPE_LABEL[type]}
    </span>
  );
}
