import { redirect } from "next/navigation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  redirect("/connections?youtube=callback-pending");
}
