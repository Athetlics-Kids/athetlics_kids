import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

function loadEnvFile(filename) {
  try {
    const content = readFileSync(resolve(root, filename), 'utf8')
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq === -1) continue
      const key = trimmed.slice(0, eq).trim()
      const value = trimmed.slice(eq + 1).trim()
      if (!process.env[key]) process.env[key] = value
    }
  } catch {
    // optional file
  }
}

loadEnvFile('.env.local')
loadEnvFile('.env')

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceRoleKey) {
  console.error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local')
  process.exit(1)
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const tables = [
  'notifications',
  'attendance_records',
  'class_enrollments',
  'payments',
  'class_sessions',
  'students',
  'teacher_schedules',
  'teachers',
  'parents',
  'profiles',
]

async function clearTable(table) {
  const { error, count } = await supabase
    .from(table)
    .delete({ count: 'exact' })
    .not('id', 'is', null)

  if (error) {
    throw new Error(`${table}: ${error.message}`)
  }

  console.log(`  ${table}: ${count ?? 0} filas borradas`)
}

console.log('Borrando datos de Supabase...\n')

try {
  for (const table of tables) {
    await clearTable(table)
  }
  console.log('\nDatos borrados. Las tablas quedaron vacías.')
} catch (error) {
  console.error('\nError:', error.message)
  console.error('\nAlternativa: ejecuta supabase/reset-data.sql en el SQL Editor de Supabase.')
  process.exit(1)
}
