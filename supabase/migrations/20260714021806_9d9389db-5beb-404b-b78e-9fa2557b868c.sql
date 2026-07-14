
-- 새 PK 컬럼 도입, user_id는 nullable로 완화, email unique
ALTER TABLE public.admin_users ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
UPDATE public.admin_users SET id = gen_random_uuid() WHERE id IS NULL;
ALTER TABLE public.admin_users ALTER COLUMN id SET NOT NULL;

ALTER TABLE public.admin_users DROP CONSTRAINT IF EXISTS admin_users_pkey;
ALTER TABLE public.admin_users ADD PRIMARY KEY (id);

ALTER TABLE public.admin_users ALTER COLUMN user_id DROP NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS admin_users_user_id_uniq ON public.admin_users(user_id) WHERE user_id IS NOT NULL;

ALTER TABLE public.admin_users ADD COLUMN IF NOT EXISTS email TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS admin_users_email_lower_idx ON public.admin_users (lower(email)) WHERE email IS NOT NULL;

-- Seed 대표 관리자 이메일
INSERT INTO public.admin_users (email)
SELECT 'chococo1218@gmail.com'
WHERE NOT EXISTS (SELECT 1 FROM public.admin_users WHERE lower(email) = 'chococo1218@gmail.com');

UPDATE public.admin_users a
SET user_id = u.id
FROM auth.users u
WHERE a.user_id IS NULL AND lower(a.email) = lower(u.email);

-- is_admin: user_id 또는 email 매칭
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_users a
    WHERE a.user_id = _user_id
       OR lower(a.email) = (SELECT lower(email) FROM auth.users WHERE id = _user_id)
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, service_role;

-- 자동 링크 트리거
CREATE OR REPLACE FUNCTION public.link_admin_on_auth()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.admin_users
  SET user_id = NEW.id
  WHERE user_id IS NULL AND lower(email) = lower(NEW.email);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_link_admin ON auth.users;
CREATE TRIGGER on_auth_user_created_link_admin
AFTER INSERT OR UPDATE OF email ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.link_admin_on_auth();
