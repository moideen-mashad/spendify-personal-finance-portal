-- =============================================================================
-- Migration: 002_enterprise_upgrade.sql
-- Description: Enterprise upgrade — adds new columns to existing tables and
--              creates new feature tables. Safe to run on top of 001_init.sql.
-- MySQL 8 / InnoDB
-- NOTE: Run this migration exactly once. Column additions are wrapped in
--       stored-procedure guards that check INFORMATION_SCHEMA so that the
--       script is idempotent.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Helper procedure: add a column only if it does not already exist
-- ---------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS _add_column_if_missing;
DELIMITER $$
CREATE PROCEDURE _add_column_if_missing(
    IN p_table  VARCHAR(64),
    IN p_column VARCHAR(64),
    IN p_ddl    TEXT          -- the ALTER TABLE … ADD COLUMN … snippet
)
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM   information_schema.COLUMNS
        WHERE  TABLE_SCHEMA = DATABASE()
          AND  TABLE_NAME   = p_table
          AND  COLUMN_NAME  = p_column
    ) THEN
        SET @sql = p_ddl;
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END$$
DELIMITER ;

-- ===========================================================================
-- 1. ALTER TABLE users — new profile / preference columns
-- ===========================================================================
CALL _add_column_if_missing('users', 'phone',
    'ALTER TABLE users ADD COLUMN phone VARCHAR(20) NULL AFTER email');

CALL _add_column_if_missing('users', 'avatar_url',
    'ALTER TABLE users ADD COLUMN avatar_url VARCHAR(500) NULL');

CALL _add_column_if_missing('users', 'bio',
    'ALTER TABLE users ADD COLUMN bio VARCHAR(500) NULL');

CALL _add_column_if_missing('users', 'monthly_income_goal',
    'ALTER TABLE users ADD COLUMN monthly_income_goal DECIMAL(14,2) NULL');

