import React, { useState, useEffect } from 'react';
import API from '../api';
import { useNavigate } from 'react-router-dom';

export default function Tasks() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [actionModalType, setActionModalType] = useState(null); // 'EMPLOYEE_SUBMIT' | 'MANAGER_REVIEW'

  // Forms
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM',
    due_date: '',
    assigned_to_id: '',
  });

  const [updateForm, setUpdateForm] = useState({
    status: '',
    completion_notes: '',
    manager_remarks: '',
  });

  const [submitting, setSubmitting] = useState(false);

  const role = (localStorage.getItem('role') || 'EMPLOYEE').toUpperCase();
  const isManager = role === 'MANAGER';

  const cleanStatus = (s) => {
    if (!s) return 'PENDING';
    return String(s).trim().toUpperCase().replace(/\s+/g, '_');
  };

  useEffect(() => {
    if (role === 'HR') {
      navigate('/dashboard', { replace: true });
      return;
    }
    fetchTasks();
    if (isManager) {
      fetchTeamMembers();
    }
  }, []);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await API.get('/tasks');
      setTasks(res.data || []);
    } catch (err) {
      console.error('Failed to load tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      const res = await API.get('/employees?page=1&page_size=100');
      const list = res.data?.data || [];
      setTeamMembers(list.filter((emp) => emp.role === 'EMPLOYEE' && emp.is_active));
    } catch (err) {
      console.error('Failed to load team members:', err);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!createForm.title.trim() || !createForm.description.trim() || !createForm.assigned_to_id) {
      alert('Please fill out all required fields.');
      return;
    }

    setSubmitting(true);
    try {
      await API.post('/tasks', {
        title: createForm.title,
        description: createForm.description,
        priority: createForm.priority,
        due_date: createForm.due_date || null,
        assigned_to_id: parseInt(createForm.assigned_to_id),
      });

      setShowCreateModal(false);
      setCreateForm({
        title: '',
        description: '',
        priority: 'MEDIUM',
        due_date: '',
        assigned_to_id: '',
      });
      fetchTasks();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to assign task');
    } finally {
      setSubmitting(false);
    }
  };

  const openActionModal = (task, type) => {
    const status = cleanStatus(task.status);
    if (status === 'APPROVED') {
      alert('This task has been approved and is permanently locked.');
      return;
    }

    if (type === 'MANAGER_REVIEW' && status !== 'COMPLETED') {
      alert('You cannot review this task yet. The employee has not submitted it as completed.');
      return;
    }

    setSelectedTask(task);
    setActionModalType(type);
    setUpdateForm({
      status: type === 'MANAGER_REVIEW' ? 'APPROVED' : (status === 'COMPLETED' ? 'COMPLETED' : 'IN_PROGRESS'),
      completion_notes: task.completion_notes || '',
      manager_remarks: task.manager_remarks || '',
    });
  };

  const handleUpdateTaskStatus = async (e) => {
    e.preventDefault();
    if (!selectedTask) return;

    setSubmitting(true);
    try {
      const res = await API.patch(`/tasks/${selectedTask.id}/status`, {
        status: updateForm.status,
        completion_notes: updateForm.completion_notes,
        manager_remarks: updateForm.manager_remarks,
      });

      setTasks((prev) =>
        prev.map((t) => (t.id === selectedTask.id ? { ...t, ...res.data, status: cleanStatus(res.data.status) } : t))
      );

      setSelectedTask(null);
      setActionModalType(null);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to update task');
    } finally {
      setSubmitting(false);
    }
  };

  const getPriorityBadge = (p) => {
    const val = (p || '').toUpperCase();
    switch (val) {
      case 'CRITICAL':
        return <span className="badge bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25 px-2 py-1"><i className="bi bi-fire me-1"></i>Critical</span>;
      case 'HIGH':
        return <span className="badge bg-warning bg-opacity-10 text-dark border border-warning border-opacity-50 px-2 py-1"><i className="bi bi-exclamation-triangle-fill me-1 text-warning"></i>High</span>;
      case 'MEDIUM':
        return <span className="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25 px-2 py-1"><i className="bi bi-info-circle me-1"></i>Medium</span>;
      default:
        return <span className="badge bg-secondary bg-opacity-10 text-secondary border border-secondary border-opacity-25 px-2 py-1"><i className="bi bi-arrow-down-circle me-1"></i>Low</span>;
    }
  };

  const getStatusBadge = (rawStatus) => {
    const s = cleanStatus(rawStatus);
    switch (s) {
      case 'APPROVED':
        return (
          <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-50 px-2 py-1 fw-semibold">
            <i className="bi bi-lock-fill me-1 text-success"></i>Approved & Locked
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="badge bg-info bg-opacity-10 text-info border border-info border-opacity-50 px-2 py-1 fw-semibold">
            <i className="bi bi-hourglass-split me-1 text-info"></i>Submitted (Pending Review)
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="badge bg-warning bg-opacity-10 text-dark border border-warning border-opacity-50 px-2 py-1 fw-semibold">
            <i className="bi bi-arrow-repeat me-1 text-warning"></i>In Progress
          </span>
        );
      case 'REJECTED':
        return (
          <span className="badge bg-danger bg-opacity-10 text-danger border border-danger border-opacity-50 px-2 py-1 fw-semibold">
            <i className="bi bi-x-circle me-1 text-danger"></i>Needs Rework
          </span>
        );
      default:
        return (
          <span className="badge bg-secondary bg-opacity-10 text-secondary border border-secondary border-opacity-25 px-2 py-1">
            <i className="bi bi-clock me-1"></i>Pending
          </span>
        );
    }
  };

  const filteredTasks = tasks.filter((t) => {
    const statusVal = cleanStatus(t.status);
    const matchStatus = statusFilter === 'ALL' || statusVal === statusFilter;
    const matchSearch =
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase()) ||
      (t.assignee_name && t.assignee_name.toLowerCase().includes(search.toLowerCase()));
    return matchStatus && matchSearch;
  });

  return (
    <div className="container-fluid px-0">
      {/* Header */}
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3 mb-4">
        <div>
          <h4 className="fw-bold text-dark mb-1 d-flex align-items-center gap-2">
            <i className="bi bi-check2-square text-primary"></i> Team Task Workflow
          </h4>
          <p className="text-muted small mb-0">
            {isManager
              ? 'Assign deliverables. Once employees mark them completed, review submissions to approve or request rework.'
              : 'Work on tasks, document completion notes, and submit for lead review.'}
          </p>
        </div>

        <div className="d-flex gap-2">
          <button className="btn btn-outline-secondary btn-sm px-3 shadow-sm" onClick={fetchTasks}>
            <i className="bi bi-arrow-clockwise me-1"></i> Refresh
          </button>
          {isManager && (
            <button
              className="btn btn-primary btn-sm px-3 shadow-sm d-flex align-items-center gap-1"
              onClick={() => setShowCreateModal(true)}
            >
              <i className="bi bi-plus-circle"></i> Assign Task
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search */}
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
                placeholder="Search tasks by title, description, or employee name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="col-12 col-md-4">
            <select
              className="form-select bg-light"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Submitted (Pending Review)</option>
              <option value="APPROVED">Approved & Locked</option>
              <option value="REJECTED">Needs Rework</option>
            </select>
          </div>

          <div className="col-12 col-md-2 text-md-end text-muted small">
            <span>Total: <strong>{filteredTasks.length}</strong> tasks</span>
          </div>
        </div>
      </div>

      {/* Task List */}
      {loading ? (
        <div className="text-center py-5 bg-white rounded-3 shadow-sm border">
          <div className="spinner-border text-primary" role="status"></div>
          <div className="text-muted small mt-2">Loading tasks...</div>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="card border-0 shadow-sm p-5 bg-white rounded-3 text-center">
          <i className="bi bi-clipboard-check text-muted display-4 mb-3"></i>
          <h5 className="fw-bold text-dark">No Tasks Found</h5>
          <p className="text-muted small mb-0">No active tasks match your search or filter criteria.</p>
        </div>
      ) : (
        <div className="row g-3">
          {filteredTasks.map((task) => {
            const currentStatus = cleanStatus(task.status);
            const isApproved = currentStatus === 'APPROVED';
            const isCompleted = currentStatus === 'COMPLETED';

            return (
              <div className="col-12" key={task.id}>
                <div
                  className={`card border-0 shadow-sm p-3 bg-white rounded-3 hover-shadow transition-all ${
                    isApproved ? 'bg-light bg-opacity-50' : ''
                  }`}
                  style={{
                    borderLeft:
                      isApproved
                        ? '5px solid #198754'
                        : isCompleted
                        ? '5px solid #0dcaf0'
                        : currentStatus === 'REJECTED'
                        ? '5px solid #dc3545'
                        : currentStatus === 'IN_PROGRESS'
                        ? '5px solid #ffc107'
                        : '5px solid #6c757d',
                  }}
                >
                  <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3">
                    <div className="flex-grow-1">
                      <div className="d-flex align-items-center gap-2 mb-2 flex-wrap">
                        <span className="badge bg-light text-dark border">Task #{task.id}</span>
                        {getPriorityBadge(task.priority)}
                        {getStatusBadge(task.status)}
                        {task.due_date && (
                          <span className="badge bg-secondary bg-opacity-10 text-secondary border">
                            <i className="bi bi-calendar-event me-1"></i>Due: {task.due_date}
                          </span>
                        )}
                      </div>

                      <h6 className="fw-bold text-dark mb-1 d-flex align-items-center gap-2">
                        {task.title}
                        {isApproved && (
                          <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25" style={{ fontSize: '0.72rem' }}>
                            <i className="bi bi-shield-lock me-1"></i>Permanent Record
                          </span>
                        )}
                      </h6>
                      <p className="text-muted small mb-2">{task.description}</p>

                      {/* Employee Notes */}
                      {task.completion_notes && (
                        <div className="p-2 mb-2 bg-light rounded-2 border-start border-3 border-info small">
                          <strong className="text-dark"><i className="bi bi-chat-left-text me-1"></i>Employee Notes:</strong>{' '}
                          <span className="text-secondary">{task.completion_notes}</span>
                        </div>
                      )}

                      {/* Manager Feedback */}
                      {task.manager_remarks && (
                        <div className="p-2 mb-2 bg-light rounded-2 border-start border-3 border-danger small">
                          <strong className="text-dark"><i className="bi bi-patch-check me-1"></i>Manager Remarks:</strong>{' '}
                          <span className="text-secondary">{task.manager_remarks}</span>
                        </div>
                      )}

                      <div className="small text-secondary">
                        <span className="me-3">
                          <i className="bi bi-person-fill text-muted me-1"></i>Assigned to: <strong>{task.assignee_name}</strong>
                        </span>
                        <span>
                          <i className="bi bi-person-badge text-muted me-1"></i>Assigned by: <strong>{task.assigner_name}</strong>
                        </span>
                      </div>
                    </div>

                    {/* Action Controls */}
                    <div>
                      {isApproved ? (
                        /* Permanently Frozen for Both Manager and Employee */
                        <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-50 px-3 py-2 rounded-pill small">
                          <i className="bi bi-lock-fill me-1"></i>Approved & Locked
                        </span>
                      ) : isManager ? (
                        /* MANAGER PERSPECTIVE: Only enabled if employee has COMPLETED */
                        isCompleted ? (
                          <button
                            className="btn btn-sm btn-outline-primary px-3 rounded-pill shadow-sm"
                            onClick={() => openActionModal(task, 'MANAGER_REVIEW')}
                          >
                            <i className="bi bi-search me-1"></i>Review Task
                          </button>
                        ) : (
                          <span
                            className="badge bg-light text-muted border px-3 py-2 rounded-pill small"
                            title="Waiting for employee to submit completion notes and mark completed."
                          >
                            <i className="bi bi-hourglass me-1"></i>Awaiting Employee Submission
                          </span>
                        )
                      ) : isCompleted ? (
                        /* EMPLOYEE PERSPECTIVE: Frozen while waiting for review */
                        <span className="badge bg-info bg-opacity-10 text-info border border-info border-opacity-50 px-3 py-2 rounded-pill small">
                          <i className="bi bi-hourglass-split me-1"></i>Frozen (Under Review)
                        </span>
                      ) : (
                        /* EMPLOYEE PERSPECTIVE: Can update and submit */
                        <button
                          className="btn btn-sm btn-primary px-3 rounded-pill shadow-sm"
                          onClick={() => openActionModal(task, 'EMPLOYEE_SUBMIT')}
                        >
                          <i className="bi bi-pencil-square me-1"></i>Update & Submit
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: Create Task */}
      {showCreateModal && isManager && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              <div className="modal-header bg-light border-0 px-4 py-3">
                <h5 className="modal-title fw-bold text-dark">Assign Team Task</h5>
                <button type="button" className="btn-close" onClick={() => setShowCreateModal(false)}></button>
              </div>

              <form onSubmit={handleCreateTask}>
                <div className="modal-body p-4">
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Task Title *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Audit Employee Tax Deductions"
                      value={createForm.title}
                      onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                      required
                    />
                  </div>

                  <div className="row g-2 mb-3">
                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold">Assign To Employee *</label>
                      <select
                        className="form-select"
                        value={createForm.assigned_to_id}
                        onChange={(e) => setCreateForm({ ...createForm, assigned_to_id: e.target.value })}
                        required
                      >
                        <option value="">Select Employee</option>
                        {teamMembers.map((emp) => (
                          <option key={emp.id} value={emp.id}>
                            {emp.name} ({emp.designation})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold">Priority</label>
                      <select
                        className="form-select"
                        value={createForm.priority}
                        onChange={(e) => setCreateForm({ ...createForm, priority: e.target.value })}
                      >
                        <option value="LOW">Low</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HIGH">High</option>
                        <option value="CRITICAL">Critical</option>
                      </select>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Due Date (Optional)</label>
                    <input
                      type="date"
                      className="form-control"
                      value={createForm.due_date}
                      onChange={(e) => setCreateForm({ ...createForm, due_date: e.target.value })}
                    />
                  </div>

                  <div className="mb-2">
                    <label className="form-label small fw-semibold">Task Description *</label>
                    <textarea
                      className="form-control"
                      rows="4"
                      placeholder="Provide specific guidelines, goals, and deliverables..."
                      value={createForm.description}
                      onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                      required
                    ></textarea>
                  </div>
                </div>

                <div className="modal-footer border-0 bg-light px-4 py-3">
                  <button type="button" className="btn btn-secondary btn-sm rounded-pill" onClick={() => setShowCreateModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary btn-sm px-4 fw-semibold rounded-pill shadow-sm" disabled={submitting}>
                    {submitting ? 'Assigning...' : 'Assign Task'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Employee Update & Submission */}
      {selectedTask && actionModalType === 'EMPLOYEE_SUBMIT' && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              <div className="modal-header bg-light border-0 px-4 py-3">
                <h5 className="modal-title fw-bold text-dark">Update Task Progress</h5>
                <button type="button" className="btn-close" onClick={() => setSelectedTask(null)}></button>
              </div>

              <form onSubmit={handleUpdateTaskStatus}>
                <div className="modal-body p-4">
                  <div className="mb-3">
                    <h6 className="fw-bold mb-1">{selectedTask.title}</h6>
                    <p className="text-muted small mb-0">{selectedTask.description}</p>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Status *</label>
                    <select
                      className="form-select"
                      value={updateForm.status}
                      onChange={(e) => setUpdateForm({ ...updateForm, status: e.target.value })}
                      required
                    >
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="COMPLETED">Completed (Freeze & Submit to Lead)</option>
                    </select>
                    {updateForm.status === 'COMPLETED' && (
                      <small className="text-danger d-block mt-1">
                        <i className="bi bi-info-circle me-1"></i>
                        Marking as Completed freezes this task. You cannot make further edits while awaiting your lead's review.
                      </small>
                    )}
                  </div>

                  <div className="mb-2">
                    <label className="form-label small fw-semibold">Completion Notes / Work Description</label>
                    <textarea
                      className="form-control"
                      rows="4"
                      placeholder="Detail work done, links to commits/docs, or notes for your lead..."
                      value={updateForm.completion_notes}
                      onChange={(e) => setUpdateForm({ ...updateForm, completion_notes: e.target.value })}
                      required={updateForm.status === 'COMPLETED'}
                    ></textarea>
                  </div>
                </div>

                <div className="modal-footer border-0 bg-light px-4 py-3">
                  <button type="button" className="btn btn-secondary btn-sm rounded-pill" onClick={() => setSelectedTask(null)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary btn-sm px-4 fw-semibold rounded-pill shadow-sm" disabled={submitting}>
                    {submitting ? 'Submitting...' : 'Save & Submit'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Manager Review & Verification */}
      {selectedTask && actionModalType === 'MANAGER_REVIEW' && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              <div className="modal-header bg-light border-0 px-4 py-3">
                <h5 className="modal-title fw-bold text-dark">Review Employee Submission</h5>
                <button type="button" className="btn-close" onClick={() => setSelectedTask(null)}></button>
              </div>

              <form onSubmit={handleUpdateTaskStatus}>
                <div className="modal-body p-4">
                  <div className="mb-3">
                    <h6 className="fw-bold mb-1">{selectedTask.title}</h6>
                    <span className="small text-muted">Assigned to: <strong>{selectedTask.assignee_name}</strong></span>
                  </div>

                  <div className="mb-3 p-3 bg-light rounded-3">
                    <span className="small fw-bold text-dark d-block mb-1">Employee Submission Notes:</span>
                    <p className="small text-secondary mb-0">
                      {selectedTask.completion_notes || <em className="text-muted">No notes submitted yet.</em>}
                    </p>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Review Verdict *</label>
                    <select
                      className="form-select"
                      value={updateForm.status}
                      onChange={(e) => setUpdateForm({ ...updateForm, status: e.target.value })}
                      required
                    >
                      <option value="APPROVED">Approve (Permanently Lock Task for All)</option>
                      <option value="REJECTED">Reject / Needs Rework (Unfreeze for Employee)</option>
                      <option value="IN_PROGRESS">Send Back to In Progress</option>
                    </select>
                    {updateForm.status === 'APPROVED' && (
                      <small className="text-success d-block mt-1">
                        <i className="bi bi-shield-lock me-1"></i>
                        Approving will permanently freeze this task for both you and the employee.
                      </small>
                    )}
                  </div>

                  <div className="mb-2">
                    <label className="form-label small fw-semibold">Manager Feedback / Remarks</label>
                    <textarea
                      className="form-control"
                      rows="3"
                      placeholder="Add approval comments or specify rework directions..."
                      value={updateForm.manager_remarks}
                      onChange={(e) => setUpdateForm({ ...updateForm, manager_remarks: e.target.value })}
                    ></textarea>
                  </div>
                </div>

                <div className="modal-footer border-0 bg-light px-4 py-3">
                  <button type="button" className="btn btn-secondary btn-sm rounded-pill" onClick={() => setSelectedTask(null)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary btn-sm px-4 fw-semibold rounded-pill shadow-sm" disabled={submitting}>
                    {submitting ? 'Updating...' : 'Commit Review Verdict'}
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