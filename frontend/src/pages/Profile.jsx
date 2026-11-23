import React, { useEffect, useState, useRef } from 'react';
import API from '../api';

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'edit'
  const [formData, setFormData] = useState({ name: '', address: '', gender: '' });
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef(null);

  const fetchProfile = async () => {
    try {
      const res = await API.get('/employees/me');
      setProfile(res.data);
      setFormData({
        name: res.data.name || '',
        address: res.data.address || '',
        gender: res.data.gender || '',
      });
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setErrorMsg('Image size exceeds 5MB limit. Please select a smaller file.');
        return;
      }
      setPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
      setErrorMsg('');
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');

    const hasName = formData.name.trim().length > 0;
    const hasGender = formData.gender.length > 0;
    const hasAddress = formData.address.trim().length > 0;
    const hasPhoto = Boolean(photo);

    if (!hasName && !hasGender && !hasAddress && !hasPhoto) {
      setErrorMsg('Please select a photo or enter at least one field to update.');
      return;
    }

    setSubmitting(true);
    const payload = new FormData();
    if (hasName) payload.append('name', formData.name.trim());
    if (hasGender) payload.append('gender', formData.gender);
    if (hasAddress) payload.append('address', formData.address.trim());
    if (hasPhoto) payload.append('photo', photo);

    try {
      const res = await API.put('/employees/me', payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setProfile(res.data);
      if (res.data.name) {
        localStorage.setItem('user_name', res.data.name);
      }

      setSuccessMsg('Profile details successfully updated!');
      setPhoto(null);
      setPhotoPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';

      setActiveTab('overview');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Failed to update profile.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!profile) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border text-primary" role="status"></div>
        <div className="mt-2 text-muted small">Loading profile workspace...</div>
      </div>
    );
  }

  const getRoleBadge = (roleName) => {
    switch (roleName?.toUpperCase()) {
      case 'HR':
        return (
          <span className="badge bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25 px-3 py-1 rounded-pill">
            <i className="bi bi-shield-lock-fill me-1"></i>HR Superuser
          </span>
        );
      case 'MANAGER':
        return (
          <span className="badge bg-warning bg-opacity-10 text-dark border border-warning border-opacity-50 px-3 py-1 rounded-pill">
            <i className="bi bi-person-badge-fill me-1 text-warning"></i>Team Manager
          </span>
        );
      default:
        return (
          <span className="badge bg-info bg-opacity-10 text-info border border-info border-opacity-25 px-3 py-1 rounded-pill">
            <i className="bi bi-person-fill me-1"></i>Staff Member
          </span>
        );
    }
  };

  return (
    <div className="container-fluid px-0" style={{ maxWidth: '980px' }}>
      {/* Alert Notifications */}
      {successMsg && (
        <div className="alert alert-success alert-dismissible fade show d-flex align-items-center py-2 px-3 small rounded-3 mb-3 border-0 shadow-sm">
          <i className="bi bi-check-circle-fill me-2 fs-6"></i>
          <div className="flex-grow-1">{successMsg}</div>
          <button type="button" className="btn-close py-2" onClick={() => setSuccessMsg('')}></button>
        </div>
      )}

      {errorMsg && (
        <div className="alert alert-danger alert-dismissible fade show d-flex align-items-center py-2 px-3 small rounded-3 mb-3 border-0 shadow-sm">
          <i className="bi bi-exclamation-triangle-fill me-2 fs-6"></i>
          <div className="flex-grow-1">{errorMsg}</div>
          <button type="button" className="btn-close py-2" onClick={() => setErrorMsg('')}></button>
        </div>
      )}

      {/* Corporate Hero Banner Card */}
      <div className="card border-0 shadow-sm rounded-4 overflow-hidden mb-4 bg-white">
        {/* Banner Gradient Background */}
        <div
          style={{
            height: '140px',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #2563eb 100%)',
          }}
        ></div>

        <div className="px-4 pb-4">
          <div className="d-flex flex-column flex-sm-row align-items-center align-items-sm-end gap-3 position-relative" style={{ marginTop: '-60px' }}>
            {/* Avatar with Ring */}
            <div className="position-relative">
              {profile.profile_photo ? (
                <img
                  src={profile.profile_photo}
                  alt={profile.name}
                  className="rounded-circle object-fit-cover shadow-lg border border-4 border-white"
                  style={{ width: '120px', height: '120px', minWidth: '120px', backgroundColor: '#fff' }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <div
                className="rounded-circle bg-primary text-white align-items-center justify-content-center shadow-lg border border-4 border-white fw-bold display-6"
                style={{
                  width: '120px',
                  height: '120px',
                  minWidth: '120px',
                  display: profile.profile_photo ? 'none' : 'flex',
                }}
              >
                {profile.name ? profile.name.charAt(0).toUpperCase() : 'U'}
              </div>

              {/* Status Dot */}
              <span
                className={`position-absolute bottom-0 end-0 p-2 rounded-circle border border-2 border-white ${
                  profile.is_active ? 'bg-success' : 'bg-danger'
                }`}
                title={profile.is_active ? 'Active Profile' : 'Suspended'}
              ></span>
            </div>

            {/* Header Identity Info */}
            <div className="flex-grow-1 text-center text-sm-start mt-2 mt-sm-0">
              <div className="d-flex flex-wrap align-items-center justify-content-center justify-content-sm-start gap-2 mb-1">
                <h4 className="fw-bold text-dark mb-0">{profile.name}</h4>
                {getRoleBadge(profile.role)}
              </div>
              <p className="text-muted small mb-0">
                <i className="bi bi-briefcase me-1"></i>
                {profile.designation || 'Staff'} &bull; Employee ID <strong>#{profile.id}</strong>
              </p>
            </div>

            {/* Quick Action Buttons */}
            <div className="d-flex gap-2">
              <button
                className={`btn btn-sm px-3 rounded-pill fw-semibold shadow-sm ${
                  activeTab === 'overview' ? 'btn-primary' : 'btn-outline-secondary bg-white'
                }`}
                onClick={() => setActiveTab('overview')}
              >
                <i className="bi bi-person-lines-fill me-1"></i> Overview
              </button>
              <button
                className={`btn btn-sm px-3 rounded-pill fw-semibold shadow-sm ${
                  activeTab === 'edit' ? 'btn-primary' : 'btn-outline-secondary bg-white'
                }`}
                onClick={() => setActiveTab('edit')}
              >
                <i className="bi bi-pencil-square me-1"></i> Edit Profile
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tab 1: Overview & Identity Records */}
      {activeTab === 'overview' && (
        <div className="row g-4">
          {/* Contact Details Card */}
          <div className="col-12 col-md-6">
            <div className="card border-0 shadow-sm p-4 bg-white rounded-3 h-100">
              <h6 className="fw-bold text-dark mb-3 d-flex align-items-center gap-2">
                <i className="bi bi-person-vcard text-primary"></i> Contact & Personal Information
              </h6>

              <div className="d-flex flex-column gap-3 small">
                <div className="p-3 bg-light rounded-3 d-flex align-items-center justify-content-between">
                  <span className="text-muted fw-semibold">Email Address</span>
                  <span className="text-dark fw-bold">{profile.email}</span>
                </div>

                <div className="p-3 bg-light rounded-3 d-flex align-items-center justify-content-between">
                  <span className="text-muted fw-semibold">Mobile Number</span>
                  <span className="text-dark fw-bold">{profile.mobile_number}</span>
                </div>

                <div className="p-3 bg-light rounded-3 d-flex align-items-center justify-content-between">
                  <span className="text-muted fw-semibold">Gender</span>
                  <span className="text-dark fw-bold">{profile.gender || 'Not Specified'}</span>
                </div>

                <div className="p-3 bg-light rounded-3">
                  <div className="text-muted fw-semibold mb-1">Residential Address</div>
                  <div className="text-dark">{profile.address || 'No residential address documented.'}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Organizational Employment Card */}
          <div className="col-12 col-md-6">
            <div className="card border-0 shadow-sm p-4 bg-white rounded-3 h-100">
              <h6 className="fw-bold text-dark mb-3 d-flex align-items-center gap-2">
                <i className="bi bi-building-check text-primary"></i> Organizational Profile
              </h6>

              <div className="d-flex flex-column gap-3 small">
                <div className="p-3 bg-light rounded-3 d-flex align-items-center justify-content-between">
                  <span className="text-muted fw-semibold">Employee Identifier</span>
                  <span className="badge bg-dark bg-opacity-75 fs-7">#{profile.id}</span>
                </div>

                <div className="p-3 bg-light rounded-3 d-flex align-items-center justify-content-between">
                  <span className="text-muted fw-semibold">Designation</span>
                  <span className="text-dark fw-bold">{profile.designation}</span>
                </div>

                <div className="p-3 bg-light rounded-3 d-flex align-items-center justify-content-between">
                  <span className="text-muted fw-semibold">System Authority Scope</span>
                  <span className="text-dark fw-bold">{profile.role}</span>
                </div>

                <div className="p-3 bg-light rounded-3 d-flex align-items-center justify-content-between">
                  <span className="text-muted fw-semibold">Date of Joining</span>
                  <span className="text-dark fw-bold">
                    {profile.joining_date
                      ? new Date(profile.joining_date).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })
                      : 'N/A'}
                  </span>
                </div>

                <div className="p-3 bg-light rounded-3 d-flex align-items-center justify-content-between">
                  <span className="text-muted fw-semibold">Account State</span>
                  <span className={`badge ${profile.is_active ? 'bg-success' : 'bg-danger'}`}>
                    {profile.is_active ? 'Active Credentials' : 'Deactivated'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Edit Form & Avatar Upload */}
      {activeTab === 'edit' && (
        <div className="card border-0 shadow-sm p-4 bg-white rounded-3">
          <div className="mb-4 pb-2 border-bottom">
            <h5 className="fw-bold text-dark mb-1">Edit Permitted Details</h5>
            <p className="text-muted small mb-0">
              Self-service updates for your display name, profile avatar, gender, and residential address.
            </p>
          </div>

          <form onSubmit={handleUpdate}>
            {/* Interactive Avatar Upload Box */}
            <div className="p-3 mb-4 rounded-3 bg-light border border-dashed">
              <label className="form-label small fw-semibold text-dark mb-1 d-block">
                Profile Photo
              </label>
              <div className="d-flex flex-column flex-sm-row align-items-center gap-3">
                {/* Live Preview Container */}
                <div className="position-relative">
                  {photoPreview ? (
                    <img
                      src={photoPreview}
                      alt="New selection preview"
                      className="rounded-circle object-fit-cover border border-3 border-primary shadow-sm"
                      style={{ width: '70px', height: '70px', minWidth: '70px' }}
                    />
                  ) : profile.profile_photo ? (
                    <img
                      src={profile.profile_photo}
                      alt={profile.name}
                      className="rounded-circle object-fit-cover border shadow-sm"
                      style={{ width: '70px', height: '70px', minWidth: '70px' }}
                    />
                  ) : (
                    <div
                      className="rounded-circle bg-secondary bg-opacity-10 text-primary d-flex align-items-center justify-content-center fw-bold fs-4"
                      style={{ width: '70px', height: '70px', minWidth: '70px' }}
                    >
                      {profile.name?.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                <div className="flex-grow-1 w-100">
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="form-control form-control-sm bg-white"
                    accept="image/png, image/jpeg, image/webp"
                    onChange={handlePhotoChange}
                  />
                  <div className="text-muted small mt-1" style={{ fontSize: '0.75rem' }}>
                    Supported formats: PNG, JPG, or WEBP (Max 5MB).
                  </div>
                </div>

                {photoPreview && (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary text-nowrap"
                    onClick={() => {
                      setPhoto(null);
                      setPhotoPreview(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>

            {/* Input: Full Name */}
            <div className="mb-3">
              <label className="form-label small fw-semibold text-secondary mb-1">Full Name</label>
              <div className="input-group">
                <span className="input-group-text bg-light text-muted border-end-0">
                  <i className="bi bi-person"></i>
                </span>
                <input
                  type="text"
                  className="form-control bg-light border-start-0 ps-0"
                  placeholder="Enter full display name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
            </div>

            {/* Input: Gender */}
            <div className="mb-3">
              <label className="form-label small fw-semibold text-secondary mb-1">Gender</label>
              <select
                className="form-select bg-light"
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Input: Residential Address */}
            <div className="mb-4">
              <label className="form-label small fw-semibold text-secondary mb-1">
                Residential Address
              </label>
              <textarea
                className="form-control bg-light"
                rows="3"
                placeholder="Enter street, city, postal code..."
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              ></textarea>
            </div>

            {/* Buttons Bar */}
            <div className="d-flex justify-content-end gap-2 pt-2 border-top">
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm px-3 rounded-pill"
                onClick={() => setActiveTab('overview')}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary btn-sm px-4 rounded-pill fw-semibold shadow-sm d-flex align-items-center gap-2"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status"></span>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <i className="bi bi-check2"></i>
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}