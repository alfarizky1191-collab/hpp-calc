import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  parseExcelBuffer,
  validateMaterialRows,
  getImportSummary,
} from '@/lib/excel/import'
import {
  validateUploadedFile,
  validateFileMagicBytes,
} from '@/lib/security/file-upload'
import { sanitizeError } from '@/lib/security/error-handler'

/**
 * POST /api/import
 *
 * Phase: PARSE_AND_VALIDATE
 * Receives an Excel file, validates it, and returns preview rows.
 * Does NOT write to the database yet.
 *
 * Flow: Upload → Validate → Parse → Preview (this endpoint)
 *       → User confirms → /api/import/confirm (writes to DB)
 */
export async function POST(request: NextRequest) {
  // Auth
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // RBAC: only Owner/Admin can import
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, organization_id')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role === 'STAFF') {
    return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
  }

  // Parse multipart form
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Request tidak valid' }, { status: 400 })
  }

  const file = formData.get('file')
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 400 })
  }

  // ── File validation ────────────────────────────────────────────────────────
  const fileCheck = validateUploadedFile(file)
  if (!fileCheck.valid) {
    return NextResponse.json({ error: fileCheck.error }, { status: 400 })
  }

  // 3. Read buffer
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  // 4. Magic bytes check
  const magicCheck = validateFileMagicBytes(buffer)
  if (!magicCheck.valid) {
    return NextResponse.json({ error: magicCheck.error }, { status: 400 })
  }

  // ── Parse & validate ────────────────────────────────────────────────────────
  let rawRows: Record<string, unknown>[]
  try {
    rawRows = parseExcelBuffer(buffer, 0)
  } catch (err) {
    const msg = sanitizeError(err, 'import/parse')
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  if (rawRows.length === 0) {
    return NextResponse.json(
      { error: 'Sheet pertama tidak memiliki data. Pastikan ada header dan minimal 1 baris data.' },
      { status: 400 }
    )
  }

  const parsedRows = validateMaterialRows(rawRows)
  const summary = getImportSummary(parsedRows)

  // Audit log the upload attempt
  await supabase.rpc('log_audit', {
    p_action: 'IMPORT',
    p_entity_type: 'material_import_preview',
    p_metadata: {
      filename: file.name,
      total_rows: summary.total,
      valid: summary.valid,
      warning: summary.warning,
      error: summary.error,
    },
  })

  return NextResponse.json({
    summary,
    rows: parsedRows.slice(0, 200), // limit preview to 200 rows
    totalRows: parsedRows.length,
  })
}
