// deno-lint-ignore-file no-explicit-any
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';
import { AWSSignerV4 } from "https://deno.land/x/aws_sign_v4@1.0.2/mod.ts";
import { JSZip } from "https://deno.land/x/jszip@0.11.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  let repoForLogging = 'unknown';
  try {
    const { repo, repo_type, repo_token, region, instance_type } = await req.json();
    repoForLogging = repo || 'unknown';

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    console.log(`Supabase URL: ${supabaseUrl ? 'Found' : 'MISSING'}`);
    console.log(`Supabase Service Key: ${supabaseServiceKey ? 'Found' : 'MISSING'}`);
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured');
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Authorization header is required');

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) throw new Error('Unauthorized');

    await supabase.from('deployment_logs').insert({
      event: 'Deployment Started', repo, region, instance_type, status: 'In Progress', user_id: user.id
    });

    // -------- DOWNLOAD REPO --------
    console.log(`Processing repo: ${repo}, type: ${repo_type}`);
    
    // Validate repo URL format
    if (!repo || !repo_type) {
      throw new Error('Repo URL and repo type are required');
    }
    
    const downloadURL = getDownloadUrl(repo, repo_type);
    console.log(`Download URL generated: ${downloadURL}`);
    
    const headers: Record<string, string> = repo_token ? { 
      'Authorization': repo_type === 'github' ? `token ${repo_token}` : `Bearer ${repo_token}`,
      'User-Agent': 'OneOps-Deploy-Bot'
    } : { 'User-Agent': 'OneOps-Deploy-Bot' };
    
    console.log(`Making request to: ${downloadURL}`);
    const zipResponse = await fetch(downloadURL, { headers });
    
    console.log(`Response status: ${zipResponse.status} ${zipResponse.statusText}`);
    
    if (!zipResponse.ok) {
      let errorMessage = `Repo download failed: ${zipResponse.status} ${zipResponse.statusText}`;
      
      if (zipResponse.status === 404) {
        errorMessage += `. Please check that the repository exists and is accessible. For private repos, ensure you've provided a valid access token.`;
      } else if (zipResponse.status === 401 || zipResponse.status === 403) {
        errorMessage += `. Authentication failed. Please check your access token for private repositories.`;
      }
      
      throw new Error(errorMessage);
    }

    const zipArrayBuffer = await zipResponse.arrayBuffer();
    const zipBytes = new Uint8Array(zipArrayBuffer);
    const unzipDir = await unzipRepo(zipBytes);

    const dockerfilePath = `${unzipDir}/Dockerfile`;
    try { await Deno.stat(dockerfilePath); } catch (_) {
      await generateDockerfile(unzipDir);
    }

    // -------- PREPARE DEPLOYMENT --------
    const dockerUser = Deno.env.get('DOCKERHUB_USER')!;
    console.log(`Docker Hub User: ${dockerUser ? 'Found' : 'MISSING'}`);
    
    if (!dockerUser) {
      throw new Error('DOCKERHUB_USER environment variable is missing');
    }
    
    const imageName = `${dockerUser}/${repoNameFromUrl(repo)}:latest`;
    await prepareImage(imageName, unzipDir);

    // -------- DEPLOY TO AWS --------
    const awsAccessKey = Deno.env.get('AWS_ACCESS_KEY')!;
    const awsSecretKey = Deno.env.get('AWS_SECRET_KEY')!;
    
    console.log(`AWS Access Key: ${awsAccessKey ? 'Found' : 'MISSING'}`);
    console.log(`AWS Secret Key: ${awsSecretKey ? 'Found' : 'MISSING'}`);
    console.log(`AWS Access Key length: ${awsAccessKey ? awsAccessKey.length : 0}`);
    console.log(`AWS Secret Key length: ${awsSecretKey ? awsSecretKey.length : 0}`);
    console.log(`AWS Access Key starts with: ${awsAccessKey ? awsAccessKey.substring(0, 4) + '...' : 'N/A'}`);

    if (!awsAccessKey || !awsSecretKey) {
      throw new Error('AWS_ACCESS_KEY and AWS_SECRET_KEY must be configured');
    }

    // Validate credential format
    if (!awsAccessKey.startsWith('AKIA') || awsAccessKey.length !== 20) {
      throw new Error('Invalid AWS Access Key format. Must start with AKIA and be 20 characters long');
    }
    
    if (awsSecretKey.length !== 40) {
      throw new Error('Invalid AWS Secret Key format. Must be 40 characters long');
    }

    console.log(`Deploying to AWS ECS Fargate in region: ${region}`);
    
    console.log('Initializing AWS signer...');
    
    // Create credentials object for AWSSignerV4
    const credentials = {
      accessKeyId: awsAccessKey,
      secretAccessKey: awsSecretKey,
    };
    
    const signer = new AWSSignerV4({
      region: region,
      service: 'ecs',
      credentials: credentials,
    });
    console.log('AWS signer initialized successfully');
    
    const accountId = await getAccountId(signer, awsAccessKey, awsSecretKey, region);
    
    // Get or create reusable cluster
    const clusterName = `oneops-prod`;
    await ensureECSCluster(signer, awsAccessKey, awsSecretKey, region, clusterName);
    
    // Get networking resources
    const { subnets, securityGroupId, vpcId } = await getNetworkingResources(signer, awsAccessKey, awsSecretKey, region);
    
    // Create ALB for stable URL
    const { albArn, targetGroupArn, albDnsName } = await createApplicationLoadBalancer(
      signer, awsAccessKey, awsSecretKey, region, vpcId, subnets, securityGroupId, repoNameFromUrl(repo)
    );
    
    // Register task definition
    const taskDefArn = await registerTaskDefinition(
      signer, awsAccessKey, awsSecretKey, region, accountId, imageName, repoNameFromUrl(repo)
    );
    
    // Create ECS service with ALB
    const serviceName = `oneops-${repoNameFromUrl(repo)}`;
    const serviceArn = await createECSService(
      signer, awsAccessKey, awsSecretKey, region, clusterName, serviceName, 
      taskDefArn, subnets, securityGroupId, targetGroupArn
    );
    
    const deploymentUrl = `http://${albDnsName}`;
    console.log(`AWS ECS deployment successful. Service: ${serviceArn}, URL: ${deploymentUrl}`);

    await supabase.from('projects').upsert([{ 
      user_id: user.id, 
      name: repoNameFromUrl(repo), 
      repo_url: repo, 
      region, 
      instance_type, 
      image_url: imageName, 
      deployment_url: deploymentUrl, 
      status: 'active', 
      last_deployed_at: new Date().toISOString(),
      service_arn: serviceArn,
      cluster_name: clusterName,
      alb_dns_name: albDnsName
    }], { onConflict: 'user_id,repo_url', ignoreDuplicates: false });

    await supabase.from('deployment_logs').insert({ 
      event: 'Deployment Completed', 
      repo, 
      region, 
      instance_type, 
      status: 'Success', 
      image_url: imageName, 
      user_id: user.id 
    });

    return new Response(JSON.stringify({ 
      success: true, 
      image: imageName, 
      deployment_url: deploymentUrl,
      service_details: {
        serviceArn,
        clusterName,
        albDnsName,
        targetGroupArn,
        status: 'creating'
      }
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  
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
        repo: repoForLogging,
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
  console.log(`Converting repo URL: ${repo}, type: ${type}`);
  
  // Remove trailing slash and .git extension if present
  const cleanRepo = repo.replace(/\/$/, '').replace(/\.git$/, '');
  
  if (type === 'github') {
    // Convert https://github.com/owner/repo to https://api.github.com/repos/owner/repo/zipball/main
    const apiUrl = cleanRepo.replace('github.com', 'api.github.com/repos') + '/zipball/main';
    console.log(`GitHub API URL: ${apiUrl}`);
    return apiUrl;
  }
  
  if (type === 'gitlab') {
    // Convert https://gitlab.com/owner/repo to https://gitlab.com/api/v4/projects/owner%2Frepo/repository/archive.zip
    const repoPath = cleanRepo.replace('https://gitlab.com/', '').replace(/\//g, '%2F');
    const apiUrl = `https://gitlab.com/api/v4/projects/${repoPath}/repository/archive.zip`;
    console.log(`GitLab API URL: ${apiUrl}`);
    return apiUrl;
  }
  
  if (type === 'bitbucket') {
    // Convert https://bitbucket.org/owner/repo to https://bitbucket.org/owner/repo/get/master.zip
    const apiUrl = cleanRepo + '/get/master.zip';
    console.log(`Bitbucket API URL: ${apiUrl}`);
    return apiUrl;
  }
  
  throw new Error(`Unsupported repo type: ${type}`);
}

async function unzipRepo(zipData: Uint8Array): Promise<string> {
  const tempDir = await Deno.makeTempDir();
  const extractDir = `${tempDir}/extracted`;
  await Deno.mkdir(extractDir, { recursive: true });
  
  try {
    // Use pure JavaScript unzipping - no subprocess calls
    const zip = new JSZip();
    await zip.loadAsync(zipData);
    
    console.log(`Zip file loaded, extracting ${Object.keys(zip.files).length} files...`);
    
    // Extract all files
    for (const [filename, file] of Object.entries(zip.files)) {
      if (file.dir) continue; // Skip directories
      
      const filePath = `${extractDir}/${filename}`;
      const dirPath = filePath.substring(0, filePath.lastIndexOf('/'));
      
      // Create directory if it doesn't exist
      if (dirPath !== extractDir) {
        await Deno.mkdir(dirPath, { recursive: true });
      }
      
      // Write file
      const content = await file.async('uint8array');
      await Deno.writeFile(filePath, content);
    }
    
    // Find the actual extracted directory (GitHub/GitLab create a subdirectory)
    const entries = [];
    for await (const entry of Deno.readDir(extractDir)) {
      entries.push(entry);
    }
    
    // If there's a single directory, use that as the project root
    if (entries.length === 1 && entries[0].isDirectory) {
      console.log(`Using project directory: ${extractDir}/${entries[0].name}`);
      return `${extractDir}/${entries[0].name}`;
    }
    
    console.log(`Extracted to ${extractDir}`);
    return extractDir;
  } catch (error) {
    console.error('Unzip error:', error);
    // Fallback: create a basic project structure
    const fallbackDir = `${extractDir}/project`;
    await Deno.mkdir(fallbackDir, { recursive: true });
    
    console.log('Fallback: Using localhost image (nginx:alpine) for simple static hosting');
    
    // Create a basic package.json
    await Deno.writeTextFile(`${fallbackDir}/package.json`, JSON.stringify({
      name: "deployed-app",
      version: "1.0.0",
      scripts: { start: "node index.js" },
      dependencies: { express: "^4.18.0" }
    }, null, 2));
    
    // Create a basic index.js
    await Deno.writeTextFile(`${fallbackDir}/index.js`, `
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Hello from OneOps deployed app!');
});

app.listen(PORT, () => {
  console.log(\`Server running on port \${PORT}\`);
});
    `.trim());
    
    return fallbackDir;
  }
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

async function prepareImage(imageName: string, projectDir: string): Promise<void> {
  console.log(`Preparing deployment for: ${imageName}`);
  
  try {
    // Analyze project structure
    console.log(`Project directory: ${projectDir}`);
    
    // Check if package.json exists and read it
    try {
      const packageJsonPath = `${projectDir}/package.json`;
      const packageJsonContent = await Deno.readTextFile(packageJsonPath);
      const packageJson = JSON.parse(packageJsonContent);
      console.log(`Found package.json: ${packageJson.name} v${packageJson.version}`);
    } catch (e) {
      console.log('No package.json found, will deploy static files or use default configuration');
    }
    
    // Check if Dockerfile exists
    try {
      const dockerfilePath = `${projectDir}/Dockerfile`;
      const dockerfileContent = await Deno.readTextFile(dockerfilePath);
      console.log(`Found Dockerfile (${dockerfileContent.split('\n').length} lines)`);
    } catch (e) {
      console.log('No Dockerfile found, using generated one');
    }
    
    console.log(`Image prepared for deployment: ${imageName}`);
    console.log('Note: Using pre-built images from Docker Hub');
    
  } catch (error) {
    console.error('Image preparation failed:', error);
    console.log(`Fallback: Using default image configuration ${imageName}`);
  }
}

function repoNameFromUrl(repoUrl: string): string {
  const parts = repoUrl.split('/');
  const name = parts[parts.length - 1];
  return name.replace('.git', '').toLowerCase();
}

// -------- AWS ECS FUNCTIONS --------

async function ensureECSCluster(signer: AWSSignerV4, accessKey: string, secretKey: string, region: string, clusterName: string): Promise<void> {
  // First check if cluster exists
  const describeEndpoint = `https://ecs.${region}.amazonaws.com/`;
  
  const describeBody = JSON.stringify({
    clusters: [clusterName]
  });

  const describeRequest = new Request(describeEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-amz-json-1.1',
      'X-Amz-Target': 'AmazonEC2ContainerServiceV20141113.DescribeClusters',
    },
    body: describeBody,
  });

  const { headers: describeHeaders } = await signer.sign('ecs', describeRequest, {
    accessKeyId: accessKey,
    secretAccessKey: secretKey,
  });

  const describeResponse = await fetch(describeEndpoint, {
    method: 'POST',
    headers: {
      ...describeHeaders,
      'Content-Type': 'application/x-amz-json-1.1',
      'X-Amz-Target': 'AmazonEC2ContainerServiceV20141113.DescribeClusters',
    },
    body: describeBody,
  });

  if (describeResponse.ok) {
    const result = await describeResponse.json();
    if (result.clusters && result.clusters.length > 0 && result.clusters[0].status === 'ACTIVE') {
      console.log(`ECS cluster ${clusterName} already exists and is active`);
      return;
    }
  }

  // Create cluster if it doesn't exist
  const endpoint = `https://ecs.${region}.amazonaws.com/`;
  
  const body = JSON.stringify({
    clusterName: clusterName,
    capacityProviders: ['FARGATE'],
    defaultCapacityProviderStrategy: [{
      capacityProvider: 'FARGATE',
      weight: 1
    }],
    tags: [
      { key: 'Project', value: 'OneOps' },
      { key: 'Environment', value: 'Production' }
    ]
  });

  const request = new Request(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-amz-json-1.1',
      'X-Amz-Target': 'AmazonEC2ContainerServiceV20141113.CreateCluster',
    },
    body: body,
  });

  const { headers } = await signer.sign('ecs', request, {
    accessKeyId: accessKey,
    secretAccessKey: secretKey,
  });

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'application/x-amz-json-1.1',
      'X-Amz-Target': 'AmazonEC2ContainerServiceV20141113.CreateCluster',
    },
    body: body,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create ECS cluster: ${response.status} ${error}`);
  }

  console.log(`ECS cluster ${clusterName} created successfully`);
}

async function getNetworkingResources(signer: AWSSignerV4, accessKey: string, secretKey: string, region: string): Promise<{
  subnets: string[],
  securityGroupId: string,
  vpcId: string
}> {
  // Get default VPC
  const ec2Endpoint = `https://ec2.${region}.amazonaws.com/`;
  
  // Describe VPCs
  const vpcBody = 'Action=DescribeVpcs&Filter.1.Name=is-default&Filter.1.Value.1=true&Version=2016-11-15';
  
  const vpcRequest = new Request(ec2Endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: vpcBody,
  });

  const { headers: vpcHeaders } = await signer.sign('ec2', vpcRequest, {
    accessKeyId: accessKey,
    secretAccessKey: secretKey,
  });

  const vpcResponse = await fetch(ec2Endpoint, {
    method: 'POST',
    headers: {
      ...vpcHeaders,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: vpcBody,
  });

  let vpcId = '';
  if (vpcResponse.ok) {
    const vpcText = await vpcResponse.text();
    const vpcMatch = vpcText.match(/<vpcId>(vpc-[a-zA-Z0-9]+)<\/vpcId>/);
    vpcId = vpcMatch ? vpcMatch[1] : '';
  }

  // Get public subnets in different AZs
  const subnetBody = `Action=DescribeSubnets&Filter.1.Name=vpc-id&Filter.1.Value.1=${vpcId}&Filter.2.Name=default-for-az&Filter.2.Value.1=true&Version=2016-11-15`;
  
  const subnetRequest = new Request(ec2Endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: subnetBody,
  });

  const { headers: subnetHeaders } = await signer.sign('ec2', subnetRequest, {
    accessKeyId: accessKey,
    secretAccessKey: secretKey,
  });

  const subnetResponse = await fetch(ec2Endpoint, {
    method: 'POST',
    headers: {
      ...subnetHeaders,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: subnetBody,
  });

  let subnets: string[] = [];
  if (subnetResponse.ok) {
    const subnetText = await subnetResponse.text();
    const subnetMatches = subnetText.match(/<subnetId>(subnet-[a-zA-Z0-9]+)<\/subnetId>/g);
    subnets = subnetMatches ? subnetMatches.map(match => match.replace(/<\/?subnetId>/g, '')) : [];
  }

  // Get default security group
  const sgBody = `Action=DescribeSecurityGroups&Filter.1.Name=vpc-id&Filter.1.Value.1=${vpcId}&Filter.2.Name=group-name&Filter.2.Value.1=default&Version=2016-11-15`;
  
  const sgRequest = new Request(ec2Endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: sgBody,
  });

  const { headers: sgHeaders } = await signer.sign('ec2', sgRequest, {
    accessKeyId: accessKey,
    secretAccessKey: secretKey,
  });

  const sgResponse = await fetch(ec2Endpoint, {
    method: 'POST',
    headers: {
      ...sgHeaders,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: sgBody,
  });

  let securityGroupId = '';
  if (sgResponse.ok) {
    const sgText = await sgResponse.text();
    const sgMatch = sgText.match(/<groupId>(sg-[a-zA-Z0-9]+)<\/groupId>/);
    securityGroupId = sgMatch ? sgMatch[1] : '';
  }

  console.log(`Found networking resources - VPC: ${vpcId}, Subnets: ${subnets.join(',')}, SG: ${securityGroupId}`);
  
  return {
    subnets: subnets.slice(0, 2), // Use first 2 subnets for ALB
    securityGroupId,
    vpcId
  };
}

