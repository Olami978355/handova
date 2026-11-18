import React, { useEffect, useState } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Building2, User } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { ListingFormData } from '../../hooks/useListingForm';

interface Option {
  id: string;
  name: string;
}

export const ListUnderSelector: React.FC<{ form: UseFormReturn<ListingFormData> }> = ({ form }) => {
  const { user, profile } = useAuth();
  const [options, setOptions] = useState<Option[]>([]);
  const selected = form.watch('company_id') || '';

  useEffect(() => {
    if (!user || profile?.role !== 'agent') return;
    (async () => {
      const { data: rows } = await supabase
        .from('company_members')
        .select('company_id')
        .eq('member_id', user.id)
        .eq('status', 'active');
      const ids = (rows || []).map(r => r.company_id);
      if (ids.length === 0) { setOptions([]); return; }
      const { data: cos } = await supabase
        .from('companies')
        .select('id, name')
        .in('id', ids);
      setOptions(cos || []);
    })();
  }, [user, profile?.role]);

  if (options.length === 0) return null;

  const choices: Option[] = [{ id: '', name: 'Myself' }, ...options];

  return (
    <div className="bg-white/4 border border-white/8 rounded-2xl p-4">
      <p className="text-[12px] font-bold text-white/50 uppercase tracking-wider mb-3">
        List under
      </p>
      <div className="flex flex-wrap gap-2">
        {choices.map(c => {
          const active = selected === c.id;
          const Icon = c.id ? Building2 : User;
          return (
            <button
              type="button"
              key={c.id || 'self'}
              onClick={() => form.setValue('company_id', c.id || undefined)}
              className={
                'flex items-center gap-2 px-4 py-2.5 rounded-xl border text-[13px] font-semibold transition-colors ' +
                (active
                  ? 'bg-gold/15 border-gold/40 text-gold'
                  : 'bg-transparent border-white/10 text-white/60 hover:border-white/20')
              }
            >
              <Icon className="w-4 h-4" /> {c.name}
            </button>
          );
        })}
      </div>
      {selected && (
        <p className="text-[11px] text-white/35 mt-3">
          This listing will belong to the company. You stay the agent
          who handles enquiries, and payments go to the company.
        </p>
      )}
    </div>
  );
};
