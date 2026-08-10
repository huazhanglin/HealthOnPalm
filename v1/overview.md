# 健康智能体 App v1 — 项目代码生成概览

**生成时间**: 2026-07-17
**基于文档**: `健康智能体App技术架构_修订版_20260717.md`
**目标目录**: `C:\codes\HealthOnPalm\v1`
**文件总数**: 122 个

---

## 项目结构总览

```
v1/
├── docker-compose.yml              # Docker 编排（PostgreSQL + Redis + Backend）
├── .github/
│   └── workflows/
│       └── ci.yml                  # GitHub Actions CI/CD
│
├── backend/                        # 后端 — FastAPI (58 个文件)
│   ├── app/
│   │   ├── main.py                 # 应用入口（全局异常处理 + 路由注册）
│   │   ├── api/
│   │   │   ├── deps.py             # 依赖注入（工厂函数修复 P0-2）
│   │   │   ├── middleware/
│   │   │   │   ├── rate_limit.py   # Redis 滑动窗口限流
│   │   │   │   └── request_logging.py # 请求日志中间件
│   │   │   └── v1/
│   │   │       ├── auth.py         # 认证接口（登录/注册/刷新/登出）
│   │   │       ├── chat.py         # 对话接口（SSE 流式）
│   │   │       ├── health.py       # 健康数据接口
│   │   │       ├── plan_api.py     # 训练计划接口
│   │   │       └── compliance.py   # 合规接口（数据导出/注销）
│   │   ├── core/
│   │   │   ├── security.py         # JWT + bcrypt 密码哈希
│   │   │   ├── encryption.py       # AES-256-GCM 数据加密
│   │   │   ├── config.py           # Pydantic Settings + loguru 日志
│   │   │   └── exceptions.py       # 自定义异常类
│   │   ├── models/                 # SQLAlchemy 模型
│   │   │   ├── user.py             # 用户表（含合规字段）
│   │   │   ├── message.py          # 消息表（含成本追踪）
│   │   │   ├── health_data.py      # 健康数据表（加密存储）
│   │   │   └── plan.py             # 训练计划表
│   │   ├── schemas/                # Pydantic 请求/响应模型
│   │   ├── services/               # 业务逻辑层
│   │   │   ├── chat_service.py     # 流式处理 + Token 追踪
│   │   │   ├── auth_service.py     # 认证服务
│   │   │   ├── health_service.py   # 健康数据服务（加密/解密）
│   │   │   ├── plan_service.py     # 计划生成服务（LLM）
│   │   │   └── compliance_service.py # 合规服务（注销/导出）
│   │   ├── ai/
│   │   │   ├── llm_client.py       # 多模型降级 + 流式 + 重试
│   │   │   ├── content_moderator.py # 内容审核（输入/输出过滤）
│   │   │   └── prompts/
│   │   │       ├── health_coach.py # 系统提示词（含安全红线）
│   │   │       └── plan_generator.py
│   │   └── db/
│   │       ├── base.py             # SQLAlchemy declarative base
│   │       ├── session.py          # 异步会话 + Redis 客户端
│   │       └── init_db.py          # 数据库初始化
│   ├── tests/
│   │   ├── conftest.py             # 测试夹具
│   │   └── test_api/test_chat.py   # 对话接口测试
│   ├── alembic/                    # 数据库迁移
│   │   └── env.py
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── .env.example
│   ├── init.sql                    # 完整建表脚本
│   ├── nginx.conf                  # Nginx 配置（含 SSE 支持）
│   ├── alembic.ini
│   └── pytest.ini
│
└── frontend/                       # 前端 — Flutter (62 个文件)
    ├── pubspec.yaml                # 依赖配置
    └── lib/
        ├── main.dart               # 应用入口（全局错误捕获）
        ├── app.dart                # MaterialApp 配置
        ├── core/
        │   ├── config/             # 应用配置 + API 配置 + 环境变量
        │   ├── constants/          # 颜色/字符串/资源路径常量
        │   ├── theme/              # 明暗主题配置
        │   ├── router/             # GoRouter 路由
        │   └── utils/              # 日期/验证器/日志/错误上报
        ├── data/
        │   ├── models/             # freezed 模型（User/Message/HealthData/Plan）
        │   ├── repositories/       # 数据仓库
        │   └── datasources/
        │       ├── remote/         # Dio HTTP + SSE 客户端
        │       └── local/          # flutter_secure_storage + Hive 缓存
        ├── domain/
        │   ├── entities/           # 领域实体
        │   └── usecases/           # 用例层
        ├── presentation/
        │   ├── screens/
        │   │   ├── auth/           # 登录 + 注册
        │   │   ├── home/           # 首页
        │   │   ├── chat/           # 对话（SSE 流式渲染 + 消息气泡 + 输入框）
        │   │   ├── health/         # 健康看板 + 授权页 + 图表
        │   │   ├── plan/           # 训练计划
        │   │   └── profile/        # 个人中心 + 隐私 + 数据导出
        │   ├── widgets/            # 通用组件
        │   └── providers/          # Riverpod 状态管理（Auth/Chat/Health）
        └── services/               # API/Auth/Health/Notification/Storage 服务
```

