import { useState, useEffect, useRef } from 'react';
import { 
  CheckSquare, 
  CreditCard, 
  HelpCircle,
  Moon, 
  Sun,
  LayoutDashboard,
  Lock,
  MessageCircle,
  Send,
  AlertTriangle,
  LogOut
} from 'lucide-react';
import { stateManager, triggerN8nWebhook, fsaQueries, normalizeOrder } from '../utils/stateManager';
import { useQuery } from '@tanstack/react-query';
import { getTranslation } from '../utils/translations';
import { captureAndStampPhoto } from '../utils/photoStamper';

import './CarpenterPortal.css';

import TutorialOverlay from './carpenter/TutorialOverlay';
import CarpenterDashboard from './carpenter/CarpenterDashboard';
import CarpenterJobList from './carpenter/CarpenterJobList';
import CarpenterWallet from './carpenter/CarpenterWallet';
import CarpenterJobDetail from './carpenter/CarpenterJobDetail';
export default function CarpenterPortal({ carpenterName = 'John Carpenter', directJobId = null, onLogout }) {
  const [appLang, setAppLang] = useState(() => localStorage.getItem('fsa_carpenter_lang') || 'en');
  const t = (key) => getTranslation(appLang, key);

  const handleLanguageChange = (e) => {
    const lang = e.target.value;
    setAppLang(lang);
    localStorage.setItem('fsa_carpenter_lang', lang);
  };

  const { data: carpentersData = { items: [] } } = useQuery(fsaQueries.carpenters.all(1, 500));
  const { data: jobsData = { items: [] }, refetch: refetchJobs } = useQuery(fsaQueries.orders.all(1, 500));
  
  const [, setLocalUpdateCounter] = useState(0);
  useEffect(() => {
    if (jobsData && jobsData.items) {
      stateManager.hydrateOrders(jobsData.items);
    }
  }, [jobsData]);

  useEffect(() => {
    const triggerRender = () => setLocalUpdateCounter(c => c + 1);
    window.addEventListener('fsa_storage_update', triggerRender);
    return () => window.removeEventListener('fsa_storage_update', triggerRender);
  }, []);

  const allJobs = (jobsData.items || []).map(normalizeOrder).filter(Boolean).map(job => {
    const localMemory = stateManager.getOrders().find(o => o?.id === job?.id || o?.orderId === job?.id || o?.order_id === job?.id);
    return localMemory ? { ...job, ...localMemory } : job;
  });
  
  const jobs = allJobs.filter(j => j.assignedCarpenter === carpenterName || j.orderId === directJobId);
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'jobs' | 'wallet'
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('carpenter_app_theme');
    return saved || 'dark';
  });
  const [availability, setAvailability] = useState('Online'); // 'Online' | 'Break' | 'Offline'
  const [uploadingPhoto, setUploadingPhoto] = useState({ before: false, after: false });
  
  // Form states
  const [damagePartName, setDamagePartName] = useState('');
  const [damageNotes, setDamageNotes] = useState('');
  const [damagePhotos, setDamagePhotos] = useState([]);
  const [compressingDamage, setCompressingDamage] = useState(false);
  const [showDamageForm, setShowDamageForm] = useState(false);
  
  // Extra charge request states
  const [showExtraChargeForm, setShowExtraChargeForm] = useState(false);
  const [chargeType, setChargeType] = useState('Hardware Purchased');
  const [chargeAmount, setChargeAmount] = useState('');
  const [chargeNotes, setChargeNotes] = useState('');
  const [chargeReceipt, setChargeReceipt] = useState('');

  // Reject / Skip Order State
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [customRejectReason, setCustomRejectReason] = useState('');
  
  // Direct Job link security check
  const [pinVerified, setPinVerified] = useState(false);
  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState('');
  
  // OTP & Completing states
  const [enteredOtp, setEnteredOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);
  
  // Comments state
  const [newCommentText, setNewCommentText] = useState('');
  const commentsEndRef = useRef(null);
  const mainContentRef = useRef(null);

  // In-app mock SMS notification
  const [smsNotification, setSmsNotification] = useState(null);

  // Onboarding Tutorial states
  const [showTutorial, setShowTutorial] = useState(() => {
    return !localStorage.getItem('fsa_carpenter_tutorial_completed');
  });
  const [tutorialStep, setTutorialStep] = useState(0);

  // Keyboard visibility state (to hide bottom nav bar on mobile focus)
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);



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
      // Small trusted rollout: do not mask phone numbers for active jobs
      return value;
    }
    return value;
  };



  const handleStartTransit = (jobId) => {
    const currentJob = jobs.find(j => (j.id || j.orderId) === jobId);
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
        () => {
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
    
    refetchJobs();
  };


  // Sync theme class list on document root
  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light-theme');
    } else {
      document.documentElement.classList.remove('light-theme');
    }
  }, [theme]);

  // Load jobs initially and listen to storage updates for real-time sync
  useEffect(() => {
    const handleUpdate = () => {
      refetchJobs();
    };

    handleUpdate();
    
    if (directJobId) {
      setSelectedJobId(directJobId);
      setActiveTab('jobs');
      
      // If we are on a direct link, ensure we fetch the job in case it's not in localStorage
      if (stateManager.fetchJobFromServer) {
        stateManager.fetchJobFromServer(directJobId).then(fetchedJob => {
          if (fetchedJob) {
            refetchJobs();
          }
        });
      }
    }

    window.addEventListener('fsa_storage_update', handleUpdate);
    return () => {
      window.removeEventListener('fsa_storage_update', handleUpdate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [directJobId]);

  // Find currently selected job and ensure it has an explicit id property
  let job = jobs.find(j => (j.id || j.orderId) === selectedJobId) || null;
  if (job) {
    job = { ...job, id: job.id || job.orderId };
  }
  const commentsLength = job?.comments?.length || 0;

  // Sync scroll on new comments
  useEffect(() => {
    if (commentsEndRef.current) {
      commentsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedJobId, commentsLength]);

  // Reset main scroll position when activeTab or selectedJobId changes
  useEffect(() => {
    if (mainContentRef.current) {
      mainContentRef.current.scrollTop = 0;
    }
  }, [activeTab, selectedJobId]);

  // Listen for focus/blur globally to toggle keyboard visible state
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleFocus = (e) => {
      const tagName = e.target.tagName;
      const isInput = tagName === 'INPUT' || tagName === 'TEXTAREA';
      const isTextOrNumber = e.target.type === 'text' || e.target.type === 'textarea' || e.target.type === 'number' || e.target.type === 'password' || e.target.type === 'tel';
      if (isInput && isTextOrNumber) {
        setIsKeyboardVisible(true);
      }
    };

    const handleBlur = (e) => {
      const tagName = e.target.tagName;
      if (tagName === 'INPUT' || tagName === 'TEXTAREA') {
        setIsKeyboardVisible(false);
      }
    };

    window.addEventListener('focus', handleFocus, true);
    window.addEventListener('blur', handleBlur, true);

    return () => {
      window.removeEventListener('focus', handleFocus, true);
      window.removeEventListener('blur', handleBlur, true);
    };
  }, []);

  // HTML5 History API integration for PWA back-button navigation
  useEffect(() => {
    if (typeof window === 'undefined' || !window.history) return;
    
    // Initialize history state on first render
    if (!window.history.state) {
      window.history.replaceState({ type: 'tab', name: 'dashboard' }, '');
    }
  }, []);

  // Sync state changes with history
  useEffect(() => {
    if (typeof window === 'undefined' || !window.history) return;
    const currentState = window.history.state;
    
    if (selectedJobId) {
      if (!currentState || currentState.type !== 'job' || currentState.id !== selectedJobId) {
        window.history.pushState({ type: 'job', id: selectedJobId }, '');
      }
    } else {
      if (!currentState || (currentState.type === 'tab' && currentState.name !== activeTab)) {
        window.history.pushState({ type: 'tab', name: activeTab }, '');
      } else if (currentState && currentState.type === 'job') {
        window.history.pushState({ type: 'tab', name: activeTab }, '');
      }
    }
  }, [selectedJobId, activeTab]);

  // Listen for back/forward navigation
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handlePopState = (event) => {
      const state = event.state;
      if (state) {
        if (state.type === 'job') {
          setSelectedJobId(state.id);
          setActiveTab('jobs');
        } else if (state.type === 'tab') {
          setSelectedJobId(null);
          setActiveTab(state.name);
        }
      } else {
        setSelectedJobId(null);
        setActiveTab('dashboard');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

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
      stateManager.resetState();
      refetchJobs();
      setSelectedJobId(null);
      setSmsNotification(null);
      setEnteredOtp('');
      setOtpError('');
      setDamagePartName('');
      setDamageNotes('');
      setDamagePhotos([]);
      setShowDamageForm(false);
    }
  };

  // Toggle Checklist item
  const handleChecklistToggle = (jobId, itemId) => {
    stateManager.toggleChecklistItem(jobId, itemId);
    // Refresh jobs
    refetchJobs();
  };

  // Photo uploads (Before/After) — stamps GPS + timestamp watermark
  const handlePhotoChange = async (jobId, type, e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(prev => ({ ...prev, [type]: true }));
    try {
      const stampedDataUrl = await captureAndStampPhoto(file, jobId);
      const currentJob = stateManager.getJobById(jobId);
      const currentPhotos = (currentJob && currentJob.photos && currentJob.photos[type]) || [];
      const photosArray = Array.isArray(currentPhotos) ? currentPhotos : (currentPhotos ? [currentPhotos] : []);
      const updatedPhotos = { ...currentJob.photos, [type]: [...photosArray, stampedDataUrl] };
      stateManager.updateJob(jobId, { photos: updatedPhotos });
      refetchJobs();
    } catch (err) {
      console.error('Failed to stamp and save photo:', err);
    } finally {
      setUploadingPhoto(prev => ({ ...prev, [type]: false }));
    }
  };


  // Trigger Mock photo
  const handleMockPhoto = (jobId, type) => {
    const mockImage = type === 'before'
      ? 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200"><rect width="100%" height="100%" fill="%23232e42"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%239ca3af" font-size="14">Unopened Furniture Boxes (Mock)</text></svg>'
      : 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200"><rect width="100%" height="100%" fill="%231e3a8a"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23ffffff" font-size="14">Assembled Walnut Cabinet (Mock)</text></svg>';
    
    const currentJob = stateManager.getJobById(jobId);
    const currentPhotos = (currentJob && currentJob.photos && currentJob.photos[type]) || [];
    const photosArray = Array.isArray(currentPhotos) ? currentPhotos : (currentPhotos ? [currentPhotos] : []);
    const updatedPhotos = { ...currentJob.photos, [type]: [...photosArray, mockImage] };
    stateManager.updateJob(jobId, { photos: updatedPhotos });
    refetchJobs();
  };

  // Clear photo
  const handleClearPhoto = (jobId, type, index) => {
    const currentJob = stateManager.getJobById(jobId);
    let currentPhotos = (currentJob && currentJob.photos && currentJob.photos[type]) || [];
    let photosArray = Array.isArray(currentPhotos) ? [...currentPhotos] : (currentPhotos ? [currentPhotos] : []);
    
    if (index !== undefined) {
      photosArray.splice(index, 1);
    } else {
      photosArray = [];
    }
    
    const updatedPhotos = { ...currentJob.photos, [type]: photosArray.length > 0 ? photosArray : null };
    stateManager.updateJob(jobId, { photos: updatedPhotos });
    refetchJobs();
  };

  const handleDamageSubmit = (e) => {
    e.preventDefault();
    if (!damagePartName || !damageNotes) {
      alert("Please specify the damaged part name and details.");
      return;
    }
    
    const photosPayload = damagePhotos.length > 0 ? JSON.stringify(damagePhotos) : '';
    stateManager.submitDamageReport(job.id, damagePartName, damageNotes, photosPayload);
    
    // Clean inputs
    setDamagePartName('');
    setDamageNotes('');
    setDamagePhotos([]);
    setShowDamageForm(false);
    
    // Refresh jobs
    refetchJobs();
  };

  // Submit Extra Charge Request
  const handleExtraChargeSubmit = (e) => {
    e.preventDefault();
    const amountVal = Number(chargeAmount);
    if (!chargeNotes.trim() || isNaN(amountVal) || amountVal <= 0) {
      alert("Please enter a valid amount and notes for the extra charge.");
      return;
    }
    const timestamp = new Date().toISOString();
    const newCharge = {
      id: `ec_${Date.now()}`,
      type: chargeType,
      amount: amountVal,
      notes: chargeNotes.trim(),
      receipt: chargeReceipt || null,
      status: 'Pending Approval',
      requestedBy: carpenterName,
      timestamp
    };

    const currentCharges = job.extraCharges || [];
    stateManager.updateJob(job.id, {
      extraCharges: [...currentCharges, newCharge],
      auditLogs: [
        ...(job.auditLogs || []),
        {
          timestamp,
          action: 'Extra Charge Requested',
          user: carpenterName,
          comments: `Requested extra charge of ₹${amountVal} for ${chargeType}. Notes: ${chargeNotes.trim()}`
        }
      ]
    });

    // Add comment
    stateManager.addComment(
      job.id,
      `System: Field tech requested extra charge of ₹${amountVal} for ${chargeType}. Notes: ${chargeNotes.trim()}`,
      'System'
    );

    // Clean inputs
    setChargeType('Hardware Purchased');
    setChargeAmount('');
    setChargeNotes('');
    setChargeReceipt('');
    setShowExtraChargeForm(false);

    refetchJobs();
    alert("Reimbursement request submitted successfully!");
  };

  // Submit Reject/Skip Order
  const handleRejectSubmit = (e) => {
    e.preventDefault();
    const finalReason = rejectReason === 'Other' ? customRejectReason : rejectReason;
    
    if (!finalReason) {
      alert("Please specify a reason for rejecting the order.");
      return;
    }

    const currentJob = jobs.find(j => j.id === selectedJobId) || job;
    stateManager.rejectJob(selectedJobId, carpenterName, finalReason, currentJob);
    
    refetchJobs();
    setShowRejectForm(false);
    setRejectReason('');
    setCustomRejectReason('');
    setSelectedJobId(null);
    setActiveTab('jobs');
  };

  const handleMockDamagePhoto = () => {
    const mockPhoto = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200"><rect width="100%" height="100%" fill="%237f1d1d"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23f87171" font-size="13">Damaged Shelf Rail Joint (Mock ${damagePhotos.length + 1})</text></svg>`;
    setDamagePhotos(prev => [...prev, mockPhoto]);
  };

  // Handle Mock Receipt Photo
  const handleMockReceiptPhoto = () => {
    setChargeReceipt('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200"><rect width="100%" height="100%" fill="%230f172a"/><text x="50%" y="45%" dominant-baseline="middle" text-anchor="middle" fill="%233b82f6" font-weight="bold" font-size="13">TIMBERFLOW EXPENSE RECEIPT</text><text x="50%" y="65%" dominant-baseline="middle" text-anchor="middle" fill="%2364748b" font-size="10">Approved Hardware Store (₹540.00)</text></svg>');
  };

  // Trigger Send OTP
  const handleSendOtp = (jobId) => {
    const currentJob = stateManager.getJobById(jobId);
    stateManager.updateJob(jobId, { otpSent: true });
    setResendCooldown(60);

    // Send real-time webhook to n8n for production WhatsApp/SMS OTP dispatch
    triggerN8nWebhook('otp_requested', {
      orderId: currentJob.orderId || currentJob.id,
      customerName: currentJob.customerName,
      customerPhone: currentJob.customerPhone || '',
      otp: currentJob.otp
    });

    refetchJobs();
  };

  // Verify OTP
  const handleVerifyOtp = (jobId) => {
    const currentJob = stateManager.getJobById(jobId);
    if (String(enteredOtp).trim() === String(currentJob.otp).trim()) {
      stateManager.updateJob(jobId, { otpVerified: true });
      setOtpError('');
      setSmsNotification(null); // Clear notification once verified
    } else {
      setOtpError("Incorrect verification code. Please check details.");
    }
    refetchJobs();
  };

  // Verify direct link PIN
  const handleVerifyDirectPin = (e) => {
    e.preventDefault();
    const currentJob = stateManager.getJobById(directJobId);
    if (currentJob && String(enteredPin).trim() === String(currentJob.otp).trim()) {
      setPinVerified(true);
      setPinError('');
    } else {
      setPinError("Invalid verification PIN. Please verify with your subcontractor manager.");
    }
  };

  const getWhatsAppShareLink = () => {
    if (!job) return '';
    const jobLink = `${window.location.origin}${window.location.pathname}?job=${job.id}`;
    const text = `Hi, here are the assembly job details for Order #${job.id}:
👤 Client: ${job.customerName}
📍 Address: ${job.customerAddress}, Pincode: ${job.pincode}
🔧 Product: ${job.productName}
🔑 Verification PIN: ${job.otp} (required to open link)
👉 Complete checklist, upload photos, and collect client signature here: ${jobLink}`;
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  };

  const handleSendPreClosureFeedback = (jobId, type) => {
    const currentJob = stateManager.getJobById(jobId);
    if (!currentJob) return;
    
    let phone = currentJob.customerPhone || currentJob.customer_phone || currentJob.customer_number || '';
    phone = phone.replace(/[^\d]/g, '');
    if (phone.length === 10) {
      phone = '91' + phone;
    }
    
    const prodLink = currentJob.productRefLink || currentJob.product_review_link || '';
    const sellLink = currentJob.sellerReviewer || currentJob.seller_review_link || '';
    
    const link = type === 'product' ? prodLink : sellLink;
    
    const text = `Hi ${currentJob.customerName}, thank you for choosing TimberFlow for your furniture assembly! 😊

Could you please take a moment to share your feedback on the ${type === 'product' ? 'product' : 'seller/service'}?

Review Link: ${link || 'N/A'}

Your review helps us serve you better. Thank you!`;

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
    
    // Update state to allow signature
    stateManager.updateJob(jobId, { feedbackRequested: true });
    refetchJobs();
  };

  const handleSendFeedbackWhatsApp = () => {
    if (!job) return;
    let phone = job.customerPhone || job.customer_phone || job.customer_number || '';
    phone = phone.replace(/[^\d]/g, '');
    if (phone.length === 10) {
      phone = '91' + phone;
    }
    
    const prodLink = job.productRefLink || job.product_review_link || '';
    const sellLink = job.sellerReviewer || job.seller_review_link || '';
    
    const text = `Hi ${job.customerName}, thank you for choosing TimberFlow for your furniture assembly! 😊

Could you please take a moment to share your feedback?

📦 Product Review Link: ${prodLink || 'N/A'}
⭐ Seller/Service Review Link: ${sellLink || 'N/A'}

Your review helps us serve you better. Thank you!`;

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
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
    refetchJobs();
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
    refetchJobs();

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
        refetchJobs();
      }
    }, 1500);
  };

  // Filter jobs for this specific carpenter (RBAC Isolation) - multi-field resilient comparison
  const activeUser = stateManager.getActiveUser ? stateManager.getActiveUser() : null;
  const cleanCarpenterName = (carpenterName || '').trim().toLowerCase();
  
  let carpenterJobs = directJobId 
    ? jobs.filter(j => (j.id || j.orderId) === directJobId)
    : jobs.filter(j => {
        // 1. Compare PocketBase relation User ID
        const jobCarpId = j.assignedCarpenterId || j.assigned_carpenter_id || (j.assigned_carpenter && j.assigned_carpenter.length > 10 ? j.assigned_carpenter : '');
        if (activeUser && activeUser.id && jobCarpId && activeUser.id === jobCarpId) {
          return true;
        }

        // 2. Compare display names (case-insensitive)
        const orderCarp = (j.assignedCarpenter || j.assigned_carpenter_name || '').trim().toLowerCase();
        if (orderCarp && cleanCarpenterName && orderCarp === cleanCarpenterName) {
          return true;
        }

        // 3. Fallback: Compare active user's actual username or name against assigned name
        if (activeUser) {
          const uName = (activeUser.name || '').trim().toLowerCase();
          const uUsername = (activeUser.username || '').trim().toLowerCase();
          if (orderCarp && ((uName && orderCarp === uName) || (uUsername && orderCarp === uUsername))) {
            return true;
          }
        }

        // 4. Fallback: Compare phone numbers from local carpenters master list
        const localCarps = carpentersData?.items || [];
        const match = localCarps.find(c => c.name?.toLowerCase() === orderCarp);
        if (match && activeUser) {
          const carpPhone = (match.phone || '').replace(/[^0-9]/g, '').slice(-10);
          const loggedPhone = (activeUser.phone || '').replace(/[^0-9]/g, '').slice(-10);
          if (carpPhone && loggedPhone && carpPhone === loggedPhone) {
            return true;
          }
        }

        return false;
      });

  // Ensure all jobs have an explicit 'id' property mapped from orderId
  carpenterJobs = carpenterJobs.map(j => ({ ...j, id: j.id || j.orderId }));

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

  // Detail validation check for unlocking OTP send
  const isChecklistFinished = job ? job.checklist.every(item => item.checked) : false;
  const isBeforeUploaded = job ? !!job.photos.before : false;
  const isAfterUploaded = job ? !!job.photos.after : false;
  const isReadyToComplete = isChecklistFinished && isBeforeUploaded && isAfterUploaded;

  return (
    <div className="carpenter-app-simulator">
      <div className="carpenter-app-container">
        
        {directJobId && !pinVerified ? (
          <div className="pin-verification-screen" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%', boxSizing: 'border-box' }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ display: 'inline-flex', padding: '16px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '50%', color: 'var(--color-info)', marginBottom: '16px' }}>
                <Lock size={32} />
              </div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '1.2rem', color: 'var(--text-primary)' }}>Technician Verification</h3>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                Please enter the 4-digit assembly PIN for Order #{directJobId} to unlock this job checklist.
              </p>
            </div>

            <form onSubmit={handleVerifyDirectPin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <input
                  type="password"
                  pattern="[0-9]*"
                  inputMode="numeric"
                  maxLength={4}
                  required
                  placeholder="••••"
                  value={enteredPin}
                  onChange={(e) => { setEnteredPin(e.target.value.replace(/[^0-9]/g, '')); setPinError(''); }}
                  style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '12px', padding: '16px', fontSize: '1.8rem', textAlign: 'center', letterSpacing: '8px', outline: 'none', boxSizing: 'border-box' }}
                />
                {pinError && (
                  <div style={{ color: 'var(--color-danger)', fontSize: '0.72rem', marginTop: '6px', textAlign: 'center' }}>
                    {pinError}
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', padding: '14px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer' }}
              >
                Verify & Unlock Checklist
              </button>
            </form>
          </div>
        ) : (
          <>
            {/* Header Bar */}
            <header className="app-header">
          <div className="header-brand">
            <div className="welcome-avatar">{(carpenterName || 'C').charAt(0).toUpperCase()}</div>
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
              onClick={() => { setShowTutorial(true); setTutorialStep(0); }} 
              className="btn-icon" 
              title="Help / App Guide"
              style={{
                color: 'var(--color-info)',
                marginRight: '2px'
              }}
            >
              <HelpCircle size={16} />
            </button>
            <button 
              type="button" 
              onClick={toggleTheme} 
              className="btn-icon" 
              title={t('toggle_theme')}
              style={{ marginRight: '6px' }}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button 
              type="button" 
              onClick={onLogout} 
              className="btn-icon" 
              title="Logout"
              style={{ color: 'var(--danger)', marginRight: '6px' }}
            >
              <LogOut size={16} />
            </button>
            <select 
              value={appLang} 
              onChange={handleLanguageChange}
              style={{
                background: 'transparent',
                color: 'var(--text-light)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '4px',
                padding: '2px 4px',
                fontSize: '11px',
                marginLeft: '6px',
                cursor: 'pointer'
              }}
            >
              <option value="en" style={{color: '#000'}}>EN</option>
              <option value="hi" style={{color: '#000'}}>HI</option>
              <option value="ta" style={{color: '#000'}}>TA</option>
            </select>

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
        <main ref={mainContentRef} className="app-main-content">

          {/* DASHBOARD TAB OVERVIEW */}
          {activeTab === 'dashboard' && (
            <CarpenterDashboard 
              availability={availability}
              setAvailability={setAvailability}
              jobs={jobs}
              carpenterName={carpenterName}
              setActiveTab={setActiveTab}
              setSelectedJobId={setSelectedJobId}
            />
          )}

          {/* JOB LIST / DASHBOARD VIEW */}
          {activeTab === 'jobs' && !selectedJobId && (
            <CarpenterJobList
              carpenterName={carpenterName}
              activeJobs={activeJobs}
              walletSummary={walletSummary}
              setSelectedJobId={setSelectedJobId}
              refetchJobs={refetchJobs}
            />
          )}

          {/* WALLET VIEW */}
          {activeTab === 'wallet' && !selectedJobId && (
            <CarpenterWallet
              walletSummary={walletSummary}
              directJobId={directJobId}
              handleResetDemo={handleResetDemo}
              t={t}
            />
          )}

          {/* JOB DETAIL SCREEN */}
          {selectedJobId && job && (
            <CarpenterJobDetail
              job={job}
              directJobId={directJobId}
              setEnteredOtp={setEnteredOtp}
              setOtpError={setOtpError}
              getMaskedValue={getMaskedValue}
              t={t}
              isCompletedMoreThan24Hours={isCompletedMoreThan24Hours}
              setShowRejectForm={setShowRejectForm}
              handleStartTransit={handleStartTransit}
              getWhatsAppShareLink={getWhatsAppShareLink}
              carpenterName={carpenterName}
              stateManager={stateManager}
              refetchJobs={refetchJobs}
              handleChecklistToggle={handleChecklistToggle}
              uploadingPhoto={uploadingPhoto}
              handleClearPhoto={handleClearPhoto}
              handlePhotoChange={handlePhotoChange}
              handleMockPhoto={handleMockPhoto}
              showDamageForm={showDamageForm}
              setShowDamageForm={setShowDamageForm}
              damagePartName={damagePartName}
              setDamagePartName={setDamagePartName}
              damageNotes={damageNotes}
              setDamageNotes={setDamageNotes}
              damagePhotos={damagePhotos}
              compressingDamage={compressingDamage}
              setCompressingDamage={setCompressingDamage}
              setDamagePhotos={setDamagePhotos}
              selectedJobId={selectedJobId}
              handleMockDamagePhoto={handleMockDamagePhoto}
              handleDamageSubmit={handleDamageSubmit}
              showExtraChargeForm={showExtraChargeForm}
              setShowExtraChargeForm={setShowExtraChargeForm}
              chargeType={chargeType}
              setChargeType={setChargeType}
              chargeAmount={chargeAmount}
              setChargeAmount={setChargeAmount}
              chargeNotes={chargeNotes}
              setChargeNotes={setChargeNotes}
              chargeReceipt={chargeReceipt}
              setChargeReceipt={setChargeReceipt}
              handleMockReceiptPhoto={handleMockReceiptPhoto}
              handleExtraChargeSubmit={handleExtraChargeSubmit}
              isReadyToComplete={isReadyToComplete}
              handleSendOtp={handleSendOtp}
              enteredOtp={enteredOtp}
              handleVerifyOtp={handleVerifyOtp}
              otpError={otpError}
              resendCooldown={resendCooldown}
              handleSendPreClosureFeedback={handleSendPreClosureFeedback}
              handleSignatureSave={handleSignatureSave}
              handleSendFeedbackWhatsApp={handleSendFeedbackWhatsApp}
              newCommentText={newCommentText}
              setNewCommentText={setNewCommentText}
              handleSendComment={handleSendComment}
              commentsEndRef={commentsEndRef}
            />
          )}
          {/* Reject / Skip Order Modal */}
          {showRejectForm && (
            <div className="modal-overlay" onClick={() => setShowRejectForm(false)}>
              <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                  <h3 style={{ color: 'var(--danger-color)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertTriangle size={20} /> Reject Order
                  </h3>
                  <button className="btn-close" onClick={() => setShowRejectForm(false)}>✕</button>
                </div>
                <form className="damage-form" onSubmit={handleRejectSubmit}>
                  <div className="form-group">
                    <label>Reason for Rejection *</label>
                    <select value={rejectReason} onChange={e => setRejectReason(e.target.value)} required>
                      <option value="">-- Select Reason --</option>
                      <option value="Out of service area">Out of service area</option>
                      <option value="Schedule conflict / No time">Schedule conflict / No time</option>
                      <option value="Vehicle breakdown">Vehicle breakdown</option>
                      <option value="Customer requested reschedule">Customer requested reschedule</option>
                      <option value="Incomplete tools / materials">Incomplete tools / materials</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  
                  {rejectReason === 'Other' && (
                    <div className="form-group">
                      <label>Specify Reason *</label>
                      <textarea 
                        value={customRejectReason} 
                        onChange={e => setCustomRejectReason(e.target.value)} 
                        placeholder="Please specify the reason..."
                        rows={3}
                        required
                      />
                    </div>
                  )}

                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                    Rejecting this order will unassign it from you and notify the dispatcher immediately. This action cannot be undone.
                  </p>

                  <div className="modal-actions">
                    <button type="button" className="btn btn-secondary" onClick={() => setShowRejectForm(false)}>Cancel</button>
                    <button type="submit" className="btn btn-primary" style={{ backgroundColor: 'var(--danger-color)', borderColor: 'var(--danger-color)' }}>Confirm Reject</button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </main>

        {/* BOTTOM TAB NAV BAR */}
        {!directJobId && !isKeyboardVisible && (
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
        )}

        <TutorialOverlay 
          showTutorial={showTutorial}
          setShowTutorial={setShowTutorial}
          tutorialStep={tutorialStep}
          setTutorialStep={setTutorialStep}
          appLang={appLang}
        />

      </>
    )}
  </div>
</div>
);
}