CALL _add_column_if_missing('users', 'fiscal_start_day',
    'ALTER TABLE users ADD COLUMN fiscal_start_day TINYINT UNSIGNED NOT NULL DEFAULT 1,
     ADD CONSTRAINT chk_fiscal_day CHECK (fiscal_start_day BETWEEN 1 AND 28)');

CALL _add_column_if_missing('users', 'alert_threshold_pct',
    'ALTER TABLE users ADD COLUMN alert_threshold_pct TINYINT UNSIGNED NOT NULL DEFAULT 80,
     ADD CONSTRAINT chk_user_alert_pct CHECK (alert_threshold_pct BETWEEN 1 AND 100)');

-- ===========================================================================
-- 2. ALTER TABLE categories — icon & default flag
-- ===========================================================================
CALL _add_column_if_missing('categories', 'icon',
    "ALTER TABLE categories ADD COLUMN icon VARCHAR(50) NOT NULL DEFAULT 'circle'");

CALL _add_column_if_missing('categories', 'is_default',
    'ALTER TABLE categories ADD COLUMN is_default BOOLEAN NOT NULL DEFAULT FALSE');

-- ===========================================================================
-- 3. ALTER TABLE transactions — merchant, notes, tags, import linkage
-- ===========================================================================
CALL _add_column_if_missing('transactions', 'merchant',
    'ALTER TABLE transactions ADD COLUMN merchant VARCHAR(150) NULL');

CALL _add_column_if_missing('transactions', 'notes',
    'ALTER TABLE transactions ADD COLUMN notes TEXT NULL');

CALL _add_column_if_missing('transactions', 'tags',
    'ALTER TABLE transactions ADD COLUMN tags VARCHAR(500) NULL');

CALL _add_column_if_missing('transactions', 'import_batch_id',
    'ALTER TABLE transactions ADD COLUMN import_batch_id BIGINT UNSIGNED NULL');

-- ===========================================================================
-- 4. ALTER TABLE budgets — alert threshold & rollover
-- ===========================================================================
CALL _add_column_if_missing('budgets', 'alert_threshold_pct',
    'ALTER TABLE budgets ADD COLUMN alert_threshold_pct TINYINT UNSIGNED NOT NULL DEFAULT 80,
     ADD CONSTRAINT chk_bud_alert_pct CHECK (alert_threshold_pct BETWEEN 1 AND 100)');

CALL _add_column_if_missing('budgets', 'rollover_enabled',
    'ALTER TABLE budgets ADD COLUMN rollover_enabled BOOLEAN NOT NULL DEFAULT FALSE');

-- ===========================================================================
-- 5. NEW TABLE: accounts
-- ===========================================================================
CREATE TABLE IF NOT EXISTS accounts (
    id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id      BIGINT UNSIGNED NOT NULL,
    name         VARCHAR(100)    NOT NULL,
    account_type ENUM('bank','credit_card','cash','upi','digital_wallet') NOT NULL,
    balance      DECIMAL(14,2)   NOT NULL DEFAULT 0.00,
    currency     CHAR(3)         NOT NULL DEFAULT 'INR',
    is_archived  BOOLEAN         NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    KEY idx_accounts_user (user_id),
    CONSTRAINT fk_acc_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===========================================================================
-- 6. NEW TABLE: recurring_transactions
-- ===========================================================================
CREATE TABLE IF NOT EXISTS recurring_transactions (
    id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id        BIGINT UNSIGNED NOT NULL,
    category_id    BIGINT UNSIGNED NOT NULL,
    title          VARCHAR(150)    NOT NULL,
    txn_type       ENUM('income','expense') NOT NULL,
    amount         DECIMAL(12,2)   NOT NULL,
    frequency      ENUM('daily','weekly','monthly','yearly') NOT NULL,
    next_run_date  DATE            NOT NULL,
    is_active      BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    KEY idx_rec_txn_user       (user_id),
    KEY idx_rec_txn_next_run   (next_run_date, is_active),
    CONSTRAINT chk_rec_amount  CHECK (amount > 0),
    CONSTRAINT fk_rec_user     FOREIGN KEY (user_id)     REFERENCES users       (id) ON DELETE CASCADE,
    CONSTRAINT fk_rec_cat      FOREIGN KEY (category_id) REFERENCES categories  (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===========================================================================
-- 7. NEW TABLE: savings_goals
-- ===========================================================================
CREATE TABLE IF NOT EXISTS savings_goals (
    id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id        BIGINT UNSIGNED NOT NULL,
    title          VARCHAR(150)    NOT NULL,
    target_amount  DECIMAL(14,2)   NOT NULL,
    current_amount DECIMAL(14,2)   NOT NULL DEFAULT 0.00,
    deadline       DATE            NULL,
    icon           VARCHAR(50)     NOT NULL DEFAULT 'target',
    color          CHAR(7)         NOT NULL DEFAULT '#6366F1',
    status         ENUM('active','completed','paused') NOT NULL DEFAULT 'active',
    created_at     TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    KEY idx_sg_user              (user_id),
    KEY idx_sg_status            (status),
    CONSTRAINT chk_sg_target     CHECK (target_amount > 0),
    CONSTRAINT chk_sg_current    CHECK (current_amount >= 0),
    CONSTRAINT chk_sg_color      CHECK (color REGEXP '^#[0-9A-Fa-f]{6}$'),
    CONSTRAINT fk_sg_user        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===========================================================================
-- 8. NEW TABLE: import_logs
-- ===========================================================================
CREATE TABLE IF NOT EXISTS import_logs (
    id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id       BIGINT UNSIGNED NOT NULL,
    file_name     VARCHAR(255)    NOT NULL,
    total_rows    INT             NOT NULL DEFAULT 0,
    imported_rows INT             NOT NULL DEFAULT 0,
    failed_rows   INT             NOT NULL DEFAULT 0,
    status        ENUM('pending','processing','done','failed') NOT NULL DEFAULT 'pending',
    created_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    KEY idx_il_user   (user_id),
    KEY idx_il_status (status),
    CONSTRAINT chk_il_rows CHECK (total_rows >= 0 AND imported_rows >= 0 AND failed_rows >= 0),
    CONSTRAINT fk_il_user  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- FK from transactions.import_batch_id → import_logs.id (optional — only if column now exists)
CALL _add_column_if_missing('transactions', '_fk_import_batch_sentinel',
    'ALTER TABLE transactions ADD CONSTRAINT fk_txn_import FOREIGN KEY (import_batch_id) REFERENCES import_logs (id) ON DELETE SET NULL');
-- Note: the sentinel column name is intentionally fake so the guard never fires twice;
-- the real column `import_batch_id` was added above.

-- ===========================================================================
-- 9. NEW TABLE: audit_logs
-- ===========================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id    BIGINT UNSIGNED NULL,          -- NULL when user is deleted
    action     ENUM(
                   'LOGIN',
                   'LOGOUT',
                   'PASSWORD_CHANGE',
                   'PROFILE_UPDATE',
                   'EXCEL_IMPORT',
                   'EXPORT',
                   'GOAL_CREATED'
               ) NOT NULL,
    ip_address VARCHAR(45)  NULL,             -- supports IPv6
    user_agent VARCHAR(500) NULL,
    metadata   JSON         NULL,
    created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

    KEY idx_al_user       (user_id),
    KEY idx_al_action     (action),
    KEY idx_al_created_at (created_at),
    CONSTRAINT fk_al_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===========================================================================
-- Cleanup helper procedure
-- ===========================================================================
DROP PROCEDURE IF EXISTS _add_column_if_missing;
