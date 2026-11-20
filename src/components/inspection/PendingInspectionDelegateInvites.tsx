import React, { useEffect, useState } from 'react';
import { Users, Check, X, Loader2, CalendarDays, AlertCircle } from 'lucide-react';
import { supabase, requireValidSession } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

interface PendingInvite {
  id: string;
  booking_id: string;
  principal_id: string;
  principal_name: string;
  property_title: string;
}

export const PendingInspectionDelegateInvites: React.FC = () => {
  const { user } = useAuth();
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchInvites = async () => {
    if (!user) {
      setInvites([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const { data: rows, error: rowsError } = await supabase
        .from('inspection_delegates')
        .select('id, booking_id, principal_id, inspection_bookings(properties(title))')
        .eq('delegate_id', user.id)
        .eq('status', 'pending');

      if (rowsError) throw rowsError;

      if (!rows || rows.length === 0) {
        setInvites([]);
        return;
      }

      const principalIds = [...new Set(rows.map((row: any) => row.principal_id))];

      const { data: profiles, error: profilesError } = await supabase
        .from('public_profiles')
        .select('id, full_name')
        .in('id', principalIds);

      if (profilesError) throw profilesError;

      const nameById = new Map(
        (profiles || []).map(profile => [profile.id, profile.full_name])
      );

      setInvites(
        rows.map((row: any) => ({
          id: row.id,
          booking_id: row.booking_id,
          principal_id: row.principal_id,
          principal_name: nameById.get(row.principal_id) || 'Someone',
          property_title: row.inspection_bookings?.properties?.title || 'Property inspection',
        }))
      );
    } catch (err) {
      console.error('Error fetching delegate invitations:', err);
      setError('Unable to load inspection invitations. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvites();
  }, [user?.id]);

  const respond = async (inviteId: string, accept: boolean) => {
    setResponding(inviteId);
    setError(null);

    try {
      if (!(await requireValidSession())) return;

      const { error: functionError } = await supabase.functions.invoke(
        'respond-to-inspection-delegate-invite',
        {
          body: { inviteId, accept },
        }
      );

      if (functionError) throw functionError;

      setInvites(previous => previous.filter(invite => invite.id !== inviteId));
    } catch (err) {
      console.error('Error responding to delegate invitation:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to submit your response. Please try again.'
      );
    } finally {
      setResponding(null);
    }
  };

  if (loading) {
    return (
      <div className="mb-6 flex items-center gap-2 py-3 text-[11px] text-[#89867d]">
        <Loader2 className="h-4 w-4 animate-spin" />
        Checking inspection invitations...
      </div>
    );
  }

  if (invites.length === 0 && !error) return null;

  return (
    <section
      className="mb-6 space-y-3"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#a18a50]">
            Inspection requests
          </p>
          <h3
            className="mt-1 text-[19px] font-medium text-[#171915]"
            style={{ fontFamily: "'Newsreader', serif" }}
          >
            Invitations to attend
          </h3>
        </div>

        {invites.length > 0 && (
          <span className="rounded-full bg-[#f1ecdf] px-3 py-1 text-[10px] font-semibold text-[#8d7540]">
            {invites.length} pending
          </span>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 p-3 text-[11px] text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {invites.map(invite => (
        <article
          key={invite.id}
          className="rounded-2xl border border-[#e9e4d9] bg-white p-4 sm:p-5"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f3efe5] text-[#9c8247]">
              <Users className="h-5 w-5" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-semibold leading-relaxed text-[#25251f]">
                {invite.principal_name} has invited you to attend a property inspection on their behalf.
              </p>

              <div className="mt-3 flex items-center gap-2 rounded-lg bg-[#f8f7f4] px-3 py-2.5">
                <CalendarDays className="h-4 w-4 shrink-0 text-[#a18a50]" />
                <span className="truncate text-[11px] font-medium text-[#55534d]">
                  {invite.property_title}
                </span>
              </div>

              <p className="mt-2 text-[10px] leading-relaxed text-[#89867d]">
                You are being asked to represent this person at the inspection.
              </p>

              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => respond(invite.id, true)}
                  disabled={responding !== null}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#b69a55] px-3 py-2.5 text-[11px] font-semibold text-white transition-colors hover:bg-[#9e8240] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {responding === invite.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Check className="h-3.5 w-3.5" />
                  )}
                  Accept invitation
                </button>

                <button
                  type="button"
                  onClick={() => respond(invite.id, false)}
                  disabled={responding !== null}
                  className="flex items-center justify-center gap-2 rounded-lg border border-[#e5e1d8] bg-white px-4 py-2.5 text-[11px] font-semibold text-[#68665e] transition-colors hover:bg-[#f7f6f2] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <X className="h-3.5 w-3.5" />
                  Decline
                </button>
              </div>
            </div>
          </div>
        </article>
      ))}
    </section>
  );
};
