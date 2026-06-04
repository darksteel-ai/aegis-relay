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
    <span className="flex items-center gap-3">
      <Image
        alt=""
        aria-hidden="true"
        className={`${markClassName} shrink-0 rounded-md object-cover object-top`}
        height={512}
        src="/relaygator-mark.png"
        width={512}
      />
      {!compact ? (
        <span className={textClassName}>
          <span className="block text-sm font-semibold leading-none text-white">Relaygator</span>
          {subtitle ? (
            <span className="mt-1 block text-xs font-medium leading-none text-slate-500">
              {subtitle}
            </span>
          ) : null}
        </span>
      ) : null}
    </span>
  );
}
