import Link from 'next/link';
import { adminFetch } from '@/lib/admin-fetch';
import { ListError } from '@/components/list-error';
import { DetailCard, Section } from '@/components/detail-card';
import { DataTable } from '@/components/data-table';
import { formatDateTime, formatRelative } from '@/lib/format';

export const dynamic = 'force-dynamic';

interface UserDetail {
  id: string;
  email: string;
  displayName: string | null;
  isAdmin: boolean;
  dataContributionConsent: boolean;
  createdAt: string;
  pondMembers: { role: 'OWNER' | 'TECHNICIAN' | 'VIEWER'; pond: { id: string; name: string } }[];
  _count: { refreshTokens: number };
}

export default async function UserDetailPage({ params }: { params: { id: string } }) {
  const u = await adminFetch<UserDetail>(`/users/${params.id}`);
  if ('error' in u) return <ListError title="User" error={u.error} />;

  return (
    <div className="space-y-5">
      <div>
        <Link href="/users" className="text-xs text-koi-mute hover:text-koi-red">← Users</Link>
        <h1 className="mt-1 text-2xl font-semibold text-koi-ink">{u.email}</h1>
      </div>

      <DetailCard
        title="Profile"
        rows={[
          { label: 'ID', value: <code className="text-xs">{u.id}</code> },
          { label: 'Display name', value: u.displayName ?? <span className="text-koi-mute">—</span> },
          {
            label: 'Admin',
            value: u.isAdmin ? (
              <span className="rounded bg-koi-red/10 px-2 py-0.5 text-xs font-medium text-koi-red">yes</span>
            ) : (
              <span className="text-koi-mute">no</span>
            ),
          },
          {
            label: 'Data sharing',
            value: u.dataContributionConsent ? (
              <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">opted-in</span>
            ) : (
              <span className="text-koi-mute">no</span>
            ),
          },
          { label: 'Joined', value: `${formatDateTime(u.createdAt)} (${formatRelative(u.createdAt)})` },
          { label: 'Active sessions', value: u._count.refreshTokens },
        ]}
      />

      <Section title={`Pond memberships (${u.pondMembers.length})`}>
        <DataTable
          rows={u.pondMembers}
          columns={[
            {
              header: 'Pond',
              cell: (m) => (
                <Link href={`/ponds/${m.pond.id}`} className="text-koi-ink hover:text-koi-red hover:underline">
                  {m.pond.name}
                </Link>
              ),
            },
            { header: 'Role', cell: (m) => <code className="text-xs">{m.role}</code> },
          ]}
          empty="Not a member of any pond."
        />
      </Section>
    </div>
  );
}
