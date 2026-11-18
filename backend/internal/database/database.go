package database
import ("fmt"; "finance-portal/backend/internal/config"; "finance-portal/backend/internal/models"; "gorm.io/driver/mysql"; "gorm.io/gorm")
func Connect(c config.Config)(*gorm.DB,error){ db,e:=gorm.Open(mysql.Open(c.DSN),&gorm.Config{});if e!=nil{return nil,fmt.Errorf("database connection: %w",e)}; return db,e }
func Migrate(db *gorm.DB) error { return db.AutoMigrate(&models.User{},&models.Category{},&models.Transaction{},&models.Budget{}) }
