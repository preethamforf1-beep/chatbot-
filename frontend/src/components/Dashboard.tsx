import { useState, useEffect } from 'react'
import axios from 'axios'
import './Dashboard.css'
import type { DashboardStats } from '../types'

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('overview')

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
        totalEmployees: employees.data?.data?.length ?? 0,
        payroll: payroll.data?.data ?? payroll.data
      })
    } catch {
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
        <p>Employee &amp; Payroll Overview</p>
      </div>

      <div className="dashboard-tabs">
        <button
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          📊 Overview
        </button>
      </div>

      {activeTab === 'overview' && (
        <>
          {error && <div className="error">{error}</div>}

          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">👥</div>
              <div className="stat-content">
                <h3>Total Employees</h3>
                <p className="stat-number">{stats?.totalEmployees ?? 0}</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">💰</div>
              <div className="stat-content">
                <h3>Total Payroll</h3>
                <p className="stat-number">₹{(((stats?.payroll?.totalPayroll ?? 0)) / 100000).toFixed(2)}L</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">📊</div>
              <div className="stat-content">
                <h3>Average Salary</h3>
                <p className="stat-number">₹{Math.round((stats?.payroll?.averageSalary ?? 0) / 100000).toFixed(1)}L</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">⬆️</div>
              <div className="stat-content">
                <h3>Highest Salary</h3>
                <p className="stat-number">₹{((stats?.payroll?.highestSalary ?? 0) / 100000).toFixed(1)}L</p>
              </div>
            </div>
          </div>

          <div className="refresh-section">
            <button className="btn btn-primary" onClick={fetchStats}>
              Refresh Data
            </button>
          </div>
        </>
      )}

    </div>
  )
}
