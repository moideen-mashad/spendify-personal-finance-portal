-- =============================================================================
-- TiDB Cloud & MySQL 8 Complete Schema Initialization
-- Database: test
-- Description: Creates all 9 tables with FOREIGN_KEY_CHECKS disabled during run.
-- =============================================================================

USE test;

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Users table
CREATE TABLE IF NOT EXISTS users (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    full_name           VARCHAR(100)    NOT NULL,
    email               VARCHAR(150)    NOT NULL UNIQUE,
    password_hash       VARCHAR(255)    NOT NULL,
    currency            CHAR(3)         NOT NULL DEFAULT 'INR',
    phone               VARCHAR(20)     NULL,
    avatar_url          VARCHAR(500)    NULL,
    bio                 VARCHAR(500)    NULL,
    monthly_income_goal DECIMAL(14,2)   NULL,
    fiscal_start_day    TINYINT UNSIGNED NOT NULL DEFAULT 1,
    alert_threshold_pct TINYINT UNSIGNED NOT NULL DEFAULT 80,
    created_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Accounts / Wallets table
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

-- 3. Categories table
CREATE TABLE IF NOT EXISTS categories (
    id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id    BIGINT UNSIGNED NOT NULL,
    name       VARCHAR(60)     NOT NULL,
    type       ENUM('income','expense') NOT NULL,
    color      CHAR(7)         NOT NULL DEFAULT '#6366F1',
    icon       VARCHAR(50)     NOT NULL DEFAULT 'circle',
    is_default BOOLEAN         NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_category (user_id, name, type),
    KEY idx_cat_user (user_id),
    CONSTRAINT fk_cat_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Import Logs table
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
    CONSTRAINT fk_il_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id         BIGINT UNSIGNED NOT NULL,
    category_id     BIGINT UNSIGNED NOT NULL,
    amount          DECIMAL(12,2)   NOT NULL,
    description     VARCHAR(255)    NULL,
    txn_date        DATE            NOT NULL,
    merchant        VARCHAR(150)    NULL,
    notes           TEXT            NULL,
    tags            VARCHAR(500)    NULL,
    import_batch_id BIGINT UNSIGNED NULL,
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_txn_user_date (user_id, txn_date),
    KEY idx_txn_category  (category_id),
    KEY idx_txn_import    (import_batch_id),
    CONSTRAINT fk_txn_user   FOREIGN KEY (user_id)         REFERENCES users       (id) ON DELETE CASCADE,
    CONSTRAINT fk_txn_cat    FOREIGN KEY (category_id)     REFERENCES categories  (id) ON DELETE RESTRICT,
    CONSTRAINT fk_txn_import FOREIGN KEY (import_batch_id) REFERENCES import_logs (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Budgets table
CREATE TABLE IF NOT EXISTS budgets (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id             BIGINT UNSIGNED NOT NULL,
    category_id         BIGINT UNSIGNED NOT NULL,
    `month`             TINYINT UNSIGNED NOT NULL,
    `year`              SMALLINT UNSIGNED NOT NULL,
    amount_limit        DECIMAL(12,2)   NOT NULL,
    alert_threshold_pct TINYINT UNSIGNED NOT NULL DEFAULT 80,
    rollover_enabled    BOOLEAN         NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_budget (user_id, category_id, `year`, `month`),
    KEY idx_bud_user (user_id),
    CONSTRAINT fk_bud_user FOREIGN KEY (user_id)     REFERENCES users      (id) ON DELETE CASCADE,
    CONSTRAINT fk_bud_cat  FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Recurring Transactions table
CREATE TABLE IF NOT EXISTS recurring_transactions (
    id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id       BIGINT UNSIGNED NOT NULL,
    category_id   BIGINT UNSIGNED NOT NULL,
    title         VARCHAR(150)    NOT NULL,
    txn_type      ENUM('income','expense') NOT NULL,
    amount        DECIMAL(12,2)   NOT NULL,
    frequency     ENUM('daily','weekly','monthly','yearly') NOT NULL,
    next_run_date DATE            NOT NULL,
    last_run_at   TIMESTAMP       NULL,
    is_active     BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_rec_txn_user     (user_id),
    KEY idx_rec_txn_next_run (next_run_date, is_active),
    CONSTRAINT fk_rec_user FOREIGN KEY (user_id)     REFERENCES users      (id) ON DELETE CASCADE,
    CONSTRAINT fk_rec_cat  FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Savings Goals table
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
    KEY idx_sg_user   (user_id),
    KEY idx_sg_status (status),
    CONSTRAINT fk_sg_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Audit Logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id    BIGINT UNSIGNED NULL,
    action     ENUM('LOGIN','LOGOUT','PASSWORD_CHANGE','PROFILE_UPDATE','EXCEL_IMPORT','EXPORT','GOAL_CREATED') NOT NULL,
    ip_address VARCHAR(45)     NULL,
    user_agent VARCHAR(500)    NULL,
    metadata   JSON            NULL,
    created_at TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_al_user       (user_id),
    KEY idx_al_action     (action),
    KEY idx_al_created_at (created_at),
    CONSTRAINT fk_al_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
