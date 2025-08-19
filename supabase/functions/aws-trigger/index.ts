import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { region, instanceType } = await req.json();
    
    console.log('AWS Trigger received:', { region, instanceType });
    
    const awsKey = Deno.env.get('AWS_KEY');
    if (!awsKey) {
      throw new Error('AWS_KEY not configured');
    }

    // Simulate AWS EC2 instance deployment
    // In a real implementation, this would use AWS SDK or API calls
    const deploymentResponse = {
      success: true,
      message: 'AWS deployment initiated successfully',
      instanceId: `i-${Math.random().toString(36).substring(2, 15)}`,
      region,
      instanceType,
      status: 'launching',
      timestamp: new Date().toISOString()
    };

    console.log('AWS deployment response:', deploymentResponse);

    return new Response(JSON.stringify(deploymentResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });
    
  } catch (error) {
    console.error('Error in aws-trigger function:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});