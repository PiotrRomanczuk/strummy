-- Auth schema part of the StrummyTest anonymisation, appended by anonymize.ts
-- inside the same transaction (session_replication_role = replica).
--
-- Every account keeps its id (so profiles.user_id, claimed shadow profiles and
-- all history still line up), gets an undeliverable address and the shared
-- test password, and loses everything that could sign in anywhere else.
-- :'test_password' comes from the refresh script (Bitwarden item
-- strummy-test-users), never from this file.

UPDATE auth.users SET
  email = 'u-' || substr(md5(id::text), 1, 12) || '@test.strummy.invalid',
  encrypted_password = extensions.crypt(:'test_password', extensions.gen_salt('bf')),
  email_confirmed_at = coalesce(email_confirmed_at, now()),
  raw_user_meta_data = jsonb_build_object('full_name', 'Osoba ' || upper(substr(md5(id::text), 1, 4))),
  phone = NULL,
  phone_change = '',
  phone_change_token = '',
  email_change = '',
  email_change_token_new = '',
  email_change_token_current = '',
  confirmation_token = '',
  recovery_token = '',
  reauthentication_token = '',
  is_sso_user = false;

-- One email identity per user. Google identities carry the real Google
-- account id and profile data; they go, and with them Google sign-in.
DELETE FROM auth.identities;
INSERT INTO auth.identities (id, provider_id, user_id, identity_data, provider, created_at, updated_at)
SELECT gen_random_uuid(), u.id::text, u.id,
       jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true, 'phone_verified', false),
       'email', now(), now()
  FROM auth.users u;

-- Sessions, tokens, MFA, SSO and OAuth state: nothing from production signs in here.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['sessions', 'refresh_tokens', 'mfa_amr_claims', 'mfa_challenges', 'mfa_factors',
    'one_time_tokens', 'flow_state', 'audit_log_entries', 'saml_relay_states', 'webauthn_challenges',
    'webauthn_credentials', 'oauth_authorizations', 'oauth_consents', 'oauth_client_states']
  LOOP
    IF to_regclass('auth.' || t) IS NOT NULL THEN
      EXECUTE format('DELETE FROM auth.%I', t);
    END IF;
  END LOOP;
END $$;

-- Verification: the transaction aborts unless every address is a test address
-- and every credential table is empty.
DO $$
DECLARE bad bigint;
BEGIN
  SELECT count(*) INTO bad FROM auth.users WHERE email NOT LIKE '%@test.strummy.invalid';
  IF bad > 0 THEN RAISE EXCEPTION 'anonymize: % auth.users rows keep a real address', bad; END IF;

  SELECT count(*) INTO bad FROM public.profiles
   WHERE (email IS NOT NULL AND email NOT LIKE '%@test.strummy.invalid')
      OR (invite_email IS NOT NULL AND invite_email NOT LIKE '%@test.strummy.invalid')
      OR (parent_email IS NOT NULL AND parent_email NOT LIKE '%@test.strummy.invalid')
      OR phone IS NOT NULL;
  IF bad > 0 THEN RAISE EXCEPTION 'anonymize: % profiles keep a real address or phone', bad; END IF;

  SELECT (SELECT count(*) FROM public.user_integrations) + (SELECT count(*) FROM public.api_keys)
       + (SELECT count(*) FROM auth.sessions) + (SELECT count(*) FROM auth.refresh_tokens)
       + (SELECT count(*) FROM auth.identities WHERE provider <> 'email')
    INTO bad;
  IF bad > 0 THEN RAISE EXCEPTION 'anonymize: % credential rows left', bad; END IF;

  SELECT count(*) INTO bad FROM public.lesson_transcripts WHERE share_link IS NOT NULL;
  IF bad > 0 THEN RAISE EXCEPTION 'anonymize: % transcript share links left', bad; END IF;
END $$;
