import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

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

const dbUrl = process.env.SUPABASE_DB_URL

if (!dbUrl) {
  console.error(`
Falta SUPABASE_DB_URL en .env.local

1. Ve a Supabase > Project Settings > Database
2. Copia la connection string (URI) con tu contraseña
3. Agrégala a .env.local:

SUPABASE_DB_URL=postgresql://postgres.[ref]:[PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres

Alternativa: pega supabase/schema.sql en el SQL Editor de Supabase.
`)
  process.exit(1)
}

const schemaPath = resolve(root, 'supabase', 'schema.sql')
const sql = readFileSync(schemaPath, 'utf8')

const client = new pg.Client({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
})

try {
  console.log('Conectando a Supabase Postgres...')
  await client.connect()
  console.log('Ejecutando schema.sql...')
  await client.query(sql)
  console.log('Schema aplicado correctamente.')
} catch (error) {
  console.error('Error al aplicar el schema:', error.message)
  process.exit(1)
} finally {
  await client.end()
}
