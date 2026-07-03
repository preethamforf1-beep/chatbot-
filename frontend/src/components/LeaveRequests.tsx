import { useState, useEffect } from 'react'
import axios from 'axios'
import './LeaveRequests.css'
import type { LeaveRequest, User } from '../types'

interface LeaveRequestsProps {
  accessToken: string | null;
  user: User | null;
}

interface LeaveFormData {
  leaveType: string;
  startDate: string;
  endDate: string;
  dayType: string;
  reason: string;
}

interface LeaveStatusRow {
  leaveId: number;
  leaveType: string;
  fromDate: string;
  toDate: string;
  appliedDate: string;
  status: string;
}

export default function LeaveRequests({ accessToken, user }: LeaveRequestsProps) {
  const [requests, setRequests] = useState<LeaveRequest[]>([])
  const [allLeaves, setAllLeaves] = useState<LeaveStatusRow[]>([])
  const [loading, setLoading] = useState(true)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState<LeaveFormData>({
    leaveType: 'CL',
    startDate: '',
    endDate: '',
    dayType: 'Full Day',
    reason: ''
  })

  const isAdminOrHR = user?.role === 'admin' || user?.role === 'hr'

  useEffect(() => {
    fetchRequests()
    fetchAllLeaves()
  }, [accessToken, user?.role])

  const fetchRequests = async () => {
    setLoading(true)
    setError(null)

    if (!accessToken) {
      setError('Unable to load leave requests. Please log in again.')
      setLoading(false)
      return
    }

    try {
      const response = await axios.get('/api/leaves', {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
      setRequests(response.data.data || [])
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || err.message || 'Unable to load leave requests.')
      } else {
        setError('Unable to load leave requests.')
      }
    } finally {
      setLoading(false)
    }
  }

  // All of the user's leaves (any status, newest first, incl. pending) via
  // USP_GetLeaveStatus. Complements the list below, which excludes pending.
  const fetchAllLeaves = async () => {
    if (!accessToken) return
    try {
      const response = await axios.get('/api/leaves/all', {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
      setAllLeaves(response.data.data ?? [])
    } catch {
      setAllLeaves([])
    }
  }

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [event.target.name]: event.target.value
    }))
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSubmitLoading(true)
    setError(null)
    setMessage(null)

    try {
      const payload = {
        leaveType: formData.leaveType,
        startDate: formData.startDate,
        endDate: formData.endDate || formData.startDate,
        dayType: formData.dayType,
        reason: formData.reason
      }
      const response = await axios.post('/api/leaves', payload, {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
      if (response.data.success === false) {
        setError(response.data.message || 'Leave request could not be submitted.')
      } else {
        setMessage(response.data.message || 'Leave request submitted successfully.')
        setFormData({ leaveType: 'CL', startDate: '', endDate: '', dayType: 'Full Day', reason: '' })
      }
      fetchRequests()
      fetchAllLeaves()
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || 'Failed to submit leave request.')
      } else {
        setError('Failed to submit leave request.')
      }
    } finally {
      setSubmitLoading(false)
    }
  }

  const handleApprove = async (code: string) => {
    setError(null)
    setMessage(null)

    try {
      const response = await axios.patch(`/api/leaves/${code}/approve`, {}, {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
      if (response.data.success === false) {
        setMessage(response.data.message || 'Approvals are not enabled yet.')
      } else {
        setMessage(`Leave request approved.`)
      }
      fetchRequests()
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || 'Failed to approve leave request.')
      } else {
        setError('Failed to approve leave request.')
      }
    }
  }

  const handleCancel = async (code: string, specificDates: string[] | null = null) => {
    setError(null)
    setMessage(null)

    try {
      const payload = specificDates && specificDates.length > 0 ? { specificDates } : {}
      const response = await axios.patch(`/api/leaves/${code}/cancel`, payload, {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
      if (response.data.success === false) {
        setMessage(response.data.message || 'Cancellation is not available yet.')
      } else {
        setMessage(`Leave request cancelled.`)
      }
      fetchRequests()
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || 'Failed to cancel leave request.')
      } else {
        setError('Failed to cancel leave request.')
      }
    }
  }

  const handleCancelClick = async (request: LeaveRequest) => {
    if (!request.startDate || request.startDate === request.endDate) {
      await handleCancel(request.requestCode)
      return
    }

    const input = window.prompt('Enter date(s) to cancel (comma-separated, format: YYYY-MM-DD). Leave empty to cancel the entire request.')
    if (input === null) return

    const raw = input.trim()
    if (raw === '') {
      await handleCancel(request.requestCode)
      return
    }

    const parts = raw.split(',').map(s => s.trim()).filter(Boolean)
    const valid = parts.every(p => /^\d{4}-\d{2}-\d{2}$/.test(p))
    if (!valid) {
      setError('Invalid date format. Use YYYY-MM-DD, comma-separated for multiple dates.')
      return
    }
    await handleCancel(request.requestCode, parts)
  }

  return (
    <div className="leave-requests-page">
      <div className="leave-requests-header">
        <div className="leave-requests-title-row">
          <div>
            <h2>Leave Requests</h2>
            <p>Apply for leave, track your pending requests, and approve or cancel requests based on your role.</p>
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => { fetchRequests(); fetchAllLeaves(); }}
            disabled={loading}
          >
            {loading ? 'Refreshing...' : 'Refresh Requests'}
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {message && <div className="alert alert-success">{message}</div>}

      {/* All my leaves — every status, newest first, including pending
          (the "My Leave Requests" list below excludes pending). */}
      {allLeaves.length > 0 && (
        <div className="latest-leave-panel">
          <div className="latest-leave-head">
            <span className="latest-leave-title">All My Leaves ({allLeaves.length})</span>
          </div>
          {allLeaves.map((l, i) => (
            <div key={i} className="all-leave-row">
              <span className="all-leave-main">
                <strong>{l.leaveType}</strong>{' '}
                {l.fromDate === l.toDate ? `on ${l.fromDate}` : `from ${l.fromDate} to ${l.toDate}`}
              </span>
              <span className={`status-badge status-${(l.status || '').toLowerCase()}`}>{l.status}</span>
            </div>
          ))}
        </div>
      )}

      <div className="leave-requests-grid">
        <section className="leave-form-panel">
          <h3>New Leave Request</h3>
          <form onSubmit={handleSubmit} className="leave-form">
            <label>
              Leave type
              <select name="leaveType" value={formData.leaveType} onChange={handleChange}>
                <option value="CL">CL</option>
                <option value="EL">EL</option>
                <option value="Sick">Sick</option>
                <option value="LOP">LOP</option>
                <option value="WFH">WFH</option>
              </select>
            </label>

            <label>
              Start date
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                required
              />
            </label>

            <label>
              End date
              <input
                type="date"
                name="endDate"
                value={formData.endDate}
                onChange={handleChange}
              />
              <span className="hint">Leave empty for a single-day request.</span>
            </label>

            <label>
              Day type
              <select name="dayType" value={formData.dayType} onChange={handleChange}>
                <option value="Full Day">Full Day</option>
                <option value="First Half">First Half</option>
                <option value="Second Half">Second Half</option>
              </select>
            </label>

            <label>
              Reason (optional)
              <textarea
                name="reason"
                value={formData.reason}
                onChange={handleChange}
                rows={3}
                placeholder="Personal work, medical, family reason, etc."
              />
            </label>

            <button type="submit" className="btn btn-primary" disabled={submitLoading}>
              {submitLoading ? 'Submitting...' : 'Submit Leave Request'}
            </button>
          </form>
        </section>

        <section className="leave-list-panel">
          <div className="leave-list-header">
            <h3>{isAdminOrHR ? 'All Leave Requests' : 'My Leave Requests'}</h3>
          </div>

          {loading ? (
            <div className="loading-state">Loading requests…</div>
          ) : requests.length === 0 ? (
            <div className="empty-state">No acted-on leave requests yet. See "All My Leaves" above for pending ones.</div>
          ) : (
            <div className="leave-cards">
              {requests.map(request => (
                <div key={request.requestCode} className="leave-card">
                  <div className="leave-card-row">
                    <strong>{request.requestCode}</strong>
                    <span className={`status-badge status-${request.status}`}>{request.status}</span>
                  </div>
                  {request.employeeId && <p><strong>Employee ID:</strong> {request.employeeId}</p>}
                  <p>
                    <strong>Leave:</strong> {request.leaveType}{' '}
                    {request.startDate && request.endDate
                      ? (request.startDate === request.endDate
                          ? `on ${request.startDate}`
                          : `from ${request.startDate} to ${request.endDate}`)
                      : 'dates on file'}
                    {request.duration ? ` (${request.duration} day${request.duration === 1 ? '' : 's'})` : ''}
                  </p>
                  {request.dayType && <p><strong>Day:</strong> {request.dayType}</p>}
                  {request.reason && <p><strong>Reason:</strong> {request.reason}</p>}
                  <p className="meta-row">
                    {request.createdAt && <span>Created: {new Date(request.createdAt).toLocaleString()}</span>}
                    {request.approvedAt && <span>Approved: {new Date(request.approvedAt).toLocaleString()}</span>}
                    {request.cancelledAt && <span>Cancelled: {new Date(request.cancelledAt).toLocaleString()}</span>}
                  </p>

                  <div className="leave-card-actions">
                    {request.status === 'pending' && isAdminOrHR && (
                      <button type="button" className="btn btn-success" onClick={() => handleApprove(request.requestCode)}>
                        Approve
                      </button>
                    )}
                    {request.status === 'pending' && (isAdminOrHR || request.employeeId === user?.employeeId) && (
                      <button type="button" className="btn btn-secondary" onClick={() => handleCancelClick(request)}>
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}