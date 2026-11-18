package handlers

import (
	"strconv"

	"finance-portal/backend/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/shopspring/decimal"
)

// ListGoals handles GET /goals
func (h Handler) ListGoals(c *gin.Context) {
	var goals []models.SavingsGoal
	h.DB.Where("user_id = ?", uid(c)).
		Order("created_at DESC").
		Find(&goals)

	out := []gin.H{}
	for _, g := range goals {
		pct := decimal.Zero
		if !g.TargetAmount.IsZero() {
			pct = g.CurrentAmount.Div(g.TargetAmount).Mul(decimal.NewFromInt(100)).Round(2)
		}
		out = append(out, gin.H{
			"id":            g.ID,
			"title":         g.Title,
			"targetAmount":  g.TargetAmount,
			"currentAmount": g.CurrentAmount,
			"deadline":      g.Deadline,
			"icon":          g.Icon,
			"color":         g.Color,
			"status":        g.Status,
			"completionPct": pct,
			"createdAt":     g.CreatedAt,
			"updatedAt":     g.UpdatedAt,
		})
	}
	c.JSON(200, out)
}

// CreateGoal handles POST /goals
func (h Handler) CreateGoal(c *gin.Context) {
	var x struct {
		Title         string          `json:"title"`
		TargetAmount  decimal.Decimal `json:"targetAmount"`
		CurrentAmount decimal.Decimal `json:"currentAmount"`
		Deadline      string          `json:"deadline"`
		Icon          string          `json:"icon"`
		Color         string          `json:"color"`
	}
	if c.ShouldBindJSON(&x) != nil || x.Title == "" || x.TargetAmount.LessThanOrEqual(decimal.Zero) {
		c.JSON(400, gin.H{"error": "title and a positive target amount are required"})
		return
	}
	if x.Icon == "" {
		x.Icon = "target"
	}
	if x.Color == "" {
		x.Color = "#6366F1"
	}
	if x.CurrentAmount.IsNegative() {
		x.CurrentAmount = decimal.Zero
	}

	status := "active"
	if !x.TargetAmount.IsZero() && x.CurrentAmount.GreaterThanOrEqual(x.TargetAmount) {
		status = "completed"
	}

	goal := models.SavingsGoal{
		UserID:        uid(c),
		Title:         x.Title,
		TargetAmount:  x.TargetAmount,
		CurrentAmount: x.CurrentAmount,
		Deadline:      x.Deadline,
		Icon:          x.Icon,
		Color:         x.Color,
		Status:        status,
	}

	if err := h.DB.Create(&goal).Error; err != nil {
		c.JSON(500, gin.H{"error": "failed to create savings goal"})
		return
	}

	h.AuditLog(goal.UserID, models.AuditGoalCreated, c, nil)
	c.JSON(201, goal)
}

// UpdateGoal handles PUT /goals/:id
func (h Handler) UpdateGoal(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	var goal models.SavingsGoal
	if h.DB.Where("id = ? AND user_id = ?", id, uid(c)).First(&goal).Error != nil {
		c.JSON(404, gin.H{"error": "savings goal not found"})
		return
	}

	var x struct {
		Title         string           `json:"title"`
		TargetAmount  *decimal.Decimal `json:"targetAmount"`
		CurrentAmount *decimal.Decimal `json:"currentAmount"`
		Deadline      string           `json:"deadline"`
		Icon          string           `json:"icon"`
		Color         string           `json:"color"`
		Status        string           `json:"status"`
	}
	if c.ShouldBindJSON(&x) != nil {
		c.JSON(400, gin.H{"error": "invalid request body"})
		return
	}

	if x.Title != "" {
		goal.Title = x.Title
	}
	if x.TargetAmount != nil && x.TargetAmount.GreaterThan(decimal.Zero) {
		goal.TargetAmount = *x.TargetAmount
	}
	if x.CurrentAmount != nil && !x.CurrentAmount.IsNegative() {
		goal.CurrentAmount = *x.CurrentAmount
	}
	if x.Deadline != "" {
		goal.Deadline = x.Deadline
	}
	if x.Icon != "" {
		goal.Icon = x.Icon
	}
	if x.Color != "" {
		goal.Color = x.Color
	}
	if x.Status != "" {
		goal.Status = x.Status
	}

	// Auto complete if target reached
	if goal.CurrentAmount.GreaterThanOrEqual(goal.TargetAmount) && goal.Status == "active" {
		goal.Status = "completed"
	}

	if err := h.DB.Save(&goal).Error; err != nil {
		c.JSON(500, gin.H{"error": "failed to update goal"})
		return
	}
	c.JSON(200, goal)
}

// DeleteGoal handles DELETE /goals/:id
func (h Handler) DeleteGoal(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	var goal models.SavingsGoal
	if h.DB.Where("id = ? AND user_id = ?", id, uid(c)).First(&goal).Error != nil {
		c.JSON(404, gin.H{"error": "savings goal not found"})
		return
	}
	h.DB.Delete(&goal)
	c.Status(204)
}

// ContributeGoal handles POST /goals/:id/contribute
func (h Handler) ContributeGoal(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	var goal models.SavingsGoal
	if h.DB.Where("id = ? AND user_id = ?", id, uid(c)).First(&goal).Error != nil {
		c.JSON(404, gin.H{"error": "savings goal not found"})
		return
	}

	var x struct {
		Amount decimal.Decimal `json:"amount"`
	}
	if c.ShouldBindJSON(&x) != nil || x.Amount.LessThanOrEqual(decimal.Zero) {
		c.JSON(400, gin.H{"error": "a positive contribution amount is required"})
		return
	}

	goal.CurrentAmount = goal.CurrentAmount.Add(x.Amount)
	if goal.CurrentAmount.GreaterThanOrEqual(goal.TargetAmount) {
		goal.Status = "completed"
	}

	if err := h.DB.Save(&goal).Error; err != nil {
		c.JSON(500, gin.H{"error": "failed to record contribution"})
		return
	}

	pct := decimal.Zero
	if !goal.TargetAmount.IsZero() {
		pct = goal.CurrentAmount.Div(goal.TargetAmount).Mul(decimal.NewFromInt(100)).Round(2)
	}

	c.JSON(200, gin.H{
		"goal":          goal,
		"completionPct": pct,
		"message":       "contribution recorded successfully",
	})
}
