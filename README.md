# AssetFlow: Enterprise Asset & Resource Management System

## Overall Vision
The vision for **AssetFlow** is to simplify and digitize how organizations track, allocate, and maintain their physical assets and shared resources through a centralized ERP platform. This system is industry-agnostic; any organization with equipment, furniture, vehicles, or shared spaces (offices, schools, hospitals, factories, agencies) can utilize it.

The platform aims to reduce manual tracking inefficiencies (such as spreadsheets and paper logs) by enabling structured asset lifecycles, centralized resource booking, and real-time visibility into who holds what, where it is, and its current condition.

AssetFlow focuses on delivering core ERP functionality with a clean architecture, role-based workflows, and scalable module design, deliberately excluding purchasing, invoicing, or accounting concerns.

---

## Mission
The mission for the hackathon team is to build a user-centric, responsive application that simplifies asset and resource management for any organization. The platform should provide staff with intuitive tools to:
*   Set up departments, asset categories, and the employee directory.
*   Register and track assets through their full lifecycle.
*   Allocate assets to employees/departments with comprehensive conflict handling.
*   Book shared resources (rooms, vehicles, equipment) without time-slot overlaps.
*   Run a structured maintenance approval and repair workflow.
*   Execute structured audit cycles to catch physical and systemic discrepancies.
*   Get notified of overdue returns, upcoming bookings, and maintenance events.

---

## Problem Statement
Design and develop an Enterprise Asset & Resource Management System where organizations can:
1.  **Maintain Master Data:** Manage departments, asset categories, and an employee directory.
2.  **Flexible Lifecycle Tracking:** Track assets across multiple states (*Available*, *Allocated*, *Reserved*, *Under Maintenance*, *Lost*, *Retired*, *Disposed*) with controlled transitions (e.g., *Available* $
ightarrow$ *Under Maintenance*, *Allocated* $
ightarrow$ *Available*).
3.  **Conflict-Free Allocation:** Allocate assets to employees or departments, preventing double-allocation of a single asset.
4.  **Overlap Validation:** Book shared/limited resources by time slots, rejecting any overlapping reservations.
5.  **Structured Maintenance Routing:** Route maintenance requests through an approval workflow before repair work starts.
6.  **Audit Verification Cycles:** Run scheduled audit cycles with assigned auditors and auto-generated discrepancy reports.
7.  **Operational Alerts:** Surface overdue returns, active bookings, and maintenance activity through notifications and a centralized KPI dashboard.

The application must demonstrate proper ERP architecture, reusable modules, secure role-based workflows (featuring realistic account creation rather than self-assigned admin privileges), and an intuitive UI/UX while effectively handling relations between departments, employees, assets, bookings, maintenance requests, and audits.

---

## User Roles
*   **Admin**
    *   Manages departments, asset categories, audit cycles, and employee/role assignments (*Organization Setup*).
    *   Views organization-wide analytics and system-wide activity logs.
*   **Asset Manager**
    *   Registers and allocates new or existing assets.
    *   Approves transfers, maintenance requests, and audit discrepancy resolutions.
    *   Approves asset returns and inputs condition check-in notes.
*   **Department Head**
    *   Views all assets allocated to their respective department.
    *   Approves allocation/transfer requests within their department.
    *   Books shared resources on behalf of the department.
*   **Employee**
    *   Views assets currently allocated directly to them.
    *   Books shared resources for individual use.
    *   Raises maintenance requests for faulty equipment.
    *   Initiates return or transfer requests for held assets.

---

## Features

### 1. Login / Signup Screen
*   **Purpose:** Authenticate users with realistic, non-self-elevating account creation.
*   **Key Functionality/Components:**
    *   Signup creates an **Employee account only**—there is no role selection allowed at signup.
    *   The Admin creates/promotes Department Heads and Asset Managers directly from the Employee Directory.
    *   Features email & password login, forgot password functionality, and secure session validation.

