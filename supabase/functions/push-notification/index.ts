import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

interface PushRequest {
  session_code: string;
  target_player_id: string;
  campaign_name: string;
  message_type: 'turn_reminder' | 'session_summary';
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return new Response(
        JSON.stringify({ error: 'Missing Supabase environment variables' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { session_code, target_player_id, campaign_name, message_type } =
      (await req.json()) as PushRequest;

    if (!session_code || !target_player_id || !campaign_name || !message_type) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: session_code, target_player_id, campaign_name, message_type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { data: tokenRow, error: tokenError } = await supabase
      .from('push_tokens')
      .select('expo_push_token')
      .eq('player_id', target_player_id)
      .single();

    if (tokenError || !tokenRow) {
      return new Response(
        JSON.stringify({ sent: false, reason: 'no_token' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const pushToken: string = tokenRow.expo_push_token;

    let body: string;
    if (message_type === 'turn_reminder') {
      body = `\u00C9 a sua vez em '${campaign_name}'!`;
    } else {
      body = `O resumo da sua sess\u00E3o em '${campaign_name}' est\u00E1 pronto.`;
    }

    const pushPayload = {
      to: pushToken,
      title: 'DungeonMind',
      body,
      data: {
        session_code,
        type: message_type,
      },
    };

    const pushResponse = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(pushPayload),
    });

    if (!pushResponse.ok) {
      const errorBody = await pushResponse.text();
      return new Response(
        JSON.stringify({ sent: false, reason: 'expo_api_error', details: errorBody }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ sent: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
