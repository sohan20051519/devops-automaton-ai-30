-- Add columns to projects table for ECS service information
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS service_arn TEXT,
ADD COLUMN IF NOT EXISTS cluster_name TEXT,
ADD COLUMN IF NOT EXISTS alb_dns_name TEXT;