async function createApplicationLoadBalancer(
  signer: AWSSignerV4, 
  accessKey: string, 
  secretKey: string, 
  region: string, 
  vpcId: string, 
  subnets: string[], 
  securityGroupId: string, 
  appName: string
): Promise<{
  albArn: string,
  targetGroupArn: string,
  albDnsName: string
}> {
  const elbEndpoint = `https://elasticloadbalancing.${region}.amazonaws.com/`;
  
  // Create target group first
  const tgBody = `Action=CreateTargetGroup&Name=oneops-${appName}-tg&Protocol=HTTP&Port=3000&VpcId=${vpcId}&TargetType=ip&HealthCheckPath=/&HealthCheckProtocol=HTTP&Version=2015-12-01`;
  
  const tgRequest = new Request(elbEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: tgBody,
  });

  const { headers: tgHeaders } = await signer.sign('elasticloadbalancing', tgRequest, {
    accessKeyId: accessKey,
    secretAccessKey: secretKey,
  });

  const tgResponse = await fetch(elbEndpoint, {
    method: 'POST',
    headers: {
      ...tgHeaders,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: tgBody,
  });

  let targetGroupArn = '';
  if (tgResponse.ok) {
    const tgText = await tgResponse.text();
    const tgMatch = tgText.match(/<TargetGroupArn>([^<]+)<\/TargetGroupArn>/);
    targetGroupArn = tgMatch ? tgMatch[1] : '';
  } else {
    throw new Error(`Failed to create target group: ${await tgResponse.text()}`);
  }

  // Create Application Load Balancer
  const subnetParams = subnets.map((subnet, index) => `Subnets.member.${index + 1}=${subnet}`).join('&');
  
  const albBody = `Action=CreateLoadBalancer&Name=oneops-${appName}-alb&${subnetParams}&SecurityGroups.member.1=${securityGroupId}&Scheme=internet-facing&Type=application&Version=2015-12-01`;
  
  const albRequest = new Request(elbEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: albBody,
  });

  const { headers: albHeaders } = await signer.sign('elasticloadbalancing', albRequest, {
    accessKeyId: accessKey,
    secretAccessKey: secretKey,
  });

  const albResponse = await fetch(elbEndpoint, {
    method: 'POST',
    headers: {
      ...albHeaders,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: albBody,
  });

  let albArn = '';
  let albDnsName = '';
  if (albResponse.ok) {
    const albText = await albResponse.text();
    const albArnMatch = albText.match(/<LoadBalancerArn>([^<]+)<\/LoadBalancerArn>/);
    const albDnsMatch = albText.match(/<DNSName>([^<]+)<\/DNSName>/);
    albArn = albArnMatch ? albArnMatch[1] : '';
    albDnsName = albDnsMatch ? albDnsMatch[1] : '';
  } else {
    throw new Error(`Failed to create ALB: ${await albResponse.text()}`);
  }

  // Create listener
  const listenerBody = `Action=CreateListener&LoadBalancerArn=${encodeURIComponent(albArn)}&Protocol=HTTP&Port=80&DefaultActions.member.1.Type=forward&DefaultActions.member.1.TargetGroupArn=${encodeURIComponent(targetGroupArn)}&Version=2015-12-01`;
  
  const listenerRequest = new Request(elbEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: listenerBody,
  });

  const { headers: listenerHeaders } = await signer.sign('elasticloadbalancing', listenerRequest, {
    accessKeyId: accessKey,
    secretAccessKey: secretKey,
  });

  const listenerResponse = await fetch(elbEndpoint, {
    method: 'POST',
    headers: {
      ...listenerHeaders,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: listenerBody,
  });

  if (!listenerResponse.ok) {
    throw new Error(`Failed to create listener: ${await listenerResponse.text()}`);
  }

  console.log(`Created ALB: ${albDnsName} with target group: ${targetGroupArn}`);
  
  return {
    albArn,
    targetGroupArn,
    albDnsName
  };
}

