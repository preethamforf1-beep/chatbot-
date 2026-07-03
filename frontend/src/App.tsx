import { useState, useEffect } from 'react'
import axios from 'axios'
import './App.css'
import LoginPage from './components/LoginPage'
import Dashboard from './components/Dashboard'
import EmployeeList from './components/EmployeeList'
import LeaveRequests from './components/LeaveRequests'
import ChatbotWidget from './components/ChatbotWidget'
import type { User } from './types'

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [currentPage, setCurrentPage] = useState('leaves')
  const [serverStatus, setServerStatus] = useState<string | null>(null)
  const [chatbotOpen, setChatbotOpen] = useState(false)

  useEffect(() => {
    const savedAccessToken = localStorage.getItem('accessToken')
    const savedUser = localStorage.getItem('user')

    if (savedAccessToken && savedUser) {
      setAccessToken(savedAccessToken)
      setUser(JSON.parse(savedUser) as User)
      setIsLoggedIn(true)
      checkServerStatus()
    }
  }, [])

  const checkServerStatus = async () => {
    try {
      await axios.get('/api/health')
      setServerStatus('connected')
    } catch {
      setServerStatus('disconnected')
    }
  }

  const handleLoginSuccess = (newAccessToken: string, newUser: User) => {
    setAccessToken(newAccessToken)
    setUser(newUser)
    setIsLoggedIn(true)
    checkServerStatus()
  }

  const handleLogout = async () => {
    try {
      await axios.post('/api/auth/logout', { refreshToken: localStorage.getItem('refreshToken') })
    } catch {
      // ignore logout errors
    }

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
    setCurrentPage('leaves')
    alert('Logged out successfully! Please login again.')
  }

  useEffect(() => {
    if (isLoggedIn && accessToken) {
      axios.get('/api/auth/verify', { headers: { Authorization: `Bearer ${accessToken}` } })
        .catch(() => {
          localStorage.removeItem('accessToken')
          localStorage.removeItem('refreshToken')
          localStorage.removeItem('user')
          setIsLoggedIn(false)
          setAccessToken(null)
          setUser(null)
        })
    }
  }, [isLoggedIn, accessToken])

  if (!isLoggedIn) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-container">
          <div className="logo">
            <h1>HRMS Portal</h1>
            {user && <p className="user-name">Welcome, {user.name}! 👋</p>}
          </div>
          <nav className="nav">
            
         
            <button
              className={`nav-link ${currentPage === 'leaves' ? 'active' : ''}`}
              onClick={() => setCurrentPage('leaves')}
            >
              Leave Requests
            </button>
            <a href="#resources" className="nav-link">Resources</a>
            <a href="#resources" className="nav-link">Dashboard</a>
            <a href="#resources" className="nav-link">employees</a>
            <a href="#support" className="nav-link">Support</a>
            <button className="logout-btn" onClick={handleLogout}>
              Logout
            </button>
          </nav>
        </div>
      </header>

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

      {isLoggedIn && (
        <ChatbotWidget
          isOpen={chatbotOpen}
          onToggle={() => setChatbotOpen(!chatbotOpen)}
          accessToken={accessToken}
          user={user}
        />
      )}

      <footer className="footer">
        <p>&copy; 2024 HRMS Portal. All rights reserved.</p>
      </footer>
    </div>
  )
}

export default App
