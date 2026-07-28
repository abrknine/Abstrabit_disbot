# Enterprise Node.js / TypeScript Architecture & Best Practices Guide

This document serves as a complete blueprint, folder structure template, architectural standard, and best practices guide extracted from production enterprise systems. You can use this guide to bootstrap, structure, or audit any Node.js / TypeScript backend service for high performance, multi-tenancy, clean modularity, and enterprise scalability.

---

## 1. Project Directory Structure

Below is the standard reference folder hierarchy. Maintain this exact file/folder naming convention (`kebab-case` directories and files, `.core.ts`, `.service.ts`, `.controller.ts`, `.router.ts`, `.schema.ts`, `.model.ts`) to ensure strict separation of concerns.

```
project-root/
├── .agent/                       # AI Agent / Automation workflows & rules
│   ├── rules/
│   │   ├── orchestrator.md
│   │   └── code-suggestions.md
│   └── skills/
├── config/                       # Data sources & Infrastructure Connections
│   ├── dbConn.ts                 # Relational DB connection pool (PostgreSQL / Sequelize)
│   ├── envConfig.ts              # Type-safe environment variable validation & export
│   ├── redisConn.ts              # Redis connection client & Pub/Sub setup
│   └── meiliConn.ts              # Search engine client setup (Meilisearch / Elasticsearch)
├── controllers/                  # HTTP Request & Transport Handlers
│   ├── analytics-controller.ts
│   ├── appointment-controller.ts
│   ├── audit-controller.ts
│   ├── auth-controller.ts
│   ├── availability-controller.ts
│   ├── health-controller.ts
│   ├── permission-controller.ts
│   ├── profile-controller.ts
│   ├── resource-controller.ts
│   └── socket-events-controller.ts
├── docs/                         # OpenAPI / Swagger Specification & DB schemas
│   ├── swagger.json
│   └── database/
│       └── MIGRATIONS.md
├── interfaces/                   # Shared TypeScript Interfaces & DTO contracts
├── middlewares/                  # Express Middleware Pipeline
│   ├── cacheMiddleware.ts        # ETag & HTTP Cache-Control header strategy
│   ├── clientAuthMiddleware.ts   # JWT Authentication & Tenant Context Injector
│   ├── globalErrorHandler.ts     # Centralized ApiError Exception Sanitizer
│   ├── notFoundHandler.ts        # 404 Route Handler
│   ├── perf-tracker.ts           # Request latency & response time logging
│   └── rateLimiter.ts            # Dynamic DDoS & Endpoint Rate Limiting
├── migrations/                   # Sequential Raw SQL Schema Versioning
│   ├── 001_initial_schema.sql
│   └── 002_add_indexes.sql
├── models/                       # Data Definitions & Declarative Table Schema Mappings
│   ├── appointments.model.ts
│   ├── audit-logs.model.ts
│   ├── index.ts
│   ├── permissions.model.ts
│   ├── roles.model.ts
│   ├── tenants.model.ts
│   └── users.model.ts
├── queues/                       # Background Queue Connection & Event Producers
│   └── queue-connection.ts
├── routes/                       # Express Kebab-case Router Registrations
│   ├── analytics-router.ts
│   ├── appointments-router.ts
│   ├── audit-router.ts
│   ├── auth-router.ts
│   ├── health-router.ts
│   └── resource-router.ts
├── services/                     # Core Business Logic & Domain Services
│   ├── cache-service.ts          # Central L1/L2 Cache Layer (Redis + In-Memory)
│   ├── analytics/
│   │   ├── analytics-service.ts
│   │   └── strategies/           # Strategy Pattern implementations
│   ├── appointment/
│   │   ├── appointment-service.core.ts
│   │   └── commands/             # Command Pattern implementations
│   ├── appointment-history/
│   │   └── appointment-history.service.ts
│   ├── audit/
│   │   └── audit-service.ts
│   ├── auth/
│   │   ├── auth-service.core.ts
│   │   └── strategies/
│   ├── dispatch/
│   │   └── dispatch-service.ts
│   ├── health/
│   │   └── health-service.ts
│   ├── permission/
│   │   └── permission-service.core.ts
│   ├── resource/
│   │   ├── resource-service.core.ts
│   │   └── resource-query.service.ts  # CQRS Read Service
│   └── search/
│       └── resource-search.service.ts
├── subscribers/                  # Event-driven async handlers & pub/sub listeners
├── types/                        # Global & Express Type Extensions
│   ├── auth.types.ts
│   └── global.d.ts
├── utils/                        # Essential Framework Utilities & Shared Base Classes
│   ├── apiError.ts               # Custom Operational Exception class
│   ├── apiResponse.ts            # Standardized API Output Formatter
│   ├── asyncHandler.ts           # Controller Async Error Wrapper
│   ├── base.service.ts           # Foundation Base Service (Raw SQL, Security, Multi-tenancy)
│   ├── id-generator.ts           # Distributed Unique ID (Snowflake / K-Sortable) Generator
│   ├── logger.ts                 # High-performance structured logger (Pino)
│   ├── pagination.ts             # Generic SQL Pagination & Offset Builder
│   └── socket-event-store.ts     # Real-time WebSockets event registry
├── validators/                   # Zod Schema Request Validation
│   ├── analytics.schema.ts
│   ├── appointment.schema.ts
│   ├── auth.schema.ts
│   └── resource.schema.ts
├── workers/                      # Standalone Background Cron & Worker Processes
│   ├── audit-export-worker.ts
│   ├── start-workers.ts
│   └── sync-worker.ts
├── .env.development
├── .env.production
├── Dockerfile
├── ecosystem.config.cjs          # PM2 Process Manager Configuration
├── index.ts                      # Server Entry point (HTTP + WebSockets)
├── package.json
├── socket-manager.ts             # WebSockets Server & Room Manager
└── tsconfig.json
```

