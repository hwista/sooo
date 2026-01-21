-- ============================================
-- cm_role_menu_r (역할별 메뉴 권한)
-- ============================================
CREATE TABLE IF NOT EXISTS cm_role_menu_r (
    role_menu_id        BIGSERIAL PRIMARY KEY,
    
    role_code           VARCHAR(20) NOT NULL,
    menu_id             BIGINT NOT NULL REFERENCES cm_menu_m(menu_id) ON DELETE CASCADE,
    access_type         VARCHAR(10) NOT NULL DEFAULT 'full',
    
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
    
    CONSTRAINT ux_cm_role_menu_r_role_menu UNIQUE (role_code, menu_id)
);

CREATE INDEX IF NOT EXISTS ix_cm_role_menu_r_menu ON cm_role_menu_r(menu_id);
CREATE INDEX IF NOT EXISTS ix_cm_role_menu_r_role ON cm_role_menu_r(role_code);

COMMENT ON TABLE cm_role_menu_r IS '역할별 메뉴 접근 권한';
COMMENT ON COLUMN cm_role_menu_r.access_type IS 'full=전체, read=읽기전용, none=접근불가';

-- ============================================
-- cm_role_menu_h (역할별 메뉴 권한 히스토리)
-- ============================================
CREATE TABLE IF NOT EXISTS cm_role_menu_h (
    role_menu_id        BIGINT NOT NULL,
    history_seq         BIGINT NOT NULL,
    
    event_type          CHAR(1) NOT NULL,
    event_at            TIMESTAMPTZ NOT NULL,

    role_code           VARCHAR(20) NOT NULL,
    menu_id             BIGINT NOT NULL,
    access_type         VARCHAR(10) NOT NULL,
    
    is_active           BOOLEAN NOT NULL,
    memo                TEXT,
    created_by          BIGINT,
    created_at          TIMESTAMPTZ NOT NULL,
    updated_by          BIGINT,
    updated_at          TIMESTAMPTZ NOT NULL,
    last_source         VARCHAR(100),
    last_activity       VARCHAR(100),
    transaction_id      UUID,
    
    CONSTRAINT pk_cm_role_menu_h PRIMARY KEY (role_menu_id, history_seq)
);

CREATE INDEX IF NOT EXISTS ix_cm_role_menu_h_event_at ON cm_role_menu_h(event_at);
CREATE INDEX IF NOT EXISTS ix_cm_role_menu_h_tx ON cm_role_menu_h(transaction_id);
