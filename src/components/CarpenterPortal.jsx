import React, { useState, useEffect, useRef } from 'react';
import { 
  CheckSquare, 
  Square, 
  Camera, 
  AlertTriangle, 
  CreditCard, 
  CheckCircle, 
  Clock, 
  ArrowLeft, 
  Navigation, 
  FileText, 
  Send, 
  Smartphone, 
  User, 
  Calendar, 
  IndianRupee, 
  AlertCircle, 
  MapPin, 
  RotateCcw, 
  MessageCircle, 
  ChevronRight, 
  Moon, 
  Sun,
  LayoutDashboard,
  Briefcase,
  TrendingUp,
  UserCheck,
  Map
} from 'lucide-react';
import { stateManager } from '../stateManager';
import SignatureCanvas from './SignatureCanvas';
import './CarpenterPortal.css';

export default function CarpenterPortal({ carpenterName = 'John Carpenter' }) {
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'jobs' | 'wallet'
  const [theme, setTheme] = useState('dark'); // 'dark' | 'light'
  const [availability, setAvailability] = useState('Online'); // 'Online' | 'Break' | 'Offline'
  
  // Form states
  const [damagePartName, setDamagePartName] = useState('');
  const [damageNotes, setDamageNotes] = useState('');
  const [damagePhoto, setDamagePhoto] = useState('');
  const [showDamageForm, setShowDamageForm] = useState(false);
  
  // OTP & Completing states
  const [enteredOtp, setEnteredOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  
  // Comments state
  const [newCommentText, setNewCommentText] = useState('');
  const commentsEndRef = useRef(null);

  // In-app mock SMS notification
  const [smsNotification, setSmsNotification] = useState(null);

  // Calling States
  const [callingJob, setCallingJob] = useState(null);
  const [callStatus, setCallStatus] = useState('Dialing');

  // GPS Tracking States
  const gpsWatchRef = useRef(null);
  const [gpsActive, setGpsActive] = useState(false);
  const [gpsError, setGpsError] = useState(null);


  // PII Redaction & Masking Helpers
  const isCompletedMoreThan24Hours = (j) => {
    if (!j) return false;
    if (j.status !== 'Completed' && j.jobStatus !== 'Completed') return false;
    const compLog = j.auditLogs?.find(l => l.action === 'Job Completed' || l.action === 'Payout Cleared' || l.action === 'Secure Cloud Upload Completed');
    if (!compLog) return false;
    const completedTime = new Date(compLog.timestamp);
    const now = new Date();
    const diffHours = (now - completedTime) / (1000 * 60 * 60);
    // For visual testing, treat completed jobs with logs > 24 hours ago as redacted (such as seeded order FLP-9022 completed 3 days ago)
    return diffHours >= 24;
  };

  const getMaskedValue = (value, type, j) => {
    if (!value) return '';
    if (isCompletedMoreThan24Hours(j)) {
      return '[Redacted for PII Privacy]';
    }
    if (type === 'phone') {
      const str = String(value);
      if (str.length > 5) {
        return str.substring(0, str.length - 7) + '•••-••' + str.substring(str.length - 2);
      }
      return '•••-••' + str.slice(-2);
    }
    return value;
  };

  const handleProxyCall = (targetJob) => {
    setCallingJob(targetJob);
    setCallStatus('Connecting via Secure Bridge...');
    
    const t1 = setTimeout(() => {
      setCallStatus('Ringing... (Routing via virtual +91 120 4000 888)');
    }, 1500);
    
    const t2 = setTimeout(() => {
      setCallStatus('Connected! (Proxy Bridge Active • Calls are recorded)');
    }, 3500);

    window._callTimeouts = [t1, t2];
  };

  const handleEndCall = () => {
    if (window._callTimeouts) {
      window._callTimeouts.forEach(clearTimeout);
    }
    setCallingJob(null);
  };

  const handleStartTransit = (jobId) => {
    const currentJob = jobs.find(j => j.id === jobId);
    if (!currentJob) return;

    stateManager.updateJob(jobId, {
      status: 'In Progress',
      auditLogs: [
        ...(currentJob.auditLogs || []),
        {
          timestamp: new Date().toISOString(),
          action: 'Status Changed to In Progress',
          user: carpenterName,
          comments: 'Started transit to assembly site.'
        }
      ]
    });
    
    const trackLink = `${window.location.origin}${window.location.pathname}?track=${jobId}`;
    const msg = `Hi ${currentJob.customerName}, your CarpentryPro technician ${carpenterName} is on the way! ETA: 25 mins. Live-track at: ${trackLink}`;
    const rawPhone = currentJob.customerPhone || '+91-95555-01234';
    const cleanPhone = rawPhone.replace(/[^0-9]/g, '');
    
    setSmsNotification({
      customerName: currentJob.customerName,
      text: `[SMS to Client] "${msg}"`,
      waPhone: cleanPhone,
      smsPhone: rawPhone,
      encodedMsg: encodeURIComponent(msg)
    });

    // Start GPS watch
    if (navigator.geolocation) {
      setGpsError(null);
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const coords = {
            lat: pos.coords.latitude.toFixed(6),
            lng: pos.coords.longitude.toFixed(6),
            accuracy: Math.round(pos.coords.accuracy),
            timestamp: new Date().toISOString()
          };
          stateManager.updateJob(jobId, { gpsCoords: coords });
          setGpsActive(true);
        },
        (err) => {
          setGpsError('Location access denied. Sharing disabled.');
          setGpsActive(false);
        },
        { enableHighAccuracy: true, maximumAge: 15000, timeout: 10000 }
      );
      gpsWatchRef.current = { watchId, jobId };
      setGpsActive(true);
    } else {
      setGpsError('Geolocation not supported on this device.');
    }
    
    setJobs(stateManager.getJobs());
  };


  // Load jobs initially
  useEffect(() => {
    const loadedJobs = stateManager.getJobs();
    setJobs(loadedJobs);
    
    // Read theme from localStorage if available
    const savedTheme = localStorage.getItem('carpenter_app_theme');
    if (savedTheme) {
      setTheme(savedTheme);
      if (savedTheme === 'light') {
        document.documentElement.classList.add('light-theme');
      }
    }
  }, []);

  // Sync scroll on new comments
  useEffect(() => {
    if (commentsEndRef.current) {
      commentsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedJobId, jobs]);

  // Find currently selected job
  const job = jobs.find(j => j.id === selectedJobId) || null;

  // Theme toggle helper
  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('carpenter_app_theme', nextTheme);
    if (nextTheme === 'light') {
      document.documentElement.classList.add('light-theme');
    } else {
      document.documentElement.classList.remove('light-theme');
    }
  };

  // Reset Demo helper
  const handleResetDemo = () => {
    if (window.confirm("Are you sure you want to reset all job data to original mock values?")) {
      const resetJobs = stateManager.resetState();
      setJobs(resetJobs);
      setSelectedJobId(null);
      setSmsNotification(null);
      setEnteredOtp('');
      setOtpError('');
      setDamagePartName('');
      setDamageNotes('');
      setDamagePhoto('');
      setShowDamageForm(false);
    }
  };

  // Toggle Checklist item
  const handleChecklistToggle = (jobId, itemId) => {
    const updatedJob = stateManager.toggleChecklistItem(jobId, itemId);
    // Refresh jobs
    setJobs(stateManager.getJobs());
  };

  // Photo uploads (Before/After)
  const handlePhotoChange = (jobId, type, e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const currentJob = stateManager.getJobById(jobId);
      const updatedPhotos = { ...currentJob.photos, [type]: reader.result };
      stateManager.updateJob(jobId, { photos: updatedPhotos });
      setJobs(stateManager.getJobs());
    };
    reader.readAsDataURL(file);
  };

  // Trigger Mock photo
  const handleMockPhoto = (jobId, type) => {
    const mockImage = type === 'before'
      ? 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200"><rect width="100%" height="100%" fill="%23232e42"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%239ca3af" font-size="14">Unopened Furniture Boxes (Mock)</text></svg>'
      : 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200"><rect width="100%" height="100%" fill="%231e3a8a"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23ffffff" font-size="14">Assembled Walnut Cabinet (Mock)</text></svg>';
    
    const currentJob = stateManager.getJobById(jobId);
    const updatedPhotos = { ...currentJob.photos, [type]: mockImage };
    stateManager.updateJob(jobId, { photos: updatedPhotos });
    setJobs(stateManager.getJobs());
  };

  // Clear photo
  const handleClearPhoto = (jobId, type) => {
    const currentJob = stateManager.getJobById(jobId);
    const updatedPhotos = { ...currentJob.photos, [type]: null };
    stateManager.updateJob(jobId, { photos: updatedPhotos });
    setJobs(stateManager.getJobs());
  };

  // Submit Damage Report
  const handleDamageSubmit = (e) => {
    e.preventDefault();
    if (!damagePartName || !damageNotes) {
      alert("Please specify the damaged part name and details.");
      return;
    }
    stateManager.submitDamageReport(job.id, damagePartName, damageNotes, damagePhoto);
    
    // Clean inputs
    setDamagePartName('');
    setDamageNotes('');
    setDamagePhoto('');
    setShowDamageForm(false);
    
    // Refresh jobs
    setJobs(stateManager.getJobs());
  };

  // Handle Mock Damage Photo
  const handleMockDamagePhoto = () => {
    setDamagePhoto('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200"><rect width="100%" height="100%" fill="%237f1d1d"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23f87171" font-size="13">Damaged Shelf Rail Joint (Mock)</text></svg>');
  };

  // Trigger Send OTP
  const handleSendOtp = (jobId) => {
    const currentJob = stateManager.getJobById(jobId);
    stateManager.updateJob(jobId, { otpSent: true });
    
    // Trigger in-app notification simulation
    setSmsNotification({
      customerName: currentJob.customerName,
      code: currentJob.otp,
      text: `[SMS to Client] "${currentJob.customerName}, your CarpentryPro verification code is ${currentJob.otp}."`
    });

    setJobs(stateManager.getJobs());
  };

  // Verify OTP
  const handleVerifyOtp = (jobId) => {
    const currentJob = stateManager.getJobById(jobId);
    if (enteredOtp === currentJob.otp) {
      stateManager.updateJob(jobId, { otpVerified: true });
      setOtpError('');
      setSmsNotification(null); // Clear notification once verified
    } else {
      setOtpError("Incorrect verification code. Please check details.");
    }
    setJobs(stateManager.getJobs());
  };

  // Sign off and complete job
  const handleSignatureSave = (signatureBase64) => {
    const paymentStatusUpdate = job.paymentType === 'Customer' ? 'Collected on-site' : 'Pending Payout';
    
    // Stop GPS tracking when job completes
    if (gpsWatchRef.current) {
      navigator.geolocation.clearWatch(gpsWatchRef.current.watchId);
      gpsWatchRef.current = null;
      setGpsActive(false);
    }

    // Generate simulated expiring signed URLs for cloud storage vault
    const expires = Math.floor((Date.now() + 15 * 60 * 1000) / 1000); // 15 mins expiry
    const randomHash = Math.random().toString(36).substring(2, 8);
    const mockSecureSigUrl = `https://storage.timberflow.in/buckets/secure-fsm-vault/sig_${job.id}.png?token=${randomHash}&expires=${expires}`;
    const mockSecurePhotoUrl = `https://storage.timberflow.in/buckets/secure-fsm-vault/after_${job.id}.png?token=${randomHash}&expires=${expires}`;

    stateManager.updateJob(job.id, {
      status: 'Completed',
      signature: signatureBase64,
      paymentStatus: paymentStatusUpdate,
      gpsCoords: null, // Clear GPS on completion for privacy
      secureSignatureUrl: mockSecureSigUrl,
      securePhotoUrl: mockSecurePhotoUrl,
      auditLogs: [
        ...(job.auditLogs || []),
        {
          timestamp: new Date().toISOString(),
          action: 'Secure Cloud Upload Completed',
          user: 'Security Vault',
          comments: `Uploaded signature & proof photo to cloud bucket secure-fsm-vault.`
        }
      ]
    });

    // Add completion comment with the expiring links
    stateManager.addComment(
      job.id, 
      `System: Verification photos and signature uploaded to secure vault. Private expiring links created: [Signature Details](${mockSecureSigUrl}) | [Photo Proof](${mockSecurePhotoUrl}) (Links valid for 15 minutes).`,
      'System'
    );

    // Refresh jobs
    setJobs(stateManager.getJobs());
    setEnteredOtp('');
    setOtpError('');
  };


  // Send Comment
  const handleSendComment = (e) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;

    stateManager.addComment(job.id, newCommentText, 'Carpenter');
    const typedText = newCommentText;
    setNewCommentText('');
    setJobs(stateManager.getJobs());

    // Trigger standard Dispatcher reply mock in 1.5 seconds
    setTimeout(() => {
      const liveJob = stateManager.getJobById(job.id);
      // Double check the carpenter is still on this job before sending reply
      if (liveJob) {
        let reply = "Copy that. We've logged this update. Let us know if you need customer support assistance.";
        if (typedText.toLowerCase().includes('help') || typedText.toLowerCase().includes('missing')) {
          reply = "Understood. If any parts are missing, please fill out the 'Report Damage/Missing Part' form below so we can ship them immediately.";
        } else if (typedText.toLowerCase().includes('arrive') || typedText.toLowerCase().includes('route')) {
          reply = "Perfect, thank you for checking in. We've notified the customer that you are on the way.";
        }
        stateManager.addComment(job.id, reply, 'Dispatcher');
        setJobs(stateManager.getJobs());
      }
    }, 1500);
  };

  // Filter jobs for this specific carpenter (RBAC Isolation)
  const carpenterJobs = jobs.filter(j => j.assignedCarpenter === carpenterName || j.assigned_carpenter === carpenterName);

  // Wallet stats summary calculation for this carpenter only
  const getCarpenterEarnings = () => {
    const completedJobs = carpenterJobs.filter(job => job.status === 'Completed' || job.jobStatus === 'Completed');
    let totalPaid = 0;
    let totalPending = 0;
    let collectedOnSite = 0;
    
    completedJobs.forEach(job => {
      const amt = job.payout || job.payoutAmount || 0;
      if (job.paymentStatus === 'Paid') {
        totalPaid += amt;
      } else if (job.paymentStatus === 'Collected on-site' || job.paymentStatus === 'Collected') {
        collectedOnSite += amt;
      } else {
        totalPending += amt;
      }
    });

    return {
      completedCount: completedJobs.length,
      totalPaid,
      totalPending,
      collectedOnSite,
      totalEarnings: totalPaid + totalPending + collectedOnSite,
      completedJobs
    };
  };

  const walletSummary = getCarpenterEarnings();
  const activeJobs = carpenterJobs.filter(j => j.status !== 'Completed');
  const todayJobsCount = carpenterJobs.filter(j => j.status !== 'Completed' && j.status !== 'Scheduled').length;

  // Detail validation check for unlocking OTP send
  const isChecklistFinished = job ? job.checklist.every(item => item.checked) : false;
  const isBeforeUploaded = job ? !!job.photos.before : false;
  const isAfterUploaded = job ? !!job.photos.after : false;
  const isReadyToComplete = isChecklistFinished && isBeforeUploaded && isAfterUploaded;

  return (
    <div className="carpenter-app-simulator">
      <div className="carpenter-app-container">
        
        {/* Header Bar */}
        <header className="app-header">
          <div className="header-brand">
            <div className="welcome-avatar">J</div>
            <div>
              <h1>CarpentryPro</h1>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Carpenter Portal</span>
            </div>
          </div>
          <div className="header-actions">
            {/* GPS Live Indicator */}
            {gpsActive && (
              <div className="gps-active-badge" title="Live location sharing active">
                <span className="gps-pulse-dot"></span>
                GPS
              </div>
            )}
            {gpsError && (
              <div className="gps-error-badge" title={gpsError}>
                No GPS
              </div>
            )}
            <button 
              type="button" 
              onClick={toggleTheme} 
              className="btn-icon" 
              title="Toggle Light/Dark Theme"
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button 
              type="button" 
              onClick={handleResetDemo} 
              className="btn-reset-demo"
            >
              Reset Demo
            </button>
          </div>
        </header>


        {/* SMS Notification Banner simulation */}
        {smsNotification && (
          <div className="mock-notification-banner">
            <div className="mock-notification-content">
              <strong>MOCK SMS NOTIFICATION</strong>
              <p>{smsNotification.text}</p>
              <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                <a 
                  href={`https://wa.me/${smsNotification.waPhone}?text=${smsNotification.encodedMsg}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="share-wa-btn"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '6px 12px',
                    fontSize: '11px',
                    backgroundColor: '#25D366',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    textDecoration: 'none',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  <MessageCircle size={12} />
                  Send WhatsApp
                </a>
                <a 
                  href={`sms:${smsNotification.smsPhone}?body=${smsNotification.encodedMsg}`}
                  className="share-sms-btn"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '6px 12px',
                    fontSize: '11px',
                    backgroundColor: '#3b82f6',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    textDecoration: 'none',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  <Send size={12} />
                  Send SMS
                </a>
              </div>
            </div>
            <button 
              type="button" 
              className="btn-close-notif" 
              onClick={() => setSmsNotification(null)}
            >
              Close
            </button>
          </div>
        )}

        {/* MAIN SCROLL VIEW */}
        <main className="app-main-content">
          
          {/* DASHBOARD TAB OVERVIEW */}
          {activeTab === 'dashboard' && (
            <div className="carpenter-dashboard-tab animate-fade-in">
              {/* Availability Toggler Card */}
              <div className="availability-card card-style">
                <div className="status-indicator-row">
                  <div className={`status-dot ${availability.toLowerCase()}`}></div>
                  <span>You are currently: <strong>{availability}</strong></span>
                </div>
                <div className="status-btn-group">
                  <button 
                    type="button" 
                    className={`status-btn online ${availability === 'Online' ? 'active' : ''}`}
                    onClick={() => setAvailability('Online')}
                  >
                    Active & Online
                  </button>
                  <button 
                    type="button" 
                    className={`status-btn break ${availability === 'Break' ? 'active' : ''}`}
                    onClick={() => setAvailability('Break')}
                  >
                    On Break
                  </button>
                  <button 
                    type="button" 
                    className={`status-btn offline ${availability === 'Offline' ? 'active' : ''}`}
                    onClick={() => setAvailability('Offline')}
                  >
                    Offline
                  </button>
                </div>
              </div>

              {/* Stats Block */}
              <div className="dashboard-stats-grid" style={{ marginBottom: '16px' }}>
                <div className="stat-card">
                  <div className="stat-icon-wrap primary">
                    <Briefcase size={16} />
                  </div>
                  <span className="stat-val">{jobs.filter(j => j.assignedCarpenter === carpenterName && j.jobStatus !== 'Completed').length}</span>
                  <span className="stat-lbl">Active Jobs</span>
                </div>
                <div className="stat-card">
                  <div className="stat-icon-wrap success">
                    <CheckCircle size={16} />
                  </div>
                  <span className="stat-val">{jobs.filter(j => j.assignedCarpenter === carpenterName && j.jobStatus === 'Completed').length}</span>
                  <span className="stat-lbl">Completed</span>
                </div>
                <div className="stat-card">
                  <div className="stat-icon-wrap warning">
                    <IndianRupee size={16} />
                  </div>
                  <span className="stat-val">₹{
                    jobs.filter(j => j.assignedCarpenter === carpenterName && j.jobStatus === 'Completed')
                      .reduce((sum, j) => sum + j.payout, 0)
                  }</span>
                  <span className="stat-lbl">Earnings</span>
                </div>
              </div>

              {/* Today's Schedule Agenda */}
              <div className="agenda-section">
                <div className="section-title-bar">
                  <h3><Calendar size={15} /> Today's Agenda</h3>
                  <span>{jobs.filter(j => j.assignedCarpenter === carpenterName && j.jobStatus !== 'Completed').length} Pending</span>
                </div>

                <div className="agenda-timeline">
                  {jobs.filter(j => j.assignedCarpenter === carpenterName && j.jobStatus !== 'Completed').length === 0 ? (
                    <div className="empty-agenda">
                      <CheckCircle size={28} style={{ color: 'var(--success)', marginBottom: '8px' }} />
                      <p>All caught up! No pending jobs assigned to you today.</p>
                    </div>
                  ) : (
                    jobs
                      .filter(j => j.assignedCarpenter === carpenterName && j.jobStatus !== 'Completed')
                      .map((j, index) => (
                        <div key={j.id} className="timeline-item">
                          <div className="timeline-marker">
                            <span className="marker-number">{index + 1}</span>
                            <div className="timeline-line"></div>
                          </div>
                          <div className="timeline-content card-style" onClick={() => { setActiveTab('jobs'); setSelectedJobId(j.id); }}>
                            <div className="timeline-content-header">
                              <span className="time-tag">Slot {index === 0 ? '9:00 AM' : index === 1 ? '1:00 PM' : '4:30 PM'}</span>
                              <span className={`status-pill ${j.jobStatus.toLowerCase().replace(/ /g, '-')}`}>{j.jobStatus}</span>
                            </div>
                            <h4>{j.customerName}</h4>
                            <p className="sku-desc">{j.sku.split('-').slice(1).join(' ') || j.sku}</p>
                            <div className="address-row">
                              <MapPin size={12} />
                              <span>{j.customerAddress}, {j.city}</span>
                            </div>
                            <div className="timeline-footer">
                              <span className="payout-indicator">Payout: ₹{j.payout}</span>
                              <span className="action-link">View Order <ChevronRight size={14} /></span>
                            </div>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>

              {/* Quick Actions Shortcuts */}
              <div className="quick-actions-section" style={{ marginTop: '20px' }}>
                <h4 className="detail-card-title" style={{ paddingLeft: 0, marginBottom: '10px' }}>
                  <TrendingUp size={15} />
                  <span>Performance & Status</span>
                </h4>
                <div className="performance-card card-style">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h5 style={{ margin: '0 0 4px 0', fontSize: '0.85rem' }}>Job Completion Rating</h5>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Target: 95% minimum SLA</span>
                    </div>
                    <span style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--success)' }}>98.2%</span>
                  </div>
                  <div className="progress-bar-bg" style={{ height: '6px', backgroundColor: 'var(--bg-input)', borderRadius: '3px', marginTop: '10px', overflow: 'hidden' }}>
                    <div className="progress-bar-fill" style={{ width: '98%', height: '100%', background: 'linear-gradient(90deg, var(--color-primary), var(--color-success))' }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* JOB LIST / DASHBOARD VIEW */}
          {activeTab === 'jobs' && !selectedJobId && (
            <>
              {/* Welcome card */}
              <div className="dashboard-welcome">
                <div className="welcome-text">
                  <h2>Hello, John!</h2>
                  <p>Ready for today's carpentry assemblies?</p>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="dashboard-stats-grid">
                <div className="stat-card">
                  <div className="stat-icon-wrap primary">
                    <Clock size={16} />
                  </div>
                  <span className="stat-val">{activeJobs.length}</span>
                  <span className="stat-lbl">Active</span>
                </div>
                <div className="stat-card">
                  <div className="stat-icon-wrap success">
                    <CheckCircle size={16} />
                  </div>
                  <span className="stat-val">{walletSummary.completedCount}</span>
                  <span className="stat-lbl">Completed</span>
                </div>
                <div className="stat-card">
                  <div className="stat-icon-wrap warning">
                    <IndianRupee size={16} />
                  </div>
                  <span className="stat-val">₹{walletSummary.totalEarnings}</span>
                  <span className="stat-lbl">Earnings</span>
                </div>
              </div>

              {/* Jobs List Header */}
              <div className="section-title-bar">
                <h3>Today's Work Orders</h3>
                <span>{activeJobs.length} jobs assigned</span>
              </div>

              {/* Jobs Stack */}
              <div className="jobs-list-stack">
                {activeJobs.length === 0 ? (
                  <div className="empty-view">
                    <CheckSquare size={36} />
                    <p>No active jobs! Take a break or check with Dispatch.</p>
                  </div>
                ) : (
                  activeJobs.map(j => (
                    <div 
                      key={j.id} 
                      className="job-card" 
                      onClick={() => setSelectedJobId(j.id)}
                    >
                      <div className="job-card-header">
                        <span className="job-id-badge">{j.id}</span>
                        <span className={`status-badge ${j.status.toLowerCase().replace(/\s+/g, '-')}`}>
                          {j.status}
                        </span>
                      </div>
                      
                      <div className="job-card-body">
                        <img 
                          src={j.productImage} 
                          alt={j.productName} 
                          className="job-thumb"
                          onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1581428982868-e410dd047a90?w=100'; }}
                        />
                        <div className="job-desc">
                          <h4>{j.productName}</h4>
                          <p>
                            <User size={13} style={{ flexShrink: 0 }} />
                            <span>{j.customerName}</span>
                          </p>
                          <p>
                            <MapPin size={13} style={{ flexShrink: 0 }} />
                            <span style={{ 
                              whiteSpace: 'nowrap', 
                              overflow: 'hidden', 
                              textOverflow: 'ellipsis', 
                              maxWidth: '220px' 
                            }}>
                              {j.address}
                            </span>
                          </p>
                        </div>
                        <ChevronRight size={18} className="text-muted" />
                      </div>

                      <div className="job-card-footer">
                        <span className="job-pay-type">{j.paymentType} Pay</span>
                        <span className="job-payout">₹{j.payoutAmount}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {/* WALLET VIEW */}
          {activeTab === 'wallet' && !selectedJobId && (
            <>
              {/* Balance Summary Card */}
              <div className="wallet-summary-card">
                <div className="wallet-balance-wrap">
                  <span>Total Earnings Secured</span>
                  <h2>₹{walletSummary.totalEarnings}</h2>
                </div>

                <div className="wallet-breakdown">
                  <div className="breakdown-item">
                    <span>Cleared (Paid)</span>
                    <strong>₹{walletSummary.totalPaid}</strong>
                  </div>
                  <div className="breakdown-item">
                    <span>Collected Cash/UPI</span>
                    <strong>₹{walletSummary.collectedOnSite}</strong>
                  </div>
                  <div className="breakdown-item">
                    <span>Pending Dispatch</span>
                    <strong>₹{walletSummary.totalPending}</strong>
                  </div>
                </div>
              </div>

              {/* Payout History List */}
              <div className="section-title-bar">
                <h3>Payout & Earnings History</h3>
                <span>{walletSummary.completedJobs.length} Completed</span>
              </div>

              <div className="jobs-list-stack">
                {walletSummary.completedJobs.length === 0 ? (
                  <div className="empty-view">
                    <CreditCard size={36} />
                    <p>No payout history yet. Complete jobs to see payouts.</p>
                  </div>
                ) : (
                  walletSummary.completedJobs.map(j => (
                    <div key={j.id} className="wallet-payout-item">
                      <div className="wallet-item-details">
                        <h4>{j.productName}</h4>
                        <p>
                          <span>{j.id}</span>
                          <span>•</span>
                          <span>{j.paymentType} Pay</span>
                        </p>
                      </div>
                      
                      <div className="wallet-item-payout">
                        <span className="wallet-amt">₹{j.payoutAmount}</span>
                        <span className={`pay-status-badge ${j.paymentStatus.toLowerCase().replace(/\s+/g, '-')}`}>
                          {j.paymentStatus}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {/* JOB DETAIL SCREEN */}
          {selectedJobId && job && (
            <>
              {/* Header with Back button */}
              <div className="job-detail-header">
                <button 
                  type="button" 
                  onClick={() => {
                    setSelectedJobId(null);
                    setEnteredOtp('');
                    setOtpError('');
                  }} 
                  className="btn-back-link"
                >
                  <ArrowLeft size={20} />
                </button>
                <div className="job-detail-title-block">
                  <h2>{job.id} - Details</h2>
                  <p>{getMaskedValue(job.customerName, 'name', job)}</p>
                </div>
                <span className={`status-badge ${job.status.toLowerCase().replace(/\s+/g, '-')}`}>
                  {job.status}
                </span>
              </div>

              {/* Product Visual Card & reference links */}
              <div className="product-hero-card">
                <img 
                  src={job.productImage} 
                  alt={job.productName} 
                  className="product-hero-img"
                  onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1581428982868-e410dd047a90?w=300'; }}
                />
                <div className="product-hero-info">
                  <h3>{job.productName}</h3>
                  <a 
                    href={job.productRefLink} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="btn-instructions-link"
                  >
                    <FileText size={16} />
                    <span>View Assembly PDF Guide</span>
                  </a>
                </div>
              </div>

              {/* Customer & Address Details with Navigation */}
              <div className="detail-card">
                <h4 className="detail-card-title">
                  <MapPin size={15} />
                  <span>Assembly Address</span>
                </h4>
                
                <div className="info-item">
                  <div className="info-item-content">
                    <h4>{getMaskedValue(job.customerName, 'name', job)}</h4>
                    <p>{getMaskedValue(job.address, 'address', job)}</p>
                  </div>
                </div>

                <div className="info-item" style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--border-color)' }}>
                  <div className="info-item-content" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <div>
                      <h4 style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', margin: '0 0 2px 0' }}>Customer Phone</h4>
                      <p style={{ margin: 0, fontWeight: '600', fontSize: '0.85rem' }}>
                        {getMaskedValue(job.customerPhone || '+1-555-0199', 'phone', job)}
                      </p>
                    </div>
                    {(!isCompletedMoreThan24Hours(job) && job.status !== 'Completed') && (
                      <button 
                        type="button" 
                        onClick={() => handleProxyCall(job)}
                        className="btn btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', backgroundColor: 'rgba(59, 130, 246, 0.1)', border: '1px solid var(--color-primary)', borderRadius: '6px', color: 'var(--text-light)' }}
                      >
                        <Smartphone size={12} />
                        Call (Masked)
                      </button>
                    )}
                  </div>
                </div>

                {!isCompletedMoreThan24Hours(job) && (
                  <a 
                    href={job.googleMapsLink || `https://maps.google.com/?q=${encodeURIComponent(job.address)}`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="btn-navigation-link"
                    style={{ marginTop: '12px' }}
                  >
                    <Navigation size={16} />
                    <span>Open in Google Maps Navigation</span>
                  </a>
                )}
              </div>

              {/* Status Action Button (e.g. Start Transit) */}
              {(job.status === 'Assigned' || job.status === 'Unassigned') && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ width: '100%', padding: '12px', borderRadius: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}
                    onClick={() => handleStartTransit(job.id)}
                  >
                    <Navigation size={16} />
                    Start Transit & Notify Client
                  </button>
                </div>
              )}
              {job.status === 'In Progress' && !isReadyToComplete && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', backgroundColor: 'var(--bg-input)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                    <span className="pulse-dot" style={{ display: 'inline-block', marginRight: '6px', backgroundColor: 'var(--color-warning)' }}></span>
                    Job is In Progress. Fill checklist and photos below to sign off.
                  </div>
                </div>
              )}

              {/* Step-by-Step Interactive Assembly Checklist */}
              <div className="detail-card">
                <div className="checklist-progress-container">
                  <h4 className="detail-card-title" style={{ margin: 0 }}>
                    <CheckSquare size={15} />
                    <span>Assembly Checklist</span>
                  </h4>
                  <span className="checklist-progress-text">
                    {job.checklist.filter(i => i.checked).length} of {job.checklist.length} done
                  </span>
                </div>

                {/* Progress bar */}
                <div className="progress-track">
                  <div 
                    className="progress-bar-fill" 
                    style={{ 
                      width: `${(job.checklist.filter(i => i.checked).length / job.checklist.length) * 100}%` 
                    }}
                  />
                </div>

                <div className="checklist-items-stack">
                  {job.checklist.map(item => (
                    <div 
                      key={item.id} 
                      className={`checklist-row ${item.checked ? 'checked' : ''}`}
                      onClick={() => handleChecklistToggle(job.id, item.id)}
                    >
                      <div className="checklist-checkbox-wrap">
                        <div className="checklist-checkbox">
                          {item.checked && <span style={{ color: 'white', fontSize: '10px', fontWeight: 'bold' }}>✓</span>}
                        </div>
                      </div>
                      <span className="checklist-lbl">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mandatory Photos Section */}
              <div className="detail-card">
                <h4 className="detail-card-title">
                  <Camera size={15} />
                  <span>Mandatory Job Photos</span>
                </h4>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '0 0 6px 0' }}>
                  Provide unboxing and finished photos to sign-off job.
                </p>

                <div className="photo-selectors-grid">
                  
                  {/* Before Assembly Photo */}
                  <div className={`photo-uploader-box ${job.photos.before ? 'has-image' : ''}`}>
                    {job.photos.before ? (
                      <>
                        <img src={job.photos.before} className="uploaded-thumb" alt="Before Assembly" />
                        <button 
                          type="button" 
                          className="btn-clear-photo" 
                          onClick={() => handleClearPhoto(job.id, 'before')}
                        >
                          ✕
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="photo-label">Before Assembly</span>
                        <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>(Unopened boxes)</span>
                        <label className="photo-btn-label">
                          Upload File
                          <input 
                            type="file" 
                            accept="image/*" 
                            style={{ display: 'none' }}
                            onChange={(e) => handlePhotoChange(job.id, 'before', e)} 
                          />
                        </label>
                        <button 
                          type="button" 
                          onClick={() => handleMockPhoto(job.id, 'before')} 
                          className="btn-mock-photo"
                        >
                          Use Mock Box Image
                        </button>
                      </>
                    )}
                  </div>

                  {/* After Assembly Photo */}
                  <div className={`photo-uploader-box ${job.photos.after ? 'has-image' : ''}`}>
                    {job.photos.after ? (
                      <>
                        <img src={job.photos.after} className="uploaded-thumb" alt="After Assembly" />
                        <button 
                          type="button" 
                          className="btn-clear-photo" 
                          onClick={() => handleClearPhoto(job.id, 'after')}
                        >
                          ✕
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="photo-label">After Assembly</span>
                        <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>(Finished Furniture)</span>
                        <label className="photo-btn-label">
                          Upload File
                          <input 
                            type="file" 
                            accept="image/*" 
                            style={{ display: 'none' }}
                            onChange={(e) => handlePhotoChange(job.id, 'after', e)} 
                          />
                        </label>
                        <button 
                          type="button" 
                          onClick={() => handleMockPhoto(job.id, 'after')} 
                          className="btn-mock-photo"
                        >
                          Use Mock Finish Image
                        </button>
                      </>
                    )}
                  </div>

                </div>
              </div>

              {/* Report Damage form */}
              <div className="detail-card">
                <div 
                  className="checklist-progress-container" 
                  style={{ cursor: 'pointer', marginBottom: 0 }}
                  onClick={() => setShowDamageForm(!showDamageForm)}
                >
                  <h4 className="detail-card-title" style={{ margin: 0, color: 'var(--color-danger)' }}>
                    <AlertTriangle size={15} />
                    <span>Report Damage or Missing Parts</span>
                  </h4>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {showDamageForm ? 'Collapse' : 'Expand Form'}
                  </span>
                </div>

                {/* If damage exists already */}
                {job.damageReport && (
                  <div className="submitted-damage-info" style={{ marginTop: '10px' }}>
                    <p style={{ fontWeight: 'bold', color: 'var(--danger)' }}>
                      Damage Claim Active (On Hold - Parts Requested)
                    </p>
                    <p><strong>Part:</strong> {job.damageReport.partName}</p>
                    <p><strong>Description:</strong> {job.damageReport.notes}</p>
                    {job.damageReport.photo && (
                      <img src={job.damageReport.photo} className="damage-preview-img" alt="Damage proof" />
                    )}
                  </div>
                )}

                {showDamageForm && !job.damageReport && (
                  <form onSubmit={handleDamageSubmit} className="damage-form" style={{ marginTop: '12px' }}>
                    <div className="form-group">
                      <label>Part Name / Number</label>
                      <input 
                        type="text" 
                        value={damagePartName}
                        onChange={(e) => setDamagePartName(e.target.value)}
                        placeholder="e.g. Left support frame rail" 
                        className="form-input"
                        required
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>Describe the Defect / Missing Item</label>
                      <textarea 
                        rows="2"
                        value={damageNotes}
                        onChange={(e) => setDamageNotes(e.target.value)}
                        placeholder="Detail wood splits, structural cracks, or missing screws..." 
                        className="form-input"
                        style={{ fontFamily: 'inherit', resize: 'vertical' }}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>Photo Proof</label>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <label className="photo-btn-label" style={{ flex: 1, textAlign: 'center', padding: '10px' }}>
                          Choose Image File
                          <input 
                            type="file" 
                            accept="image/*" 
                            style={{ display: 'none' }}
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) {
                                const r = new FileReader();
                                r.onloadend = () => setDamagePhoto(r.result);
                                r.readAsDataURL(f);
                              }
                            }}
                          />
                        </label>
                        <button 
                          type="button" 
                          onClick={handleMockDamagePhoto} 
                          className="btn btn-secondary"
                          style={{ flex: 1 }}
                        >
                          Use Mock Damage Photo
                        </button>
                      </div>
                      {damagePhoto && (
                        <div style={{ marginTop: '8px', position: 'relative' }}>
                          <img src={damagePhoto} alt="Damage Preview" style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: '4px' }} />
                          <button type="button" className="btn-clear-photo" onClick={() => setDamagePhoto('')}>✕</button>
                        </div>
                      )}
                    </div>

                    <button type="submit" className="btn btn-danger">
                      <AlertTriangle size={15} />
                      <span>Submit Claim & Put On Hold</span>
                    </button>
                  </form>
                )}
              </div>

              {/* Complete Job Sign-off Section */}
              {job.status !== 'Completed' && (
                <div className="completion-flow-card">
                  <h4 className="completion-step-title">
                    <Smartphone size={15} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'text-bottom' }} />
                    Job Closure & Sign-Off
                  </h4>

                  {/* Wallet Alert based on payment type */}
                  {job.paymentType === 'Customer' ? (
                    <div className="wallet-payment-alert customer-pay">
                      <AlertCircle size={18} style={{ flexShrink: 0 }} />
                      <div>
                        <strong>Customer Pay Order:</strong> Collect payment of 
                        <span style={{ fontSize: '0.85rem', fontWeight: '800' }}> ₹{job.payoutAmount} </span> 
                        via cash/UPI directly from client before final signature.
                      </div>
                    </div>
                  ) : (
                    <div className="wallet-payment-alert company-pay">
                      <CheckCircle size={18} style={{ flexShrink: 0 }} />
                      <div>
                        <strong>Company Pay Order:</strong> Paid directly by contractor accounts. No cash collection needed.
                      </div>
                    </div>
                  )}

                  {/* Locked message if requirements are not met */}
                  {!isReadyToComplete ? (
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', backgroundColor: 'var(--bg-input)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                      <p style={{ margin: '0 0 4px 0', fontWeight: 'bold' }}>Requirements checklist before client verification:</p>
                      <ul style={{ margin: 0, paddingLeft: '16px' }}>
                        <li style={{ color: isChecklistFinished ? 'var(--success)' : 'inherit' }}>
                          Checklist items: {job.checklist.filter(i => i.checked).length}/{job.checklist.length} completed
                        </li>
                        <li style={{ color: isBeforeUploaded ? 'var(--success)' : 'inherit' }}>
                          Before Photo: {isBeforeUploaded ? '✓ Uploaded' : 'Missing'}
                        </li>
                        <li style={{ color: isAfterUploaded ? 'var(--success)' : 'inherit' }}>
                          After Photo: {isAfterUploaded ? '✓ Uploaded' : 'Missing'}
                        </li>
                      </ul>
                    </div>
                  ) : (
                    <div className="otp-actions-block">
                      {!job.otpSent ? (
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={() => handleSendOtp(job.id)}
                        >
                          Send Verification OTP to Customer
                        </button>
                      ) : !job.otpVerified ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <p style={{ fontSize: '0.72rem', margin: 0, color: 'var(--text-muted)' }}>
                            Enter the 4-digit code sent to customer's mobile:
                          </p>
                          <div className="otp-input-row">
                            <input
                              type="text"
                              maxLength={4}
                              value={enteredOtp}
                              onChange={(e) => setEnteredOtp(e.target.value.replace(/\D/g, ''))}
                              placeholder="••••"
                              className="otp-text-input"
                            />
                            <button
                              type="button"
                              className="btn btn-primary"
                              onClick={() => handleVerifyOtp(job.id)}
                            >
                              Verify
                            </button>
                          </div>
                          {otpError && <span className="otp-error-msg">{otpError}</span>}
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                            (Hint: look at mock notification at the top of the screen)
                          </span>
                        </div>
                      ) : (
                        <div className="otp-success-alert">
                          <CheckCircle size={16} />
                          <span>OTP Verified. Please collect Customer Signature:</span>
                        </div>
                      )}

                      {/* Signature canvas display */}
                      {job.otpVerified && !job.signature && (
                        <SignatureCanvas 
                          onSave={handleSignatureSave} 
                          onCancel={() => {
                            // Can reset OTP verified to let them retry or keep it
                          }}
                        />
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Signoff state display */}
              {job.status === 'Completed' && (
                <div className="completion-flow-card" style={{ borderColor: 'var(--success)' }}>
                  <div className="otp-success-alert">
                    <CheckCircle size={16} />
                    <span>Assembly Completed & Signed Off!</span>
                  </div>
                  {job.signature && (
                    <div className="completed-signature-display">
                      <img src={job.signature} alt="Customer signature proof" />
                      <span>Authorized Signature</span>
                    </div>
                  )}
                </div>
              )}

              {/* Chat Thread / Comments Panel */}
              <div className="comments-panel-card">
                <h4 className="detail-card-title">
                  <MessageCircle size={15} />
                  <span>Dispatcher & Support Chat</span>
                </h4>
                
                <div className="comments-stream-container">
                  {job.comments.length === 0 ? (
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', margin: '20px 0' }}>
                      No messages yet. Send a note to dispatcher below.
                    </p>
                  ) : (
                    job.comments.map(c => {
                      const isCarpenter = c.sender === 'Carpenter';
                      return (
                        <div 
                          key={c.id} 
                          className={`comment-bubble-wrap ${isCarpenter ? 'carpenter' : 'dispatcher'}`}
                        >
                          <div className="comment-bubble">
                            {c.text}
                          </div>
                          <div className="comment-meta">
                            <span className="comment-sender-lbl">{c.sender}</span>
                            <span>{new Date(c.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={commentsEndRef} />
                </div>

                <form onSubmit={handleSendComment} className="comments-input-row">
                  <input 
                    type="text" 
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    placeholder="Type message to dispatcher..."
                    className="comments-text-input"
                  />
                  <button type="submit" className="btn-send-comment">
                    <Send size={15} />
                  </button>
                </form>
              </div>
            </>
          )}

        </main>

        {/* Simulated Secure Proxy Call Screen */}
        {callingJob && (
          <div className="modal-overlay" style={{ zIndex: 2000, position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(5, 7, 12, 0.95)' }}>
            <div className="modal-content" style={{ maxWidth: '280px', backgroundColor: '#131b2e', color: '#fff', textAlign: 'center', padding: '24px 16px', borderRadius: '24px', margin: 'auto', border: '1px solid var(--admin-border-color)' }}>
              <div style={{ margin: '15px auto', width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(59, 130, 246, 0.4)' }}>
                <Smartphone size={24} style={{ color: '#fff' }} />
              </div>
              <h3 style={{ margin: '10px 0 5px 0', fontSize: '1rem' }}>{getMaskedValue(callingJob.customerName, 'name', callingJob)}</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>
                Secure Proxy Bridge
              </p>
              
              <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '12px', margin: '16px 0', fontSize: '0.7rem', border: '1px dashed rgba(255, 255, 255, 0.1)', color: 'var(--text-light)', lineHeight: '1.4' }}>
                <span className="pulse-dot" style={{ display: 'inline-block', marginRight: '6px', backgroundColor: 'var(--color-success)', verticalAlign: 'middle' }}></span>
                {callStatus}
              </div>

              <button 
                type="button" 
                onClick={handleEndCall}
                className="btn btn-danger"
                style={{ width: '100%', padding: '10px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', backgroundColor: 'var(--color-danger)', border: 'none', color: '#fff' }}
              >
                End Call
              </button>
            </div>
          </div>
        )}

        {/* BOTTOM TAB NAV BAR */}
        <nav className="app-bottom-nav">
          <button 
            type="button" 
            className={`nav-tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('dashboard');
              setSelectedJobId(null);
            }}
          >
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </button>

          <button 
            type="button" 
            className={`nav-tab-btn ${activeTab === 'jobs' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('jobs');
              setSelectedJobId(null); // Go back to list when tab toggles
            }}
          >
            <CheckSquare size={18} />
            <span>Jobs</span>
          </button>
          
          <button 
            type="button" 
            className={`nav-tab-btn ${activeTab === 'wallet' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('wallet');
              setSelectedJobId(null); // Go back to list when tab toggles
            }}
          >
            <CreditCard size={18} />
            <span>Wallet</span>
          </button>
        </nav>

      </div>
    </div>
  );
}
