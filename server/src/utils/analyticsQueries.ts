import { pool } from '../server.js'

/**
 * Analytics query helpers - organized SQL queries for dashboard metrics
 * Keeps queries separate from controllers for better testability and optimization
 */

export const analyticsQueries = {
  // Revenue summary with date range support
  queryRevenueSummary: async (startDate?: string, endDate?: string) => {
    try {
      let query = 'SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE payment_status = $1'
      const params: any[] = ['paid']

      if (startDate && endDate) {
        query += ' AND created_at >= $2 AND created_at <= $3'
        params.push(startDate, endDate)
      }

      const result = await pool.query(query, params)
      return parseFloat(result.rows[0].total)
    } catch (error) {
      console.error('Error in queryRevenueSummary:', error)
      throw error
    }
  },

  // Top products by revenue
  queryTopProducts: async (limit: number = 10) => {
    try {
      const result = await pool.query(
        `SELECT
          p.id,
          p.name,
          p.category,
          COALESCE(SUM(oi.unit_price * oi.quantity), 0) as revenue,
          COALESCE(SUM(oi.quantity), 0) as quantity_sold
        FROM products p
        LEFT JOIN order_items oi ON p.id = oi.product_id
        LEFT JOIN orders o ON oi.order_id = o.id AND o.payment_status = $1
        GROUP BY p.id, p.name, p.category
        ORDER BY revenue DESC
        LIMIT $2`,
        ['paid', limit]
      )
      return result.rows
    } catch (error) {
      console.error('Error in queryTopProducts:', error)
      throw error
    }
  },

  // Payment success rate
  queryPaymentSuccessRate: async () => {
    try {
      const result = await pool.query(
        `SELECT
          COUNT(*) as total,
          SUM(CASE WHEN payment_status = $1 THEN 1 ELSE 0 END) as successful
        FROM orders`,
        ['paid']
      )

      const total = parseInt(result.rows[0].total)
      const successful = parseInt(result.rows[0].successful) || 0

      return total > 0 ? (successful / total) * 100 : 0
    } catch (error) {
      console.error('Error in queryPaymentSuccessRate:', error)
      throw error
    }
  },

  // User growth over specified days
  queryUserGrowth: async (days: number = 30) => {
    try {
      const result = await pool.query(
        `SELECT
          DATE_TRUNC('day', created_at) as date,
          COUNT(*) as new_users
        FROM users
        WHERE created_at >= NOW() - INTERVAL '${days} days'
        GROUP BY DATE_TRUNC('day', created_at)
        ORDER BY date ASC`
      )
      return result.rows
    } catch (error) {
      console.error('Error in queryUserGrowth:', error)
      throw error
    }
  },

  // Event attendance statistics
  queryEventStats: async (limit: number = 10) => {
    try {
      const result = await pool.query(
        `SELECT
          e.id,
          e.name,
          e.capacity,
          COUNT(t.id) as tickets_sold,
          e.price as ticket_price,
          e.event_date
        FROM events e
        LEFT JOIN tickets t ON e.id = t.event_id AND t.payment_status = $1
        GROUP BY e.id, e.name, e.capacity, e.price, e.event_date
        ORDER BY tickets_sold DESC
        LIMIT $2`,
        ['paid', limit]
      )
      return result.rows
    } catch (error) {
      console.error('Error in queryEventStats:', error)
      throw error
    }
  },

  // Equipment rental statistics
  queryEquipmentStats: async () => {
    try {
      const result = await pool.query(
        `SELECT
          e.id,
          e.name,
          COUNT(eh.id) as rentals,
          COALESCE(SUM(CASE WHEN eh.payment_status = $1 THEN eh.total_cost ELSE 0 END), 0) as revenue
        FROM equipment e
        LEFT JOIN equipment_hires eh ON e.id = eh.equipment_id
        GROUP BY e.id, e.name
        ORDER BY revenue DESC`,
        ['paid']
      )
      return result.rows
    } catch (error) {
      console.error('Error in queryEquipmentStats:', error)
      throw error
    }
  },

  // Daily revenue aggregation
  queryDailyRevenue: async (days: number = 30) => {
    try {
      const result = await pool.query(
        `SELECT
          DATE_TRUNC('day', created_at) as date,
          COALESCE(SUM(total_amount), 0) as revenue,
          COUNT(*) as orders
        FROM orders
        WHERE payment_status = $1 AND created_at >= NOW() - INTERVAL '${days} days'
        GROUP BY DATE_TRUNC('day', created_at)
        ORDER BY date ASC`,
        ['paid']
      )
      return result.rows
    } catch (error) {
      console.error('Error in queryDailyRevenue:', error)
      throw error
    }
  },

  // Payment status distribution
  queryPaymentDistribution: async () => {
    try {
      const result = await pool.query(
        `SELECT
          payment_status,
          COUNT(*) as count,
          COALESCE(SUM(total_amount), 0) as total
        FROM orders
        GROUP BY payment_status`
      )
      return result.rows
    } catch (error) {
      console.error('Error in queryPaymentDistribution:', error)
      throw error
    }
  },

  // User statistics
  queryUserStats: async () => {
    try {
      const result = await pool.query(
        `SELECT
          COUNT(*) as total,
          SUM(CASE WHEN role = $1 THEN 1 ELSE 0 END) as admins,
          SUM(CASE WHEN role = $2 THEN 1 ELSE 0 END) as members
        FROM users`,
        ['admin', 'member']
      )
      return result.rows[0]
    } catch (error) {
      console.error('Error in queryUserStats:', error)
      throw error
    }
  },

  // Revenue by category
  queryRevenueByCategory: async () => {
    try {
      const result = await pool.query(
        `SELECT
          p.category,
          COALESCE(SUM(oi.unit_price * oi.quantity), 0) as revenue,
          COALESCE(SUM(oi.quantity), 0) as items_sold,
          COUNT(DISTINCT o.id) as orders
        FROM products p
        LEFT JOIN order_items oi ON p.id = oi.product_id
        LEFT JOIN orders o ON oi.order_id = o.id AND o.payment_status = $1
        GROUP BY p.category
        ORDER BY revenue DESC`,
        ['paid']
      )
      return result.rows
    } catch (error) {
      console.error('Error in queryRevenueByCategory:', error)
      throw error
    }
  },

  // Order statistics
  queryOrderStats: async () => {
    try {
      const result = await pool.query(
        `SELECT
          COUNT(*) as total,
          SUM(CASE WHEN payment_status = $1 THEN 1 ELSE 0 END) as completed,
          COALESCE(AVG(CASE WHEN payment_status = $1 THEN total_amount END), 0) as avg_value
        FROM orders`,
        ['paid']
      )
      return result.rows[0]
    } catch (error) {
      console.error('Error in queryOrderStats:', error)
      throw error
    }
  },

  // Top customers by spending
  queryTopCustomers: async (limit: number = 10) => {
    try {
      const result = await pool.query(
        `SELECT
          u.id,
          u.name,
          u.email,
          COUNT(o.id) as orders,
          COALESCE(SUM(o.total_amount), 0) as total_spent,
          MAX(o.created_at) as last_order
        FROM users u
        LEFT JOIN orders o ON u.id = o.user_id AND o.payment_status = $1
        GROUP BY u.id, u.name, u.email
        HAVING COUNT(o.id) > 0
        ORDER BY total_spent DESC
        LIMIT $2`,
        ['paid', limit]
      )
      return result.rows
    } catch (error) {
      console.error('Error in queryTopCustomers:', error)
      throw error
    }
  },

  // Recent orders
  queryRecentOrders: async (limit: number = 10) => {
    try {
      const result = await pool.query(
        `SELECT
          o.id,
          o.user_id,
          u.name,
          o.total_amount,
          o.payment_status,
          o.created_at,
          COUNT(oi.id) as items
        FROM orders o
        JOIN users u ON o.user_id = u.id
        LEFT JOIN order_items oi ON o.id = oi.order_id
        GROUP BY o.id, o.user_id, u.name, o.total_amount, o.payment_status, o.created_at
        ORDER BY o.created_at DESC
        LIMIT $1`,
        [limit]
      )
      return result.rows
    } catch (error) {
      console.error('Error in queryRecentOrders:', error)
      throw error
    }
  },

  // Count records by status
  queryCountByStatus: async (table: string, statusField: string) => {
    try {
      const sanitizedTable = table.replace(/[^a-zA-Z0-9_]/g, '')
      const sanitizedField = statusField.replace(/[^a-zA-Z0-9_]/g, '')

      const query = `SELECT ${sanitizedField}, COUNT(*) as count FROM ${sanitizedTable} GROUP BY ${sanitizedField}`
      const result = await pool.query(query)
      return result.rows
    } catch (error) {
      console.error('Error in queryCountByStatus:', error)
      throw error
    }
  },
}
