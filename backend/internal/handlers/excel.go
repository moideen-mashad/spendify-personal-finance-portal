package handlers

import (
	"encoding/csv"
	"fmt"
	"io"
	"path/filepath"
	"strings"
	"time"

	"finance-portal/backend/internal/models"
	"finance-portal/backend/internal/service"

	"github.com/gin-gonic/gin"
	"github.com/shopspring/decimal"
	"github.com/xuri/excelize/v2"
	"gorm.io/gorm"
)

// DownloadTemplate handles GET /transactions/template
// Generates and streams finance_import_template.xlsx with headers and sample rows.
func (h Handler) DownloadTemplate(c *gin.Context) {
	f := excelize.NewFile()
	sheetName := "Transactions"
	f.SetSheetName("Sheet1", sheetName)

	// Define styled header
	headerStyle, _ := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{Bold: true, Color: "#FFFFFF", Size: 11},
		Fill: excelize.Fill{Type: "pattern", Color: []string{"#1F4E79"}, Pattern: 1},
		Alignment: &excelize.Alignment{
			Horizontal: "center",
			Vertical:   "center",
		},
		Border: []excelize.Border{
			{Type: "bottom", Color: "#0D233A", Style: 2},
		},
	})

	headers := []string{"Date (YYYY-MM-DD)", "Type (income/expense)", "Category", "Amount", "Merchant", "Description", "Notes", "Tags"}
	for i, hdr := range headers {
		cell, _ := excelize.CoordinatesToCellName(i+1, 1)
		f.SetCellValue(sheetName, cell, hdr)
		f.SetCellStyle(sheetName, cell, cell, headerStyle)
	}

	// Sample rows
	samples := [][]interface{}{
		{"2026-11-01", "expense", "Food & Dining", 450.00, "Starbucks", "Morning coffee & breakfast", "Client meet", "coffee,client"},
		{"2026-11-05", "income", "Salary", 85000.00, "ACME Tech Corp", "Monthly tech payroll", "Direct deposit", "salary,monthly"},
		{"2026-11-10", "expense", "Shopping", 1299.00, "Amazon", "Ergonomic keyboard", "Home office", "office,gadgets"},
	}

	dataStyle, _ := f.NewStyle(&excelize.Style{
		Alignment: &excelize.Alignment{Vertical: "center"},
	})

	for rIdx, row := range samples {
		for cIdx, val := range row {
			cell, _ := excelize.CoordinatesToCellName(cIdx+1, rIdx+2)
			f.SetCellValue(sheetName, cell, val)
			f.SetCellStyle(sheetName, cell, cell, dataStyle)
		}
	}

	// Set column widths
	colWidths := map[string]float64{
		"A": 18, "B": 22, "C": 20, "D": 14, "E": 20, "F": 30, "G": 20, "H": 18,
	}
	for col, width := range colWidths {
		_ = f.SetColWidth(sheetName, col, col, width)
	}

	// Freeze first row
	_ = f.SetPanes(sheetName, &excelize.Panes{
		Freeze:      true,
		Split:       false,
		XSplit:      0,
		YSplit:      1,
		TopLeftCell: "A2",
		ActivePane:  "bottomLeft",
	})

	c.Header("Content-Disposition", "attachment; filename=finance_import_template.xlsx")
	c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	_ = f.Write(c.Writer)
}

// RowError represents a row-level import failure
type RowError struct {
	Row     int    `json:"row"`
	Message string `json:"message"`
}

