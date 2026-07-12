-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('EMPLOYEE', 'DEPARTMENT_HEAD', 'ASSET_MANAGER', 'ADMIN');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('LOCAL', 'GOOGLE', 'MICROSOFT');

-- CreateEnum
CREATE TYPE "DepartmentStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "EmployeeStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ON_LEAVE', 'TERMINATED');

-- CreateEnum
CREATE TYPE "AssetCategoryStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('AVAILABLE', 'ALLOCATED', 'RESERVED', 'UNDER_MAINTENANCE', 'LOST', 'RETIRED', 'DISPOSED');

-- CreateEnum
CREATE TYPE "AssetCondition" AS ENUM ('NEW', 'EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'DAMAGED');

-- CreateEnum
CREATE TYPE "AssetMediaType" AS ENUM ('IMAGE', 'DOCUMENT');

-- CreateEnum
CREATE TYPE "AssetStatusChangeReason" AS ENUM ('REGISTRATION', 'ALLOCATION', 'RETURN', 'TRANSFER', 'MAINTENANCE_APPROVAL', 'MAINTENANCE_RESOLUTION', 'AUDIT_VERIFICATION', 'AUDIT_DISCREPANCY', 'MANUAL_UPDATE', 'RETIREMENT', 'DISPOSAL', 'LOSS');

-- CreateEnum
CREATE TYPE "AllocationStatus" AS ENUM ('ACTIVE', 'RETURN_PENDING', 'RETURNED', 'TRANSFER_PENDING', 'TRANSFERRED', 'OVERDUE', 'REVOKED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TransferRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ReturnStatus" AS ENUM ('PENDING_INSPECTION', 'APPROVED', 'REJECTED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "AllocationHistoryEvent" AS ENUM ('ALLOCATED', 'RETURN_REQUESTED', 'RETURN_APPROVED', 'RETURN_REJECTED', 'RETURNED', 'TRANSFER_REQUESTED', 'TRANSFER_APPROVED', 'TRANSFER_REJECTED', 'TRANSFERRED', 'OVERDUE_FLAGGED', 'REVOKED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED', 'REJECTED');

-- CreateEnum
CREATE TYPE "BookingType" AS ENUM ('ROOM', 'VEHICLE', 'EQUIPMENT', 'SPACE', 'OTHER');

-- CreateEnum
CREATE TYPE "BookingAudience" AS ENUM ('INDIVIDUAL', 'DEPARTMENT');

-- CreateEnum
CREATE TYPE "MaintenancePriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "MaintenanceStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'TECHNICIAN_ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MaintenanceHistoryEvent" AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED', 'TECHNICIAN_ASSIGNED', 'STARTED', 'RESOLVED', 'CANCELLED', 'STATUS_CHANGED', 'NOTE_ADDED');

-- CreateEnum
CREATE TYPE "AuditCycleStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'IN_PROGRESS', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AuditScopeType" AS ENUM ('DEPARTMENT', 'LOCATION', 'CUSTOM');

-- CreateEnum
CREATE TYPE "AuditAssignmentStatus" AS ENUM ('ASSIGNED', 'IN_PROGRESS', 'SUBMITTED', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AuditFinding" AS ENUM ('VERIFIED', 'MISSING', 'DAMAGED');

-- CreateEnum
CREATE TYPE "AuditDiscrepancyStatus" AS ENUM ('OPEN', 'CONFIRMED', 'DISMISSED', 'RESOLVED');

-- CreateEnum
CREATE TYPE "AuditDiscrepancySeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('GENERAL', 'ASSET_ASSIGNED', 'ASSET_RETURNED', 'TRANSFER_REQUESTED', 'TRANSFER_APPROVED', 'TRANSFER_REJECTED', 'MAINTENANCE_REQUESTED', 'MAINTENANCE_APPROVED', 'MAINTENANCE_REJECTED', 'MAINTENANCE_RESOLVED', 'BOOKING_CONFIRMED', 'BOOKING_CANCELLED', 'BOOKING_REMINDER', 'OVERDUE_RETURN', 'AUDIT_ASSIGNED', 'AUDIT_DISCREPANCY', 'SYSTEM');

-- CreateEnum
CREATE TYPE "NotificationPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('UNREAD', 'READ', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ActivityActionType" AS ENUM ('CREATED', 'UPDATED', 'DELETED', 'ASSIGNED', 'APPROVED', 'REJECTED', 'BOOKED', 'RETURNED', 'TRANSFER_REQUESTED', 'TRANSFER_APPROVED', 'TRANSFER_REJECTED', 'MAINTENANCE_REQUESTED', 'MAINTENANCE_APPROVED', 'MAINTENANCE_REJECTED', 'AUDIT_CREATED', 'AUDIT_SUBMITTED', 'AUDIT_CLOSED', 'LOGIN', 'LOGOUT', 'SYSTEM_EVENT');

-- CreateEnum
CREATE TYPE "DashboardScope" AS ENUM ('GLOBAL', 'DEPARTMENT', 'EMPLOYEE');

-- CreateEnum
CREATE TYPE "CustomFieldDataType" AS ENUM ('STRING', 'NUMBER', 'BOOLEAN', 'DATE', 'JSON');

-- CreateEnum
CREATE TYPE "OutboxEventStatus" AS ENUM ('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'EMPLOYEE',
    "status" "AccountStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "authProvider" "AuthProvider" NOT NULL DEFAULT 'LOCAL',
    "emailVerifiedAt" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employees" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "employeeCode" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "avatarUrl" TEXT,
    "designation" TEXT,
    "status" "EmployeeStatus" NOT NULL DEFAULT 'ACTIVE',
    "departmentId" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "notes" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "status" "DepartmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "parentDepartmentId" TEXT,
    "headEmployeeId" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "status" "AssetCategoryStatus" NOT NULL DEFAULT 'ACTIVE',
    "warrantyMonths" INTEGER,
    "hasSerialNumber" BOOLEAN NOT NULL DEFAULT true,
    "isBookable" BOOLEAN NOT NULL DEFAULT false,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets" (
    "id" TEXT NOT NULL,
    "assetTag" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "serialNumber" TEXT,
    "acquisitionDate" TIMESTAMP(3),
    "acquisitionCost" DECIMAL(12,2),
    "condition" "AssetCondition" NOT NULL DEFAULT 'GOOD',
    "status" "AssetStatus" NOT NULL DEFAULT 'AVAILABLE',
    "location" TEXT,
    "description" TEXT,
    "departmentId" TEXT,
    "sharedBookable" BOOLEAN NOT NULL DEFAULT false,
    "qrEnabled" BOOLEAN NOT NULL DEFAULT true,
    "retiredAt" TIMESTAMP(3),
    "disposedAt" TIMESTAMP(3),
    "lostAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_qr_codes" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "qrCodeValue" TEXT NOT NULL,
    "qrPayload" TEXT,
    "scanCount" INTEGER NOT NULL DEFAULT 0,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastScannedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_qr_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_images" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "fileName" TEXT,
    "mimeType" TEXT,
    "fileSize" INTEGER,
    "mediaType" "AssetMediaType" NOT NULL DEFAULT 'IMAGE',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "altText" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_documents" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "fileName" TEXT,
    "mimeType" TEXT,
    "fileSize" INTEGER,
    "mediaType" "AssetMediaType" NOT NULL DEFAULT 'DOCUMENT',
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_status_history" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "fromStatus" "AssetStatus",
    "toStatus" "AssetStatus" NOT NULL,
    "fromCondition" "AssetCondition",
    "toCondition" "AssetCondition",
    "reason" "AssetStatusChangeReason" NOT NULL,
    "note" TEXT,
    "changedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asset_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_allocations" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "allocatedToEmployeeId" TEXT,
    "allocatedToDepartmentId" TEXT,
    "allocatedById" TEXT,
    "approvedById" TEXT,
    "status" "AllocationStatus" NOT NULL DEFAULT 'ACTIVE',
    "allocatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expectedReturnDate" TIMESTAMP(3),
    "actualReturnDate" TIMESTAMP(3),
    "allocationNote" TEXT,
    "returnNote" TEXT,
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_transfer_requests" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "currentAllocationId" TEXT,
    "requestedById" TEXT NOT NULL,
    "fromEmployeeId" TEXT,
    "fromDepartmentId" TEXT,
    "toEmployeeId" TEXT,
    "toDepartmentId" TEXT,
    "status" "TransferRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT NOT NULL,
    "decisionNote" TEXT,
    "reviewedById" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_transfer_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_returns" (
    "id" TEXT NOT NULL,
    "assetAllocationId" TEXT NOT NULL,
    "returnedById" TEXT,
    "receivedById" TEXT,
    "status" "ReturnStatus" NOT NULL DEFAULT 'PENDING_INSPECTION',
    "conditionOnReturn" "AssetCondition",
    "conditionNotes" TEXT,
    "inspectionNotes" TEXT,
    "returnRequestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "returnedAt" TIMESTAMP(3),
    "inspectedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_returns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "allocation_history" (
    "id" TEXT NOT NULL,
    "allocationId" TEXT NOT NULL,
    "event" "AllocationHistoryEvent" NOT NULL,
    "actorId" TEXT,
    "previousStatus" "AllocationStatus",
    "newStatus" "AllocationStatus",
    "note" TEXT,
    "metadata" JSONB,
    "happenedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "allocation_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resource_bookings" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "bookedById" TEXT NOT NULL,
    "bookedForDepartmentId" TEXT,
    "approvedById" TEXT,
    "title" TEXT NOT NULL,
    "purpose" "BookingType" NOT NULL DEFAULT 'OTHER',
    "audience" "BookingAudience" NOT NULL DEFAULT 'INDIVIDUAL',
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "locationNote" TEXT,
    "notes" TEXT,
    "cancellationReason" TEXT,
    "rescheduleReason" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resource_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_requests" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "approvedById" TEXT,
    "assignedTechnicianId" TEXT,
    "priority" "MaintenancePriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "MaintenanceStatus" NOT NULL DEFAULT 'PENDING',
    "issueTitle" TEXT NOT NULL,
    "issueDescription" TEXT NOT NULL,
    "approvalNote" TEXT,
    "rejectionReason" TEXT,
    "resolutionNote" TEXT,
    "technicianNote" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "technicianAssignedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maintenance_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_attachments" (
    "id" TEXT NOT NULL,
    "maintenanceRequestId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "fileName" TEXT,
    "mimeType" TEXT,
    "fileSize" INTEGER,
    "caption" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maintenance_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_history" (
    "id" TEXT NOT NULL,
    "maintenanceRequestId" TEXT NOT NULL,
    "event" "MaintenanceHistoryEvent" NOT NULL,
    "actorId" TEXT,
    "previousStatus" "MaintenanceStatus",
    "newStatus" "MaintenanceStatus",
    "note" TEXT,
    "metadata" JSONB,
    "happenedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "maintenance_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_cycles" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "scopeType" "AuditScopeType" NOT NULL DEFAULT 'DEPARTMENT',
    "departmentId" TEXT,
    "locationFilter" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "AuditCycleStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT,
    "submittedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancellationNote" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "audit_cycles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_assignments" (
    "id" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "auditorId" TEXT NOT NULL,
    "assignedById" TEXT,
    "status" "AuditAssignmentStatus" NOT NULL DEFAULT 'ASSIGNED',
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "notes" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "audit_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_results" (
    "id" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "auditorId" TEXT,
    "finding" "AuditFinding" NOT NULL,
    "observedCondition" "AssetCondition",
    "observedStatus" "AssetStatus",
    "observedLocation" TEXT,
    "notes" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "audit_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_discrepancies" (
    "id" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "auditResultId" TEXT,
    "status" "AuditDiscrepancyStatus" NOT NULL DEFAULT 'OPEN',
    "severity" "AuditDiscrepancySeverity" NOT NULL DEFAULT 'MEDIUM',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "resolutionNote" TEXT,
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "audit_discrepancies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "recipientUserId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL DEFAULT 'GENERAL',
    "priority" "NotificationPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "NotificationStatus" NOT NULL DEFAULT 'UNREAD',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "actionUrl" TEXT,
    "entityType" TEXT,
    "entityId" TEXT,
    "payload" JSONB,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT,
    "actorEmployeeId" TEXT,
    "action" "ActivityActionType" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "description" TEXT NOT NULL,
    "beforeData" JSONB,
    "afterData" JSONB,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dashboard_kpi_snapshots" (
    "id" TEXT NOT NULL,
    "scope" "DashboardScope" NOT NULL DEFAULT 'GLOBAL',
    "scopeKey" TEXT NOT NULL,
    "departmentId" TEXT,
    "employeeId" TEXT,
    "snapshotDate" TIMESTAMP(3) NOT NULL,
    "assetsAvailable" INTEGER NOT NULL DEFAULT 0,
    "assetsAllocated" INTEGER NOT NULL DEFAULT 0,
    "maintenanceToday" INTEGER NOT NULL DEFAULT 0,
    "activeBookings" INTEGER NOT NULL DEFAULT 0,
    "pendingTransfers" INTEGER NOT NULL DEFAULT 0,
    "upcomingReturns" INTEGER NOT NULL DEFAULT 0,
    "overdueReturns" INTEGER NOT NULL DEFAULT 0,
    "extraMetrics" JSONB,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dashboard_kpi_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_category_field_definitions" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "dataType" "CustomFieldDataType" NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_category_field_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_category_field_values" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "fieldDefinitionId" TEXT NOT NULL,
    "valueString" TEXT,
    "valueNumber" DECIMAL(18,4),
    "valueBoolean" BOOLEAN,
    "valueDate" TIMESTAMP(3),
    "valueJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_category_field_values_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbox_events" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "aggregateType" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "OutboxEventStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_status_isDeleted_idx" ON "users"("status", "isDeleted");

-- CreateIndex
CREATE UNIQUE INDEX "employees_userId_key" ON "employees"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "employees_employeeCode_key" ON "employees"("employeeCode");

-- CreateIndex
CREATE INDEX "employees_departmentId_idx" ON "employees"("departmentId");

-- CreateIndex
CREATE INDEX "employees_status_isDeleted_idx" ON "employees"("status", "isDeleted");

-- CreateIndex
CREATE UNIQUE INDEX "departments_code_key" ON "departments"("code");

-- CreateIndex
CREATE INDEX "departments_parentDepartmentId_idx" ON "departments"("parentDepartmentId");

-- CreateIndex
CREATE INDEX "departments_headEmployeeId_idx" ON "departments"("headEmployeeId");

-- CreateIndex
CREATE INDEX "departments_status_isDeleted_idx" ON "departments"("status", "isDeleted");

-- CreateIndex
CREATE UNIQUE INDEX "departments_name_parentDepartmentId_key" ON "departments"("name", "parentDepartmentId");

-- CreateIndex
CREATE UNIQUE INDEX "asset_categories_code_key" ON "asset_categories"("code");

-- CreateIndex
CREATE INDEX "asset_categories_status_isDeleted_idx" ON "asset_categories"("status", "isDeleted");

-- CreateIndex
CREATE UNIQUE INDEX "asset_categories_name_key" ON "asset_categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_tokenHash_key" ON "sessions"("tokenHash");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE INDEX "sessions_expiresAt_idx" ON "sessions"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_tokenHash_key" ON "password_reset_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "password_reset_tokens_userId_idx" ON "password_reset_tokens"("userId");

-- CreateIndex
CREATE INDEX "password_reset_tokens_expiresAt_idx" ON "password_reset_tokens"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "assets_assetTag_key" ON "assets"("assetTag");

-- CreateIndex
CREATE UNIQUE INDEX "assets_serialNumber_key" ON "assets"("serialNumber");

-- CreateIndex
CREATE INDEX "assets_categoryId_idx" ON "assets"("categoryId");

-- CreateIndex
CREATE INDEX "assets_departmentId_idx" ON "assets"("departmentId");

-- CreateIndex
CREATE INDEX "assets_status_isDeleted_idx" ON "assets"("status", "isDeleted");

-- CreateIndex
CREATE INDEX "assets_condition_idx" ON "assets"("condition");

-- CreateIndex
CREATE INDEX "assets_sharedBookable_idx" ON "assets"("sharedBookable");

-- CreateIndex
CREATE INDEX "assets_name_idx" ON "assets"("name");

-- CreateIndex
CREATE UNIQUE INDEX "asset_qr_codes_assetId_key" ON "asset_qr_codes"("assetId");

-- CreateIndex
CREATE UNIQUE INDEX "asset_qr_codes_qrCodeValue_key" ON "asset_qr_codes"("qrCodeValue");

-- CreateIndex
CREATE INDEX "asset_qr_codes_isActive_idx" ON "asset_qr_codes"("isActive");

-- CreateIndex
CREATE INDEX "asset_qr_codes_generatedAt_idx" ON "asset_qr_codes"("generatedAt");

-- CreateIndex
CREATE INDEX "asset_images_assetId_idx" ON "asset_images"("assetId");

-- CreateIndex
CREATE INDEX "asset_images_isPrimary_idx" ON "asset_images"("isPrimary");

-- CreateIndex
CREATE INDEX "asset_images_sortOrder_idx" ON "asset_images"("sortOrder");

-- CreateIndex
CREATE INDEX "asset_documents_assetId_idx" ON "asset_documents"("assetId");

-- CreateIndex
CREATE INDEX "asset_documents_sortOrder_idx" ON "asset_documents"("sortOrder");

-- CreateIndex
CREATE INDEX "asset_status_history_assetId_createdAt_idx" ON "asset_status_history"("assetId", "createdAt");

-- CreateIndex
CREATE INDEX "asset_status_history_changedById_idx" ON "asset_status_history"("changedById");

-- CreateIndex
CREATE INDEX "asset_status_history_reason_idx" ON "asset_status_history"("reason");

-- CreateIndex
CREATE INDEX "asset_allocations_assetId_status_idx" ON "asset_allocations"("assetId", "status");

-- CreateIndex
CREATE INDEX "asset_allocations_allocatedToEmployeeId_idx" ON "asset_allocations"("allocatedToEmployeeId");

-- CreateIndex
CREATE INDEX "asset_allocations_allocatedToDepartmentId_idx" ON "asset_allocations"("allocatedToDepartmentId");

-- CreateIndex
CREATE INDEX "asset_allocations_allocatedById_idx" ON "asset_allocations"("allocatedById");

-- CreateIndex
CREATE INDEX "asset_allocations_approvedById_idx" ON "asset_allocations"("approvedById");

-- CreateIndex
CREATE INDEX "asset_allocations_expectedReturnDate_idx" ON "asset_allocations"("expectedReturnDate");

-- CreateIndex
CREATE INDEX "asset_allocations_isCurrent_isDeleted_idx" ON "asset_allocations"("isCurrent", "isDeleted");

-- CreateIndex
CREATE INDEX "asset_transfer_requests_assetId_status_idx" ON "asset_transfer_requests"("assetId", "status");

-- CreateIndex
CREATE INDEX "asset_transfer_requests_currentAllocationId_idx" ON "asset_transfer_requests"("currentAllocationId");

-- CreateIndex
CREATE INDEX "asset_transfer_requests_requestedById_idx" ON "asset_transfer_requests"("requestedById");

-- CreateIndex
CREATE INDEX "asset_transfer_requests_fromEmployeeId_idx" ON "asset_transfer_requests"("fromEmployeeId");

-- CreateIndex
CREATE INDEX "asset_transfer_requests_fromDepartmentId_idx" ON "asset_transfer_requests"("fromDepartmentId");

-- CreateIndex
CREATE INDEX "asset_transfer_requests_toEmployeeId_idx" ON "asset_transfer_requests"("toEmployeeId");

-- CreateIndex
CREATE INDEX "asset_transfer_requests_toDepartmentId_idx" ON "asset_transfer_requests"("toDepartmentId");

-- CreateIndex
CREATE INDEX "asset_transfer_requests_reviewedById_idx" ON "asset_transfer_requests"("reviewedById");

-- CreateIndex
CREATE INDEX "asset_transfer_requests_requestedAt_idx" ON "asset_transfer_requests"("requestedAt");

-- CreateIndex
CREATE INDEX "asset_transfer_requests_status_isDeleted_idx" ON "asset_transfer_requests"("status", "isDeleted");

-- CreateIndex
CREATE UNIQUE INDEX "asset_returns_assetAllocationId_key" ON "asset_returns"("assetAllocationId");

-- CreateIndex
CREATE INDEX "asset_returns_returnedById_idx" ON "asset_returns"("returnedById");

-- CreateIndex
CREATE INDEX "asset_returns_receivedById_idx" ON "asset_returns"("receivedById");

-- CreateIndex
CREATE INDEX "asset_returns_returnedAt_idx" ON "asset_returns"("returnedAt");

-- CreateIndex
CREATE INDEX "asset_returns_status_isDeleted_idx" ON "asset_returns"("status", "isDeleted");

-- CreateIndex
CREATE INDEX "allocation_history_allocationId_happenedAt_idx" ON "allocation_history"("allocationId", "happenedAt");

-- CreateIndex
CREATE INDEX "allocation_history_actorId_idx" ON "allocation_history"("actorId");

-- CreateIndex
CREATE INDEX "allocation_history_event_isDeleted_idx" ON "allocation_history"("event", "isDeleted");

-- CreateIndex
CREATE INDEX "resource_bookings_assetId_startAt_endAt_idx" ON "resource_bookings"("assetId", "startAt", "endAt");

-- CreateIndex
CREATE INDEX "resource_bookings_bookedById_idx" ON "resource_bookings"("bookedById");

-- CreateIndex
CREATE INDEX "resource_bookings_bookedForDepartmentId_idx" ON "resource_bookings"("bookedForDepartmentId");

-- CreateIndex
CREATE INDEX "resource_bookings_approvedById_idx" ON "resource_bookings"("approvedById");

-- CreateIndex
CREATE INDEX "resource_bookings_startAt_idx" ON "resource_bookings"("startAt");

-- CreateIndex
CREATE INDEX "resource_bookings_endAt_idx" ON "resource_bookings"("endAt");

-- CreateIndex
CREATE INDEX "resource_bookings_status_isDeleted_idx" ON "resource_bookings"("status", "isDeleted");

-- CreateIndex
CREATE INDEX "maintenance_requests_assetId_status_idx" ON "maintenance_requests"("assetId", "status");

-- CreateIndex
CREATE INDEX "maintenance_requests_requestedById_idx" ON "maintenance_requests"("requestedById");

-- CreateIndex
CREATE INDEX "maintenance_requests_approvedById_idx" ON "maintenance_requests"("approvedById");

-- CreateIndex
CREATE INDEX "maintenance_requests_assignedTechnicianId_idx" ON "maintenance_requests"("assignedTechnicianId");

-- CreateIndex
CREATE INDEX "maintenance_requests_priority_idx" ON "maintenance_requests"("priority");

-- CreateIndex
CREATE INDEX "maintenance_requests_requestedAt_idx" ON "maintenance_requests"("requestedAt");

-- CreateIndex
CREATE INDEX "maintenance_requests_status_isDeleted_idx" ON "maintenance_requests"("status", "isDeleted");

-- CreateIndex
CREATE INDEX "maintenance_attachments_maintenanceRequestId_idx" ON "maintenance_attachments"("maintenanceRequestId");

-- CreateIndex
CREATE INDEX "maintenance_attachments_isPrimary_idx" ON "maintenance_attachments"("isPrimary");

-- CreateIndex
CREATE INDEX "maintenance_attachments_sortOrder_idx" ON "maintenance_attachments"("sortOrder");

-- CreateIndex
CREATE INDEX "maintenance_history_maintenanceRequestId_happenedAt_idx" ON "maintenance_history"("maintenanceRequestId", "happenedAt");

-- CreateIndex
CREATE INDEX "maintenance_history_actorId_idx" ON "maintenance_history"("actorId");

-- CreateIndex
CREATE INDEX "maintenance_history_event_isDeleted_idx" ON "maintenance_history"("event", "isDeleted");

-- CreateIndex
CREATE INDEX "audit_cycles_departmentId_idx" ON "audit_cycles"("departmentId");

-- CreateIndex
CREATE INDEX "audit_cycles_scopeType_idx" ON "audit_cycles"("scopeType");

-- CreateIndex
CREATE INDEX "audit_cycles_createdById_idx" ON "audit_cycles"("createdById");

-- CreateIndex
CREATE INDEX "audit_cycles_startDate_idx" ON "audit_cycles"("startDate");

-- CreateIndex
CREATE INDEX "audit_cycles_endDate_idx" ON "audit_cycles"("endDate");

-- CreateIndex
CREATE INDEX "audit_cycles_status_isDeleted_idx" ON "audit_cycles"("status", "isDeleted");

-- CreateIndex
CREATE INDEX "audit_assignments_cycleId_idx" ON "audit_assignments"("cycleId");

-- CreateIndex
CREATE INDEX "audit_assignments_auditorId_idx" ON "audit_assignments"("auditorId");

-- CreateIndex
CREATE INDEX "audit_assignments_assignedById_idx" ON "audit_assignments"("assignedById");

-- CreateIndex
CREATE INDEX "audit_assignments_status_isDeleted_idx" ON "audit_assignments"("status", "isDeleted");

-- CreateIndex
CREATE UNIQUE INDEX "audit_assignments_cycleId_auditorId_key" ON "audit_assignments"("cycleId", "auditorId");

-- CreateIndex
CREATE INDEX "audit_results_cycleId_idx" ON "audit_results"("cycleId");

-- CreateIndex
CREATE INDEX "audit_results_assetId_idx" ON "audit_results"("assetId");

-- CreateIndex
CREATE INDEX "audit_results_auditorId_idx" ON "audit_results"("auditorId");

-- CreateIndex
CREATE INDEX "audit_results_reviewedById_idx" ON "audit_results"("reviewedById");

-- CreateIndex
CREATE INDEX "audit_results_finding_isDeleted_idx" ON "audit_results"("finding", "isDeleted");

-- CreateIndex
CREATE UNIQUE INDEX "audit_results_cycleId_assetId_key" ON "audit_results"("cycleId", "assetId");

-- CreateIndex
CREATE UNIQUE INDEX "audit_discrepancies_auditResultId_key" ON "audit_discrepancies"("auditResultId");

-- CreateIndex
CREATE INDEX "audit_discrepancies_cycleId_idx" ON "audit_discrepancies"("cycleId");

-- CreateIndex
CREATE INDEX "audit_discrepancies_assetId_idx" ON "audit_discrepancies"("assetId");

-- CreateIndex
CREATE INDEX "audit_discrepancies_severity_idx" ON "audit_discrepancies"("severity");

-- CreateIndex
CREATE INDEX "audit_discrepancies_resolvedById_idx" ON "audit_discrepancies"("resolvedById");

-- CreateIndex
CREATE INDEX "audit_discrepancies_status_isDeleted_idx" ON "audit_discrepancies"("status", "isDeleted");

-- CreateIndex
CREATE INDEX "notifications_recipientUserId_status_isDeleted_idx" ON "notifications"("recipientUserId", "status", "isDeleted");

-- CreateIndex
CREATE INDEX "notifications_recipientUserId_type_idx" ON "notifications"("recipientUserId", "type");

-- CreateIndex
CREATE INDEX "notifications_priority_idx" ON "notifications"("priority");

-- CreateIndex
CREATE INDEX "notifications_sentAt_idx" ON "notifications"("sentAt");

-- CreateIndex
CREATE INDEX "notifications_entityType_entityId_idx" ON "notifications"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "activity_logs_actorUserId_idx" ON "activity_logs"("actorUserId");

-- CreateIndex
CREATE INDEX "activity_logs_actorEmployeeId_idx" ON "activity_logs"("actorEmployeeId");

-- CreateIndex
CREATE INDEX "activity_logs_entityType_entityId_idx" ON "activity_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "activity_logs_occurredAt_idx" ON "activity_logs"("occurredAt");

-- CreateIndex
CREATE INDEX "activity_logs_action_isDeleted_idx" ON "activity_logs"("action", "isDeleted");

-- CreateIndex
CREATE INDEX "dashboard_kpi_snapshots_departmentId_idx" ON "dashboard_kpi_snapshots"("departmentId");

-- CreateIndex
CREATE INDEX "dashboard_kpi_snapshots_employeeId_idx" ON "dashboard_kpi_snapshots"("employeeId");

-- CreateIndex
CREATE INDEX "dashboard_kpi_snapshots_snapshotDate_idx" ON "dashboard_kpi_snapshots"("snapshotDate");

-- CreateIndex
CREATE INDEX "dashboard_kpi_snapshots_scope_isDeleted_idx" ON "dashboard_kpi_snapshots"("scope", "isDeleted");

-- CreateIndex
CREATE UNIQUE INDEX "dashboard_kpi_snapshots_scopeKey_snapshotDate_key" ON "dashboard_kpi_snapshots"("scopeKey", "snapshotDate");

-- CreateIndex
CREATE INDEX "asset_category_field_definitions_categoryId_idx" ON "asset_category_field_definitions"("categoryId");

-- CreateIndex
CREATE INDEX "asset_category_field_definitions_isActive_idx" ON "asset_category_field_definitions"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "asset_category_field_definitions_categoryId_key_key" ON "asset_category_field_definitions"("categoryId", "key");

-- CreateIndex
CREATE INDEX "asset_category_field_values_assetId_idx" ON "asset_category_field_values"("assetId");

-- CreateIndex
CREATE INDEX "asset_category_field_values_fieldDefinitionId_idx" ON "asset_category_field_values"("fieldDefinitionId");

-- CreateIndex
CREATE UNIQUE INDEX "asset_category_field_values_assetId_fieldDefinitionId_key" ON "asset_category_field_values"("assetId", "fieldDefinitionId");

-- CreateIndex
CREATE UNIQUE INDEX "system_settings_key_key" ON "system_settings"("key");

-- CreateIndex
CREATE INDEX "system_settings_isActive_idx" ON "system_settings"("isActive");

-- CreateIndex
CREATE INDEX "outbox_events_status_availableAt_idx" ON "outbox_events"("status", "availableAt");

-- CreateIndex
CREATE INDEX "outbox_events_aggregateType_aggregateId_idx" ON "outbox_events"("aggregateType", "aggregateId");

-- CreateIndex
CREATE INDEX "outbox_events_eventType_idx" ON "outbox_events"("eventType");

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_parentDepartmentId_fkey" FOREIGN KEY ("parentDepartmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_headEmployeeId_fkey" FOREIGN KEY ("headEmployeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "asset_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_qr_codes" ADD CONSTRAINT "asset_qr_codes_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_images" ADD CONSTRAINT "asset_images_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_documents" ADD CONSTRAINT "asset_documents_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_status_history" ADD CONSTRAINT "asset_status_history_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_status_history" ADD CONSTRAINT "asset_status_history_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_allocations" ADD CONSTRAINT "asset_allocations_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_allocations" ADD CONSTRAINT "asset_allocations_allocatedToEmployeeId_fkey" FOREIGN KEY ("allocatedToEmployeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_allocations" ADD CONSTRAINT "asset_allocations_allocatedToDepartmentId_fkey" FOREIGN KEY ("allocatedToDepartmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_allocations" ADD CONSTRAINT "asset_allocations_allocatedById_fkey" FOREIGN KEY ("allocatedById") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_allocations" ADD CONSTRAINT "asset_allocations_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_transfer_requests" ADD CONSTRAINT "asset_transfer_requests_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_transfer_requests" ADD CONSTRAINT "asset_transfer_requests_currentAllocationId_fkey" FOREIGN KEY ("currentAllocationId") REFERENCES "asset_allocations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_transfer_requests" ADD CONSTRAINT "asset_transfer_requests_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_transfer_requests" ADD CONSTRAINT "asset_transfer_requests_fromEmployeeId_fkey" FOREIGN KEY ("fromEmployeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_transfer_requests" ADD CONSTRAINT "asset_transfer_requests_fromDepartmentId_fkey" FOREIGN KEY ("fromDepartmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_transfer_requests" ADD CONSTRAINT "asset_transfer_requests_toEmployeeId_fkey" FOREIGN KEY ("toEmployeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_transfer_requests" ADD CONSTRAINT "asset_transfer_requests_toDepartmentId_fkey" FOREIGN KEY ("toDepartmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_transfer_requests" ADD CONSTRAINT "asset_transfer_requests_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_returns" ADD CONSTRAINT "asset_returns_assetAllocationId_fkey" FOREIGN KEY ("assetAllocationId") REFERENCES "asset_allocations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_returns" ADD CONSTRAINT "asset_returns_returnedById_fkey" FOREIGN KEY ("returnedById") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_returns" ADD CONSTRAINT "asset_returns_receivedById_fkey" FOREIGN KEY ("receivedById") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "allocation_history" ADD CONSTRAINT "allocation_history_allocationId_fkey" FOREIGN KEY ("allocationId") REFERENCES "asset_allocations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "allocation_history" ADD CONSTRAINT "allocation_history_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_bookings" ADD CONSTRAINT "resource_bookings_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_bookings" ADD CONSTRAINT "resource_bookings_bookedById_fkey" FOREIGN KEY ("bookedById") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_bookings" ADD CONSTRAINT "resource_bookings_bookedForDepartmentId_fkey" FOREIGN KEY ("bookedForDepartmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_bookings" ADD CONSTRAINT "resource_bookings_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_assignedTechnicianId_fkey" FOREIGN KEY ("assignedTechnicianId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_attachments" ADD CONSTRAINT "maintenance_attachments_maintenanceRequestId_fkey" FOREIGN KEY ("maintenanceRequestId") REFERENCES "maintenance_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_history" ADD CONSTRAINT "maintenance_history_maintenanceRequestId_fkey" FOREIGN KEY ("maintenanceRequestId") REFERENCES "maintenance_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_history" ADD CONSTRAINT "maintenance_history_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_cycles" ADD CONSTRAINT "audit_cycles_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_cycles" ADD CONSTRAINT "audit_cycles_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_assignments" ADD CONSTRAINT "audit_assignments_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "audit_cycles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_assignments" ADD CONSTRAINT "audit_assignments_auditorId_fkey" FOREIGN KEY ("auditorId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_assignments" ADD CONSTRAINT "audit_assignments_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_results" ADD CONSTRAINT "audit_results_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "audit_cycles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_results" ADD CONSTRAINT "audit_results_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_results" ADD CONSTRAINT "audit_results_auditorId_fkey" FOREIGN KEY ("auditorId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_results" ADD CONSTRAINT "audit_results_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_discrepancies" ADD CONSTRAINT "audit_discrepancies_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "audit_cycles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_discrepancies" ADD CONSTRAINT "audit_discrepancies_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_discrepancies" ADD CONSTRAINT "audit_discrepancies_auditResultId_fkey" FOREIGN KEY ("auditResultId") REFERENCES "audit_results"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_discrepancies" ADD CONSTRAINT "audit_discrepancies_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_actorEmployeeId_fkey" FOREIGN KEY ("actorEmployeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dashboard_kpi_snapshots" ADD CONSTRAINT "dashboard_kpi_snapshots_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dashboard_kpi_snapshots" ADD CONSTRAINT "dashboard_kpi_snapshots_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_category_field_definitions" ADD CONSTRAINT "asset_category_field_definitions_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "asset_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_category_field_values" ADD CONSTRAINT "asset_category_field_values_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_category_field_values" ADD CONSTRAINT "asset_category_field_values_fieldDefinitionId_fkey" FOREIGN KEY ("fieldDefinitionId") REFERENCES "asset_category_field_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
