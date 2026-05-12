import { formatStatusLabel } from "@/lib/posts/display";

const statusStyles: Record<string, string> = {
  DRAFT: "border-neutral-300 bg-neutral-50 text-neutral-800",
  SCHEDULED: "border-sky-300 bg-sky-50 text-sky-950",
  PROCESSING: "border-violet-300 bg-violet-50 text-violet-950",
  PUBLISHED: "border-emerald-300 bg-emerald-50 text-emerald-950",
  FAILED: "border-red-300 bg-red-50 text-red-950",
  RETRYING: "border-amber-300 bg-amber-50 text-amber-950",
  BLOCKED: "border-stone-400 bg-stone-100 text-stone-950",
  APPROVAL_PENDING: "border-amber-300 bg-amber-50 text-amber-950",
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
      className={`inline-flex min-h-7 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${statusStyles[status] ?? statusStyles.DRAFT} ${className}`}
      aria-label={`Status: ${label}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${dotStyles[status] ?? dotStyles.DRAFT}`}
        aria-hidden="true"
      />
      {label}
    </span>
  );
}
