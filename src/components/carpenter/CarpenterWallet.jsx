import { CreditCard } from 'lucide-react';

export default function CarpenterWallet({ walletSummary, directJobId, handleResetDemo, t }) {
  return (
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
  );
}
