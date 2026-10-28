# Architecture Decision Records (ADRs)

**Project:** University Event Coordination, Approval & Attendance Management Platform  
**Status:** Approved Baseline  
**Date:** 2026-10-14  

---

## Table of Contents
1. [ADR 001: Monolithic Layered Architecture (Controller-Service-Repository)](#adr-001-monolithic-layered-architecture)
2. [ADR 002: Relational Data Model with PostgreSQL & 21 Core Entities](#adr-002-relational-data-model-with-postgresql--21-core-entities)
3. [ADR 003: Multi-University Tenant Isolation Strategy](#adr-003-multi-university-tenant-isolation-strategy)
4. [ADR 004: Stateful Session-Based Authentication & Authorization](#adr-004-stateful-session-based-authentication--authorization)
5. [ADR 005: Decoupled Institutional Business Rules via PolicyService](#adr-005-decoupled-institutional-business-rules-via-policyservice)
6. [ADR 006: Explicit Decoupling of Proposal Approval, OD Authorization, and Attendance](#adr-006-explicit-decoupling-of-proposal-approval-od-authorization-and-attendance)
7. [ADR 007: Concurrency Control and Resource Conflict Prevention](#adr-007-concurrency-control-and-resource-conflict-prevention)
8. [ADR 008: Internal In-App Notifications & Tamper-Evident Audit Trails](#adr-008-internal-in-app-notifications--tamper-evident-audit-trails)
9. [ADR 009: Automated Quality Assurance and Testing Pyramid](#adr-009-automated-quality-assurance-and-testing-pyramid)

---

### ADR 001: Monolithic Layered Architecture

#### Context
The platform coordinates high-integrity workflows across universities, departments, faculty, and student bodies. A microservice architecture would introduce excessive operational overhead, network latency, distributed transaction complexities (e.g., two-phase commit or saga orchestrations across approval and resource booking), and unnecessary infrastructure costs.

#### Decision
We adopt a **modular monolith** structured cleanly into three discrete layers:
- **Presentation / Controller Layer**: Express route handlers that parse HTTP requests, validate input via Zod schemas, handle authentication session context, and format HTTP responses.
- **Domain / Service Layer**: Pure business logic, authorization policy enforcement, workflow orchestration, transaction boundaries, and audit event emission. No direct SQL queries are written here.
- **Data Access / Repository Layer**: Encapsulated database operations via PostgreSQL connection pooling (`pg`), parameterized SQL queries, and transaction runners.

Frontend is isolated as a single-page application (SPA) using React, TypeScript, and Vite, consuming a well-versioned REST API (`/api/v1`).

#### Consequences
- **Positive**: Strict separation of concerns, rapid local development, atomic ACID transactions across entities without distributed coordination, straightforward debugging and unified testing.
- **Negative**: Requires strict discipline to prevent business logic leakage into controllers or repositories. Enforced via ESLint boundaries and code reviews.

---

### ADR 002: Relational Data Model with PostgreSQL & 21 Core Entities

#### Context
University academic workflows require rigid data consistency, strict referential integrity, foreign key cascades/restrictions, and atomic state transitions (e.g., student registration capacity decrementing, double-booking prevention). Document databases (MongoDB) or serverless NoSQL options lack declarative foreign keys and complex join optimizations necessary for auditability.

#### Decision
We commit strictly to **PostgreSQL** as the single source of truth. We implement the complete set of 21 core entities:
1. `University`
2. `UniversityConfig`
3. `Department`
4. `User`
5. `UserRole`
6. `StudentProfile`
7. `Organization`
8. `OrganizationMember`
9. `Event`
10. `EventEligibility`
11. `EventStaffAssignment`
12. `EventApproval`
13. `EventRevision`
14. `EventRegistration`
15. `ODRequest`
16. `ODRequestStudent`
17. `Attendance`
18. `Resource`
19. `ResourceBooking`
20. `Notification`
21. `AuditLog`

Migrations are written as versioned, plain SQL migration scripts executed in strict sequence.

#### Consequences
- **Positive**: Guarantees relational integrity, native support for JSONB configuration storage, date/time interval arithmetic, and high-performance indexing.
- **Negative**: Schema changes require explicit forward/rollback migrations.

---

### ADR 003: Multi-University Tenant Isolation Strategy

#### Context
The application serves multiple universities from a single shared instance. Cross-tenant data leakage (e.g., University A faculty seeing University B student registrations or resource schedules) is a catastrophic security violation.

#### Decision
We implement **discriminator-column multi-tenancy** scoped by `university_id`:
- Every tenant-scoped table contains `university_id UUID NOT NULL REFERENCES universities(id) ON DELETE RESTRICT`.
- The `TenantContext` middleware extracts and verifies the tenant context from the authenticated user's session.
- Repository layer queries automatically append `WHERE university_id = $tenant_id`.
- System Administrator operations (cross-tenant maintenance) require explicit elevated authorization scopes.

#### Consequences
- **Positive**: Cost-effective single-database deployment, seamless unified schema migrations, simple cross-tenant aggregation for platform administrators.
- **Negative**: Requires rigorous automated tests verifying that queries never omit the `university_id` filter.

---

### ADR 004: Stateful Session-Based Authentication & Authorization

#### Context
Stateless JWT tokens are susceptible to replay attacks, cannot be revoked instantly upon role changes or disciplinary suspensions, and expose sensitive claims if stored in browser localStorage. University enterprise systems require instant session invalidation upon HOD/Admin revocation or password reset.

#### Decision
We use **server-side session authentication**:
- Sessions are stored in PostgreSQL using `connect-pg-simple` within a dedicated `sessions` table.
- Session IDs are transmitted via secure, `HttpOnly`, `SameSite=Lax` (or `Strict`), cryptographically signed cookies.
- Passwords are encrypted using salted `bcrypt` with work factor 12.
- Role-based access control (RBAC) maps users to fine-grained permissions checked at both middleware (`requireRole`) and service levels.

#### Consequences
- **Positive**: Instant session revocation, protection against XSS token theft, robust security posture.
- **Negative**: Database lookup on authenticated requests (mitigated by indexed session lookup and connection pooling).

---

### ADR 005: Decoupled Institutional Business Rules via PolicyService

#### Context
Different institutions enforce divergent operational policies:
- University X requires 3-tier approval (Faculty Advisor → HOD → Dean of Student Affairs).
- University Y requires only HOD approval for internal club events.
- University X denies OD if student attendance is below 75%; University Y permits OD up to 5 days per semester regardless.
Hardcoding conditional `if (university === 'X')` branches in business logic produces fragile, unmaintainable code.

#### Decision
We introduce a dedicated **`PolicyService`**:
- Reads typed configuration from `UniversityConfig` (stored as structured JSONB validated against strict schemas).
- Exposes semantic policy evaluation methods:
  - `getApprovalWorkflow(universityId, eventCategory, budget)`
  - `evaluateODEligibility(universityId, studentProfile, eventType)`
  - `getResourceBookingRules(universityId, resourceType)`
- Business services invoke `PolicyService` rather than accessing raw configuration flags directly.

#### Consequences
- **Positive**: Zero hardcoded institutional policies; onboarding a new university requires only configuration seeding; policies are unit-testable in isolation.
- **Negative**: Slightly higher initial modeling effort to establish extensible policy schemas.

---

### ADR 006: Explicit Decoupling of Proposal Approval, OD Authorization, and Attendance

#### Context
In campus environments, novices frequently conflate three distinct operational concepts:
1. **Event Proposal Approval**: Campus administrative sanction to host the event and reserve venue/resources.
2. **On-Duty (OD) / Physical Authorization**: Academic sanction given by a student's *home department* (e.g., CSE HOD) excusing class absence.
3. **Attendance**: The physical verification that a registered student actually attended the session.

For example: An event hosted by the Mechanical Engineering Club might be Approved; an attending CSE student might have their OD Rejected by their own HOD; or an OD-approved student might fail to show up, resulting in an Absent mark.

#### Decision
The system models these workflows through separate entity lifecycles:
- `Event` + `EventApproval` + `EventRevision`: Governs the proposal lifecycle.
- `EventRegistration`: Captures student intent to participate.
- `ODRequest` + `ODRequestStudent`: Bundled by student home department, routed to the student's departmental HOD/Faculty Advisor, completely independent of the event organizer's department.
- `Attendance`: Recorded per session by designated event staff (`EventStaffAssignment`) with distinct verification timestamps and statuses (`PRESENT`, `ABSENT`, `LATE`).

#### Consequences
- **Positive**: Perfectly mirrors real-world university governance; prevents academic fraud; handles cross-departmental student participation cleanly.
- **Negative**: Multiple steps required for end-to-end event completion, necessitating clear dashboard UX for faculty and students.

---

### ADR 007: Concurrency Control and Resource Conflict Prevention

#### Context
Multiple club organizers often compete for prime campus venues (e.g., Main Auditorium) during peak festival periods. Simultaneous submissions can lead to double-booking if not prevented at the database layer.

#### Decision
We implement a two-layer conflict prevention mechanism:
1. **Database Exclusion Constraint / Range Locking**: PostgreSQL exclusion constraints using `tstzrange` with the `gist` index:
   ```sql
   ALTER TABLE resource_bookings
   ADD CONSTRAINT no_overlapping_bookings
   EXCLUDE USING gist (
     resource_id WITH =,
     tstzrange(start_time, end_time) WITH &&
   ) WHERE (status IN ('PENDING', 'CONFIRMED'));
   ```
2. **Transactional Verification in Service Layer**: All booking workflows execute inside an isolated transaction (`SERIALIZABLE` or `SELECT FOR UPDATE` on the target `Resource`).

#### Consequences
- **Positive**: Physically impossible to double-book a resource at the database level, regardless of race conditions or application bugs.
- **Negative**: Requires PostgreSQL extension `btree_gist` to be enabled in migration 001.

---

### ADR 008: Internal In-App Notifications & Tamper-Evident Audit Trails

#### Context
External commercial email/SMS APIs (SendGrid, Twilio, Firebase) violate project constraints (no paid APIs, zero external SaaS dependencies). Complete regulatory auditability is required for accreditation (NAAC/NBA).

#### Decision
- **In-App Notification Dispatcher**: System events (status updates, review requests, OD decisions) write directly to the `Notification` table. The frontend polls or queries notifications via REST. Local console/mock transport is available for development mail logging.
- **Audit Logging**: Key state transitions (approvals, revisions, OD determinations, attendance overrides) write an immutable record to `AuditLog` within the same database transaction. Records capture `user_id`, `action`, `entity_type`, `entity_id`, client IP, user agent, and JSON diffs of `old_values` and `new_values`.

#### Consequences
- **Positive**: 100% self-contained, compliant with offline and private-cloud academic deployments, zero recurring costs, complete traceability.
- **Negative**: Real-time push requires frontend polling in the absence of WebSockets or push notifications.

---

### ADR 009: Automated Quality Assurance and Testing Pyramid

#### Context
Academic software handles sensitive disciplinary records, attendance scores, and gate authorizations. Unverified code leads to regressions and grading disputes.

#### Decision
We establish a 3-tier testing strategy:
- **Unit & Service Tests (Jest)**: Mocked repositories verifying business logic, edge conditions, PolicyService rules, and authorization guards.
- **Integration Tests (Supertest + Test Database)**: Full HTTP request-response cycle tests executing against an ephemeral test PostgreSQL database, testing constraints, cascades, and transaction rollbacks.
- **End-to-End Tests (Playwright)**: Browser-level verification of critical user journeys (Proposal submission → HOD approval → Student registration → OD request → Attendance roster marking).

Fabricated test assertions are strictly prohibited. CI pipeline executes `npm test` and reports ground-truth status.

#### Consequences
- **Positive**: High reliability, regression immunity, verifiable compliance with academic rubrics.
- **Negative**: Test database environment must be provisioned during test runs.
