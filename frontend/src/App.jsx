import { useState, useEffect } from 'react'
import axios from 'axios'
import './App.css'
import LoginPage from './components/LoginPage'
import Dashboard from './components/Dashboard'
import EmployeeList from './components/EmployeeList'
import LeaveRequests from './components/LeaveRequests'
import ChatbotWidget from './components/ChatbotWidget'

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [accessToken, setAccessToken] = useState(null)
  const [user, setUser] = useState(null)
  const [currentPage, setCurrentPage] = useState('dashboard')
  const [serverStatus, setServerStatus] = useState(null)
  const [chatbotOpen, setChatbotOpen] = useState(false)

  useEffect(() => {
    // Check if user is already logged in (from localStorage)
    const savedAccessToken = localStorage.getItem('accessToken')
    const savedUser = localStorage.getItem('user')
    
    if (savedAccessToken && savedUser) {
      setAccessToken(savedAccessToken)
      setUser(JSON.parse(savedUser))
      setIsLoggedIn(true)
      checkServerStatus()
    }
  }, [])

  const checkServerStatus = async () => {
    try {
      await axios.get('/api/health')
      setServerStatus('connected')
    } catch (error) {
      setServerStatus('disconnected')
    }
  }

  const handleLoginSuccess = (newSessionId, newUser) => {
    setAccessToken(newSessionId)
    setUser(newUser)
    setIsLoggedIn(true)
    checkServerStatus()
  }

  const handleLogout = async () => {
    try {
      await axios.post('/api/auth/logout', { refreshToken: localStorage.getItem('refreshToken') })
    } catch (error) {
      console.log('Logout error:', error)
    }
    
    // Clear local storage and state
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('hrmsChatbotWidgetMessages') || key.startsWith('hrmsChatbotPageMessages')) {
        localStorage.removeItem(key)
      }
    })
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
    setAccessToken(null)
    setUser(null)
    setIsLoggedIn(false)
    setCurrentPage('dashboard')
    alert('Logged out successfully! Please login again.')
  }

  // Check if session is still valid on component mount
  useEffect(() => {
    if (isLoggedIn && accessToken) {
      axios.get('/api/auth/verify', { headers: { Authorization: `Bearer ${accessToken}` } })
        .catch(error => {
          // Session expired - clear and show login
          console.log('Session expired')
          localStorage.removeItem('accessToken')
          localStorage.removeItem('refreshToken')
          localStorage.removeItem('user')
          setIsLoggedIn(false)
          setAccessToken(null)
          setUser(null)
        })
    }
  }, [isLoggedIn, accessToken])

  // Show login page if not logged in
  if (!isLoggedIn) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />
  }

  return (
    <div className="app">
      {/* HEADER */}
      <header className="header">
        <div className="header-container">
          <div className="logo">
            <h1>HRMS Portal</h1>
            {user && <p className="user-name">Welcome, {user.name}! 👋</p>}
          </div>
          <nav className="nav">
            <button 
              className={`nav-link ${currentPage === 'dashboard' ? 'active' : ''}`}
              onClick={() => setCurrentPage('dashboard')}
            >
              Dashboard
            </button>
            <button 
              className={`nav-link ${currentPage === 'employees' ? 'active' : ''}`}
              onClick={() => setCurrentPage('employees')}
            >
              Employees
            </button>
            <button 
              className={`nav-link ${currentPage === 'leaves' ? 'active' : ''}`}
              onClick={() => setCurrentPage('leaves')}
            >
              Leave Requests
            </button>
            <a href="#resources" className="nav-link">Resources</a>
            <a href="#support" className="nav-link">Support</a>
            <button className="logout-btn" onClick={handleLogout}>
              Logout
            </button>
          </nav>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="main-content">
        {serverStatus === 'disconnected' && (
          <div className="error-banner">
            ⚠️ Backend not running. Start it with: <code>npm run dev:backend</code>
          </div>
        )}

        {currentPage === 'dashboard' && <Dashboard />}
        {currentPage === 'employees' && <EmployeeList />}
        {currentPage === 'leaves' && <LeaveRequests accessToken={accessToken} user={user} />}
      </main>

      {/* FLOATING CHATBOT WIDGET */}
      {isLoggedIn && (
        <ChatbotWidget 
          isOpen={chatbotOpen} 
          onToggle={() => setChatbotOpen(!chatbotOpen)}
          accessToken={accessToken}
          user={user}
        />
      )}

      {/* FOOTER */}
      <footer className="footer">
        <p>&copy; 2024 HRMS Portal. All rights reserved.</p>
      </footer>
    </div>
  )
}

export default App
