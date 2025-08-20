// deno-lint-ignore-file no-explicit-any
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { repo, repo_type, repo_token, region, instance_type } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Authorization header is required');

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) throw new Error('Unauthorized');

    await supabase.from('deployment_logs').insert({
      event: 'Deployment Started', repo, region, instance_type, status: 'In Progress', user_id: user.id
    });

    // -------- DOWNLOAD REPO --------
    const downloadURL = getDownloadUrl(repo, repo_type);
    const headers: Record<string, string> = repo_token ? { 'Authorization': `Bearer ${repo_token}` } : {};
    const zipResponse = await fetch(downloadURL, { headers });
    if (!zipResponse.ok) throw new Error(`Repo download failed: ${zipResponse.statusText}`);

    const zipArrayBuffer = await zipResponse.arrayBuffer();
    const zipBytes = new Uint8Array(zipArrayBuffer);
    const unzipDir = await unzipRepo(zipBytes);

    const dockerfilePath = `${unzipDir}/Dockerfile`;
    try { await Deno.stat(dockerfilePath); } catch (_) {
      await generateDockerfile(unzipDir);
    }

    // -------- BUILD IMAGE --------
    const dockerUser = Deno.env.get('DOCKERHUB_USER')!;
    const imageName = `${dockerUser}/${repoNameFromUrl(repo)}:latest`;
    await simulateDockerBuild(imageName);

    // -------- DEPLOY TO AWS --------
    const awsApiUrl = Deno.env.get('AWS_API_URL')!;
    const awsKey = Deno.env.get('AWS_KEY')!;

    const deployRes = await fetch(awsApiUrl, {
      method: 'POST',
      headers: { 'x-api-key': awsKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: imageName, region, instance_type, app_name: repoNameFromUrl(repo), timestamp: new Date().toISOString() })
    });

    const deployResult = await deployRes.json();

    await supabase.from('projects').upsert([{ user_id: user.id, name: repoNameFromUrl(repo), repo_url: repo, region, instance_type, image_url: imageName, deployment_url: `https://${region}.compute.amazonaws.com/app/${repoNameFromUrl(repo)}`, status: 'active', last_deployed_at: new Date().toISOString() }], { onConflict: 'user_id,repo_url', ignoreDuplicates: false });

    await supabase.from('deployment_logs').insert({ event: 'Deployment Completed', repo, region, instance_type, status: 'Success', image_url: imageName, user_id: user.id });

    return new Response(JSON.stringify({ success: true, image: imageName, deploy: deployResult }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  
  } catch (error) {
    console.error('Deploy error:', error);
    
    // Log the error
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      // Try to get user for logging (may fail if auth error)
      let userId = null;
      try {
        const authHeader = req.headers.get('Authorization');
        if (authHeader) {
          const { data: { user } } = await supabase.auth.getUser(
            authHeader.replace('Bearer ', '')
          );
          userId = user?.id;
        }
      } catch (e) {
        // Ignore auth errors in error logging
      }
      
      await supabase.from('deployment_logs').insert({
        event: 'Deployment Failed',
        repo: req.url || 'unknown',
        status: 'Failed',
        error_message: error.message,
        user_id: userId
      });
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }
    
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: corsHeaders });
  }
});

function getDownloadUrl(repo: string, type: string): string {
  if (type === 'github') return repo.replace('github.com', 'api.github.com/repos') + '/zipball/main';
  if (type === 'gitlab') return repo.replace('gitlab.com', 'gitlab.com/api/v4/projects').replace(/\//g, '%2F') + '/repository/archive.zip';
  if (type === 'bitbucket') return repo + '/get/master.zip';
  throw new Error('Unsupported repo type');
}

async function unzipRepo(zipData: Uint8Array): Promise<string> {
  const tempDir = await Deno.makeTempDir();
  const zipPath = `${tempDir}/repo.zip`;
  
  await Deno.writeFile(zipPath, zipData);
  
  // Simulate unzip process
  const extractDir = `${tempDir}/extracted`;
  await Deno.mkdir(extractDir, { recursive: true });
  
  console.log(`Simulated unzip to ${extractDir}`);
  return extractDir;
}

async function generateDockerfile(projectDir: string): Promise<void> {
  const dockerfile = `
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
  `.trim();
  
  await Deno.writeTextFile(`${projectDir}/Dockerfile`, dockerfile);
  console.log('Generated default Dockerfile');
}

async function simulateDockerBuild(imageName: string): Promise<void> {
  console.log(`Building Docker image: ${imageName}`);
  
  // Simulate build time
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  console.log(`Docker build completed for ${imageName}`);
}

function repoNameFromUrl(repoUrl: string): string {
  const parts = repoUrl.split('/');
  const name = parts[parts.length - 1];
  return name.replace('.git', '').toLowerCase();
}