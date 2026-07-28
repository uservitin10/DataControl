ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS password_hash text,
  ADD COLUMN IF NOT EXISTS must_reset_password boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS password_updated_at timestamp with time zone;

CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_email_unique UNIQUE (email);

ALTER TABLE public.profiles
  ALTER COLUMN email SET NOT NULL;

ALTER TABLE public.profiles
  ALTER COLUMN id SET DEFAULT extensions.uuid_generate_v4();