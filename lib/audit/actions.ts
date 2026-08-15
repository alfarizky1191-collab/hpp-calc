'use server'

import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/rbac'
import type { Tables } from '@/types/database'

export type AuditLogRow = Tables<'audit_logs'>

export interface AuditLogParams {
  action?: string
  entityType?: string
  actorId?: string
  dateFrom?: string
  dateTo?: string
  page?: number
  pageSize?: number
}

export async function getAuditLogs(params: AuditLogParams = {}) {
  // Only Owner and Admin can view audit logs
  const profile = await requireRole(['OWNER', 'ADMIN'])
  const supabase = await createClient()

  const page = params.page ?? 1
  const pageSize = params.pageSize ?? 50
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('audit_logs')
    .select(
      `
      id,
      organization_id,
      actor_id,
      action,
      entity_type,
      entity_id,
      old_value,
      new_value,
      metadata,
      created_at,
      profiles:actor_id(full_name, role)
    `,
      { count: 'exact' }
    )
    .eq('organization_id', profile.organization_id)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (params.action && params.action !== 'all') {
    // Safe — validated against known enum values below
    const validActions = [
      'LOGIN', 'LOGOUT', 'LOGIN_FAILED', 'CREATE', 'UPDATE', 'DELETE',
      'PRICE_CHANGE', 'IMPORT', 'EXPORT', 'ROLE_CHANGE', 'SETTINGS_CHANGE',
    ]
    if (validActions.includes(params.action)) {
      query = query.eq('action', params.action as AuditLogRow['action'])
    }
  }

  if (params.entityType && params.entityType !== 'all') {
    query = query.eq('entity_type', params.entityType)
  }

  if (params.actorId) {
    query = query.eq('actor_id', params.actorId)
  }

  if (params.dateFrom) {
    query = query.gte('created_at', params.dateFrom)
  }

  if (params.dateTo) {
    // Add 1 day to make it inclusive of the end date
    const to = new Date(params.dateTo)
    to.setDate(to.getDate() + 1)
    query = query.lt('created_at', to.toISOString())
  }

  const { data, count, error } = await query

  if (error) return { data: [], total: 0, error: error.message }
  return { data: data ?? [], total: count ?? 0, error: null }
}

export async function getOrgMembers() {
  const profile = await requireRole(['OWNER', 'ADMIN'])
  const supabase = await createClient()

  const { data } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .eq('organization_id', profile.organization_id)
    .order('full_name')

  return data ?? []
}
