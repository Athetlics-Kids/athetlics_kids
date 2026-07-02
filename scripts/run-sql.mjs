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

const fileArg = process.argv[2]

if (!fileArg) {
  console.error('Uso: node scripts/run-sql.mjs <archivo.sql>')
  process.exit(1)
}

const dbUrl = process.env.SUPABASE_DB_URL

if (!dbUrl) {
  console.error('Falta SUPABASE_DB_URL en .env.local')
  process.exit(1)
}

const sqlPath = resolve(root, fileArg)
const sql = readFileSync(sqlPath, 'utf8')

const client = new pg.Client({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
})

try {
  console.log(`Ejecutando ${fileArg}...`)
  await client.connect()
  await client.query(sql)
  console.log('Listo.')
} catch (error) {
  console.error('Error:', error.message)
  process.exit(1)
} finally {
  await client.end()
}
