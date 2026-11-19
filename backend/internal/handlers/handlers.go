package handlers

import (
	"encoding/csv"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"
	"unicode"

	"finance-portal/backend/internal/models"
	"finance-portal/backend/internal/service"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/shopspring/decimal"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// Handler holds shared dependencies for all handlers.
type Handler struct {
	DB            *gorm.DB
	Access        string
	RefreshSecret string
	Env           string
}

// uid extracts the authenticated user's ID from the gin context.
func uid(c *gin.Context) uint64 {
	n, _ := strconv.ParseUint(c.MustGet("userID").(string), 10, 64)
	return n
}

// passwordOK returns true if s is 8+ chars containing a letter and a digit.
func passwordOK(s string) bool {
	if len(s) < 8 {
		return false
	}
	var l, d bool
	for _, r := range s {
		l = l || unicode.IsLetter(r)
		d = d || unicode.IsDigit(r)
	}
	return l && d
}

// strongPassword enforces 8+ chars, letter, digit AND special character.
func strongPassword(s string) bool {
	if len(s) < 8 {
		return false
	}
	var l, d, sp bool
	for _, r := range s {
		l = l || unicode.IsLetter(r)
		d = d || unicode.IsDigit(r)
		sp = sp || (!unicode.IsLetter(r) && !unicode.IsDigit(r) && r > 32)
	}
	return l && d && sp
}

// token mints a signed JWT for the given user ID.
func (h Handler) token(id uint64, secret string, dur time.Duration) (string, error) {
	return jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub": strconv.FormatUint(id, 10),
		"exp": time.Now().Add(dur).Unix(),
	}).SignedString([]byte(secret))
}

// defaults seeds the default category set for a newly-registered user.
func defaults(db *gorm.DB, id uint64) {
	cats := []models.Category{}
	for i, n := range []string{
		"Food & Dining", "Transport", "Rent / Housing",
		"Utilities", "Shopping", "Health", "Education",
		"Entertainment", "Other",
	} {
		cats = append(cats, models.Category{
			UserID: id,
			Name:   n,
			Type:   "expense",
			Color: []string{
				"#ef4444", "#f97316", "#8b5cf6", "#06b6d4",
				"#ec4899", "#14b8a6", "#3b82f6", "#f59e0b", "#64748b",
			}[i],
		})
	}
	for i, n := range []string{"Salary", "Freelance", "Other Income"} {
		cats = append(cats, models.Category{
			UserID: id,
			Name:   n,
			Type:   "income",
			Color:  []string{"#22c55e", "#10b981", "#84cc16"}[i],
		})
	}
	db.Create(&cats)
}

// AuditLog writes a record to the audit_logs table (best-effort, never fatal).
func (h Handler) AuditLog(userID uint64, action string, c *gin.Context, metadata interface{}) {
	ip := c.ClientIP()
	ua := c.Request.UserAgent()
	log := models.AuditLog{
		UserID:    userID,
		Action:    action,
		IPAddress: ip,
		UserAgent: ua,
	}
	h.DB.Create(&log)
}

// ─── Auth Handlers ────────────────────────────────────────────────────────────

func (h Handler) Register(c *gin.Context) {
	var x struct {
		FullName string
		Email    string
		Password string
	}
	if c.ShouldBindJSON(&x) != nil ||
		strings.TrimSpace(x.FullName) == "" ||
		!strings.Contains(x.Email, "@") ||
		!passwordOK(x.Password) {
		c.JSON(400, gin.H{"error": "provide a valid name, email and password (8+ characters, letter and digit)"})
		return
	}
	hash, _ := bcrypt.GenerateFromPassword([]byte(x.Password), 12)
	u := models.User{
		FullName:     x.FullName,
		Email:        strings.ToLower(x.Email),
		PasswordHash: string(hash),
		Currency:     "INR",
	}
	e := h.DB.Transaction(func(tx *gorm.DB) error {
		if e := tx.Create(&u).Error; e != nil {
			return e
		}
		defaults(tx, u.ID)
		return nil
	})
	if e != nil {
		c.JSON(409, gin.H{"error": "email already exists"})
		return
	}
	c.JSON(201, gin.H{"id": u.ID, "fullName": u.FullName, "email": u.Email})
}

