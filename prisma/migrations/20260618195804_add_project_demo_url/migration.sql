-- Add optional live/demo URL to projects (shown alongside the GitHub link).
ALTER TABLE "projects" ADD COLUMN "demo_url" TEXT;
