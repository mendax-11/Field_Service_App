import { Clock, CheckCircle, IndianRupee, CheckSquare, User, MapPin, ChevronRight, RefreshCw } from 'lucide-react';
import { useState } from 'react';

export default function CarpenterJobList({ carpenterName, activeJobs, walletSummary, jobs, activeUser, setSelectedJobId, refetchJobs }) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (refetchJobs) {
      setIsRefreshing(true);
      await refetchJobs();
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  return (
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
      <div className="section-title-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3>Today's Work Orders</h3>
          <span>{activeJobs.length} jobs assigned</span>
        </div>
        <button 
          onClick={handleRefresh} 
          className="btn-action" 
          style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}
          disabled={isRefreshing}
        >
          <RefreshCw size={14} className={isRefreshing ? 'spin-anim' : ''} />
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </button>
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
  );
}
