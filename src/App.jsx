// src/App.jsx
import { useState, useEffect } from 'react';
import AdminPortal from './components/AdminPortal';
import CarpenterPortal from './components/CarpenterPortal';
import CustomerPortal from './components/CustomerPortal';
import { setActiveUser, setUserRole, getCarpenters, authenticateUser } from './utils/stateManager';

import { LogOut, ClipboardList, Shield, Eye, EyeOff, Wifi, WifiOff, Lock, Smartphone, Monitor } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState(null);
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [carpenters, setCarpenters] = useState([]);
  const [showMobileFrame, setShowMobileFrame] = useState(true);

  const [trackOrderId] = useState(() => new URLSearchParams(window.location.search).get('track'));
  const [directJobId] = useState(() => new URLSearchParams(window.location.search).get('job'));

  // Load session from localStorage on mount
  useEffect(() => {
    if (window.innerWidth < 768) {
      setShowMobileFrame(false);
    }
    const cachedUser = localStorage.getItem('fsa_logged_in_user');
    if (cachedUser) {
      try {
        const u = JSON.parse(cachedUser);
        setUser(u);
        setUserRole(u.role);
      } catch {
        localStorage.removeItem('fsa_logged_in_user');
      }
    }
    // Load carpenters for the quick-select helper
    setCarpenters(getCarpenters());

    // Monitor online status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Refresh carpenter list when storage updates (e.g. new carpenter added)
    const handleStorageUpdate = () => setCarpenters(getCarpenters());
    window.addEventListener('fsa_storage_update', handleStorageUpdate);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('fsa_storage_update', handleStorageUpdate);
    };
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!loginPhone.trim() || !loginPassword.trim()) {
      setLoginError('Please enter your phone number and password.');
      return;
    }
    setLoginLoading(true);
    setLoginError('');

    try {
      const result = await authenticateUser(loginPhone.trim(), loginPassword.trim());
      if (result.success) {
        const loggedInUser = result.user;
        setUser(loggedInUser);
        setActiveUser(loggedInUser);
        setUserRole(loggedInUser.role);
        // Request browser notification permission for admins
        if (loggedInUser.role !== 'Carpenter' && typeof Notification !== 'undefined' && Notification.permission === 'default') {
          Notification.requestPermission();
        }
      } else {
        setLoginError(result.error || 'Login failed. Check your credentials.');
      }
    } catch {
      setLoginError('An unexpected error occurred. Please try again.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleQuickLogin = (phone, password) => {
    setLoginPhone(phone);
    setLoginPassword(password);
  };

  const handleLogout = () => {
    localStorage.removeItem('fsa_logged_in_user');
    setUser(null);
    setLoginPhone('');
    setLoginPassword('');
    setLoginError('');
  };

  if (trackOrderId) {
    return <CustomerPortal orderId={trackOrderId} />;
  }

  if (directJobId) {
    return <CarpenterPortal directJobId={directJobId} carpenterName="Field Technician" />;
  }

  if (!user) {
    return (
      <div className="login-screen-wrapper">
        <div className="login-glass-card">
          <div className="login-header">
            <div className="login-header-icon">
              <ClipboardList size={30} style={{ color: '#ffffff' }} />
            </div>
            <h2>TimberFlow Link</h2>
            <p>Field Assembly &amp; Payout System</p>
            <div className={`login-online-badge ${isOnline ? 'online' : 'offline'}`}>
              {isOnline ? <><Wifi size={11} /> Server Mode</> : <><WifiOff size={11} /> Demo Mode</>}
            </div>
          </div>

          <form onSubmit={handleLogin} className="login-form">
            <div className="form-group-login">
              <label>Phone Number</label>
              <input
                type="tel"
                value={loginPhone}
                onChange={(e) => { setLoginPhone(e.target.value); setLoginError(''); }}
                placeholder="e.g. +91-95555-01234"
                className="login-input"
                autoComplete="tel"
              />
            </div>

            <div className="form-group-login">
              <label>Password</label>
              <div className="login-password-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={loginPassword}
                  onChange={(e) => { setLoginPassword(e.target.value); setLoginError(''); }}
                  placeholder="Enter your password"
                  className="login-input password-input"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="btn-toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {loginError && (
              <div className="login-error-msg">
                <Shield size={13} />
                <span>{loginError}</span>
              </div>
            )}

            <button type="submit" className="btn-login-submit" disabled={loginLoading}>
              {loginLoading ? (
                <span className="login-spinner">Authenticating...</span>
              ) : (
                <><Lock size={14} /> Access Workspace</>
              )}
            </button>
          </form>

          {/* Demo Quick-Login Panel (only visible on localhost) */}
          {(window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && (
            <div className="login-profiles-helpers">
              <span className="helpers-title">
                <Shield size={10} /> Demo Accounts (password: <code>admin123</code> / <code>carpenter123</code>):
              </span>
              <div className="quick-profiles-grid">
                <button
                  type="button"
                  onClick={() => handleQuickLogin('+91-80000-00001', 'admin123')}
                  className="quick-profile-btn admin-btn"
                >
                  <span className="qp-role">Super Admin</span>
                  <span className="qp-email">+91-80000-00001</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('+91-80000-00002', 'admin123')}
                  className="quick-profile-btn"
                >
                  <span className="qp-role">Dispatcher</span>
                  <span className="qp-email">+91-80000-00002</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('+91-80000-00003', 'admin123')}
                  className="quick-profile-btn"
                >
                  <span className="qp-role">Inventory Mgr</span>
                  <span className="qp-email">+91-80000-00003</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('+91-80000-00004', 'admin123')}
                  className="quick-profile-btn"
                >
                  <span className="qp-role">CS Support</span>
                  <span className="qp-email">+91-80000-00004</span>
                </button>
                {/* Dynamic carpenter accounts loaded from data store */}
                {carpenters.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleQuickLogin(c.phone, 'carpenter123')}
                    className="quick-profile-btn carpenter-btn"
                  >
                    <span className="qp-role">Carpenter</span>
                    <span className="qp-email">{c.name} • {c.phone}</span>
                  </button>
                ))}
              </div>
              <p className="demo-mode-note">
                Demo mode: credentials are validated locally when PocketBase is offline.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  const isCarpenter = user.role === 'Carpenter';

  return (
    <>
      {/* Universal Top Switcher bar */}
      <div className="app-top-switcher-bar">
        <div className="switcher-info">
          <span>Active Session: <strong>{user.name}</strong></span>
          <span className="switcher-role-badge">{user.role}</span>
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px' }}>({user.phone || user.email})</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center' }}>
          {isCarpenter && (
            <button
              type="button"
              onClick={() => setShowMobileFrame(!showMobileFrame)}
              className="btn-logout-switcher"
              style={{ marginRight: '12px', background: 'rgba(255, 255, 255, 0.1)', borderColor: 'rgba(255, 255, 255, 0.2)' }}
            >
              {showMobileFrame ? <Monitor size={13} /> : <Smartphone size={13} />}
              <span>{showMobileFrame ? 'Use Desktop View' : 'Use Mobile Frame'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleLogout}
            className="btn-logout-switcher"
          >
            <LogOut size={13} />
            <span>Logout &amp; Swap Role</span>
          </button>
        </div>
      </div>

      {isCarpenter ? (
        showMobileFrame ? (
          /* Render Carpenter Mobile App inside phone mock frame simulator */
          <div className="mobile-simulator-layout">
            <div className="mobile-phone-frame">
              <div className="mobile-screen-content">
                <CarpenterPortal carpenterName={user.name} />
              </div>
            </div>
          </div>
        ) : (
          /* Render Carpenter Mobile App full screen for desktop users */
          <div style={{ minHeight: 'calc(100vh - 50px)', background: 'var(--slate-950)' }}>
            <CarpenterPortal carpenterName={user.name} />
          </div>
        )
      ) : (
        /* Render Backend Desktop Dashboard */
        <AdminPortal />
      )}
    </>
  );
}
