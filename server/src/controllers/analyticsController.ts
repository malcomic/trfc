import { Request, Response } from 'express'
import { pool } from '../server.js'

// Analytics controller with aggregation functions for dashboard metrics

export const analyticsController = {
  // Dashboard Summary - KPI overview
  getDashboardSummary: async (req: Request, res: Response) => {
    try {
      const totalRevenueRes = await pool.query(
        'SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE payment_status = $1',
        ['paid']
      )

      const thisMonthRevenueRes = await pool.query(
        'SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE payment_status = $1 AND created_at >= DATE_TRUNC($2, NOW())',
        ['paid', 'month']
      )

      const totalOrdersRes = await pool.query(
        'SELECT COUNT(*) as total FROM orders'
      )

      const paidOrdersRes = await pool.query(
        'SELECT COUNT(*) as total FROM orders WHERE payment_status = $1',
        ['paid']
      )

      const totalUsersRes = await pool.query(
        'SELECT COUNT(*) as total FROM users'
      )

      const totalRevenue = parseFloat(totalRevenueRes.rows[0].total)
      const thisMonthRevenue = parseFloat(thisMonthRevenueRes.rows[0].total)
      const totalOrders = parseInt(totalOrdersRes.rows[0].total)
      const paidOrders = parseInt(paidOrdersRes.rows[0].total)
      const totalUsers = parseInt(totalUsersRes.rows[0].total)

      const paymentSuccessRate = totalOrders > 0 ? (paidOrders / totalOrders) * 100 : 0
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

      return res.json({
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
        thisMonthRevenue: parseFloat(thisMonthRevenue.toFixed(2)),
        totalOrders,
        paymentSuccessRate: parseFloat(paymentSuccessRate.toFixed(1)),
        totalUsers,
        avgOrderValue: parseFloat(avgOrderValue.toFixed(2)),
      })
    } catch (error: any) {
      console.error('Error in getDashboardSummary:', error)
      return res.status(500).json({ error: 'Failed to fetch dashboard summary' })
    }
  },

  // Revenue by date range
  getRevenueTimeline: async (req: Request, res: Response) => {
    try {
      const { startDate, endDate, days } = req.query
      let query = `
        SELECT
          DATE_TRUNC('day', created_at) as date,
          COALESCE(SUM(total_amount), 0) as revenue,
          COUNT(*) as orders
        FROM orders
        WHERE payment_status = $1
      `
      const params: any[] = ['paid']

      if (days) {
        const daysInt = parseInt(days as string) || 30
        query += ` AND created_at >= NOW() - INTERVAL '1 days' * $2`
        params.push(daysInt)
      } else if (startDate && endDate) {
        query += ` AND created_at >= $2 AND created_at <= $3`
        params.push(startDate, endDate)
      } else {
        query += ` AND created_at >= NOW() - INTERVAL '30 days'`
      }

      query += ` GROUP BY DATE_TRUNC('day', created_at) ORDER BY date ASC`

      const result = await pool.query(query, params)

      return res.json(
        result.rows.map((row: any) => ({
          date: row.date,
          revenue: parseFloat(row.revenue),
          orders: parseInt(row.orders),
        }))
      )
    } catch (error: any) {
      console.error('Error in getRevenueTimeline:', error)
      return res.status(500).json({ error: 'Failed to fetch revenue timeline' })
    }
  },

  // Top products by revenue
  getTopProducts: async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10

      const result = await pool.query(
        `SELECT
          p.id,
          p.name,
          p.category,
          COALESCE(SUM(oi.unit_price * oi.quantity), 0) as revenue,
          COALESCE(SUM(oi.quantity), 0) as quantity_sold,
          MAX(o.created_at) as last_sold
        FROM products p
        LEFT JOIN order_items oi ON p.id = oi.product_id
        LEFT JOIN orders o ON oi.order_id = o.id AND o.payment_status = $1
        GROUP BY p.id, p.name, p.category
        ORDER BY revenue DESC
        LIMIT $2`,
        ['paid', limit]
      )

      return res.json(
        result.rows.map((row: any) => ({
          id: row.id,
          name: row.name,
          category: row.category,
          revenue: parseFloat(row.revenue),
          quantitySold: parseInt(row.quantity_sold),
          lastSold: row.last_sold,
        }))
      )
    } catch (error: any) {
      console.error('Error in getTopProducts:', error)
      return res.status(500).json({ error: 'Failed to fetch top products' })
    }
  },

  // Revenue by product category
  getRevenueByCategory: async (req: Request, res: Response) => {
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

      return res.json(
        result.rows.map((row: any) => ({
          category: row.category,
          revenue: parseFloat(row.revenue),
          itemsSold: parseInt(row.items_sold),
          orders: parseInt(row.orders),
        }))
      )
    } catch (error: any) {
      console.error('Error in getRevenueByCategory:', error)
      return res.status(500).json({ error: 'Failed to fetch revenue by category' })
    }
  },

  // Top events by ticket sales
  getTopEvents: async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10

      const result = await pool.query(
        `SELECT
          e.id,
          e.title,
          e.capacity,
          COUNT(t.id) as tickets_sold,
          e.price as ticket_price,
          COALESCE(SUM(CASE WHEN t.payment_status = $1 THEN e.price ELSE 0 END), 0) as revenue,
          e.event_date
        FROM events e
        LEFT JOIN tickets t ON e.id = t.event_id
        GROUP BY e.id, e.title, e.capacity, e.price, e.event_date
        ORDER BY tickets_sold DESC
        LIMIT $2`,
        ['paid', limit]
      )

      return res.json(
        result.rows.map((row: any) => ({
          id: row.id,
          name: row.title,
          capacity: parseInt(row.capacity),
          ticketsSold: parseInt(row.tickets_sold),
          ticketPrice: parseFloat(row.ticket_price),
          revenue: parseFloat(row.revenue),
          utilization: `${((parseInt(row.tickets_sold) / parseInt(row.capacity)) * 100).toFixed(1)}%`,
          eventDate: row.event_date,
        }))
      )
    } catch (error: any) {
      console.error('Error in getTopEvents:', error)
      return res.status(500).json({ error: 'Failed to fetch top events' })
    }
  },

  // Payment statistics
  getPaymentStats: async (req: Request, res: Response) => {
    try {
      const totalRes = await pool.query(
        'SELECT COUNT(*) as total, COALESCE(SUM(total_amount), 0) as sum FROM orders'
      )

      const statusRes = await pool.query(
        `SELECT
          payment_status,
          COUNT(*) as count,
          COALESCE(SUM(total_amount), 0) as total
        FROM orders
        GROUP BY payment_status`
      )

      const total = parseInt(totalRes.rows[0].total)
      const totalAmount = parseFloat(totalRes.rows[0].sum)

      const statusBreakdown: any = {
        paid: 0,
        pending: 0,
        failed: 0,
      }

      statusRes.rows.forEach((row: any) => {
        statusBreakdown[row.payment_status] = {
          count: parseInt(row.count),
          total: parseFloat(row.total),
        }
      })

      const successRate = total > 0 ? (statusBreakdown.paid?.count / total) * 100 : 0
      const avgAmount = total > 0 ? totalAmount / total : 0

      return res.json({
        total,
        successful: statusBreakdown.paid?.count || 0,
        pending: statusBreakdown.pending?.count || 0,
        failed: statusBreakdown.failed?.count || 0,
        successRate: parseFloat(successRate.toFixed(1)),
        totalAmount: parseFloat(totalAmount.toFixed(2)),
        avgAmount: parseFloat(avgAmount.toFixed(2)),
        breakdown: statusBreakdown,
      })
    } catch (error: any) {
      console.error('Error in getPaymentStats:', error)
      return res.status(500).json({ error: 'Failed to fetch payment stats' })
    }
  },

  // Payment timeline
  getPaymentTimeline: async (req: Request, res: Response) => {
    try {
      const days = parseInt(req.query.days as string) || 30

      const result = await pool.query(
        `SELECT
          DATE_TRUNC('day', created_at) as date,
          COUNT(*) as total,
          SUM(CASE WHEN payment_status = $1 THEN 1 ELSE 0 END) as successful,
          SUM(CASE WHEN payment_status = $2 THEN 1 ELSE 0 END) as failed,
          SUM(CASE WHEN payment_status = $3 THEN 1 ELSE 0 END) as pending
        FROM orders
        WHERE created_at >= NOW() - INTERVAL '1 days' * $4
        GROUP BY DATE_TRUNC('day', created_at)
        ORDER BY date ASC`,
        ['paid', 'failed', 'pending', days]
      )

      return res.json(
        result.rows.map((row: any) => ({
          date: row.date,
          total: parseInt(row.total),
          successful: parseInt(row.successful) || 0,
          failed: parseInt(row.failed) || 0,
          pending: parseInt(row.pending) || 0,
        }))
      )
    } catch (error: any) {
      console.error('Error in getPaymentTimeline:', error)
      return res.status(500).json({ error: 'Failed to fetch payment timeline' })
    }
  },

  // User growth statistics
  getUserStats: async (req: Request, res: Response) => {
    try {
      const totalRes = await pool.query('SELECT COUNT(*) as total FROM users')

      const thisMonthRes = await pool.query(
        `SELECT COUNT(*) as total FROM users
        WHERE created_at >= DATE_TRUNC('month', NOW())
        AND created_at < DATE_TRUNC('month', NOW()) + INTERVAL '1 month'`
      )

      const thisWeekRes = await pool.query(
        `SELECT COUNT(*) as total FROM users
        WHERE created_at >= DATE_TRUNC('week', NOW())
        AND created_at < DATE_TRUNC('week', NOW()) + INTERVAL '7 days'`
      )

      const roleRes = await pool.query(
        `SELECT role, COUNT(*) as count FROM users GROUP BY role`
      )

      const roleBreakdown: any = {}
      roleRes.rows.forEach((row: any) => {
        roleBreakdown[row.role] = parseInt(row.count)
      })

      return res.json({
        total: parseInt(totalRes.rows[0].total),
        thisMonth: parseInt(thisMonthRes.rows[0].total),
        thisWeek: parseInt(thisWeekRes.rows[0].total),
        byRole: roleBreakdown,
      })
    } catch (error: any) {
      console.error('Error in getUserStats:', error)
      return res.status(500).json({ error: 'Failed to fetch user stats' })
    }
  },

  // User growth timeline
  getUserGrowth: async (req: Request, res: Response) => {
    try {
      const days = parseInt(req.query.days as string) || 30

      const result = await pool.query(
        `SELECT
          DATE_TRUNC('day', created_at) as date,
          COUNT(*) as new_users,
          (SELECT COUNT(*) FROM users WHERE created_at <= DATE_TRUNC('day', users.created_at) + INTERVAL '1 day') as cumulative
        FROM users
        WHERE created_at >= NOW() - INTERVAL '1 days' * $1
        GROUP BY DATE_TRUNC('day', created_at)
        ORDER BY date ASC`,
        [days]
      )

      return res.json(
        result.rows.map((row: any) => ({
          date: row.date,
          newUsers: parseInt(row.new_users),
          cumulative: parseInt(row.cumulative) || 0,
        }))
      )
    } catch (error: any) {
      console.error('Error in getUserGrowth:', error)
      return res.status(500).json({ error: 'Failed to fetch user growth' })
    }
  },

  // Order statistics
  getOrderStats: async (req: Request, res: Response) => {
    try {
      const totalRes = await pool.query('SELECT COUNT(*) as total FROM orders')

      const statusRes = await pool.query(
        `SELECT status, COUNT(*) as count FROM (
          SELECT CASE WHEN payment_status = $1 THEN 'completed' ELSE 'pending' END as status FROM orders
        ) as order_status
        GROUP BY status`,
        ['paid']
      )

      const avgRes = await pool.query(
        `SELECT
          COALESCE(AVG(total_amount), 0) as avg_value,
          COALESCE(MAX(total_amount), 0) as max_value,
          COALESCE(MIN(total_amount), 0) as min_value
        FROM orders WHERE payment_status = $1`,
        ['paid']
      )

      const statusBreakdown: any = {
        completed: 0,
        pending: 0,
      }

      statusRes.rows.forEach((row: any) => {
        statusBreakdown[row.status] = parseInt(row.count)
      })

      return res.json({
        total: parseInt(totalRes.rows[0].total),
        completed: statusBreakdown.completed || 0,
        pending: statusBreakdown.pending || 0,
        avgValue: parseFloat(avgRes.rows[0].avg_value),
        maxValue: parseFloat(avgRes.rows[0].max_value),
        minValue: parseFloat(avgRes.rows[0].min_value),
      })
    } catch (error: any) {
      console.error('Error in getOrderStats:', error)
      return res.status(500).json({ error: 'Failed to fetch order stats' })
    }
  },

  // Equipment rental analytics
  getEquipmentStats: async (req: Request, res: Response) => {
    try {
      const result = await pool.query(
        `SELECT
          equipment_name,
          COUNT(id) as rentals,
          COALESCE(SUM(CASE WHEN payment_status = $1 THEN total_cost ELSE 0 END), 0) as revenue,
          COALESCE(AVG(EXTRACT(DAY FROM return_date - hire_date)), 0) as avg_duration_days
        FROM equipment_hire
        WHERE equipment_name IS NOT NULL
        GROUP BY equipment_name
        ORDER BY revenue DESC`,
        ['paid']
      )

      return res.json(
        result.rows.map((row: any) => ({
          name: row.equipment_name,
          rentals: parseInt(row.rentals),
          revenue: parseFloat(row.revenue),
          avgDurationDays: parseFloat(row.avg_duration_days.toFixed(1)),
        }))
      )
    } catch (error: any) {
      console.error('Error in getEquipmentStats:', error)
      return res.status(500).json({ error: 'Failed to fetch equipment stats' })
    }
  },

  // Event attendance vs capacity
  getEventAttendance: async (req: Request, res: Response) => {
    try {
      const result = await pool.query(
        `SELECT
          e.id,
          e.title,
          e.capacity,
          COUNT(t.id) as tickets_sold,
          ROUND(100.0 * COUNT(t.id) / e.capacity, 1) as utilization_percent,
          e.event_date
        FROM events e
        LEFT JOIN tickets t ON e.id = t.event_id AND t.payment_status = $1
        GROUP BY e.id, e.title, e.capacity, e.event_date
        ORDER BY utilization_percent DESC`,
        ['paid']
      )

      return res.json(
        result.rows.map((row: any) => ({
          id: row.id,
          name: row.title,
          capacity: parseInt(row.capacity),
          ticketsSold: parseInt(row.tickets_sold),
          utilization: `${row.utilization_percent}%`,
          eventDate: row.event_date,
        }))
      )
    } catch (error: any) {
      console.error('Error in getEventAttendance:', error)
      return res.status(500).json({ error: 'Failed to fetch event attendance' })
    }
  },
}
