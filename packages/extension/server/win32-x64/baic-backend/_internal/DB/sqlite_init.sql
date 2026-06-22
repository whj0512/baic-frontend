PRAGMA foreign_keys = OFF;

DROP TABLE IF EXISTS req_relationship;
DROP TABLE IF EXISTS req_requirement;
DROP TABLE IF EXISTS entity;
DROP TABLE IF EXISTS ibase_users;
DROP TABLE IF EXISTS req_project;
DROP TABLE IF EXISTS req_device;
DROP TABLE IF EXISTS req_controlUnit;
DROP TABLE IF EXISTS req_protocol;
DROP TABLE IF EXISTS req_regulation;
DROP TABLE IF EXISTS req_regulation_relationship;
DROP TABLE IF EXISTS req_test_case;

PRAGMA foreign_keys = ON;

CREATE TABLE req_project (
  id TEXT PRIMARY KEY,
  "key" TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  created_by TEXT,
  deleted_at TIMESTAMP DEFAULT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ibase_users (
  id TEXT PRIMARY KEY,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  password TEXT,
  location TEXT,
  title TEXT,
  description TEXT,
  tags TEXT,
  avatar TEXT,
  language TEXT,
  tfa_secret TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  role TEXT,
  token TEXT,
  last_access TEXT,
  last_page TEXT,
  provider TEXT NOT NULL DEFAULT 'default',
  external_identifier TEXT,
  auth_data TEXT,
  email_notifications INTEGER,
  appearance TEXT,
  theme_dark TEXT,
  theme_light TEXT,
  theme_light_overrides TEXT,
  theme_dark_overrides TEXT,
  theme_light_custom TEXT,
  theme_dark_custom TEXT,
  theme_menu TEXT,
  project_creation INTEGER,
  timezone TEXT,
  locale TEXT,
  locale_options TEXT,
  created_on TEXT DEFAULT CURRENT_TIMESTAMP,
  modified_on TEXT DEFAULT CURRENT_TIMESTAMP,
  last_online TEXT
);

CREATE TABLE entity (
  id TEXT PRIMARY KEY,
  entity_type TEXT,
  name TEXT,
  description TEXT,
  properties TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE req_requirement (
  id TEXT PRIMARY KEY,
  name TEXT,
  requirement_group_id TEXT NOT NULL,
  version_code INTEGER NOT NULL DEFAULT 1,
  project_id TEXT NOT NULL,
  nl_text TEXT,
  dsl_IBD TEXT,
  dsl_ESD TEXT,
  dsl_SC TEXT,
  dsl_BDD TEXT,
  dsl_ISD TEXT,
  graph_IBD TEXT,
  graph_ESD TEXT,
  graph_SC TEXT,
  graph_BDD TEXT,
  graph_ISD TEXT,
  type TEXT,
  subtype TEXT,
  description TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES req_project(id)
);

CREATE INDEX idx_req_requirement_group_id ON req_requirement(requirement_group_id);
CREATE INDEX idx_req_requirement_project_id ON req_requirement(project_id);
CREATE INDEX idx_req_requirement_name ON req_requirement(name);

CREATE TABLE req_relationship (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  source_requirement_id TEXT NOT NULL,
  target_requirement_id TEXT NOT NULL,
  relation_type TEXT NOT NULL,
  description TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE req_device (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE req_controlUnit (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE req_protocol (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE req_regulation (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE req_regulation_relationship (
  id TEXT PRIMARY KEY,
  regulation_id TEXT NOT NULL,
  requirement_id TEXT NOT NULL,
  relation_type TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE req_test_case (
  id TEXT PRIMARY KEY,
  name TEXT,
  project_id TEXT NOT NULL,
  test_content TEXT,
  related_requirements TEXT,
  related_scenarios TEXT,
  properties TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES req_project(id)
);

CREATE INDEX idx_req_test_case_project_id ON req_test_case(project_id);

-- Seed users supported by the bundled VS Code extension login flow.
INSERT OR IGNORE INTO ibase_users ("id", "first_name", "last_name", "email", "password", "status", "role", "last_access", "last_page", "provider", "email_notifications") VALUES ('6461d218-258e-4596-a385-b869263f4526', 'Edwin', 'Atkins', 'leefisher@example.org', '$2y$10$testpasswordhash1234567890abcdefghijklmnopqrstuvwxyz', 'active', 'fbc0488c-212c-4f13-91e9-9a535e44bc66', '2025-09-09 17:43:35', 'blog/categories/main', 'default', 0);
INSERT OR IGNORE INTO ibase_users ("id", "first_name", "last_name", "email", "password", "status", "role", "last_access", "last_page", "provider", "email_notifications") VALUES ('1d34c274-d76c-41e3-96c3-582987654d84', 'Yolanda', 'Morales', 'kevingriffith@example.org', '$2y$10$testpasswordhash1234567890abcdefghijklmnopqrstuvwxyz', 'active', '39378b9f-581d-4960-9c74-00ffce9c9d86', '2025-05-29 17:43:35', 'category', 'default', 1);
INSERT OR IGNORE INTO ibase_users ("id", "first_name", "last_name", "email", "password", "status", "role", "last_access", "last_page", "provider", "email_notifications") VALUES ('c9686724-d599-481c-b256-18e1d4fd1278', 'Timothy', 'Tran', 'lesliefritz@example.org', '$2y$10$testpasswordhash1234567890abcdefghijklmnopqrstuvwxyz', 'active', 'a2e872db-c6fa-4171-8caf-72a2e4c1cf47', '2025-03-30 17:43:35', 'blog/app', 'default', 0);
INSERT OR IGNORE INTO ibase_users ("id", "first_name", "last_name", "email", "password", "status", "role", "last_access", "last_page", "provider", "email_notifications") VALUES ('3b33dc90-52a6-430f-b38b-2ae79257fd16', 'Randall', 'Johnson', 'jonathansmith@example.org', '$2y$10$testpasswordhash1234567890abcdefghijklmnopqrstuvwxyz', 'active', '14ed5070-76eb-41a7-a69b-d342f176bc9c', '2025-07-15 17:43:35', 'search/explore', 'default', 0);
INSERT OR IGNORE INTO ibase_users ("id", "first_name", "last_name", "email", "password", "status", "role", "last_page", "provider", "email_notifications") VALUES ('84afec9e-4ec7-49d2-9ef0-94eaf246a369', 'Mary', 'Lane', 'andreawiggins@example.net', '$2y$10$testpasswordhash1234567890abcdefghijklmnopqrstuvwxyz', 'active', 'f59a8ca2-56f3-43d5-890c-c00b7c6d60f1', 'categories/category/category', 'default', 0);
