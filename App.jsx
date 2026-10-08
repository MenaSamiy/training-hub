import React, { useState, useEffect, useRef } from 'react';
import './App.css';

const API_URL = 'http://localhost:5000/api';

// ============================================
// MAIN APP COMPONENT
// ============================================

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    if (token) {
      setIsLoggedIn(true);
      const userData = JSON.parse(localStorage.getItem('user'));
      setCurrentUser(userData);
    }
  }, [token]);

  if (!isLoggedIn) {
    return <LoginPage onLogin={(token, user) => {
      setToken(token);
      setIsLoggedIn(true);
      setCurrentUser(user);
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
    }} />;
  }

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const canAccess = (page) => {
    if (currentUser.role === 'Learner' && page === 'dashboard') return false;
    if (currentUser.role === 'Learner' && page === 'settings') return false;
    return true;
  };

  return (
    <div className="app">
      <header className="header">
        <div className="header-left">
          <h1 className="logo">🤖 Training Hub</h1>
        </div>
        <div className="header-right">
          <span className="user-info">{currentUser?.firstName} {currentUser?.lastName} </span>
          <button className="btn-logout" onClick={handleLogout}>Log out</button>
        </div>
      </header>

      <div className="app-container">
        <nav className="sidebar">
          <ul className="nav-menu">
            {canAccess('dashboard') && (
  <li><button className={currentPage === 'dashboard' ? 'active' : ''} onClick={() => setCurrentPage('dashboard')}>📊 Dashboard</button></li>
)}
{canAccess('videos') && (
  <li><button className={currentPage === 'videos' ? 'active' : ''} onClick={() => setCurrentPage('videos')}>🎬 Videos</button></li>
)}
{canAccess('scripts') && (
  <li><button className={currentPage === 'scripts' ? 'active' : ''} onClick={() => setCurrentPage('scripts')}>📋 Scripts</button></li>
)}
{canAccess('tests') && (
  <li><button className={currentPage === 'tests' ? 'active' : ''} onClick={() => setCurrentPage('tests')}>✅ Tests</button></li>
)}
{canAccess('faqs') && (
  <li><button className={currentPage === 'faqs' ? 'active' : ''} onClick={() => setCurrentPage('faqs')}>❓ FAQs</button></li>
)}
{canAccess('settings') && (
  <li><button className={currentPage === 'settings' ? 'active' : ''} onClick={() => setCurrentPage('settings')}>⚙️ Settings</button></li>
)}
          </ul>
        </nav>

        <main className="main-content">
          {currentPage === 'dashboard' && <DashboardPage token={token} user={currentUser} />}
          {currentPage === 'videos' && <VideosPage token={token} user={currentUser} />}
          {currentPage === 'scripts' && <ScriptsPage token={token} user={currentUser} />}
          {currentPage === 'tests' && <TestsPage token={token} user={currentUser} />}
          {currentPage === 'faqs' && <FAQsPage token={token} user={currentUser} />}
          {currentPage === 'settings' && <SettingsPage token={token} user={currentUser} />}
        </main>
      </div>
    </div>
  );
}

// ============================================
// LOGIN PAGE
// ============================================

function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('admin@training.com');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Login failed');
        return;
      }

      onLogin(data.token, data.user);
    } catch (err) {
      setError('Failed to connect to server');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-box">
          <h1>🤖 Training Hub</h1>
          <p>Welcome to your learning platform</p>
          
          <form onSubmit={handleLogin}>
            <div className="btn form-group">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="btn form-group">
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && <div className="error-message">{error}</div>}

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}

// ============================================
// DASHBOARD PAGE
// ============================================

