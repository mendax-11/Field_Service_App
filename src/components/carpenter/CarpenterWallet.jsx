import { useState, useMemo } from 'react';
import { Filter } from 'lucide-react';

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
        if (!compDate) return true; // Include if no date found
        const diffDays = (now - new Date(compDate)) / (1000 * 60 * 60 * 24);
        if (dateFilter === 'week') return diffDays <= 7;
        if (dateFilter === 'month') return diffDays <= 30;
        return true;
      });
    }
    return jobs.sort((a, b) => {
      // Sort newest first
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

  return (
    <>
      {/* Balance Summary Card */}
      <div className="wallet-summary-card">
        <div className="wallet-balance-wrap">
          <span>Total Earnings Secured</span>
          <h2>₹{filteredSummary.totalEarnings}</h2>
        </div>

        <div className="wallet-breakdown">
          <div className="breakdown-item">
            <span>Cleared (Paid)</span>
            <strong>₹{filteredSummary.totalPaid}</strong>
          </div>
          <div className="breakdown-item">
            <span>Collected Cash/UPI</span>
            <strong>₹{filteredSummary.collectedOnSite}</strong>
          </div>
          <div className="breakdown-item">
            <span>Pending Dispatch</span>
            <strong>₹{filteredSummary.totalPending}</strong>
          </div>
        </div>
      </div>

      {/* Payout History List */}
      <div className="section-title-bar" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>Payout & Earnings History</h3>
          <span>{filteredJobs.length} Completed</span>
        </div>
        
        {/* Simple Filters */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' }}>
          <div className="filter-group" style={{ display: 'flex', background: 'var(--bg-input)', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
            <button 
              className={`filter-btn ${dateFilter === 'all' ? 'active' : ''}`}
              onClick={() => setDateFilter('all')}
              style={{ padding: '6px 12px', fontSize: '0.8rem', border: 'none', background: dateFilter === 'all' ? 'var(--primary-color)' : 'transparent', color: dateFilter === 'all' ? '#fff' : 'var(--text-secondary)' }}
            >All Time</button>
            <button 
              className={`filter-btn ${dateFilter === 'month' ? 'active' : ''}`}
              onClick={() => setDateFilter('month')}
              style={{ padding: '6px 12px', fontSize: '0.8rem', border: 'none', background: dateFilter === 'month' ? 'var(--primary-color)' : 'transparent', color: dateFilter === 'month' ? '#fff' : 'var(--text-secondary)' }}
            >Month</button>
            <button 
              className={`filter-btn ${dateFilter === 'week' ? 'active' : ''}`}
              onClick={() => setDateFilter('week')}
              style={{ padding: '6px 12px', fontSize: '0.8rem', border: 'none', background: dateFilter === 'week' ? 'var(--primary-color)' : 'transparent', color: dateFilter === 'week' ? '#fff' : 'var(--text-secondary)' }}
            >Week</button>
          </div>
          
          <div className="filter-group" style={{ display: 'flex', background: 'var(--bg-input)', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
            <button 
              className={`filter-btn ${statusFilter === 'all' ? 'active' : ''}`}
              onClick={() => setStatusFilter('all')}
              style={{ padding: '6px 12px', fontSize: '0.8rem', border: 'none', background: statusFilter === 'all' ? 'var(--primary-color)' : 'transparent', color: statusFilter === 'all' ? '#fff' : 'var(--text-secondary)' }}
            >All</button>
            <button 
              className={`filter-btn ${statusFilter === 'paid' ? 'active' : ''}`}
              onClick={() => setStatusFilter('paid')}
              style={{ padding: '6px 12px', fontSize: '0.8rem', border: 'none', background: statusFilter === 'paid' ? 'var(--success-color)' : 'transparent', color: statusFilter === 'paid' ? '#fff' : 'var(--text-secondary)' }}
            >Paid</button>
            <button 
              className={`filter-btn ${statusFilter === 'pending' ? 'active' : ''}`}
              onClick={() => setStatusFilter('pending')}
              style={{ padding: '6px 12px', fontSize: '0.8rem', border: 'none', background: statusFilter === 'pending' ? 'var(--warning-color)' : 'transparent', color: statusFilter === 'pending' ? '#fff' : 'var(--text-secondary)' }}
            >Pending</button>
          </div>
        </div>
      </div>

      <div className="jobs-list-stack">
        {filteredJobs.length === 0 ? (
          <div className="empty-view">
            <Filter size={36} style={{ opacity: 0.5, marginBottom: '12px' }} />
            <p>No jobs found for these filters.</p>
          </div>
        ) : (
          filteredJobs.map(j => (
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
                <span className="wallet-amt">₹{j.payoutAmount || j.payout || 0}</span>
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
  );
}
