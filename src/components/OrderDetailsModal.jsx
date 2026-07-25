// src/components/OrderDetailsModal.jsx
import { useState, useEffect } from 'react';
import { 
  X, User, Package, Clock, 
  MessageSquare, History, Plus, AlertTriangle, CheckCircle, Send, IndianRupee
} from 'lucide-react';
import { updateOrder, addComment, getUserRole, getActiveWorkload, MAX_ACTIVE_JOBS, addCarpenterPincode, removeCarpenterPincode, fsaQueries } from '../utils/stateManager';
import { useQuery } from '@tanstack/react-query';

export default function OrderDetailsModal({ order, onClose, onUpdate, readOnly = false }) {
  const { data: carpentersData = { items: [] }, refetch: refetchCarpenters } = useQuery(fsaQueries.carpenters.all(1, 500));
  const carpenters = carpentersData.items || [];
  
  // Fetch full details of the order to get the heavy fields (photos/signature) that were excluded in the grid payload
  const { data: fullOrderRaw } = useQuery({
    ...fsaQueries.orders.detail(order?.id || ''),
    enabled: !!order?.id
  });
  
  // Merge the base order with the fetched heavy fields
  const displayOrder = fullOrderRaw ? { ...order, photos: fullOrderRaw.photos || order.photos, signature: fullOrderRaw.signature || order.signature } : order;

  const [newComment, setNewComment] = useState('');
  const [assignedCarpenter, setAssignedCarpenter] = useState(order.assignedCarpenter || '');
  const [jobStatus, setJobStatus] = useState(order.jobStatus || 'Unassigned');
  const [deliveryStatus, setDeliveryStatus] = useState(order.deliveryStatus || 'Pending');
  const [paymentStatus, setPaymentStatus] = useState(order.paymentStatus || 'Unpaid');
  
  // Extra fields for Parts Requested
  const [partsList, setPartsList] = useState(order.partsList || '');
  const [carpenterComments, setCarpenterComments] = useState(order.carpenterComments || '');
  const [damagePhoto, setDamagePhoto] = useState(order.damagePhoto || '');

  // Customer details states
  const [customerName, setCustomerName] = useState(order.customerName || '');
  const [customerPhone, setCustomerPhone] = useState(order.customerPhone || '');
  const [customerAddress, setCustomerAddress] = useState(order.customerAddress || '');
  const [pincode, setPincode] = useState(order.pincode || '');
  const [city, setCity] = useState(order.city || '');
  const [state, setState] = useState(order.state || '');

  const userRole = getUserRole();

  useEffect(() => {
    refetchCarpenters();
  }, [refetchCarpenters]);

  const handleAddComment = (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    const author = userRole;
    addComment(order.orderId, newComment.trim(), author);
    setNewComment('');
    onUpdate();
  };

  const handleCarpenterSelectChange = (val) => {
    setAssignedCarpenter(val);
    if (val) {
      if (jobStatus === 'Unassigned') {
        setJobStatus('Assigned');
      }
    } else {
      if (jobStatus === 'Assigned') {
        setJobStatus('Unassigned');
      }
    }
  };

  const handleSaveFieldChanges = () => {
    const updatedFields = {
      assignedCarpenter: assignedCarpenter || null,
      jobStatus,
      deliveryStatus,
      paymentStatus,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerAddress: customerAddress.trim(),
      pincode: pincode.trim(),
      city: city.trim(),
      state: state.trim()
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
    if (order.customerName !== updatedFields.customerName) {
      changes.push(`Customer Name: ${order.customerName || 'None'} -> ${updatedFields.customerName || 'None'}`);
    }
    if (order.customerPhone !== updatedFields.customerPhone) {
      changes.push(`Customer Phone: ${order.customerPhone || 'None'} -> ${updatedFields.customerPhone || 'None'}`);
    }
    if (order.customerAddress !== updatedFields.customerAddress) {
      changes.push(`Customer Address updated`);
    }
    if (order.pincode !== updatedFields.pincode) {
      changes.push(`Pincode: ${order.pincode || 'None'} -> ${updatedFields.pincode || 'None'}`);
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

  // Resolve Extra Charge claim (Approve or Reject)
  const handleResolveExtraCharge = (chargeId, resolution) => {
    const updatedCharges = (order.extraCharges || []).map(ec => {
      if (ec.id === chargeId) {
        return { ...ec, status: resolution };
      }
      return ec;
    });

    const targetCharge = (order.extraCharges || []).find(ec => ec.id === chargeId);
    const amountVal = targetCharge ? targetCharge.amount : 0;
    const timestamp = new Date().toISOString();

    const updatedFields = {
      extraCharges: updatedCharges,
      auditLogs: [
        ...(order.auditLogs || []),
        {
          timestamp,
          action: resolution === 'Approved' ? 'Extra Charge Approved' : 'Extra Charge Rejected',
          user: userRole,
          comments: `${resolution === 'Approved' ? 'Approved' : 'Rejected'} extra charge of ₹${amountVal} for ${targetCharge ? targetCharge.type : 'Expense'}.`
        }
      ]
    };

    // If approved, add it to the payout total
    if (resolution === 'Approved' && amountVal > 0) {
      const currentPayout = Number(order.payout || order.assembly_payout || 0);
      updatedFields.payout = currentPayout + amountVal;
      updatedFields.assembly_payout = currentPayout + amountVal;
    }

    updateOrder(order.orderId, updatedFields);
    
    // Add comment
    addComment(
      order.orderId,
      `System: Extra charge request of ₹${amountVal} has been ${resolution.toLowerCase()} by ${userRole}.`,
      'System'
    );

    alert(`Claim ${resolution.toLowerCase()} successfully!`);
    onUpdate();
    onClose();
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
      <div className="modal-content order-details-modal" onClick={(e) => e.stopPropagation()}>
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
                {readOnly ? (
                  <>
                    <div className="info-row">
                      <span className="label">Name:</span>
                      <span className="value">{order.customerName}</span>
                    </div>
                    <div className="info-row">
                      <span className="label">Phone:</span>
                      <span className="value">{order.customerPhone}</span>
                    </div>
                    <div className="info-row">
                      <span className="label">Address:</span>
                      <span className="value">{order.customerAddress || 'No address provided'}</span>
                    </div>
                    <div className="info-row">
                      <span className="label">Location:</span>
                      <span className="value">
                        {[order.city, order.state, order.pincode].filter(Boolean).join(', ') || 'N/A'}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="customer-edit-fields" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: '11px', marginBottom: '2px', color: 'var(--text-muted)' }}>Customer Name</label>
                      <input 
                        type="text" 
                        value={customerName} 
                        onChange={(e) => setCustomerName(e.target.value)} 
                        className="form-input"
                        style={{ padding: '6px 10px', fontSize: '12px' }}
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: '11px', marginBottom: '2px', color: 'var(--text-muted)' }}>Customer Phone</label>
                      <input 
                        type="text" 
                        value={customerPhone} 
                        onChange={(e) => setCustomerPhone(e.target.value)} 
                        className="form-input"
                        style={{ padding: '6px 10px', fontSize: '12px' }}
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: '11px', marginBottom: '2px', color: 'var(--text-muted)' }}>Address</label>
                      <textarea 
                        value={customerAddress} 
                        onChange={(e) => setCustomerAddress(e.target.value)} 
                        className="form-input"
                        rows={2}
                        style={{ padding: '6px 10px', fontSize: '12px', resize: 'vertical', fontFamily: 'inherit' }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <div className="form-group" style={{ margin: 0, flex: 1 }}>
                        <label style={{ fontSize: '11px', marginBottom: '2px', color: 'var(--text-muted)' }}>City</label>
                        <input 
                          type="text" 
                          value={city} 
                          onChange={(e) => setCity(e.target.value)} 
                          className="form-input"
                          style={{ padding: '6px 10px', fontSize: '12px' }}
                        />
                      </div>
                      <div className="form-group" style={{ margin: 0, flex: 1 }}>
                        <label style={{ fontSize: '11px', marginBottom: '2px', color: 'var(--text-muted)' }}>State</label>
                        <input 
                          type="text" 
                          value={state} 
                          onChange={(e) => setState(e.target.value)} 
                          className="form-input"
                          style={{ padding: '6px 10px', fontSize: '12px' }}
                        />
                      </div>
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: '11px', marginBottom: '2px', color: 'var(--text-muted)' }}>Pincode</label>
                      <input 
                        type="text" 
                        value={pincode} 
                        onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').substring(0, 6))} 
                        placeholder="6-digit Pincode"
                        className="form-input"
                        style={{ padding: '6px 10px', fontSize: '12px' }}
                      />
                    </div>
                  </div>
                )}
                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                  <a
                    href={`https://wa.me/${(customerPhone || '').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                      `Hello ${customerName || 'Customer'}, you can track the status of your assembly job here: ${window.location.origin}${window.location.pathname}?track=${order.orderId || order.order_id}`
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
                    href={`sms:${customerPhone}?body=${encodeURIComponent(
                      `Hello ${customerName || 'Customer'}, you can track the status of your assembly job here: ${window.location.origin}${window.location.pathname}?track=${order.orderId || order.order_id}`
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
                {order.otp && (
                  <div className="info-row" style={{ backgroundColor: 'rgba(245, 158, 11, 0.05)', borderRadius: '4px', padding: '2px 4px' }}>
                    <span className="label" style={{ color: 'var(--color-warning, #f59e0b)' }}>Verification OTP:</span>
                    <span className="value code-text" style={{ color: 'var(--color-warning, #f59e0b)', fontWeight: 'bold' }}>{order.otp}</span>
                  </div>
                )}
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
                        onChange={(e) => handleCarpenterSelectChange(e.target.value)}
                      >
                        <option value="">-- Select Carpenter --</option>
                        {carpenters
                          .map(c => ({
                            ...c,
                            servesArea: c.pincodes && c.pincodes.includes(pincode),
                            workload: getActiveWorkload(c.name)
                          }))
                          .sort((a, b) => {
                            if (a.servesArea && !b.servesArea) return -1;
                            if (!a.servesArea && b.servesArea) return 1;
                            return a.workload - b.workload;
                          })
                          .map(c => {
                            const limit = Number(c.maxActiveJobs || c.max_active_jobs || MAX_ACTIVE_JOBS);
                            const isAtCapacity = c.workload >= limit;
                            return (
                              <option key={c.id} value={c.name} style={{ color: isAtCapacity ? '#9ca3af' : 'inherit' }}>
                                {c.name} ({c.rank}) - {c.servesArea ? 'Serves Area' : 'Out of Area'} ({c.workload}/{limit} Jobs){isAtCapacity ? ' max' : ''}
                              </option>
                            );
                          })
                        }
                      </select>

                      {/* Pincode Matching Banners */}
                      {assignedCarpenter && (() => {
                        const selectedCarp = carpenters.find(c => c.name === assignedCarpenter);
                        const servesPincode = selectedCarp && selectedCarp.pincodes && selectedCarp.pincodes.includes(pincode);
                        const workload = getActiveWorkload(assignedCarpenter);
                        const isAtCapacity = workload >= MAX_ACTIVE_JOBS;

                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {servesPincode ? (
                              <div className="pincode-success-banner" style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '8px',
                                padding: '10px 12px',
                                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                                border: '1px solid var(--color-success, #22c55e)',
                                borderRadius: '6px',
                                color: 'var(--color-success, #22c55e)',
                                fontSize: '12px',
                                marginTop: '8px'
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <CheckCircle size={16} />
                                  <span>{assignedCarpenter} serves pincode {pincode}.</span>
                                </div>
                                <button
                                  type="button"
                                  style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'var(--color-danger, #ef4444)',
                                    fontSize: '11px',
                                    cursor: 'pointer',
                                    fontWeight: 'bold',
                                    textDecoration: 'underline',
                                    padding: '2px 4px'
                                  }}
                                  onClick={() => {
                                    if (confirm(`Remove pincode ${pincode} from ${assignedCarpenter}'s authorized areas?`)) {
                                      removeCarpenterPincode(selectedCarp.id, pincode);
                                      refetchCarpenters();
                                    }
                                  }}
                                >
                                  Remove Area
                                </button>
                              </div>
                            ) : (
                              <div className="pincode-warning-banner" style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '8px',
                                padding: '10px 12px',
                                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid var(--color-danger, #ef4444)',
                                borderRadius: '6px',
                                color: 'var(--color-danger, #ef4444)',
                                fontSize: '12px',
                                marginTop: '8px'
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <AlertTriangle size={16} />
                                  <span><strong>Warning:</strong> {assignedCarpenter} does not serve pincode {pincode}!</span>
                                </div>
                                <button
                                  type="button"
                                  style={{
                                    backgroundColor: 'var(--color-danger, #ef4444)',
                                    color: '#ffffff',
                                    border: 'none',
                                    borderRadius: '4px',
                                    padding: '4px 8px',
                                    fontSize: '11px',
                                    cursor: 'pointer',
                                    fontWeight: 'bold'
                                  }}
                                  onClick={() => {
                                    addCarpenterPincode(selectedCarp.id, pincode);
                                    refetchCarpenters();
                                  }}
                                >
                                  + Authorize Area
                                </button>
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

                    {/* Extra Charge Reimbursement Requests */}
                    {order.extraCharges && order.extraCharges.length > 0 && (
                      <div className="form-group extra-charges-admin-panel" style={{ marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-info, #3b82f6)' }}>
                          <IndianRupee size={14} />
                          <span>Extra Reimbursement Claims</span>
                        </label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                          {order.extraCharges.map((ec) => {
                            const isPending = ec.status === 'Pending Approval';
                            const isApproved = ec.status === 'Approved';
                            const isRejected = ec.status === 'Rejected';
                            const statusColor = isApproved ? 'var(--color-success, #22c55e)' : (isRejected ? 'var(--color-danger, #ef4444)' : 'var(--color-warning, #f59e0b)');

                            return (
                              <div key={ec.id} style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', padding: '10px', borderRadius: '8px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '12px' }}>
                                  <span style={{ color: 'var(--text-primary)' }}>{ec.type}</span>
                                  <span style={{ color: statusColor }}>₹{ec.amount}</span>
                                </div>
                                <p style={{ margin: '4px 0 6px 0', fontSize: '11px', color: 'var(--text-muted)' }}>{ec.notes}</p>
                                
                                {ec.receipt && (
                                  <div style={{ marginBottom: '8px' }}>
                                    <a href={ec.receipt} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-info, #3b82f6)', textDecoration: 'underline', fontSize: '11px' }}>View Bill Receipt</a>
                                  </div>
                                )}

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px' }}>
                                  <span style={{ color: 'var(--text-muted)' }}>Requested: {new Date(ec.timestamp).toLocaleDateString('en-IN')}</span>
                                  <span style={{ padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(255,255,255,0.04)', color: statusColor, fontWeight: 'bold', textTransform: 'uppercase' }}>
                                    {ec.status}
                                  </span>
                                </div>

                                {isPending && !readOnly && (
                                  <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
                                    <button
                                      type="button"
                                      style={{
                                        flex: 1,
                                        backgroundColor: 'var(--color-success, #22c55e)',
                                        color: '#ffffff',
                                        border: 'none',
                                        borderRadius: '4px',
                                        padding: '4px 8px',
                                        fontSize: '11px',
                                        cursor: 'pointer',
                                        fontWeight: 'bold'
                                      }}
                                      onClick={() => handleResolveExtraCharge(ec.id, 'Approved')}
                                    >
                                      Approve
                                    </button>
                                    <button
                                      type="button"
                                      style={{
                                        flex: 1,
                                        backgroundColor: 'var(--color-danger, #ef4444)',
                                        color: '#ffffff',
                                        border: 'none',
                                        borderRadius: '4px',
                                        padding: '4px 8px',
                                        fontSize: '11px',
                                        cursor: 'pointer',
                                        fontWeight: 'bold'
                                      }}
                                      onClick={() => handleResolveExtraCharge(ec.id, 'Rejected')}
                                    >
                                      Reject
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Damage Report Evidence */}
                    {order.damagePhotos && order.damagePhotos.length > 0 && (
                      <div className="admin-field-group" style={{ marginTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px' }}>
                        <label style={{ fontSize: '11px', fontWeight: '600', color: '#ef4444', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Damage Evidence ({order.damagePhotos.length} Photos)</label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '8px' }}>
                          {order.damagePhotos.map((photo, idx) => (
                            <div key={idx} style={{ position: 'relative', height: '100px', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--admin-border-color)' }}>
                              <img src={photo} alt={`Damage Evidence ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              <span style={{ position: 'absolute', bottom: '2px', left: '2px', background: 'rgba(0,0,0,0.6)', color: 'white', fontSize: '9px', padding: '1px 4px', borderRadius: '2px' }}>Photo {idx + 1}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Completion Photos & Signature */}
                    {(displayOrder.photos?.before || displayOrder.photos?.after || displayOrder.signature) && (
                      <div className="section-block details-media-grid" style={{ marginTop: '16px', marginBottom: '24px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px' }}>
                        <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--admin-text-secondary)', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Completion Evidence</label>
                        <div className="media-row" style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '8px' }}>
                          
                          {displayOrder.photos?.before && (
                            <div className="media-item" style={{ flex: '0 0 auto', width: '120px' }}>
                              <div className="media-thumb" style={{ width: '120px', height: '120px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)', background: 'var(--bg-input)' }}>
                                <img src={displayOrder.photos.before} alt="Before" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              </div>
                              <span style={{ display: 'block', textAlign: 'center', fontSize: '11px', marginTop: '4px', color: 'var(--admin-text-secondary)' }}>Before</span>
                            </div>
                          )}

                          {displayOrder.photos?.after && (
                            <div className="media-item" style={{ flex: '0 0 auto', width: '120px' }}>
                              <div className="media-thumb" style={{ width: '120px', height: '120px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)', background: 'var(--bg-input)' }}>
                                <img src={displayOrder.photos.after} alt="After" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              </div>
                              <span style={{ display: 'block', textAlign: 'center', fontSize: '11px', marginTop: '4px', color: 'var(--admin-text-secondary)' }}>After</span>
                            </div>
                          )}

                        {displayOrder.signature && (
                          <div className="media-item signature" style={{ flex: '0 0 auto', minWidth: '160px' }}>
                            <div className="media-thumb" style={{ height: '120px', borderRadius: '8px', border: '1px solid var(--border-color)', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px' }}>
                              <img src={displayOrder.signature} alt="Signature" style={{ maxHeight: '80px', maxWidth: '100%' }} />
                            </div>
                            <span style={{ display: 'block', textAlign: 'center', fontSize: '11px', marginTop: '4px', color: 'var(--admin-text-secondary)' }}>Customer Sig</span>
                          </div>
                        )}
                        </div>
                      </div>
                    )}

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
