// src/components/CustomerPortal.jsx
import React, { useState, useEffect } from 'react';
import './CustomerPortal.css';
import { getOrders, updateOrder, triggerN8nWebhook } from '../stateManager';
import { ClipboardList, CheckCircle, Clock, Truck, AlertTriangle, Package, MapPin, Star, ExternalLink } from 'lucide-react';

const STATUS_STEPS = [
  { key: 'ordered',    label: 'Order Received',   icon: Package },
  { key: 'delivered',  label: 'Item Delivered',    icon: Truck },
  { key: 'assigned',   label: 'Tech Assigned',     icon: ClipboardList },
  { key: 'in_progress',label: 'Assembly Started',  icon: Clock },
  { key: 'completed',  label: 'Job Complete',       icon: CheckCircle },
];

function getStepIndex(order) {
  const s = (order.jobStatus || order.status || '').toLowerCase();
  if (s === 'completed') return 4;
  if (s === 'in progress') return 3;
  if (s === 'assigned') return 2;
  if (order.deliveryStatus === 'Delivered') return 1;
  return 0;
}

function formatDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return iso; }
}

function maskName(name) {
  if (!name) return 'Your Technician';
  const parts = name.split(' ');
  return parts[0]; // First name only — PII-safe
}

export default function CustomerPortal({ orderId }) {
  const [order, setOrder] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [rated, setRated] = useState(false);

  useEffect(() => {
    const orders = getOrders();
    const found = orders.find(
      o => o.orderId?.toLowerCase() === orderId?.toLowerCase() ||
           o.order_id?.toLowerCase() === orderId?.toLowerCase()
    );
    if (found) {
      setOrder(found);
    } else {
      setNotFound(true);
    }
  }, [orderId]);

  if (notFound) {
    return (
      <div className="cp-wrapper">
        <div className="cp-card cp-notfound">
          <div className="cp-notfound-icon"><AlertTriangle size={40} /></div>
          <h2>Order Not Found</h2>
          <p>We couldn't find order <strong>{orderId}</strong>. Please check your tracking ID or contact support.</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="cp-wrapper">
        <div className="cp-card">
          <div className="cp-loading">
            <div className="cp-spinner"></div>
            <p>Loading your order...</p>
          </div>
        </div>
      </div>
    );
  }

  const stepIndex = getStepIndex(order);
  const isCompleted = stepIndex === 4;
  const techName = maskName(order.assignedCarpenter || order.assigned_carpenter);
  const hasGps = order.gpsCoords && order.gpsCoords.lat && order.gpsCoords.lng;

  const handleRate = (stars) => {
    setRating(stars);
    setRated(true);

    const oldLogs = order.auditLogs || order.audit_logs || [];
    updateOrder(order.orderId, {
      rating: stars,
      auditLogs: [
        ...oldLogs,
        {
          timestamp: new Date().toISOString(),
          action: 'Customer Rated Job',
          user: 'Customer',
          comments: `Customer rated the assembly experience: ${stars} Stars.`
        }
      ]
    });

    triggerN8nWebhook('customer_rated', {
      orderId: order.orderId,
      customerName: order.customerName,
      customerPhone: order.customerPhone || '',
      rating: stars
    });
  };

  return (
    <div className="cp-wrapper">
      {/* Header */}
      <header className="cp-header">
        <div className="cp-header-brand">
          <div className="cp-header-icon"><ClipboardList size={20} /></div>
          <div>
            <h1>TimberFlow</h1>
            <span>Order Tracking</span>
          </div>
        </div>
        <div className={`cp-status-badge ${isCompleted ? 'completed' : 'active'}`}>
          {isCompleted ? '✓ Completed' : '● In Progress'}
        </div>
      </header>

      <main className="cp-main">
        {/* Order Summary Card */}
        <div className="cp-card cp-summary-card">
          <div className="cp-summary-row">
            <div className="cp-summary-item">
              <span className="cp-label">Order ID</span>
              <span className="cp-value cp-order-id">{order.orderId || order.order_id}</span>
            </div>
            <div className="cp-summary-item">
              <span className="cp-label">Product SKU</span>
              <span className="cp-value">{order.sku || order.product_sku || '—'}</span>
            </div>
          </div>
          <div className="cp-summary-row">
            <div className="cp-summary-item">
              <span className="cp-label">Promise Date</span>
              <span className="cp-value">{formatDate(order.promiseDate || order.promise_date)}</span>
            </div>
            <div className="cp-summary-item">
              <span className="cp-label">Delivery</span>
              <span className={`cp-value cp-delivery-badge ${order.deliveryStatus === 'Delivered' ? 'delivered' : 'pending'}`}>
                {order.deliveryStatus || 'Pending'}
              </span>
            </div>
          </div>
        </div>

        {/* Progress Timeline */}
        <div className="cp-card">
          <h3 className="cp-card-title">Assembly Progress</h3>
          <div className="cp-timeline">
            {STATUS_STEPS.map((step, idx) => {
              const Icon = step.icon;
              const isDone = idx <= stepIndex;
              const isCurrent = idx === stepIndex;
              return (
                <div key={step.key} className={`cp-step ${isDone ? 'done' : ''} ${isCurrent ? 'current' : ''}`}>
                  <div className="cp-step-icon-wrap">
                    <div className="cp-step-icon">
                      <Icon size={14} />
                    </div>
                    {idx < STATUS_STEPS.length - 1 && (
                      <div className={`cp-step-line ${isDone && idx < stepIndex ? 'filled' : ''}`}></div>
                    )}
                  </div>
                  <div className="cp-step-label">
                    <span className="cp-step-name">{step.label}</span>
                    {isCurrent && !isCompleted && (
                      <span className="cp-step-current-badge">Current</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Technician Card */}
        {order.assignedCarpenter && (
          <div className="cp-card cp-tech-card">
            <h3 className="cp-card-title">Your Technician</h3>
            <div className="cp-tech-row">
              <div className="cp-tech-avatar">
                {techName.charAt(0).toUpperCase()}
              </div>
              <div className="cp-tech-info">
                <strong>{techName}</strong>
                <span>Certified Assembly Technician</span>
                {hasGps && (
                  <a
                    href={`https://www.google.com/maps?q=${order.gpsCoords.lat},${order.gpsCoords.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="cp-track-link"
                  >
                    <MapPin size={12} />
                    Live Location
                    <ExternalLink size={11} />
                  </a>
                )}
                {!hasGps && !isCompleted && order.jobStatus === 'In Progress' && (
                  <span className="cp-eta-text">🚗 En route to your location</span>
                )}
              </div>
              <div className={`cp-tech-status ${order.jobStatus === 'In Progress' ? 'active' : 'idle'}`}>
                {order.jobStatus === 'In Progress' ? 'On-site' : 'Assigned'}
              </div>
            </div>
          </div>
        )}

        {/* Checklist Progress (public version) */}
        {order.checklist && order.checklist.length > 0 && (
          <div className="cp-card">
            <h3 className="cp-card-title">Assembly Checklist</h3>
            <div className="cp-checklist">
              {order.checklist.map((item, idx) => (
                <div key={idx} className={`cp-check-row ${item.checked ? 'checked' : ''}`}>
                  <div className={`cp-check-dot ${item.checked ? 'done' : ''}`}>
                    {item.checked && <CheckCircle size={13} />}
                  </div>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
            <div className="cp-checklist-progress">
              <div className="cp-cl-bar-bg">
                <div
                  className="cp-cl-bar-fill"
                  style={{ width: `${(order.checklist.filter(i => i.checked).length / order.checklist.length) * 100}%` }}
                ></div>
              </div>
              <span>{order.checklist.filter(i => i.checked).length} of {order.checklist.length} steps done</span>
            </div>
          </div>
        )}

        {/* Completion Proof */}
        {isCompleted && (
          <div className="cp-card cp-completion-card">
            <div className="cp-completion-icon"><CheckCircle size={36} /></div>
            <h3>Assembly Complete!</h3>
            <p>Your furniture has been successfully assembled by {techName}.</p>
            {order.photos?.after && (
              <div className="cp-proof-photo">
                <img src={order.photos.after} alt="Assembly complete proof" />
                <span>Final assembly photo</span>
              </div>
            )}
          </div>
        )}

        {/* Rating Card (after completion) */}
        {isCompleted && (
          <div className="cp-card cp-rating-card">
            <h3 className="cp-card-title">Rate Your Experience</h3>
            {rated ? (
              <div className="cp-rated-thanks">
                <CheckCircle size={24} />
                <p>Thank you for your feedback!</p>
              </div>
            ) : (
              <div className="cp-stars">
                {[1,2,3,4,5].map(star => (
                  <button
                    key={star}
                    type="button"
                    className={`cp-star ${(hoverRating || rating) >= star ? 'lit' : ''}`}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => handleRate(star)}
                  >
                    <Star size={28} />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="cp-footer">
          <p>Need help? Contact us at <strong>support@timberflow.in</strong></p>
          <p className="cp-tracking-id">Tracking ID: {orderId}</p>
        </div>
      </main>
    </div>
  );
}
