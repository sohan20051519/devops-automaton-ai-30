-- Create table for deployment logs
CREATE TABLE public.deployment_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event TEXT NOT NULL,
  repo TEXT NOT NULL,
  region TEXT,
  instance_type TEXT,
  status TEXT NOT NULL,
  error_message TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.deployment_logs ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations for authenticated users
CREATE POLICY "Allow all operations for authenticated users" 
ON public.deployment_logs 
FOR ALL 
USING (auth.uid() IS NOT NULL);

-- Create index for better performance
CREATE INDEX idx_deployment_logs_created_at ON public.deployment_logs(created_at DESC);
CREATE INDEX idx_deployment_logs_status ON public.deployment_logs(status);