func (h Handler) Login(c *gin.Context) {
	var x struct {
		Email    string
		Password string
	}
	if c.ShouldBindJSON(&x) != nil {
		c.JSON(400, gin.H{"error": "invalid request"})
		return
	}
	var u models.User
	if h.DB.Where("email = ?", strings.ToLower(x.Email)).First(&u).Error != nil ||
		bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(x.Password)) != nil {
		c.JSON(401, gin.H{"error": "invalid email or password"})
		return
	}
	a, _ := h.token(u.ID, h.Access, 15*time.Minute)
	r, _ := h.token(u.ID, h.RefreshSecret, 7*24*time.Hour)
	if h.Env == "production" {
		c.SetSameSite(http.SameSiteNoneMode)
		c.SetCookie("refresh_token", r, 604800, "/api/v1/auth", "", true, true)
	} else {
		c.SetSameSite(http.SameSiteStrictMode)
		c.SetCookie("refresh_token", r, 604800, "/api/v1/auth", "", false, true)
	}

	// Audit login event
	h.AuditLog(u.ID, models.AuditLogin, c, nil)

	c.JSON(200, gin.H{
		"accessToken":  a,
		"refreshToken": r,
		"user": gin.H{
			"id":       u.ID,
			"fullName": u.FullName,
			"email":    u.Email,
			"currency": u.Currency,
		},
	})
}

func (h Handler) Refresh(c *gin.Context) {
	r, _ := c.Cookie("refresh_token")
	if r == "" {
		var req struct {
			RefreshToken string `json:"refreshToken"`
		}
		_ = c.ShouldBindJSON(&req)
		r = req.RefreshToken
	}
	if r == "" {
		if auth := c.GetHeader("Authorization"); strings.HasPrefix(auth, "Bearer ") {
			r = strings.TrimPrefix(auth, "Bearer ")
		}
	}
	t, e := jwt.Parse(r, func(t *jwt.Token) (interface{}, error) {
		return []byte(h.RefreshSecret), nil
	})
	if e != nil || !t.Valid {
		c.JSON(401, gin.H{"error": "invalid refresh token"})
		return
	}
	s := t.Claims.(jwt.MapClaims)["sub"].(string)
	id, _ := strconv.ParseUint(s, 10, 64)
	a, _ := h.token(id, h.Access, 15*time.Minute)
	newR, _ := h.token(id, h.RefreshSecret, 7*24*time.Hour)
	if h.Env == "production" {
		c.SetSameSite(http.SameSiteNoneMode)
		c.SetCookie("refresh_token", newR, 604800, "/api/v1/auth", "", true, true)
	} else {
		c.SetSameSite(http.SameSiteStrictMode)
		c.SetCookie("refresh_token", newR, 604800, "/api/v1/auth", "", false, true)
	}
	c.JSON(200, gin.H{
		"accessToken":  a,
		"refreshToken": newR,
	})
}

func (h Handler) Logout(c *gin.Context) {
	if h.Env == "production" {
		c.SetSameSite(http.SameSiteNoneMode)
		c.SetCookie("refresh_token", "", -1, "/api/v1/auth", "", true, true)
	} else {
		c.SetSameSite(http.SameSiteStrictMode)
		c.SetCookie("refresh_token", "", -1, "/api/v1/auth", "", false, true)
	}
	c.Status(204)
}

// ─── User / Profile Handlers ──────────────────────────────────────────────────

