-- Register the owner email as an admin candidate.
-- When the matching Supabase auth user exists, link_admin_on_auth or this update
-- connects the auth user id to the admin row.

INSERT INTO public.admin_users (email)
SELECT 'ivy_girl@naver.com'
WHERE NOT EXISTS (
  SELECT 1
  FROM public.admin_users
  WHERE lower(email) = 'ivy_girl@naver.com'
);

UPDATE public.admin_users AS a
SET user_id = u.id
FROM auth.users AS u
WHERE lower(a.email) = 'ivy_girl@naver.com'
  AND lower(u.email) = 'ivy_girl@naver.com'
  AND a.user_id IS NULL;
