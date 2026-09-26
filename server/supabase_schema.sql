-- ============================================================
-- OpsSentinel Supabase PostgreSQL Database Schema
-- Run this script in your Supabase Dashboard -> SQL Editor
-- ============================================================

-- 1. Users Table
CREATE TABLE IF NOT EXISTS public.users (
  id BIGSERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT DEFAULT 'Site Reliability Engineer',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Incidents Table
CREATE TABLE IF NOT EXISTS public.incidents (
  id BIGSERIAL PRIMARY KEY,
  incident_code TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  severity TEXT NOT NULL,
  service TEXT NOT NULL,
  status TEXT NOT NULL, -- PENDING_APPROVAL, RESOLVING, RESOLVED, REJECTED
  error_logs TEXT,
  git_diff TEXT,
  initial_metrics JSONB,
  final_metrics JSONB,
  proposed_command TEXT,
  blast_radius TEXT,
  confidence_score NUMERIC(5,2),
  rca_markdown TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- 3. Agent Executions Trace Table
CREATE TABLE IF NOT EXISTS public.agent_executions (
  id BIGSERIAL PRIMARY KEY,
  incident_id BIGINT REFERENCES public.incidents(id) ON DELETE CASCADE,
  stage TEXT NOT NULL,
  agent_name TEXT NOT NULL,
  status TEXT NOT NULL,
  input_payload JSONB,
  output_payload JSONB,
  executed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_executions ENABLE ROW LEVEL SECURITY;

-- Allow read/write for service role / authenticated users
CREATE POLICY "Allow public read access for demo" ON public.incidents FOR SELECT USING (true);
CREATE POLICY "Allow public insert access for demo" ON public.incidents FOR ALL USING (true);
CREATE POLICY "Allow public access for executions" ON public.agent_executions FOR ALL USING (true);
CREATE POLICY "Allow public access for users" ON public.users FOR ALL USING (true);
