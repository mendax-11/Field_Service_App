import { 
  ArrowLeft, AlertTriangle, MapPin, Smartphone, Navigation, 
  Send, CheckSquare, Camera, IndianRupee, MessageCircle, CheckCircle, AlertCircle, FileText
} from 'lucide-react';
import SignatureCanvas from '../SignatureCanvas';
import { captureAndStampPhoto } from '../../utils/photoStamper';

export default function CarpenterJobDetail({ 
  job, directJobId, setEnteredOtp, setOtpError, getMaskedValue, t, 
  isCompletedMoreThan24Hours, setShowRejectForm, handleStartTransit, 
  getWhatsAppShareLink, carpenterName, stateManager, refetchJobs, 
  handleChecklistToggle, uploadingPhoto, handleClearPhoto, handlePhotoChange, 
  handleMockPhoto, showDamageForm, setShowDamageForm, damagePartName, 
  setDamagePartName, damageNotes, setDamageNotes, damagePhotos, 
  compressingDamage, setCompressingDamage, setDamagePhotos, selectedJobId, 
  handleMockDamagePhoto, handleDamageSubmit, showExtraChargeForm, 
  setShowExtraChargeForm, chargeType, setChargeType, chargeAmount, 
  setChargeAmount, chargeNotes, setChargeNotes, chargeReceipt, 
  setChargeReceipt, handleMockReceiptPhoto, handleExtraChargeSubmit, 
  isReadyToComplete, handleSendOtp, enteredOtp, handleVerifyOtp, 
  otpError, resendCooldown, handleSendPreClosureFeedback, handleSignatureSave, 
  handleSendFeedbackWhatsApp, newCommentText, setNewCommentText, 
  handleSendComment, commentsEndRef
}) {
  const checklist = Array.isArray(job.checklist) ? job.checklist : [];
  const isChecklistVisible = job.status !== 'Completed' && checklist.length > 0;
  const isChecklistFinished = checklist.length > 0 && checklist.every((i) => i.checked);
  
  const beforePhotos = (job.photos && Array.isArray(job.photos.before)) ? job.photos.before : (job.photos && job.photos.before ? [job.photos.before] : []);
  const afterPhotos = (job.photos && Array.isArray(job.photos.after)) ? job.photos.after : (job.photos && job.photos.after ? [job.photos.after] : []);

  const isBeforeUploaded = beforePhotos.length > 0;
  const isAfterUploaded = afterPhotos.length > 0;

  return (
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
                refetchJobs();
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
      {isChecklistVisible && (
        <>
          <div className="detail-card">
        <div className="checklist-progress-container">
          <h4 className="detail-card-title" style={{ margin: 0 }}>
            <CheckSquare size={15} />
            <span>Assembly Checklist</span>
          </h4>
          <span className="checklist-progress-text">
            {checklist.filter(i => i.checked).length} of {checklist.length} done
          </span>
        </div>

        {/* Progress bar */}
        <div className="progress-track">
          <div 
            className="progress-bar-fill" 
            style={{ 
              width: `${(checklist.filter(i => i.checked).length / checklist.length) * 100}%` 
            }}
          />
        </div>

        <div className="checklist-items-stack">
          {checklist.map(item => (
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
          <div className={`photo-uploader-box ${beforePhotos.length > 0 ? 'has-image' : ''}`} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span className="photo-label">Before Assembly</span>
                <br/>
                <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>(Unopened boxes)</span>
              </div>
            </div>
            
            {beforePhotos.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '8px' }}>
                {beforePhotos.map((photo, idx) => (
                  <div key={idx} style={{ position: 'relative', height: '80px', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                    <img src={photo} className="uploaded-thumb" alt={`Before Assembly ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button 
                      type="button" 
                      className="btn-clear-photo"
                      style={{ position: 'absolute', top: '2px', right: '2px', background: 'rgba(239, 68, 68, 0.9)', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '10px', padding: 0 }}
                      onClick={() => handleClearPhoto(job.id, 'before', idx)}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            {uploadingPhoto.before ? (
              <div className="upload-loading-spinner" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '10px', gap: '8px', border: '1px dashed var(--border-color)', borderRadius: '6px' }}>
                <div className="spinner" style={{ width: '24px', height: '24px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--color-secondary, #3b82f6)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', textAlign: 'center' }}>Stamping photos...</span>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '4px' }}>
                <label className="photo-btn-label" style={{ flex: 1, textAlign: 'center', padding: '8px', cursor: 'pointer' }}>
                  Take Photo
                  <input 
                    type="file" 
                    accept="image/*" 
                    capture="environment"
                    style={{ display: 'none' }}
                    onChange={(e) => handlePhotoChange(job.id, 'before', e)} 
                  />
                </label>
                <label className="photo-btn-label" style={{ flex: 1, textAlign: 'center', padding: '8px', cursor: 'pointer' }}>
                  Attach Images
                  <input 
                    type="file" 
                    accept="image/*" 
                    multiple
                    style={{ display: 'none' }}
                    onChange={(e) => handlePhotoChange(job.id, 'before', e)} 
                  />
                </label>
                <button 
                  type="button" 
                  onClick={() => handleMockPhoto(job.id, 'before')} 
                  className="btn-mock-photo"
                  style={{ gridColumn: '1 / -1', padding: '8px' }}
                >
                  Mock Box
                </button>
              </div>
            )}
          </div>

          {/* After Assembly Photo */}
          <div className={`photo-uploader-box ${afterPhotos.length > 0 ? 'has-image' : ''}`} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span className="photo-label">After Assembly</span>
                <br/>
                <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>(Finished Furniture)</span>
              </div>
            </div>
            
            {afterPhotos.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '8px' }}>
                {afterPhotos.map((photo, idx) => (
                  <div key={idx} style={{ position: 'relative', height: '80px', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                    <img src={photo} className="uploaded-thumb" alt={`After Assembly ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button 
                      type="button" 
                      className="btn-clear-photo"
                      style={{ position: 'absolute', top: '2px', right: '2px', background: 'rgba(239, 68, 68, 0.9)', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '10px', padding: 0 }}
                      onClick={() => handleClearPhoto(job.id, 'after', idx)}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            {uploadingPhoto.after ? (
              <div className="upload-loading-spinner" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '10px', gap: '8px', border: '1px dashed var(--border-color)', borderRadius: '6px' }}>
                <div className="spinner" style={{ width: '24px', height: '24px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--color-secondary, #3b82f6)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', textAlign: 'center' }}>Stamping photos...</span>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '4px' }}>
                <label className="photo-btn-label" style={{ flex: 1, textAlign: 'center', padding: '8px', cursor: 'pointer' }}>
                  Take Photo
                  <input 
                    type="file" 
                    accept="image/*" 
                    capture="environment"
                    style={{ display: 'none' }}
                    onChange={(e) => handlePhotoChange(job.id, 'after', e)} 
                  />
                </label>
                <label className="photo-btn-label" style={{ flex: 1, textAlign: 'center', padding: '8px', cursor: 'pointer' }}>
                  Attach Images
                  <input 
                    type="file" 
                    accept="image/*" 
                    multiple
                    style={{ display: 'none' }}
                    onChange={(e) => handlePhotoChange(job.id, 'after', e)} 
                  />
                </label>
                <button 
                  type="button" 
                  onClick={() => handleMockPhoto(job.id, 'after')} 
                  className="btn-mock-photo"
                  style={{ gridColumn: '1 / -1', padding: '8px' }}
                >
                  Mock Finish
                </button>
              </div>
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

        {job.damageReport && (
          <div className="submitted-damage-info" style={{ marginTop: '10px' }}>
            <p style={{ fontWeight: 'bold', color: 'var(--danger)' }}>
              Damage Claim Active
            </p>
            <p><strong>Part:</strong> {job.damageReport.partName}</p>
            <p><strong>Description:</strong> {job.damageReport.notes}</p>
            {job.damagePhotos && job.damagePhotos.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '12px' }}>
                {job.damagePhotos.map((photo, pIdx) => (
                  <div key={pIdx} style={{ position: 'relative', height: '80px', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border-color, #232e42)' }}>
                    <img src={photo} alt={`Damage proof ${pIdx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ))}
              </div>
            ) : job.damageReport.photo ? (
              <img src={job.damageReport.photo} className="damage-preview-img" alt="Damage proof" />
            ) : null}
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
              <label>Photo Proof ({damagePhotos.length} added)</label>
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
                          setDamagePhotos(prev => [...prev, compressed]);
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
              {damagePhotos.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '12px' }}>
                  {damagePhotos.map((photo, pIdx) => (
                    <div key={pIdx} style={{ position: 'relative', height: '80px', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border-color, #232e42)' }}>
                      <img src={photo} alt={`Damage Preview ${pIdx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button 
                        type="button" 
                        className="btn-clear-photo" 
                        style={{ position: 'absolute', top: '2px', right: '2px', background: 'rgba(239, 68, 68, 0.9)', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '10px', padding: 0 }}
                        disabled={compressingDamage} 
                        onClick={() => setDamagePhotos(prev => prev.filter((_, idx) => idx !== pIdx))}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
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
  );
}
