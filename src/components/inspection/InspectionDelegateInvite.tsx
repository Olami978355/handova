import React, { useEffect, useState } from 'react';
import { UserPlus, Loader2, X, CheckCircle, Clock, UserRound } from 'lucide-react';
import { supabase, requireValidSession } from '../../lib/supabase';

interface DelegateRow {
  id: string;
  delegate_id: string;
  status: 'pending' | 'accepted' | 'declined' | 'revoked';
  delegate?: { full_name: string };
}

interface InspectionDelegateInviteProps {
  bookingId: string;
  isTenant: boolean;
}

export const InspectionDelegateInvite: React.FC<InspectionDelegateInviteProps> = ({
  bookingId,
  isTenant,
}) => {
  const [delegates, setDelegates] = useState<DelegateRow[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [username, setUsername] = useState('');
  const [inviting, setInviting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDelegates = async () => {
    try {
      const { data: rows, error: rowsError } = await supabase
        .from('inspection_delegates')
        .select('id, delegate_id, status')
        .eq('booking_id', bookingId)
        .in('status', ['pending', 'accepted']);

      if (rowsError) throw rowsError;

      if (!rows || rows.length === 0) {
        setDelegates([]);
        return;
      }

      const ids = [...new Set(rows.map(row => row.delegate_id))];

      const { data: profiles, error: profilesError } = await supabase
        .from('public_profiles')
        .select('id, full_name')
        .in('id', ids);

      if (profilesError) throw profilesError;

      const nameById = new Map(
        (profiles || []).map(profile => [profile.id, profile.full_name])
      );

      setDelegates(
        rows.map(row => ({
          ...row,
          delegate: {
            full_name: nameById.get(row.delegate_id) || 'Delegate',
          },
        }))
      );
    } catch (err) {
      console.error('Error fetching inspection delegates:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDelegates();
  }, [bookingId]);

  const handleInvite = async () => {
    const cleaned = username
      .trim()
      .replace(/^@/, '')
      .toLowerCase();

    if (!cleaned) return;

    setInviting(true);
    setError(null);

    try {
      if (!(await requireValidSession())) return;

      const { error: functionError } = await supabase.functions.invoke(
        'invite-inspection-delegate',
        {
          body: {
            bookingId,
            delegateUsername: cleaned,
          },
        }
      );

      if (functionError) throw functionError;

      setUsername('');
      setShowForm(false);
      await fetchDelegates();
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to send invitation. Please try again.'
      );
    } finally {
      setInviting(false);
    }
  };

  if (!isTenant && delegates.length === 0) return null;

  return (
    <div className="mt-3 space-y-3" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {delegates.length > 0 && (
        <div className="space-y-2">
          <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#969187]">
            Inspection delegate
          </p>

          {delegates.map(delegate => (
            <div
              key={delegate.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-[#eae6dd] bg-[#faf9f6] px-3.5 py-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#eee9dc] text-[#927a43]">
                  <UserRound className="h-4 w-4" />
                </div>

                <div className="min-w-0">
                  <p className="truncate text-[12px] font-semibold text-[#25251f]">
                    {delegate.delegate?.full_name || 'Delegate'}
                  </p>
                  <p className="mt-0.5 text-[10px] text-[#89867d]">
                    Attending on your behalf
                  </p>
                </div>
              </div>

              <span
                className={`flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[9px] font-semibold ${
                  delegate.status === 'accepted'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'border-amber-200 bg-amber-50 text-amber-800'
                }`}
              >
                {delegate.status === 'accepted' ? (
                  <CheckCircle className="h-3 w-3" />
                ) : (
                  <Clock className="h-3 w-3" />
                )}
                {delegate.status === 'accepted' ? 'Accepted' : 'Pending'}
              </span>
            </div>
          ))}
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-2 py-2 text-[11px] text-[#969187]">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Loading delegate details...
        </div>
      )}

      {isTenant && delegates.length === 0 && !showForm && !loading && (
        <button
          type="button"
          onClick={() => {
            setError(null);
            setShowForm(true);
          }}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#dcd5c6] bg-[#faf9f6] px-4 py-3 text-[11px] font-semibold text-[#8d7540] transition-colors hover:border-[#b69a55] hover:bg-[#f5f1e7]"
        >
          <UserPlus className="h-4 w-4" />
          Invite someone to attend for you
        </button>
      )}

      {showForm && (
        <div className="rounded-xl border border-[#e8e3d8] bg-[#faf9f6] p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h4 className="text-[13px] font-semibold text-[#25251f]">
                Invite a delegate
              </h4>
              <p className="mt-1 text-[10px] text-[#89867d]">
                Enter their Handova username.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setError(null);
              }}
              disabled={inviting}
              className="rounded-full p-1.5 text-[#89867d] transition-colors hover:bg-[#efede7] hover:text-[#25251f]"
              aria-label="Close invitation form"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <label className="mb-1.5 block text-[10px] font-semibold text-[#68665e]">
            Handova username
          </label>

          <div className="flex items-center rounded-lg border border-[#e4dfd4] bg-white px-3 focus-within:border-[#b69a55]">
            <span className="text-[13px] text-[#aaa397]">@</span>
            <input
              type="text"
              value={username}
              onChange={event => setUsername(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Enter' && !inviting && username.trim()) {
                  handleInvite();
                }
              }}
              placeholder="username"
              disabled={inviting}
              className="w-full bg-transparent px-2 py-3 text-[12px] text-[#25251f] outline-none placeholder:text-[#b4b0a7] disabled:opacity-50"
            />
          </div>

          {error && (
            <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-[10px] leading-relaxed text-red-700">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={handleInvite}
            disabled={inviting || !username.trim()}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-[#b69a55] py-3 text-[11px] font-semibold text-white transition-colors hover:bg-[#9e8240] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {inviting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Sending invitation...
              </>
            ) : (
              <>
                <UserPlus className="h-3.5 w-3.5" />
                Send invitation
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
