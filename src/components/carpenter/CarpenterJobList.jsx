import { Clock, CheckCircle, IndianRupee, CheckSquare, User, MapPin, ChevronRight, RefreshCw, Image } from 'lucide-react';
import { useState } from 'react';

export default function CarpenterJobList({ carpenterName, activeJobs, walletSummary, setSelectedJobId, refetchJobs }) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (refetchJobs) {
      setIsRefreshing(true);
      await refetchJobs();
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const handleOpenProductImage = (event, job) => {
    event.stopPropagation();
    const imageUrl = job.productImage || job.product_image_url || job.product_image;
    if (imageUrl) {
      window.open(imageUrl, '_blank', 'noopener,noreferrer');
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
                <button
                  type="button"
                  className="job-thumb-button"
                  onClick={(event) => handleOpenProductImage(event, j)}
                  aria-label={`Open product image for ${j.productName}`}
                >
                  <img 
                    src={j.productImage} 
                    alt={j.productName} 
                    className="job-thumb"
                    onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1581428982868-e410dd047a90?w=100'; }}
                  />
                  <span className="job-thumb-action">
                    <Image size={13} />
                  </span>
                </button>
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
                <button
                  type="button"
                  className="job-view-product-btn"
                  onClick={(event) => handleOpenProductImage(event, j)}
                >
                  <Image size={13} />
                  View Product
                </button>
                <span className="job-payout">₹{j.payoutAmount}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
