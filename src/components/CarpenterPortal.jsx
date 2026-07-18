import { useState, useEffect, useRef } from 'react';
import { 
  CheckSquare, 
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
  MapPin, 
  MessageCircle, 
  ChevronRight, 
  Moon, 
  Sun,
  LayoutDashboard,
  Briefcase,
  TrendingUp,
  Lock,
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import { stateManager, triggerN8nWebhook } from '../utils/stateManager';
import { getTranslation } from '../utils/translations';

import SignatureCanvas from './SignatureCanvas';
import './CarpenterPortal.css';

// Capture GPS position (returns coords or null within timeout)
function getGpsStamp() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    const timeout = setTimeout(() => resolve(null), 5000);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timeout);
        resolve({
          lat: pos.coords.latitude.toFixed(5),
          lng: pos.coords.longitude.toFixed(5),
          accuracy: Math.round(pos.coords.accuracy)
        });
      },
      () => { clearTimeout(timeout); resolve(null); },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
  });
}

// Resize + stamp photo with timestamp, GPS, and order ID watermark
async function captureAndStampPhoto(file, orderId, { maxWidth = 800, maxHeight = 600 } = {}) {
  const gps = await getGpsStamp();

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let w = img.width;
        let h = img.height;
        if (w > h) { if (w > maxWidth) { h *= maxWidth / w; w = maxWidth; } }
        else { if (h > maxHeight) { w *= maxHeight / h; h = maxHeight; } }

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Canvas 2d context unavailable')); return; }

        // Draw the base image
        ctx.drawImage(img, 0, 0, w, h);

        // ── Watermark bar ──────────────────────────────────────────────────
        const barH = Math.max(32, Math.round(h * 0.07));
        ctx.fillStyle = 'rgba(0, 0, 0, 0.62)';
        ctx.fillRect(0, h - barH, w, barH);

        const fontSize = Math.max(10, Math.round(barH * 0.38));
        ctx.font = `bold ${fontSize}px monospace`;
        ctx.fillStyle = '#ffffff';
        ctx.textBaseline = 'middle';
        const midY = h - barH / 2;

        // Timestamp (left)
        const now = new Date();
        const tsLabel = now.toLocaleString('en-IN', {
          day: '2-digit', month: 'short', year: 'numeric',
          hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
        });
        ctx.fillText(`⏱ ${tsLabel}`, 8, midY);

        // GPS (center) or "GPS unavailable"
        const gpsLabel = gps
          ? `📍 ${gps.lat}°N  ${gps.lng}°E  ±${gps.accuracy}m`
          : '📍 GPS unavailable';
        const gpsX = Math.round(w * 0.35);
        ctx.fillText(gpsLabel, gpsX, midY);

        // Order ID (right-aligned)
        if (orderId) {
          const idLabel = `#${orderId}`;
          const measured = ctx.measureText(idLabel).width;
          ctx.fillText(idLabel, w - measured - 8, midY);
        }
        // ── End watermark ──────────────────────────────────────────────────

        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

const TUTORIAL_TRANSLATIONS = {
  en: {
    title: "How to Use CarpentryPro",
    skip: "Skip",
    next: "Next",
    start: "Start Tutorial",
    finish: "Got It!",
    steps: [
      {
        title: "1. Accept & Navigate",
        desc: "Tap \"I'm On My Way\" when starting your journey. Use the Google Maps button to find the customer's address.",
        icon: "📍"
      },
      {
        title: "2. Build & Check",
        desc: "Tap \"View Assembly PDF Guide\" to see instruction manuals. Complete all items in the Assembly Checklist.",
        icon: "📋"
      },
      {
        title: "3. Take Photos",
        desc: "Upload photos of unopened boxes (\"Before\") and finished furniture (\"After\"). Photos are auto-stamped with GPS location and time.",
        icon: "📸"
      },
      {
        title: "4. Get OTP & Sign",
        desc: "Collect cash/UPI payment if needed, send the verification OTP to the customer's phone, enter it, and ask the customer to sign on the screen to finish.",
        icon: "✍️"
      }
    ]
  },
  hi: {
    title: "कारपेंट्रीप्रो का उपयोग कैसे करें",
    skip: "छोड़ें",
    next: "आगे बढ़ें",
    start: "ट्यूटोरियल शुरू करें",
    finish: "समझ गया!",
    steps: [
      {
        title: "1. स्वीकार करें और नेविगेट करें",
        desc: "यात्रा शुरू करते समय \"मैं रास्ते में हूँ\" पर टैप करें। ग्राहक का पता खोजने के लिए गूगल मैप्स बटन का उपयोग करें।",
        icon: "📍"
      },
      {
        title: "2. असेम्बल करें और जांचें",
        desc: "निर्देश पुस्तिका देखने के लिए \"असेम्बली पीडीएफ गाइड देखें\" पर टैप करें। असेम्बली चेकलिस्ट में सभी चीजें पूरी करें।",
        icon: "📋"
      },
      {
        title: "3. तस्वीरें लें",
        desc: "बिना खुले बक्से (\"पहले\") और तैयार फर्नीचर (\"बाद में\") की तस्वीरें अपलोड करें। तस्वीरों पर जीपीएस और समय स्वतः अंकित हो जाएगा।",
        icon: "📸"
      },
      {
        title: "4. ओटीपी और हस्ताक्षर लें",
        desc: "यदि आवश्यक हो तो नकद/UPI भुगतान लें, ग्राहक के फोन पर सत्यापन ओटीपी भेजें, इसे दर्ज करें, और पूरा करने के लिए ग्राहक से स्क्रीन पर हस्ताक्षर करने को कहें।",
        icon: "✍️"
      }
    ]
  },
  ta: {
    title: "கார்பென்ட்ரிப்ரோவை எவ்வாறு பயன்படுத்துவது",
    skip: "தவிர்",
    next: "அடுத்து",
    start: "பயிற்சி தொடங்கவும்",
    finish: "புரிந்தது!",
    steps: [
      {
        title: "1. ஏற்றுக்கொண்டு வழிசெலுத்துக",
        desc: "பயணத்தைத் தொடங்கும்போது \"நான் கிளம்பிவிட்டேன்\" என்பதைத் தட்டவும். வாடிக்கையாளர் முகவரியைக் கண்டறிய கூகுள் மேப்ஸ் பொத்தானைப் பயன்படுத்தவும்.",
        icon: "📍"
      },
      {
        title: "2. உருவாக்கி சரிபார்க்கவும்",
        desc: "அறிவுறுத்தல் கையேடுகளைப் பார்க்க \"அசெம்பிளி பிடிஎஃப் வழிகாட்டியைப் பார்\" என்பதைத் தட்டவும். அசெம்பிளி சரிபார்ப்புப் பட்டியலில் உள்ள அனைத்துப் பணிகளையும் முடிக்கவும்.",
        icon: "📋"
      },
      {
        title: "3. புகைப்படங்கள் எடுக்கவும்",
        desc: "திறக்கப்படாத பெட்டிகள் (\"முன்பு\") மற்றும் முடிக்கப்பட்ட தளவாடங்கள் (\"பின்பு\") புகைப்படங்களைப் பதிவேற்றவும். புகைப்படங்களில் ஜிபிஎஸ் மற்றும் நேரம் தானாகவே பதியப்படும்.",
        icon: "📸"
      },
      {
        title: "4. ஓடிபி மற்றும் கையெழுத்து பெறவும்",
        desc: "தேவைப்பட்டால் பணம்/UPI கட்டணத்தைச் சேகரித்து, வாடிக்கையாளரின் தொலைபேசிக்கு சரிபார்ப்பு ஓடிபியை அனுப்பி, அதை உள்ளிட்டு, முடிக்க வாடிக்கையாரைத் திரையில் கையெழுத்திடச் சொல்லவும்.",
        icon: "✍️"
      }
    ]
  }
};

export default function CarpenterPortal({ carpenterName = 'John Carpenter', directJobId = null, isSimulator = false }) {
  const [appLang, setAppLang] = useState(() => localStorage.getItem('fsa_carpenter_lang') || 'en');
  const t = (key) => getTranslation(appLang, key);

  const handleLanguageChange = (e) => {
    const lang = e.target.value;
    setAppLang(lang);
    localStorage.setItem('fsa_carpenter_lang', lang);
  };

  const [jobs, setJobs] = useState([]);
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
  const [damagePhoto, setDamagePhoto] = useState('');
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
    
    setJobs(stateManager.getJobs());
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
      const loadedJobs = stateManager.getJobs();
      setJobs(loadedJobs);
    };

    handleUpdate();
    
    if (directJobId) {
      setSelectedJobId(directJobId);
      setActiveTab('jobs');
      
      // If we are on a direct link, ensure we fetch the job in case it's not in localStorage
      if (stateManager.fetchJobFromServer) {
        stateManager.fetchJobFromServer(directJobId).then(fetchedJob => {
          if (fetchedJob) {
            setJobs(stateManager.getJobs());
          }
        });
      }
    }

    window.addEventListener('fsa_storage_update', handleUpdate);
    return () => {
      window.removeEventListener('fsa_storage_update', handleUpdate);
    };
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
    stateManager.toggleChecklistItem(jobId, itemId);
    // Refresh jobs
    setJobs(stateManager.getJobs());
  };

  // Photo uploads (Before/After) — stamps GPS + timestamp watermark
  const handlePhotoChange = async (jobId, type, e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(prev => ({ ...prev, [type]: true }));
    try {
      const stampedDataUrl = await captureAndStampPhoto(file, jobId);
      const currentJob = stateManager.getJobById(jobId);
      const updatedPhotos = { ...currentJob.photos, [type]: stampedDataUrl };
      stateManager.updateJob(jobId, { photos: updatedPhotos });
      setJobs(stateManager.getJobs());
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

    setJobs(stateManager.getJobs());
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

    stateManager.rejectJob(selectedJobId, carpenterName, finalReason);
    
    setJobs(stateManager.getJobs());
    setShowRejectForm(false);
    setRejectReason('');
    setCustomRejectReason('');
    setSelectedJobId(null);
    setActiveTab('jobs');
  };

  // Handle Mock Damage Photo
  const handleMockDamagePhoto = () => {
    setDamagePhoto('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200"><rect width="100%" height="100%" fill="%237f1d1d"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23f87171" font-size="13">Damaged Shelf Rail Joint (Mock)</text></svg>');
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

    setJobs(stateManager.getJobs());
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
    setJobs(stateManager.getJobs());
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
    setJobs(stateManager.getJobs());
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
    setJobs(stateManager.getJobs());
    setSelectedJobId(null);
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
        const localCarps = stateManager.getCarpenters ? stateManager.getCarpenters() : [];
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
    <div className={`carpenter-app-simulator ${isSimulator ? 'is-simulator' : 'is-website'}`}>
      <div className={`carpenter-app-container ${isSimulator ? 'is-simulator' : 'is-website'}`}>
        
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
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
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
                  <h2>Hello, {carpenterName || 'Technician'}!</h2>
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
                    
                    {/* Diagnostic Info Panel to help debug logins */}
                    <div style={{
                      marginTop: '20px',
                      padding: '12px',
                      backgroundColor: 'rgba(239, 68, 68, 0.05)',
                      border: '1px dashed rgba(239, 68, 68, 0.2)',
                      borderRadius: '8px',
                      fontSize: '11px',
                      color: 'var(--text-muted)',
                      textAlign: 'left',
                      width: '100%',
                      boxSizing: 'border-box'
                    }}>
                      <span style={{ fontWeight: 'bold', display: 'block', marginBottom: '6px', color: 'var(--color-danger)' }}>
                        Session Diagnostics:
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div><strong>Database Sync:</strong> {window.fsa_db_sync_error ? <span style={{ color: 'var(--color-danger)' }}>"❌ {window.fsa_db_sync_error}"</span> : <span style={{ color: 'var(--color-success)' }}>"✅ Connected"</span>}</div>
                        <div><strong>Logged-in User Name:</strong> "{activeUser?.name || 'empty'}"</div>
                        <div><strong>Logged-in Username:</strong> "{activeUser?.username || 'empty'}"</div>
                        <div><strong>Logged-in Phone:</strong> "{activeUser?.phone || 'empty'}"</div>
                        <div><strong>Logged-in User ID:</strong> "{activeUser?.id || 'empty'}"</div>
                        <div><strong>Total System Orders:</strong> {jobs.length}</div>
                        <div><strong>Orders with Assigned Carpenter:</strong> {jobs.filter(j => j.assignedCarpenter || j.assigned_carpenter_name).length}</div>
                        <div style={{ wordBreak: 'break-all', marginTop: '4px', fontSize: '9px', opacity: 0.8 }}>
                          <strong>Assigned Names in DB:</strong> {Array.from(new Set(jobs.map(j => j.assignedCarpenter || j.assigned_carpenter_name || 'Unassigned'))).join(', ')}
                        </div>
                      </div>
                    </div>
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
              {/* App Settings / Reset Block */}
              {!directJobId && (
                <div style={{ marginTop: '24px', padding: '16px', background: 'var(--bg-input)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: '0.9rem', color: 'var(--text-primary)' }}>App Settings</h3>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button 
                      type="button" 
                      onClick={handleResetDemo} 
                      className="btn-reset-demo"
                      style={{ flex: 1, padding: '10px' }}
                    >
                      Reset App Data
                    </button>
                    <button 
                      type="button" 
                      onClick={() => {
                        localStorage.removeItem('fsa_logged_in_user');
                        window.location.reload();
                      }} 
                      className="btn-reset-demo"
                      style={{ 
                        flex: 1,
                        padding: '10px',
                        background: 'rgba(239, 68, 68, 0.12)', 
                        border: '1px solid rgba(239, 68, 68, 0.25)', 
                        color: 'var(--color-danger)' 
                      }}
                    >
                      {t('logout')}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* JOB DETAIL SCREEN */}
          {selectedJobId && job && (
            <>
              {/* Header with Back button */}
              <div className="job-detail-header">
                {!directJobId && (
                  <button 
                    type="button" 
                    onClick={() => {
                      window.history.back();
                      setEnteredOtp('');
                      setOtpError('');
                    }} 
                    className="btn-back-link"
                  >
                    <ArrowLeft size={20} />
                  </button>
                )}
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

              {/* Action: Reject / Skip Order */}
              {(!isCompletedMoreThan24Hours(job) && job.status !== 'Completed') && (
                <div className="detail-card" style={{ padding: '12px' }}>
                  <button 
                    className="btn btn-secondary" 
                    style={{ width: '100%', borderColor: 'var(--danger-color)', color: 'var(--danger-color)' }}
                    onClick={() => setShowRejectForm(true)}
                  >
                    <AlertTriangle size={16} style={{ marginRight: '8px' }} />
                    Reject / Skip Order
                  </button>
                </div>
              )}

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
                      <a 
                        href={`tel:${(job.customerPhone || '+1-555-0199').replace(/[^0-9+]/g, '')}`}
                        className="btn btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', backgroundColor: 'rgba(59, 130, 246, 0.1)', border: '1px solid var(--color-primary)', borderRadius: '6px', color: 'var(--text-light)', textDecoration: 'none' }}
                      >
                        <Smartphone size={12} />
                        {t('call_masked')}
                      </a>
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
                    className="btn btn-primary btn-massive"
                    style={{ width: '100%', padding: '16px', borderRadius: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', fontSize: '1.1rem' }}
                    onClick={() => handleStartTransit(job.id)}
                  >
                    <Navigation size={20} />
                    {t('im_on_my_way')}
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

              {/* Subcontractor Forwarding Widget (Anonymous) */}
              {job.status !== 'Completed' && (
                <div className="detail-card subcontractor-forward-card" style={{ marginBottom: '16px', padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px dashed var(--border-color)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <Send size={15} style={{ color: 'var(--color-info, #3b82f6)' }} />
                    <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>Forward to Field Tech</h4>
                  </div>
                  <p style={{ margin: '0 0 12px 0', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Forward this job to your field technician. We do not require or collect their contact details.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <input
                        type="text"
                        readOnly
                        value={`${window.location.origin}${window.location.pathname}?job=${job.id}`}
                        style={{ flex: 1, background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-muted)', borderRadius: '6px', padding: '8px', fontSize: '0.75rem', outline: 'none' }}
                        onClick={(e) => e.target.select()}
                      />
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: '8px 12px', borderRadius: '6px', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 'bold' }}
                        onClick={() => {
                          navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}?job=${job.id}`);
                          alert("Delegation Link copied to clipboard!");
                        }}
                      >
                        Copy
                      </button>
                    </div>

                    <a
                      href={getWhatsAppShareLink()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-primary"
                      style={{ padding: '10px', borderRadius: '8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', textDecoration: 'none', textAlign: 'center', color: '#ffffff', cursor: 'pointer', fontWeight: 'bold' }}
                      onClick={() => {
                        // Log delegation audit trail anonymously
                        const timestamp = new Date().toISOString();
                        stateManager.updateJob(job.id, {
                          auditLogs: [
                            ...(job.auditLogs || []),
                            {
                              timestamp,
                              action: 'Forwarded to Field Tech',
                              user: carpenterName,
                              comments: 'Generated anonymous delegation link and shared.'
                            }
                          ]
                        });
                        // Add comment
                        stateManager.addComment(
                          job.id, 
                          `System: Job details link shared with field technician. Verification PIN: ${job.otp}`,
                          'System'
                        );
                        setJobs(stateManager.getJobs());
                      }}
                    >
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" style={{ marginRight: '2px' }}>
                        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.5-5.739-1.453L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.725 1.451 5.405.002 9.803-4.379 9.805-9.767.001-2.61-1.01-5.064-2.848-6.906C16.489 2.09 14.041.822 11.45.822c-5.41 0-9.811 4.377-9.813 9.768 0 1.77.465 3.49 1.346 5.022L1.918 20.8l5.372-1.406c.92.518 1.83.76 2.76.76h.003-.006zm13.136-6.852c-.3-.15-1.77-.874-2.04-.972-.272-.099-.47-.149-.669.149-.198.299-.768.972-.941 1.171-.173.199-.347.225-.647.075-.3-.15-1.27-.468-2.42-1.493-.893-.797-1.496-1.782-1.671-2.081-.174-.3-.018-.462.13-.61.135-.133.3-.347.45-.52.15-.173.199-.298.3-.497.098-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.77-.724 2.02-1.388.248-.664.248-1.233.173-1.353-.074-.12-.272-.198-.57-.347z"/>
                      </svg>
                      Forward Job via WhatsApp
                    </a>
                  </div>
                </div>
              )}

              {/* Step-by-Step Interactive Assembly Checklist */}
              {job.status === 'In Progress' && (
                <>
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
                    {uploadingPhoto.before ? (
                      <div className="upload-loading-spinner" style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100%',
                        gap: '8px'
                      }}>
                        <div className="spinner" style={{
                          width: '24px',
                          height: '24px',
                          border: '3px solid rgba(255,255,255,0.1)',
                          borderTopColor: 'var(--color-secondary, #3b82f6)',
                          borderRadius: '50%',
                          animation: 'spin 1s linear infinite'
                        }}></div>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)', textAlign: 'center' }}>Stamping GPS...</span>
                      </div>
                    ) : job.photos.before ? (
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
                          Take Photo
                          <input 
                            type="file" 
                            accept="image/*" 
                            capture="environment"
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
                    {uploadingPhoto.after ? (
                      <div className="upload-loading-spinner" style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100%',
                        gap: '8px'
                      }}>
                        <div className="spinner" style={{
                          width: '24px',
                          height: '24px',
                          border: '3px solid rgba(255,255,255,0.1)',
                          borderTopColor: 'var(--color-secondary, #3b82f6)',
                          borderRadius: '50%',
                          animation: 'spin 1s linear infinite'
                        }}></div>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)', textAlign: 'center' }}>Stamping GPS...</span>
                      </div>
                    ) : job.photos.after ? (
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
                          Take Photo
                          <input 
                            type="file" 
                            accept="image/*" 
                            capture="environment"
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
                        <label className="photo-btn-label" style={{ flex: 1, textAlign: 'center', padding: '10px', opacity: compressingDamage ? 0.6 : 1, pointerEvents: compressingDamage ? 'none' : 'auto' }}>
                          {compressingDamage ? 'Processing...' : 'Take Photo'}
                          <input 
                            type="file" 
                            accept="image/*" 
                            capture="environment"
                            style={{ display: 'none' }}
                            disabled={compressingDamage}
                            onChange={async (e) => {
                              const f = e.target.files?.[0];
                              if (f) {
                                setCompressingDamage(true);
                                try {
                                  const compressed = await captureAndStampPhoto(f, selectedJobId, { maxWidth: 800, maxHeight: 600 });
                                  setDamagePhoto(compressed);
                                } catch (err) {
                                  console.error("Failed to compress damage photo:", err);
                                } finally {
                                  setCompressingDamage(false);
                                }
                              }
                            }}
                          />
                        </label>
                        <button 
                          type="button" 
                          disabled={compressingDamage}
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
                          <button type="button" className="btn-clear-photo" disabled={compressingDamage} onClick={() => setDamagePhoto('')}>✕</button>
                        </div>
                      )}
                    </div>

                    <button type="submit" className="btn btn-danger" disabled={compressingDamage}>
                      {compressingDamage ? (
                        <span>Processing Photo...</span>
                      ) : (
                        <>
                          <AlertTriangle size={15} />
                          <span>Submit Claim & Put On Hold</span>
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>

              {/* Extra Charges / Reimbursement Request Card */}
              <div className="detail-card">
                <div 
                  className="checklist-progress-container" 
                  style={{ cursor: 'pointer', marginBottom: 0 }}
                  onClick={() => setShowExtraChargeForm(!showExtraChargeForm)}
                >
                  <h4 className="detail-card-title" style={{ margin: 0, color: 'var(--color-info, #3b82f6)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <IndianRupee size={15} />
                    <span>Claim Extra Charges (Hardware / Travel)</span>
                  </h4>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {showExtraChargeForm ? 'Collapse' : 'Expand Form'}
                  </span>
                </div>

                {/* Submitted Extra Charges List */}
                {job.extraCharges && job.extraCharges.length > 0 && (
                  <div style={{ marginTop: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
                    <h5 style={{ margin: '0 0 8px 0', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Submitted Claims</h5>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {job.extraCharges.map((ec) => {
                        const isApproved = ec.status === 'Approved';
                        const isRejected = ec.status === 'Rejected';
                        const statusColor = isApproved ? 'var(--color-success, #22c55e)' : (isRejected ? 'var(--color-danger, #ef4444)' : 'var(--color-warning, #f59e0b)');
                        return (
                          <div key={ec.id} style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', padding: '8px 10px', borderRadius: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                              <span style={{ fontSize: '0.78rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{ec.type}</span>
                              <span style={{ fontSize: '0.78rem', fontWeight: 'bold', color: statusColor }}>₹{ec.amount}</span>
                            </div>
                            <p style={{ margin: '0 0 6px 0', fontSize: '0.72rem', color: 'var(--text-muted)' }}>{ec.notes}</p>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.65rem' }}>
                              <span style={{ color: 'var(--text-muted)' }}>{new Date(ec.timestamp).toLocaleDateString('en-IN')}</span>
                              <span style={{ padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(255,255,255,0.04)', color: statusColor, fontWeight: 'bold', textTransform: 'uppercase' }}>
                                {ec.status}
                              </span>
                            </div>
                            {ec.receipt && (
                              <div style={{ marginTop: '6px' }}>
                                <a href={ec.receipt} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-info, #3b82f6)', textDecoration: 'underline', fontSize: '0.68rem' }}>View Bill Receipt</a>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {showExtraChargeForm && (
                  <form onSubmit={handleExtraChargeSubmit} className="damage-form" style={{ marginTop: '12px' }}>
                    <div className="form-group">
                      <label>Charge Category</label>
                      <select 
                        value={chargeType}
                        onChange={(e) => setChargeType(e.target.value)}
                        className="form-input"
                        style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '6px', padding: '8px', boxSizing: 'border-box' }}
                      >
                        <option value="Hardware Purchased">Hardware Purchased (Screws, Brackets, Glue)</option>
                        <option value="Extra Travel Distance">Extra Travel / Out of Bounds Distance</option>
                        <option value="Special Tooling">Special Tooling / Machine Rental</option>
                        <option value="Other Reimbursement">Other Extra Expense</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Claim Amount (₹)</label>
                      <input 
                        type="number" 
                        required
                        min="1"
                        placeholder="e.g. 350"
                        value={chargeAmount}
                        onChange={(e) => setChargeAmount(e.target.value)}
                        className="form-input"
                        style={{ width: '100%', boxSizing: 'border-box' }}
                      />
                    </div>

                    <div className="form-group">
                      <label>Justification / Description</label>
                      <textarea 
                        rows="2"
                        required
                        placeholder="Describe why this expense was necessary..."
                        value={chargeNotes}
                        onChange={(e) => setChargeNotes(e.target.value)}
                        className="form-input"
                        style={{ fontFamily: 'inherit', resize: 'vertical', width: '100%', boxSizing: 'border-box' }}
                      />
                    </div>

                    <div className="form-group">
                      <label>Upload Receipt Photo (Optional)</label>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <label className="photo-btn-label" style={{ flex: 1, textAlign: 'center', padding: '10px', cursor: 'pointer' }}>
                          Take Receipt Photo
                          <input 
                            type="file" 
                            accept="image/*" 
                            capture="environment"
                            style={{ display: 'none' }}
                            onChange={async (e) => {
                              const f = e.target.files?.[0];
                              if (f) {
                                try {
                                  const compressed = await captureAndStampPhoto(f, selectedJobId, { maxWidth: 800, maxHeight: 600 });
                                  setChargeReceipt(compressed);
                                } catch (err) {
                                  console.error("Failed to compress receipt photo:", err);
                                }
                              }
                            }}
                          />
                        </label>
                        <button 
                          type="button" 
                          onClick={handleMockReceiptPhoto} 
                          className="btn btn-secondary"
                          style={{ flex: 1 }}
                        >
                          Use Mock Receipt
                        </button>
                      </div>
                      {chargeReceipt && (
                        <div style={{ marginTop: '8px', position: 'relative' }}>
                          <img src={chargeReceipt} alt="Receipt Preview" style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: '4px' }} />
                          <button type="button" className="btn-clear-photo" onClick={() => setChargeReceipt('')}>✕</button>
                        </div>
                      )}
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                      <IndianRupee size={15} />
                      <span>Submit Reimbursement Claim</span>
                    </button>
                  </form>
                )}
              </div>
                </>
              )}

              {/* Complete Job Sign-off Section */}
              {job.status === 'In Progress' && (
                <div className="completion-flow-card">
                  <h4 className="completion-step-title">
                    <Smartphone size={15} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'text-bottom' }} />
                    {t('job_closure')}
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
                              className="btn btn-primary btn-massive"
                              onClick={() => handleVerifyOtp(job.id)}
                            >
                              {t('confirm_customer_code')}
                            </button>
                          </div>
                          {otpError && <span className="otp-error-msg">{otpError}</span>}
                          <button
                            type="button"
                            className="btn btn-secondary"
                            disabled={resendCooldown > 0}
                            onClick={() => handleSendOtp(job.id)}
                          >
                            {resendCooldown > 0 ? `Resend OTP in ${resendCooldown}s` : 'Resend OTP'}
                          </button>
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                            (Hint: check the customer tracking portal or admin dashboard for the OTP code)
                          </span>
                        </div>
                      ) : (
                        <div className="otp-success-alert">
                          <CheckCircle size={16} />
                          <span>OTP Verified. Please collect Customer Signature:</span>
                        </div>
                      )}

                      {/* Feedback Request Step - Optional but Recommended */}
                      {job.otpVerified && !job.feedbackRequested && (
                        <div style={{ marginTop: '16px', padding: '16px', backgroundColor: 'var(--bg-input)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                          <p style={{ fontSize: '0.75rem', marginBottom: '12px', fontWeight: 'bold' }}>Step 2: Request Review before Signature</p>
                          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '12px' }}>Please send either a product or seller review request via WhatsApp.</p>
                          <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
                            <button 
                              type="button" 
                              className="btn btn-primary" 
                              style={{ width: '100%', backgroundColor: '#25D366', borderColor: '#128C7E', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                              onClick={() => handleSendPreClosureFeedback(job.id, 'product')}
                            >
                              <MessageCircle size={15} /> Send Product Review Link
                            </button>
                            <button 
                              type="button" 
                              className="btn btn-secondary" 
                              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                              onClick={() => handleSendPreClosureFeedback(job.id, 'seller')}
                            >
                              <MessageCircle size={15} /> Send Seller Review Link
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Signature canvas display */}
                      {job.otpVerified && !job.signature && (
                        <div style={{ marginTop: '16px' }}>
                          <p style={{ fontSize: '0.75rem', marginBottom: '8px', fontWeight: 'bold' }}>Customer Signature</p>
                          <SignatureCanvas 
                          onSave={handleSignatureSave} 
                          onCancel={() => {
                            // Can reset OTP verified to let them retry or keep it
                          }}
                        />
                        </div>
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

                  <button 
                    type="button" 
                    onClick={handleSendFeedbackWhatsApp}
                    className="btn-action-primary"
                    style={{
                      width: '100%',
                      marginTop: '16px',
                      backgroundColor: '#25D366',
                      borderColor: '#128C7E',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    <Send size={14} />
                    <span>Send Feedback Links via WhatsApp</span>
                  </button>
                </div>
              )}

              {/* Chat Thread / Comments Panel */}
              <div className="comments-panel-card">
                <h4 className="detail-card-title">
                  <MessageCircle size={15} />
                  <span>{t('message_dispatcher')}</span>
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

        {showTutorial && (
          <div className="tutorial-modal-overlay">
            <div className="tutorial-modal-card">
              <div className="tutorial-icon-circle">
                {(TUTORIAL_TRANSLATIONS[appLang] || TUTORIAL_TRANSLATIONS.en).steps[tutorialStep].icon}
              </div>
              <h3 className="tutorial-step-title">
                {(TUTORIAL_TRANSLATIONS[appLang] || TUTORIAL_TRANSLATIONS.en).steps[tutorialStep].title}
              </h3>
              <p className="tutorial-step-desc">
                {(TUTORIAL_TRANSLATIONS[appLang] || TUTORIAL_TRANSLATIONS.en).steps[tutorialStep].desc}
              </p>
              
              <div className="tutorial-dots">
                {(TUTORIAL_TRANSLATIONS[appLang] || TUTORIAL_TRANSLATIONS.en).steps.map((_, idx) => (
                  <div 
                    key={idx} 
                    className={`tutorial-dot ${idx === tutorialStep ? 'active' : ''}`}
                  />
                ))}
              </div>
              
              <div className="tutorial-actions">
                {tutorialStep < 3 ? (
                  <>
                    <button 
                      type="button" 
                      className="tutorial-btn-skip"
                      onClick={() => {
                        setShowTutorial(false);
                        localStorage.setItem('fsa_carpenter_tutorial_completed', 'true');
                      }}
                    >
                      {(TUTORIAL_TRANSLATIONS[appLang] || TUTORIAL_TRANSLATIONS.en).skip}
                    </button>
                    <button 
                      type="button" 
                      className="tutorial-btn-next"
                      onClick={() => setTutorialStep(prev => prev + 1)}
                    >
                      {(TUTORIAL_TRANSLATIONS[appLang] || TUTORIAL_TRANSLATIONS.en).next}
                    </button>
                  </>
                ) : (
                  <button 
                    type="button" 
                    className="tutorial-btn-next"
                    style={{ width: '100%' }}
                    onClick={() => {
                      setShowTutorial(false);
                      localStorage.setItem('fsa_carpenter_tutorial_completed', 'true');
                    }}
                  >
                    {(TUTORIAL_TRANSLATIONS[appLang] || TUTORIAL_TRANSLATIONS.en).finish}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

      </>
    )}
  </div>
</div>
);
}