// Me handles GET + PUT /users/me.
// PUT accepts: fullName, currency, phone, bio, monthlyIncomeGoal,
// fiscalStartDay, alertThresholdPct, avatarUrl.
func (h Handler) Me(c *gin.Context) {
	var u models.User
	if h.DB.Where("id = ?", uid(c)).First(&u).Error != nil {
		c.JSON(404, gin.H{"error": "user not found"})
		return
	}
	if c.Request.Method == "PUT" {
		var x struct {
			FullName          string          `json:"fullName"`
			Currency          string          `json:"currency"`
			Phone             string          `json:"phone"`
			Bio               string          `json:"bio"`
			AvatarURL         string          `json:"avatarUrl"`
			MonthlyIncomeGoal decimal.Decimal `json:"monthlyIncomeGoal"`
			FiscalStartDay    *int            `json:"fiscalStartDay"`
			AlertThresholdPct *int            `json:"alertThresholdPct"`
		}
		if c.ShouldBindJSON(&x) != nil {
			c.JSON(400, gin.H{"error": "invalid request"})
			return
		}
		if x.FullName != "" {
			u.FullName = x.FullName
		}
		if len(x.Currency) == 3 {
			u.Currency = strings.ToUpper(x.Currency)
		}
		if x.Phone != "" {
			u.Phone = x.Phone
		}
		if x.Bio != "" {
			u.Bio = x.Bio
		}
		if x.AvatarURL != "" {
			u.AvatarURL = x.AvatarURL
		}
		if !x.MonthlyIncomeGoal.IsZero() {
			u.MonthlyIncomeGoal = x.MonthlyIncomeGoal
		}
		if x.FiscalStartDay != nil {
			u.FiscalStartDay = *x.FiscalStartDay
		}
		if x.AlertThresholdPct != nil {
			u.AlertThresholdPct = *x.AlertThresholdPct
		}
		h.DB.Save(&u)
		h.AuditLog(u.ID, models.AuditProfileUpdate, c, nil)
	}
	c.JSON(200, gin.H{
		"id":                u.ID,
		"fullName":          u.FullName,
		"email":             u.Email,
		"currency":          u.Currency,
		"phone":             u.Phone,
		"bio":               u.Bio,
		"avatarUrl":         u.AvatarURL,
		"monthlyIncomeGoal": u.MonthlyIncomeGoal,
		"fiscalStartDay":    u.FiscalStartDay,
		"alertThresholdPct": u.AlertThresholdPct,
	})
}

// ChangePassword handles POST /users/me/password.
// Body: { "currentPassword": "...", "newPassword": "..." }
func (h Handler) ChangePassword(c *gin.Context) {
	var x struct {
		CurrentPassword string `json:"currentPassword"`
		NewPassword     string `json:"newPassword"`
	}
	if c.ShouldBindJSON(&x) != nil {
		c.JSON(400, gin.H{"error": "invalid request"})
		return
	}
	var u models.User
	if h.DB.Where("id = ?", uid(c)).First(&u).Error != nil {
		c.JSON(404, gin.H{"error": "user not found"})
		return
	}
	// Verify current password
	if bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(x.CurrentPassword)) != nil {
		c.JSON(401, gin.H{"error": "current password is incorrect"})
		return
	}
	// Enforce strong new password
	if !strongPassword(x.NewPassword) {
		c.JSON(400, gin.H{"error": "new password must be 8+ characters and contain a letter, digit, and special character"})
		return
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(x.NewPassword), 12)
	if err != nil {
		c.JSON(500, gin.H{"error": "failed to hash password"})
		return
	}
	if err := h.DB.Model(&u).Update("password_hash", string(hash)).Error; err != nil {
		c.JSON(500, gin.H{"error": "failed to update password"})
		return
	}
	h.AuditLog(u.ID, models.AuditPasswordChange, c, nil)
	c.JSON(200, gin.H{"message": "password updated successfully"})
}

// AuditLogs handles GET /audit-logs — returns last 50 records for the current user.
func (h Handler) AuditLogs(c *gin.Context) {
	var logs []models.AuditLog
	h.DB.Where("user_id = ?", uid(c)).
		Order("created_at DESC").
		Limit(50).
		Find(&logs)
	c.JSON(200, logs)
}

// ─── Category Handlers ────────────────────────────────────────────────────────

func (h Handler) categoryNameExists(userID uint64, name, categoryType string, excludeID uint64) (bool, error) {
	q := h.DB.Model(&models.Category{}).
		Where("user_id = ? AND type = ? AND LOWER(name) = ?", userID, categoryType, strings.ToLower(name))
	if excludeID > 0 {
		q = q.Where("id <> ?", excludeID)
	}
	var count int64
	if err := q.Count(&count).Error; err != nil {
		return false, err
	}
	return count > 0, nil
}

