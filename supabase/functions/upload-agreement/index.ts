import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createSupabaseClient, createAdminClient } from '../_shared/supabase.ts';
import { logDealAction, notifyDealParties, corsHeaders } from '../_shared/utils.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createSupabaseClient(req);
    const adminSupabase = createAdminClient();
    
    // 1. Parse form data
    const formData = await req.formData();
    const dealId = formData.get('dealId') as string;
    const file = formData.get('file') as File;

    if (!dealId || !file) {
      throw new Error('Missing dealId or file');
    }

    // 2. Validate file (PDF or Image, max 20MB)
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Only PDF and image files (JPG, PNG, WebP) are allowed');
    }
    if (file.size > 20 * 1024 * 1024) {
      throw new Error('File size exceeds 20MB limit');
    }

    // 3. Verify caller authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('Unauthorized');

    // 4. Fetch deal details
    const { data: deal, error: dealError } = await adminSupabase
      .from('deals')
      .select('*, properties(*)')
      .eq('id', dealId)
      .single();

    if (dealError || !deal) throw new Error('Deal not found');

    // 5. Validate caller has permission (landlord or agent)
    if (user.id !== deal.landlord_id && user.id !== deal.agent_id) {
      throw new Error('Permission denied. Only the landlord or agent can upload the agreement.');
    }

    // 6. Upload to Storage
    const filePath = `${dealId}/agreement.pdf`;
    const { data: uploadData, error: uploadError } = await adminSupabase.storage
      .from('agreements')
      .upload(filePath, file, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: { publicUrl } } = adminSupabase.storage
      .from('agreements')
      .getPublicUrl(filePath);

    // 7. Update deal status and agreement_url
    const { error: updateError } = await adminSupabase
      .from('deals')
      .update({ 
        status: 'agreement_sent', 
        agreement_url: publicUrl,
        updated_at: new Date().toISOString() 
      })
      .eq('id', dealId);

    if (updateError) throw updateError;

    // 8. Log action
    await logDealAction(adminSupabase, dealId, 'agreement_uploaded', user.id, {
      file_path: filePath,
    });

    // 9. Notify tenant
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (supabaseUrl && serviceRoleKey) {
      await fetch(`${supabaseUrl}/functions/v1/send-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({
          user_id: deal.tenant_id,
          title: 'Tenancy Agreement Ready',
          body: `Your tenancy agreement for ${deal.properties.title} is ready for review. Please review and sign.`,
          link: `/dashboard/deals/${dealId}`,
          type: 'deal_state_change',
        }),
      });

      if (deal.agent_id && user.id !== deal.agent_id) {
        await fetch(`${supabaseUrl}/functions/v1/send-notification`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${serviceRoleKey}`,
          },
          body: JSON.stringify({
            user_id: deal.agent_id,
            title: 'Agreement Uploaded',
            body: `The tenancy agreement for ${deal.properties.title} has been uploaded.`,
            link: `/dashboard/deals/${dealId}`,
            type: 'deal_state_change',
          }),
        });
      }
    }

    return new Response(JSON.stringify({ success: true, agreement_url: publicUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Upload agreement error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
