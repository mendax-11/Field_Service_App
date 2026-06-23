// src/components/OrderDetailsModal.jsx
import React, { useState, useEffect } from 'react';
import { 
  X, User, Phone, Package, CreditCard, Calendar, Clock, 
  MessageSquare, History, Plus, AlertTriangle, CheckCircle, Send
} from 'lucide-react';
import { getCarpenters, updateOrder, addComment, getUserRole, getActiveWorkload, MAX_ACTIVE_JOBS } from '../utils/stateManager';

export default function OrderDetailsModal({ order, onClose, onUpdate, readOnly = false }) {
  const [carpenters, setCarpenters] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [assignedCarpenter, setAssignedCarpenter] = useState(order.assignedCarpenter || '');
  const [jobStatus, setJobStatus] = useState(order.jobStatus || 'Unassigned');
  const [deliveryStatus, setDeliveryStatus] = useState(order.deliveryStatus || 'Pending');
  const [paymentStatus, setPaymentStatus] = useState(order.paymentStatus || 'Unpaid');
  
  // Extra fields for Parts Requested
  const [partsList, setPartsList] = useState(order.partsList || '');
  const [carpenterComments, setCarpenterComments] = useState(order.carpenterComments || '');
  const [damagePhoto, setDamagePhoto] = useState(order.damagePhoto || '');

  const userRole = getUserRole();

  useEffect(() => {
    setCarpenters(getCarpenters());
  }, []);

  const handleAddComment = (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    const author = userRole;
    addComment(order.orderId, newComment.trim(), author);
    setNewComment('');
    onUpdate();
  };

  const handleSaveFieldChanges = () => {
    const updatedFields = {
      assignedCarpenter: assignedCarpenter || null,
      jobStatus,
      deliveryStatus,
      paymentStatus
    };

    // If status is On Hold - Parts Requested, add those details
    if (jobStatus === 'On Hold - Parts Requested') {
      updatedFields.partsList = partsList;
      updatedFields.carpenterComments = carpenterComments;
      updatedFields.damagePhoto = damagePhoto || 'https://images.unsplash.com/photo-1581428982868-e410dd047a90?q=80&w=600&auto=format&fit=crop';
    }

    // Determine changes for audit logs
    const changes = [];
    if (order.assignedCarpenter !== updatedFields.assignedCarpenter) {
      changes.push(`Carpenter: ${order.assignedCarpenter || 'None'} -> ${updatedFields.assignedCarpenter || 'None'}`);
    }
    if (order.jobStatus !== updatedFields.jobStatus) {
      changes.push(`Job Status: ${order.jobStatus} -> ${updatedFields.jobStatus}`);
    }
    if (order.deliveryStatus !== updatedFields.deliveryStatus) {
      changes.push(`Delivery Status: ${order.deliveryStatus} -> ${updatedFields.deliveryStatus}`);
    }
    if (order.paymentStatus !== updatedFields.paymentStatus) {
      changes.push(`Payment Status: ${order.paymentStatus} -> ${updatedFields.paymentStatus}`);
    }

    if (changes.length > 0) {
      const timestamp = new Date().toISOString();
      const newAuditLog = {
        timestamp,
        action: 'Fields Updated',
        user: userRole,
        comments: changes.join(', ')
      };
      
      const existingLogs = order.auditLogs || [];
      updatedFields.auditLogs = [...existingLogs, newAuditLog];
    }

    updateOrder(order.orderId, updatedFields);
    onUpdate();
    alert('Order details updated successfully!');
  };

  // Calculate SLA time remaining
  const getSlaText = () => {
    if (order.deliveryStatus === 'Delivered') {
      return { text: 'Delivered (SLA Met)', class: 'sla-met' };
    }
    const delivery = new Date(order.deliveryDate);
    const now = new Date();
    const diffMs = delivery - now;
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));

    if (diffHours < 0) {
      return { text: `${Math.abs(diffHours)}h Overdue`, class: 'sla-overdue' };
    } else if (diffHours <= 24) {
      return { text: `${diffHours}h remaining (Urgent)`, class: 'sla-warning' };
    } else {
      return { text: `${diffHours}h remaining`, class: 'sla-normal' };
    }
  };

  const sla = getSlaText();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-area">
            <h3>Order Details: {order.orderId}</h3>
            <span className={`platform-badge ${order.platform.toLowerCase()}`}>
              {order.platform}
            </span>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <div className="modal-grid">
            {/* Left Column: Details & Actions */}
            <div className="modal-col-info">
              <div className="info-card">
                <h4><User size={16} /> Customer Information</h4>
                <div className="info-row">
                  <span className="label">Name:</span>
                  <span className="value">{order.customerName}</span>
                </div>
                <div className="info-row">
                  <span className="label">Phone:</span>
                  <span className="value">{order.customerPhone}</span>
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                  <a
                    href={`https://wa.me/${(order.customerPhone || '').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                      `Hello ${order.customerName || 'Customer'}, you can track the status of your assembly job here: ${window.location.origin}${window.location.pathname}?track=${order.orderId || order.order_id}`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="share-wa-btn"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '5px 10px',
                      fontSize: '11px',
                      backgroundColor: '#25D366',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      textDecoration: 'none',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}
                  >
                    <MessageSquare size={11} />
                    WhatsApp
                  </a>
                  <a
                    href={`sms:${order.customerPhone}?body=${encodeURIComponent(
                      `Hello ${order.customerName || 'Customer'}, you can track the status of your assembly job here: ${window.location.origin}${window.location.pathname}?track=${order.orderId || order.order_id}`
                    )}`}
                    className="share-sms-btn"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '5px 10px',
                      fontSize: '11px',
                      backgroundColor: '#3b82f6',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      textDecoration: 'none',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}
                  >
                    <Send size={11} />
                    SMS
                  </a>
                </div>
              </div>

              <div className="info-card">
                <h4><Package size={16} /> Order & Product Details</h4>
                <div className="info-row">
                  <span className="label">SKU:</span>
                  <span className="value code-text">{order.sku}</span>
                </div>
                <div className="info-row">
                  <span className="label">Payout:</span>
                  <span className="value price">₹{order.payout}</span>
                </div>
                <div className="info-row">
                  <span className="label">Payment Type:</span>
                  <span className="value">{order.paymentType}</span>
                </div>
                <div className="info-row">
                  <span className="label">SLA Timeline:</span>
                  <span className={`value sla-badge ${sla.class}`}>{sla.text}</span>
                </div>
              </div>

              {/* Assignment & Management (Disabled if read-only) */}
              <div className="info-card management-card">
                <h4><Clock size={16} /> Management & Assignment</h4>
                
                {readOnly ? (
                  <>
                    <div className="info-row">
                      <span className="label">Job Status:</span>
                      <span className={`badge job-status-${order.jobStatus.toLowerCase().replace(/\s+/g, '-')}`}>
                        {order.jobStatus}
                      </span>
                    </div>
                    <div className="info-row">
                      <span className="label">Delivery Status:</span>
                      <span className={`badge delivery-${order.deliveryStatus.toLowerCase().replace(/\s+/g, '-')}`}>
                        {order.deliveryStatus}
                      </span>
                    </div>
                    <div className="info-row">
                      <span className="label">Assigned Carpenter:</span>
                      <span className="value">{order.assignedCarpenter || 'Unassigned'}</span>
                    </div>
                    <div className="info-row">
                      <span className="label">Payment Status:</span>
                      <span className="value">{order.paymentStatus}</span>
                    </div>
                  </>
                ) : (
                  <div className="management-form">
                    <div className="form-group">
                      <label>Assigned Carpenter</label>
                      <select 
                        value={assignedCarpenter} 
                        onChange={(e) => setAssignedCarpenter(e.target.value)}
                      >
                        <option value="">-- Select Carpenter --</option>
                        {carpenters.map(c => {
                          const servesArea = c.pincodes && c.pincodes.includes(order.pincode);
                          const workload = getActiveWorkload(c.name);
                          const isAtCapacity = workload >= MAX_ACTIVE_JOBS;
                          return (
                            <option key={c.id} value={c.name} style={{ color: isAtCapacity ? '#9ca3af' : 'inherit' }}>
                              {c.name} ({c.rank}) — {servesArea ? '✅ Serves Area' : '❌ Out of Area'} ({workload}/{MAX_ACTIVE_JOBS} Jobs) {isAtCapacity ? '⚠️ AT CAPACITY' : ''}
                            </option>
                          );
                        })}
                      </select>

                      {/* Pincode Matching Banners */}
                      {assignedCarpenter && (() => {
                        const selectedCarp = carpenters.find(c => c.name === assignedCarpenter);
                        const servesPincode = selectedCarp && selectedCarp.pincodes && selectedCarp.pincodes.includes(order.pincode);
                        const workload = getActiveWorkload(assignedCarpenter);
                        const isAtCapacity = workload >= MAX_ACTIVE_JOBS;

                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {servesPincode ? (
                              <div className="pincode-success-banner" style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '10px 12px',
                                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                                border: '1px solid var(--color-success, #22c55e)',
                                borderRadius: '6px',
                                color: 'var(--color-success, #22c55e)',
                                fontSize: '12px',
                                marginTop: '8px'
                              }}>
                                <CheckCircle size={16} />
                                <span>{assignedCarpenter} serves pincode {order.pincode}.</span>
                              </div>
                            ) : (
                              <div className="pincode-warning-banner" style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '10px 12px',
                                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid var(--color-danger, #ef4444)',
                                borderRadius: '6px',
                                color: 'var(--color-danger, #ef4444)',
                                fontSize: '12px',
                                marginTop: '8px'
                              }}>
                                <AlertTriangle size={16} />
                                <span><strong>Warning:</strong> {assignedCarpenter} does not serve pincode {order.pincode}!</span>
                              </div>
                            )}

                            {isAtCapacity && (
                              <div className="pincode-warning-banner" style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '10px 12px',
                                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                                border: '1px solid #f59e0b',
                                borderRadius: '6px',
                                color: '#d97706',
                                fontSize: '12px',
                                marginTop: '4px',
                                marginBottom: '8px'
                              }}>
                                <AlertTriangle size={16} />
                                <span><strong>Warning:</strong> {assignedCarpenter} is at capacity ({workload}/{MAX_ACTIVE_JOBS} active jobs). Auto-allocation will skip them until completed.</span>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>

                    <div className="form-group">
                      <label>Job Status</label>
                      <select 
                        value={jobStatus} 
                        onChange={(e) => setJobStatus(e.target.value)}
                      >
                        <option value="Unassigned">Unassigned</option>
                        <option value="Assigned">Assigned</option>
                        <option value="On Hold - Parts Requested">On Hold - Parts Requested</option>
                        <option value="Completed">Completed</option>
                      </select>
                    </div>

                    {/* Conditional parts fields if On Hold */}
                    {jobStatus === 'On Hold - Parts Requested' && (
                      <div className="parts-request-fields">
                        <div className="form-group">
                          <label>Parts List Required</label>
                          <input 
                            type="text" 
                            placeholder="e.g. 2x Dowels, Bracket"
                            value={partsList}
                            onChange={(e) => setPartsList(e.target.value)}
                          />
                        </div>
                        <div className="form-group">
                          <label>Damage Photo URL</label>
                          <input 
                            type="text" 
                            placeholder="https://images.unsplash.com/..."
                            value={damagePhoto}
                            onChange={(e) => setDamagePhoto(e.target.value)}
                          />
                        </div>
                        <div className="form-group">
                          <label>Carpenter Comments</label>
                          <textarea 
                            placeholder="Describe the defect/damage..."
                            value={carpenterComments}
                            onChange={(e) => setCarpenterComments(e.target.value)}
                            rows={3}
                          />
                        </div>
                      </div>
                    )}

                    <div className="form-group">
                      <label>Delivery Status</label>
                      <select 
                        value={deliveryStatus} 
                        onChange={(e) => setDeliveryStatus(e.target.value)}
                      >
                        <option value="Pending">Pending</option>
                        <option value="Out for Delivery">Out for Delivery</option>
                        <option value="Delivered">Delivered</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Payment Status</label>
                      <select 
                        value={paymentStatus} 
                        onChange={(e) => setPaymentStatus(e.target.value)}
                      >
                        <option value="Unpaid">Unpaid</option>
                        <option value="Paid">Paid</option>
                      </select>
                    </div>

                    <button 
                      type="button" 
                      className="save-fields-btn" 
                      onClick={handleSaveFieldChanges}
                    >
                      Save Assignment & Status
                    </button>
                    {(order.jobStatus === 'Completed' || order.deliveryStatus === 'Cancelled' || order.status === 'Completed' || order.deliveryStatus === 'Cancelled') && (
                      <button 
                        type="button" 
                        className="save-fields-btn" 
                        style={{ backgroundColor: order.archived ? '#10b981' : '#4b5563', marginTop: '8px', cursor: 'pointer' }}
                        onClick={() => {
                          updateOrder(order.orderId, { archived: !order.archived });
                          alert(order.archived ? 'Order restored from archive successfully!' : 'Order archived successfully!');
                          onUpdate();
                          onClose();
                        }}
                      >
                        {order.archived ? 'Restore from Archive' : 'Archive Order'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Timeline & Comments */}
            <div className="modal-col-activity">
              {/* Audit Logs */}
              <div className="activity-card audit-timeline">
                <h4><History size={16} /> Live Audit Logs</h4>
                <div className="timeline-list">
                  {(order.auditLogs || []).map((log, idx) => (
                    <div key={idx} className="timeline-item">
                      <div className="timeline-marker"></div>
                      <div className="timeline-content">
                        <div className="timeline-meta">
                          <span className="log-action">{log.action}</span>
                          <span className="log-time">
                            {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="log-details">{log.comments}</div>
                        <div className="log-user">By: {log.user}</div>
                      </div>
                    </div>
                  ))}
                  {(!order.auditLogs || order.auditLogs.length === 0) && (
                    <p className="no-activity">No audit logs recorded.</p>
                  )}
                </div>
              </div>

              {/* Comments Thread */}
              <div className="activity-card comments-thread">
                <h4><MessageSquare size={16} /> Comments Thread</h4>
                <div className="comments-list">
                  {(order.comments || []).map((c, idx) => (
                    <div key={idx} className="comment-item">
                      <div className="comment-header">
                        <span className="comment-author">{c.author}</span>
                        <span className="comment-time">
                          {new Date(c.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="comment-body">{c.text}</div>
                    </div>
                  ))}
                  {(!order.comments || order.comments.length === 0) && (
                    <p className="no-activity">No comments yet. Start the conversation below.</p>
                  )}
                </div>

                <form onSubmit={handleAddComment} className="comment-form">
                  <input 
                    type="text" 
                    placeholder="Type a comment..." 
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                  />
                  <button type="submit" className="comment-btn">
                    <Plus size={16} /> Add
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
