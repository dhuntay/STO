-- One row per registered Face ID/fingerprint (WebAuthn platform
-- authenticator) credential. Used to force a fresh, live biometric check
-- on every truck-linked swipe (see app/api/webauthn/authenticate/*),
-- independent of whatever trust/grace-window behavior Apple Pay/Google
-- Pay's own wallet uses internally, and independent of whether the phone
-- happens to already be unlocked.
--
-- This table never stores anything resembling a face or fingerprint --
-- public_key is a WebAuthn public key, mathematically useless without the
-- physical device's secure hardware to produce a matching signature. STO
-- still never captures, processes, or stores biometric data itself; the
-- actual Face ID/fingerprint check happens entirely on-device, same as
-- the payment wallet flow.
create table public.webauthn_credentials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  credential_id text not null unique,
  public_key text not null,
  counter bigint not null default 0,
  transports text[],
  device_label text,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

create index webauthn_credentials_user_id_idx on public.webauthn_credentials (user_id);

alter table public.webauthn_credentials enable row level security;

-- Customers can see whether they have a registered device (drives the
-- "Set up Face ID" banner), but never write directly -- a forged row here
-- would let someone skip the live check entirely. Every write happens
-- server-side (service-role client) only after a real WebAuthn ceremony
-- is cryptographically verified in app/api/webauthn/register/verify or
-- app/api/webauthn/authenticate/verify.
create policy "Users can view their own webauthn credentials"
  on public.webauthn_credentials for select
  using (auth.uid() = user_id);
