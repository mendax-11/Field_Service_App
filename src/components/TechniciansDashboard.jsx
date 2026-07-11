// src/components/TechniciansDashboard.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  UserCheck, MapPin, Plus, X, Briefcase,
  AlertCircle, Upload, FileText, Edit, Trash2, Smartphone,
  Download, Search, RefreshCw, ChevronDown, ChevronUp, Replace, Calendar
} from 'lucide-react';
import {
  getCarpenters, saveCarpenters, getOrders,
  addCarpenterPincode, removeCarpenterPincode,
  replaceCarpenterPincodes, clearCarpenterPincodes,
  addNotification, addCarpenter, updateCarpenter, deleteCarpenter,
  exportCarpentersCSV, getActiveWorkload, MAX_ACTIVE_JOBS
} from '../utils/stateManager';

const CARPENTER_CSV_TEMPLATE = `Name,Phone,Rank,Pincodes
David Miller,+91-95555-01234,Expert,90265;62704;11375
Emma Watson,+91-95555-05678,Intermediate,11201;45202
Robert Clark,+91-95555-09012,Apprentice,90028`;

// How many pincode tags to show before collapsing
const PINCODE_PREVIEW_COUNT = 20;

// ─── PincodeManager — virtualized pincode card section ───────────────────────
function PincodeManager({ carp, onRefresh }) {
  const [pinSearch, setPinSearch]       = useState('');
  const [showAll, setShowAll]           = useState(false);
  const [singlePin, setSinglePin]       = useState('');
  const [showReplace, setShowReplace]   = useState(false);
  const [replaceText, setReplaceText]   = useState('');
  const [replaceLoading, setReplaceLoading] = useState(false);

  const pincodes = carp.pincodes || [];
  const totalCount = pincodes.length;

  const filtered = pinSearch.trim()
    ? pincodes.filter(p => p.toLowerCase().includes(pinSearch.toLowerCase()))
    : pincodes;

  const visible = showAll ? filtered : filtered.slice(0, PINCODE_PREVIEW_COUNT);

  const handleAddSingle = (e) => {
    e.preventDefault();
    const val = singlePin.trim();
    if (!val) return;
    if (!/^[a-zA-Z0-9\s-]+$/.test(val)) {
      alert('Please enter a valid alphanumeric pincode.');
      return;
    }
    const success = addCarpenterPincode(carp.id, val);
    if (success) {
      addNotification(`Pincode ${val} added to ${carp.name}'s areas.`, '', 'Admin');
      setSinglePin('');
      onRefresh();
    } else {
      alert('Pincode is already served by this technician.');
    }
  };

  const handleRemove = (pin) => {
    removeCarpenterPincode(carp.id, pin);
    onRefresh();
  };

  const handleClearAll = () => {
    if (!window.confirm(`Remove ALL ${totalCount} pincodes from ${carp.name}? This cannot be undone.`)) return;
    clearCarpenterPincodes(carp.id);
    addNotification(`All pincodes cleared for ${carp.name}.`, '', 'Admin');
    onRefresh();
  };

  const handleReplaceAll = () => {
    setReplaceLoading(true);
    const lines = replaceText
      .split(/[\n,;|]+/)
      .map(p => p.trim())
      .filter(p => p && /^[a-zA-Z0-9\s-]+$/.test(p));

    if (lines.length === 0) {
      alert('No valid pincodes found. Use newlines, commas, or semicolons to separate them.');
      setReplaceLoading(false);
      return;
    }
    const count = replaceCarpenterPincodes(carp.id, lines);
    addNotification(`Replaced pincodes for ${carp.name} — ${count} pincodes loaded.`, '', 'Admin');
    setShowReplace(false);
    setReplaceText('');
    setReplaceLoading(false);
    onRefresh();
  };

  return (
    <div className="pincodes-management-section">
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
        <h5 style={{ margin: 0 }}>
          <MapPin size={13} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
          Served Pincodes
          <span style={{
            marginLeft: '8px', background: 'var(--admin-border-color)',
            borderRadius: '12px', padding: '1px 8px', fontSize: '11px',
            fontWeight: '700', color: 'var(--admin-text-secondary)'
          }}>
            {totalCount.toLocaleString()}
          </span>
        </h5>
        <div style={{ display: 'flex', gap: '5px' }}>
          <button
            type="button"
            className="template-btn"
            style={{ padding: '3px 8px', fontSize: '10px' }}
            onClick={() => setShowReplace(r => !r)}
            title="Replace all pincodes from a bulk paste"
          >
            <Replace size={11} style={{ marginRight: '3px' }} />
            Replace All
          </button>
          {totalCount > 0 && (
            <button
              type="button"
              className="template-btn"
              style={{ padding: '3px 8px', fontSize: '10px', color: 'var(--color-danger)' }}
              onClick={handleClearAll}
              title="Remove all pincodes"
            >
              <Trash2 size={11} style={{ marginRight: '3px' }} />
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Replace-all panel */}
      {showReplace && (
        <div style={{
          background: 'var(--admin-bg-input)', border: '1px solid var(--admin-border-color)',
          borderRadius: '8px', padding: '12px', marginBottom: '10px'
        }}>
          <p style={{ fontSize: '11px', color: 'var(--admin-text-secondary)', margin: '0 0 8px 0' }}>
            Paste pincodes separated by newlines, commas, semicolons, or pipes. This will <strong>replace</strong> the entire list.
          </p>
          <textarea
            rows={5}
            value={replaceText}
            onChange={e => setReplaceText(e.target.value)}
            placeholder={"110001\n110002\n110003\nor: 110001;110002;110003"}
            style={{
              width: '100%', background: 'var(--admin-bg-card)',
              border: '1px solid var(--admin-border-color)', color: 'var(--admin-text-primary)',
              borderRadius: '6px', padding: '8px', fontSize: '12px',
              fontFamily: 'monospace', resize: 'vertical', boxSizing: 'border-box'
            }}
          />
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <button className="import-submit-btn" style={{ flex: 1, padding: '7px' }} onClick={handleReplaceAll} disabled={replaceLoading}>
              {replaceLoading ? 'Replacing…' : `Replace with ${replaceText.split(/[\n,;|]+/).filter(p => p.trim()).length} pincodes`}
            </button>
            <button className="template-btn" style={{ padding: '7px 12px' }} onClick={() => { setShowReplace(false); setReplaceText(''); }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Search (only shown when there are enough pincodes) */}
      {totalCount > PINCODE_PREVIEW_COUNT && (
        <div style={{ position: 'relative', marginBottom: '8px' }}>
          <Search size={12} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--admin-text-secondary)' }} />
          <input
            type="text"
            placeholder={`Search ${totalCount.toLocaleString()} pincodes…`}
            value={pinSearch}
            onChange={e => setPinSearch(e.target.value)}
            style={{
              width: '100%', paddingLeft: '28px', paddingRight: '8px',
              padding: '6px 8px 6px 28px', background: 'var(--admin-bg-input)',
              border: '1px solid var(--admin-border-color)', color: 'var(--admin-text-primary)',
              borderRadius: '6px', fontSize: '12px', outline: 'none', boxSizing: 'border-box'
            }}
          />
        </div>
      )}

      {/* Pincode tag cloud — virtualized */}
      <div className="pincode-tags-container">
        {totalCount === 0 ? (
          <div className="no-pincodes-warning">
            <AlertCircle size={14} />
            <span>No areas served. Technician cannot be auto-allocated.</span>
          </div>
        ) : (
          <>
            {visible.map(pin => (
              <span key={pin} className="pincode-tag">
                <MapPin size={10} style={{ marginRight: '2px' }} />
                {pin}
                <button
                  type="button"
                  className="remove-pin-btn"
                  onClick={() => handleRemove(pin)}
                  title={`Remove ${pin}`}
                >
                  <X size={10} />
                </button>
              </span>
            ))}

            {/* Show-more / show-less toggle */}
            {filtered.length > PINCODE_PREVIEW_COUNT && (
              <button
                type="button"
                className="template-btn"
                style={{ fontSize: '11px', padding: '3px 10px', alignSelf: 'center' }}
                onClick={() => setShowAll(s => !s)}
              >
                {showAll
                  ? <><ChevronUp size={11} /> Show less</>
                  : <><ChevronDown size={11} /> +{(filtered.length - PINCODE_PREVIEW_COUNT).toLocaleString()} more</>
                }
              </button>
            )}

            {pinSearch && filtered.length === 0 && (
              <span style={{ fontSize: '11px', color: 'var(--admin-text-secondary)', padding: '4px 0' }}>
                No pincodes match "{pinSearch}"
              </span>
            )}
          </>
        )}
      </div>

      {/* Single pincode add form */}
      <form onSubmit={handleAddSingle} className="add-pincode-form" style={{ marginTop: '8px' }}>
        <input
          type="text"
          placeholder="Add pincode…"
          value={singlePin}
          onChange={e => setSinglePin(e.target.value)}
          maxLength={12}
          className="pincode-input"
        />
        <button type="submit" className="add-pincode-submit" disabled={!singlePin.trim()}>
          <Plus size={14} /> Add
        </button>
      </form>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function TechniciansDashboard({ refreshTrigger, onRefresh }) {
  const [carpenters, setCarpenters]       = useState([]);
  const [showImporter, setShowImporter]   = useState(false);
  const [csvText, setCsvText]             = useState('');
  const [importStatus, setImportStatus]   = useState(null); // { type, msg }
  const fileInputRef                      = useRef(null);

  // Schedule timeline states
  const [openSchedules, setOpenSchedules] = useState([]);

  // Add/Edit modal
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [editingCarpenter, setEditingCarpenter] = useState(null);
  const [carpenterForm, setCarpenterForm] = useState({
    name: '', phone: '', rank: 'Expert', maxActiveJobs: 3, qualityScore: 100, pincodes: ''
  });

  const toggleSchedule = (carpId) => {
    setOpenSchedules(prev => 
      prev.includes(carpId) ? prev.filter(id => id !== carpId) : [...prev, carpId]
    );
  };

  const getNext7Days = () => {
    const days = [];
    const now = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
      days.push(d);
    }
    return days;
  };

  const getJobsForDay = (carpName, date) => {
    const orders = getOrders();
    const dateString = date.toDateString();
    
    return orders.filter(o => {
      if (o.assignedCarpenter !== carpName) return false;
      if (o.jobStatus === 'Completed' || o.status === 'Completed') return false;
      
      const targetDate = o.deliveryDate || o.promiseDate;
      if (!targetDate) return false;
      return new Date(targetDate).toDateString() === dateString;
    });
  };

  const loadData = useCallback(() => {
    setCarpenters(getCarpenters());
  }, []);

  useEffect(() => { loadData(); }, [refreshTrigger, loadData]);

  useEffect(() => {
    window.addEventListener('fsa_storage_update', loadData);
    return () => window.removeEventListener('fsa_storage_update', loadData);
  }, [loadData]);

  // ── File Upload ─────────────────────────────────────────────────────────────
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { // 10 MB guard
      alert('File is too large (> 10 MB). Please split your CSV into smaller files.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCsvText(ev.target.result || '');
      setImportStatus({ type: 'info', msg: `Loaded: ${file.name} (${(file.size / 1024).toFixed(1)} KB)` });
    };
    reader.onerror = () => setImportStatus({ type: 'error', msg: 'Could not read file.' });
    reader.readAsText(file, 'UTF-8');
    // Reset input so same file can be re-selected
    e.target.value = '';
  };

  // ── CSV Import Parser ────────────────────────────────────────────────────────
  const handleImportCSV = (e) => {
    e.preventDefault();
    if (!csvText.trim()) {
      setImportStatus({ type: 'error', msg: 'Please enter or load some CSV data first.' });
      return;
    }

    try {
      // Handle both \r\n (Windows) and \n (Unix) line endings
      const lines = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
      if (lines.length <= 1) {
        setImportStatus({ type: 'error', msg: 'Invalid CSV: need at least a header row and one data row.' });
        return;
      }

      const currentCarpenters = [...getCarpenters()];
      let importedCount = 0;
      let updatedCount  = 0;
      let skippedCount  = 0;

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Simple CSV split (handles quoted cells too)
        const columns = line.split(',');
        if (columns.length < 2) { skippedCount++; continue; }

        const name  = columns[0].trim().replace(/^"|"$/g, '');
        const phone = columns[1].trim().replace(/^"|"$/g, '');

        if (phone.toLowerCase() === 'phone' || name.toLowerCase() === 'name') continue;
        if (!phone || !name) { skippedCount++; continue; }

        const rank    = (columns[2] || 'Expert').trim().replace(/^"|"$/g, '') || 'Expert';
        // Column 4 — pincodes
        const pinCol  = (columns[3] || '').replace(/^"|"$/g, '');
        const pincodes = pinCol
          .split(/[;|\s]+/)
          .map(p => p.trim())
          .filter(p => p && /^[a-zA-Z0-9-]+$/.test(p));

        const cleanPhone = phone.replace(/[^0-9]/g, '');
        const generatedEmail = `${cleanPhone || Date.now()}@timberflow.in`;

        const existingIndex = currentCarpenters.findIndex(
        const parts = lines[i].split(',').map(s => s.trim().replace(/^"|"$/g, ''));
        // Expecting: Name, Phone, Email, Rank, MaxJobs, QualityScore, Pincodes
        const [name, phone, email, rank, maxJobsStr, qualityStr, pinsStr] = parts;
        if (!name || !phone) { skips++; continue; }
        
        let existing = existingCarps.find(c => c.phone === phone);
        if (existing) {
          updateCarpenter(existing.id, { 
            name, email, rank: rank || 'Expert', 
            maxActiveJobs: Number(maxJobsStr) || existing.maxActiveJobs || 3,
            qualityScore: Number(qualityStr) || existing.qualityScore || 100
          });
          if (pinsStr) bulkAddCarpenterPincodes(existing.id, pinsStr.split(';'));
          updates++;
        } else {
          addCarpenter({ 
            name, phone, email, rank: rank || 'Expert', 
            maxActiveJobs: Number(maxJobsStr) || 3,
            qualityScore: Number(qualityStr) || 100,
            pincodes: pinsStr ? pinsStr.split(';') : []
          });
          importedCount++;
        }
      }

      saveCarpenters(getCarpenters());
      addNotification(`Imported ${importedCount} new, updated ${updates} technicians.`, '', 'Admin');
      setCsvText('');
      setShowImporter(false);
      loadData();
      if (onRefresh) onRefresh();
      setImportStatus({ type: 'success', msg: `✅ Done — ${importedCount} new, ${updates} updated.` });
    } catch (err) {
      setImportStatus({ type: 'error', msg: 'Error parsing CSV.' });
    }
  };

  // ── Export ───────────────────────────────────────────────────────────────────
  const handleExport = () => {
    const count = exportCarpentersCSV();
    addNotification(`Exported ${count} technicians to CSV.`, '', 'Admin');
  };

  // ── Add/Edit Modal ───────────────────────────────────────────────────────────
  const handleOpenAddModal = () => {
    setEditingCarpenter(null);
    setCarpenterForm({ name: '', phone: '', rank: 'Expert', maxActiveJobs: 3, qualityScore: 100, pincodes: '' });
    setShowAddEditModal(true);
  };

  const handleOpenEditModal = (carp) => {
    setEditingCarpenter(carp);
    setCarpenterForm({
      name: carp.name, phone: carp.phone || carp.id, rank: carp.rank, maxActiveJobs: carp.maxActiveJobs || 3, qualityScore: carp.qualityScore || 100, pincodes: ''
    });
    setShowAddEditModal(true);
  };

  const handleDeleteCarpenter = (carpId, carpName) => {
    if (window.confirm(`Delete technician "${carpName}"? This cannot be undone.`)) {
      const success = deleteCarpenter(carpId);
      if (success) {
        addNotification(`Technician ${carpName} deleted.`, '', 'Admin');
        loadData();
        if (onRefresh) onRefresh();
      }
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    const { name, phone, rank, maxActiveJobs, qualityScore, pincodes } = carpenterForm;
    if (!name.trim() || !phone.trim()) {
      alert('Please fill out all required fields.');
      return;
    }
    const phoneTrimmed = phone.trim();
    if (!/^\+?[0-9\s-]{8,20}$/.test(phoneTrimmed)) {
      alert('Please enter a valid phone number (at least 8 digits).');
      return;
    }

    const currentCarpenters = getCarpenters();
    if (currentCarpenters.some(c => (c.phone === phoneTrimmed || c.id === phoneTrimmed) && (!editingCarpenter || c.id !== editingCarpenter.id))) {
      alert('A technician with this phone number already exists.'); return;
    }

    const cleanPhone = phoneTrimmed.replace(/[^0-9]/g, '');
    const generatedEmail = `${cleanPhone || Date.now()}@timberflow.in`;

    if (editingCarpenter) {
      updateCarpenter(editingCarpenter.id, { name: name.trim(), phone: phoneTrimmed, email: generatedEmail, rank, maxActiveJobs: Number(maxActiveJobs), qualityScore: Number(qualityScore) });
      if (pincodes.trim()) bulkAddCarpenterPincodes(editingCarpenter.id, pincodes.split(/[\n,;|]+/).map(p => p.trim()).filter(Boolean));
      addNotification(`Technician ${name} updated.`, '', 'Admin');
    } else {
      addCarpenter({ name: name.trim(), phone: phoneTrimmed, email: generatedEmail, rank, maxActiveJobs: Number(maxActiveJobs), qualityScore: Number(qualityScore), pincodes: pincodes.split(/[,;\n|]+/).map(p => p.trim()).filter(p => p && /^[a-zA-Z0-9-]+$/.test(p)) });
      addNotification(`New technician ${name} created.`, '', 'Admin');
    }

    setShowAddEditModal(false);
    loadData();
    if (onRefresh) onRefresh();
  };



  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="technicians-dashboard-container">
      {/* Sub-header */}
      <div className="dashboard-sub-header">
        <div>
          <h3><UserCheck size={22} /> Technician Coverage &amp; Areas</h3>
          <p className="subtitle">
            Configure served pincodes and track workload metrics. Supports bulk import/export — even 2,000+ pincodes per technician.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={handleOpenAddModal} className="add-pincode-submit" style={{ padding: '8px 14px', borderRadius: '8px' }}>
            <Plus size={14} /> Add Technician
          </button>
          <button onClick={() => { setShowImporter(!showImporter); setImportStatus(null); }} className="import-toggle-btn">
            <Upload size={14} /> {showImporter ? 'Hide Importer' : 'Import CSV'}
          </button>
          <button onClick={handleExport} className="import-toggle-btn" title="Download all technicians as a CSV file">
            <Download size={14} /> Export CSV
          </button>
          <span className="hold-count-badge">{carpenters.length} Specialists</span>
        </div>
      </div>

      {/* ── CSV Importer Panel ─── */}
      {showImporter && (
        <div className="carpenter-importer-card card-style animate-fade-in">
          <div className="importer-card-header">
            <div className="card-header-icon-title">
              <Upload size={18} className="theme-accent" />
              <h4>CSV Technician Importer</h4>
            </div>
            <button type="button" className="close-importer-btn" onClick={() => setShowImporter(false)}>
              <X size={16} />
            </button>
          </div>

          <p className="card-desc">
            Columns: <code>Name, Phone, Email, Rank, Pincodes</code>. Separate pincodes with <code>;</code> or <code>|</code>.
            Importing the same phone/email will <strong>merge</strong> (add new pincodes). Works with 2,000+ pincode rows.
          </p>

          {/* Status banner */}
          {importStatus && (
            <div style={{
              padding: '8px 12px', borderRadius: '6px', fontSize: '12px', marginBottom: '10px',
              background: importStatus.type === 'success' ? 'rgba(16,185,129,0.12)'
                        : importStatus.type === 'error'   ? 'rgba(239,68,68,0.12)'
                        :                                   'rgba(59,130,246,0.12)',
              color: importStatus.type === 'success' ? '#10b981'
                   : importStatus.type === 'error'   ? '#ef4444'
                   :                                   '#3b82f6',
              border: `1px solid ${importStatus.type === 'success' ? 'rgba(16,185,129,0.3)'
                       : importStatus.type === 'error'   ? 'rgba(239,68,68,0.3)'
                       :                                   'rgba(59,130,246,0.3)'}`
            }}>
              {importStatus.msg}
            </div>
          )}

          {/* Action buttons row */}
          <div className="template-btn-row" style={{ flexWrap: 'wrap', gap: '8px' }}>
            <button onClick={() => { setCsvText(CARPENTER_CSV_TEMPLATE); setImportStatus(null); }} className="template-btn active">
              <FileText size={14} /> Load Template
            </button>
            {/* File picker */}
            <button onClick={() => fileInputRef.current?.click()} className="template-btn">
              <Upload size={14} /> Browse File (.csv)
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              style={{ display: 'none' }}
              onChange={handleFileUpload}
            />
            <button onClick={() => { setCsvText(''); setImportStatus(null); }} className="template-btn">
              Clear
            </button>
            {csvText && (
              <span style={{ fontSize: '11px', color: 'var(--admin-text-secondary)', alignSelf: 'center' }}>
                {csvText.split('\n').filter(l => l.trim()).length - 1} data rows loaded
              </span>
            )}
          </div>

          <div className="csv-textarea-wrapper">
            <textarea
              value={csvText}
              onChange={e => setCsvText(e.target.value)}
              placeholder={"Name,Phone,Email,Rank,MaxJobs,QualityScore,Pincodes\nJohn Doe,+91-98765-43210,john@service.com,Expert,5,98,110001;110002;110003"}
              rows={6}
            />
          </div>

          <button onClick={handleImportCSV} className="import-submit-btn">
            <RefreshCw size={14} style={{ marginRight: '6px' }} />
            Parse &amp; Import Technicians
          </button>
        </div>
      )}

      {/* ── Technician Cards Grid ─── */}
      <div className="technicians-grid">
        {carpenters.length === 0 && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px', color: 'var(--admin-text-secondary)' }}>
            <UserCheck size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
            <p>No technicians yet. Import a CSV or add one manually.</p>
          </div>
        )}
        {carpenters.map(carp => {
          const workload = getActiveWorkload(carp.name);
          return (
            <div key={carp.id} className="technician-card card-style">
              {/* Card Header */}
              <div className="tech-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div className="avatar-placeholder"><UserCheck size={24} /></div>
                  <div className="tech-meta-details">
                    <h4 style={{ margin: '0 0 4px 0' }}>{carp.name}</h4>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span className="rank-badge">{carp.rank}</span>
                      <span className="quality-badge" style={{
                        fontSize: '10px', padding: '2px 6px', borderRadius: '4px',
                        background: carp.qualityScore >= 90 ? 'rgba(34, 197, 94, 0.1)' : carp.qualityScore >= 75 ? 'rgba(234, 179, 8, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        color: carp.qualityScore >= 90 ? 'var(--color-success, #22c55e)' : carp.qualityScore >= 75 ? 'var(--color-warning, #eab308)' : 'var(--color-danger, #ef4444)',
                        fontWeight: '600'
                      }}>
                        ★ {carp.qualityScore || 100} Score
                      </span>
                    </div>
                  </div>
                </div>
                <div className="tech-actions" style={{ display: 'flex', gap: '4px' }}>
                  <button 
                    type="button" 
                    className={`close-importer-btn ${openSchedules.includes(carp.id) ? 'active' : ''}`}
                    title="View 7-day Schedule" 
                    onClick={() => toggleSchedule(carp.id)} 
                    style={{ padding: '6px', borderRadius: '4px' }}
                  >
                    <Calendar size={14} />
                  </button>
                  <button type="button" className="close-importer-btn" title="Edit" onClick={() => handleOpenEditModal(carp)} style={{ padding: '6px', borderRadius: '4px' }}>
                    <Edit size={14} />
                  </button>
                  <button type="button" className="close-importer-btn" title="Delete" style={{ color: 'var(--color-danger)', padding: '6px', borderRadius: '4px' }} onClick={() => handleDeleteCarpenter(carp.id, carp.name)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className="tech-info-rows">
                <div className="info-item"><Smartphone size={14} className="info-icon" /><span className="info-text">{carp.phone || carp.id}</span></div>
                <div className="info-item">
                  <Briefcase size={14} className="info-icon" />
                  <span className="info-text">
                    Active Jobs: <strong style={{ color: workload >= (carp.maxActiveJobs || MAX_ACTIVE_JOBS) ? 'var(--color-danger, #ef4444)' : 'inherit' }}>{workload} / {carp.maxActiveJobs || MAX_ACTIVE_JOBS}</strong>
                    {workload >= (carp.maxActiveJobs || MAX_ACTIVE_JOBS) && (
                      <span className="capacity-badge-inline" style={{
                        marginLeft: '8px', fontSize: '9px', padding: '2px 6px',
                        background: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-danger, #ef4444)',
                        borderRadius: '3px', fontWeight: 'bold', textTransform: 'uppercase'
                      }}>
                        At Capacity
                      </span>
                    )}
                  </span>
                </div>
              </div>

              {/* 7-day Schedule Timeline */}
              {openSchedules.includes(carp.id) && (
                <div className="tech-schedule-timeline">
                  <h5>7-Day Work Schedule</h5>
                  <div className="timeline-days-container">
                    {getNext7Days().map((day, idx) => {
                      const dayJobs = getJobsForDay(carp.name, day);
                      const isToday = idx === 0;
                      const count = dayJobs.length;
                      
                      let statusClass = 'free';
                      if (count === 1) statusClass = 'assigned';
                      else if (count === 2) statusClass = 'in-progress';
                      else if (count >= 3) statusClass = 'breached';

                      return (
                        <div key={idx} className={`timeline-day-col ${isToday ? 'today' : ''} ${statusClass}`}>
                          <div className="day-label">
                            {day.toLocaleDateString('en-IN', { weekday: 'short' }).slice(0, 3)}
                            <span className="day-date">{day.getDate()}</span>
                          </div>
                          <div className={`day-jobs-count count-${statusClass}`} title={`${count} jobs scheduled`}>
                            {count > 0 ? (
                              <div className="job-dots">
                                {dayJobs.map(job => (
                                  <span 
                                    key={job.orderId} 
                                    className="job-dot"
                                    title={`Order: ${job.orderId}\nCustomer: ${job.customerName}\nPincode: ${job.pincode}`}
                                  ></span>
                                ))}
                              </div>
                            ) : (
                              <span className="free-indicator">•</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Virtualized Pincode Manager */}
              <PincodeManager carp={carp} onRefresh={loadData} />
            </div>
          );
        })}
      </div>

      {/* ── Add / Edit Modal ─── */}
      {showAddEditModal && (
        <div className="modal-overlay" onClick={() => setShowAddEditModal(false)}>
          <div className="modal-content" style={{ maxWidth: '460px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-area">
                <h3>{editingCarpenter ? 'Edit Technician Details' : 'Add New Technician'}</h3>
              </div>
              <button className="close-btn" onClick={() => setShowAddEditModal(false)}><X size={20} /></button>
            </div>

            <form onSubmit={handleFormSubmit} className="management-form" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {[
                { label: 'Name',  key: 'name',  type: 'text',  placeholder: 'e.g. John Doe' },
                { label: 'Phone', key: 'phone', type: 'text',  placeholder: 'e.g. +91 98765 43210' }
              ].map(f => (
                <div key={f.key} className="form-group">
                  <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--admin-text-secondary)', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>{f.label}</label>
                  <input
                    type={f.type} value={carpenterForm[f.key]} required placeholder={f.placeholder}
                    onChange={e => setCarpenterForm({ ...carpenterForm, [f.key]: e.target.value })}
                    style={{ width: '100%', background: 'var(--admin-bg-input)', border: '1px solid var(--admin-border-color)', color: 'var(--admin-text-primary)', borderRadius: '6px', padding: '10px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              ))}
              
              <div className="form-group" style={{ flex: 1, minWidth: '140px' }}>
                <label>Quality Score (0-100)</label>
                <input 
                  type="number" min="0" max="100" required
                  value={carpenterForm.qualityScore}
                  onChange={(e) => setCarpenterForm({ ...carpenterForm, qualityScore: Number(e.target.value) })}
                  className="modal-input"
                />
              </div>
            
              <div className="form-group">
                <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--admin-text-secondary)', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>Rank / Level</label>
                <select
                  value={carpenterForm.rank}
                  onChange={e => setCarpenterForm({ ...carpenterForm, rank: e.target.value })}
                  style={{ width: '100%', background: 'var(--admin-bg-input)', border: '1px solid var(--admin-border-color)', color: 'var(--admin-text-primary)', borderRadius: '6px', padding: '10px', fontSize: '13px', outline: 'none', cursor: 'pointer' }}
                >
                  <option value="Expert">Expert</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Apprentice">Apprentice</option>
                </select>
              </div>

              <div className="form-group">
                <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--admin-text-secondary)', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>Max Active Jobs</label>
                <input
                  type="number"
                  value={carpenterForm.maxActiveJobs}
                  min="1"
                  max="20"
                  required
                  onChange={e => setCarpenterForm({ ...carpenterForm, maxActiveJobs: e.target.value })}
                  style={{ width: '100%', background: 'var(--admin-bg-input)', border: '1px solid var(--admin-border-color)', color: 'var(--admin-text-primary)', borderRadius: '6px', padding: '10px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              {!editingCarpenter && (
                <div className="form-group">
                  <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--admin-text-secondary)', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>Initial Pincodes (comma or semicolon separated)</label>
                  <input
                    type="text" value={carpenterForm.pincodes} placeholder="e.g. 110001, 110002, 110003"
                    onChange={e => setCarpenterForm({ ...carpenterForm, pincodes: e.target.value })}
                    style={{ width: '100%', background: 'var(--admin-bg-input)', border: '1px solid var(--admin-border-color)', color: 'var(--admin-text-primary)', borderRadius: '6px', padding: '10px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <button type="button" onClick={() => setShowAddEditModal(false)} className="import-toggle-btn" style={{ flex: 1, justifyContent: 'center', padding: '10px' }}>Cancel</button>
                <button type="submit" className="add-pincode-submit" style={{ flex: 1, justifyContent: 'center', padding: '10px', borderRadius: '6px' }}>
                  {editingCarpenter ? 'Save Changes' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