---

## 2. Core Architectural & Design Patterns

### A. Base Service Inheritance (`BaseService`)
All core domain services inherit from a universal `BaseService`. This ensures that every request automatically carries user context (`currentUser`), tenant context (`tenant_id`), logger metadata, request-scoped security permission checks (`_checkPermission`), and optimized Raw SQL query capabilities (`_executeQuery`, `_executeModify`, `_executePaginatedQuery`).

### B. Command & Strategy Patterns
- **Strategy Pattern (`/services/*/strategies/`)**: Used for dynamic runtime algorithm resolution (e.g., Auth verification strategies like Password vs SSO vs SAML, or Resource Availability Calculation strategies).
- **Command Pattern (`/services/*/commands/`)**: Used to encapsulate write operations (e.g., complex multi-step appointments booking or state transitions) as distinct transactional commands with undo/rollback capabilities.

### C. CQRS (Command Query Responsibility Segregation)
Read heavy operations are separated into dedicated query services (e.g., `resource-query.service.ts`) while state-changing operations reside in core mutation services (`resource-service.core.ts`). This allows scaling read paths independently via Redis / Meilisearch while keeping write paths strictly transactional in PostgreSQL.

### D. Middleware Pipeline Pattern
HTTP requests strictly flow through a predictable linear middleware pipeline:
1. **Performance Tracker (`perf-tracker.ts`)**: Measures request latency.
2. **Rate Limiting (`rateLimiter.ts`)**: Prevents abuse.
3. **Authentication & Multi-Tenant Injector (`clientAuthMiddleware.ts`)**: Decodes JWT, attaches `req.user`, `req.tenantId`, and request logger.
4. **Validation Middleware (`Zod`)**: Sanitizes `req.body`, `req.query`, and `req.params`.
5. **Controller (`asyncHandler`)**: Delegates to domain services.
6. **HTTP ETag & Cache (`cacheMiddleware.ts`)**: Handles conditional GETs (`304 Not Modified`).
7. **Global Error Handler (`globalErrorHandler.ts`)**: Converts raw exceptions to standard `ApiError` payloads.

---

## 3. High-Performance SQL & Multi-Tenancy Rules

### Rule 1: High-Performance Raw SQL Execution
Avoid ORM overhead (`Model.findAll()`, `Model.create()`) for hot API paths. Use parameter-bound Raw SQL queries via Sequelize/Postgres query interfaces to ensure sub-millisecond execution times and zero SQL injection vulnerability:

```typescript
// ALWAYS use bind replacements:
const results = await this._executeQuery<UserDTO>(
    `SELECT id, email, full_name AS "fullName" 
     FROM users 
     WHERE tenant_id = :tenantId AND is_active = true`,
    { tenantId: this.currentUser.clientID }
);
```

### Rule 2: Strict Multi-Tenant Isolation
Every SQL read/write query **MUST** include `tenant_id = :tenantId` filter to eliminate cross-tenant data leaks.

### Rule 3: CamelCase Mapping in SQL
Return clean frontend DTOs directly from SQL queries using `AS "camelCase"` syntax:
```sql
SELECT 
    id, 
    first_name AS "firstName", 
    last_name AS "lastName", 
    created_at AS "createdAt"
FROM patients
WHERE tenant_id = :tenantId;
```

---

## 4. Reusable Code Skeleton & Boilerplate

Below are the exact production-ready core foundation files to copy directly into your new project.

