import React, { useEffect, useState } from 'react';
import API from '../api';

export default function Dashboard() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const role = (localStorage.getItem('role') || '').toUpperCase();
  const userName = localStorage.getItem('user_name') || 'Team Member';

  const fetchMetrics = async () => {
    try {
      const res = await API.get('/dashboard/metrics');
      setMetrics(res.data);
    } catch (err) {
      console.error('Failed to load dashboard metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  if (loading) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border text-primary" role="status"></div>
        <div className="mt-2 text-muted small">Loading organizational analytics...</div>
      </div>
    );
  }

  const dist = metrics?.department_distribution || {};
  const hrCount = Number(dist.HR ?? dist.hr ?? 0);
  const managersCount = Number(dist.Managers ?? dist.managers ?? dist.MANAGER ?? 0);
  const employeesCount = Number(dist.Employees ?? dist.employees ?? dist.EMPLOYEE ?? 0);
  const totalTrackedStaff = hrCount + managersCount + employeesCount;

  const hrPercent = totalTrackedStaff > 0 ? Math.round((hrCount / totalTrackedStaff) * 100) : 0;
  const mgrPercent = totalTrackedStaff > 0 ? Math.round((managersCount / totalTrackedStaff) * 100) : 0;
  const empPercent = totalTrackedStaff > 0 ? Math.round((employeesCount / totalTrackedStaff) * 100) : 0;

  // Helper for case-insensitive count retrieval
  const getStatusCount = (target) => {
    const counts = metrics?.complaints_by_status || {};
    let total = 0;
    Object.keys(counts).forEach((key) => {
      const normalizedKey = key.toUpperCase().replace(/\s+/g, '_');
      const normalizedTarget = target.toUpperCase().replace(/\s+/g, '_');
      if (normalizedKey === normalizedTarget) {
        total += counts[key];
      }
    });
    return total;
  };

  const openCount = getStatusCount('OPEN');
  const assignedCount = getStatusCount('ASSIGNED');
  const inProgressCount = getStatusCount('IN_PROGRESS');
  const resolvedClosedCount = getStatusCount('RESOLVED') + getStatusCount('CLOSED');

  return (
    <div className="container-fluid px-0">
      {/* Welcome Banner */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="fw-bold mb-1 text-dark">Welcome back, {userName}</h4>
          <p className="text-muted small mb-0">
            {role === 'HR'
              ? 'Executive overview of system metrics, staffing distribution, and complaints.'
              : role === 'MANAGER'
              ? 'Operational summary and team complaints for your reporting unit.'
              : 'Personal ticket status and workspace overview.'}
          </p>
        </div>
        <button className="btn btn-outline-secondary btn-sm" onClick={fetchMetrics}>
          <i className="bi bi-arrow-clockwise me-1"></i> Refresh Data
        </button>
      </div>

      {/* Top Metric Cards */}
      <div className="row g-3 mb-4">
        {role === 'HR' && (
          <>
            <div className="col-12 col-sm-6 col-xl-3">
              <div className="card border-0 shadow-sm p-3 bg-white h-100 rounded-3">
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <span className="text-muted small fw-semibold text-uppercase">Total Headcount</span>
                    <h3 className="fw-bold mb-0 mt-1">{metrics?.total_employees || 0}</h3>
                  </div>
                  <div className="rounded-3 p-3 bg-primary bg-opacity-10 text-primary">
                    <i className="bi bi-people-fill fs-4"></i>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-12 col-sm-6 col-xl-3">
              <div className="card border-0 shadow-sm p-3 bg-white h-100 rounded-3">
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <span className="text-muted small fw-semibold text-uppercase">Active Staff</span>
                    <h3 className="fw-bold mb-0 mt-1 text-success">{metrics?.active_employees || 0}</h3>
                  </div>
                  <div className="rounded-3 p-3 bg-success bg-opacity-10 text-success">
                    <i className="bi bi-person-check-fill fs-4"></i>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        <div className={`col-12 col-sm-6 ${role === 'HR' ? 'col-xl-3' : 'col-xl-6'}`}>
          <div className="card border-0 shadow-sm p-3 bg-white h-100 rounded-3">
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <span className="text-muted small fw-semibold text-uppercase">Pending Complaints</span>
                <h3 className="fw-bold mb-0 mt-1 text-warning">{metrics?.pending_complaints ?? 0}</h3>
              </div>
              <div className="rounded-3 p-3 bg-warning bg-opacity-10 text-warning">
                <i className="bi bi-hourglass-split fs-4"></i>
              </div>
            </div>
          </div>
        </div>

        <div className={`col-12 col-sm-6 ${role === 'HR' ? 'col-xl-3' : 'col-xl-6'}`}>
          <div className="card border-0 shadow-sm p-3 bg-white h-100 rounded-3">
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <span className="text-muted small fw-semibold text-uppercase">Resolved Complaints</span>
                <h3 className="fw-bold mb-0 mt-1 text-info">{metrics?.resolved_complaints ?? 0}</h3>
              </div>
              <div className="rounded-3 p-3 bg-info bg-opacity-10 text-info">
                <i className="bi bi-check2-circle fs-4"></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Distribution & Complaints */}
      <div className="row g-4">
        {role === 'HR' && (
          <div className="col-12 col-lg-6">
            <div className="card border-0 shadow-sm p-4 bg-white rounded-3 h-100">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="fw-bold mb-0">Workforce Distribution</h5>
                <span className="badge bg-light text-dark border">Live MySQL Data</span>
              </div>
              <p className="text-muted small mb-4">
                Active organizational breakdown categorized by structural roles.
              </p>

              <div className="mb-4">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <span className="fw-semibold text-secondary">
                    <i className="bi bi-shield-lock-fill me-2 text-danger"></i>HR Administrators
                  </span>
                  <span className="small text-muted">
                    <span className="badge bg-danger bg-opacity-10 text-danger me-2">Active: {hrCount}</span>
                    ({hrPercent}%)
                  </span>
                </div>
                <div className="progress" style={{ height: '10px' }}>
                  <div
                    className="progress-bar bg-danger"
                    role="progressbar"
                    style={{ width: `${hrPercent}%` }}
                    aria-valuenow={hrPercent}
                    aria-valuemin="0"
                    aria-valuemax="100"
                  ></div>
                </div>
              </div>

              <div className="mb-4">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <span className="fw-semibold text-secondary">
                    <i className="bi bi-person-badge me-2 text-warning"></i>Managers
                  </span>
                  <span className="small text-muted">
                    <span className="badge bg-warning bg-opacity-10 text-dark me-2">Active: {managersCount}</span>
                    ({mgrPercent}%)
                  </span>
                </div>
                <div className="progress" style={{ height: '10px' }}>
                  <div
                    className="progress-bar bg-warning text-dark"
                    role="progressbar"
                    style={{ width: `${mgrPercent}%` }}
                    aria-valuenow={mgrPercent}
                    aria-valuemin="0"
                    aria-valuemax="100"
                  ></div>
                </div>
              </div>

              <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <span className="fw-semibold text-secondary">
                    <i className="bi bi-person me-2 text-primary"></i>Employees
                  </span>
                  <span className="small text-muted">
                    <span className="badge bg-primary bg-opacity-10 text-primary me-2">Active: {employeesCount}</span>
                    ({empPercent}%)
                  </span>
                </div>
                <div className="progress" style={{ height: '10px' }}>
                  <div
                    className="progress-bar bg-primary"
                    role="progressbar"
                    style={{ width: `${empPercent}%` }}
                    aria-valuenow={empPercent}
                    aria-valuemin="0"
                    aria-valuemax="100"
                  ></div>
                </div>
              </div>

              <div className="mt-auto pt-3 border-top d-flex justify-content-between text-muted small">
                <span>Total Active Staff Count:</span>
                <span className="fw-bold text-dark">{totalTrackedStaff}</span>
              </div>
            </div>
          </div>
        )}

        {/* Complaints Breakdown */}
        <div className={role === 'HR' ? 'col-12 col-lg-6' : 'col-12'}>
          <div className="card border-0 shadow-sm p-4 bg-white rounded-3 h-100">
            <h5 className="fw-bold mb-3">Complaints & Tickets Overview</h5>
            <p className="text-muted small mb-3">
              {role === 'MANAGER'
                ? 'Status of tickets filed by your team or assigned to you.'
                : role === 'HR'
                ? 'Status of all tickets filed across the organization.'
                : 'Status of your submitted grievance tickets.'}
            </p>

            <div className="table-responsive">
              <table className="table table-borderless align-middle mb-0">
                <tbody>
                  <tr>
                    <td>
                      <i className="bi bi-dot text-danger fs-3 align-middle"></i> Open
                    </td>
                    <td className="text-end fw-bold">{openCount}</td>
                  </tr>
                  <tr>
                    <td>
                      <i className="bi bi-dot text-primary fs-3 align-middle"></i> Assigned
                    </td>
                    <td className="text-end fw-bold">{assignedCount}</td>
                  </tr>
                  <tr>
                    <td>
                      <i className="bi bi-dot text-warning fs-3 align-middle"></i> In Progress
                    </td>
                    <td className="text-end fw-bold">{inProgressCount}</td>
                  </tr>
                  <tr>
                    <td>
                      <i className="bi bi-dot text-success fs-3 align-middle"></i> Resolved / Closed
                    </td>
                    <td className="text-end fw-bold">{resolvedClosedCount}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}