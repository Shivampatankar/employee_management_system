import React, { useState } from 'react';
import API from '../api';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ show: false, message: '', type: 'danger' });
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    const cleanIdentifier = identifier.trim();
    const cleanPassword = password.trim();

    // 1. Client-side validation for empty inputs
    if (!cleanIdentifier && !cleanPassword) {
      setAlert({
        show: true,
        message: 'Please enter both your email/mobile and password.',
        type: 'warning',
      });
      return;
    }

    if (!cleanIdentifier) {
      setAlert({
        show: true,
        message: 'Email address or mobile number is required.',
        type: 'warning',
      });
      return;
    }

    if (!cleanPassword) {
      setAlert({
        show: true,
        message: 'Password is required.',
        type: 'warning',
      });
      return;
    }

    setAlert({ show: false, message: '', type: 'danger' });
    setLoading(true);

    try {
      const res = await API.post('/auth/login', {
        identifier: cleanIdentifier,
        password: cleanPassword,
      });

      // 2. Intercept first-time login for stateless OTP verification
      if (res.data.requires_password_reset) {
        navigate('/reset-password', {
          state: {
            email: res.data.email,
            reset_token: res.data.reset_token,
          },
        });
        return;
      }

      // 3. Regular login success
      localStorage.setItem('token', res.data.access_token);
      localStorage.setItem('role', res.data.role);
      localStorage.setItem('user_name', res.data.name);
      navigate('/dashboard');
    } catch (err) {
      // 4. Server-side validation errors
      let errorMsg = 'Invalid email/mobile or password. Please try again.';

      if (err.response) {
        if (err.response.status === 401) {
          errorMsg = err.response.data?.detail || 'Invalid email/mobile or password.';
        } else if (err.response.status === 403) {
          errorMsg = err.response.data?.detail || 'Account deactivated. Please reach out to HR.';
        } else if (err.response.data?.detail) {
          errorMsg = err.response.data.detail;
        }
      } else if (err.request) {
        errorMsg = 'Backend server unreachable. Ensure FastAPI is running on port 8000.';
      }

      setAlert({
        show: true,
        message: errorMsg,
        type: 'danger',
      });
    } finally {
      setLoading(false);
    }
  };

  const fillDemoAdmin = () => {
    setIdentifier('admin@ems.com');
    setPassword('Admin@123');
    setAlert({ show: false, message: '', type: 'danger' });
  };

  return (
    <div className="login-page">
      <div className="login-box shadow-lg">
        {/* Left Side: Brand Showcase Panel */}
        <div className="login-left-brand d-none d-lg-flex flex-column justify-content-between p-5">
          <div className="d-flex align-items-center gap-3">
            <div className="login-brand-logo">
              <i className="bi bi-shield-check text-white fs-4"></i>
            </div>
            <div>
              <h5 className="mb-0 fw-bold text-white tracking-wide">WorkForce EMS</h5>
              <span className="text-white-50 text-uppercase" style={{ fontSize: '0.7rem', letterSpacing: '1px' }}>
                Enterprise Operations
              </span>
            </div>
          </div>

          <div className="my-auto py-4">
            <span className="badge bg-white bg-opacity-10 text-white border border-white border-opacity-25 mb-3 px-3 py-2 rounded-pill">
              <i className="bi bi-lightning-charge me-1 text-warning"></i> Role-Based Access
            </span>
            <h2 className="text-white fw-bold mb-3">
              Workforce, Complaints & Operations
            </h2>
            <p className="text-white-50 leading-relaxed mb-4">
              A single centralized control room for HR administration, team leads, and staff ticket tracking.
            </p>

            <ul className="list-unstyled text-white-50 small d-flex flex-column gap-2 mb-0">
              <li className="d-flex align-items-center gap-2">
                <i className="bi bi-check2-circle text-success fs-6"></i>
                <span>Strict JWT verification & backend role permissions</span>
              </li>
              <li className="d-flex align-items-center gap-2">
                <i className="bi bi-check2-circle text-success fs-6"></i>
                <span>Stateless 5-minute email OTP verification</span>
              </li>
              <li className="d-flex align-items-center gap-2">
                <i className="bi bi-check2-circle text-success fs-6"></i>
                <span>Immutable complaint status & remarks audit logs</span>
              </li>
            </ul>
          </div>

          <div className="text-white-50 small border-top border-white border-opacity-10 pt-3">
            <i className="bi bi-lock me-1"></i> 256-bit Encrypted Session
          </div>
        </div>

        {/* Right Side: Form View */}
        <div className="login-right-form p-4 p-md-5 d-flex flex-column justify-content-center">
          {/* Mobile Brand Logo */}
          <div className="d-flex d-lg-none align-items-center gap-2 mb-4">
            <div className="login-brand-logo" style={{ width: '36px', height: '36px' }}>
              <i className="bi bi-shield-check text-white fs-5"></i>
            </div>
            <h5 className="mb-0 fw-bold text-dark">WorkForce EMS</h5>
          </div>

          <div className="mb-4">
            <h3 className="fw-bold text-dark mb-1">Sign In</h3>
            <p className="text-muted small mb-0">Enter your credentials to access your account.</p>
          </div>

          {/* Validation Alert Message Banner */}
          {alert.show && (
            <div
              className={`alert alert-${alert.type} alert-dismissible fade show d-flex align-items-center py-2 px-3 small rounded-3 mb-3 border-0 shadow-sm`}
              role="alert"
            >
              <i
                className={`bi ${
                  alert.type === 'warning' ? 'bi-exclamation-circle-fill' : 'bi-exclamation-triangle-fill'
                } me-2 fs-6`}
              ></i>
              <div className="flex-grow-1">{alert.message}</div>
              <button
                type="button"
                className="btn-close py-2"
                aria-label="Close"
                onClick={() => setAlert({ show: false, message: '', type: 'danger' })}
              ></button>
            </div>
          )}

          <form onSubmit={handleLogin} noValidate>
            <div className="mb-3">
              <label className="form-label small fw-semibold text-secondary mb-1">
                Work Email or Mobile
              </label>
              <div className="input-group">
                <span className="input-group-text bg-light text-muted border-end-0">
                  <i className="bi bi-envelope"></i>
                </span>
                <input
                  type="text"
                  className="form-control bg-light border-start-0 ps-0"
                  placeholder="admin@ems.com"
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    if (alert.show) setAlert({ show: false, message: '', type: 'danger' });
                  }}
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="form-label small fw-semibold text-secondary mb-1">
                Password
              </label>
              <div className="input-group">
                <span className="input-group-text bg-light text-muted border-end-0">
                  <i className="bi bi-key"></i>
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-control bg-light border-start-0 border-end-0 ps-0"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (alert.show) setAlert({ show: false, message: '', type: 'danger' });
                  }}
                />
                <button
                  type="button"
                  className="input-group-text bg-light text-muted border-start-0"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex="-1"
                >
                  <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary w-100 py-2 fw-semibold rounded-3 shadow-sm d-flex align-items-center justify-content-center gap-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm" role="status"></span>
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <i className="bi bi-arrow-right"></i>
                </>
              )}
            </button>
          </form>

          <div className="mt-4 pt-3 border-top text-center">
            <span className="text-muted small d-block mb-2">Need quick testing credentials?</span>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary rounded-pill px-3 py-1"
              style={{ fontSize: '0.8rem' }}
              onClick={fillDemoAdmin}
            >
              <i className="bi bi-magic me-1 text-primary"></i> Fill Superuser Credentials
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}