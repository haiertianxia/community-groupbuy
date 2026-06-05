package config

import (
	"fmt"
	"github.com/spf13/viper"
)

type Config struct {
	App      AppConfig
	Database DatabaseConfig
	Redis    RedisConfig
	JWT      JWTConfig
	Wechat   WechatConfig
	Alipay   AlipayConfig
}

type AppConfig struct {
	Mode string
	Port int
	Env  string
}

type DatabaseConfig struct {
	Host         string
	Port         int
	Username     string
	Password     string
	Name         string
	MaxIdleConns int
	MaxOpenConns int
}

type RedisConfig struct {
	Addr     string
	Password string
	DB       int
}

type JWTConfig struct {
	Secret        string
	AccessExpiry  int // minutes
	RefreshExpiry int // days
	MaxDevices    int
}

type WechatConfig struct {
	AppID     string
	AppSecret string
	MchID     string
	ApiKey    string
	CertPath  string
	KeyPath   string
}

type AlipayConfig struct {
	AppID      string
	PrivateKey string
	PublicKey  string
	NotifyURL  string
	ReturnURL  string
}

func Load() *Config {
	viper.SetConfigName("config")
	viper.SetConfigType("yaml")
	viper.AddConfigPath("./config")
	viper.AddConfigPath("../config")
	viper.AddConfigPath("../../config")

	viper.SetDefault("app.port", 8080)
	viper.SetDefault("app.mode", "debug")
	viper.SetDefault("database.max_idle_conns", 10)
	viper.SetDefault("database.max_open_conns", 100)
	viper.SetDefault("jwt.access_expiry", 14*24*60) // 14 days in minutes
	viper.SetDefault("jwt.refresh_expiry", 30)
	viper.SetDefault("jwt.max_devices", 3)

	if err := viper.ReadInConfig(); err != nil {
		panic(fmt.Sprintf("Failed to read config: %v", err))
	}

	var cfg Config
	if err := viper.Unmarshal(&cfg); err != nil {
		panic(fmt.Sprintf("Failed to unmarshal config: %v", err))
	}

	return &cfg
}
