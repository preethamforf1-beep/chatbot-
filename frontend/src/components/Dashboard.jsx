// Dashboard Component - Shows HRMS Overview
import { useState, useEffect } from 'react'
import axios from 'axios'
import './Dashboard.css'

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const [employees, payroll] = await Promise.all([
        axios.get('/api/employees'),
        axios.get('/api/payroll/report/summary')
      ])

      setStats({
        totalEmployees: employees.data?.data?.length || 0,
        payroll: payroll.data || payroll
      })
    } catch (err) {
      setError('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="dashboard-loading">Loading...</div>

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2>Dashboard</h2>
        <p>Employee & Payroll Overview</p>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="stats-grid">
        {/* Total Employees */}
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <h3>Total Employees</h3>
            <p className="stat-number">{stats?.totalEmployees || 0}</p>
          </div>
        </div>

        {/* Total Payroll */}
        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <h3>Total Payroll</h3>
            <p className="stat-number">₹{((stats?.payroll?.totalPayroll || 0) / 100000).toFixed(2)}L</p>
          </div>
        </div>

        {/* Average Salary */}
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <h3>Average Salary</h3>
            <p className="stat-number">₹{Math.round((stats?.payroll?.averageSalary || 0) / 100000).toFixed(1)}L</p>
          </div>
        </div>

        {/* Highest Salary */}
        <div className="stat-card">
          <div className="stat-icon">⬆️</div>
          <div className="stat-content">
            <h3>Highest Salary</h3>
            <p className="stat-number">₹{((stats?.payroll?.highestSalary || 0) / 100000).toFixed(1)}L</p>
          </div>
        </div>
      </div>

      <div className="refresh-section">
        <button className="btn btn-primary" onClick={fetchStats}>
          Refresh Data
        </button>
      </div>
    </div>
  )
}