### 2. Dashboard / Home Screen
*   **Purpose:** Give every role a real-time operational snapshot tailored to their permissions.
*   **Key Functionality/Components:**
    *   **KPI Cards:** Real-time counters for *Assets Available*, *Assets Allocated*, *Maintenance Today*, *Active Bookings*, *Pending Transfers*, and *Upcoming Returns*.
    *   **Overdue Returns:** Alerts for items kept past their *Expected Return Date* are highlighted separately from upcoming returns.
    *   **Quick Actions:** Fast-access triggers to *Register Asset*, *Book Resource*, or *Raise Maintenance Request*.

### 3. Organization Setup Screen *(Admin Only - 3 Tabs)*
*   **Purpose:** Maintain the master data upon which all other application features depend.
*   *   **Tab A - Department Management:**
        *   Create, edit, or deactivate departments.
        *   Assign a Department Head, select an optional Parent Department (to support structural hierarchies), and toggle Status (*Active* / *Inactive*).
    *   **Tab B - Asset Category Management:**
        *   Create and edit asset categories (e.g., *Electronics*, *Furniture*, *Vehicles*).
        *   Configure optional category-specific fields (e.g., warranty periods for Electronics).
    *   **Tab C - Employee Directory:**
        *   Manage personnel profiles containing Name, Email, Department, Role, and Status (*Active* / *Inactive*).
        *   **Role Promotion:** This is the exclusive interface where an Admin can promote a standard Employee to a Department Head or Asset Manager.

### 4. Asset Registration & Directory Screen
*   **Purpose:** Register physical assets and track them centrally.
*   **Key Functionality/Components:**
    *   **Registration Attributes:** Fields include Name, Category, auto-generated unique Asset Tag (e.g., `AF-0001`), Serial Number, Acquisition Date, Acquisition Cost (retained for high-level ranking/reports, not linked to accounting metrics), Condition, Location, photo/document attachments, and a "shared/bookable" flag.
    *   **Search & Filter Matrix:** Ability to query items by Asset Tag, Serial Number, QR code, category, status, department, or location.
    *   **Lifecycle Visibility:** Real-time visibility of asset states: *Available*, *Allocated*, *Reserved*, *Under Maintenance*, *Lost*, *Retired*, *Disposed*.
    *   **Historical Timeline:** A per-asset historical log tracking both past allocations and maintenance cycles.

### 5. Asset Allocation & Transfer Screen
*   **Purpose:** Manage custody and item handovers with explicit conflict rules.
*   **Key Functionality/Components:**
    *   **Allocation Assignment:** Allocate assets directly to an employee or department with an optional *Expected Return Date*.
    *   **Conflict Prevention Rule:** The system strictly blocks double-allocation of a single asset. 
        *   *Example:* Priya holds Laptop `AF-0114`. If Raj attempts to allocate it, the system rejects the operation, displays *"Currently held by Priya"*, and presents a **Transfer Request** button.
    *   **Transfer Workflow:** Routes requests through states: `Requested` $
ightarrow$ `Approved` (by an Asset Manager or Department Head) $
ightarrow$ `Re-allocated` (automatically updates histories).
    *   **Return Flow:** Marks items as returned, logs check-in condition notes, and automatically reverts the asset's lifecycle state back to *Available*.
    *   **Overdue Tracker:** Allocations exceeding their *Expected Return Date* are auto-flagged to feed notifications and dashboards.

### 6. Resource Booking Screen
*   **Purpose:** Facilitate time-slot booking of shared resources with zero overlaps.
*   **Key Functionality/Components:**
    *   **Calendar Interface:** Visual calendar grid depicting a resource's existing bookings.
    *   **Overlap Validation Engine:** Blocks double-booking of resources for conflicting time windows.
        *   *Example:* Room `B2` is booked from `09:00 - 10:00`. A new request for `09:30 - 10:30` is rejected due to overlap, whereas a request for `10:00 - 11:00` passes since it starts exactly as the prior session concludes.
    *   **Booking Lifecycle States:** Tracks slots as *Upcoming*, *Ongoing*, *Completed*, or *Cancelled*.
    *   **Modification & Reminders:** Provides capabilities to cancel/reschedule bookings alongside automated reminders sent before a slot commences.

### 7. Maintenance Management Screen
*   **Purpose:** Route equipment repairs through authorization gates before work commences.
*   **Key Functionality/Components:**
    *   **Request Intake:** Select an asset, describe the issue, define the priority level, and attach optional photo evidence.
    *   **Approval Lifecycle Workflow:** Routes records through: `Pending` $