func (h Handler) Categories(c *gin.Context) {
	id := uid(c)
	if c.Request.Method == "GET" {
		var z []models.Category
		q := h.DB.Where("user_id = ?", id)
		if t := c.Query("type"); t != "" {
			q = q.Where("type = ?", t)
		}
		if err := q.Order("name").Find(&z).Error; err != nil {
			c.JSON(500, gin.H{"error": "failed to load categories"})
			return
		}
		// If user has no categories, auto-seed default categories so dropdowns are never empty
		if len(z) == 0 {
			var totalCount int64
			h.DB.Model(&models.Category{}).Where("user_id = ?", id).Count(&totalCount)
			if totalCount == 0 {
				defaults(h.DB, id)
				q2 := h.DB.Where("user_id = ?", id)
				if t := c.Query("type"); t != "" {
					q2 = q2.Where("type = ?", t)
				}
				_ = q2.Order("name").Find(&z).Error
			}
		}
		c.JSON(200, z)
		return
	}
	var x models.Category
	if c.ShouldBindJSON(&x) != nil || strings.TrimSpace(x.Name) == "" || (x.Type != "income" && x.Type != "expense") {
		c.JSON(400, gin.H{"error": "invalid category"})
		return
	}
	x.Name = strings.TrimSpace(x.Name)
	exists, err := h.categoryNameExists(id, x.Name, x.Type, 0)
	if err != nil {
		log.Printf("check category name failed: %v", err)
		c.JSON(500, gin.H{"error": "failed to validate category"})
		return
	}
	if exists {
		c.JSON(409, gin.H{"error": "category already exists"})
		return
	}
	x.UserID = id
	if x.Color == "" {
		x.Color = "#6366F1"
	}
	if x.Icon == "" {
		x.Icon = "circle"
	}
	if err := h.DB.Create(&x).Error; err != nil {
		log.Printf("create category failed: %v", err)
		c.JSON(500, gin.H{"error": "failed to create category"})
		return
	}
	c.JSON(201, x)
}

func (h Handler) Category(c *gin.Context) {
	var z models.Category
	if h.DB.Where("id = ? AND user_id = ?", c.Param("id"), uid(c)).First(&z).Error != nil {
		c.JSON(404, gin.H{"error": "category not found"})
		return
	}
	if c.Request.Method == "DELETE" {
		if e := h.DB.Delete(&z).Error; e != nil {
			c.JSON(409, gin.H{"error": "category is used by transactions"})
			return
		}
		c.Status(204)
		return
	}
	var x models.Category
	if c.ShouldBindJSON(&x) != nil || strings.TrimSpace(x.Name) == "" || (x.Type != "income" && x.Type != "expense") {
		c.JSON(400, gin.H{"error": "invalid category"})
		return
	}
	z.Name = strings.TrimSpace(x.Name)
	exists, err := h.categoryNameExists(z.UserID, z.Name, x.Type, z.ID)
	if err != nil {
		log.Printf("check category name failed: %v", err)
		c.JSON(500, gin.H{"error": "failed to validate category"})
		return
	}
	if exists {
		c.JSON(409, gin.H{"error": "category already exists"})
		return
	}
	z.Type = x.Type
	z.Color = x.Color
	if x.Icon != "" {
		z.Icon = x.Icon
	}
	if err := h.DB.Save(&z).Error; err != nil {
		log.Printf("update category failed: %v", err)
		c.JSON(500, gin.H{"error": "failed to update category"})
		return
	}
	c.JSON(200, z)
}

// ─── Transaction Handlers ─────────────────────────────────────────────────────

