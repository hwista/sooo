-- DMS assistant chat session persistence table.
-- The server uses raw SQL for this compact append/update surface, so this
-- migration is the formal schema artifact.

CREATE SCHEMA IF NOT EXISTS "dms";

CREATE TABLE IF NOT EXISTS "dms"."dm_chat_session_m" (
  "chat_session_id" VARCHAR(120) NOT NULL,
  "owner_user_id" BIGINT NOT NULL,
  "title" VARCHAR(120) NOT NULL,
  "messages" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "persisted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),

  CONSTRAINT "dm_chat_session_m_pkey" PRIMARY KEY ("chat_session_id"),
  CONSTRAINT "ck_dm_chat_session_m_messages_array" CHECK (jsonb_typeof("messages") = 'array')
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_dm_chat_session_m_owner_user'
      AND conrelid = '"dms"."dm_chat_session_m"'::regclass
  ) THEN
    ALTER TABLE "dms"."dm_chat_session_m"
      ADD CONSTRAINT "fk_dm_chat_session_m_owner_user"
      FOREIGN KEY ("owner_user_id")
      REFERENCES "common"."cm_user_m"("user_id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "ix_dm_chat_session_m_owner_updated"
  ON "dms"."dm_chat_session_m" ("owner_user_id", "updated_at" DESC);

CREATE INDEX IF NOT EXISTS "ix_dm_chat_session_m_persisted"
  ON "dms"."dm_chat_session_m" ("persisted_at" DESC);
