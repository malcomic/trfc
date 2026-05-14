import { Pool } from 'pg'

let testPool: Pool | null = null

export const getTestDb = () => {
  if (!testPool) {
    testPool = new Pool({
      connectionString: process.env.DATABASE_URL || 'postgresql://postgres:Mkb606605@localhost:5432/trfc_test',
      max: 1,
      idleTimeoutMillis: 5000,
      connectionTimeoutMillis: 5000,
    })
  }
  return testPool
}

export const setupTestDb = async () => {
  const db = getTestDb()
  try {
    // Test connection
    const result = await db.query('SELECT NOW()')
    console.log('Test database connected:', result.rows[0])
  } catch (error) {
    console.error('Failed to connect to test database:', error)
    throw error
  }
}

export const teardownTestDb = async () => {
  if (testPool) {
    await testPool.end()
    testPool = null
  }
}

export const clearTestData = async () => {
  const db = getTestDb()
  try {
    // Clear in order of foreign key dependencies
    await db.query('DELETE FROM order_items')
    await db.query('DELETE FROM orders')
    await db.query('DELETE FROM payment_callbacks')
    await db.query('DELETE FROM tickets')
    await db.query('DELETE FROM equipment_hires')
    await db.query('DELETE FROM products')
    await db.query('DELETE FROM events')
    await db.query('DELETE FROM equipment')
    await db.query('DELETE FROM users')
  } catch (error) {
    console.error('Error clearing test data:', error)
    throw error
  }
}

export const resetTestDb = async () => {
  await clearTestData()
}

// Transaction helpers for atomic test operations
export const withTransaction = async <T>(
  callback: (client: any) => Promise<T>
): Promise<T> => {
  const db = getTestDb()
  const client = await db.connect()
  try {
    await client.query('BEGIN')
    const result = await callback(client)
    await client.query('ROLLBACK') // Always rollback for test isolation
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
