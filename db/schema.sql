-- Nomad Horizon — PostgreSQL schema.
-- The server runs this file on start; every statement is safe to run again.

-- Site settings: 'content' (texts, photos and contacts of the site), 'auth' (admin password hash), 'seeded' flag.
CREATE TABLE IF NOT EXISTS settings (
  key         text PRIMARY KEY,
  value       jsonb NOT NULL,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Admin sessions. Only a SHA-256 hash of the cookie token is stored.
CREATE TABLE IF NOT EXISTS sessions (
  token_hash  text PRIMARY KEY,
  created_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_expires_idx ON sessions (expires_at);

-- Failed admin logins per IP address: 5 wrong passwords block the address for 15 minutes.
CREATE TABLE IF NOT EXISTS login_attempts (
  ip             text PRIMARY KEY,
  failures       int NOT NULL DEFAULT 0,
  blocked_until  timestamptz
);

-- Local hosts (P2P): applications from the site and approved hosts shown to travellers.
CREATE TABLE IF NOT EXISTS hosts (
  id             text PRIMARY KEY,
  status         text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  example        boolean NOT NULL DEFAULT false,
  name           text NOT NULL,
  type           text NOT NULL,
  region         text NOT NULL,
  languages      jsonb NOT NULL DEFAULT '[]',
  about          text NOT NULL,
  about_lang     text NOT NULL DEFAULT 'en',
  offer          jsonb NOT NULL,
  contacts       jsonb NOT NULL DEFAULT '{}',
  show_contacts  boolean NOT NULL DEFAULT false,
  image          text NOT NULL DEFAULT '',
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS hosts_status_idx ON hosts (status, created_at DESC);

-- Requests from travellers: a trip idea, a question about a place, a message to a host or a general enquiry.
CREATE TABLE IF NOT EXISTS requests (
  id                 text PRIMARY KEY,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz,
  first_response_at  timestamptz,
  status             text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'progress', 'done')),
  kind               text NOT NULL CHECK (kind IN ('trip', 'place', 'host', 'general')),
  name               text NOT NULL,
  contact            text NOT NULL,
  country            text NOT NULL DEFAULT '',
  month              text NOT NULL DEFAULT '',
  group_size         int CHECK (group_size BETWEEN 1 AND 99),
  note               text NOT NULL DEFAULT '',
  idea               text NOT NULL DEFAULT '',
  place              text NOT NULL DEFAULT '',
  host_id            text REFERENCES hosts (id) ON DELETE SET NULL,
  host_name          text NOT NULL DEFAULT '',
  lang               text NOT NULL DEFAULT 'en',
  page               text NOT NULL DEFAULT '',
  telegram           text NOT NULL DEFAULT 'off'
);
CREATE INDEX IF NOT EXISTS requests_created_idx ON requests (created_at DESC);
CREATE INDEX IF NOT EXISTS requests_status_idx ON requests (status);

-- Cookie-free visit statistics: one counter per day and event.
CREATE TABLE IF NOT EXISTS stats_daily (
  day    date NOT NULL,
  event  text NOT NULL,
  count  int NOT NULL DEFAULT 0,
  PRIMARY KEY (day, event)
);

-- Photos uploaded in the admin panel (JPEG, PNG, WebP), served at /uploads/<name>.
CREATE TABLE IF NOT EXISTS uploads (
  name        text PRIMARY KEY,
  mime        text NOT NULL,
  size        int NOT NULL,
  data        bytea NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Who did what in the admin panel.
CREATE TABLE IF NOT EXISTS audit_log (
  id      bigserial PRIMARY KEY,
  at      timestamptz NOT NULL DEFAULT now(),
  ip      text NOT NULL DEFAULT '',
  action  text NOT NULL,
  detail  text NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS audit_log_at_idx ON audit_log (at DESC);
