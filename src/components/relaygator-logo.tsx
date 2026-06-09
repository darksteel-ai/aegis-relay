import Image from "next/image";

type RelaygatorLogoProps = {
  subtitle?: string;
  compact?: boolean;
  markClassName?: string;
  textClassName?: string;
};

export function RelaygatorLogo({
  subtitle,
  compact = false,
  markClassName = "h-12 w-12",
  textClassName = "",
}: RelaygatorLogoProps) {
  return (
    <span className="group flex items-center gap-3">
      <span className="relative shrink-0">
        <span
          aria-hidden="true"
          className="absolute -inset-1 rounded-xl bg-gradient-to-br from-[#8dff5a]/40 to-[#2bd6ff]/40 opacity-0 blur-md transition-opacity duration-300 group-hover:opacity-100"
        />
        <Image
          alt=""
          aria-hidden="true"
          className={`${markClassName} relative shrink-0 rounded-xl object-cover object-top ring-1 ring-white/10`}
          height={512}
          src="/relaygator-mark.png"
          width={512}
        />
      </span>
      {!compact ? (
        <span className={textClassName}>
          <span className="block text-lg font-bold leading-none tracking-tight text-white">
            Relaygator
          </span>
          {subtitle ? (
            <span className="mt-1.5 block text-xs font-medium leading-none text-slate-500">
              {subtitle}
            </span>
          ) : null}
        </span>
      ) : null}
    </span>
  );
}
