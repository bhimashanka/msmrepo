# Technical Architecture & System Justification Report

## 1. Executive Summary
This document outlines the architectural decisions, database design rationale, security enforcement models, and core mathematical formulas underpinning the **Military Asset Management System (MAMS)**.

---

## 2. Tech Stack Selection & Justification

### 2.1 Backend: Node.js & Express.js (RESTful Architecture)
- **Selection**: Node.js with Express framework.
- **Justification**:
  1. **Asynchronous Non-Blocking I/O**: High throughput for logistics transaction logging and multi-base queries.
  2. **Middleware Ecosystem**: Enables lightweight custom authentication, role-based access control (RBAC), base scoping, and transaction audit log injection.
  3. **RESTful Standards**: Standardized resource endpoints (`/api/purchases`, `/api/transfers`, `/api/assignments`, `/api/expenditures`, `/api/dashboard/metrics`).

### 2.2 Database: SQLite (Relational SQL Database)
- **Selection**: Relational SQLite database with foreign key enforcement and transactional integrity.
- **Justification**:
  1. **Relational Integrity**: Asset transfers, stock levels, and assignments rely heavily on strong relational foreign key constraints (`bases.id`, `equipment_types.id`).
  2. **ACID Transaction Support**: Prevents race conditions during simultaneous stock deduction and addition across inter-base transfers.
  3. **Zero Configuration**: Portable single-file embedded database requiring zero database server setup for immediate evaluation and execution.

### 2.3 Frontend: React 19 + Vite + Tailwind CSS
- **Selection**: React 19 Single-Page Application (SPA) styled with Tailwind CSS, Lucide icons, and Recharts.
- **Justification**:
  1. **Component-Based Architecture**: Modular views for Dashboard, Net Movement Pop-up Modal, Purchases, Transfers, Assignments, and Audit Trail.
  2. **Tactical Dark Aesthetic**: Modern glassmorphic military interface utilizing dark slate palettes `#080c14`, cyan glows, and status badges.
  3. **Reactive State**: Dynamic metric recalculation upon applying Date, Base, or Equipment filters.

---

## 3. Financial & Inventory Balance Formulas

The system implements live dynamic metric calculations rather than stored static counters to ensure exact real-time accuracy across filters:

1. **Opening Balance ($B_{open}$)**:
   $$B_{open} = \sum \text{Opening Inventory Stock for Filtered Criteria}$$

2. **Purchases ($P$)**:
   $$P = \sum \text{Quantity Purchased in Selected Date Range}$$

3. **Transfers In ($T_{in}$)**:
   $$T_{in} = \sum \text{Quantity Transferred INTO Base with Status = 'Completed'}$$

4. **Transfers Out ($T_{out}$)**:
   $$T_{out} = \sum \text{Quantity Transferred OUT of Base with Status IN ('Completed', 'In-Transit')}$$

5. **Net Movement ($M_{net}$)**:
   $$M_{net} = P + T_{in} - T_{out}$$

6. **Assigned Assets ($A_{active}$)**:
   $$A_{active} = \sum \text{Quantity Issued to Personnel with Status = 'Active'}$$

7. **Expended Assets ($E$)**:
   $$E = \sum \text{Quantity Consumed for Live Fire Training, Combat Loss, or Wear}$$

8. **Closing Balance ($B_{close}$)**:
   $$B_{close} = B_{open} + M_{net} - E$$

---

## 4. Role-Based Access Control (RBAC) Design

Security middleware (`backend/middleware/auth.js`) intercepts all API requests:

```
[ Incoming HTTP Request ]
          │
          ▼
┌───────────────────────────┐
│  authenticateUser ()      │  Reads User Identity & Role Header
└─────────────┬─────────────┘
              │
              ▼
┌───────────────────────────┐
│  scopeBaseAccess ()       │  If Base Commander, forces base_id filter = Assigned Base
└─────────────┬─────────────┘
              │
              ▼
┌───────────────────────────┐
│  authorizeRoles (...)     │  Checks if User Role is in allowed endpoint list
└─────────────┬─────────────┘
              │
      ┌───────┴───────┐
      ▼               ▼
[ Authorized ]   [ HTTP 403 Forbidden ]
```

---

## 5. Audit Logging Architecture
Every state-changing HTTP request (`POST`, `PATCH`) calls `logTransaction(req, action, resource, details)` which synchronously writes to the `audit_logs` table:
- **Captured Metadata**: Timestamp, User ID, Username, User Role, Base ID, Action Type, Target Resource, JSON Payload Details.
