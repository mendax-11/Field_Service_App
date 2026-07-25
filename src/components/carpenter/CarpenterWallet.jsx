import { useState, useMemo } from 'react';
import { 
  Wallet, 
  CheckCircle2, 
  Clock, 
  Banknote, 
  Filter, 
  RotateCcw, 
  LogOut, 
  Calendar,
  Sparkles,
  ChevronRight
} from 'lucide-react';

export default function CarpenterWallet({ walletSummary, directJobId, handleResetDemo, t }) {
  const [dateFilter, setDateFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredJobs = useMemo(() => {
    let jobs = walletSummary.completedJobs || [];
    
    if (statusFilter === 'paid') {
      jobs = jobs.filter(j => j.paymentStatus === 'Paid' || j.paymentStatus === 'Collected on-site');
    } else if (statusFilter === 'pending') {
      jobs = jobs.filter(j => j.paymentStatus !== 'Paid' && j.paymentStatus !== 'Collected on-site' && j.paymentStatus !== 'Collected');
    }
    
    if (dateFilter !== 'all') {
      const now = new Date();
      jobs = jobs.filter(j => {
        let compDate = j.deliveryDate || j.orderDate || j.created;
        if (j.auditLogs) {
           const compLog = j.auditLogs.find(l => l.action === 'Job Completed' || l.action === 'Payout Cleared');
           if (compLog) compDate = compLog.timestamp;
        }
        if (!compDate) return true;
        const diffDays = (now - new Date(compDate)) / (1000 * 60 * 60 * 24);
        if (dateFilter === 'week') return diffDays <= 7;
        if (dateFilter === 'month') return diffDays <= 30;
        return true;
      });
    }

    return jobs.sort((a, b) => {
      const getD = (j) => {
        if (j.auditLogs) {
          const compLog = j.auditLogs.find(l => l.action === 'Job Completed' || l.action === 'Payout Cleared');
          if (compLog) return new Date(compLog.timestamp);
        }
        return new Date(j.deliveryDate || j.orderDate || 0);
      };
      return getD(b) - getD(a);
    });
  }, [walletSummary.completedJobs, dateFilter, statusFilter]);

  const filteredSummary = useMemo(() => {
    let totalPaid = 0;
    let totalPending = 0;
    let collectedOnSite = 0;

    filteredJobs.forEach(job => {
      const amt = Number(job.payout || job.payoutAmount || job.assembly_amount || 0);
      if (job.paymentStatus === 'Paid') {
        totalPaid += amt;
      } else if (job.paymentStatus === 'Collected on-site' || job.paymentStatus === 'Collected') {
        collectedOnSite += amt;
      } else {
        totalPending += amt;
      }
    });

    return {
      totalPaid,
      collectedOnSite,
      totalPending,
      totalEarnings: totalPaid + collectedOnSite + totalPending
    };
  }, [filteredJobs]);

  const formatDate = (job) => {
    let dateStr = job.deliveryDate || job.orderDate || job.created;
    if (job.auditLogs) {
      const compLog = job.auditLogs.find(l => l.action === 'Job Completed' || l.action === 'Payout Cleared');
      if (compLog) dateStr = compLog.timestamp;
    }
    if (!dateStr) return 'Recently completed';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Recently completed';
    return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Balance Summary Card */}
      <div className="wallet-summary-card" style={{
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        borderRadius: '16px',
        padding: '20px',
        color: '#ffffff',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          top: '-20px',
          right: '-20px',
          width: '120px',
          height: '120px',
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, rgba(0,0,0,0) 70%)',
          borderRadius: '50%',
          pointerEvents: 'none'
        }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(59, 130, 246, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#60a5fa'
            }}>
              <Wallet size={18} />
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#94a3b8' }}>
              Total Earnings Secured
            </span>
          </div>
          <span style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.08)', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Sparkles size={12} color="#fbbf24" /> Verified
          </span>
        </div>

        <div style={{ margin: '8px 0 16px 0' }}>
          <h2 style={{ fontSize: '2.4rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em', color: '#ffffff' }}>
            ₹{filteredSummary.totalEarnings.toLocaleString('en-IN')}
          </h2>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '8px',
          paddingTop: '16px',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <div style={{ textAlign: 'left' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.65rem', textTransform: 'uppercase', color: '#94a3b8', marginBottom: '4px' }}>
              <CheckCircle2 size={11} color="#4ade80" /> Cleared
            </span>
            <strong style={{ fontSize: '1rem', fontWeight: 700, color: '#4ade80' }}>
              ₹{filteredSummary.totalPaid.toLocaleString('en-IN')}
            </strong>
          </div>

          <div style={{ textAlign: 'left', borderLeft: '1px solid rgba(255, 255, 255, 0.08)', paddingLeft: '8px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.65rem', textTransform: 'uppercase', color: '#94a3b8', marginBottom: '4px' }}>
              <Banknote size={11} color="#60a5fa" /> Cash / UPI
            </span>
            <strong style={{ fontSize: '1rem', fontWeight: 700, color: '#60a5fa' }}>
              ₹{filteredSummary.collectedOnSite.toLocaleString('en-IN')}
            </strong>
          </div>

          <div style={{ textAlign: 'left', borderLeft: '1px solid rgba(255, 255, 255, 0.08)', paddingLeft: '8px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.65rem', textTransform: 'uppercase', color: '#94a3b8', marginBottom: '4px' }}>
              <Clock size={11} color="#fbbf24" /> Pending
            </span>
            <strong style={{ fontSize: '1rem', fontWeight: 700, color: '#fbbf24' }}>
              ₹{filteredSummary.totalPending.toLocaleString('en-IN')}
            </strong>
          </div>
        </div>
      </div>

      {/* Filter & Title Bar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>
            Payout & Earnings History
          </h3>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', background: 'var(--bg-card)', padding: '2px 8px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
            {filteredJobs.length} {filteredJobs.length === 1 ? 'Job' : 'Jobs'}
          </span>
        </div>
        
        {/* Responsive Pill Filters */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {/* Time Filter Group */}
          <div style={{ display: 'inline-flex', background: 'var(--bg-input)', borderRadius: '10px', padding: '3px', border: '1px solid var(--border-color)' }}>
            <button 
              type="button"
              onClick={() => setDateFilter('all')}
              style={{
                padding: '5px 10px',
                fontSize: '0.75rem',
                fontWeight: 600,
                borderRadius: '7px',
                border: 'none',
                cursor: 'pointer',
                background: dateFilter === 'all' ? 'var(--primary-color)' : 'transparent',
                color: dateFilter === 'all' ? '#ffffff' : 'var(--text-secondary)',
                transition: 'all 0.15s ease'
              }}
            >All</button>
            <button 
              type="button"
              onClick={() => setDateFilter('month')}
              style={{
                padding: '5px 10px',
                fontSize: '0.75rem',
                fontWeight: 600,
                borderRadius: '7px',
                border: 'none',
                cursor: 'pointer',
                background: dateFilter === 'month' ? 'var(--primary-color)' : 'transparent',
                color: dateFilter === 'month' ? '#ffffff' : 'var(--text-secondary)',
                transition: 'all 0.15s ease'
              }}
            >Month</button>
            <button 
              type="button"
              onClick={() => setDateFilter('week')}
              style={{
                padding: '5px 10px',
                fontSize: '0.75rem',
                fontWeight: 600,
                borderRadius: '7px',
                border: 'none',
                cursor: 'pointer',
                background: dateFilter === 'week' ? 'var(--primary-color)' : 'transparent',
                color: dateFilter === 'week' ? '#ffffff' : 'var(--text-secondary)',
                transition: 'all 0.15s ease'
              }}
            >Week</button>
          </div>

          {/* Status Filter Group */}
          <div style={{ display: 'inline-flex', background: 'var(--bg-input)', borderRadius: '10px', padding: '3px', border: '1px solid var(--border-color)' }}>
            <button 
              type="button"
              onClick={() => setStatusFilter('all')}
              style={{
                padding: '5px 10px',
                fontSize: '0.75rem',
                fontWeight: 600,
                borderRadius: '7px',
                border: 'none',
                cursor: 'pointer',
                background: statusFilter === 'all' ? 'var(--text-secondary)' : 'transparent',
                color: statusFilter === 'all' ? '#ffffff' : 'var(--text-secondary)',
                transition: 'all 0.15s ease'
              }}
            >Status: All</button>
            <button 
              type="button"
              onClick={() => setStatusFilter('paid')}
              style={{
                padding: '5px 10px',
                fontSize: '0.75rem',
                fontWeight: 600,
                borderRadius: '7px',
                border: 'none',
                cursor: 'pointer',
                background: statusFilter === 'paid' ? '#16a34a' : 'transparent',
                color: statusFilter === 'paid' ? '#ffffff' : 'var(--text-secondary)',
                transition: 'all 0.15s ease'
              }}
            >Paid</button>
            <button 
              type="button"
              onClick={() => setStatusFilter('pending')}
              style={{
                padding: '5px 10px',
                fontSize: '0.75rem',
                fontWeight: 600,
                borderRadius: '7px',
                border: 'none',
                cursor: 'pointer',
                background: statusFilter === 'pending' ? '#d97706' : 'transparent',
                color: statusFilter === 'pending' ? '#ffffff' : 'var(--text-secondary)',
                transition: 'all 0.15s ease'
              }}
            >Pending</button>
          </div>
        </div>
      </div>

      {/* History Items Stack */}
      <div className="jobs-list-stack" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {filteredJobs.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '32px 16px',
            background: 'var(--bg-card)',
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
            color: 'var(--text-muted)'
          }}>
            <Filter size={32} style={{ opacity: 0.4, marginBottom: '8px' }} />
            <p style={{ margin: 0, fontSize: '0.85rem' }}>No payout records found for the selected filters.</p>
          </div>
        ) : (
          filteredJobs.map(j => {
            const isPaid = j.paymentStatus === 'Paid';
            const isCollected = j.paymentStatus === 'Collected on-site' || j.paymentStatus === 'Collected';
            
            const badgeBg = isPaid 
              ? 'rgba(34, 197, 94, 0.12)' 
              : isCollected 
                ? 'rgba(59, 130, 246, 0.12)' 
                : 'rgba(245, 158, 11, 0.12)';
            
            const badgeColor = isPaid 
              ? '#22c55e' 
              : isCollected 
                ? '#3b82f6' 
                : '#f59e0b';

            return (
              <div key={j.id} style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'transform 0.15s ease, border-color 0.15s ease'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    {j.productName || 'Furniture Assembly'}
                  </h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    <span style={{ fontWeight: 600, color: 'var(--primary-color)' }}>#{j.orderId || j.id}</span>
                    <span>•</span>
                    <span>{j.paymentType || 'Company'} Pay</span>
                    <span>•</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                      <Calendar size={10} /> {formatDate(j)}
                    </span>
                  </div>
                </div>
                
                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                  <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)' }}>
                    ₹{(Number(j.payoutAmount || j.payout || j.assembly_amount || 0)).toLocaleString('en-IN')}
                  </span>
                  <span style={{
                    fontSize: '0.62rem',
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: '6px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.03em',
                    background: badgeBg,
                    color: badgeColor
                  }}>
                    {j.paymentStatus || 'Pending'}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* App Settings & Session Control */}
      {!directJobId && (
        <div style={{
          marginTop: '12px',
          padding: '14px',
          background: 'var(--bg-card)',
          borderRadius: '12px',
          border: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
            App Session Settings
          </span>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              type="button" 
              onClick={handleResetDemo} 
              style={{
                flex: 1,
                padding: '9px 12px',
                fontSize: '0.78rem',
                fontWeight: 600,
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-input)',
                color: 'var(--text-main)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <RotateCcw size={14} /> Reset Demo Data
            </button>
            <button 
              type="button" 
              onClick={() => {
                localStorage.removeItem('fsa_logged_in_user');
                window.location.reload();
              }} 
              style={{ 
                flex: 1,
                padding: '9px 12px',
                fontSize: '0.78rem',
                fontWeight: 600,
                borderRadius: '8px',
                background: 'rgba(239, 68, 68, 0.1)', 
                border: '1px solid rgba(239, 68, 68, 0.25)', 
                color: '#ef4444',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <LogOut size={14} /> {t ? t('logout') : 'Logout'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

