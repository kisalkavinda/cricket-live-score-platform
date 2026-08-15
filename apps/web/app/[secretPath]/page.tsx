import { notFound, redirect } from 'next/navigation';
import { getAdminEntryPath, getAdminSession } from '@/lib/auth/admin-auth';
import AdminLoginClient from './AdminLoginClient';

export default async function SecretAdminEntryPage({
  params,
}: {
  params: Promise<{ secretPath: string }>;
}) {
  const { secretPath } = await params;
  const configuredEntryPath = getAdminEntryPath();

  if (secretPath !== configuredEntryPath) {
    notFound();
  }

  const session = await getAdminSession();
  if (session.authenticated) {
    redirect(`/${configuredEntryPath}/dashboard`);
  }

  return <AdminLoginClient secretPath={configuredEntryPath} />;
}
