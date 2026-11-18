package handlers

import (
	"errors"
	"strconv"
	"time"

	"finance-portal/backend/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/shopspring/decimal"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

var errRecurringAlreadyPosted = errors.New("schedule already posted for this period")

func recurringAlreadyPosted(rt models.RecurringTransaction, now time.Time) bool {
	return rt.LastRunAt != nil && now.Before(rt.NextRunDate)
}

func advanceRecurringDate(date time.Time, frequency string) time.Time {
	switch frequency {
	case "daily":
		return date.AddDate(0, 0, 1)
	case "weekly":
		return date.AddDate(0, 0, 7)
	case "yearly":
		return date.AddDate(1, 0, 0)
	default:
		return date.AddDate(0, 1, 0)
	}
}

func nextRecurringDate(date time.Time, frequency string, now time.Time) time.Time {
	next := advanceRecurringDate(date, frequency)
	for !next.After(now) {
		next = advanceRecurringDate(next, frequency)
	}
	return next
}

// ListRecurring handles GET /recurring
func (h Handler) ListRecurring(c *gin.Context) {
	var items []models.RecurringTransaction
	h.DB.Preload("Category").
		Where("user_id = ?", uid(c)).
		Order("next_run_date ASC").
		Find(&items)
	c.JSON(200, items)
}

// CreateRecurring handles POST /recurring
func (h Handler) CreateRecurring(c *gin.Context) {
	var x struct {
		CategoryID  uint64          `json:"categoryId"`
		Title       string          `json:"title"`
		TxnType     string          `json:"txnType"`
		Amount      decimal.Decimal `json:"amount"`
		Frequency   string          `json:"frequency"`
		NextRunDate string          `json:"nextRunDate"`
		IsActive    *bool           `json:"isActive"`
	}
	if c.ShouldBindJSON(&x) != nil || x.Title == "" || x.Amount.LessThanOrEqual(decimal.Zero) {
		c.JSON(400, gin.H{"error": "title and a positive amount are required"})
		return
	}
	validFreq := map[string]bool{"daily": true, "weekly": true, "monthly": true, "yearly": true}
	if !validFreq[x.Frequency] {
		c.JSON(400, gin.H{"error": "frequency must be one of: daily, weekly, monthly, yearly"})
		return
	}
	if x.TxnType != "income" && x.TxnType != "expense" {
		c.JSON(400, gin.H{"error": "txnType must be income or expense"})
		return
	}
	nextRun, err := time.Parse("2006-01-02", x.NextRunDate)
	if err != nil {
		c.JSON(400, gin.H{"error": "nextRunDate must be YYYY-MM-DD"})
		return
	}
	id := uid(c)
	var cat models.Category
	if h.DB.Where("id = ? AND user_id = ?", x.CategoryID, id).First(&cat).Error != nil {
		c.JSON(404, gin.H{"error": "category not found"})
		return
	}
	active := true
	if x.IsActive != nil {
		active = *x.IsActive
	}
	rt := models.RecurringTransaction{
		UserID:      id,
		CategoryID:  x.CategoryID,
		Title:       x.Title,
		TxnType:     x.TxnType,
		Amount:      x.Amount,
		Frequency:   x.Frequency,
		NextRunDate: nextRun,
		IsActive:    active,
	}
	if err := h.DB.Create(&rt).Error; err != nil {
		c.JSON(500, gin.H{"error": "failed to create recurring transaction"})
		return
	}
	c.JSON(201, rt)
}

// UpdateRecurring handles PUT /recurring/:id
func (h Handler) UpdateRecurring(c *gin.Context) {
	rid, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	id := uid(c)
	var rt models.RecurringTransaction
	if h.DB.Where("id = ? AND user_id = ?", rid, id).First(&rt).Error != nil {
		c.JSON(404, gin.H{"error": "recurring transaction not found"})
		return
	}
	var x struct {
		CategoryID  uint64          `json:"categoryId"`
		Title       string          `json:"title"`
		TxnType     string          `json:"txnType"`
		Amount      decimal.Decimal `json:"amount"`
		Frequency   string          `json:"frequency"`
		NextRunDate string          `json:"nextRunDate"`
		IsActive    *bool           `json:"isActive"`
	}
	if c.ShouldBindJSON(&x) != nil {
		c.JSON(400, gin.H{"error": "invalid request"})
		return
	}
	if x.Title != "" {
		rt.Title = x.Title
	}
	if x.Amount.GreaterThan(decimal.Zero) {
		rt.Amount = x.Amount
	}
	validFreq := map[string]bool{"daily": true, "weekly": true, "monthly": true, "yearly": true}
	if validFreq[x.Frequency] {
		rt.Frequency = x.Frequency
	}
	if x.TxnType == "income" || x.TxnType == "expense" {
		rt.TxnType = x.TxnType
	}
	if x.NextRunDate != "" {
		if d, err := time.Parse("2006-01-02", x.NextRunDate); err == nil {
			rt.NextRunDate = d
		}
	}
	if x.CategoryID > 0 {
		var cat models.Category
		if h.DB.Where("id = ? AND user_id = ?", x.CategoryID, id).First(&cat).Error == nil {
			rt.CategoryID = x.CategoryID
		}
	}
	if x.IsActive != nil {
		rt.IsActive = *x.IsActive
	}
	h.DB.Save(&rt)
	c.JSON(200, rt)
}

// DeleteRecurring handles DELETE /recurring/:id
func (h Handler) DeleteRecurring(c *gin.Context) {
	rid, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	var rt models.RecurringTransaction
	if h.DB.Where("id = ? AND user_id = ?", rid, uid(c)).First(&rt).Error != nil {
		c.JSON(404, gin.H{"error": "recurring transaction not found"})
		return
	}
	h.DB.Delete(&rt)
	c.Status(204)
}

// RunRecurring handles POST /recurring/:id/run
// Manually triggers one execution of a recurring transaction by creating a real transaction.
func (h Handler) RunRecurring(c *gin.Context) {
	rid, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	id := uid(c)
	var rt models.RecurringTransaction
	var createdTxn models.Transaction
	now := time.Now()
	err := h.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("id = ? AND user_id = ?", rid, id).
			First(&rt).Error; err != nil {
			return err
		}
		if recurringAlreadyPosted(rt, now) {
			return errRecurringAlreadyPosted
		}

		txn := models.Transaction{
			UserID:      id,
			CategoryID:  rt.CategoryID,
			Amount:      rt.Amount,
			Description: "[Auto] " + rt.Title,
			TxnDate:     now,
		}
		if e := tx.Create(&txn).Error; e != nil {
			return e
		}
		createdTxn = txn
		rt.NextRunDate = nextRecurringDate(rt.NextRunDate, rt.Frequency, now)
		rt.LastRunAt = &now
		return tx.Model(&rt).Updates(map[string]interface{}{
			"next_run_date": rt.NextRunDate,
			"last_run_at":   now,
		}).Error
	})
	if errors.Is(err, gorm.ErrRecordNotFound) {
		c.JSON(404, gin.H{"error": "recurring transaction not found"})
		return
	}
	if errors.Is(err, errRecurringAlreadyPosted) {
		c.JSON(409, gin.H{"error": errRecurringAlreadyPosted.Error()})
		return
	}
	if err != nil {
		c.JSON(500, gin.H{"error": "failed to run recurring transaction"})
		return
	}
	c.JSON(201, gin.H{
		"message":     "recurring transaction executed",
		"transaction": createdTxn,
		"nextRunDate": rt.NextRunDate.Format("2006-01-02"),
		"lastRunAt":   rt.LastRunAt,
	})
}
