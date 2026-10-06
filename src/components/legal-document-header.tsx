import Image from "next/image";
import Link from "next/link";

export function LegalDocumentHeader({
  title,
  description,
  updated,
}: {
  title: string;
  description: string;
  updated: string;
}) {
  return (
    <header className="space-y-4">
      <Link href="/" className="inline-flex items-center gap-3">
        <Image
          alt="Relaygator app icon"
          className="h-16 w-16 rounded-xl object-cover"
          height={64}
          priority
          src="/relaygator-mark.png"
          width={64}
        />
        <span className="text-lg font-semibold tracking-normal text-neutral-950">Relaygator</span>
      </Link>
      <h1 className="text-3xl font-semibold tracking-normal">{title}</h1>
      <p className="text-base leading-7 text-neutral-600">{description}</p>
      <p className="text-sm text-neutral-500">Last updated: {updated}</p>
    </header>
  );
}
