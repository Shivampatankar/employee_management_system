import React, { useState, useEffect } from 'react';
import API from '../api';

export default function Complaints() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL');
  const [search, setSearch] = useState('');
  const [filterPriority, setFilterPriority] = useState('ALL');

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);

  // New complaint form state
  const [formData, setFormData] = useState({
    title: '',
    category: 'Workplace & Facility',
    priority: 'Medium',
    description: '',
  });

  // Status update form state (HR / Manager)
  const [statusUpdate, setStatusUpdate] = useState({ status: '', remarks: '' });
  const [actionLoading, setActionLoading] = useState(false);

  const role = (localStorage.getItem('role') || 'EMPLOYEE').toUpperCase();
  const isAdmin = role === 'HR';

  const cleanStatus = (s) => {
    if (!s) return '';
    return String(s).trim().toUpperCase().replace(/\s+/g, '_');
  };

  const isTicketClosed = (status) => {
    const s = cleanStatus(status);
    return s === 'RESOLVED' || s === 'CLOSED';
  };

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const res = await API.get('/complaints');
      const list = Array.isArray(res.data) ? res.data : (res.data.data || []);
      setComplaints(list);
    } catch (err) {
      console.error('Failed to load complaints:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await API.post('/complaints', formData);
      setShowCreateModal(false);
      setFormData({
        title: '',
        category: 'Workplace & Facility',
        priority: 'Medium',
        description: '',
      });
      fetchComplaints();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to file grievance.');
    }
  };

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    if (!statusUpdate.status || !selectedTicket) return;

    if (isTicketClosed(selectedTicket.status)) {
      alert('This complaint is already closed/resolved and permanently locked.');
      return;
    }

    setActionLoading(true);
    try {
      const res = await API.patch(`/complaints/${selectedTicket.id}/status`, {
        status: statusUpdate.status,
        remarks: statusUpdate.remarks || undefined,
      });

      // Update state in place immediately
      setComplaints((prev) =>
        prev.map((c) => (c.id === selectedTicket.id ? { ...c, ...res.data } : c))
      );

      setStatusUpdate({ status: '', remarks: '' });
      setSelectedTicket(null);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to update ticket status.');
    } finally {
      setActionLoading(false);
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority?.toUpperCase()) {
      case 'CRITICAL':
        return (
          <span className="badge bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25 px-2 py-1">
            <i className="bi bi-fire me-1"></i>Critical
          </span>
        );
      case 'HIGH':
        return (
          <span className="badge bg-warning bg-opacity-10 text-dark border border-warning border-opacity-50 px-2 py-1">
            <i className="bi bi-exclamation-triangle-fill me-1 text-warning"></i>High
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25 px-2 py-1">
            <i className="bi bi-info-circle me-1"></i>Medium
          </span>
        );
      default:
        return (
          <span className="badge bg-secondary bg-opacity-10 text-secondary border border-secondary border-opacity-25 px-2 py-1">
            <i className="bi bi-arrow-down-circle me-1"></i>Low
          </span>
        );
    }
  };

  const getStatusBadge = (status) => {
    const s = cleanStatus(status);
    switch (s) {
      case 'OPEN':
        return <span className="badge bg-danger text-white rounded-pill px-3 py-1 fw-semibold">Open</span>;
      case 'ASSIGNED':
        return <span className="badge bg-info text-dark rounded-pill px-3 py-1 fw-semibold">Assigned</span>;
      case 'IN_PROGRESS':
        return <span className="badge bg-warning text-dark rounded-pill px-3 py-1 fw-semibold">In Progress</span>;
      case 'RESOLVED':
        return (
          <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-50 rounded-pill px-3 py-1 fw-semibold">
            <i className="bi bi-lock-fill me-1 text-success"></i>Resolved & Locked
          </span>
        );
      case 'CLOSED':
        return (
          <span className="badge bg-secondary bg-opacity-10 text-secondary border border-secondary border-opacity-50 rounded-pill px-3 py-1 fw-semibold">
            <i className="bi bi-lock-fill me-1 text-secondary"></i>Closed & Locked
          </span>
        );
      case 'REJECTED':
        return <span className="badge bg-dark text-white rounded-pill px-3 py-1 fw-semibold">Rejected</span>;
      default:
        return <span className="badge bg-light text-dark rounded-pill px-3 py-1">{status}</span>;
    }
  };

  const totalCount = complaints.length;
  const openCount = complaints.filter((c) => cleanStatus(c.status) === 'OPEN').length;
  const progressCount = complaints.filter((c) => {
    const s = cleanStatus(c.status);
    return s === 'IN_PROGRESS' || s === 'ASSIGNED';
  }).length;
  const resolvedCount = complaints.filter((c) => isTicketClosed(c.status)).length;

  const filteredComplaints = complaints.filter((item) => {
    const s = cleanStatus(item.status);
    const matchesTab =
      activeTab === 'ALL'
        ? true
        : activeTab === 'OPEN'
        ? s === 'OPEN'
        : activeTab === 'IN_PROGRESS'
        ? s === 'IN_PROGRESS' || s === 'ASSIGNED'
        : isTicketClosed(item.status);

    const matchesPriority =
      filterPriority === 'ALL' || item.priority?.toUpperCase() === filterPriority.toUpperCase();

    const matchesSearch =
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.complaint_code.toLowerCase().includes(search.toLowerCase()) ||
      item.category.toLowerCase().includes(search.toLowerCase());

    return matchesTab && matchesPriority && matchesSearch;
  });

  return (
    <div className="container-fluid py-4 px-4">
      {/* Header Bar */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h4 className="fw-bold text-dark mb-1 d-flex align-items-center gap-2">
            <i className="bi bi-shield-exclamation text-primary"></i> Grievance & Ticket Resolution Portal
          </h4>
          <p className="text-muted small mb-0">
            {isAdmin
              ? 'Administrator control room: review organization-wide reports, assign ownership, and resolve tickets.'
              : role === 'MANAGER'
              ? 'Review grievances related to your team, evaluate progress, and update status.'
              : 'Submit, track, and monitor transparent status logs for your workplace grievances.'}
          </p>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-secondary btn-sm px-3 shadow-sm" onClick={fetchComplaints}>
            <i className="bi bi-arrow-clockwise me-1"></i> Refresh
          </button>
          
          {/* File Grievance hidden for Admin / HR */}
          {!isAdmin && (
            <button
              className="btn btn-primary btn-sm px-3 shadow-sm d-flex align-items-center gap-1"
              onClick={() => setShowCreateModal(true)}
            >
              <i className="bi bi-plus-circle"></i> File Grievance
            </button>
          )}
        </div>
      </div>

      {/* Metric Quick-Filter Cards */}
      <div className="row g-3 mb-4">
        {/* Total Grievances */}
        <div className="col-12 col-sm-6 col-xl-3">
          <div
            className={`card border-0 shadow-sm p-3 rounded-3 transition-all ${
              activeTab === 'ALL'
                ? 'bg-primary text-white border-primary shadow'
                : 'bg-white text-dark'
            }`}
            onClick={() => setActiveTab('ALL')}
            style={{ cursor: 'pointer' }}
          >
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <span className={`small text-uppercase fw-semibold ${activeTab === 'ALL' ? 'text-white-50' : 'text-muted'}`}>
                  Total Grievances
                </span>
                <h3 className="fw-bold mb-0 mt-1">{totalCount}</h3>
              </div>
              <div
                className="rounded-3 p-3 d-flex align-items-center justify-content-center shadow-sm"
                style={{
                  backgroundColor: activeTab === 'ALL' ? '#ffffff' : '#eff6ff',
                  color: '#2563eb',
                  width: '52px',
                  height: '52px',
                }}
              >
                <i className="bi bi-journals fs-4 text-primary"></i>
              </div>
            </div>
          </div>
        </div>

        {/* Unassigned / Open */}
        <div className="col-12 col-sm-6 col-xl-3">
          <div
            className={`card border-0 shadow-sm p-3 rounded-3 transition-all ${
              activeTab === 'OPEN'
                ? 'bg-danger text-white border-danger shadow'
                : 'bg-white text-dark'
            }`}
            onClick={() => setActiveTab('OPEN')}
            style={{ cursor: 'pointer' }}
          >
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <span className={`small text-uppercase fw-semibold ${activeTab === 'OPEN' ? 'text-white-50' : 'text-muted'}`}>
                  Unassigned / Open
                </span>
                <h3 className="fw-bold mb-0 mt-1">{openCount}</h3>
              </div>
              <div
                className="rounded-3 p-3 d-flex align-items-center justify-content-center shadow-sm"
                style={{
                  backgroundColor: activeTab === 'OPEN' ? '#ffffff' : '#fef2f2',
                  color: '#dc2626',
                  width: '52px',
                  height: '52px',
                }}
              >
                <i className="bi bi-exclamation-circle fs-4 text-danger"></i>
              </div>
            </div>
          </div>
        </div>

        {/* Under Review */}
        <div className="col-12 col-sm-6 col-xl-3">
          <div
            className={`card border-0 shadow-sm p-3 rounded-3 transition-all ${
              activeTab === 'IN_PROGRESS'
                ? 'bg-warning text-dark border-warning shadow'
                : 'bg-white text-dark'
            }`}
            onClick={() => setActiveTab('IN_PROGRESS')}
            style={{ cursor: 'pointer' }}
          >
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <span className={`small text-uppercase fw-semibold ${activeTab === 'IN_PROGRESS' ? 'text-dark-50' : 'text-muted'}`}>
                  Under Review
                </span>
                <h3 className="fw-bold mb-0 mt-1">{progressCount}</h3>
              </div>
              <div
                className="rounded-3 p-3 d-flex align-items-center justify-content-center shadow-sm"
                style={{
                  backgroundColor: activeTab === 'IN_PROGRESS' ? '#ffffff' : '#fefce8',
                  color: '#ca8a04',
                  width: '52px',
                  height: '52px',
                }}
              >
                <i className="bi bi-gear-wide-connected fs-4 text-warning"></i>
              </div>
            </div>
          </div>
        </div>

        {/* Closed & Resolved */}
        <div className="col-12 col-sm-6 col-xl-3">
          <div
            className={`card border-0 shadow-sm p-3 rounded-3 transition-all ${
              activeTab === 'RESOLVED'
                ? 'bg-success text-white border-success shadow'
                : 'bg-white text-dark'
            }`}
            onClick={() => setActiveTab('RESOLVED')}
            style={{ cursor: 'pointer' }}
          >
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <span className={`small text-uppercase fw-semibold ${activeTab === 'RESOLVED' ? 'text-white-50' : 'text-muted'}`}>
                  Closed & Resolved
                </span>
                <h3 className="fw-bold mb-0 mt-1">{resolvedCount}</h3>
              </div>
              <div
                className="rounded-3 p-3 d-flex align-items-center justify-content-center shadow-sm"
                style={{
                  backgroundColor: activeTab === 'RESOLVED' ? '#ffffff' : '#f0fdf4',
                  color: '#16a34a',
                  width: '52px',
                  height: '52px',
                }}
              >
                <i className="bi bi-patch-check fs-4 text-success"></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="card border-0 shadow-sm p-3 bg-white rounded-3 mb-4">
        <div className="row g-2 align-items-center">
          <div className="col-12 col-md-6">
            <div className="input-group">
              <span className="input-group-text bg-light border-end-0 text-muted">
                <i className="bi bi-search"></i>
              </span>
              <input
                type="text"
                className="form-control bg-light border-start-0"
                placeholder="Search ticket code, keywords, or department category..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="col-6 col-md-3">
            <select
              className="form-select bg-light"
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
            >
              <option value="ALL">Filter: All Priorities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>

          <div className="col-6 col-md-3 text-end">
            <span className="text-muted small">
              Showing <strong>{filteredComplaints.length}</strong> of {totalCount} records
            </span>
          </div>
        </div>
      </div>

      {/* Ticket List View */}
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status"></div>
          <div className="text-muted small mt-2">Loading grievance roster...</div>
        </div>
      ) : filteredComplaints.length === 0 ? (
        <div className="card border-0 shadow-sm p-5 bg-white rounded-3 text-center">
          <i className="bi bi-check2-circle text-success display-4 mb-3"></i>
          <h5 className="fw-bold text-dark">No Grievances Found</h5>
          <p className="text-muted small mb-0">No records match the current filter selection or search query.</p>
        </div>
      ) : (
        <div className="row g-3">
          {filteredComplaints.map((ticket) => {
            const isClosed = isTicketClosed(ticket.status);

            return (
              <div className="col-12" key={ticket.id}>
                <div
                  className={`card border-0 shadow-sm p-3 bg-white rounded-3 hover-shadow transition-all ${
                    isClosed ? 'bg-light bg-opacity-50' : ''
                  }`}
                  style={{
                    borderLeft: isClosed
                      ? '5px solid #198754'
                      : ticket.priority === 'Critical'
                      ? '5px solid #dc3545'
                      : '5px solid #0d6efd',
                  }}
                >
                  <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-2">
                    <div className="d-flex align-items-start gap-3">
                      <div
                        className="rounded-circle p-2 bg-light text-primary d-flex align-items-center justify-content-center"
                        style={{ width: '45px', height: '45px', minWidth: '45px' }}
                      >
                        <i className={`bi ${isClosed ? 'bi-lock-fill text-success' : 'bi-ticket-perforated'}`}></i>
                      </div>
                      <div>
                        <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                          <span className="badge bg-dark bg-opacity-75">{ticket.complaint_code}</span>
                          {getPriorityBadge(ticket.priority)}
                          <span className="badge bg-secondary bg-opacity-10 text-secondary border">
                            <i className="bi bi-tag me-1"></i>{ticket.category}
                          </span>
                          {isClosed && (
                            <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25" style={{ fontSize: '0.72rem' }}>
                              <i className="bi bi-shield-lock me-1"></i>Permanent Closure
                            </span>
                          )}
                        </div>
                        <h6 className="fw-bold text-dark mb-1">{ticket.title}</h6>
                        <p className="text-muted small mb-0 text-truncate" style={{ maxWidth: '650px' }}>
                          {ticket.description}
                        </p>
                      </div>
                    </div>

                    <div className="d-flex align-items-center gap-3 ms-auto ms-md-0 mt-2 mt-md-0">
                      <div className="text-end d-none d-lg-block">
                        {getStatusBadge(ticket.status)}
                        <div className="text-muted small mt-1" style={{ fontSize: '0.75rem' }}>
                          {new Date(ticket.created_at).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </div>
                      </div>
                      <button
                        className="btn btn-outline-primary btn-sm px-3 rounded-pill fw-semibold shadow-sm"
                        onClick={() => {
                          setSelectedTicket(ticket);
                          setStatusUpdate({ status: ticket.status, remarks: '' });
                        }}
                      >
                        {isClosed ? 'View Audit Record' : 'View Details'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* DETAIL / AUDIT MODAL */}
      {selectedTicket && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              <div className="modal-header bg-light border-0 px-4 py-3">
                <div className="d-flex align-items-center gap-2">
                  <span className="badge bg-primary fs-6">{selectedTicket.complaint_code}</span>
                  <h5 className="modal-title fw-bold text-dark mb-0">{selectedTicket.title}</h5>
                </div>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setSelectedTicket(null)}
                ></button>
              </div>

              <div className="modal-body p-4">
                <div className="d-flex flex-wrap gap-2 mb-3 pb-3 border-bottom">
                  <div>
                    <span className="text-muted small me-2">Status:</span>
                    {getStatusBadge(selectedTicket.status)}
                  </div>
                  <div className="ms-3">
                    <span className="text-muted small me-2">Priority:</span>
                    {getPriorityBadge(selectedTicket.priority)}
                  </div>
                  <div className="ms-3">
                    <span className="text-muted small me-2">Category:</span>
                    <span className="badge bg-light text-dark border">{selectedTicket.category}</span>
                  </div>
                </div>

                <h6 className="fw-bold text-dark mb-2">Description</h6>
                <div className="p-3 bg-light rounded-3 text-secondary small mb-4 lh-base">
                  {selectedTicket.description}
                </div>

                {selectedTicket.resolution_remarks && (
                  <div className="alert alert-info py-2 px-3 small rounded-3 mb-4">
                    <i className="bi bi-info-circle-fill me-2"></i>
                    <strong>Official Remarks:</strong> {selectedTicket.resolution_remarks}
                  </div>
                )}

                {/* If ticket is Resolved or Closed -> Show Permanent Lock Badge */}
                {isTicketClosed(selectedTicket.status) ? (
                  <div className="p-3 border rounded-3 bg-light text-center">
                    <div className="text-success fw-bold small mb-1">
                      <i className="bi bi-shield-lock-fill me-1"></i> Ticket Resolved & Closed
                    </div>
                    <span className="text-muted small">
                      This grievance has been finalized and permanently locked. No further modifications or status transitions can be performed.
                    </span>
                  </div>
                ) : (
                  /* Form only available if ticket is still active */
                  (role === 'HR' || role === 'MANAGER') && (
                    <form onSubmit={handleUpdateStatus} className="p-3 border rounded-3 bg-light">
                      <h6 className="fw-bold mb-2">Administrative Status Action</h6>
                      <div className="row g-2 mb-2">
                        <div className="col-12 col-sm-4">
                          <select
                            className="form-select form-select-sm"
                            value={statusUpdate.status}
                            onChange={(e) => setStatusUpdate({ ...statusUpdate, status: e.target.value })}
                            required
                          >
                            <option value="">Select Action...</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Resolved">Resolved (Freeze & Finalize)</option>
                            <option value="Closed">Closed (Permanent Lock)</option>
                            <option value="Rejected">Rejected</option>
                          </select>
                        </div>
                        <div className="col-12 col-sm-8">
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder="Add official audit remarks..."
                            value={statusUpdate.remarks}
                            onChange={(e) => setStatusUpdate({ ...statusUpdate, remarks: e.target.value })}
                            required={statusUpdate.status === 'Resolved' || statusUpdate.status === 'Closed'}
                          />
                        </div>
                      </div>
                      <div className="d-flex justify-content-between align-items-center mt-2">
                        <small className="text-muted" style={{ fontSize: '0.75rem' }}>
                          <i className="bi bi-exclamation-circle me-1"></i>
                          Selecting <strong>Resolved</strong> or <strong>Closed</strong> will permanently lock this ticket.
                        </small>
                        <button
                          type="submit"
                          className="btn btn-primary btn-sm px-3 fw-semibold shadow-sm"
                          disabled={actionLoading || !statusUpdate.status}
                        >
                          {actionLoading ? 'Updating...' : 'Commit Status Update'}
                        </button>
                      </div>
                    </form>
                  )
                )}
              </div>

              <div className="modal-footer border-0 bg-light px-4 py-2">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm px-3 rounded-pill"
                  onClick={() => setSelectedTicket(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE GRIEVANCE MODAL (Rendered only for non-admin users) */}
      {!isAdmin && showCreateModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              <div className="modal-header bg-light border-0 px-4 py-3">
                <h5 className="modal-title fw-bold text-dark">File a New Grievance</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowCreateModal(false)}
                ></button>
              </div>

              <form onSubmit={handleCreate}>
                <div className="modal-body p-4">
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Subject / Ticket Title</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Workstation monitor malfunction"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      required
                    />
                  </div>

                  <div className="row g-2 mb-3">
                    <div className="col-6">
                      <label className="form-label small fw-semibold">Category</label>
                      <select
                        className="form-select"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      >
                        <option value="Workplace & Facility">Workplace & Facility</option>
                        <option value="IT & Hardware">IT & Hardware</option>
                        <option value="Payroll & HR">Payroll & HR</option>
                        <option value="Interpersonal / Ethics">Interpersonal / Ethics</option>
                      </select>
                    </div>

                    <div className="col-6">
                      <label className="form-label small fw-semibold">Priority</label>
                      <select
                        className="form-select"
                        value={formData.priority}
                        onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                      >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                        <option value="Critical">Critical</option>
                      </select>
                    </div>
                  </div>

                  <div className="mb-2">
                    <label className="form-label small fw-semibold">Detailed Description</label>
                    <textarea
                      className="form-control"
                      rows="4"
                      placeholder="Provide specific details so the HR/Manager team can address this swiftly..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      required
                    ></textarea>
                  </div>
                </div>

                <div className="modal-footer border-0 bg-light px-4 py-3">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm rounded-pill"
                    onClick={() => setShowCreateModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary btn-sm px-4 fw-semibold rounded-pill shadow-sm">
                    Submit Ticket
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}