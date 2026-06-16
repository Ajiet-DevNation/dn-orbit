-- Add cover image URL to projects (Supabase Storage public URL).
ALTER TABLE "projects" ADD COLUMN "image_url" TEXT;
