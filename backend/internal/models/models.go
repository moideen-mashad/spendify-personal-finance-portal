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
	FullName          string          `json:"fullName"          gorm:"type:varchar(100)"`
	Email             string          `json:"email"             gorm:"type:varchar(150);uniqueIndex"`
	PasswordHash      string          `json:"-"                 gorm:"type:varchar(255)"`
	Currency          string          `json:"currency"          gorm:"type:char(3);default:'INR'"`
	Phone             string          `json:"phone,omitempty"   gorm:"type:varchar(20)"`
	AvatarURL         string          `json:"avatarUrl,omitempty" gorm:"type:varchar(500)"`
	Bio               string          `json:"bio,omitempty"     gorm:"type:varchar(500)"`
	MonthlyIncomeGoal decimal.Decimal `json:"monthlyIncomeGoal" gorm:"type:decimal(14,2)"`
	FiscalStartDay    int             `json:"fiscalStartDay"    gorm:"default:1"`
	AlertThresholdPct int             `json:"alertThresholdPct" gorm:"default:80"`
	CreatedAt         time.Time       `json:"createdAt"`
	UpdatedAt         time.Time       `json:"updatedAt"`
}

// Category model represents expense and income categories
type Category struct {
	ID        uint64    `json:"id"        gorm:"primaryKey"`
	UserID    uint64    `json:"-"         gorm:"index"`
	Name      string    `json:"name"      gorm:"type:varchar(60)"`
	Type      string    `json:"type"      gorm:"type:varchar(20)"`
	Color     string    `json:"color"     gorm:"type:char(7);default:'#6366F1'"`
	Icon      string    `json:"icon"      gorm:"type:varchar(50);default:'circle'"`
	IsDefault bool      `json:"isDefault" gorm:"default:false"`
	CreatedAt time.Time `json:"createdAt"`
}

// Transaction model represents financial inflows and outflows
type Transaction struct {
	ID            uint64          `json:"id"            gorm:"primaryKey"`
	UserID        uint64          `json:"-"             gorm:"index"`
	CategoryID    uint64          `json:"categoryId"    gorm:"index"`
	Category      Category        `json:"-"             gorm:"foreignKey:CategoryID"`
	Amount        decimal.Decimal `json:"amount"        gorm:"type:decimal(12,2)"`
	Description   string          `json:"description"   gorm:"type:varchar(255)"`
	TxnDate       time.Time       `json:"txnDate"       gorm:"type:date"`
	Merchant      string          `json:"merchant,omitempty" gorm:"type:varchar(150)"`
	Notes         string          `json:"notes,omitempty" gorm:"type:text"`
	Tags          string          `json:"tags,omitempty"  gorm:"type:varchar(500)"`
	ImportBatchID *uint64         `json:"importBatchId,omitempty" gorm:"index"`
	CreatedAt     time.Time       `json:"createdAt"`
	UpdatedAt     time.Time       `json:"updatedAt"`
}

// Budget model represents category spending limits for a given month and year
type Budget struct {
	ID                uint64          `json:"id"                gorm:"primaryKey"`
	UserID            uint64          `json:"-"                 gorm:"index"`
	CategoryID        uint64          `json:"categoryId"        gorm:"index"`
	Category          Category        `json:"category"          gorm:"foreignKey:CategoryID"`
	Month             int             `json:"month"`
	Year              int             `json:"year"`
	AmountLimit       decimal.Decimal `json:"amountLimit"       gorm:"type:decimal(12,2)"`
	AlertThresholdPct int             `json:"alertThresholdPct" gorm:"default:80"`
	RolloverEnabled   bool            `json:"rolloverEnabled"   gorm:"default:false"`
	CreatedAt         time.Time       `json:"createdAt"`
}