// ImportTransactions handles POST /transactions/import
// Accepts multipart/form-data with file (.xlsx or .csv)
func (h Handler) ImportTransactions(c *gin.Context) {
	fileHeader, err := c.FormFile("file")
	if err != nil {
		c.JSON(400, gin.H{"error": "no file uploaded or invalid form data"})
		return
	}

	srcFile, err := fileHeader.Open()
	if err != nil {
		c.JSON(500, gin.H{"error": "failed to open uploaded file"})
		return
	}
	defer srcFile.Close()

	ext := strings.ToLower(filepath.Ext(fileHeader.Filename))
	var rows [][]string

	if ext == ".xlsx" {
		xlFile, err := excelize.OpenReader(srcFile)
		if err != nil {
			c.JSON(400, gin.H{"error": "failed to parse Excel file: " + err.Error()})
			return
		}
		sheets := xlFile.GetSheetList()
		if len(sheets) == 0 {
			c.JSON(400, gin.H{"error": "Excel workbook has no sheets"})
			return
		}
		sheetRows, err := xlFile.GetRows(sheets[0])
		if err != nil {
			c.JSON(400, gin.H{"error": "failed to read sheet rows: " + err.Error()})
			return
		}
		rows = sheetRows
	} else if ext == ".csv" {
		reader := csv.NewReader(srcFile)
		for {
			record, err := reader.Read()
			if err == io.EOF {
				break
			}
			if err != nil {
				c.JSON(400, gin.H{"error": "CSV parse error: " + err.Error()})
				return
			}
			rows = append(rows, record)
		}
	} else {
		c.JSON(400, gin.H{"error": "unsupported file format. Please upload .xlsx or .csv"})
		return
	}

	if len(rows) <= 1 {
		c.JSON(400, gin.H{"error": "file has no data rows (only header or empty)"})
		return
	}

	userId := uid(c)

	// Fetch existing categories for mapping
	var userCats []models.Category
	h.DB.Where("user_id = ?", userId).Find(&userCats)
	catMap := make(map[string]models.Category)
	for _, cat := range userCats {
		catMap[strings.ToLower(strings.TrimSpace(cat.Name))] = cat
	}

	var rowErrors []RowError
	var txnsToInsert []models.Transaction

	// Process data rows (skip header row 0)
	for idx, row := range rows[1:] {
		rowNum := idx + 2
		if len(row) < 4 {
			rowErrors = append(rowErrors, RowError{Row: rowNum, Message: "row does not have enough columns (Date, Type, Category, Amount are required)"})
			continue
		}

		rawDate := strings.TrimSpace(row[0])
		rawType := strings.ToLower(strings.TrimSpace(row[1]))
		rawCat := strings.TrimSpace(row[2])
		rawAmount := strings.TrimSpace(row[3])

		if rawDate == "" || rawType == "" || rawCat == "" || rawAmount == "" {
			rowErrors = append(rowErrors, RowError{Row: rowNum, Message: "required fields cannot be blank"})
			continue
		}

		// Normalize type
		if rawType != "income" && rawType != "expense" {
			rowErrors = append(rowErrors, RowError{Row: rowNum, Message: fmt.Sprintf("invalid transaction type '%s' (must be income or expense)", rawType)})
			continue
		}

		// Parse date
		var txnDate time.Time
		dateFormats := []string{"2006-01-02", "02-01-2006", "02/01/2006", "2006/01/02", "01/02/2006"}
		var parseErr error
		for _, layout := range dateFormats {
			txnDate, parseErr = time.Parse(layout, rawDate)
			if parseErr == nil {
				break
			}
		}
		if parseErr != nil {
			rowErrors = append(rowErrors, RowError{Row: rowNum, Message: fmt.Sprintf("invalid date '%s', expected YYYY-MM-DD", rawDate)})
			continue
		}

		// Parse amount
		amount, err := decimal.NewFromString(strings.ReplaceAll(rawAmount, ",", ""))
		if err != nil || amount.LessThanOrEqual(decimal.Zero) {
			rowErrors = append(rowErrors, RowError{Row: rowNum, Message: fmt.Sprintf("invalid amount '%s', must be a positive number", rawAmount)})
			continue
		}

		// Resolve category
		targetCat, exists := catMap[strings.ToLower(rawCat)]
		if !exists {
			// Auto create category
			color := "#6366F1"
			if rawType == "income" {
				color = "#10B981"
			} else {
				color = "#EF4444"
			}
			newCat := models.Category{
				UserID: userId,
				Name:   rawCat,
				Type:   rawType,
				Color:  color,
				Icon:   "circle",
			}
			if err := h.DB.Create(&newCat).Error; err == nil {
				catMap[strings.ToLower(rawCat)] = newCat
				targetCat = newCat
			} else {
				rowErrors = append(rowErrors, RowError{Row: rowNum, Message: fmt.Sprintf("unable to resolve category '%s'", rawCat)})
				continue
			}
		}

		merchant := ""
		description := ""
		notes := ""
		tags := ""

		if len(row) > 4 {
			merchant = strings.TrimSpace(row[4])
		}
		if len(row) > 5 {
			description = strings.TrimSpace(row[5])
		}
		if description == "" {
			description = merchant
		}
		if description == "" {
			description = rawCat + " transaction"
		}
		if len(row) > 6 {
			notes = strings.TrimSpace(row[6])
		}
		if len(row) > 7 {
			tags = strings.TrimSpace(row[7])
		}

		txnsToInsert = append(txnsToInsert, models.Transaction{
			UserID:      userId,
			CategoryID:  targetCat.ID,
			Amount:      amount,
			Description: description,
			Merchant:    merchant,
			Notes:       notes,
			Tags:        tags,
			TxnDate:     txnDate,
		})
	}

	totalRows := len(rows) - 1
	importedCount := len(txnsToInsert)
	failedCount := len(rowErrors)

	// Save log and transactions inside atomic DB transaction
	err = h.DB.Transaction(func(tx *gorm.DB) error {
		importLog := models.ImportLog{
			UserID:       userId,
			FileName:     fileHeader.Filename,
			TotalRows:    totalRows,
			ImportedRows: importedCount,
			FailedRows:   failedCount,
			Status:       "done",
		}
		if failedCount > 0 && importedCount == 0 {
			importLog.Status = "failed"
		}
		if err := tx.Create(&importLog).Error; err != nil {
			return err
		}

		for i := range txnsToInsert {
			txnsToInsert[i].ImportBatchID = &importLog.ID
		}

		if len(txnsToInsert) > 0 {
			if err := tx.Create(&txnsToInsert).Error; err != nil {
				return err
			}
		}
		return nil
	})

	if err != nil {
		c.JSON(500, gin.H{"error": "database transaction failed during import: " + err.Error()})
		return
	}

	h.AuditLog(userId, models.AuditExcelImport, c, fmt.Sprintf("Imported %d rows from %s", importedCount, fileHeader.Filename))

	c.JSON(200, gin.H{
		"message":      fmt.Sprintf("Import finished: %d imported, %d failed", importedCount, failedCount),
		"totalRows":    totalRows,
		"importedRows": importedCount,
		"failedRows":   failedCount,
		"errors":       rowErrors,
	})
}

