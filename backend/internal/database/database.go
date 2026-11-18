package database

import (
	"finance-portal/backend/internal/config"
	"finance-portal/backend/internal/models"
	"fmt"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

func Connect(c config.Config) (*gorm.DB, error) {
	db, e := gorm.Open(mysql.Open(c.DSN), &gorm.Config{})
	if e != nil {
		return nil, fmt.Errorf("database connection: %w", e)
	}
	return db, e
}
func Migrate(db *gorm.DB) error {
	if err := db.AutoMigrate(
		&models.User{},
		&models.Category{},
		&models.Transaction{},
		&models.Budget{},
		&models.Account{},
		&models.RecurringTransaction{},
		&models.SavingsGoal{},
		&models.ImportLog{},
		&models.AuditLog{},
	); err != nil {
		return err
	}

	return db.Exec(`
		UPDATE recurring_transactions AS rt
		SET last_run_at = (
			SELECT MAX(t.txn_date)
			FROM transactions AS t
			WHERE t.user_id = rt.user_id
				AND t.category_id = rt.category_id
				AND t.amount = rt.amount
				AND t.description = CONCAT('[Auto] ', rt.title)
		)
		WHERE rt.last_run_at IS NULL
			AND EXISTS (
				SELECT 1
				FROM transactions AS t
				WHERE t.user_id = rt.user_id
					AND t.category_id = rt.category_id
					AND t.amount = rt.amount
					AND t.description = CONCAT('[Auto] ', rt.title)
			)
	`).Error
}
