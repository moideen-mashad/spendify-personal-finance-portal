package routes

import (
	"net/http"

	"finance-portal/backend/internal/handlers"
	"finance-portal/backend/internal/middleware"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func Register(r *gin.Engine, h handlers.Handler, origin string) {
	r.Use(middleware.Security(), cors.New(cors.Config{
		AllowOrigins:     []string{origin},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Authorization", "Content-Type"},
		AllowCredentials: true,
	}))

	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	api := r.Group("/api/v1")

	// Public Auth endpoints
	auth := api.Group("/auth")
	{
		auth.POST("/register", h.Register)
		auth.POST("/login", h.Login)
		auth.POST("/refresh", h.Refresh)
		auth.POST("/logout", h.Logout)
	}

	// Protected Endpoints
	p := api.Group("", middleware.Auth(h.Access))
	{
		// Profile & Security
		p.GET("/users/me", h.Me)
		p.PUT("/users/me", h.Me)
		p.POST("/users/me/password", h.ChangePassword)
		p.GET("/audit-logs", h.AuditLogs)

		// Categories
		p.GET("/categories", h.Categories)
		p.POST("/categories", h.Categories)
		p.PUT("/categories/:id", h.Category)
		p.DELETE("/categories/:id", h.Category)

		// Transactions & Data Portability
		p.GET("/transactions", h.Transactions)
		p.POST("/transactions", h.Transactions)
		p.PUT("/transactions/:id", h.Transaction)
		p.DELETE("/transactions/:id", h.Transaction)
		p.GET("/transactions/template", h.DownloadTemplate)
		p.POST("/transactions/import", h.ImportTransactions)
		p.GET("/transactions/export", h.ExportTransactions)

		// Accounts & Wallets
		p.GET("/accounts", h.ListAccounts)
		p.POST("/accounts", h.CreateAccount)
		p.PUT("/accounts/:id", h.UpdateAccount)
		p.DELETE("/accounts/:id", h.ArchiveAccount)

		// Recurring Bills & Reminders
		p.GET("/recurring", h.ListRecurring)
		p.POST("/recurring", h.CreateRecurring)
		p.PUT("/recurring/:id", h.UpdateRecurring)
		p.DELETE("/recurring/:id", h.DeleteRecurring)
		p.POST("/recurring/:id/run", h.RunRecurring)

		// Savings Goals & Targets
		p.GET("/goals", h.ListGoals)
		p.POST("/goals", h.CreateGoal)
		p.PUT("/goals/:id", h.UpdateGoal)
		p.DELETE("/goals/:id", h.DeleteGoal)
		p.POST("/goals/:id/contribute", h.ContributeGoal)

		// Budgets
		p.GET("/budgets", h.Budgets)
		p.POST("/budgets", h.Budgets)
		p.PUT("/budgets/:id", h.Budget)
		p.DELETE("/budgets/:id", h.Budget)

		// Reports & Analytics
		p.GET("/reports/summary", h.Summary)
		p.GET("/reports/category-breakdown", h.Breakdown)
		p.GET("/reports/monthly-trend", h.Trend)
		p.GET("/reports/budget-vs-actual", h.BudgetActual)
	}
}