// ExportTransactions handles GET /transactions/export?format=xlsx|csv
// Provides formatted multi-sheet Excel or plain CSV export.
func (h Handler) ExportTransactions(c *gin.Context) {
	userId := uid(c)
	formatParam := strings.ToLower(c.DefaultQuery("format", "xlsx"))

	var ts []models.Transaction
	h.DB.Preload("Category").Where("transactions.user_id = ?", userId).
		Order("txn_date DESC").Find(&ts)

	if formatParam == "csv" {
		c.Header("Content-Disposition", "attachment; filename=transactions.csv")
		c.Header("Content-Type", "text/csv")
		w := csv.NewWriter(c.Writer)
		_ = w.Write([]string{"Date", "Type", "Category", "Amount", "Merchant", "Description", "Notes", "Tags"})
		for _, t := range ts {
			_ = w.Write([]string{
				t.TxnDate.Format("2006-01-02"),
				t.Category.Type,
				t.Category.Name,
				t.Amount.StringFixed(2),
				t.Merchant,
				t.Description,
				t.Notes,
				t.Tags,
			})
		}
		w.Flush()
		h.AuditLog(userId, models.AuditExport, c, "CSV export")
		return
	}

	// Excel export with two sheets: Transactions and Financial Summary
	f := excelize.NewFile()
	txnSheet := "Transactions"
	f.SetSheetName("Sheet1", txnSheet)

	// Styles
	headerStyle, _ := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{Bold: true, Color: "#FFFFFF", Size: 11},
		Fill: excelize.Fill{Type: "pattern", Color: []string{"#303C4A"}, Pattern: 1},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center"},
	})
	incomeStyle, _ := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{Color: "#087955", Bold: true},
	})
	expenseStyle, _ := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{Color: "#BD354F", Bold: true},
	})

	headers := []string{"ID", "Date", "Type", "Category", "Amount", "Merchant", "Description", "Notes", "Tags"}
	for i, hdr := range headers {
		cell, _ := excelize.CoordinatesToCellName(i+1, 1)
		f.SetCellValue(txnSheet, cell, hdr)
		f.SetCellStyle(txnSheet, cell, cell, headerStyle)
	}

	totalIncome := decimal.Zero
	totalExpense := decimal.Zero

	for idx, t := range ts {
		row := idx + 2
		f.SetCellValue(txnSheet, fmt.Sprintf("A%d", row), t.ID)
		f.SetCellValue(txnSheet, fmt.Sprintf("B%d", row), t.TxnDate.Format("2006-01-02"))
		f.SetCellValue(txnSheet, fmt.Sprintf("C%d", row), t.Category.Type)
		f.SetCellValue(txnSheet, fmt.Sprintf("D%d", row), t.Category.Name)
		f.SetCellValue(txnSheet, fmt.Sprintf("E%d", row), t.Amount.InexactFloat64())
		f.SetCellValue(txnSheet, fmt.Sprintf("F%d", row), t.Merchant)
		f.SetCellValue(txnSheet, fmt.Sprintf("G%d", row), t.Description)
		f.SetCellValue(txnSheet, fmt.Sprintf("H%d", row), t.Notes)
		f.SetCellValue(txnSheet, fmt.Sprintf("I%d", row), t.Tags)

		if t.Category.Type == "income" {
			totalIncome = totalIncome.Add(t.Amount)
			f.SetCellStyle(txnSheet, fmt.Sprintf("C%d", row), fmt.Sprintf("C%d", row), incomeStyle)
		} else {
			totalExpense = totalExpense.Add(t.Amount)
			f.SetCellStyle(txnSheet, fmt.Sprintf("C%d", row), fmt.Sprintf("C%d", row), expenseStyle)
		}
	}

	// Auto fit widths
	colWidths := map[string]float64{
		"A": 8, "B": 14, "C": 12, "D": 20, "E": 14, "F": 22, "G": 30, "H": 20, "I": 18,
	}
	for col, width := range colWidths {
		_ = f.SetColWidth(txnSheet, col, col, width)
	}

	_ = f.SetPanes(txnSheet, &excelize.Panes{
		Freeze:      true,
		Split:       false,
		XSplit:      0,
		YSplit:      1,
		TopLeftCell: "A2",
		ActivePane:  "bottomLeft",
	})

	// Sheet 2: Financial Summary
	summarySheet := "Summary"
	f.NewSheet(summarySheet)

	f.SetCellValue(summarySheet, "A1", "Financial KPI Summary")
	titleStyle, _ := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{Bold: true, Size: 14, Color: "#1F4E79"},
	})
	f.SetCellStyle(summarySheet, "A1", "A1", titleStyle)

	f.SetCellValue(summarySheet, "A3", "Metric")
	f.SetCellValue(summarySheet, "B3", "Value")
	f.SetCellStyle(summarySheet, "A3", "B3", headerStyle)

	balance := totalIncome.Sub(totalExpense)
	savingsRate := service.SavingsRate(totalIncome, totalExpense)

	metrics := [][]interface{}{
		{"Total Inflows (Income)", totalIncome.InexactFloat64()},
		{"Total Outflows (Expense)", totalExpense.InexactFloat64()},
		{"Net Balance", balance.InexactFloat64()},
		{"Savings Rate (%)", savingsRate.InexactFloat64()},
		{"Total Transactions Recorded", len(ts)},
		{"Report Generated At", time.Now().Format("2006-01-02 15:04:05")},
	}

	for idx, m := range metrics {
		row := idx + 4
		f.SetCellValue(summarySheet, fmt.Sprintf("A%d", row), m[0])
		f.SetCellValue(summarySheet, fmt.Sprintf("B%d", row), m[1])
	}
	_ = f.SetColWidth(summarySheet, "A", "A", 30)
	_ = f.SetColWidth(summarySheet, "B", "B", 25)

	c.Header("Content-Disposition", "attachment; filename=personal_finance_statement.xlsx")
	c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	_ = f.Write(c.Writer)

	h.AuditLog(userId, models.AuditExport, c, "Excel statement export")
}
