import React, { useState, useEffect, useRef } from 'react';
import { Users, Edit2, Check, X, Shield, Calendar, Mail, User as UserIcon, ImagePlus, UploadCloud, Grid, Trash2 } from 'lucide-react';
import { getCsrfHeaders } from '../../../utils/csrf';
import './AdminDashboard.css';

interface UserData {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  dob: string;
  role: string;
}

interface Photo {
  id: number;
  url: string;
  publicId: string;
}

interface AdminDashboardProps {
  user: any;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ user }) => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<UserData>>({});
  const [saveLoading, setSaveLoading] = useState(false);

  // Upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Gallery state
  const [photos, setPhotos] = useState<string[]>([]);
  const [fetchingPhotos, setFetchingPhotos] = useState(false);

  const [activeTab, setActiveTab] = useState<'users' | 'media' | 'gallery'>('users');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:8080/auth/admin/users', {
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });
      
      if (!response.ok) throw new Error('Failed to fetch users');
      
      const data = await response.json();
      setUsers(data);
    } catch (err: any) {
      setError(err.message || 'An error occurred fetching users');
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (user: UserData) => {
    setEditingId(user.id);
    setEditForm(user);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (userId: number) => {
    if (!window.confirm('Are you sure you want to save these changes?')) {
      return;
    }

    try {
      setSaveLoading(true);
      const response = await fetch(`http://localhost:8080/auth/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getCsrfHeaders()
        },
        body: JSON.stringify(editForm),
        credentials: 'include'
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        throw new Error(errData?.message || 'Failed to update user');
      }

      setUsers(users.map(u => u.id === userId ? { ...u, ...editForm } as UserData : u));
      setEditingId(null);
    } catch (err: any) {
      setError(err.message || 'An error occurred updating the user');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
      setUploadMessage(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setUploadLoading(true);
      setUploadMessage(null);
      
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch('http://localhost:8080/api/upload', {
        method: 'POST',
        headers: {
          ...getCsrfHeaders()
        },
        body: formData,
        credentials: 'include'
      });

      if (!response.ok) {
        let errorMessage = 'Failed to upload image';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          const textData = await response.text();
          errorMessage = textData || errorMessage;
        }
        throw new Error(errorMessage);
      }

      setUploadMessage({ type: 'success', text: 'Image uploaded successfully!' });
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      // If we are in gallery, refresh
      if (activeTab === 'gallery') fetchPhotos();
    } catch (err: any) {
      setUploadMessage({ type: 'error', text: err.message || 'An error occurred during upload' });
    } finally {
      setUploadLoading(false);
    }
  };

  const fetchPhotos = async () => {
    try {
      setFetchingPhotos(true);
      const response = await fetch('http://localhost:8080/api/get-secure-image', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch photos');
      const data = await response.json();
      setPhotos(data);
    } catch (err: any) {
      setError(err.message || 'An error occurred fetching photos');
    } finally {
      setFetchingPhotos(false);
    }
  };

  const handleDeletePhoto = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this photo permanently?')) {
      return;
    }

    // try {
    //   const response = await fetch(`http://localhost:8080/api/photo/${id}`, {
    //     method: 'DELETE',
    //     headers: {
    //       ...getCsrfHeaders()
    //     },
    //     credentials: 'include'
    //   });

    //   if (!response.ok) {
    //     throw new Error('Failed to delete photo');
    //   }

    //   setPhotos(photos.filter(p => p.id !== id));
    // } catch (err: any) {
    //   setError(err.message || 'An error occurred during deletion');
    // }
  };

  useEffect(() => {
    if (activeTab === 'gallery') {
      fetchPhotos();
    }
  }, [activeTab]);

  if (loading) return <div className="admin-loading">Loading configuration...</div>;

  return (
    <div className="admin-dashboard-wrapper">
      <header className="admin-header">
        <div className="header-content">
          <div className="header-title">
            <Shield className="header-icon" />
            <h1>Administrator Control Panel</h1>
          </div>
          <p>Welcome, {user.firstName}. Manage your system resources and users.</p>
        </div>
      </header>

      <div className="admin-main-layout">
        <aside className="admin-sidebar">
          <nav>
            <button 
              className={`nav-item ${activeTab === 'users' ? 'active' : ''}`}
              onClick={() => setActiveTab('users')}
            >
              <Users size={20} />
              <span>User Management</span>
            </button>
            <button 
              className={`nav-item ${activeTab === 'media' ? 'active' : ''}`}
              onClick={() => setActiveTab('media')}
            >
              <ImagePlus size={20} />
              <span>Upload Media</span>
            </button>
            <button 
              className={`nav-item ${activeTab === 'gallery' ? 'active' : ''}`}
              onClick={() => setActiveTab('gallery')}
            >
              <Grid size={20} />
              <span>View Gallery</span>
            </button>
          </nav>
        </aside>

        <main className="admin-content-area">
          {error && <div className="admin-error-banner"><X size={16}/> {error}</div>}

          {activeTab === 'users' && (
            <div className="users-card animate-in">
              <div className="card-header">
                <Users size={20} />
                <div className="header-text">
                  <h2>User Directory</h2>
                  <p>View and edit system participants</p>
                </div>
              </div>
              
              <div className="table-responsive">
                <table className="users-table">
                  <thead>
                    <tr>
                      <th><UserIcon size={14}/> First Name</th>
                      <th>Last Name</th>
                      <th><Mail size={14}/> Email</th>
                      <th><Calendar size={14}/> Date of Birth</th>
                      <th>Role</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className={editingId === u.id ? 'editing-row' : ''}>
                        {editingId === u.id ? (
                          <>
                            <td><input name="firstName" value={editForm.firstName || ''} onChange={handleEditChange} /></td>
                            <td><input name="lastName" value={editForm.lastName || ''} onChange={handleEditChange} /></td>
                            <td><input name="email" value={editForm.email || ''} onChange={handleEditChange} /></td>
                            <td><input type="date" name="dob" value={editForm.dob || ''} onChange={handleEditChange} /></td>
                            <td>
                              <select name="role" value={editForm.role || ''} onChange={handleEditChange}>
                                <option value="USER">USER</option>
                                <option value="ADMIN">ADMIN</option>
                              </select>
                            </td>
                            <td className="actions-cell">
                              <button onClick={() => handleSave(u.id)} disabled={saveLoading} className="btn-save" title="Save">
                                <Check size={16} />
                              </button>
                              <button onClick={cancelEdit} disabled={saveLoading} className="btn-cancel" title="Cancel">
                                <X size={16} />
                              </button>
                            </td>
                          </>
                        ) : (
                          <>
                            <td>{u.firstName}</td>
                            <td>{u.lastName}</td>
                            <td>{u.email}</td>
                            <td>{u.dob}</td>
                            <td>
                              <span className={`role-badge role-${u.role.toLowerCase()}`}>{u.role}</span>
                            </td>
                            <td className="actions-cell">
                              <button onClick={() => startEdit(u)} className="btn-edit" title="Edit User">
                                <Edit2 size={16} /> Edit
                              </button>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr>
                        <td colSpan={6} className="empty-state">No users found in the system.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'media' && (
            <div className="upload-card animate-in">
              <div className="card-header">
                <ImagePlus size={20} />
                <div className="header-text">
                  <h2>Asset Upload</h2>
                  <p>Upload new images to the gallery</p>
                </div>
              </div>
              <div className="upload-body">
                <div className="upload-zone" onClick={() => fileInputRef.current?.click()}>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    className="hidden-input" 
                    accept="image/*"
                  />
                  <UploadCloud size={48} className="upload-icon-large" />
                  <h3>{selectedFile ? selectedFile.name : 'Choose a file or drop it here'}</h3>
                  <p>Maximum file size: 1MB (JPG, PNG)</p>
                </div>
                {uploadMessage && (
                  <div className={`upload-msg ${uploadMessage.type}`}>
                    {uploadMessage.type === 'success' ? <Check size={16}/> : <X size={16}/>}
                    {uploadMessage.text}
                  </div>
                )}
                <button 
                  className={`btn-upload ${uploadLoading ? 'loading' : ''}`}
                  onClick={handleUpload}
                  disabled={!selectedFile || uploadLoading}
                >
                  {uploadLoading ? 'Uploading...' : 'Upload Asset'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'gallery' && (
            <div className="gallery-card animate-in">
              <div className="card-header">
                <Grid size={20} />
                <div className="header-text">
                  <h2>Photo Gallery</h2>
                  <p>Manage and view all uploaded assets</p>
                </div>
              </div>
              
              <div className="gallery-content">
                {fetchingPhotos ? (
                  <div className="gallery-loading">Fetching assets...</div>
                ) : photos.length === 0 ? (
                  <div className="empty-state">No photos found in the gallery.</div>
                ) : (
                  <div className="photo-grid-admin">
                    {photos.map((photo) => (
                      // <div key={photo.id} className="photo-item-admin">
                        <img className="photo-item-admin" src={photo} alt="Gallery item" />
                      //   <button 
                      //     className="delete-photo-btn"
                      //     onClick={() => handleDeletePhoto(photo.id)}
                      //     title="Delete image"
                      //   >
                      //     <Trash2 size={16} />
                      //   </button>
                      // </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
export default AdminDashboard;