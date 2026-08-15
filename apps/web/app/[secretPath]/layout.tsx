import { notFound } from "next/navigation";
import { getAdminEntryPath } from "@/lib/auth/admin-auth";

export default async function ManagementLayout({

  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ secretPath: string }>;
}) {
  const { secretPath } = await params;
  const configuredEntryPath = getAdminEntryPath();

  if (secretPath !== configuredEntryPath) {
    notFound();
  }

  return <>{children}</>;
}
