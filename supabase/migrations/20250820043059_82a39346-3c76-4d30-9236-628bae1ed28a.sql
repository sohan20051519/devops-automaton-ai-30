-- Add user_id column to deployment_logs table
ALTER TABLE public.deployment_logs 
ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update RLS policy to be user-specific
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public.deployment_logs;

CREATE POLICY "Users can only see their own deployment logs"
ON public.deployment_logs
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create projects table for tracking deployments
CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  repo_url text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  region text NOT NULL,
  instance_type text NOT NULL,
  image_url text,
  deployment_url text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  last_deployed_at timestamp with time zone,
  UNIQUE(user_id, repo_url)
);

-- Enable RLS on projects table
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for projects
CREATE POLICY "Users can manage their own projects"
ON public.projects
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create usage_logs table for monitoring
CREATE TABLE public.usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  event_type text NOT NULL,
  cpu_usage decimal,
  memory_usage decimal,
  network_usage decimal,
  cost decimal DEFAULT 0,
  timestamp timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS on usage_logs table
ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for usage_logs
CREATE POLICY "Users can see their own usage logs"
ON public.usage_logs
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for projects table
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();