### `utils/apiError.ts`
```typescript
export class ApiError extends Error {
    public readonly statusCode: number;
    public readonly errorCode: string;
    public readonly details: any;

    constructor(statusCode: number, message: string, errorCode: string = "INTERNAL_ERROR", details: any = null) {
        super(message);
        this.statusCode = statusCode;
        this.errorCode = errorCode;
        this.details = details;
        Object.setPrototypeOf(this, new.target.prototype);
        Error.captureStackTrace(this, this.constructor);
    }

    static badRequest(message: string, details?: any) {
        return new ApiError(400, message, "BAD_REQUEST", details);
    }

    static unauthorized(message: string = "Unauthorized access") {
        return new ApiError(401, message, "UNAUTHORIZED");
    }

    static forbidden(message: string = "Access denied") {
        return new ApiError(403, message, "FORBIDDEN");
    }

    static notFound(message: string = "Resource not found") {
        return new ApiError(404, message, "NOT_FOUND");
    }

    static unprocessableEntity(message: string, details?: any) {
        return new ApiError(422, message, "VALIDATION_ERROR", details);
    }
}
```

### `utils/apiResponse.ts`
```typescript
import type { Response } from "express";

export class ApiResponse {
    static success<T>(res: Response, data: T, message: string = "Success", statusCode: number = 200) {
        return res.status(statusCode).json({
            success: true,
            statusCode,
            message,
            data,
            error: null,
            timestamp: new Date().toISOString(),
        });
    }

    static paginated<T>(res: Response, data: T[], pagination: any, message: string = "Success") {
        return res.status(200).json({
            success: true,
            statusCode: 200,
            message,
            data,
            pagination,
            error: null,
            timestamp: new Date().toISOString(),
        });
    }
}
```

### `utils/asyncHandler.ts`
```typescript
import type { Request, Response, NextFunction, RequestHandler } from "express";

export const asyncHandler = (fn: Function): RequestHandler => {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
```

### `utils/base.service.ts`
```typescript
import type { Request } from "express";
import { QueryTypes } from "sequelize";
import { sequelize } from "../config/dbConn";
import { ApiError } from "./apiError";

export class BaseService {
    protected req: Request;
    protected logger: any;
    protected currentUser: any;
    private _effectivePermissions: Set<string> | null = null;

    constructor(req: Request, currentUser: any) {
        if (!req) throw new Error("Express Request object is required");
        this.req = req;
        this.currentUser = currentUser;
        this.logger = (req as any).log || console;
    }

    protected async _executeQuery<T = any>(sql: string, replacements: Record<string, any> = {}): Promise<T[]> {
        try {
            const results = await sequelize.query(sql, {
                replacements,
                type: QueryTypes.SELECT,
            });
            return results as T[];
        } catch (err) {
            this.logger.error({ err, sql, replacements }, "Raw SQL SELECT Query Failed");
            throw err;
        }
    }

    protected async _executeModify(sql: string, replacements: Record<string, any> = {}, transaction: any = null): Promise<any> {
        try {
            const [results] = await sequelize.query(sql, {
                replacements,
                transaction,
            });
            return results;
        } catch (err) {
            this.logger.error({ err, sql, replacements }, "Raw SQL MODIFY Query Failed");
            throw err;
        }
    }

    protected async _checkPermission(requiredSlug: string): Promise<void> {
        if (!this.currentUser?.userID) {
            throw ApiError.unauthorized("User authentication required");
        }

        if (!this._effectivePermissions) {
            await this._loadPermissions();
        }

        if (!this._effectivePermissions?.has(requiredSlug)) {
            throw ApiError.forbidden(`Missing required permission: ${requiredSlug}`);
        }
    }

    private async _loadPermissions(): Promise<void> {
        const sql = `
            SELECT p.slug FROM "permissions" p
            JOIN "role_permissions" rp ON rp.permission_id = p.id
            JOIN "users" u ON u.role_id = rp.role_id
            WHERE u.id = :userId
            UNION
            SELECT p.slug FROM "permissions" p
            JOIN "user_permissions" up ON up.permission_id = p.id
            WHERE up.user_id = :userId AND up.is_granted = true
            EXCEPT
            SELECT p.slug FROM "permissions" p
            JOIN "user_permissions" up ON up.permission_id = p.id
            WHERE up.user_id = :userId AND up.is_granted = false
        `;
        const rows = await this._executeQuery<{ slug: string }>(sql, { userId: this.currentUser.userID });
        this._effectivePermissions = new Set(rows.map(r => r.slug));
    }
}
```

