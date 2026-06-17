import { useState, useEffect } from 'react'
import axios from 'axios'
import './LeaveRequests.css'

export default function LeaveRequests({ accessToken, user }) {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)
  const [formData, setFormData] = useState({
    leaveType: 'CL',
    leaveDate: '',
    dayType: 'Full Day',
    reason: ''
  })

  const isAdminOrHR = user?.role === 'admin' || user?.role === 'hr'

  useEffect(() => {
    fetchRequests()
  }, [user?.role])

  const fetchRequests = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await axios.get('/api/leaves', {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
      setRequests(response.data.data || [])
    } catch (err) {
      setError('Unable to load leave requests.')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (event) => {
    setFormData(prev => ({
      ...prev,
      [event.target.name]: event.target.value
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitLoading(true)
    setError(null)
    setMessage(null)

    try {
      const response = await axios.post('/api/leaves', formData, {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
      setMessage(`Leave request ${response.data.data.requestCode} created successfully.`)
      setFormData({ leaveType: 'CL', leaveDate: '', dayType: 'Full Day', reason: '' })
      fetchRequests()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit leave request.')
    } finally {
      setSubmitLoading(false)
    }
  }

  const handleApprove = async (code) => {
    setError(null)
    setMessage(null)

    try {
      const response = await axios.patch(`/api/leaves/${code}/approve`, {}, {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
      setMessage(`Leave request ${response.data.data.requestCode} approved.`)
      fetchRequests()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to approve leave request.')
    }
  }

  const handleCancel = async (code) => {
    setError(null)
    setMessage(null)

    try {
      const response = await axios.patch(`/api/leaves/${code}/cancel`, {}, {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
      setMessage(`Leave request ${response.data.data.requestCode} cancelled.`)
      fetchRequests()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to cancel leave request.')
    }
  }

  const handleRefresh = () => {
    fetchRequests()
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
            onClick={handleRefresh}
            disabled={loading}
          >
            {loading ? 'Refreshing...' : 'Refresh Requests'}
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {message && <div className="alert alert-success">{message}</div>}

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
              Leave date
              <input
                type="date"
                name="leaveDate"
                value={formData.leaveDate}
                onChange={handleChange}
                required
              />
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
                rows="3"
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
            <div className="empty-state">No leave requests found.</div>
          ) : (
            <div className="leave-cards">
              {requests.map(request => (
                <div key={request.requestCode} className="leave-card">
                  <div className="leave-card-row">
                    <strong>{request.requestCode}</strong>
                    <span className={`status-badge status-${request.status}`}>{request.status}</span>
                  </div>
                  <p><strong>Employee ID:</strong> {request.employeeId}</p>
                  <p><strong>Leave:</strong> {request.leaveType} on {request.leaveDate}</p>
                  <p><strong>Day:</strong> {request.dayType}</p>
                  {request.reason && <p><strong>Reason:</strong> {request.reason}</p>}
                  <p className="meta-row">
                    <span>Created: {new Date(request.createdAt).toLocaleString()}</span>
                    {request.approvedAt && <span>Approved: {new Date(request.approvedAt).toLocaleString()}</span>}
                    {request.cancelledAt && <span>Cancelled: {new Date(request.cancelledAt).toLocaleString()}</span>}
                  </p>

                  <div className="leave-card-actions">
                    {request.status === 'pending' && isAdminOrHR && (
                      <button type="button" className="btn btn-success" onClick={() => handleApprove(request.requestCode)}>
                        Approve
                      </button>
                    )}
                    {request.status === 'pending' && (isAdminOrHR || request.employeeId === user.employeeId) && (
                      <button type="button" className="btn btn-secondary" onClick={() => handleCancel(request.requestCode)}>
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
