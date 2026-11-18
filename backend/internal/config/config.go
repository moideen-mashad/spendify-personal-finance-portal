package config

import ("os"; "github.com/joho/godotenv")
type Config struct { Port, Env, DSN, AccessSecret, RefreshSecret, CORSOrigin string }
func Load() Config { _=godotenv.Load(); get:=func(k,d string)string{if v:=os.Getenv(k);v!=""{return v};return d}; return Config{get("PORT","8080"),get("ENV","development"),get("DB_DSN","finance_user:finance_password@tcp(127.0.0.1:3306)/finance_portal?charset=utf8mb4&parseTime=True&loc=Local"),get("JWT_ACCESS_SECRET","dev-access-secret-change-me"),get("JWT_REFRESH_SECRET","dev-refresh-secret-change-me"),get("CORS_ORIGIN","http://localhost:5173")} }
