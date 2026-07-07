import { useState } from 'react'
import axios from 'axios'
import './LoginPage.css'
import type { User } from '../types'

interface LoginPageProps {
  onLoginSuccess: (accessToken: string, user: User) => void;
}

// Quick-fill demo accounts. Replace the email/password values with your real
// test credentials. These just populate the form — you still click "Sign in".
const DEMO_ACCOUNTS = [
  { label: 'Varalaxmi (284512)', email: 'varalaxmi.g@koundinyasatech.com', password: 'Password@1234' },
  { label: 'Tharun (294623)',    email: 'tharun@koundinyasatech.com',    password: 'Password@1234' },
  { label: 'Preetham(294663)',           email: 'srirampreetham.k@koundinyasatech.com',  password: 'Password@1234' },
  { label: 'Mounika(294990)',            email: 'mounika.k@koundinyasatech.com',   password: 'Password@1234' },
]

export default function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await axios.post('/api/auth/login', { email, password })

      if (response.data.success) {
        localStorage.setItem('accessToken', response.data.accessToken)
        localStorage.setItem('refreshToken', response.data.refreshToken)
        localStorage.setItem('user', JSON.stringify(response.data.user))
        localStorage.setItem('userRole', (response.data.user.role ?? 'employee') as string)
        localStorage.setItem('employeeId', (response.data.user.employeeId ?? '') as string)

        onLoginSuccess(response.data.accessToken, response.data.user as User)
      } else {
        setError(response.data.message || 'Invalid email or password.')
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || 'Login failed. Please try again.')
      } else {
        setError('Login failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const fillDemo = (acc: { email: string; password: string }) => {
    setEmail(acc.email)
    setPassword(acc.password)
    setError('')
  }

  return (
    <div className="login-shell">
      {/* Left brand panel */}
      <aside className="login-brand" aria-hidden="true">
        <div className="brand-orb orb-1" />
        <div className="brand-orb orb-2" />
        <div className="brand-orb orb-3" />
        <div className="brand-content">
          <div className="brand-mark">HR</div>
          <h1 className="brand-title">HRMS Portal</h1>
          <p className="brand-tagline">
            Leave, people, and everything your workday runs on — in one calm place.
          </p>
          <ul className="brand-points">
            <li><span className="dot" /> Apply for leave in seconds</li>
            <li><span className="dot" /> Track approvals as they happen</li>
            <li><span className="dot" /> Ask the assistant anything</li>
          </ul>
        </div>
        <div className="brand-footer">Koundinyasa Tech · Employee Portal</div>
      </aside>

      {/* Right form panel */}
      <main className="login-panel">
        <div className="login-card">
          <div className="login-head">
            <h2>Welcome back</h2>
            <p>Sign in to your employee portal.</p>
          </div>

          <form onSubmit={handleLogin} className="login-form">
            <label className="field">
              <span className="field-label">Email address</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@koundinyasatech.com"
                autoComplete="username"
                required
              />
            </label>

            <label className="field">
              <span className="field-label">Password</span>
              <div className="password-wrap">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="eye-btn"
                  onClick={() => setShowPassword(s => !s)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </label>

            {error && <div className="login-error">{error}</div>}

            <button type="submit" className="login-submit" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="demo-block">
            <div className="demo-divider"><span>Quick demo access</span></div>
            <div className="demo-grid">
              {DEMO_ACCOUNTS.map((acc, i) => (
                <button
                  key={i}
                  type="button"
                  className="demo-btn"
                  onClick={() => fillDemo(acc)}
                >
                  {acc.label}
                </button>
              ))}
            </div>
            <p className="demo-hint">Fills the form — then press Sign in.</p>
          </div>
        </div>
      </main>
    </div>
  )
}