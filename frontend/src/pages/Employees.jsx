import React, { useState, useEffect } from 'react';
import API from '../api';

export default function Employees() {
  const [data, setData] = useState({ data: [], total: 0, page: 1 });
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'grid'
  const [page, setPage] = useState(1);
  const [loadingId, setLoadingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const currentRole = (localStorage.getItem('role') || '').toUpperCase();
  const PAGE_SIZE = 6;

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const res = await API.get('/employees', {
        params: {
          page,
          page_size: PAGE_SIZE,
          search: search || undefined,
          is_active: statusFilter === 'ALL' ? undefined : statusFilter === 'ACTIVE',
        },
      });
      setData(res.data);
    } catch (err) {
      console.error('Failed to load employee list:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [page, search, statusFilter]);

  const handleToggleStatus = async (emp) => {
    if (emp.id === 1 || emp.email === 'admin@ems.com') {
      window.alert('Primary Admin account is system-protected and cannot be deactivated.');
      return;
    }

    const action = emp.is_active ? 'deactivate' : 'activate';
    const confirmed = window.confirm(`Are you sure you want to ${action} ${emp.name}'s account?`);
    if (!confirmed) return;

    setErrorMsg('');
    setLoadingId(emp.id);

    try {
      const res = await API.patch(`/employees/${emp.id}/toggle-status`);
      setData((prev) => ({
        ...prev,
        data: prev.data.map((item) =>
          item.id === emp.id ? { ...item, is_active: res.data.is_active } : item
        ),
      }));
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || `Failed to ${action} employee.`);
    } finally {
      setLoadingId(null);
    }
  };

  const displayedEmployees = data.data.filter((emp) => {
    if (roleFilter === 'ALL') return true;
    return emp.role?.toUpperCase() === roleFilter;
  });

  const totalPages = Math.ceil(data.total / PAGE_SIZE) || 1;
  const startRecord = data.total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const endRecord = Math.min(page * PAGE_SIZE, data.total);

  const isPrimaryAdmin = (emp) => emp.id === 1 || emp.email === 'admin@ems.com';

  const getRoleBadge = (roleName) => {
    switch (roleName?.toUpperCase()) {
      case 'HR':
        return (
          <span className="badge bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25 px-2 py-1 rounded-pill">
            <i className="bi bi-shield-lock-fill me-1"></i>HR Superuser
          </span>
        );
      case 'MANAGER':
        return (
          <span className="badge bg-warning bg-opacity-10 text-dark border border-warning border-opacity-50 px-2 py-1 rounded-pill">
            <i className="bi bi-person-badge-fill me-1 text-warning"></i>Team Manager
          </span>
        );
      default:
        return (
          <span className="badge bg-info bg-opacity-10 text-info border border-info border-opacity-25 px-2 py-1 rounded-pill">
            <i className="bi bi-person-fill me-1"></i>Employee
          </span>
        );
    }
  };

  return (
    <div className="container-fluid px-0">
      {/* Page Title & View Switcher */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h4 className="fw-bold text-dark mb-1 d-flex align-items-center gap-2">
            <i className="bi bi-people text-primary"></i>
            {currentRole === 'MANAGER' ? 'My Assigned Team Members' : 'Workforce & Talent Directory'}
          </h4>
          <p className="text-muted small mb-0">
            {currentRole === 'MANAGER'
              ? 'Real-time overview of personnel assigned to your reporting unit.'
              : 'Enterprise directory, role classifications, contact profiles, and credential access control.'}
          </p>
        </div>

        <div className="d-flex align-items-center gap-2">
          <div className="btn-group shadow-sm" role="group">
            <button
              type="button"
              className={`btn btn-sm ${viewMode === 'table' ? 'btn-primary' : 'btn-outline-secondary bg-white'}`}
              onClick={() => setViewMode('table')}
              title="Table View"
            >
              <i className="bi bi-table me-1"></i> Table
            </button>
            <button
              type="button"
              className={`btn btn-sm ${viewMode === 'grid' ? 'btn-primary' : 'btn-outline-secondary bg-white'}`}
              onClick={() => setViewMode('grid')}
              title="Card Grid View"
            >
              <i className="bi bi-grid me-1"></i> Cards
            </button>
          </div>

          <button className="btn btn-outline-secondary btn-sm px-3 shadow-sm" onClick={fetchEmployees}>
            <i className="bi bi-arrow-clockwise me-1"></i> Refresh
          </button>
        </div>
      </div>

      {/* Error Alert Box */}
      {errorMsg && (
        <div className="alert alert-danger alert-dismissible fade show py-2 px-3 small rounded-3 mb-3 border-0 shadow-sm">
          <i className="bi bi-exclamation-triangle-fill me-2 fs-6"></i>
          {errorMsg}
          <button
            type="button"
            className="btn-close py-2"
            aria-label="Close"
            onClick={() => setErrorMsg('')}
          ></button>
        </div>
      )}

      {/* Search & Multi-Filter Controls */}
      <div className="card border-0 shadow-sm p-3 bg-white rounded-3 mb-4 overflow-visible">
        <div className="row g-2 align-items-center m-0 w-100">
          <div className="col-12 col-lg-4 ps-0 pe-lg-2 mb-2 mb-lg-0" style={{ minWidth: 0 }}>
            <div className="input-group">
              <span className="input-group-text bg-light border-end-0 text-muted">
                <i className="bi bi-search"></i>
              </span>
              <input
                type="text"
                className="form-control bg-light border-start-0"
                placeholder="Search by name, email, or phone..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>

          <div className="col-6 col-sm-6 col-lg-3 px-1 mb-2 mb-lg-0" style={{ minWidth: 0 }}>
            <select
              className="form-select bg-light w-100"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              style={{ fontSize: '0.88rem' }}
            >
              <option value="ALL">All Roles</option>
              <option value="HR">HR Administrators</option>
              <option value="MANAGER">Managers</option>
              <option value="EMPLOYEE">Employees</option>
            </select>
          </div>

          <div className="col-6 col-sm-6 col-lg-3 px-1 mb-2 mb-lg-0" style={{ minWidth: 0 }}>
            <select
              className="form-select bg-light w-100"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              style={{ fontSize: '0.88rem' }}
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active Only</option>
              <option value="INACTIVE">Deactivated Only</option>
            </select>
          </div>

          <div className="col-12 col-lg-2 pe-0 text-lg-end text-muted small mt-2 mt-lg-0">
            <span>
              Total: <strong>{data.total}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Content Rendering: Table or Card Grid */}
      {loading ? (
        <div className="text-center py-5 bg-white rounded-3 shadow-sm border">
          <div className="spinner-border text-primary" role="status"></div>
          <div className="text-muted small mt-2">Loading workforce records...</div>
        </div>
      ) : displayedEmployees.length === 0 ? (
        <div className="card border-0 shadow-sm p-5 bg-white rounded-3 text-center">
          <i className="bi bi-person-x text-muted display-4 mb-3"></i>
          <h5 className="fw-bold text-dark">No Staff Members Found</h5>
          <p className="text-muted small mb-0">No records match the current filter criteria or search keyword.</p>
        </div>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW */
        <div className="table-responsive bg-white rounded-3 shadow-sm border">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr className="text-secondary small text-uppercase">
                <th className="py-3 px-3">Employee</th>
                <th className="py-3">Contact Details</th>
                <th className="py-3">Designation</th>
                <th className="py-3">System Role</th>
                <th className="py-3">Status</th>
                {currentRole === 'HR' && <th className="py-3 text-center">Administrative Control</th>}
              </tr>
            </thead>
            <tbody>
              {displayedEmployees.map((emp) => {
                const isAdmin = isPrimaryAdmin(emp);

                return (
                  <tr key={emp.id} className={!emp.is_active ? 'table-light opacity-75' : ''}>
                    <td className="px-3">
                      <div className="d-flex align-items-center gap-3">
                        <div className="position-relative">
                          {emp.profile_photo ? (
                            <img
                              src={emp.profile_photo}
                              alt={emp.name}
                              className="rounded-circle object-fit-cover border shadow-sm"
                              style={{ width: '42px', height: '42px', minWidth: '42px' }}
                              onError={(e) => {
                                e.target.style.display = 'none';
                                if (e.target.nextSibling) {
                                  e.target.nextSibling.style.display = 'flex';
                                }
                              }}
                            />
                          ) : null}
                          <div
                            className="rounded-circle bg-primary bg-opacity-10 text-primary align-items-center justify-content-center fw-bold shadow-sm"
                            style={{
                              width: '42px',
                              height: '42px',
                              minWidth: '42px',
                              display: emp.profile_photo ? 'none' : 'flex',
                            }}
                          >
                            {emp.name ? emp.name.charAt(0).toUpperCase() : 'U'}
                          </div>
                        </div>
                        <div>
                          <div className="fw-bold text-dark d-flex align-items-center gap-1">
                            {emp.name}
                            {isAdmin && (
                              <i
                                className="bi bi-shield-fill-check text-primary small"
                                title="Root System Administrator"
                              ></i>
                            )}
                          </div>
                          <span className="text-muted small">ID: #{emp.id}</span>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div className="d-flex flex-column">
                        <span className="small text-dark fw-medium">
                          <i className="bi bi-envelope me-1 text-muted"></i>
                          {emp.email}
                        </span>
                        <span className="small text-muted">
                          <i className="bi bi-telephone me-1 text-muted"></i>
                          {emp.mobile_number}
                        </span>
                      </div>
                    </td>

                    <td>
                      <span className="badge bg-light text-secondary border px-2 py-1">
                        {emp.designation || 'Staff'}
                      </span>
                    </td>

                    <td>{getRoleBadge(emp.role)}</td>

                    <td>
                      {emp.is_active ? (
                        <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 px-2 py-1 rounded-pill">
                          <i className="bi bi-check-circle-fill me-1"></i>Active
                        </span>
                      ) : (
                        <span className="badge bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25 px-2 py-1 rounded-pill">
                          <i className="bi bi-dash-circle-fill me-1"></i>Deactivated
                        </span>
                      )}
                    </td>

                    {currentRole === 'HR' && (
                      <td className="text-center">
                        {isAdmin ? (
                          <span
                            className="badge bg-secondary bg-opacity-10 text-secondary border px-3 py-1 rounded-pill small"
                            title="Primary system account cannot be disabled."
                          >
                            <i className="bi bi-lock-fill me-1 text-warning"></i>Permanent Admin
                          </span>
                        ) : (
                          <button
                            className={`btn btn-sm ${
                              emp.is_active ? 'btn-outline-danger' : 'btn-outline-success'
                            } rounded-pill px-3 py-1 fw-semibold d-inline-flex align-items-center gap-1 shadow-sm`}
                            disabled={loadingId === emp.id}
                            onClick={() => handleToggleStatus(emp)}
                          >
                            {loadingId === emp.id ? (
                              <span className="spinner-border spinner-border-sm" role="status"></span>
                            ) : (
                              <i className={`bi ${emp.is_active ? 'bi-person-x' : 'bi-person-check'}`}></i>
                            )}
                            <span>{emp.is_active ? 'Deactivate' : 'Activate'}</span>
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* CARD GRID VIEW */
        <div className="row g-3">
          {displayedEmployees.map((emp) => {
            const isAdmin = isPrimaryAdmin(emp);

            return (
              <div className="col-12 col-md-6 col-xl-4" key={emp.id}>
                <div
                  className={`card border-0 shadow-sm p-4 bg-white rounded-3 h-100 position-relative hover-shadow transition-all ${
                    !emp.is_active ? 'opacity-75 bg-light' : ''
                  }`}
                  style={{
                    borderTop: isAdmin
                      ? '4px solid #f59e0b'
                      : emp.is_active
                      ? '4px solid #2563eb'
                      : '4px solid #dc3545',
                  }}
                >
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <span className="text-muted small fw-semibold">#{emp.id}</span>
                    {isAdmin ? (
                      <span className="badge bg-warning bg-opacity-10 text-dark border border-warning border-opacity-50 px-2 py-1 rounded-pill">
                        <i className="bi bi-shield-check me-1"></i>Primary Admin
                      </span>
                    ) : emp.is_active ? (
                      <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 px-2 py-1 rounded-pill">
                        Active
                      </span>
                    ) : (
                      <span className="badge bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25 px-2 py-1 rounded-pill">
                        Deactivated
                      </span>
                    )}
                  </div>

                  <div className="text-center mb-3">
                    <div className="position-relative d-inline-block mb-2">
                      {emp.profile_photo ? (
                        <img
                          src={emp.profile_photo}
                          alt={emp.name}
                          className="rounded-circle object-fit-cover border border-3 border-white shadow"
                          style={{ width: '68px', height: '68px' }}
                          onError={(e) => {
                            e.target.style.display = 'none';
                            if (e.target.nextSibling) {
                              e.target.nextSibling.style.display = 'flex';
                            }
                          }}
                        />
                      ) : null}
                      <div
                        className="rounded-circle bg-primary bg-opacity-10 text-primary align-items-center justify-content-center fw-bold fs-4 shadow-sm"
                        style={{
                          width: '68px',
                          height: '68px',
                          display: emp.profile_photo ? 'none' : 'flex',
                        }}
                      >
                        {emp.name ? emp.name.charAt(0).toUpperCase() : 'U'}
                      </div>
                    </div>

                    <h6 className="fw-bold text-dark mb-1 d-flex align-items-center justify-content-center gap-1">
                      {emp.name}
                    </h6>
                    <p className="text-muted small mb-2">{emp.designation}</p>
                    <div>{getRoleBadge(emp.role)}</div>
                  </div>

                  <div className="bg-light p-3 rounded-3 small text-secondary mb-3 mt-auto">
                    <div className="d-flex align-items-center text-truncate mb-1">
                      <i className="bi bi-envelope text-primary me-2"></i>
                      <span className="text-truncate">{emp.email}</span>
                    </div>
                    <div className="d-flex align-items-center text-truncate">
                      <i className="bi bi-telephone text-primary me-2"></i>
                      <span>{emp.mobile_number}</span>
                    </div>
                  </div>

                  {currentRole === 'HR' && (
                    <>
                      {isAdmin ? (
                        <div className="text-center py-2 bg-light rounded-3 text-muted small fw-semibold">
                          <i className="bi bi-lock-fill me-1 text-warning"></i> Permanent System Superuser
                        </div>
                      ) : (
                        <button
                          className={`btn btn-sm ${
                            emp.is_active ? 'btn-outline-danger' : 'btn-outline-success'
                          } w-100 rounded-3 py-2 fw-semibold d-flex align-items-center justify-content-center gap-2 shadow-sm`}
                          disabled={loadingId === emp.id}
                          onClick={() => handleToggleStatus(emp)}
                        >
                          {loadingId === emp.id ? (
                            <span className="spinner-border spinner-border-sm" role="status"></span>
                          ) : (
                            <i className={`bi ${emp.is_active ? 'bi-person-x' : 'bi-person-check'}`}></i>
                          )}
                          <span>{emp.is_active ? 'Deactivate Account' : 'Activate Account'}</span>
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-center mt-4 gap-3">
        <span className="text-muted small">
          Showing <strong>{startRecord}</strong> to <strong>{endRecord}</strong> of{' '}
          <strong>{data.total}</strong> workforce members
        </span>

        <div className="d-flex align-items-center gap-2">
          <button
            className="btn btn-outline-secondary btn-sm rounded-pill px-3 shadow-sm"
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(p - 1, 1))}
          >
            <i className="bi bi-chevron-left me-1"></i> Previous
          </button>

          <span className="badge bg-white text-dark border px-3 py-2 rounded-pill small shadow-sm">
            Page {page} of {totalPages}
          </span>

          <button
            className="btn btn-outline-secondary btn-sm rounded-pill px-3 shadow-sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next <i className="bi bi-chevron-right ms-1"></i>
          </button>
        </div>
      </div>
    </div>
  );
}