ightarrow$ `Approved / Rejected` (by an Asset Manager) $
ightarrow$ `Technician Assigned` $
ightarrow$ `In Progress` $
ightarrow$ `Resolved`.
    *   **Automated State Control:** The asset's status auto-updates to *Under Maintenance* upon request approval, and rolls back to *Available* immediately upon resolution.
    *   **Archival:** Full maintenance history logs are permanently retained on the asset's profile.

### 8. Asset Audit Screen
*   **Purpose:** Execute periodic verification cycles rather than standalone, disjointed form entries.
*   **Key Functionality/Components:**
    *   **Audit Cycle Initialization:** Establish a cycle scope defined by department, physical location, and targeted date ranges.
    *   **Auditor Delegation:** Assign one or multiple specific auditors to lead the cycle.
    *   **Verification Interface:** Auditors evaluate items individually, tagging them as *Verified*, *Missing*, or *Damaged*.
    *   **Discrepancy Resolution:** The system automatically compiles a discrepancy report for flagged elements.
    *   **Cycle Closure:** Closing an audit cycle locks the records and auto-updates asset records globally (e.g., changes status to *Lost* for confirmed-missing items).

### 9. Reports & Analytics Screen
*   **Purpose:** Equip managers with actionable operational and intelligence metrics.
*   **Key Functionality/Components:**
    *   Asset utilization trends (identifying the most-used vs. completely idle resources).
    *   Maintenance frequency tracking breakages down by specific asset and broad category.
    *   Proactive insights identifying assets due for preventative maintenance or nearing retirement.
    *   Department-wise allocation breakdown metrics.
    *   Resource booking heatmaps pinpointing peak usage windows.
    *   One-click data export utilities.

### 10. Activity Logs & Notifications Screen
*   **Purpose:** Keep every organizational role informed without digging for individual updates.
*   **Key Functionality/Components:**
    *   **Contextual Alerts:** Automated notifications triggered by events such as *Asset Assigned*, *Maintenance Approved/Rejected*, *Booking Confirmed/Cancelled/Reminder*, *Transfer Approved*, *Overdue Return Alerts*, and *Audit Discrepancy Flags*.
    *   **System Audit Trail:** An unalterable log capturing all admin, manager, and employee actions detailing who performed an action, what changed, and exact timestamps.

---

## Core Operational Workflow
```
[Admin Setup] 
      │
      ▼
[Asset Registered as 'Available'] 
      │
      ├───► [Allocated to Employee/Dept] ───► (If conflict, trigger Transfer Request workflow)
      │
      ├───► [Marked Bookable Shared Resource] ───► [Calendar Time-slot Booking with Overlap Check]
      │
      └─► [Issue Occurs] ───► [Raise Request] ───► [Manager Approval] ───► ['Under Maintenance'] ───► [Resolved ──► 'Available']
```
1.  **Initialization:** The Admin establishes organizational departments, asset categories, and elevates basic employees to their operational roles (*Asset Manager* or *Department Head*).
2.  **Ingestion:** An Asset Manager registers a piece of inventory, placing it into the system under the **Available** state.
3.  **Deployment:** The asset is either directly allocated to a custodian (blocked if a conflict exists, prompting a transfer request instead) or flagged as a bookable shared resource.
4.  **Booking Consumption:** Employees interact with the calendar system to secure shared assets. Overlapping requests are immediately intercepted and rejected.
5.  **Maintenance Loop:** When items break, handlers log a request. The system keeps the asset operational until an Asset Manager clicks approve, switching its state to **Under Maintenance** until resolved.
6.  **Verification Loop:** Periodic audits occur where designated teams systematically verify physical inventory against system state, correcting data mismatches via discrepancy closures.

---

