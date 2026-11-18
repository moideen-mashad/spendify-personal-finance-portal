package models

import (
	"time"

	"github.com/shopspring/decimal"
)

// Audit action constants
const (
	AuditLogin          = "LOGIN"
	AuditLogout         = "LOGOUT"
	AuditPasswordChange = "PASSWORD_CHANGE"
	AuditProfileUpdate  = "PROFILE_UPDATE"
	AuditExcelImport    = "EXCEL_IMPORT"
	AuditExport         = "EXPORT"
	AuditGoalCreated    = "GOAL_CREATED"
)

// User model represents the system user
type User struct {
	ID                uint64          `json:"id"                gorm:"primaryKey"`
	FullName          string          `json:"fullName"`
	Email             string          `json:"email"             gorm:"uniqueIndex"`
	PasswordHash      string          `json:"-"`
	Currency          string          `json:"currency"          gorm:"default:'INR'"`
	Phone             string          `json:"phone,omitempty"`
	AvatarURL         string          `json:"avatarUrl,omitempty"`
	Bio               string          `json:"bio,omitempty"`
	MonthlyIncomeGoal decimal.Decimal `json:"monthlyIncomeGoal"`
	FiscalStartDay    int             `json:"fiscalStartDay"    gorm:"default:1"`
	AlertThresholdPct int             `json:"alertThresholdPct" gorm:"default:80"`
	CreatedAt         time.Time       `json:"createdAt"`
	UpdatedAt         time.Time       `json:"updatedAt"`
}

// Category model represents expense and income categories
type Category struct {
	ID        uint64    `json:"id"        gorm:"primaryKey"`
	UserID    uint64    `json:"-"`
	Name      string    `json:"name"`
	Type      string    `json:"type"`
	Color     string    `json:"color"`
	Icon      string    `json:"icon"      gorm:"default:'circle'"`
	IsDefault bool      `json:"isDefault" gorm:"default:false"`
	CreatedAt time.Time `json:"createdAt"`
}

// Transaction model represents financial inflows and outflows
type Transaction struct {
	ID            uint64          `json:"id"            gorm:"primaryKey"`
	UserID        uint64          `json:"-"`
	CategoryID    uint64          `json:"categoryId"`
	Category      Category        `json:"-"             gorm:"foreignKey:CategoryID"`
	Amount        decimal.Decimal `json:"amount"`
	Description   string          `json:"description"`
	TxnDate       time.Time       `json:"txnDate"`
	Merchant      string          `json:"merchant,omitempty"`
	Notes         string          `json:"notes,omitempty"`
	Tags          string          `json:"tags,omitempty"`
	ImportBatchID *uint64         `json:"importBatchId,omitempty"`
	CreatedAt     time.Time       `json:"createdAt"`
	UpdatedAt     time.Time       `json:"updatedAt"`
}

// Budget model represents category spending limits for a given month and year
type Budget struct {
	ID                uint64          `json:"id"                gorm:"primaryKey"`
	UserID            uint64          `json:"-"`
	CategoryID        uint64          `json:"categoryId"`
	Category          Category        `json:"category"          gorm:"foreignKey:CategoryID"`
	Month             int             `json:"month"`
	Year              int             `json:"year"`
	AmountLimit       decimal.Decimal `json:"amountLimit"`
	AlertThresholdPct int             `json:"alertThresholdPct" gorm:"default:80"`
	RolloverEnabled   bool            `json:"rolloverEnabled"   gorm:"default:false"`
	CreatedAt         time.Time       `json:"createdAt"`
}

// Account model represents user wallets, bank accounts, credit cards, or digital wallets
type Account struct {
	ID          uint64          `json:"id"          gorm:"primaryKey"`
	UserID      uint64          `json:"-"`
	Name        string          `json:"name"`
	AccountType string          `json:"accountType"` // bank | credit_card | cash | upi | digital_wallet
	Balance     decimal.Decimal `json:"balance"     gorm:"default:0"`
	Currency    string          `json:"currency"    gorm:"default:'INR'"`
	IsArchived  bool            `json:"isArchived"  gorm:"default:false"`
	CreatedAt   time.Time       `json:"createdAt"`
	UpdatedAt   time.Time       `json:"updatedAt"`
}

// RecurringTransaction represents automated scheduled payments and bills
type RecurringTransaction struct {
	ID          uint64          `json:"id"          gorm:"primaryKey"`
	UserID      uint64          `json:"-"`
	CategoryID  uint64          `json:"categoryId"`
	Category    Category        `json:"category"    gorm:"foreignKey:CategoryID"`
	Title       string          `json:"title"`
	TxnType     string          `json:"txnType"`    // income | expense
	Amount      decimal.Decimal `json:"amount"`
	Frequency   string          `json:"frequency"`  // daily | weekly | monthly | yearly
	NextRunDate time.Time       `json:"nextRunDate"`
	IsActive    bool            `json:"isActive"    gorm:"default:true"`
	CreatedAt   time.Time       `json:"createdAt"`
}

// SavingsGoal represents target financial goals
type SavingsGoal struct {
	ID            uint64          `json:"id"            gorm:"primaryKey"`
	UserID        uint64          `json:"-"`
	Title         string          `json:"title"`
	TargetAmount  decimal.Decimal `json:"targetAmount"`
	CurrentAmount decimal.Decimal `json:"currentAmount" gorm:"default:0"`
	Deadline      string          `json:"deadline,omitempty"`
	Icon          string          `json:"icon"          gorm:"default:'target'"`
	Color         string          `json:"color"         gorm:"default:'#6366F1'"`
	Status        string          `json:"status"        gorm:"default:'active'"` // active | completed | paused
	CreatedAt     time.Time       `json:"createdAt"`
	UpdatedAt     time.Time       `json:"updatedAt"`
}

// ImportLog tracks bulk excel and csv import histories
type ImportLog struct {
	ID           uint64    `json:"id"           gorm:"primaryKey"`
	UserID       uint64    `json:"-"`
	FileName     string    `json:"fileName"`
	TotalRows    int       `json:"totalRows"    gorm:"default:0"`
	ImportedRows int       `json:"importedRows" gorm:"default:0"`
	FailedRows   int       `json:"failedRows"   gorm:"default:0"`
	Status       string    `json:"status"       gorm:"default:'pending'"` // pending | processing | done | failed
	CreatedAt    time.Time `json:"createdAt"`
}

// AuditLog tracks security and data events
type AuditLog struct {
	ID        uint64    `json:"id"        gorm:"primaryKey"`
	UserID    uint64    `json:"userId"`
	Action    string    `json:"action"` // LOGIN | LOGOUT | PASSWORD_CHANGE | PROFILE_UPDATE | EXCEL_IMPORT | EXPORT | GOAL_CREATED
	IPAddress string    `json:"ipAddress"`
	UserAgent string    `json:"userAgent"`
	CreatedAt time.Time `json:"createdAt"`
}
