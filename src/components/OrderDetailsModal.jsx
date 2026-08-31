// src/components/OrderDetailsModal.jsx
import { useState, useEffect } from 'react';
import { 
  X, User, Package, Clock, 
  MessageSquare, History, Plus, AlertTriangle, CheckCircle, Send, IndianRupee, Download, Trash2
} from 'lucide-react';
import { updateOrder, saveOrders, addComment, getUserRole, getActiveWorkload, MAX_ACTIVE_JOBS, addCarpenterPincode, removeCarpenterPincode, fsaQueries, normalizeOrder, stateManager, isActiveOrder } from '../utils/stateManager';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export default function OrderDetailsModal({ order, onClose, onUpdate, readOnly = false }) {
  const queryClient = useQueryClient();
  const { data: carpentersData = { items: [] }, refetch: refetchCarpenters } = useQuery(fsaQueries.carpenters.all(1, 500));
  const carpenters = carpentersData.items || [];
  
  // Fetch full details of the order to get the heavy fields (photos/signature) that were excluded in the grid payload
  const detailLookupId = order?.pbRecordId || order?.recordId || order?.id || '';
  const { data: fullOrderRaw } = useQuery({
    ...fsaQueries.orders.detail(detailLookupId),
    enabled: !!detailLookupId
  });
  const fullOrder = fullOrderRaw ? normalizeOrder(fullOrderRaw) : null;
  const hasPhotoEvidence = (slot) => {
    if (!slot) return false;
    if (Array.isArray(slot)) return slot.filter(Boolean).length > 0;
    return Boolean(slot);
  };
  const mergePhotoEvidence = (fullSlot, fallbackSlot) => (
    hasPhotoEvidence(fullSlot) ? fullSlot : (hasPhotoEvidence(fallbackSlot) ? fallbackSlot : null)
  );
  
  // Merge the base order with the fetched heavy fields
  const displayOrder = fullOrder
    ? {
        ...order,
        photos: {
          before: mergePhotoEvidence(fullOrder.photos?.before, order.photos?.before),
          after: mergePhotoEvidence(fullOrder.photos?.after, order.photos?.after)
        },
        signature: fullOrder.signature || order.signature,
        damagePhotos: fullOrder.damagePhotos || fullOrder.damage_photos || order.damagePhotos,
        damage_photos: fullOrder.damage_photos || fullOrder.damagePhotos || order.damage_photos,
        damageReport: fullOrder.damageReport || fullOrder.damage_report || order.damageReport,
        damage_report: fullOrder.damage_report || fullOrder.damageReport || order.damage_report
      }
    : order;
  const getPhotoList = (slot) => {
    if (!slot) return [];
    if (Array.isArray(slot)) return slot.filter(Boolean);
    return [slot].filter(Boolean);
  };
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
  const [evidenceOverride, setEvidenceOverride] = useState(null);

  const userRole = getUserRole();
  const activeEvidenceOrder = evidenceOverride || displayOrder;
  const beforePhotos = getPhotoList(activeEvidenceOrder.photos?.before);
  const afterPhotos = getPhotoList(activeEvidenceOrder.photos?.after);
  const replacementPhotos = getPhotoList(activeEvidenceOrder.damagePhotos || activeEvidenceOrder.damage_photos || activeEvidenceOrder.damageReport?.damagePhotos || activeEvidenceOrder.damage_report?.damagePhotos);

  const getSafeFilePart = (value, fallback) => {
    const clean = String(value || fallback || '')
      .trim()
      .replace(/[^a-z0-9]+/gi, '_')
      .replace(/^_+|_+$/g, '');
    return clean || fallback;
  };

  const getImageExtension = (src) => {
    if (typeof src !== 'string') return 'jpg';
    const dataMatch = src.match(/^data:image\/([a-z0-9.+-]+);/i);
    if (dataMatch) return dataMatch[1].replace('jpeg', 'jpg').replace('svg+xml', 'svg');
    const path = src.split('?')[0].split('#')[0];
    const extMatch = path.match(/\.([a-z0-9]+)$/i);
    return extMatch ? extMatch[1] : 'jpg';
  };

  const getEvidenceFileName = (type, idx, src) => {
    const orderPart = getSafeFilePart(activeEvidenceOrder.orderId || order.orderId, 'order');
    const customerPart = getSafeFilePart(activeEvidenceOrder.customerName || order.customerName, 'customer');
    return `${orderPart}_${customerPart}_${type}_${idx + 1}.${getImageExtension(src)}`;
  };

  const triggerImageDownload = (href, filename) => {
    const link = document.createElement('a');
    link.href = href;
    link.download = filename;
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadImage = async (photo, type, idx) => {
    const filename = getEvidenceFileName(type, idx, photo);
    try {
      const response = await fetch(photo);
      if (!response.ok) throw new Error('Image download failed');
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      triggerImageDownload(objectUrl, filename);
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch {
      triggerImageDownload(photo, filename);
    }
  };

  const evidenceGroups = [
    { type: 'before', label: 'Before', photos: beforePhotos },
    { type: 'after', label: 'After', photos: afterPhotos },
    { type: 'replacement', label: 'Replacement', photos: replacementPhotos }
  ];

  const allEvidencePhotos = evidenceGroups.flatMap(group =>
    group.photos.map((photo, idx) => ({ ...group, photo, idx }))
  );

  const handleDownloadEvidenceGroup = async (type = 'all') => {
    const targets = type === 'all'
      ? allEvidencePhotos
      : allEvidencePhotos.filter(item => item.type === type);

    for (const item of targets) {
      await handleDownloadImage(item.photo, item.type, item.idx);
    }
  };

  const normalizePhotoSlot = (photos) => {
    if (photos.length === 0) return null;
    return photos.length === 1 ? photos[0] : photos;
  };

  const persistEvidenceUpdate = (updatedFields) => {
    const updatedOrder = updateOrder(order.orderId, updatedFields);
    if (updatedOrder) return updatedOrder;

    const fallbackOrder = normalizeOrder({ ...activeEvidenceOrder, ...updatedFields });
    const localOrders = stateManager.getOrders();
    const existingIndex = localOrders.findIndex(o => o.orderId === order.orderId || o.order_id === order.orderId || o.id === order.orderId);
    const nextOrders = existingIndex === -1
      ? [...localOrders, fallbackOrder]
      : localOrders.map((localOrder, idx) => idx === existingIndex ? fallbackOrder : localOrder);
    saveOrders(nextOrders, fallbackOrder);
    return fallbackOrder;
  };

  const handleDeleteEvidenceImage = (type, idx) => {
    if (readOnly) return;
    if (!confirm(`Delete ${type} photo ${idx + 1} from this order? Download it first if you need to keep a copy.`)) {
      return;
    }

    const nextPhotos = {
      ...(activeEvidenceOrder.photos || {}),
      before: activeEvidenceOrder.photos?.before || null,
      after: activeEvidenceOrder.photos?.after || null
    };
    let updatedFields;

    if (type === 'before') {
      const updatedBefore = beforePhotos.filter((_, photoIdx) => photoIdx !== idx);
      nextPhotos.before = normalizePhotoSlot(updatedBefore);
      updatedFields = { photos: nextPhotos };
    } else if (type === 'after') {
      const updatedAfter = afterPhotos.filter((_, photoIdx) => photoIdx !== idx);
      nextPhotos.after = normalizePhotoSlot(updatedAfter);
      updatedFields = { photos: nextPhotos };
    } else {
      const updatedDamagePhotos = replacementPhotos.filter((_, photoIdx) => photoIdx !== idx);
      const currentDamageReport = activeEvidenceOrder.damageReport || activeEvidenceOrder.damage_report || null;
      const nextDamageReport = currentDamageReport
        ? {
            ...currentDamageReport,
            damagePhotos: updatedDamagePhotos,
            photo: updatedDamagePhotos[0] || ''
          }
        : currentDamageReport;
      updatedFields = {
        damagePhotos: updatedDamagePhotos,
        damage_photos: updatedDamagePhotos,
        damagePhoto: updatedDamagePhotos[0] || '',
        damageReport: nextDamageReport,
        damage_report: nextDamageReport
      };
    }

    const timestamp = new Date().toISOString();
    updatedFields.auditLogs = [
      ...(activeEvidenceOrder.auditLogs || order.auditLogs || []),
      {
        timestamp,
        action: 'Evidence Photo Deleted',
        user: userRole,
        comments: `${type.charAt(0).toUpperCase() + type.slice(1)} photo ${idx + 1} deleted for storage cleanup.`
      }
    ];

    const updatedOrder = persistEvidenceUpdate(updatedFields);
    setEvidenceOverride(updatedOrder || { ...activeEvidenceOrder, ...updatedFields });
    queryClient.invalidateQueries({ queryKey: ['orders'] });
    onUpdate();
  };

  const buildEvidenceDeleteFields = (typesToDelete) => {
    const nextPhotos = {
      ...(activeEvidenceOrder.photos || {}),
      before: activeEvidenceOrder.photos?.before || null,
      after: activeEvidenceOrder.photos?.after || null
    };
    const updatedFields = {};

    if (typesToDelete.includes('before')) {
      nextPhotos.before = null;
      updatedFields.photos = nextPhotos;
    }

    if (typesToDelete.includes('after')) {
      nextPhotos.after = null;
      updatedFields.photos = nextPhotos;
    }

    if (typesToDelete.includes('replacement')) {
      const currentDamageReport = activeEvidenceOrder.damageReport || activeEvidenceOrder.damage_report || null;
      const nextDamageReport = currentDamageReport
        ? { ...currentDamageReport, damagePhotos: [], photo: '' }
        : currentDamageReport;

      updatedFields.damagePhotos = [];
      updatedFields.damage_photos = [];
      updatedFields.damagePhoto = '';
      updatedFields.damageReport = nextDamageReport;
      updatedFields.damage_report = nextDamageReport;
    }

    return updatedFields;
  };

  const handleDeleteEvidenceGroup = (type = 'all') => {
    if (readOnly) return;
    const typesToDelete = type === 'all'
      ? evidenceGroups.filter(group => group.photos.length > 0).map(group => group.type)
      : [type];
    const deleteCount = evidenceGroups
      .filter(group => typesToDelete.includes(group.type))
      .reduce((sum, group) => sum + group.photos.length, 0);

    if (deleteCount === 0) return;

    const label = type === 'all'
      ? 'all evidence photos'
      : `${type} evidence photos`;

    if (!confirm(`Delete ${deleteCount} ${label} from this order? Download them first if you need to keep copies.`)) {
      return;
    }

    const updatedFields = buildEvidenceDeleteFields(typesToDelete);
    const timestamp = new Date().toISOString();
    updatedFields.auditLogs = [
      ...(activeEvidenceOrder.auditLogs || order.auditLogs || []),
      {
        timestamp,
        action: 'Evidence Photos Bulk Deleted',
        user: userRole,
        comments: `${deleteCount} ${label} deleted for storage cleanup.`
      }
    ];

    const updatedOrder = persistEvidenceUpdate(updatedFields);
    setEvidenceOverride(updatedOrder || { ...activeEvidenceOrder, ...updatedFields });
    queryClient.invalidateQueries({ queryKey: ['orders'] });
    onUpdate();
  };

  const renderEvidencePhoto = (photo, type, idx, label) => (
    <div key={`${type}-${idx}`} className="evidence-media-item">
      <div className="evidence-media-thumb">
        <img src={photo} alt={`${label} ${idx + 1}`} />
        <div className="evidence-media-actions">
          <button
            type="button"
            className="evidence-icon-btn"
            title={`Download ${label.toLowerCase()} photo`}
            onClick={() => handleDownloadImage(photo, type, idx)}
          >
            <Download size={13} />
          </button>
          {!readOnly && (
            <button
              type="button"
              className="evidence-icon-btn danger"
              title={`Delete ${label.toLowerCase()} photo`}
              onClick={() => handleDeleteEvidenceImage(type, idx)}
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>
      <span className="evidence-media-label">
        {label} {idx + 1}
      </span>
    </div>
  );

  useEffect(() => {
    refetchCarpenters();
  }, [refetchCarpenters]);

  useEffect(() => {
    setEvidenceOverride(null);
  }, [order.orderId]);

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

  const getSelectedCarpenter = () => {
    if (!assignedCarpenter) return null;
    return carpenters.find(c => c.name === assignedCarpenter)
      || carpenters.find(c => c.username === assignedCarpenter)
      || { id: assignedCarpenter, name: assignedCarpenter, pincodes: [] };
  };

  const updateCarpenterPincodeCache = (carpenterId, nextPincodes) => {
    queryClient.setQueriesData({ queryKey: ['carpenters'] }, old => {
      if (!old?.items) return old;
      return {
        ...old,
        items: old.items.map(carp =>
          carp.id === carpenterId || carp.name === assignedCarpenter
            ? { ...carp, pincodes: nextPincodes }
            : carp
        )
      };
    });
  };

  const handleAuthorizeArea = (event, selectedCarp = getSelectedCarpenter()) => {
    event?.preventDefault();
    event?.stopPropagation();

    const cleanPincode = String(pincode || '').trim();
    if (!cleanPincode) {
      alert('Please enter a pincode before authorizing the area.');
      return;
    }
    if (!selectedCarp) {
      alert('Please select a carpenter before authorizing the area.');
      return;
    }

    const success = addCarpenterPincode(selectedCarp.id, cleanPincode, selectedCarp);
    if (!success) {
      alert('Unable to authorize this area. Please reselect the carpenter and try again.');
      return;
    }

    updateCarpenterPincodeCache(selectedCarp.id, [
      ...new Set([...(selectedCarp.pincodes || []), cleanPincode])
    ]);
  };

  const handleRemoveAuthorizedArea = (event, selectedCarp = getSelectedCarpenter()) => {
    event?.preventDefault();
    event?.stopPropagation();

    const cleanPincode = String(pincode || '').trim();
    if (!cleanPincode) {
      alert('Please enter a pincode before removing the area.');
      return;
    }
    if (!selectedCarp) {
      alert('Please select a carpenter before removing the area.');
      return;
    }

    if (confirm(`Remove pincode ${cleanPincode} from ${assignedCarpenter}'s authorized areas?`)) {
      const success = removeCarpenterPincode(selectedCarp.id, cleanPincode, selectedCarp);
      if (!success) {
        alert('Unable to remove this area. Please reselect the carpenter and try again.');
        return;
      }

      updateCarpenterPincodeCache(
        selectedCarp.id,
        (selectedCarp.pincodes || []).filter(pin => pin !== cleanPincode)
      );
    }
  };

  const handleSaveFieldChanges = () => {
    const nextJobStatus = assignedCarpenter ? jobStatus : 'Unassigned';

    if (assignedCarpenter && !isActiveOrder({ ...order, assignedCarpenter, jobStatus: nextJobStatus, deliveryStatus })) {
      alert('This order is cancelled, completed, or archived and cannot be assigned to a technician.');
      return;
    }

    const updatedFields = {
      assignedCarpenter: assignedCarpenter || null,
      jobStatus: nextJobStatus,
      deliveryStatus,
      paymentStatus,
      assignmentHold: !assignedCarpenter,
      assignment_hold: !assignedCarpenter,
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
    const targetCharge = (order.extraCharges || []).find(ec => ec.id === chargeId);
    if (!targetCharge) {
      alert('Could not find this claim. Refresh the order and try again.');
      return;
    }
    if (targetCharge.status && targetCharge.status !== 'Pending Approval') {
      alert('This claim is already resolved.');
      return;
    }

    const timestamp = new Date().toISOString();
    const updatedCharges = (order.extraCharges || []).map(ec => {
      if (ec.id === chargeId) {
        return {
          ...ec,
          status: resolution,
          payoutApplied: resolution === 'Approved',
          resolvedAt: timestamp,
          resolvedBy: userRole
        };
      }
      return ec;
    });

    const amountVal = Number(targetCharge.amount || 0);

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
      updatedFields.payoutAmount = currentPayout + amountVal;
      updatedFields.assembly_payout = currentPayout + amountVal;
      updatedFields.assembly_amount = currentPayout + amountVal;
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
      <div
        className="modal-content order-details-modal"
        style={{
          width: 'min(1040px, calc(100vw - 40px))',
          maxWidth: 'calc(100vw - 40px)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
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
                                  onPointerDown={(e) => e.stopPropagation()}
                                  onMouseDown={(e) => e.stopPropagation()}
                                  onClick={(e) => {
                                    handleRemoveAuthorizedArea(e, selectedCarp);
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
                                  onPointerDown={(e) => e.stopPropagation()}
                                  onMouseDown={(e) => e.stopPropagation()}
                                  onClick={(e) => {
                                    handleAuthorizeArea(e, selectedCarp);
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
                    {replacementPhotos.length > 0 && (
                      <div className="admin-field-group" style={{ marginTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px' }}>
                        <div className="evidence-section-header">
                          <label style={{ fontSize: '11px', fontWeight: '600', color: '#ef4444', textTransform: 'uppercase' }}>Replacement Evidence ({replacementPhotos.length} Photos)</label>
                          <div className="evidence-bulk-actions">
                            <button type="button" onClick={() => handleDownloadEvidenceGroup('replacement')}>
                              <Download size={12} /> Download
                            </button>
                            {!readOnly && (
                              <button type="button" className="danger" onClick={() => handleDeleteEvidenceGroup('replacement')}>
                                <Trash2 size={12} /> Delete
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="evidence-media-grid">
                          {replacementPhotos.map((photo, idx) => renderEvidencePhoto(photo, 'replacement', idx, 'Replacement'))}
                        </div>
                      </div>
                    )}

                    {/* Completion Photos & Signature */}
                    {(beforePhotos.length > 0 || afterPhotos.length > 0 || displayOrder.signature) && (
                      <div className="section-block details-media-grid" style={{ marginTop: '16px', marginBottom: '24px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px' }}>
                        <div className="evidence-section-header">
                          <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--admin-text-secondary)', textTransform: 'uppercase' }}>Completion Evidence</label>
                          <div className="evidence-bulk-actions">
                            {(beforePhotos.length > 0 || afterPhotos.length > 0) && (
                              <button type="button" onClick={() => handleDownloadEvidenceGroup('all')}>
                                <Download size={12} /> Download All
                              </button>
                            )}
                            {beforePhotos.length > 0 && !readOnly && (
                              <button type="button" className="danger" onClick={() => handleDeleteEvidenceGroup('before')}>
                                <Trash2 size={12} /> Before
                              </button>
                            )}
                            {afterPhotos.length > 0 && !readOnly && (
                              <button type="button" className="danger" onClick={() => handleDeleteEvidenceGroup('after')}>
                                <Trash2 size={12} /> After
                              </button>
                            )}
                            {allEvidencePhotos.length > 0 && !readOnly && (
                              <button type="button" className="danger" onClick={() => handleDeleteEvidenceGroup('all')}>
                                <Trash2 size={12} /> All
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="media-row evidence-media-row">
                          {beforePhotos.map((photo, idx) => renderEvidencePhoto(photo, 'before', idx, 'Before'))}

                          {afterPhotos.map((photo, idx) => renderEvidencePhoto(photo, 'after', idx, 'After'))}

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
