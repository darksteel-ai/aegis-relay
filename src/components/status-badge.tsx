import { formatStatusLabel } from "@/lib/posts/display";

const statusStyles: Record<string, string> = {
  DRAFT: "border-slate-500/30 bg-slate-500/10 text-slate-200",
  SCHEDULED: "border-cyan-300/45 bg-cyan-300/10 text-cyan-100",
  PROCESSING: "border-blue-300/40 bg-blue-300/10 text-blue-100",
  PUBLISHED: "border-emerald-300/45 bg-emerald-300/10 text-emerald-100",
  FAILED: "border-red-300/45 bg-red-400/10 text-red-100",
  RETRYING: "border-amber-300/45 bg-amber-300/10 text-amber-100",
  BLOCKED: "border-slate-400/35 bg-slate-400/10 text-slate-100",
  APPROVAL_PENDING: "border-amber-300/45 bg-amber-300/10 text-amber-100",
};

const dotStyles: Record<string, string> = {
  DRAFT: "bg-neutral-500",
  SCHEDULED: "bg-sky-600",
  PROCESSING: "bg-violet-600",
  PUBLISHED: "bg-emerald-600",
  FAILED: "bg-red-600",
  RETRYING: "bg-amber-600",
  BLOCKED: "bg-stone-700",
  APPROVAL_PENDING: "bg-amber-600",
};

type StatusBadgeProps = {
  status: string;
  className?: string;
};

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const label = formatStatusLabel(status);

  return (
    <span
      className={`inline-flex min-h-7 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold tracking-tight ${statusStyles[status] ?? statusStyles.DRAFT} ${className}`}
      aria-label={`Status: ${label}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full shadow-[0_0_8px_currentColor] ${dotStyles[status] ?? dotStyles.DRAFT}`}
        aria-hidden="true"
      />
      {label}
    </span>
  );
}
