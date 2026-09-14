-- Adds the optional secretary association required by the systems form.
ALTER TABLE public.sistemas
  ADD COLUMN IF NOT EXISTS secretaria text;