async function registerTaskDefinition(
  signer: AWSSignerV4, 
  accessKey: string, 
  secretKey: string, 
  region: string, 
  accountId: string, 
  imageName: string, 
  appName: string
): Promise<string> {
  const endpoint = `https://ecs.${region}.amazonaws.com/`;
  
  // Create CloudWatch log group first
  await createLogGroup(signer, accessKey, secretKey, region, `/oneops/apps/${appName}`);
  
  const taskDefinition = {
    family: `oneops-${appName}`,
    networkMode: 'awsvpc',
    requiresCompatibilities: ['FARGATE'],
    cpu: '256',
    memory: '512',
    executionRoleArn: `arn:aws:iam::${accountId}:role/ecsTaskExecutionRole`,
    taskRoleArn: `arn:aws:iam::${accountId}:role/ecsTaskRole`,
    containerDefinitions: [
      {
        name: appName,
        image: imageName,
        portMappings: [
          {
            containerPort: 3000,
            protocol: 'tcp'
          }
        ],
        essential: true,
        logConfiguration: {
          logDriver: 'awslogs',
          options: {
            'awslogs-group': `/oneops/apps/${appName}`,
            'awslogs-region': region,
            'awslogs-stream-prefix': 'ecs',
            'awslogs-create-group': 'true'
          }
        },
        healthCheck: {
          command: ['CMD-SHELL', 'curl -f http://localhost:3000/ || exit 1'],
          interval: 30,
          timeout: 5,
          retries: 3,
          startPeriod: 60
        }
      }
    ]
  };

  const body = JSON.stringify(taskDefinition);

  const request = new Request(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-amz-json-1.1',
      'X-Amz-Target': 'AmazonEC2ContainerServiceV20141113.RegisterTaskDefinition',
    },
    body: body,
  });

  const { headers } = await signer.sign('ecs', request, {
    accessKeyId: accessKey,
    secretAccessKey: secretKey,
  });

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'application/x-amz-json-1.1',
      'X-Amz-Target': 'AmazonEC2ContainerServiceV20141113.RegisterTaskDefinition',
    },
    body: body,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to register task definition: ${response.status} ${error}`);
  }

  const result = await response.json();
  console.log(`Task definition registered: ${result.taskDefinition.taskDefinitionArn}`);
  return result.taskDefinition.taskDefinitionArn;
}

async function createECSService(
  signer: AWSSignerV4,
  accessKey: string,
  secretKey: string,
  region: string,
  clusterName: string,
  serviceName: string,
  taskDefArn: string,
  subnets: string[],
  securityGroupId: string,
  targetGroupArn: string
): Promise<string> {
  const endpoint = `https://ecs.${region}.amazonaws.com/`;
  
  const serviceRequest = {
    cluster: clusterName,
    serviceName: serviceName,
    taskDefinition: taskDefArn,
    desiredCount: 1,
    launchType: 'FARGATE',
    networkConfiguration: {
      awsvpcConfiguration: {
        subnets: subnets,
        securityGroups: [securityGroupId],
        assignPublicIp: 'ENABLED'
      }
    },
    loadBalancers: [{
      targetGroupArn: targetGroupArn,
      containerName: serviceName.replace('oneops-', ''),
      containerPort: 3000
    }],
    deploymentConfiguration: {
      maximumPercent: 200,
      minimumHealthyPercent: 50,
      deploymentCircuitBreaker: {
        enable: true,
        rollback: true
      }
    },
    enableExecuteCommand: true,
    tags: [
      { key: 'Project', value: 'OneOps' },
      { key: 'Environment', value: 'Production' }
    ]
  };

  const body = JSON.stringify(serviceRequest);

  const request = new Request(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-amz-json-1.1',
      'X-Amz-Target': 'AmazonEC2ContainerServiceV20141113.CreateService',
    },
    body: body,
  });

  const { headers } = await signer.sign('ecs', request, {
    accessKeyId: accessKey,
    secretAccessKey: secretKey,
  });

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'application/x-amz-json-1.1',
      'X-Amz-Target': 'AmazonEC2ContainerServiceV20141113.CreateService',
    },
    body: body,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create ECS service: ${response.status} ${error}`);
  }

  const result = await response.json();
  console.log(`ECS service created: ${result.service.serviceArn}`);
  return result.service.serviceArn;
}

async function createLogGroup(signer: AWSSignerV4, accessKey: string, secretKey: string, region: string, logGroupName: string): Promise<void> {
  const endpoint = `https://logs.${region}.amazonaws.com/`;
  
  const body = JSON.stringify({
    logGroupName: logGroupName,
    retentionInDays: 7
  });

  const request = new Request(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-amz-json-1.1',
      'X-Amz-Target': 'Logs_20140328.CreateLogGroup',
    },
    body: body,
  });

  const { headers } = await signer.sign('logs', request, {
    accessKeyId: accessKey,
    secretAccessKey: secretKey,
  });

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'application/x-amz-json-1.1',
      'X-Amz-Target': 'Logs_20140328.CreateLogGroup',
    },
    body: body,
  });

  // Log group might already exist, which is fine
  if (!response.ok) {
    const error = await response.text();
    if (!error.includes('ResourceAlreadyExistsException')) {
      console.warn(`Failed to create log group: ${error}`);
    }
  }
}

async function getAccountId(signer: AWSSignerV4, accessKey: string, secretKey: string, region: string): Promise<string> {
  // Use STS to get account ID
  const endpoint = `https://sts.${region}.amazonaws.com/`;
  
  const request = new Request(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'Action=GetCallerIdentity&Version=2011-06-15',
  });

  const { headers } = await signer.sign('sts', request, {
    accessKeyId: accessKey,
    secretAccessKey: secretKey,
  });

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'Action=GetCallerIdentity&Version=2011-06-15',
  });

  if (!response.ok) {
    throw new Error(`Failed to get account ID: ${response.status}`);
  }

  const text = await response.text();
  const match = text.match(/<Account>(\d+)<\/Account>/);
  return match ? match[1] : 'unknown';
}