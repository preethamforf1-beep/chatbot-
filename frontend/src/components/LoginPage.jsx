import { useState } from 'react';
import axios from 'axios';
import './LoginPage.css';

export default function LoginPage({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post('/api/auth/login', {
        email,
        password
      });

      if (response.data.success) {
        // Store tokens and user in localStorage
        localStorage.setItem('accessToken', response.data.accessToken);
        localStorage.setItem('refreshToken', response.data.refreshToken);
        localStorage.setItem('user', JSON.stringify(response.data.user));

        // Call parent callback (accessToken, user)
        onLoginSuccess(response.data.accessToken, response.data.user);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Demo accounts for easy testing
  const demoAccounts = [
    { email: 'raj.kumar@company.com', password: 'raj@123', role: 'Employee' },
    { email: 'priya.singh@company.com', password: 'priya@123', role: 'Employee' },
    { email: 'amit.patel@company.com', password: 'amit@123', role: 'Employee' },
    { email: 'admin@company.com', password: 'admin@123', role: 'Admin' },
    { email: 'sonal.mehta@company.com', password: 'sonal@123', role: 'HR Manager' }
  ];

  const fillDemo = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>HRMS Portal</h1>
          <p>Employee Management System</p>
        </div>

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" disabled={loading} className="login-button">
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="demo-accounts">
          <p>Demo Accounts (for testing):</p>
          {demoAccounts.map((account, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => fillDemo(account.email, account.password)}
              className="demo-button"
            >
              {account.role}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