## Technical Proof of Concept (POC)
*   **Excalidraw UI Wireframes & Mockups:** [AssetFlow Architecture & Interface Mockup](https://app.excalidraw.com/I/65VNwvy7c4X/5ceOBMjbDby)



🔴 Admin
Organization Setup (exclusive to Admin)

Create/edit/deactivate departments
Assign Department Head, set parent department (hierarchy)
Create/edit asset categories + custom fields (e.g. warranty period)
View/manage full Employee Directory
Promote Employee → Department Head / Asset Manager (only place roles are assigned)
Activate/deactivate any user account

Assets

Full visibility into all assets (view only — registration is typically Asset Manager's job, but Admin can view/search everything)

Allocations & Transfers

View all allocations/transfers org-wide (oversight, not primary actor)

Bookings

View all bookings org-wide

Maintenance

View all maintenance requests org-wide (oversight)

Audits

Create Audit Cycles (scope, date range)
Assign auditors to a cycle
Close Audit Cycle (locks cycle, updates asset statuses)

Reports & Analytics

Full access to all reports (utilization, maintenance frequency, department summaries, booking heatmap)
Export reports

Dashboard

Org-wide KPIs (all departments, all assets)

Activity Logs & Notifications

View full system-wide activity log (who did what, when — every role)
Receives all system-critical notifications


🟠 Asset Manager
Assets

Register new assets (name, category, auto asset tag, serial, cost, condition, location, photos)
Edit asset details
Search/filter all assets
Manually transition asset lifecycle status where applicable

Allocations & Transfers

Allocate assets to employees/departments
Approve/reject Transfer Requests
Approve asset returns + condition check-in notes

Bookings

Book shared resources (same as any role)
View resource calendars

Maintenance

Approve/reject maintenance requests (Pending → Approved/Rejected)
Assign technician
Move request through In Progress → Resolved
Asset status auto-syncs (Under Maintenance ↔ Available) on their actions

Audits

Act as an assigned auditor: mark assets Verified/Missing/Damaged
View/resolve audit discrepancies (approval role per problem statement: "Approves... audit discrepancy resolution")

Dashboard

KPIs scoped to assets they manage (or org-wide, depending on your design choice)

Reports

View asset/maintenance-related reports

Notifications

Receives: Asset Assigned, Transfer requests pending, Maintenance requests pending, Audit assignments, Overdue alerts


🟡 Department Head
Assets

View assets allocated to their department (read-only)

Allocations & Transfers

Approve allocation/transfer requests within their department
View department's allocation history

Bookings

Book shared resources on behalf of their department
View resource calendars

Maintenance

View maintenance requests raised by their department's employees (visibility, not approval — approval belongs to Asset Manager per spec)

Audits

Can be assigned as an auditor for cycles scoped to their department
Mark assets Verified/Missing/Damaged if assigned

Dashboard

KPIs scoped to their own department (Assets Allocated, Active Bookings, Pending Transfers — filtered to dept)

Reports

Department-wise allocation summary (their own department)

Notifications

Receives: Transfer/allocation approvals needed, Booking confirmations for their dept, Overdue returns within their dept


🟢 Employee
Assets

View assets allocated to them (read-only)
View asset details/history for their own allocated assets

Allocations & Transfers

Initiate Return Request (for assets they hold)
Initiate Transfer Request (when they try to allocate something already held — the "currently held by X, request transfer" flow)

Bookings

Book shared resources by time slot
Cancel/reschedule their own bookings
View resource calendars

Maintenance

Raise maintenance request (select asset, describe issue, priority, photo)
View status of their own raised requests

Audits

Can be assigned as an auditor (any employee can be tapped for an audit cycle per spec — "assign one or more auditors")
If assigned: mark assets Verified/Missing/Damaged

Dashboard

Personal KPIs: their allocated assets, their upcoming/overdue returns, their active bookings

Reports

No dedicated access (or read-only personal summary, if you choose to expose it)

Notifications

Receives: Asset Assigned to them, their Booking Confirmed/Cancelled/Reminder, their Maintenance Approved/Rejected, their Transfer Approved, their Overdue Return Alert


Cross-role (available to everyone, gated by ownership/scope)
FeatureAdminAsset ManagerDept HeadEmployeeLogin/Signup———✅ (signup creates Employee only)View own profile / activity✅✅✅✅Book shared resources✅✅✅ (+ on behalf of dept)✅Raise maintenance request✅✅✅✅Receive notifications✅ (all)✅ (scoped)✅ (dept-scoped)✅ (personal)View dashboard✅ (org-wide)✅ (scoped)✅ (dept-scoped)✅ (personal)