func (h Handler) Transactions(c *gin.Context) {
	id := uid(c)
	if c.Request.Method == "GET" {
		var z []models.Transaction
		q := h.DB.Model(&models.Transaction{}).
			Preload("Category").
			Where("transactions.user_id = ?", id)
		if t := c.Query("type"); t != "" {
			q = q.Joins("JOIN categories ON categories.id = transactions.category_id").
				Where("categories.type = ?", t)
		}
		if x := c.Query("categoryId"); x != "" {
			q = q.Where("category_id = ?", x)
		}
		if x := c.Query("from"); x != "" {
			q = q.Where("txn_date >= ?", x)
		}
		if x := c.Query("to"); x != "" {
			q = q.Where("txn_date <= ?", x)
		}
		if x := c.Query("q"); x != "" {
			q = q.Where("description LIKE ?", "%"+x+"%")
		}
		var total int64
		if err := q.Count(&total).Error; err != nil {
			log.Printf("count transactions failed: %v", err)
			c.JSON(500, gin.H{"error": "failed to count transactions"})
			return
		}
		page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
		limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
		if page < 1 {
			page = 1
		}
		if limit < 1 || limit > 100 {
			limit = 10
		}
		order := "txn_date DESC"
		if c.Query("sort") == "amount_asc" {
			order = "amount ASC"
		}
		if c.Query("sort") == "amount_desc" {
			order = "amount DESC"
		}
		if err := q.Order(order).Offset((page - 1) * limit).Limit(limit).Find(&z).Error; err != nil {
			log.Printf("query transactions failed: %v", err)
			c.JSON(500, gin.H{"error": "failed to query transactions"})
			return
		}
		out := []gin.H{}
		for _, v := range z {
			out = append(out, gin.H{
				"id":            v.ID,
				"categoryId":    v.CategoryID,
				"categoryName":  v.Category.Name,
				"categoryType":  v.Category.Type,
				"categoryColor": v.Category.Color,
				"categoryIcon":  v.Category.Icon,
				"amount":        v.Amount,
				"description":   v.Description,
				"merchant":      v.Merchant,
				"notes":         v.Notes,
				"tags":          v.Tags,
				"txnDate":       v.TxnDate.Format("2006-01-02"),
			})
		}
		c.JSON(200, gin.H{"data": out, "page": page, "limit": limit, "total": total})
		return
	}
	h.saveTxn(c, 0)
}

func (h Handler) saveTxn(c *gin.Context, existing uint64) {
	var x struct {
		CategoryID  uint64          `json:"categoryId"`
		Amount      decimal.Decimal `json:"amount"`
		Description string          `json:"description"`
		TxnDate     string          `json:"txnDate"`
		Merchant    string          `json:"merchant"`
		Notes       string          `json:"notes"`
		Tags        string          `json:"tags"`
	}
	if c.ShouldBindJSON(&x) != nil || x.Amount.LessThanOrEqual(decimal.Zero) {
		c.JSON(400, gin.H{"error": "amount must be greater than zero"})
		return
	}
	d, e := time.Parse("2006-01-02", x.TxnDate)
	if e != nil {
		c.JSON(400, gin.H{"error": "invalid date"})
		return
	}
	id := uid(c)
	var cat models.Category
	if h.DB.Where("id = ? AND user_id = ?", x.CategoryID, id).First(&cat).Error != nil {
		c.JSON(404, gin.H{"error": "category not found"})
		return
	}
	z := models.Transaction{
		ID:          existing,
		UserID:      id,
		CategoryID:  x.CategoryID,
		Amount:      x.Amount,
		Description: x.Description,
		Merchant:    x.Merchant,
		Notes:       x.Notes,
		Tags:        x.Tags,
		TxnDate:     d,
	}
	if existing > 0 {
		if h.DB.Where("id = ? AND user_id = ?", existing, id).First(&models.Transaction{}).Error != nil {
			c.JSON(404, gin.H{"error": "transaction not found"})
			return
		}
		if err := h.DB.Model(&models.Transaction{}).Where("id = ? AND user_id = ?", existing, id).
			Updates(map[string]interface{}{
				"category_id": x.CategoryID,
				"amount":      x.Amount,
				"description": x.Description,
				"merchant":    x.Merchant,
				"notes":       x.Notes,
				"tags":        x.Tags,
				"txn_date":    d,
			}).Error; err != nil {
			c.JSON(500, gin.H{"error": "failed to update transaction"})
			return
		}
		c.JSON(200, z)
		return
	}
	if err := h.DB.Create(&z).Error; err != nil {
		c.JSON(500, gin.H{"error": "failed to create transaction"})
		return
	}
	c.JSON(201, z)
}

func (h Handler) Transaction(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	if c.Request.Method == "PUT" {
		h.saveTxn(c, id)
		return
	}
	var z models.Transaction
	if h.DB.Where("id = ? AND user_id = ?", id, uid(c)).First(&z).Error != nil {
		c.JSON(404, gin.H{"error": "transaction not found"})
		return
	}
	if err := h.DB.Delete(&z).Error; err != nil {
		c.JSON(500, gin.H{"error": "failed to delete transaction"})
		return
	}
	c.Status(204)
}