function DashboardPage({ token, user }) {
  const [progress, setProgress] = useState([]);
  const [selectedLearner, setSelectedLearner] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProgress();
  }, []);

  const fetchProgress = async () => {
    try {
      const response = await fetch(`${API_URL}/dashboard/progress`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setProgress(data);
    } catch (err) {
      console.error('Failed to fetch progress:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="page"><p>Loading...</p></div>;

  return (
    <div className="page">
      <div className="page-header">
        <h2>📊 Dashboard</h2>
        <p>Learner Progress Overview</p>
      </div>

      <div className="dashboard-container">
        <div className="progress-grid">
          {progress.map(learner => (
            <div key={learner.userId} className="progress-card" onClick={() => setSelectedLearner(learner)}>
              <h3>{learner.name}</h3>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${learner.progress}%` }}></div>
              </div>
              <p className="progress-text">{learner.progress}% Complete</p>
              <p className="progress-detail">{learner.completedTests}/{learner.totalTests} Tests</p>
            </div>
          ))}
        </div>

        {selectedLearner && (
          <div className="learner-details">
            <h3>{selectedLearner.name} - Details</h3>
            <div className="details-content">
              <p><strong>Email:</strong> {selectedLearner.email}</p>
              <p><strong>Progress:</strong> {selectedLearner.progress}%</p>
              <p><strong>Tests Completed:</strong> {selectedLearner.completedTests}/{selectedLearner.totalTests}</p>
              <p><strong>Last Active:</strong> {selectedLearner.lastActive ? new Date(selectedLearner.lastActive).toLocaleDateString() : 'Never'}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// VIDEOS PAGE
// ============================================

function VideosPage({ token, user }) {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      const response = await fetch(`${API_URL}/videos`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setVideos(data);
    } catch (err) {
      console.error('Failed to fetch videos:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleVideoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', file.name);
    formData.append('type', 'videos');

    try {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(percentComplete);
        }
      });

      xhr.addEventListener('load', async () => {
        if (xhr.status === 201) {
          const newVideo = JSON.parse(xhr.responseText);
          setVideos([...videos, newVideo]);
          setUploadProgress(0);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      });

      xhr.open('POST', `${API_URL}/videos/upload`);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.send(formData);
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteVideo = async (videoId) => {
    if (!window.confirm('Delete this video?')) return;

    try {
      await fetch(`${API_URL}/videos/${videoId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setVideos(videos.filter(v => v.id !== videoId));
    } catch (err) {
      console.error('Failed to delete video:', err);
    }
  };

  const handleToggleVisibility = async (videoId) => {
    try {
      const response = await fetch(`${API_URL}/videos/${videoId}/toggle-visibility`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const updated = await response.json();
      setVideos(videos.map(v => v.id === videoId ? updated : v));
    } catch (err) {
      console.error('Failed to toggle visibility:', err);
    }
  };

  if (loading) return <div className="page"><p>Loading...</p></div>;

  return (
    <div className="page">
      <div className="page-header">
        <div className="header-info">
          <h2>🎥 Videos</h2>
          {user.role !== 'Learner' && (
            <button className="btn btn-history">🕐 History</button>
          )}
        </div>
      </div>

      {user.role !== 'Learner' && (
        <div className="upload-section">
          <h2>📤 Upload New Video</h2>
          <label className="upload-label">
            Choose Video File
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleVideoUpload}
              accept="video/*"
              disabled={uploading}
            />
          </label>
          {uploading && (
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${uploadProgress}%` }}></div>
            </div>
          )}
          {uploadProgress > 0 && <p>{uploadProgress}% uploaded</p>}
        </div>
      )}

      <div className="videos-grid">
        {videos.map(video => (
          <div key={video.id} className="video-card">
            <div className="video-preview">
              <span>🎬</span>
            </div>
            <h3>{video.title}</h3>
            {user.role !== 'Learner' && (
              <>
                <p className="meta">By: {video.uploadedByName}</p>
                <p className="meta">{new Date(video.createdAt).toLocaleDateString()}</p>
              </>
            )}

            {user.role !== 'Learner' && (
              <div className="video-actions">
                <button 
                  className="btn btn-secondary"
                  onClick={() => handleToggleVisibility(video.id)}
                >
                  {video.isHidden ? '👁️ Show' : '🙈 Hide'}
                </button>
                <button 
                  className="btn btn-danger"
                  onClick={() => handleDeleteVideo(video.id)}
                >
                  🗑️ Delete
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// SCRIPTS PAGE
// ============================================

function ScriptsPage({ token, user }) {
  const [scripts, setScripts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchScripts();
  }, []);

  const fetchScripts = async () => {
    try {
      const response = await fetch(`${API_URL}/scripts`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setScripts(data);
    } catch (err) {
      console.error('Failed to fetch scripts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleScriptUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', file.name);
    formData.append('type', 'scripts');

    try {
      const response = await fetch(`${API_URL}/scripts/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const newScript = await response.json();
      setScripts([...scripts, newScript]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteScript = async (scriptId) => {
    if (!window.confirm('Delete this script?')) return;

    try {
      await fetch(`${API_URL}/scripts/${scriptId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setScripts(scripts.filter(s => s.id !== scriptId));
    } catch (err) {
      console.error('Failed to delete script:', err);
    }
  };

  if (loading) return <div className="page"><p>Loading...</p></div>;

  return (
    <div className="page">
      <div className="page-header">
        <div className="header-info">
          <h2>📖 Scripts</h2>
          {user.role !== 'Learner' && (
            <button className="btn btn-history">🕐 History</button>
          )}
        </div>
      </div>

      {user.role !== 'Learner' && (
        <div className="upload-section">
          <h2>📤 Upload New Script</h2>
          <label className="upload-label">
            Choose Script File
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleScriptUpload}
              accept=".pdf,.doc,.docx,.txt"
              disabled={uploading}
            />
          </label>
          {uploading && <p>Uploading...</p>}
        </div>
      )}

      <div className="scripts-list">
        {scripts.map(script => (
          <div key={script.id} className="script-item">
            <div className="script-icon">📖</div>
            <div className="script-info">
              <h3>{script.title}</h3>
              {user.role !== 'Learner' && (
                <p className="meta">By: {script.uploadedByName} | {new Date(script.createdAt).toLocaleDateString()}</p>
              )}
            </div>
            <div className="script-actions">
              <a 
                href={script.fileUrl} 
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
              >
                👁️ Preview
              </a>
              {user.role !== 'Learner' && (
                <button 
                  className="btn btn-danger"
                  onClick={() => handleDeleteScript(script.id)}
                >
                  🗑️ Delete
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// TESTS PAGE
// ============================================

function TestsPage({ token, user }) {
  const [tests, setTests] = useState([]);
  const [userTests, setUserTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [newTest, setNewTest] = useState({ title: '', link: '' });
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchTests();
  }, []);

  const fetchTests = async () => {
    try {
      const response = await fetch(`${API_URL}/tests`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setTests(data);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch tests:', err);
      setLoading(false);
    }
  };

  const handleTestUpload = async (e) => {
    e.preventDefault();
    
    const formData = new FormData();
    formData.append('title', newTest.title);
    if (newTest.link) formData.append('link', newTest.link);
    if (fileInputRef.current?.files[0]) {
      formData.append('file', fileInputRef.current.files[0]);
      formData.append('type', 'tests');
    }

    try {
      if (editingId) {
        const response = await fetch(`${API_URL}/tests/${editingId}`, {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        });
        const updatedTest = await response.json();
        setTests(tests.map(t => t.id === editingId ? updatedTest : t));
        setEditingId(null);
      } else {
        const response = await fetch(`${API_URL}/tests`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        });
        const createdTest = await response.json();
        setTests([...tests, createdTest]);
      }
      setNewTest({ title: '', link: '' });
      setShowUploadForm(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      console.error('Failed to upload test:', err);
    }
  };

  const handleDeleteTest = async (testId) => {
    if (!window.confirm('Delete this test?')) return;

    try {
      await fetch(`${API_URL}/tests/${testId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setTests(tests.filter(t => t.id !== testId));
    } catch (err) {
      console.error('Failed to delete test:', err);
    }
  };

  const handleEditTest = (test) => {
    setNewTest({ title: test.title, link: test.link || '' });
    setEditingId(test.id);
    setShowUploadForm(true);
  };

  const handleStatusChange = async (testId, newStatus) => {
    try {
      const response = await fetch(`${API_URL}/tests/${testId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });
      const updated = await response.json();
      const existing = userTests.find(ut => ut.testId === testId);
      if (existing) {
        setUserTests(userTests.map(ut => ut.testId === testId ? updated : ut));
      } else {
        setUserTests([...userTests, updated]);
      }
    } catch (err) {
      console.error('Failed to update test status:', err);
    }
  };

  const getUserTestStatus = (testId) => {
    const userTest = userTests.find(ut => ut.testId === testId);
    return userTest?.status || 'New';
  };

  if (loading) return <div className="page"><p>Loading...</p></div>;

  return (
    <div className="page">
      <div className="page-header">
        <div className="header-info">
          <h2>✏️ Tests</h2>
          {user.role !== 'Learner' && (
            <button className="btn btn-history">🕐 History</button>
          )}
        </div>
      </div>

      {user.role !== 'Learner' && (
        <>
          <button className="btn btn-primary" onClick={() => {
            setEditingId(null);
            setNewTest({ title: '', link: '' });
            setShowUploadForm(!showUploadForm);
          }}>
            + New Test
          </button>

          {showUploadForm && (
            <form onSubmit={handleTestUpload} className="upload-section">
              <h3>{editingId ? 'Edit Test' : 'Create New Test'}</h3>
              <div className="form-group">
                <label>Test Title</label>
                <input
                  type="text"
                  className="form-input"
                  value={newTest.title}
                  onChange={(e) => setNewTest({ ...newTest, title: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>External Link (optional)</label>
                <input
                  type="url"
                  className="form-input"
                  value={newTest.link}
                  onChange={(e) => setNewTest({ ...newTest, link: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Upload File (optional)</label>
                <input type="file" className="form-input" ref={fileInputRef} />
              </div>

              <div className="btn-group">
                <button type="submit" className="btn btn-primary">
                  {editingId ? 'Update Test' : 'Create Test'}
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => {
                    setShowUploadForm(false);
                    setEditingId(null);
                    setNewTest({ title: '', link: '' });
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </>
      )}

      <div className="tests-list">
        {tests.map(test => (
          <div key={test.id} className="test-item">
            <div className="test-info">
              <h3>{test.title}</h3>
              {user.role !== 'Learner' && (
                <p className="meta">By: {test.uploadedByName} | {new Date(test.createdAt).toLocaleDateString()}</p>
              )}
            </div>

            {user.role === 'Learner' && (
              <div className="test-status">
                <label>Status:</label>
                <select 
                  className="form-input" 
                  value={getUserTestStatus(test.id)} 
                  onChange={(e) => handleStatusChange(test.id, e.target.value)}
                >
                  <option value="New">New</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Done">Done</option>
                </select>
              </div>
            )}

            <div className="test-actions">
              {test.link && (
                <a href={test.link} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                  🔗 Open Link
                </a>
              )}

              {user.role !== 'Learner' && (
                <>
                  <button 
                    className="btn btn-secondary"
                    onClick={() => handleEditTest(test)}
                  >
                    ✏️ Edit
                  </button>
                  <button 
                    className="btn btn-danger"
                    onClick={() => handleDeleteTest(test.id)}
                  >
                    🗑️ Delete
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// FAQs PAGE
// ============================================

function FAQsPage({ token, user }) {
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newFaq, setNewFaq] = useState({ question: '', answer: '' });

  useEffect(() => {
    fetchFAQs();
  }, []);

  const fetchFAQs = async () => {
    try {
      const response = await fetch(`${API_URL}/faqs`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setFaqs(data);
    } catch (err) {
      console.error('Failed to fetch FAQs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFaq = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch(`${API_URL}/faqs`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newFaq)
      });
      const created = await response.json();
      setFaqs([...faqs, created]);
      setNewFaq({ question: '', answer: '' });
      setShowForm(false);
    } catch (err) {
      console.error('Failed to create FAQ:', err);
    }
  };

  const handleDeleteFaq = async (faqId) => {
    if (!window.confirm('Delete this FAQ?')) return;

    try {
      await fetch(`${API_URL}/faqs/${faqId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setFaqs(faqs.filter(f => f.id !== faqId));
    } catch (err) {
      console.error('Failed to delete FAQ:', err);
    }
  };

  if (loading) return <div className="page"><p>Loading...</p></div>;

  return (
    <div className="page">
      <div className="page-header">
        <div className="header-info">
          <h2>❓ Frequently Asked Questions</h2>
          {user.role !== 'Learner' && (
            <button className="btn btn-history">🕐 History</button>
          )}
        </div>
      </div>

      {user.role !== 'Learner' && (
        <>
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
            + Add FAQ
          </button>

          {showForm && (
            <form onSubmit={handleAddFaq} className="upload-section">
              <h3>Add New FAQ</h3>
              <div className="form-group">
                <label>Question</label>
                <input
                  type="text"
                  className="form-input"
                  value={newFaq.question}
                  onChange={(e) => setNewFaq({ ...newFaq, question: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Answer</label>
                <textarea
                  className="form-input"
                  value={newFaq.answer}
                  onChange={(e) => setNewFaq({ ...newFaq, answer: e.target.value })}
                  rows="5"
                  required
                ></textarea>
              </div>

              <div className="btn-group">
                <button type="submit" className="btn btn-primary">Add FAQ</button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
              </div>
            </form>
          )}
        </>
      )}

      <div className="faqs-container">
        {faqs.map(faq => (
          <div key={faq.id} className="faq-item">
            <h3>{faq.question}</h3>
            <p>{faq.answer}</p>
            {user.role !== 'Learner' && (
              <p className="meta">By: {faq.createdByName}</p>
            )}
            {user.role !== 'Learner' && (
              <button 
                className="btn btn-danger"
                onClick={() => handleDeleteFaq(faq.id)}
              >
                🗑️ Delete
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// SETTINGS PAGE
// ============================================

function SettingsPage({ token, user }) {
  const [activeTab, setActiveTab] = useState('users');

  return (
    <div className="page">
      <div className="page-header">
        <h2>⚙️ Settings</h2>
      </div>

      <div className="tabs">
        <button 
          className={`btn ${activeTab === 'users' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('users')}
        >
          👥 Users
        </button>
        <button 
          className={`btn ${activeTab === 'permissions' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('permissions')}
        >
          🚫 Permissions
        </button>
      </div>

      {activeTab === 'users' && <UsersSettings token={token} user={user} />}
      {activeTab === 'permissions' && <PermissionsSettings token={token} user={user} />}
    </div>
  );
}

// ============================================
// USERS SETTINGS COMPONENT
// ============================================

function UsersSettings({ token, user }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', firstName: '', lastName: '', role: 'Learner' });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${API_URL}/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setUsers(data);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch(`${API_URL}/users`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newUser)
      });
      const created = await response.json();
      setUsers([...users, created]);
      setNewUser({ email: '', firstName: '', lastName: '', role: 'Learner' });
      setShowAddForm(false);
      alert(`User created! Default password: ${created.defaultPassword}`);
    } catch (err) {
      console.error('Failed to create user:', err);
      alert('Failed to create user');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Delete this user?')) return;

    try {
      await fetch(`${API_URL}/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setUsers(users.filter(u => u.id !== userId));
    } catch (err) {
      console.error('Failed to delete user:', err);
    }
  };

  const handleDeactivateUser = async (userId) => {
    try {
      const response = await fetch(`${API_URL}/users/${userId}/deactivate`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const updated = await response.json();
      setUsers(users.map(u => u.id === userId ? updated : u));
    } catch (err) {
      console.error('Failed to deactivate user:', err);
    }
  };

  const handleReactivateUser = async (userId) => {
    try {
      const response = await fetch(`${API_URL}/users/${userId}/reactivate`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const updated = await response.json();
      setUsers(users.map(u => u.id === userId ? updated : u));
    } catch (err) {
      console.error('Failed to reactivate user:', err);
    }
  };

  const handleResetPassword = async (userId) => {
    const newPassword = prompt('Enter new password:');
    if (!newPassword) return;

    try {
      await fetch(`${API_URL}/users/${userId}/reset-password`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ newPassword })
      });
      alert('Password reset successfully');
    } catch (err) {
      console.error('Failed to reset password:', err);
    }
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div className="settings-section">
      <h3>User Management</h3>

      <button className="btn btn-primary" onClick={() => setShowAddForm(!showAddForm)}>
        + Add New User
      </button>

      {showAddForm && (
        <form onSubmit={handleAddUser} className="form-section">
          <div className="btn form-group">
            <label>Email</label>
            <input
              type="email"
              value={newUser.email}
              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              required
            />
          </div>

          <div className="btn form-group">
            <label>First Name</label>
            <input
              type="text"
              value={newUser.firstName}
              onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })}
              required
            />
          </div>

          <div className="btn form-group">
            <label>Last Name</label>
            <input
              type="text"
              value={newUser.lastName}
              onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })}
              required
            />
          </div>

          <div className="btn form-group">
            <label>Role</label>
            <select className="form-input" value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}>
              <option value="Admin">Admin</option>
              <option value="Trainer">Trainer</option>
              <option value="Learner">Learner</option>
            </select>
          </div>

          <button type="submit" className="btn btn-primary">Create User</button>
          <button type="button" className="btn btn-secondary" onClick={() => setShowAddForm(false)}>Cancel</button>
        </form>
      )}

      <table className="users-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id}>
              <td>{u.firstName} {u.lastName}</td>
              <td>{u.email}</td>
              <td>{u.role}</td>
              <td><span className={`status ${u.status.toLowerCase()}`}>{u.status}</span></td>
              <td className="actions">
                <div className="btn btn-group">
                {u.status === 'Active' ? (
                  <button className="btn btn-secondary" onClick={() => handleDeactivateUser(u.id)}>Deactivate</button>
                ) : (
                  <button className="btn btn-success" onClick={() => handleReactivateUser(u.id)}>Reactivate</button>
                )}
                 <button className="btn btn-primary" onClick={() => handleResetPassword(u.id)}>Reset Password</button>
                <button className="btn btn-danger" onClick={() => handleDeleteUser(u.id)}>Delete</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================
function PermissionsSettings({ token, user }) {
  const [permissions, setPermissions] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPermissions();
  }, []);

  const fetchPermissions = async () => {
    try {
      const response = await fetch(`${API_URL}/permissions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setPermissions(data);
    } catch (err) {
      console.error('Failed to fetch permissions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionChange = async (role, feature, action, value) => {
    const updatedPermissions = { ...permissions };
    updatedPermissions[role][feature][action] = value;

    try {
      await fetch(`${API_URL}/permissions/${role}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ permissions: updatedPermissions[role] })
      });
      setPermissions(updatedPermissions);
    } catch (err) {
      console.error('Failed to update permissions:', err);
    }
  };

  if (loading) return <p>Loading...</p>;

  const roles = Object.keys(permissions);
  const features = roles.length > 0 ? Object.keys(permissions[roles[0]]) : [];
  const actions = ['view', 'create', 'edit', 'delete'];

  // Action display names
  const actionNames = {
    view: 'View',
    create: 'Create',
    edit: 'Edit',
    delete: 'Delete'
  };

  return (
    <div className="settings-section">
      <h3>Permission Management</h3>
      <p>Configure what each role can do</p>

      <div className="permissions-table-container">
        <table className="btn permissions-table">
          <thead>
            <tr>
              <th>Role</th>
              {roles.map(role => (
                <th key={role} colSpan="4" className="btn role-header">
                  {role === 'Admin' && '👤'} {role === 'Trainer' && '👨‍🏫'} {role === 'Learner' && '👨‍🎓'} {role}
                </th>
              ))}
            </tr>
            <tr>
              <th>Feature</th>
              {roles.map(role => (
                <React.Fragment key={role}>
                  {actions.map(action => (
                    <th key={`${role}-${action}`} className="btn action-header">
                      {actionNames[action]}
                    </th>
                  ))}
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {features.map(feature => (
              <tr key={feature}>
                <td className="feature-name"><strong>{feature}</strong></td>
                {roles.map(role => (
                  <React.Fragment key={`${feature}-${role}`}>
                    {actions.map(action => (
                      <td key={`${feature}-${role}-${action}`} className="btn permission-cell">
                        <input
                          type="checkbox"
                          checked={permissions[role][feature][action] || false}
                          onChange={(e) => handlePermissionChange(role, feature, action, e.target.checked)}
                        />
                      </td>
                    ))}
                  </React.Fragment>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
export default App;
