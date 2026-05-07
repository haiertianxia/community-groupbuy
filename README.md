# 🛒 社区团购系统

> 完整的社区团购解决方案，支持C端用户、B端团长、管理后台三端分离架构

## 📁 项目结构

```
community-groupbuy/
├── docs/                    # 项目文档 (5份)
│   ├── 01_需求规格说明书.md   # 功能模块清单、核心流程、财务合规
│   ├── 02_技术选型与架构设计.md # Go技术栈、微服务架构
│   ├── 03_概要设计.md         # 团购生命周期、状态机、任务调度
│   ├── 04_详细设计.md         # 接口定义、数据模型
│   └── 05_数据库设计.md       # 15张表ER图、索引设计
│
├── backend/                 # Go后端服务
│   ├── cmd/server/         # 入口 + 路由配置
│   ├── internal/
│   │   ├── config/         # Viper配置加载
│   │   ├── model/         # 12个数据模型 (含GORM标签)
│   │   ├── repository/    # 5个仓库层 (MySQL CRUD)
│   │   ├── service/       # 5个服务层 (业务逻辑)
│   │   ├── handler/       # 5个处理器 (HTTP接口)
│   │   └── middleware/   # 认证/JWT/限流/日志
│   ├── config/config.yaml # 配置文件
│   └── go.mod
│
├── sql/                     # SQL脚本
│   └── 001_init_schema.sql  # 15张核心表
│
├── tests/                   # 单元测试
│   ├── activity_service_test.go  # 6个测试用例
│   └── order_service_test.go    # 6个测试用例
│
├── frontend-c/              # C端小程序 (Taro)
│   ├── src/
│   │   ├── api/client.ts   # API客户端
│   │   ├── pages/
│   │   │   ├── index/     # 首页 (Banner/分类/团购列表)
│   │   │   ├── activity/ # 活动详情/参团
│   │   │   ├── order/    # 订单列表/操作
│   │   │   └── user/     # 个人中心
│   │   └── app.config.ts  # TabBar配置
│   └── package.json
│
├── frontend-b/              # B端团长小程序 (Taro)
│   ├── src/
│   │   ├── api/client.ts  # 团长API客户端
│   │   └── pages/
│   │       ├── index/     # 团长仪表盘
│   │       └── order/    # 订单管理/发货
│   └── app.config.ts
│
└── admin/                   # PC管理后台 (React + Ant Design)
    ├── src/
    │   ├── App.tsx        # 完整后台管理系统
    │   └── App.css
    ├── vite.config.ts
    └── package.json
```

## 🚀 快速开始

### 后端

```bash
cd backend
go mod tidy
# 配置 config/config.yaml
go run cmd/server/main.go
# 服务运行在 http://localhost:8080
```

### C端小程序

```bash
cd frontend-c
npm install
npm run dev    # 开发模式
npm run build  # 生产构建
```

### B端团长小程序

```bash
cd frontend-b
npm install
npm run dev
```

### 管理后台

```bash
cd admin
npm install
npm run dev    # http://localhost:3000
```

### 数据库

```bash
mysql -u root -p < sql/001_init_schema.sql
```

## ✅ 已完成功能

### 后端 (Go/Gin)
- [x] JWT认证中间件
- [x] 用户注册/登录/Token
- [x] 商品CRUD + 分类/品牌
- [x] SKU管理 + 库存
- [x] 团购活动创建/审核
- [x] 参团/发起团逻辑
- [x] 订单创建/支付/取消/确认
- [x] 团长订单发货
- [x] 退款审核
- [x] 成团检测定时任务
- [x] 团长仪表盘/结算
- [x] 管理端审核接口
- [x] Redis缓存
- [x] 单元测试 (12个测试用例)

### C端小程序
- [x] 微信授权登录
- [x] 首页 (Banner/分类/团长/团购活动)
- [x] 活动详情/参团
- [x] 微信支付 (JSAPI)
- [x] 订单列表/取消/退款/确认
- [x] 个人中心

### B端团长小程序
- [x] 团长仪表盘 (今日数据/待办)
- [x] 订单管理 (发货/退款审核)
- [x] 财务提现

### 管理后台
- [x] 运营看板
- [x] 团长管理/审核
- [x] 商品审核

## 🔌 API接口 (部分)

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/v1/auth/login | 微信登录 |
| GET | /api/v1/products | 商品列表 |
| GET | /api/v1/activities | 团购活动列表 |
| POST | /api/v1/activities/:id/join | 参与团购 |
| POST | /api/v1/orders/:id/pay | 订单支付 |
| POST | /api/v1/orders/:id/cancel | 取消订单 |
| POST | /api/v1/orders/:id/confirm | 确认收货 |
| POST | /api/v1/leader/orders/:id/ship | 团长发货 |
| GET | /api/v1/admin/dashboard | 管理看板 |

## 📊 业务流

```
发起团购 → 发布活动 → 用户参团 → 支付 → 成团判定 → 备货 → 发货/自提 → 确认收货 → 结算
              ↓                                              ↓
          未达人数                                    平台打款给团长
          → 自动退款
```

## 🔒 合规要点

- **资金安全**：微信支付分账API，订单完成后按比例分给团长
- **税务合规**：团长收入代扣代缴个税
- **数据安全**：敏感字段AES加密，订单数据保存≥5年
- **消费者保护**：7天无理由退货（生鲜除外）

## 📝 开发计划

| 阶段 | 内容 | 状态 |
|------|------|------|
| Phase 1 | 需求分析 & 架构设计 | ✅ 完成 |
| Phase 2 | 后端核心功能开发 | ✅ 完成 |
| Phase 3 | 单元测试 | ✅ 完成 |
| Phase 4 | C端小程序开发 | ✅ 完成 |
| Phase 5 | B端团长小程序开发 | ✅ 完成 |
| Phase 6 | 管理后台开发 | ✅ 完成 |
| Phase 7 | 联调测试 & 上线 | ⏳ 待开始 |

## 🛠️ 技术栈

| 层级 | 技术 |
|------|------|
| 后端 | Go 1.21 + Gin + GORM + Redis |
| 数据库 | MySQL 8.0 + Redis |
| C端小程序 | Taro (React) + 微信小程序 |
| B端小程序 | Taro (React) + 微信小程序 |
| 管理后台 | React 18 + Ant Design 5 |
