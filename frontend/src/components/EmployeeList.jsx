// Employee List Component - Browse all employees
import { useState, useEffect } from 'react'
import axios from 'axios'
import './EmployeeList.css'

export default function EmployeeList() {
  const [employees, setEmployees] = useState([])
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchEmployees()
  }, [])

  const fetchEmployees = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await axios.get('/api/employees')
      setEmployees(response.data.data)
    } catch (err) {
      setError('Failed to load employees')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div style={{ textAlign: 'center', padding: '40px', fontSize: '18px', color: '#667eea' }}>Loading employees...</div>

  return (
    <div className="employee-list-container">
      <h2>Employees</h2>
      <p className="employee-list-intro">View and manage employee information</p>

      {error && <div className="error">{error}</div>}

      <div className="employee-grid">
        {employees.map(emp => (
          <div 
            key={emp.id} 
            className={`employee-card ${selectedEmployee?.id === emp.id ? 'selected' : ''}`}
            onClick={() => setSelectedEmployee(emp)}
          >
            <div className="employee-header">
              <div className="employee-avatar">{emp.name.charAt(0)}</div>
              <h3 className="employee-name">{emp.name}</h3>
            </div>
            <div className="employee-info">
              <p><strong>ID:</strong> {emp.id}</p>
              <p><strong>Position:</strong> {emp.designation}</p>
              <p><strong>Department:</strong> {emp.department}</p>
              <p><strong>Salary:</strong> ₹{(emp.salary / 100000).toFixed(1)}L</p>
            </div>
          </div>
        ))}
      </div>

      {/* Employee Details */}
      {selectedEmployee && (
        <div className="employee-details">
          <h3>{selectedEmployee.name}</h3>
          
          <div className="details-grid">
            <div className="detail-section">
              <h4>Personal Information</h4>
              <p><strong>Email:</strong> {selectedEmployee.email}</p>
              <p><strong>Employee ID:</strong> {selectedEmployee.id}</p>
              <p><strong>Join Date:</strong> {new Date(selectedEmployee.joinDate).toLocaleDateString()}</p>
              <p><strong>Department:</strong> {selectedEmployee.department}</p>
              <p><strong>Position:</strong> {selectedEmployee.designation}</p>
            </div>

            <div className="detail-section">
              <h4>Compensation</h4>
              <p><strong>Base Salary:</strong> ₹{selectedEmployee.salary.toLocaleString()}</p>
              <p><strong>Deductions:</strong> ₹{selectedEmployee.form16.deductions.toLocaleString()}</p>
              <p><strong>Tax:</strong> ₹{selectedEmployee.form16.tax.toLocaleString()}</p>
              <p><strong>Net Salary:</strong> ₹{(selectedEmployee.salary - selectedEmployee.form16.deductions - selectedEmployee.form16.tax).toLocaleString()}</p>
            </div>
          </div>

          <div className="detail-section">
            <h4>Certifications</h4>
            {selectedEmployee.certificates.length > 0 ? (
              <ul>
                {selectedEmployee.certificates.map((cert, idx) => (
                  <li key={idx}>
                    📜 {cert.name}
                  </li>
                ))}
              </ul>
            ) : (
              <p>No certifications on file</p>
            )}
          </div>

          <button 
            className="btn btn-secondary"
            onClick={() => setSelectedEmployee(null)}
            style={{ marginTop: '20px' }}
          >
            Close Details
          </button>
        </div>
      )}
    </div>
  )
}
