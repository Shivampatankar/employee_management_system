import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import API from './api';
import Login from './pages/Login';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import Profile from './pages/Profile';
import RegisterEmployee from './pages/RegisterEmployee';
import Complaints from './pages/Complaints';
import Tasks from './pages/Tasks';

function Layout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const userName = localStorage.getItem('user_name') || 'Member';
  const role = (localStorage.getItem('role') || 'EMPLOYEE').toUpperCase();
  const [profilePhoto, setProfilePhoto] = useState(null);

  useEffect(() => {
    API.get('/employees/me')
      .then((res) => {
        if (res.data && res.data.profile_photo) {
          setProfilePhoto(res.data.profile_photo);
        }
      })
      .catch((err) => {
        console.error('Could not fetch user avatar for sidebar:', err);
      });
  }, [location.pathname]);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const isCurrent = (path) => (location.pathname === path ? 'active' : '');

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="p-4 border-bottom border-secondary border-opacity-25 d-flex align-items-center gap-2">
          <i className="bi bi-shield-check text-primary fs-4"></i>
          <div>
            <h5 className="mb-0 fw-bold tracking-tight text-white">WorkForce EMS</h5>
            <small className="text-secondary" style={{ fontSize: '0.7rem' }}>ENTERPRISE PLATFORM</small>
          </div>
        </div>

        <div className="py-3 flex-grow-1">
          <Link
            to="/dashboard"
            className={`nav-link-custom ${isCurrent('/dashboard')}`}
          >
            <i className="bi bi-grid-1x2"></i> Dashboard
          </Link>

          {(role === 'HR' || role === 'MANAGER') && (
            <Link
              to="/employees"
              className={`nav-link-custom ${isCurrent('/employees')}`}
            >
              <i className="bi bi-people"></i> {role === 'MANAGER' ? 'My Team' : 'Workforce'}
            </Link>
          )}

          {role === 'HR' && (
            <Link
              to="/register-employee"
              className={`nav-link-custom ${isCurrent('/register-employee')}`}
            >
              <i className="bi bi-person-plus"></i> Onboard Staff
            </Link>
          )}

          {/* Tasks link rendered strictly for MANAGER and EMPLOYEE (Hidden from HR/Admin) */}
          {(role === 'MANAGER' || role === 'EMPLOYEE') && (
            <Link
              to="/tasks"
              className={`nav-link-custom ${isCurrent('/tasks')}`}
            >
              <i className="bi bi-check2-square"></i> Tasks
            </Link>
          )}

          <Link
            to="/complaints"
            className={`nav-link-custom ${isCurrent('/complaints')}`}
          >
            <i className="bi bi-chat-square-text"></i> Complaints
          </Link>

          <Link
            to="/profile"
            className={`nav-link-custom ${isCurrent('/profile')}`}
          >
            <i className="bi bi-person-badge"></i> Profile
          </Link>
        </div>

        <div className="p-3 border-top border-secondary border-opacity-25">
          <div className="d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center gap-2 overflow-hidden">
              {profilePhoto ? (
                <img
                  src={profilePhoto}
                  alt={userName}
                  className="rounded-circle object-fit-cover border border-secondary"
                  style={{ width: '38px', height: '38px', minWidth: '38px' }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    if (e.target.nextSibling) {
                      e.target.nextSibling.style.display = 'flex';
                    }
                  }}
                />
              ) : null}

              <div
                className="rounded-circle bg-primary text-white align-items-center justify-content-center fw-semibold shadow-sm"
                style={{
                  width: '38px',
                  height: '38px',
                  minWidth: '38px',
                  display: profilePhoto ? 'none' : 'flex',
                }}
              >
                {userName.charAt(0).toUpperCase()}
              </div>

              <div className="text-truncate">
                <div className="text-white small fw-semibold text-truncate">{userName}</div>
                <div className="text-secondary" style={{ fontSize: '0.75rem' }}>{role}</div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="btn btn-link text-secondary p-1 border-0"
              title="Sign Out"
            >
              <i className="bi bi-box-arrow-right fs-5"></i>
            </button>
          </div>
        </div>
      </aside>

      <div className="main-content">
        <header className="bg-white border-bottom px-4 py-3 d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center gap-2">
            <span className="text-muted small">Access Scope:</span>
            <span className="badge bg-light text-dark border">{role} Account</span>
          </div>
          <div className="text-muted small">
            <i className="bi bi-calendar3 me-1"></i>{' '}
            {new Date().toLocaleDateString(undefined, {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })}
          </div>
        </header>

        <main className="p-4">{children}</main>
      </div>
    </div>
  );
}

const ProtectedRoute = ({ children, allowedRoles }) => {
  const token = localStorage.getItem('token');
  const userRole = (localStorage.getItem('role') || '').toUpperCase();

  if (!token) return <Navigate replace to="/login" />;
  if (allowedRoles && !allowedRoles.includes(userRole)) return <Navigate replace to="/dashboard" />;
  return <Layout>{children}</Layout>;
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRoles={['HR', 'MANAGER', 'EMPLOYEE']}>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/employees"
          element={
            <ProtectedRoute allowedRoles={['HR', 'MANAGER']}>
              <Employees />
            </ProtectedRoute>
          }
        />

        <Route
          path="/register-employee"
          element={
            <ProtectedRoute allowedRoles={['HR']}>
              <RegisterEmployee />
            </ProtectedRoute>
          }
        />

        {/* Tasks access locked strictly to MANAGER and EMPLOYEE */}
        <Route
          path="/tasks"
          element={
            <ProtectedRoute allowedRoles={['MANAGER', 'EMPLOYEE']}>
              <Tasks />
            </ProtectedRoute>
          }
        />

        <Route
          path="/complaints"
          element={
            <ProtectedRoute allowedRoles={['HR', 'MANAGER', 'EMPLOYEE']}>
              <Complaints />
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile"
          element={
            <ProtectedRoute allowedRoles={['HR', 'MANAGER', 'EMPLOYEE']}>
              <Profile />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate replace to="/dashboard" />} />
      </Routes>
    </BrowserRouter>
  );
}