// ─── Budget Handlers ──────────────────────────────────────────────────────────

func (h Handler) Budgets(c *gin.Context) {
	id := uid(c)
	if c.Request.Method == "GET" {
		var z []models.Budget
		q := h.DB.Preload("Category").Where("user_id = ?", id)
		if m := c.Query("month"); m != "" {
			q = q.Where("month = ?", m)
		}
		if y := c.Query("year"); y != "" {
			q = q.Where("year = ?", y)
		}
		q.Find(&z)
		c.JSON(200, z)
		return
	}
	var x models.Budget
	if c.ShouldBindJSON(&x) != nil || x.Month < 1 || x.Month > 12 || x.AmountLimit.LessThanOrEqual(decimal.Zero) {
		c.JSON(400, gin.H{"error": "invalid budget"})
		return
	}
	var cat models.Category
	if h.DB.Where("id=? AND user_id=? AND type='expense'", x.CategoryID, id).First(&cat).Error != nil {
		c.JSON(400, gin.H{"error": "budget category must be an expense category"})
		return
	}
	x.UserID = id
	if e := h.DB.Create(&x).Error; e != nil {
		c.JSON(409, gin.H{"error": "budget already exists"})
		return
	}
	c.JSON(201, x)
}

func (h Handler) Budget(c *gin.Context) {
	var z models.Budget
	if h.DB.Where("id=? AND user_id=?", c.Param("id"), uid(c)).First(&z).Error != nil {
		c.JSON(404, gin.H{"error": "budget not found"})
		return
	}
	if c.Request.Method == "DELETE" {
		h.DB.Delete(&z)
		c.Status(204)
		return
	}
	var x models.Budget
	if c.ShouldBindJSON(&x) != nil || x.AmountLimit.LessThanOrEqual(decimal.Zero) {
		c.JSON(400, gin.H{"error": "invalid budget"})
		return
	}
	z.AmountLimit = x.AmountLimit
	h.DB.Save(&z)
	c.JSON(200, z)
}

// ─── Report Handlers ──────────────────────────────────────────────────────────

func (h Handler) Summary(c *gin.Context) {
	id := uid(c)
	m, y := time.Now().Month(), time.Now().Year()
	if v, _ := strconv.Atoi(c.Query("month")); v > 0 {
		m = time.Month(v)
	}
	if v, _ := strconv.Atoi(c.Query("year")); v > 0 {
		y = v
	}
	var rows []struct {
		Type  string
		Total decimal.Decimal
	}
	h.DB.Table("transactions t").
		Select("c.type, COALESCE(SUM(t.amount),0) total").
		Joins("JOIN categories c ON c.id=t.category_id").
		Where("t.user_id=? AND MONTH(t.txn_date)=? AND YEAR(t.txn_date)=?", id, m, y).
		Group("c.type").Scan(&rows)
	in, ex := decimal.Zero, decimal.Zero
	for _, r := range rows {
		if r.Type == "income" {
			in = r.Total
		} else {
			ex = r.Total
		}
	}
	c.JSON(200, gin.H{
		"month":        m,
		"year":         y,
		"totalIncome":  in,
		"totalExpense": ex,
		"balance":      in.Sub(ex),
		"savingsRate":  service.SavingsRate(in, ex),
	})
}

func (h Handler) Breakdown(c *gin.Context) {
	id := uid(c)
	typ := c.DefaultQuery("type", "expense")
	from := c.Query("from")
	to := c.Query("to")
	type R struct {
		CategoryID uint64
		Name       string
		Color      string
		Total      decimal.Decimal
	}
	var rs []R
	q := h.DB.Table("transactions t").
		Select("c.id category_id,c.name,c.color,SUM(t.amount) total").
		Joins("JOIN categories c ON c.id=t.category_id").
		Where("t.user_id=? AND c.type=?", id, typ)
	if from != "" {
		q = q.Where("t.txn_date>=?", from)
	}
	if to != "" {
		q = q.Where("t.txn_date<=?", to)
	}
	q.Group("c.id,c.name,c.color").Scan(&rs)
	sum := decimal.Zero
	for _, r := range rs {
		sum = sum.Add(r.Total)
	}
	out := []gin.H{}
	for _, r := range rs {
		p := decimal.Zero
		if !sum.IsZero() {
			p = r.Total.Div(sum).Mul(decimal.NewFromInt(100)).Round(2)
		}
		out = append(out, gin.H{
			"categoryId": r.CategoryID,
			"name":       r.Name,
			"color":      r.Color,
			"total":      r.Total,
			"percent":    p,
		})
	}
	c.JSON(200, out)
}