### `middlewares/cacheMiddleware.ts`
```typescript
import type { Request, Response, NextFunction } from "express";
import crypto from "crypto";

export type CachePreset = "PRIVATE_SHORT" | "PRIVATE_MEDIUM" | "PUBLIC_LONG" | "NO_CACHE";

const PRESETS: Record<CachePreset, string> = {
    PRIVATE_SHORT: "private, max-age=60, stale-while-revalidate=30",
    PRIVATE_MEDIUM: "private, max-age=300, stale-while-revalidate=60",
    PUBLIC_LONG: "public, max-age=3600, stale-while-revalidate=300",
    NO_CACHE: "no-store, no-cache, must-revalidate",
};

export const cacheControl = (preset: CachePreset) => {
    return (req: Request, res: Response, next: NextFunction) => {
        res.setHeader("Cache-Control", PRESETS[preset]);

        if (req.method !== "GET") return next();

        const originalSend = res.send;
        res.send = function (body?: any): Response {
            if (res.statusCode === 200 && body) {
                const etag = `"${crypto.createHash("md5").update(typeof body === "string" ? body : JSON.stringify(body)).digest("hex")}"`;
                res.setHeader("ETag", etag);

                if (req.headers["if-none-match"] === etag) {
                    res.status(304).end();
                    return res;
                }
            }
            return originalSend.call(this, body);
        };

        next();
    };
};
```

---

## 5. Observability Architecture & Monitoring Patterns

The codebase uses a multi-layered observability strategy combining structured context logging, performance tracking middleware, slow query metrics, and database pool telemetry.

### A. Context-Aware Structured Logging (`utils/logger.ts`)
- **Library**: `pino` for ultra-low overhead JSON logging.
- **Context Child Loggers**: Dedicated child loggers for domain boundaries:
  - `dbLogger`: Database queries and pool saturation warnings.
  - `apiLogger`: HTTP request/response lifecycles.
  - `socketLogger`: WebSockets events and room joins/leaves.
  - `cacheLogger`: Cache hit/miss rates.
- **Security Redaction**: Automatic redaction of `authorization`, `cookie`, `password`, `password_hash`, and `clientSecret`.

### B. High-Performance API Latency Tracking (`middlewares/perf-tracker.ts`)
- **Mechanism**: Attaches to `res.on("finish")` using standard `performance.now()`.
- **Metrics Collected**: `timestamp`, `method`, `endpoint`, `duration_ms`, `status`, `userId`.
- **Non-blocking Write**: Asynchronous `fs.appendFile` writing to daily rotated CSV logs (`logs/perf/api-perf-YYYY-MM-DD.csv`).

### C. Slow Query Telemetry & Pool Monitoring (`utils/base.service.ts` & `workers/pool-monitor.ts`)
- **Slow Query Alerts**: Any SQL query exceeding `SLOW_QUERY_LOG_MS` (default `1000ms`) automatically logs execution time, SQL payload, parameter keys, and current connection pool status.
- **Pool Saturated Telemetry (`pool-monitor.ts`)**: Background cron runs every 30 seconds monitoring `total_size`, `active_connections`, `idle_connections`, and `waiting_requests`. Writes metrics to `logs/db/db-pool-metrics-YYYY-MM-DD.csv`.

---

## 6. Optimization Highlights & Rationale

When adopting this skeleton, the following optimizations were applied:

1. **Non-Blocking File I/O for Telemetry**:
   - **Optimized for**: Eliminating Event Loop blocking.
   - **How**: Used asynchronous `fs.appendFile` inside `res.on("finish")` so metric logging never delays the client's HTTP response.

2. **O(1) In-Memory Permission Cache**:
   - **Optimized for**: Sub-millisecond authorization.
   - **How**: Resolved permission hierarchies (Role + Grants - Revokes) in SQL once per request and cached them as a TypeScript `Set<string>` for `O(1)` slug checks via `this._checkPermission()`.

3. **Fast ETag MD5 Digesting**:
   - **Optimized for**: Low network bandwidth & CPU efficiency.
   - **How**: Used `crypto.createHash("md5")` inside response streaming interceptor to instantly return `304 Not Modified` on unchanged GET requests.

4. **Structured Pino Context Child Loggers**:
   - **Optimized for**: Log parsing in production (ELK / Grafana Loki) and zero-emoji compliance.
   - **How**: Replaced `console.log` with contextual child loggers (`dbLogger`, `apiLogger`) with automated field redaction.

---

## 7. Security & Multi-Tenancy Guardrails Checklist

- [x] **No ORM Queries in Critical Path**: All database operations use raw SQL queries with parameter binding (`:param`).
- [x] **Tenant Data Isolation**: All database tables contain `tenant_id` and all queries mandate `WHERE tenant_id = :tenantId`.
- [x] **Service-Level Access Control**: Services check permissions using `await this._checkPermission("PERMISSION_SLUG")`.
- [x] **Observability Instrumentation**: Pino child loggers, performance CSV trackers, and pool monitors active.
- [x] **Standardized Error Responses**: All unexpected failures pass through `globalErrorHandler` returning `{ success: false, error: { code, message, details } }`.
- [x] **Input Validation**: Every route validates payload via Zod before invoking controllers.
- [x] **Clean Logging**: Redact secrets, passwords, and tokens; avoid clutter and emojis in server logs.
