package service

import "github.com/shopspring/decimal"
func SavingsRate(income, expense decimal.Decimal) decimal.Decimal { if income.IsZero(){return decimal.Zero}; return income.Sub(expense).Div(income).Mul(decimal.NewFromInt(100)).Round(2) }
func BudgetStatus(spent, limit decimal.Decimal) string { p:=spent.Div(limit).Mul(decimal.NewFromInt(100));if p.GreaterThanOrEqual(decimal.NewFromInt(100)){return "exceeded"};if p.GreaterThanOrEqual(decimal.NewFromInt(75)){return "warning"};return "on_track" }
