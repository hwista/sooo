-- ============================================
-- cm_user_menu_r (사용자별 메뉴 권한 예외)
-- ============================================
CREATE TABLE IF NOT EXISTS cm_user_menu_r (
    user_menu_id        BIGSERIAL PRIMARY KEY,
    
    user_id             BIGINT NOT NULL REFERENCES cm_user_m(user_id) ON DELETE CASCADE,
    menu_id             BIGINT NOT NULL REFERENCES cm_menu_m(menu_id) ON DELETE CASCADE,
    access_type         VARCHAR(10) NOT NULL DEFAULT 'full',
    override_type       VARCHAR(10) NOT NULL DEFAULT 'grant',
    
    expires_at          TIMESTAMPTZ,
    granted_by          BIGINT,
    granted_at          TIMESTAMPTZ,
    grant_reason        TEXT,
    
    -- Common columns
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    memo                TEXT,
    created_by          BIGINT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by          BIGINT,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_source         VARCHAR(100),
    last_activity       VARCHAR(100),
    transaction_id      UUID,
    
    CONSTRAINT ux_cm_user_menu_r_user_menu UNIQUE (user_id, menu_id)
);

CREATE INDEX IF NOT EXISTS ix_cm_user_menu_r_user ON cm_user_menu_r(user_id);
CREATE INDEX IF NOT EXISTS ix_cm_user_menu_r_expires ON cm_user_menu_r(expires_at);

COMMENT ON TABLE cm_user_menu_r IS '사용자별 메뉴 권한 예외 (역할 권한 오버라이드)';
COMMENT ON COLUMN cm_user_menu_r.override_type IS 'grant=권한부여, revoke=권한회수';
COMMENT ON COLUMN cm_user_menu_r.expires_at IS '임시 권한 만료일';

-- ============================================
-- cm_user_menu_h (사용자별 메뉴 권한 히스토리)
-- ============================================
CREATE TABLE IF NOT EXISTS cm_user_menu_h (
    user_menu_id        BIGINT NOT NULL,
    history_seq         BIGINT NOT NULL,
    
    event_type          CHAR(1) NOT NULL,
    event_at            TIMESTAMPTZ NOT NULL,

    user_id             BIGINT NOT NULL,
    menu_id             BIGINT NOT NULL,
    access_type         VARCHAR(10) NOT NULL,
    override_type       VARCHAR(10) NOT NULL,
    expires_at          TIMESTAMPTZ,
    granted_by          BIGINT,
    granted_at          TIMESTAMPTZ,
    grant_reason        TEXT,
    
    is_active           BOOLEAN NOT NULL,
    memo                TEXT,
    created_by          BIGINT,
    created_at          TIMESTAMPTZ NOT NULL,
    updated_by          BIGINT,
    updated_at          TIMESTAMPTZ NOT NULL,
    last_source         VARCHAR(100),
    last_activity       VARCHAR(100),
    transaction_id      UUID,
    
    CONSTRAINT pk_cm_user_menu_h PRIMARY KEY (user_menu_id, history_seq)
);

CREATE INDEX IF NOT EXISTS ix_cm_user_menu_h_event_at ON cm_user_menu_h(event_at);
CREATE INDEX IF NOT EXISTS ix_cm_user_menu_h_tx ON cm_user_menu_h(transaction_id);
