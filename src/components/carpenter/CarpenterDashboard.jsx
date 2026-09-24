import { Briefcase, CheckCircle, IndianRupee, Calendar, MapPin, ChevronRight, TrendingUp } from 'lucide-react';
import { isActiveOrder } from '../../utils/stateManager';

export default function CarpenterDashboard({ availability, setAvailability, jobs, carpenterName, setActiveTab, setSelectedJobId }) {
  const activeJobs = jobs.filter(j => j.assignedCarpenter === carpenterName && isActiveOrder(j));
  const completedJobs = jobs.filter(j => j.assignedCarpenter === carpenterName && j.jobStatus === 'Completed');

  // Compute real completion rate from all jobs ever assigned to this carpenter
  const allAssigned = jobs.filter(j => j.assignedCarpenter === carpenterName);
  const totalJobs = allAssigned.length;
  const completionRate = totalJobs > 0 ? Math.round((completedJobs.length / totalJobs) * 100) : 0;
  const rateColor = completionRate >= 90 ? 'var(--success)' : completionRate >= 70 ? 'var(--warning, #f59e0b)' : 'var(--danger, #ef4444)';

  return (
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
            Active &amp; Online
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
          <span className="stat-val">{activeJobs.length}</span>
          <span className="stat-lbl">Active Jobs</span>
        </div>
        <div className="stat-card">
          <div className="stat-icon-wrap success">
            <CheckCircle size={16} />
          </div>
          <span className="stat-val">{completedJobs.length}</span>
          <span className="stat-lbl">Completed</span>
        </div>
        <div className="stat-card">
          <div className="stat-icon-wrap warning">
            <IndianRupee size={16} />
          </div>
          <span className="stat-val">
            &#8377;{completedJobs.reduce((sum, j) => sum + j.payout, 0)}
          </span>
          <span className="stat-lbl">Earnings</span>
        </div>
      </div>

      {/* Today''s Schedule Agenda */}
      <div className="agenda-section">
        <div className="section-title-bar">
          <h3><Calendar size={15} /> Today''s Agenda</h3>
          <span>{activeJobs.length} Pending</span>
        </div>

        <div className="agenda-timeline">
          {activeJobs.length === 0 ? (
            <div className="empty-agenda">
              <CheckCircle size={28} style={{ color: 'var(--success)', marginBottom: '8px' }} />
              <p>All caught up! No pending jobs assigned to you today.</p>
            </div>
          ) : (
            activeJobs.map((j, index) => {
              const rawDate = j.deliveryDate || j.promiseDate || j.assignedDate || '';
              let slotLabel = `Slot ${index + 1}`;
              if (rawDate) {
                try {
                  const d = new Date(rawDate);
                  if (!isNaN(d.getTime())) {
                    slotLabel = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
                  }
                } catch {
                  /* fallback to Slot N already set */
                }
              }
              return (
                <div key={j.id} className="timeline-item">
                  <div className="timeline-marker">
                    <span className="marker-number">{index + 1}</span>
                    <div className="timeline-line"></div>
                  </div>
                  <div className="timeline-content card-style" onClick={() => { setActiveTab('jobs'); setSelectedJobId(j.id); }}>
                    <div className="timeline-content-header">
                      <span className="time-tag">{slotLabel}</span>
                      <span className={`status-pill ${j.jobStatus.toLowerCase().replace(/ /g, '-')}`}>{j.jobStatus}</span>
                    </div>
                    <h4>{j.customerName}</h4>
                    <p className="sku-desc">{j.sku.split('-').slice(1).join(' ') || j.sku}</p>
                    <div className="address-row">
                      <MapPin size={12} />
                      <span>{j.customerAddress}, {j.city}</span>
                    </div>
                    <div className="timeline-footer">
                      <span className="payout-indicator">Payout: &#8377;{j.payout}</span>
                      <span className="action-link">View Order <ChevronRight size={14} /></span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Performance Card */}
      <div className="quick-actions-section" style={{ marginTop: '20px' }}>
        <h4 className="detail-card-title" style={{ paddingLeft: 0, marginBottom: '10px' }}>
          <TrendingUp size={15} />
          <span>Performance &amp; Status</span>
        </h4>
        <div className="performance-card card-style">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h5 style={{ margin: '0 0 4px 0', fontSize: '0.85rem' }}>Job Completion Rating</h5>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                {totalJobs > 0
                  ? `${completedJobs.length} of ${totalJobs} jobs completed`
                  : 'No jobs assigned yet'}
              </span>
            </div>
            <span style={{ fontSize: '1.2rem', fontWeight: '800', color: rateColor }}>
              {totalJobs > 0 ? `${completionRate}%` : '\u2014'}
            </span>
          </div>
          <div className="progress-bar-bg" style={{ height: '6px', backgroundColor: 'var(--bg-input)', borderRadius: '3px', marginTop: '10px', overflow: 'hidden' }}>
            <div
              className="progress-bar-fill"
              style={{ width: `${completionRate}%`, height: '100%', background: `linear-gradient(90deg, var(--color-primary), ${rateColor})` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
}
