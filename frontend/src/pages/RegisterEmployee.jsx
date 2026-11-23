import React, { useState, useEffect } from 'react';
import API from '../api';
import { useNavigate } from 'react-router-dom';

export default function RegisterEmployee() {
  const navigate = useNavigate();
  const [managers, setManagers] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile_number: '',
    joining_date: '',
    designation: '',
    role: 'EMPLOYEE',
    gender: 'Male',
    address: '',
    password: '',
    manager_id: ''
  });
  const [photo, setPhoto] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fetch active managers so HR can assign staff directly
    API.get('/employees/managers')
      .then((res) => setManagers(res.data))
      .catch((err) => console.error('Failed to load managers list', err));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const data = new FormData();
    Object.keys(formData).forEach((key) => {
      if (formData[key]) {
        data.append(key, formData[key]);
      }
    });
    if (photo) data.append('photo', photo);

    try {
      await API.post('/employees/register', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      navigate('/employees');
    } catch (err) {
      setError(err.response?.data?.detail || 'Employee registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-4" style={{ maxWidth: '850px' }}>
      <div className="custom-card p-4 p-md-5">
        <div className="d-flex align-items-center gap-3 mb-4 border-bottom pb-3">
          <div className="rounded-circle bg-primary bg-opacity-10 text-primary p-3 d-flex align-items-center justify-content-center" style={{ width: '48px', height: '48px' }}>
            <i className="bi bi-person-plus-fill fs-4"></i>
          </div>
          <div>
            <h4 className="fw-bold mb-0">Onboard Employee</h4>
            <small className="text-muted">Register and allocate roles and reporting managers.</small>
          </div>
        </div>

        {error && (
          <div className="alert alert-danger d-flex align-items-center py-2 px-3 small rounded-3 mb-4">
            <i className="bi bi-exclamation-triangle-fill me-2"></i>
            <div>{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label small fw-semibold">Full Name *</label>
              <input
                type="text"
                className="form-control"
                placeholder="John Doe"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="col-md-6">
              <label className="form-label small fw-semibold">Corporate Email *</label>
              <input
                type="email"
                className="form-control"
                placeholder="john.doe@ems.com"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="col-md-6">
              <label className="form-label small fw-semibold">Mobile Number *</label>
              <input
                type="tel"
                className="form-control"
                placeholder="9876543210"
                required
                value={formData.mobile_number}
                onChange={(e) => setFormData({ ...formData, mobile_number: e.target.value })}
              />
            </div>

            <div className="col-md-6">
              <label className="form-label small fw-semibold">Joining Date *</label>
              <input
                type="date"
                className="form-control"
                required
                value={formData.joining_date}
                onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })}
              />
            </div>

            <div className="col-md-6">
              <label className="form-label small fw-semibold">Designation / Title *</label>
              <input
                type="text"
                className="form-control"
                placeholder="Frontend Engineer / Team Lead"
                required
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
              />
            </div>

            <div className="col-md-6">
              <label className="form-label small fw-semibold">System Access Role *</label>
              <select
                className="form-select"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              >
                <option value="EMPLOYEE">Employee</option>
                <option value="MANAGER">Manager</option>
                <option value="HR">HR Administrator</option>
              </select>
            </div>

            {/* Manager Assignment Dropdown (Shown when role is EMPLOYEE) */}
            {formData.role === 'EMPLOYEE' && (
              <div className="col-md-6">
                <label className="form-label small fw-semibold">Assign Reporting Manager</label>
                <select
                  className="form-select"
                  value={formData.manager_id}
                  onChange={(e) => setFormData({ ...formData, manager_id: e.target.value })}
                >
                  <option value="">-- Select Manager (Optional) --</option>
                  {managers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.designation})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className={formData.role === 'EMPLOYEE' ? 'col-md-6' : 'col-md-12'}>
              <label className="form-label small fw-semibold">Gender *</label>
              <select
                className="form-select"
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="col-md-6">
              <label className="form-label small fw-semibold">Account Initial Password *</label>
              <input
                type="password"
                className="form-control"
                placeholder="••••••••"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>

            <div className="col-md-6">
              <label className="form-label small fw-semibold">Profile Photo (Optional)</label>
              <input
                type="file"
                className="form-control"
                accept="image/png, image/jpeg, image/webp"
                onChange={(e) => setPhoto(e.target.files[0])}
              />
            </div>

            <div className="col-12">
              <label className="form-label small fw-semibold">Residential Address</label>
              <textarea
                className="form-control"
                rows="2"
                placeholder="Street address, city, state"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              ></textarea>
            </div>
          </div>

          <div className="d-flex gap-2 mt-4 pt-2 border-top">
            <button
              type="submit"
              className="btn btn-primary px-4 fw-semibold"
              disabled={loading}
            >
              {loading ? 'Creating Record...' : 'Complete Onboarding'}
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary px-4"
              onClick={() => navigate('/employees')}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}