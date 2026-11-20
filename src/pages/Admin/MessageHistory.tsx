import React, { useEffect, useState } from 'react';
import { Loader2, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '../../lib/supabase';

const font = { fontFamily: "'Plus Jakarta Sans', sans-serif" };

interface Revision {
  id: string;
  message_id: string;
  conversation_id: string;
  sender_id: string;
  previous_content: string | null;
  change_kind: 'edit' | 'delete_for_everyone';
  changed_at: string;
  changed_by: string | null;
}

export default function MessageHistory() {
  const [rows, setRows] = useState<Revision[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error: err } = await supabase
        .from('message_revisions')
        .select('*')
        .order('changed_at', { ascending: false })
        .limit(100);
      if (err) { setError(err.message); setLoading(false); return; }
      const list = (data || []) as Revision[];
      setRows(list);
      const ids = [...new Set(list.flatMap(r => [r.sender_id, r.changed_by]).filter(Boolean))] as string[];
      if (ids.length > 0) {
        const { data: people } = await supabase.from('profiles').select('id, full_name').in('id', ids);
        setNames(Object.fromEntries((people || []).map(p => [p.id, p.full_name || 'Unnamed'])));
      }
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-5 h-5 text-gold animate-spin" />
      </div>
    );
  }

  return (
    <div style={font}>
      <p className="text-[12px] text-white/40 mb-4">
        Previous versions of edited or deleted messages, newest first (latest 100). Read-only evidence for disputes.
      </p>
      {error && <p className="text-[12px] text-danger mb-3">{error}</p>}
      {rows.length === 0 ? (
        <div className="bg-ink border border-white/6 rounded-2xl p-10 text-center">
          <MessageSquare className="w-6 h-6 text-white/20 mx-auto mb-2" />
          <p className="text-[13px] text-white/30">No edited or deleted messages recorded yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map(r => (
            <div key={r.id} className="bg-ink border border-white/6 rounded-2xl p-4">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-2 text-[11px] text-white/40">
                <span className={r.change_kind === 'delete_for_everyone' ? 'font-bold text-danger' : 'font-bold text-gold'}>
                  {r.change_kind === 'delete_for_everyone' ? 'Deleted for everyone' : 'Edited'}
                </span>
                <span>{format(new Date(r.changed_at), 'd MMM yyyy, HH:mm')}</span>
                <span>Sender: {names[r.sender_id] || r.sender_id.slice(0, 8)}</span>
                <span>Changed by: {r.changed_by ? (names[r.changed_by] || r.changed_by.slice(0, 8)) : 'not recorded'}</span>
                <span>Conversation {r.conversation_id.slice(0, 8)}</span>
              </div>
              <p className="text-[13px] text-white/70 whitespace-pre-wrap break-words">
                {r.previous_content || '(no text)'}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
