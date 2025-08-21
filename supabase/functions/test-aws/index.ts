// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const awsAccessKey = Deno.env.get('AWS_ACCESS_KEY_ID')!;
    const awsSecretKey = Deno.env.get('AWS_SECRET_ACCESS_KEY')!;
    
    console.log(`AWS Access Key: ${awsAccessKey ? 'Found' : 'MISSING'}`);
    console.log(`AWS Secret Key: ${awsSecretKey ? 'Found' : 'MISSING'}`);
    console.log(`AWS Access Key length: ${awsAccessKey ? awsAccessKey.length : 0}`);
    console.log(`AWS Secret Key length: ${awsSecretKey ? awsSecretKey.length : 0}`);
    
    if (!awsAccessKey || !awsSecretKey) {
      throw new Error('AWS credentials not found');
    }

    // Clean credentials
    const cleanAccessKey = awsAccessKey.trim();
    const cleanSecretKey = awsSecretKey.trim();

    console.log(`Clean Access Key length: ${cleanAccessKey.length}`);
    console.log(`Clean Secret Key length: ${cleanSecretKey.length}`);
    console.log(`Access Key starts with: ${cleanAccessKey.substring(0, 4)}`);
    console.log(`Secret Key first 4 chars: ${cleanSecretKey.substring(0, 4)}...`);

    // Test with a simpler approach - use AWS SDK for Deno if available
    const result = await testAWSCredentials(cleanAccessKey, cleanSecretKey);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'AWS credentials are working!',
      response: result
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Test error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});

async function testAWSCredentials(accessKey: string, secretKey: string): Promise<string> {
  const region = 'us-east-1';
  const service = 'sts';
  const endpoint = `https://${service}.${region}.amazonaws.com/`;
  
  const timestamp = new Date().toISOString().replace(/[:\-]|\.\d{3}/g, '');
  const dateStamp = timestamp.substr(0, 8);
  
  const body = 'Action=GetCallerIdentity&Version=2011-06-15';
  const bodyHash = await sha256(body);
  
  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Host': `${service}.${region}.amazonaws.com`,
    'X-Amz-Date': timestamp,
  };
  
  const canonicalHeaders = Object.entries(headers)
    .sort(([a], [b]) => a.toLowerCase().localeCompare(b.toLowerCase()))
    .map(([k, v]) => `${k.toLowerCase()}:${v}`)
    .join('\n') + '\n';
  
  const signedHeaders = Object.keys(headers)
    .map(k => k.toLowerCase())
    .sort()
    .join(';');
  
  const canonicalRequest = [
    'POST',
    '/',
    '',
    canonicalHeaders,
    signedHeaders,
    bodyHash
  ].join('\n');
  
  const algorithm = 'AWS4-HMAC-SHA256';
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const requestHash = await sha256(canonicalRequest);
  
  const stringToSign = [
    algorithm,
    timestamp,
    credentialScope,
    requestHash
  ].join('\n');
  
  const signature = await calculateSignature(secretKey, dateStamp, region, service, stringToSign);
  
  const authorization = `${algorithm} Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      ...headers,
      'Authorization': authorization,
    },
    body: body,
  });
  
  console.log(`Response status: ${response.status}`);
  
  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`Error: ${errorBody}`);
    throw new Error(`AWS test failed: ${response.status} - ${errorBody}`);
  }
  
  const result = await response.text();
  console.log(`Success: ${result}`);
  return result;
}

async function sha256(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function hmacSha256(key: Uint8Array, message: string): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const keyObject = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', keyObject, encoder.encode(message));
  return new Uint8Array(signature);
}

async function calculateSignature(secretKey: string, dateStamp: string, region: string, service: string, stringToSign: string): Promise<string> {
  const encoder = new TextEncoder();
  
  const kDate = await hmacSha256(encoder.encode(`AWS4${secretKey}`), dateStamp);
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, service);
  const kSigning = await hmacSha256(kService, 'aws4_request');
  
  const signature = await hmacSha256(kSigning, stringToSign);
  return Array.from(signature).map(b => b.toString(16).padStart(2, '0')).join('');
}
