/**
 * Shared application types.
 * Domain-specific types live in their respective modules.
 */

// ---------------------------------------------------------------------------
// User & Auth
// ---------------------------------------------------------------------------

export type UserRole = 'OWNER' | 'ADMIN' | 'STAFF'

export interface UserProfile {
  id: string
  organizationId: string
  role: UserRole
  email: string
  fullName: string | null
  createdAt: string
  updatedAt: string
}

// ---------------------------------------------------------------------------
// Organization
// ---------------------------------------------------------------------------

export interface Organization {
  id: string
  name: string
  createdAt: string
  updatedAt: string
}

// ---------------------------------------------------------------------------
// Generic API responses
// ---------------------------------------------------------------------------

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string }

export type PaginatedResult<T> = {
  data: T[]
  total: number
  page: number
  pageSize: number
}

// ---------------------------------------------------------------------------
// Soft-delete fields
// ---------------------------------------------------------------------------

export interface SoftDeletable {
  deletedAt: string | null
  deletedBy: string | null
}

// ---------------------------------------------------------------------------
// Audit
// ---------------------------------------------------------------------------

export type AuditAction =
  | 'LOGIN'
  | 'LOGOUT'
  | 'LOGIN_FAILED'
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'PRICE_CHANGE'
  | 'IMPORT'
  | 'EXPORT'
  | 'ROLE_CHANGE'
  | 'SETTINGS_CHANGE'