func (h Handler) BudgetActual(c *gin.Context) {
	id := uid(c)
	m, y := time.Now().Month(), time.Now().Year()
	if v, _ := strconv.Atoi(c.Query("month")); v > 0 {
		m = time.Month(v)
	}
	if v, _ := strconv.Atoi(c.Query("year")); v > 0 {
		y = v
	}
	var bs []models.Budget
	h.DB.Preload("Category").Where("user_id=? AND month=? AND year=?", id, m, y).Find(&bs)
	o := []gin.H{}
	for _, b := range bs {
		var spent decimal.Decimal
		h.DB.Table("transactions").
			Select("COALESCE(SUM(amount),0)").
			Where("user_id=? AND category_id=? AND MONTH(txn_date)=? AND YEAR(txn_date)=?", id, b.CategoryID, m, y).
			Scan(&spent)
		p := spent.Div(b.AmountLimit).Mul(decimal.NewFromInt(100)).Round(2)
		o = append(o, gin.H{
			"budgetId":           b.ID,
			"categoryId":         b.CategoryID,
			"categoryName":       b.Category.Name,
			"color":              b.Category.Color,
			"limit":              b.AmountLimit,
			"spent":              spent,
			"remaining":          b.AmountLimit.Sub(spent),
			"utilisationPercent": p,
			"status":             service.BudgetStatus(spent, b.AmountLimit),
		})
	}
	c.JSON(200, o)
}

func (h Handler) Trend(c *gin.Context) {
	months, _ := strconv.Atoi(c.DefaultQuery("months", "6"))
	if months < 1 || months > 24 {
		months = 6
	}
	o := []gin.H{}
	now := time.Now()
	for i := months - 1; i >= 0; i-- {
		d := time.Date(now.Year(), now.Month()-time.Month(i), 1, 0, 0, 0, 0, time.Local)
		var rs []struct {
			Type  string
			Total decimal.Decimal
		}
		h.DB.Table("transactions t").
			Select("c.type,COALESCE(SUM(t.amount),0) total").
			Joins("JOIN categories c ON c.id=t.category_id").
			Where("t.user_id=? AND MONTH(t.txn_date)=? AND YEAR(t.txn_date)=?", uid(c), d.Month(), d.Year()).
			Group("c.type").Scan(&rs)
		in, ex := decimal.Zero, decimal.Zero
		for _, r := range rs {
			if r.Type == "income" {
				in = r.Total
			} else {
				ex = r.Total
			}
		}
		o = append(o, gin.H{
			"year":    d.Year(),
			"month":   d.Month(),
			"label":   d.Format("Jan 2006"),
			"income":  in,
			"expense": ex,
			"balance": in.Sub(ex),
		})
	}
	c.JSON(200, o)
}

// Export is the legacy CSV export — the upgraded multi-format version lives in excel.go.
// This kept for backward compatibility; routes.go now points /transactions/export to ExportTransactions.
func (h Handler) Export(c *gin.Context) {
	var ts []models.Transaction
	h.DB.Preload("Category").Where("transactions.user_id=?", uid(c)).Order("txn_date DESC").Find(&ts)
	c.Header("Content-Disposition", "attachment; filename=transactions.csv")
	c.Header("Content-Type", "text/csv")
	w := csv.NewWriter(c.Writer)
	_ = w.Write([]string{"Date", "Type", "Category", "Description", "Amount"})
	for _, t := range ts {
		_ = w.Write([]string{
			t.TxnDate.Format("2006-01-02"),
			t.Category.Type,
			t.Category.Name,
			t.Description,
			t.Amount.StringFixed(2),
		})
	}
	w.Flush()
}

var _ = fmt.Sprintf
