package handlers

import (
	"strconv"

	"finance-portal/backend/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/shopspring/decimal"
)

// ListAccounts handles GET /accounts
// Returns all non-archived accounts for the authenticated user.
func (h Handler) ListAccounts(c *gin.Context) {
	id := uid(c)
	var accounts []models.Account
	h.DB.Where("user_id = ? AND is_archived = false", id).
		Order("created_at ASC").
		Find(&accounts)

	out := []gin.H{}
	for _, a := range accounts {
		// Compute running balance: account base balance +/- transaction sums
		var txnSum decimal.Decimal
		h.DB.Table("transactions t").
			Select("COALESCE(SUM(CASE WHEN c.type='income' THEN t.amount ELSE -t.amount END), 0)").
			Joins("JOIN categories c ON c.id = t.category_id").
			Where("t.user_id = ?", id).
			Scan(&txnSum)

		out = append(out, gin.H{
			"id":          a.ID,
			"name":        a.Name,
			"accountType": a.AccountType,
			"balance":     a.Balance,
			"currency":    a.Currency,
			"isArchived":  a.IsArchived,
			"createdAt":   a.CreatedAt,
		})
	}
	c.JSON(200, out)
}

// CreateAccount handles POST /accounts
func (h Handler) CreateAccount(c *gin.Context) {
	var x struct {
		Name        string          `json:"name"`
		AccountType string          `json:"accountType"`
		Balance     decimal.Decimal `json:"balance"`
		Currency    string          `json:"currency"`
	}
	if c.ShouldBindJSON(&x) != nil || x.Name == "" {
		c.JSON(400, gin.H{"error": "name is required"})
		return
	}
	validTypes := map[string]bool{
		"bank": true, "credit_card": true, "cash": true,
		"upi": true, "digital_wallet": true,
	}
	if !validTypes[x.AccountType] {
		c.JSON(400, gin.H{"error": "accountType must be one of: bank, credit_card, cash, upi, digital_wallet"})
		return
	}
	currency := x.Currency
	if len(currency) != 3 {
		currency = "INR"
	}
	a := models.Account{
		UserID:      uid(c),
		Name:        x.Name,
		AccountType: x.AccountType,
		Balance:     x.Balance,
		Currency:    currency,
	}
	if e := h.DB.Create(&a).Error; e != nil {
		c.JSON(409, gin.H{"error": "account already exists"})
		return
	}
	c.JSON(201, a)
}

// UpdateAccount handles PUT /accounts/:id
func (h Handler) UpdateAccount(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	var a models.Account
	if h.DB.Where("id = ? AND user_id = ?", id, uid(c)).First(&a).Error != nil {
		c.JSON(404, gin.H{"error": "account not found"})
		return
	}
	var x struct {
		Name        string          `json:"name"`
		AccountType string          `json:"accountType"`
		Balance     decimal.Decimal `json:"balance"`
		Currency    string          `json:"currency"`
	}
	if c.ShouldBindJSON(&x) != nil {
		c.JSON(400, gin.H{"error": "invalid request"})
		return
	}
	if x.Name != "" {
		a.Name = x.Name
	}
	validTypes := map[string]bool{
		"bank": true, "credit_card": true, "cash": true,
		"upi": true, "digital_wallet": true,
	}
	if validTypes[x.AccountType] {
		a.AccountType = x.AccountType
	}
	if !x.Balance.IsZero() {
		a.Balance = x.Balance
	}
	if len(x.Currency) == 3 {
		a.Currency = x.Currency
	}
	h.DB.Save(&a)
	c.JSON(200, a)
}

// ArchiveAccount handles DELETE /accounts/:id — soft delete (is_archived = true).
func (h Handler) ArchiveAccount(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	var a models.Account
	if h.DB.Where("id = ? AND user_id = ?", id, uid(c)).First(&a).Error != nil {
		c.JSON(404, gin.H{"error": "account not found"})
		return
	}
	if err := h.DB.Model(&a).Update("is_archived", true).Error; err != nil {
		c.JSON(500, gin.H{"error": "failed to archive account"})
		return
	}
	c.JSON(200, gin.H{"message": "account archived"})
}