---

## 文件分类统计

| 分类 | 文件数 | 说明 |
|------|--------|------|
| 后端 Python | 42 | FastAPI 应用、模型、服务、AI 模块 |
| 后端配置 | 9 | Dockerfile、requirements.txt、init.sql、nginx.conf 等 |
| 后端测试 | 5 | conftest + test_chat + __init__ |
| 后端迁移 | 2 | alembic/env.py + alembic.ini |
| 前端 Dart | 56 | Flutter UI、状态管理、数据层 |
| 前端配置 | 1 | pubspec.yaml |
| 根配置 | 2 | docker-compose.yml + ci.yml |
| __init__.py | 15 | Python 包初始化文件 |
| **总计** | **122** | |

---

## 关键代码文件说明

### 后端核心文件

| 文件 | 修订项 | 说明 |
|------|--------|------|
| `app/core/security.py` | — | JWT 签发/验证 + bcrypt 密码哈希 |
| `app/core/encryption.py` | 新增 | AES-256-GCM 加密器（健康数据加密存储） |
| `app/core/config.py` | 新增 | Pydantic Settings + loguru 日志配置 |
| `app/api/deps.py` | P0-2 | Depends 工厂函数修复 |
| `app/api/v1/chat.py` | P0-4 | SSE 流式对话接口 |
| `app/ai/llm_client.py` | P1-4 | Claude → DeepSeek 多模型降级 + 流式 |
| `app/ai/content_moderator.py` | 新增 | 输入/输出内容安全过滤 |
| `app/ai/prompts/health_coach.py` | 新增 | 系统提示词（含医疗器械安全红线） |
| `app/services/chat_service.py` | P1-2/9 | 流式处理 + 历史截断 + 成本追踪 |
| `app/api/middleware/rate_limit.py` | P1-5 | Redis 滑动窗口限流 |
| `init.sql` | P0-1 | 所有 INDEX 移到 CREATE TABLE 外 |

### 前端核心文件

| 文件 | 修订项 | 说明 |
|------|--------|------|
| `lib/main.dart` | P2-4 | runZonedGuarded 全局错误捕获 |
| `lib/core/router/app_router.dart` | P2-3 | GoRouter 路由 + 登录守卫 |
| `lib/data/datasources/local/secure_storage.dart` | P1-6 | flutter_secure_storage 替代 shared_preferences |
| `lib/data/datasources/remote/sse_client.dart` | P0-4 | SSE 流式客户端（Dio stream 模式） |
| `lib/presentation/providers/chat_provider.dart` | P1-1/2/3 | Riverpod 状态管理 + UUID + 历史截断 |
| `lib/presentation/screens/chat/` | — | 对话界面 + 消息气泡 + 流式指示器 + 输入框 |
| `lib/presentation/screens/health/consent_screen.dart` | 新增 | 健康数据授权页面 |
| `lib/presentation/screens/profile/privacy_screen.dart` | 新增 | 隐私设置 + 账号注销 |
| `lib/presentation/screens/profile/data_export_screen.dart` | 新增 | 数据导出页面（数据可携带权） |

---

## 下一步

1. **后端启动**: `cd backend && cp .env.example .env && docker-compose up -d`
2. **前端初始化**: `cd frontend && flutter pub get && dart run build_runner build`
3. **数据库迁移**: `cd backend && alembic revision --autogenerate -m "init" && alembic upgrade head`
4. **启动开发服务器**: 后端 `uvicorn app.main:app --reload`，前端 `flutter run`
