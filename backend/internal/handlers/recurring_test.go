package handlers

import (
	"testing"
	"time"

	"finance-portal/backend/internal/models"
)

func TestRecurringAlreadyPostedBlocksUntilNextRunDate(t *testing.T) {
	nextRunDate := time.Date(2026, time.December, 18, 0, 0, 0, 0, time.UTC)
	lastRunAt := nextRunDate.AddDate(0, 0, -1)
	schedule := models.RecurringTransaction{
		NextRunDate: nextRunDate,
		LastRunAt:   &lastRunAt,
	}

	if !recurringAlreadyPosted(schedule, nextRunDate.Add(-time.Hour)) {
		t.Fatal("expected schedule to be blocked before its next run date")
	}
	if recurringAlreadyPosted(schedule, nextRunDate) {
		t.Fatal("expected schedule to be available on its next run date")
	}
}

func TestNextRecurringDateAdvancesPastNow(t *testing.T) {
	now := time.Date(2026, time.November, 18, 12, 0, 0, 0, time.UTC)
	tests := []struct {
		name     string
		date     time.Time
		expected time.Time
	}{
		{
			name:     "future schedule advances one interval",
			date:     time.Date(2026, time.November, 30, 0, 0, 0, 0, time.UTC),
			expected: time.Date(2026, time.December, 30, 0, 0, 0, 0, time.UTC),
		},
		{
			name:     "overdue schedule advances to a future occurrence",
			date:     time.Date(2026, time.August, 18, 0, 0, 0, 0, time.UTC),
			expected: time.Date(2026, time.December, 18, 0, 0, 0, 0, time.UTC),
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			got := nextRecurringDate(test.date, "monthly", now)
			if !got.Equal(test.expected) {
				t.Fatalf("nextRecurringDate() = %s, want %s", got, test.expected)
			}
		})
	}
}
