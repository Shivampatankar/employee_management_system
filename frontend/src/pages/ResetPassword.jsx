import React, { useState } from 'react';
import API from '../api';
import { useNavigate, useLocation } from 'react-router-dom';

export default function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || '';
  const [resetToken, setResetToken] = useState(location.state?.reset_token || '');

  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ show: false, message: '', type: 'danger' });

  if (!email || !resetToken) {
    return (
      <div className="login-page">
        <div className="card p-4 shadow-sm" style={{ maxWidth: '400px' }}>
          <h5>Invalid Session</h5>
          <p className="text-muted small">No pending password reset request found.</p>
          <button className="btn btn-primary" onClick={() => navigate('/login')}>
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  const handleReset = async (e) => {
    e.preventDefault();
    if (!otp.trim()) {
      setAlert({ show: true, message: 'Please enter the 6-digit OTP.', type: 'warning' });
      return;
    }
    if (newPassword.length < 6) {
      setAlert({ show: true, message: 'Password must be at least 6 characters long.', type: 'warning' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setAlert({ show: true, message: 'Passwords do not match.', type: 'warning' });
      return;
    }

    setLoading(true);
    try {
      await API.post('/auth/set-initial-password', {
        email,
        otp: otp.trim(),
        new_password: newPassword,
        reset_token: resetToken, // <--- Stateless verification
      });
      window.alert('Password updated successfully! Please login with your new password.');
      navigate('/login');
    } catch (err) {
      setAlert({
        show: true,
        message: err.response?.data?.detail || 'Failed to update password.',
        type: 'danger',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      const res = await API.post('/auth/resend-otp', { email });
      if (res.data.reset_token) {
        setResetToken(res.data.reset_token);
      }
      setAlert({ show: true, message: 'A fresh OTP has been sent to your email (valid for 5 mins).', type: 'info' });
    } catch (err) {
      setAlert({ show: true, message: 'Failed to resend OTP.', type: 'danger' });
    }
  };

  return (
    <div className="login-page">
      <div className="card shadow-lg p-4 p-md-5 bg-white border-0" style={{ maxWidth: '480px', width: '100%', borderRadius: '16px' }}>
        <div className="text-center mb-4">
          <div className="login-brand-logo mx-auto mb-3" style={{ width: '48px', height: '48px' }}>
            <i className="bi bi-key text-white fs-4"></i>
          </div>
          <h4 className="fw-bold mb-1">Set Permanent Password</h4>
          <p className="text-muted small mb-0">
            First login detected. We have sent an OTP to <strong>{email}</strong>
          </p>
          <span className="badge bg-danger bg-opacity-10 text-danger mt-2">Expires in 5 minutes</span>
        </div>

        {alert.show && (
          <div className={`alert alert-${alert.type} alert-dismissible fade show py-2 px-3 small rounded-3 mb-3`}>
            {alert.message}
            <button
              type="button"
              className="btn-close py-2"
              onClick={() => setAlert({ show: false, message: '', type: 'danger' })}
            ></button>
          </div>
        )}

        <form onSubmit={handleReset}>
          <div className="mb-3">
            <label className="form-label small fw-semibold">Enter 6-Digit OTP</label>
            <input
              type="text"
              maxLength="6"
              className="form-control text-center fs-5 fw-bold"
              style={{ letterSpacing: '4px' }}
              placeholder="123456"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              required
            />
          </div>

          <div className="mb-3">
            <label className="form-label small fw-semibold">New Permanent Password</label>
            <input
              type="password"
              className="form-control"
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </div>

          <div className="mb-4">
            <label className="form-label small fw-semibold">Confirm Permanent Password</label>
            <input
              type="password"
              className="form-control"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary w-100 py-2 fw-semibold" disabled={loading}>
            {loading ? 'Updating Password...' : 'Verify & Set Password'}
          </button>
        </form>

        <div className="text-center mt-3">
          <button type="button" className="btn btn-link btn-sm text-decoration-none" onClick={handleResend}>
            Didn't receive the email? Resend OTP
          </button>
        </div>
      </div>
    </div>
  );
}