// Account model represents user wallets, bank accounts, credit cards, or digital wallets
type Account struct {
	ID          uint64          `json:"id"          gorm:"primaryKey"`
	UserID      uint64          `json:"-"           gorm:"index"`
	Name        string          `json:"name"        gorm:"type:varchar(100)"`
	AccountType string          `json:"accountType" gorm:"type:varchar(30)"` // bank | credit_card | cash | upi | digital_wallet
	Balance     decimal.Decimal `json:"balance"     gorm:"type:decimal(14,2);default:0"`
	Currency    string          `json:"currency"    gorm:"type:char(3);default:'INR'"`
	IsArchived  bool            `json:"isArchived"  gorm:"default:false"`
	CreatedAt   time.Time       `json:"createdAt"`
	UpdatedAt   time.Time       `json:"updatedAt"`
}

// RecurringTransaction represents automated scheduled payments and bills
type RecurringTransaction struct {
	ID          uint64          `json:"id"          gorm:"primaryKey"`
	UserID      uint64          `json:"-"           gorm:"index"`
	CategoryID  uint64          `json:"categoryId"  gorm:"index"`
	Category    Category        `json:"category"    gorm:"foreignKey:CategoryID"`
	Title       string          `json:"title"       gorm:"type:varchar(150)"`
	TxnType     string          `json:"txnType"     gorm:"type:varchar(20)"` // income | expense
	Amount      decimal.Decimal `json:"amount"      gorm:"type:decimal(12,2)"`
	Frequency   string          `json:"frequency"   gorm:"type:varchar(20)"` // daily | weekly | monthly | yearly
	NextRunDate time.Time       `json:"nextRunDate" gorm:"type:date"`
	LastRunAt   *time.Time      `json:"lastRunAt,omitempty"`
	IsActive    bool            `json:"isActive"    gorm:"default:true"`
	CreatedAt   time.Time       `json:"createdAt"`
}

// SavingsGoal represents target financial goals
type SavingsGoal struct {
	ID            uint64          `json:"id"            gorm:"primaryKey"`
	UserID        uint64          `json:"-"             gorm:"index"`
	Title         string          `json:"title"         gorm:"type:varchar(150)"`
	TargetAmount  decimal.Decimal `json:"targetAmount"  gorm:"type:decimal(14,2)"`
	CurrentAmount decimal.Decimal `json:"currentAmount" gorm:"type:decimal(14,2);default:0"`
	Deadline      string          `json:"deadline,omitempty" gorm:"type:varchar(20)"`
	Icon          string          `json:"icon"          gorm:"type:varchar(50);default:'target'"`
	Color         string          `json:"color"         gorm:"type:char(7);default:'#6366F1'"`
	Status        string          `json:"status"        gorm:"type:varchar(20);default:'active'"` // active | completed | paused
	CreatedAt     time.Time       `json:"createdAt"`
	UpdatedAt     time.Time       `json:"updatedAt"`
}

// ImportLog tracks bulk excel and csv import histories
type ImportLog struct {
	ID           uint64    `json:"id"           gorm:"primaryKey"`
	UserID       uint64    `json:"-"            gorm:"index"`
	FileName     string    `json:"fileName"     gorm:"type:varchar(255)"`
	TotalRows    int       `json:"totalRows"    gorm:"default:0"`
	ImportedRows int       `json:"importedRows" gorm:"default:0"`
	FailedRows   int       `json:"failedRows"   gorm:"default:0"`
	Status       string    `json:"status"       gorm:"type:varchar(20);default:'pending'"` // pending | processing | done | failed
	CreatedAt    time.Time `json:"createdAt"`
}

// AuditLog tracks security and data events
type AuditLog struct {
	ID        uint64    `json:"id"        gorm:"primaryKey"`
	UserID    uint64    `json:"userId"    gorm:"index"`
	Action    string    `json:"action"    gorm:"type:varchar(50)"` // LOGIN | LOGOUT | PASSWORD_CHANGE | PROFILE_UPDATE | EXCEL_IMPORT | EXPORT | GOAL_CREATED
	IPAddress string    `json:"ipAddress" gorm:"type:varchar(45)"`
	UserAgent string    `json:"userAgent" gorm:"type:varchar(500)"`
	CreatedAt time.Time `json:"createdAt"`
}
