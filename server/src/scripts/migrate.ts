import dotenv from 'dotenv'
import pool from '../config/db.js'
import { runMigrations } from '../utils/runMigrations.js'

dotenv.config()

try {
  await runMigrations()
  console.log('All migrations complete.')
} catch (error) {
  console.error('Migration run failed:', error)
  process.exitCode = 1
} finally {
  await pool.end()
}
