-- Use the owner's Google login email for admin access.
-- Remove the temporary OpenClaw account email from admin candidates.

DELETE FROM public.admin_users
WHERE lower(email) = 'ivy_girl@naver.com';

INSERT INTO public.admin_users (email)
SELECT 'chococo1218@gmail.com'
WHERE NOT EXISTS (
  SELECT 1
  FROM public.admin_users
  WHERE lower(email) = 'chococo1218@gmail.com'
);

UPDATE public.admin_users AS a
SET user_id = u.id
FROM auth.users AS u
WHERE lower(a.email) = 'chococo1218@gmail.com'
  AND lower(u.email) = 'chococo1218@gmail.com'
  AND a.user_id IS NULL;
