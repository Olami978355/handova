import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

// Same key resolution used in supabase.ts — the old SUPABASE_SERVICE_ROLE_KEY
// env var is no longer populated under the new sb_secret_ key system, so it
// must be read from SUPABASE_SECRET_KEYS instead, or notifications silently
// fail to send across the entire deal flow.
function getServiceRoleKey(): string {
  const secretKeys = Deno.env.get('SUPABASE_SECRET_KEYS');
  if (secretKeys) {
    try {
      const parsed = JSON.parse(secretKeys);
      const key = parsed['default'] ?? Object.values(parsed)[0];
      if (key) return key as string;
    } catch { /* fall through */ }
  }
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
}

export const logDealAction = async (
  supabase: SupabaseClient,
  dealId: string,
  action: string,
  performedBy: string,
  details: Record<string, any>
) => {
  const { error } = await supabase
    .from('deal_logs')
    .insert({
      deal_id: dealId,
      action,
      performed_by: performedBy,
      details,
    });
  
  if (error) console.error('Error logging deal action:', error);
};

export const notifyDealParties = async (
  supabase: SupabaseClient,
  deal: any,
  title: string,
  body: string,
  link: string,
  type: string = 'info'
) => {
  const parties = [deal.tenant_id, deal.landlord_id];
  if (deal.agent_id) parties.push(deal.agent_id);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = getServiceRoleKey();
    
    if (supabaseUrl && serviceRoleKey) {
      await fetch(`${supabaseUrl}/functions/v1/send-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({
          user_ids: parties,
          title,
          body,
          link,
          type,
        }),
      });
    } else {
      // Fallback to direct insert if env vars are missing (unlikely in Edge Function)
      const notifications = parties.map(userId => ({
        user_id: userId,
        title,
        body,
        link,
        type,
        read: false,
      }));

      const { error } = await supabase
        .from('notifications')
        .insert(notifications);

      if (error) throw error;
    }
  } catch (error) {
    console.error('Error sending notifications:', error);
  }
};

export const sendEmail = async (
  to: string,
  subject: string,
  template: string,
  data: Record<string, any>
) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = getServiceRoleKey();
    
    if (supabaseUrl && serviceRoleKey) {
      const response = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({
          to,
          subject,
          template,
          data,
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Error calling send-email function: ${response.status} ${errorText}`);
      }
    }
  } catch (error) {
    console.error('Error in sendEmail utility:', error);
  }
};

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
