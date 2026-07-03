// src/components/AdminPortal.jsx
import { useState, useEffect } from 'react';
import './AdminPortal.css';
import { 
  ClipboardList, Package, HelpCircle, Bell, 
  Coins, UserCheck, ShieldAlert, Upload, Cpu, X,
  LayoutDashboard, Activity, AlertCircle, ShieldCheck, MapPin,
  Settings, Download
} from 'lucide-react';
import { 
  getOrders, getCarpenters, getUserRole, setUserRole, 
  getNotifications, clearNotifications, autoAllocateOrders, 
  saveOrders, addNotification, updateOrder, addOrder, checkSlaBreaches,
  getN8nConfig, saveN8nConfig,
  exportOrdersCSV
} from '../utils/stateManager';

import OrderGrid from './OrderGrid';
import InventoryDashboard from './InventoryDashboard';
import SupportPortal from './SupportPortal';
import TechniciansDashboard from './TechniciansDashboard';


// Templates for CSV Import
const CSV_TEMPLATES = {
  Amazon: `Order ID,Customer Name,Phone,SKU,Payout,Payment Type,Delivery Date
AMZ-4001,John Smith,+1-555-0111,SKU-OAK-DESK-01,150,Prepaid,2026-06-28T10:00:00Z
AMZ-4002,Bruce Wayne,+1-555-0122,SKU-MAHOGANY-TABLE-02,280,Prepaid,2026-06-27T14:00:00Z`,
  
  Flipkart: `Order ID,Customer Name,Phone,SKU,Payout,Payment Type,Delivery Date
FLIP-5001,Clark Kent,+1-555-0133,SKU-PINE-BED-04,320,COD,2026-06-26T16:00:00Z
FLIP-5002,Diana Prince,+1-555-0144,SKU-WALNUT-CHAIR-03,85,COD,2026-06-29T11:00:00Z`,
  
  WooCommerce: `Order ID,Customer Name,Phone,SKU,Payout,Payment Type,Delivery Date
WOO-6001,Tony Stark,+1-555-0155,SKU-BIRCH-CABINET-02,120,Prepaid,2026-06-25T18:00:00Z
WOO-6002,Barry Allen,+1-555-0166,SKU-OAK-TABLE-02,190,Prepaid,2026-06-30T09:00:00Z`
};

// Dormant settings-panel asset retained for the integrations tab.
const n8nBlueprintJSON = JSON.stringify({
  "name": "TimberFlow FSM Integration: WhatsApp Alerts & REST API Access",
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "timberflow-fsm-events",
        "options": {}
      },
      "id": "1d8b1842-8c88-466d-adcf-81b47fb59de9",
      "name": "TimberFlow Event Webhook",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1,
      "position": [250, 250]
    },
    {
      "parameters": {
        "dataType": "string",
        "value1": "={{$json.event}}",
        "rules": {
          "rules": [
            { "value2": "transit_started" },
            { "value2": "sla_breach_detected", "output": 1 },
            { "value2": "job_completed", "output": 2 }
          ]
        }
      },
      "id": "fe17511c-2234-45aa-bd36-cb78cd9cbb87",
      "name": "Route by FSM Event",
      "type": "n8n-nodes-base.switch",
      "typeVersion": 1,
      "position": [470, 250]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "https://graph.facebook.com/v19.0/YOUR_SENDER_PHONE_NUMBER_ID/messages",
        "authentication": "genericCredentialType",
        "genericAuthType": "httpHeaderAuth",
        "sendHeaders": true,
        "headersUi": {
          "parameter": [
            { "name": "Content-Type", "value": "application/json" }
          ]
        },
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={\"messaging_product\": \"whatsapp\", \"to\": \"{{$node[\\\"TimberFlow Event Webhook\\\"].json.data.customerPhone.replace(/[^0-9]/g, '')}}\", \"type\": \"template\", \"template\": {\"name\": \"fsm_technician_transit\", \"language\": {\"code\": \"en_US\"}, \"components\": [{\"type\": \"body\", \"parameters\": [{\"type\": \"text\", \"text\": \"{{$node[\\\"TimberFlow Event Webhook\\\"].json.data.customerName}}\"}, {\"type\": \"text\", \"text\": \"{{$node[\\\"TimberFlow Event Webhook\\\"].json.data.carpenterName}}\"}, {\"type\": \"text\", \"text\": \"{{$node[\\\"TimberFlow Event Webhook\\\"].json.data.trackingUrl}}\"}]}]}}"
      },
      "id": "893c5c99-55cf-4df5-a745-731ff6fcd661",
      "name": "WhatsApp: Notify Transit",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.1,
      "position": [730, 130]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "https://graph.facebook.com/v19.0/YOUR_SENDER_PHONE_NUMBER_ID/messages",
        "authentication": "genericCredentialType",
        "genericAuthType": "httpHeaderAuth",
        "sendHeaders": true,
        "headersUi": {
          "parameter": [
            { "name": "Content-Type", "value": "application/json" }
          ]
        },
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={\"messaging_product\": \"whatsapp\", \"to\": \"{{$node[\\\"TimberFlow Event Webhook\\\"].json.data.customerPhone.replace(/[^0-9]/g, '')}}\", \"type\": \"template\", \"template\": {\"name\": \"fsm_sla_breach\", \"language\": {\"code\": \"en_US\"}, \"components\": [{\"type\": \"body\", \"parameters\": [{\"type\": \"text\", \"text\": \"{{$node[\\\"TimberFlow Event Webhook\\\"].json.data.orderId}}\"}]}]}}"
      },
      "id": "e0cf17d2-7c7d-419b-a36c-94116ebcf3ef",
      "name": "WhatsApp: Alert SLA Breach",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.1,
      "position": [730, 250]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "https://graph.facebook.com/v19.0/YOUR_SENDER_PHONE_NUMBER_ID/messages",
        "authentication": "genericCredentialType",
        "genericAuthType": "httpHeaderAuth",
        "sendHeaders": true,
        "headersUi": {
          "parameter": [
            { "name": "Content-Type", "value": "application/json" }
          ]
        },
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={\"messaging_product\": \"whatsapp\", \"to\": \"{{$node[\\\"TimberFlow Event Webhook\\\"].json.data.customerName}}\", \"type\": \"template\", \"template\": {\"name\": \"fsm_job_completed\", \"language\": {\"code\": \"en_US\"}, \"components\": [{\"type\": \"body\", \"parameters\": [{\"type\": \"text\", \"text\": \"{{$node[\\\"TimberFlow Event Webhook\\\"].json.data.customerName}}\"}, {\"type\": \"text\", \"text\": \"{{$node[\\\"TimberFlow Event Webhook\\\"].json.data.carpenterName}}\"}]}]}}"
      },
      "id": "67243c1b-e102-4c28-9bf1-e23a6f1d24c0",
      "name": "WhatsApp: Thank Customer",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.1,
      "position": [730, 370]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "https://assembly.vikifurniture.com:8090/api/collections/users/auth-with-password",
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "{\n  \"identity\": \"n8n.client@service.com\",\n  \"password\": \"n8nSecretApiKeyPass123!\"\n}"
      },
      "id": "a90b1c0e-4361-4de6-9ab8-cdb5d1fe6720",
      "name": "Get PocketBase Auth Token",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.1,
      "position": [250, 550]
    },
    {
      "parameters": {
        "method": "GET",
        "url": "=https://assembly.vikifurniture.com:8090/api/collections/orders/records?filter=(status='Unassigned')",
        "authentication": "genericCredentialType",
        "genericAuthType": "httpHeaderAuth",
        "sendHeaders": true,
        "headersUi": {
          "parameter": [
            { "name": "Authorization", "value": "=Bearer {{$node[\\\"Get PocketBase Auth Token\\\"].json.token}}" }
          ]
        }
      },
      "id": "f80c102a-9e12-4c00-a0de-8c88bbdf9c2c",
      "name": "Fetch Unassigned Jobs (REST API)",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.1,
      "position": [470, 550]
    }
  ],
  "connections": {
    "TimberFlow Event Webhook": {
      "main": [
        [
          { "node": "Route by FSM Event", "type": "main", "index": 0 }
        ]
      ]
    },
    "Route by FSM Event": {
      "main": [
        [ { "node": "WhatsApp: Notify Transit", "type": "main", "index": 0 } ],
        [ { "node": "WhatsApp: Alert SLA Breach", "type": "main", "index": 0 } ],
        [ { "node": "WhatsApp: Thank Customer", "type": "main", "index": 0 } ]
      ]
    },
    "Get PocketBase Auth Token": {
      "main": [
        [
          { "node": "Fetch Unassigned Jobs (REST API)", "type": "main", "index": 0 }
        ]
      ]
    }
  }
}, null, 2);

export default function AdminPortal() {
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard, orders, inventory, support, technicians, payouts, settings
  const [role, setRole] = useState('Super Admin');
  const [notifications, setNotifications] = useState([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Date-range filter states
  const [dateFilterPreset, setDateFilterPreset] = useState('all'); // today, week, month, 30days, all, custom
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  
  // CSV Uploader states
  const [csvText, setCsvText] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('Amazon');

  // Manual Job Creation states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [jobForm, setJobForm] = useState({
    customerName: '',
    customerPhone: '',
    customerAddress: '',
    pincode: '',
    sku: '',
    payout: '',
    platform: 'Amazon',
    paymentType: 'Company Pay',
    deliveryDate: ''
  });

  // n8n Webhook settings
  const [n8nUrl, setN8nUrl] = useState('');
  const [n8nEnabled, setN8nEnabled] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [webhookTestStatus, setWebhookTestStatus] = useState('idle'); // idle, sending, success, error

  // eslint-disable-next-line no-unused-vars
  const handleSaveN8nConfig = (e) => {
    e.preventDefault();
    const success = saveN8nConfig({ enabled: n8nEnabled, webhookUrl: n8nUrl.trim() });
    if (success) {
      alert('n8n Webhook configuration saved successfully!');
      triggerRefresh();
    } else {
      alert('Failed to save configuration.');
    }
  };

  // eslint-disable-next-line no-unused-vars
  const handleTestWebhook = async () => {
    if (!n8nUrl.trim()) {
      alert('Please configure an n8n webhook URL first.');
      return;
    }
    setWebhookTestStatus('sending');
    try {
      const payload = {
        event: 'test_connection',
        timestamp: new Date().toISOString(),
        data: {
          message: 'Hello from TimberFlow Field Service App! Connection test successful.',
          appMode: 'dev_sandbox',
          databaseBackend: 'PocketBase'
        }
      };

      const res = await fetch(n8nUrl.trim(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setWebhookTestStatus('success');
        alert('Test Webhook sent successfully! Check n8n node execution.');
      } else {
        throw new Error(`Status ${res.status}`);
      }
    } catch (err) {
      console.error(err);
      setWebhookTestStatus('error');
      alert(`Test Webhook failed to connect to n8n.\nError: ${err.message}`);
    }
  };

  // eslint-disable-next-line no-unused-vars
  const handleCopyBlueprint = () => {
    navigator.clipboard?.writeText(n8nBlueprintJSON)
      .then(() => alert('n8n Workflow Blueprint JSON copied to clipboard! Import it by pasting in n8n.'))
      .catch(() => alert('Failed to copy to clipboard.'));
  };

  const handleCreateJobSubmit = (e) => {
    e.preventDefault();
    const { customerName, customerPhone, customerAddress, pincode, sku, payout, platform, paymentType, deliveryDate } = jobForm;
    
    if (!customerName.trim() || !customerPhone.trim() || !customerAddress.trim() || !pincode.trim() || !sku.trim()) {
      alert('Please fill in all required fields.');
      return;
    }
    
    if (!/^[a-zA-Z0-9]+$/.test(pincode.trim())) {
      alert('Pincode must be a valid alphanumeric string.');
      return;
    }
    
    const payoutNum = Number(payout) || 100;
    
    const newOrder = addOrder({
      platform,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerAddress: customerAddress.trim(),
      pincode: pincode.trim(),
      sku: sku.trim(),
      payout: payoutNum,
      paymentType,
      deliveryDate: deliveryDate ? new Date(deliveryDate).toISOString() : undefined
    });
    
    if (newOrder) {
      addNotification(`New manual order ${newOrder.orderId} created for ${customerName}.`, 'admin@service.com', 'Admin');
      setShowCreateModal(false);
      setJobForm({
        customerName: '',
        customerPhone: '',
        customerAddress: '',
        pincode: '',
        sku: '',
        payout: '',
        platform: 'Amazon',
        paymentType: 'Company Pay',
        deliveryDate: ''
      });
      triggerRefresh();
      alert(`Manual job ${newOrder.orderId} created successfully!`);
    } else {
      alert('Failed to create manual job.');
    }
  };

  const loadData = () => {
    setRole(getUserRole());
    setNotifications(getNotifications());
    const config = getN8nConfig();
    setN8nUrl(config.webhookUrl || '');
    setN8nEnabled(config.enabled || false);
  };

  useEffect(() => {
    loadData();
  }, [refreshTrigger]);

  // Listen to state update events
  useEffect(() => {
    const handleUpdate = () => {
      loadData();
    };
    window.addEventListener('fsa_storage_update', handleUpdate);
    return () => window.removeEventListener('fsa_storage_update', handleUpdate);
  }, []);

  // Request browser notification permission on mount
  useEffect(() => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);


  const triggerRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleRoleChange = (e) => {
    const newRole = e.target.value;
    setUserRole(newRole);
    setRole(newRole);
    triggerRefresh();
  };

  // CSV Importer Parsing
  const handleImportCSV = () => {
    if (!csvText.trim()) {
      alert('Please enter or load some CSV data first.');
      return;
    }

    try {
      const lines = csvText.split('\n');
      if (lines.length <= 1) {
        alert('Invalid CSV data. Ensure you have a header row and data rows.');
        return;
      }

      // Check header row columns (we expect standard format)
      // Order ID, Customer Name, Phone, SKU, Payout, Payment Type, Delivery Date
      const currentOrders = getOrders();
      let importedCount = 0;
      let duplicateCount = 0;

      // Extract platform from template selection or auto-detect
      let detectedPlatform = 'Amazon';
      if (csvText.includes('FLIP-')) detectedPlatform = 'Flipkart';
      if (csvText.includes('WOO-')) detectedPlatform = 'WooCommerce';

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const columns = line.split(',');
        if (columns.length < 7) continue;

        const [orderId, customerName, phone, sku, payoutStr, paymentType, deliveryDate] = columns.map(col => col.trim());

        // Check duplicates
        if (currentOrders.some(o => o.orderId === orderId)) {
          duplicateCount++;
          continue;
        }

        const newOrder = {
          orderId,
          platform: detectedPlatform,
          customerName,
          customerPhone: phone,
          sku,
          payout: Number(payoutStr) || 100,
          deliveryStatus: 'Pending',
          jobStatus: 'Unassigned',
          assignedCarpenter: null,
          paymentStatus: 'Unpaid',
          paymentType: paymentType || 'Prepaid',
          deliveryDate: deliveryDate || new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
          orderDate: new Date().toISOString(),
          comments: [],
          auditLogs: [
            {
              timestamp: new Date().toISOString(),
              action: 'Order Created',
              user: role,
              comments: `Imported via CSV (${detectedPlatform} format)`
            }
          ]
        };

        currentOrders.unshift(newOrder);
        importedCount++;
      }

      if (importedCount > 0) {
        saveOrders(currentOrders);
        addNotification(`Imported ${importedCount} new orders successfully. Platforms: ${detectedPlatform}.`);
        setCsvText('');
        triggerRefresh();
        alert(`CSV Import Complete!\n- Imported: ${importedCount} orders\n- Duplicates skipped: ${duplicateCount}`);
      } else {
        alert(`No new orders imported. (Skipped ${duplicateCount} duplicates)`);
      }
    } catch (error) {
      alert('Error parsing CSV. Ensure correct comma-separated column values.');
      console.error(error);
    }
  };

  const handleAutoAllocate = () => {
    const allocated = autoAllocateOrders();
    if (allocated > 0) {
      triggerRefresh();
      alert(`Auto-Allocation Complete!\nSmart-assigned ${allocated} jobs to carpenters.`);
    } else {
      alert('No unassigned orders found to allocate.');
    }
  };

  const handleClearNotification = () => {
    clearNotifications();
    triggerRefresh();
  };

  // Get date of the order (using audit logs created time or fallback dates)
  const getOrderDate = (order) => {
    if (order.auditLogs && order.auditLogs.length > 0) {
      const createdLog = order.auditLogs.find(l => l.action === 'Order Created');
      if (createdLog) return new Date(createdLog.timestamp);
      return new Date(order.auditLogs[0].timestamp);
    }
    if (order.deliveryDate) return new Date(order.deliveryDate);
    if (order.promiseDate) return new Date(order.promiseDate);
    return new Date();
  };

  // Get orders filtered by selected dashboard date range
  const getFilteredOrdersList = () => {
    const allOrders = getOrders();
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return allOrders.filter(o => {
      const oDate = getOrderDate(o);
      switch (dateFilterPreset) {
        case 'today':
          return oDate >= todayStart;
        case 'week': {
          const oneWeekAgo = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
          return oDate >= oneWeekAgo;
        }
        case 'month': {
          const oneMonthAgo = new Date(todayStart.getFullYear(), todayStart.getMonth() - 1, todayStart.getDate());
          return oDate >= oneMonthAgo;
        }
        case '30days': {
          const thirtyDaysAgo = new Date(todayStart.getTime() - 30 * 24 * 60 * 60 * 1000);
          return oDate >= thirtyDaysAgo;
        }
        case 'custom': {
          const start = customStartDate ? new Date(customStartDate) : null;
          const end = customEndDate ? new Date(customEndDate) : null;
          if (end) {
            const endWithTime = new Date(end);
            endWithTime.setHours(23, 59, 59, 999);
            if (start) return oDate >= start && oDate <= endWithTime;
            return oDate <= endWithTime;
          }
          if (start) return oDate >= start;
          return true;
        }
        case 'all':
        default:
          return true;
      }
    });
  };

  const dashboardFilteredOrders = getFilteredOrdersList();

  // Payout Ledger Calculations (Super Admin Only)
  const getPayoutData = () => {
    const allOrders = getFilteredOrdersList();
    const carpenters = getCarpenters();
    return carpenters.map(carp => {
      // Find completed jobs assigned to this carpenter
      const completedJobs = allOrders.filter(
        o => o.assignedCarpenter === carp.name && o.jobStatus === 'Completed'
      );

      // Sum payout of completed jobs that are still 'Unpaid'
      const outstandingPayout = completedJobs
        .filter(o => o.paymentStatus === 'Unpaid')
        .reduce((sum, o) => sum + o.payout, 0);

      const totalCompletedPayout = completedJobs.reduce((sum, o) => sum + o.payout, 0);

      return {
        ...carp,
        completedJobs,
        outstandingPayout,
        totalCompletedPayout
      };
    });
  };

  const handleClearPayout = (orderId, carpenterName, amount) => {
    const orders = getOrders();
    const order = orders.find(o => o.orderId === orderId);
    if (order) {
      const timestamp = new Date().toISOString();
      updateOrder(orderId, { 
        paymentStatus: 'Paid',
        auditLogs: [
          ...(order.auditLogs || []),
          {
            timestamp,
            action: 'Payout Cleared',
            user: role,
            comments: `Outstanding payout of ₹${amount} cleared by Super Admin.`
          }
        ]
      });

      addNotification(`Payout: Cleared ₹${amount} outstanding payout for ${carpenterName} (Order ${orderId}).`);
      triggerRefresh();
    }
  };

  const payoutLedgerData = getPayoutData();
  const totalCompanyOutstanding = payoutLedgerData.reduce((sum, c) => sum + c.outstandingPayout, 0);
  const unreadNotifCount = notifications.filter(n => !n.read).length;

  return (
    <div className="admin-portal-wrapper">
      {/* Header Bar */}
      <header className="portal-header">
        <div className="header-logo-area">
          <div className="logo-icon-circle">
            <ClipboardList size={22} className="logo-accent" />
          </div>
          <div>
            <h2>TimberFlow</h2>
            <span className="subtitle">Field Service Administration</span>
          </div>
        </div>

        {/* Header Controls */}
        <div className="header-controls">
          {/* Notifications Bell Icon */}
          <div className="notification-bell-container">
            <button 
              className={`bell-btn ${unreadNotifCount > 0 ? 'shake-bell' : ''}`}
              onClick={() => setShowNotifDropdown(!showNotifDropdown)}
            >
              <Bell size={20} />
              {unreadNotifCount > 0 && (
                <span className="notification-badge">{unreadNotifCount}</span>
              )}
            </button>

            {showNotifDropdown && (
              <div className="notification-dropdown">
                <div className="dropdown-header">
                  <h4>Recent System Activity</h4>
                  {notifications.length > 0 && (
                    <button onClick={handleClearNotification} className="clear-all-btn">
                      Clear All
                    </button>
                  )}
                </div>
                <div className="notifications-list">
                  {notifications.length === 0 ? (
                    <p className="no-notifications">No new notifications.</p>
                  ) : (
                    notifications.map(notif => (
                      <div key={notif.id} className="notification-item-card">
                        <p className="notif-text">{notif.text}</p>
                        <span className="notif-time">
                          {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Role Switcher */}
          <div className="role-switcher-wrapper">
            <span className="role-label">System Role:</span>
            <select 
              value={role} 
              onChange={handleRoleChange} 
              className="role-selector-dropdown"
            >
              <option value="Super Admin">Super Admin</option>
              <option value="Dispatcher">Dispatcher</option>
              <option value="Inventory Manager">Inventory Manager</option>
              <option value="Customer Support">Customer Support</option>
            </select>
          </div>
        </div>
      </header>

      {/* Main Tab Navigation */}
      <nav className="portal-tabs">
        <button 
          className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => { setActiveTab('dashboard'); setShowNotifDropdown(false); }}
        >
          <LayoutDashboard size={18} /> Overview Dashboard
        </button>
        <button 
          className={`tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => { setActiveTab('orders'); setShowNotifDropdown(false); }}
        >
          <Package size={18} /> Orders Dashboard
        </button>
        <button 
          className={`tab-btn ${activeTab === 'inventory' ? 'active' : ''}`}
          onClick={() => { setActiveTab('inventory'); setShowNotifDropdown(false); }}
        >
          <ClipboardList size={18} /> Logistics & Parts
        </button>
        <button 
          className={`tab-btn ${activeTab === 'support' ? 'active' : ''}`}
          onClick={() => { setActiveTab('support'); setShowNotifDropdown(false); }}
        >
          <HelpCircle size={18} /> Support Portal
        </button>
        
        <button 
          className={`tab-btn ${activeTab === 'technicians' ? 'active' : ''}`}
          onClick={() => { setActiveTab('technicians'); setShowNotifDropdown(false); }}
        >
          <UserCheck size={18} /> Technicians
        </button>
        
        {/* Payout Ledger (Super Admin Only visible or displays restricted screen) */}
        <button 
          className={`tab-btn ${activeTab === 'payouts' ? 'active' : ''}`}
          onClick={() => { setActiveTab('payouts'); setShowNotifDropdown(false); }}
        >
          <Coins size={18} /> Payout Ledger
        </button>

        <button 
          className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => { setActiveTab('settings'); setShowNotifDropdown(false); }}
        >
          <Settings size={18} /> Integrations & API
        </button>
      </nav>

      {/* Main Workspace Body */}
      <main className="portal-body-content">
        {activeTab === 'dashboard' && (
          <div className="tab-panel dashboard-panel animate-fade-in">
            {/* Date-Range Filter Bar */}
            <div className="dashboard-filter-bar card-style">
              <div className="filter-preset-group">
                {['all', 'today', 'week', '30days', 'custom'].map(preset => (
                  <button
                    key={preset}
                    className={`filter-preset-btn ${dateFilterPreset === preset ? 'active' : ''}`}
                    onClick={() => setDateFilterPreset(preset)}
                  >
                    {preset === 'all' && 'All Time'}
                    {preset === 'today' && 'Today'}
                    {preset === 'week' && 'This Week'}
                    {preset === '30days' && 'Last 30 Days'}
                    {preset === 'custom' && 'Custom Range'}
                  </button>
                ))}
              </div>
              
              {dateFilterPreset === 'custom' && (
                <div className="custom-date-inputs">
                  <div className="date-input-wrap">
                    <label>From</label>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                    />
                  </div>
                  <div className="date-input-wrap">
                    <label>To</label>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* KPI Cards Row */}
            <div className="kpi-cards-grid">
              <div className="kpi-card card-style border-left-info">
                <div className="kpi-header">
                  <span className="kpi-title">Total Outstanding Payouts</span>
                  <Coins size={20} className="kpi-icon color-info" />
                </div>
                <div className="kpi-value">₹{totalCompanyOutstanding}</div>
                <div className="kpi-subtext">Pending disbursement</div>
              </div>

              <div className="kpi-card card-style border-left-success">
                <div className="kpi-header">
                  <span className="kpi-title">Job Completion Rate</span>
                  <Activity size={20} className="kpi-icon color-success" />
                </div>
                <div className="kpi-value">
                  {dashboardFilteredOrders.length > 0 
                    ? Math.round((dashboardFilteredOrders.filter(o => o.jobStatus === 'Completed').length / dashboardFilteredOrders.length) * 100)
                    : 0}%
                </div>
                <div className="kpi-subtext">Target: 90% SLA minimum</div>
              </div>

              <div className="kpi-card card-style border-left-warning">
                <div className="kpi-header">
                  <span className="kpi-title">Active Technicians</span>
                  <UserCheck size={20} className="kpi-icon color-warning" />
                </div>
                <div className="kpi-value">{getCarpenters().length}</div>
                <div className="kpi-subtext">Online & dispatched</div>
              </div>

              <div className="kpi-card card-style border-left-danger">
                <div className="kpi-header">
                  <span className="kpi-title">SLA Breached Orders</span>
                  <AlertCircle size={20} className="kpi-icon color-danger" />
                </div>
                <div className="kpi-value">
                  {dashboardFilteredOrders.filter(o => {
                    if (o.jobStatus === 'Completed') return false;
                    const pd = o.promiseDate || o.promise_date;
                    return pd && new Date(pd) < new Date();
                  }).length}
                </div>
                <div className="kpi-subtext">Past promise date — action needed</div>
              </div>
            </div>

            {/* Middle Row: Status chart & Live map tracking */}
            <div className="dashboard-middle-grid">
              {/* Job Status Distribution segment chart */}
              <div className="status-chart-card card-style">
                <h4>Job Status Distribution</h4>
                <p className="card-desc">Visual breakdown of all installation orders by their current progress.</p>
                
                <div className="segmented-bar-chart">
                  {(() => {
                    const all = dashboardFilteredOrders;
                    const unassigned = all.filter(o => o.jobStatus === 'Unassigned').length;
                    const assigned = all.filter(o => o.jobStatus === 'Assigned').length;
                    const inProgress = all.filter(o => o.jobStatus === 'In Progress').length;
                    const onHold = all.filter(o => o.jobStatus === 'On Hold' || o.jobStatus.includes('Hold')).length;
                    const completed = all.filter(o => o.jobStatus === 'Completed').length;
                    const total = all.length || 1;

                    const pctUn = (unassigned / total) * 100;
                    const pctAs = (assigned / total) * 100;
                    const pctIp = (inProgress / total) * 100;
                    const pctOh = (onHold / total) * 100;
                    const pctCo = (completed / total) * 100;

                    return (
                      <>
                        <div className="bar-container">
                          {pctUn > 0 && <div className="bar-segment unassigned" style={{ width: `${pctUn}%` }} title={`Unassigned: ${unassigned}`}></div>}
                          {pctAs > 0 && <div className="bar-segment assigned" style={{ width: `${pctAs}%` }} title={`Assigned: ${assigned}`}></div>}
                          {pctIp > 0 && <div className="bar-segment in-progress" style={{ width: `${pctIp}%` }} title={`In Progress: ${inProgress}`}></div>}
                          {pctOh > 0 && <div className="bar-segment on-hold" style={{ width: `${pctOh}%` }} title={`On Hold: ${onHold}`}></div>}
                          {pctCo > 0 && <div className="bar-segment completed" style={{ width: `${pctCo}%` }} title={`Completed: ${completed}`}></div>}
                        </div>
                        <div className="bar-legend">
                          <span className="legend-item"><span className="color-box unassigned"></span> Unassigned ({unassigned})</span>
                          <span className="legend-item"><span className="color-box assigned"></span> Assigned ({assigned})</span>
                          <span className="legend-item"><span className="color-box in-progress"></span> In Progress ({inProgress})</span>
                          <span className="legend-item"><span className="color-box on-hold"></span> On Hold ({onHold})</span>
                          <span className="legend-item"><span className="color-box completed"></span> Completed ({completed})</span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Live Dispatch map simulator */}
              <div className="live-map-card card-style">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div>
                    <h4 style={{ margin: 0 }}>Live Dispatch Tracking</h4>
                    <p className="card-desc" style={{ margin: 0 }}>Simulated real-time tracking of technicians and orders.</p>
                  </div>
                  <span className="live-indicator"><span className="pulse-dot"></span> Live GPS</span>
                </div>

                <div className="mock-map-canvas">
                  {/* Map Grid Matrix Lines */}
                  <div className="map-grid-matrix"></div>
                  
                  {/* Map Cities / Regions */}
                  <div className="map-city-label malibu" style={{ top: '25%', left: '15%' }}>Malibu (90265)</div>
                  <div className="map-city-label burbank" style={{ top: '35%', left: '75%' }}>Burbank (91505)</div>
                  <div className="map-city-label springfield" style={{ top: '65%', left: '45%' }}>Springfield (62704)</div>
                  <div className="map-city-label ny" style={{ top: '80%', left: '80%' }}>New York (11201)</div>

                  {/* Route lines */}
                  <svg className="map-route-lines" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                    <path d="M 50,50 L 150,80" stroke="rgba(59, 130, 246, 0.4)" strokeWidth="2" strokeDasharray="4 4" fill="none" />
                    <path d="M 220,130 L 130,170" stroke="rgba(16, 185, 129, 0.4)" strokeWidth="2" strokeDasharray="4 4" fill="none" />
                  </svg>

                  {/* Technician positions pins */}
                  <div className="map-pin tech-pin pulsing" style={{ top: '40%', left: '35%' }} title="John Carpenter - Dispatched to FLP-4421">
                    <UserCheck size={12} style={{ color: 'white' }} />
                    <span className="pin-label">John C.</span>
                  </div>

                  <div className="map-pin tech-pin idling" style={{ top: '60%', left: '70%' }} title="Mark Carpenter - Idling in NY">
                    <UserCheck size={12} style={{ color: 'white' }} />
                    <span className="pin-label">Mark C. (NY)</span>
                  </div>

                  {/* Order pins */}
                  {getOrders().filter(o => o.jobStatus !== 'Completed').map((order, idx) => {
                    // Spread the pins logically
                    const topPos = order.pincode === '90265' ? '28%' : order.pincode === '62704' ? '70%' : order.pincode === '11201' ? '82%' : order.pincode === '91505' ? '42%' : `${30 + (idx * 15)}%`;
                    const leftPos = order.pincode === '90265' ? '20%' : order.pincode === '62704' ? '50%' : order.pincode === '11201' ? '76%' : order.pincode === '91505' ? '70%' : `${25 + (idx * 12)}%`;
                    const statusClass = order.jobStatus === 'In Progress' ? 'in-progress' : order.jobStatus === 'Assigned' ? 'assigned' : 'unassigned';

                    return (
                      <div 
                        key={order.orderId} 
                        className={`map-pin order-pin ${statusClass}`} 
                        style={{ top: topPos, left: leftPos }}
                        title={`${order.orderId}: ${order.customerName} (${order.jobStatus})`}
                      >
                        <MapPin size={10} style={{ color: 'white' }} />
                        <span className="pin-tooltip">{order.orderId}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Bottom Row: Technician Statuses & SLA Warnings */}
            <div className="dashboard-bottom-grid">
              {/* Technician workloads & status */}
              <div className="tech-workloads-card card-style">
                <h4>Technician Workloads</h4>
                <p className="card-desc">Current queue size and dispatch activity per active technician.</p>
                <div className="tech-workloads-list">
                  {getCarpenters().map(c => {
                    const activeJobsCount = getOrders().filter(
                      o => o.assignedCarpenter === c.name && o.jobStatus !== 'Completed'
                    ).length;

                    return (
                      <div key={c.id} className="tech-workload-row">
                        <div className="tech-avatar-info">
                          <div className="avatar-mini"><UserCheck size={14} /></div>
                          <div>
                            <span className="tech-row-name">{c.name}</span>
                            <span className="tech-row-sub">{c.rank} • {c.pincodes ? c.pincodes.length : 0} Areas</span>
                          </div>
                        </div>
                        <div className="tech-workload-bar-wrap">
                          <div className="tech-load-text">
                            <strong>{activeJobsCount} Active Jobs</strong>
                          </div>
                          <div className="tech-load-bar-bg">
                            <div 
                              className={`tech-load-bar-fill ${activeJobsCount > 2 ? 'high' : activeJobsCount > 0 ? 'medium' : 'low'}`}
                              style={{ width: `${Math.min(activeJobsCount * 33.3, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* SLA Alerts Panel */}
              <div className="sla-alerts-card card-style">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <div>
                    <h4 style={{ margin: 0 }}>SLA Priority Alerts</h4>
                    <p className="card-desc" style={{ margin: 0 }}>Automated SLA monitoring — breached &amp; at-risk orders.</p>
                  </div>
                  <button
                    className="sla-dispatch-btn"
                    onClick={() => { checkSlaBreaches(); triggerRefresh(); }}
                    title="Re-run SLA breach scan now"
                  >
                    Scan Now
                  </button>
                </div>
                <div className="sla-alerts-list">
                  {(() => {
                    const now = new Date();
                    const slaOrders = dashboardFilteredOrders.filter(o => {
                      if (o.jobStatus === 'Completed') return false;
                      const pd = o.promiseDate || o.promise_date;
                      if (!pd) return o.deliveryStatus === 'Delivered';
                      return !isNaN(new Date(pd).getTime());
                    });
                    if (slaOrders.length === 0) {
                      return (
                        <div className="empty-sla-view">
                          <div className="empty-icon"><ShieldCheck size={28} /></div>
                          <p>All orders within SLA. No action needed.</p>
                        </div>
                      );
                    }
                    return slaOrders
                      .sort((a, b) => new Date(a.promiseDate || a.promise_date || 0) - new Date(b.promiseDate || b.promise_date || 0))
                      .map(order => {
                        const pd = order.promiseDate || order.promise_date;
                        const pdDate = pd ? new Date(pd) : null;
                        const hoursLeft = pdDate ? (pdDate - now) / (1000 * 60 * 60) : null;
                        const isBreached = hoursLeft !== null && hoursLeft < 0;
                        const isAtRisk = hoursLeft !== null && hoursLeft >= 0 && hoursLeft <= 4;
                        const trackUrl = `${window.location.origin}${window.location.pathname}?track=${order.orderId}`;
                        return (
                          <div key={order.orderId} className={`sla-alert-row ${isBreached ? 'sla-row-breach' : isAtRisk ? 'sla-row-risk' : ''}`}>
                            <div className="sla-alert-info">
                              <span className={`sla-badge-danger ${isBreached ? 'sla-badge-breach' : isAtRisk ? 'sla-badge-risk' : ''}`}>
                                {isBreached ? '🚨 BREACH' : isAtRisk ? '⚠️ At-Risk' : '⏱ Active'}
                              </span>
                              <div>
                                <strong>{order.orderId} • {order.customerName}</strong>
                                <p className="sla-subtext">
                                  {isBreached
                                    ? `Overdue by ${Math.abs(Math.round(hoursLeft))}h — Immediate action required`
                                    : isAtRisk
                                    ? `${Math.round(hoursLeft)}h remaining — Urgent`
                                    : pdDate ? `Due: ${pdDate.toLocaleDateString()}` : 'Delivered — Assign now'}
                                </p>
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                              <button
                                className="sla-track-btn"
                                onClick={() => {
                                  navigator.clipboard?.writeText(trackUrl).catch(() => {});
                                  alert('Customer tracking link copied to clipboard!');
                                }}
                                title="Copy customer tracking link to clipboard"
                              >
                                📋 Copy
                              </button>
                              <a
                                href={`https://wa.me/${(order.customerPhone || order.customer_phone || '').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                                  `Hello ${order.customerName || 'Customer'}, you can track the status of your assembly job here: ${trackUrl}`
                                )}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="sla-track-btn"
                                style={{
                                  textDecoration: 'none',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  backgroundColor: '#25D366',
                                  color: '#fff',
                                  border: 'none',
                                  fontSize: '11px',
                                  fontWeight: 'bold',
                                  padding: '6px 8px',
                                  borderRadius: '4px',
                                  cursor: 'pointer'
                                }}
                                title="Share tracking link via WhatsApp"
                              >
                                💬 WhatsApp
                              </a>
                              <button
                                className="sla-dispatch-btn"
                                onClick={() => { setActiveTab('orders'); }}
                              >
                                Dispatch
                              </button>
                            </div>
                          </div>
                        );
                      });
                  })()}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="tab-panel orders-panel animate-fade-in">
            {/* Top Row: CSV Importer & Auto Allocation Engine */}
            {(role === 'Super Admin' || role === 'Dispatcher') ? (
              <div className="orders-top-control-grid">
                {/* CSV Importer */}
                <div className="importer-card card-style">
                  <div className="card-header-icon-title">
                    <Upload size={18} className="theme-accent" />
                    <h4>CSV Order Importer</h4>
                  </div>
                  <p className="card-desc">Batch import new customer installations from retail platforms.</p>

                  <div className="template-btn-row">
                    <button 
                      onClick={() => { setSelectedTemplate('Amazon'); setCsvText(CSV_TEMPLATES.Amazon); }}
                      className={`template-btn ${selectedTemplate === 'Amazon' ? 'active' : ''}`}
                    >
                      Amazon
                    </button>
                    <button 
                      onClick={() => { setSelectedTemplate('Flipkart'); setCsvText(CSV_TEMPLATES.Flipkart); }}
                      className={`template-btn ${selectedTemplate === 'Flipkart' ? 'active' : ''}`}
                    >
                      Flipkart
                    </button>
                    <button 
                      onClick={() => { setSelectedTemplate('WooCommerce'); setCsvText(CSV_TEMPLATES.WooCommerce); }}
                      className={`template-btn ${selectedTemplate === 'WooCommerce' ? 'active' : ''}`}
                    >
                      WooCommerce
                    </button>
                  </div>

                  <div className="csv-textarea-wrapper">
                    <textarea 
                      value={csvText}
                      onChange={(e) => setCsvText(e.target.value)}
                      placeholder="Load template above or paste CSV data here..."
                      rows={4}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                    <button 
                      onClick={handleImportCSV} 
                      className="import-submit-btn"
                      style={{ flex: 2, margin: 0, minWidth: '140px' }}
                    >
                      <Upload size={14} style={{ marginRight: '6px' }} />
                      Parse &amp; Import CSV
                    </button>
                    <button 
                      type="button"
                      onClick={() => setShowCreateModal(true)} 
                      className="import-submit-btn"
                      style={{ flex: 1, margin: 0, minWidth: '120px', backgroundColor: 'transparent', border: '1px solid var(--admin-border-color)', color: 'var(--admin-text-primary)' }}
                    >
                      Create Manual Job
                    </button>
                    <button
                      type="button"
                      onClick={() => { const n = exportOrdersCSV(); addNotification(`Exported ${n} orders to CSV.`, '', 'Admin'); }}
                      className="import-submit-btn"
                      title="Download all current orders as a CSV file for editing and re-import"
                      style={{ flex: 1, margin: 0, minWidth: '120px', backgroundColor: 'transparent', border: '1px solid var(--color-success)', color: 'var(--color-success)' }}
                    >
                      <Download size={14} style={{ marginRight: '6px' }} />
                      Export Orders
                    </button>
                  </div>
                </div>

                {/* Auto-Allocation Engine Dashboard */}
                <div className="allocation-card card-style">
                  <div className="card-header-icon-title">
                    <Cpu size={18} className="theme-accent" />
                    <h4>Auto-Allocation Engine</h4>
                  </div>
                  <p className="card-desc">
                    Runs a smart dispatch algorithm to immediately assign all unassigned jobs to active carpenters with the lowest relative workload.
                  </p>

                  <div className="allocation-engine-status">
                    <div className="engine-stat">
                      <span className="stat-num">
                        {getOrders().filter(o => o.jobStatus === 'Unassigned').length}
                      </span>
                      <span className="stat-label">Unassigned Jobs</span>
                    </div>
                    <div className="engine-stat">
                      <span className="stat-num">{getCarpenters().length}</span>
                      <span className="stat-label">Carpenters Online</span>
                    </div>
                  </div>

                  <button 
                    onClick={handleAutoAllocate} 
                    className="trigger-allocation-btn"
                  >
                    <Cpu size={16} /> Run Auto-Allocation Algorithm
                  </button>
                </div>
              </div>
            ) : (
              <div className="card-style" style={{ padding: '24px', textAlign: 'center', backgroundColor: 'var(--admin-bg-secondary)', border: '1px solid var(--admin-border-color)', marginBottom: '20px' }}>
                <p style={{ margin: 0, color: 'var(--admin-text-secondary)', fontSize: '13px', fontWeight: '600' }}>
                  🔒 CSV Importer and Auto-Allocation utilities are locked for role: <span style={{ color: 'var(--color-secondary)' }}>{role}</span>. Switch to Super Admin or Dispatcher to import/allocate.
                </p>
              </div>
            )}

            {/* The main Order List Grid */}
            <OrderGrid 
              refreshTrigger={refreshTrigger}
              onRefresh={triggerRefresh}
            />
          </div>
        )}

        {activeTab === 'inventory' && (
          <div className="tab-panel inventory-panel animate-fade-in">
            <InventoryDashboard 
              refreshTrigger={refreshTrigger}
              onRefresh={triggerRefresh}
            />
          </div>
        )}

        {activeTab === 'support' && (
          <div className="tab-panel support-panel animate-fade-in">
            <SupportPortal 
              refreshTrigger={refreshTrigger}
              onRefresh={triggerRefresh}
            />
          </div>
        )}

        {activeTab === 'technicians' && (
          <div className="tab-panel technicians-panel animate-fade-in">
            <TechniciansDashboard 
              refreshTrigger={refreshTrigger}
              onRefresh={triggerRefresh}
            />
          </div>
        )}

        {activeTab === 'payouts' && (
          <div className="tab-panel payouts-panel animate-fade-in">
            {role !== 'Super Admin' ? (
              <div className="restricted-panel-fallback">
                <ShieldAlert size={60} className="restricted-shield" />
                <h3>Access Denied</h3>
                <p>The Payout Ledger is restricted to Super Admin roles only. Dispatchers cannot access completed payouts or clearing actions.</p>
                <div className="role-switch-suggestion">
                  <span>Switch your System Role in the top right header to "Super Admin" to unlock this interface.</span>
                </div>
              </div>
            ) : (
              <div className="ledger-workspace">
                <div className="ledger-summary-header">
                  <div>
                    <h3><Coins size={22} /> Carpenter Payout Ledger</h3>
                    <p className="subtitle">Audit completed cabinet and furniture installations. View totals and clear payouts upon disbursement.</p>
                  </div>
                  <div className="ledger-total-box">
                    <span className="label">Total Company Outstanding:</span>
                    <span className="value font-mono">₹{totalCompanyOutstanding}</span>
                  </div>
                </div>

                <div className="carpenter-ledger-grid">
                  {payoutLedgerData.map(carp => (
                    <div key={carp.id} className="carp-ledger-card">
                      <div className="ledger-card-header">
                        <div>
                          <h4>{carp.name}</h4>
                          <span className="rank-badge">{carp.rank}</span>
                        </div>
                        <div className="outstanding-badge">
                          <span className="val">₹{carp.outstandingPayout}</span>
                          <span className="lbl">Outstanding</span>
                        </div>
                      </div>

                      <div className="completed-jobs-sublist">
                        <h5>Completed Jobs ({carp.completedJobs.length})</h5>
                        {carp.completedJobs.length === 0 ? (
                          <p className="no-jobs-payout">No completed installation jobs yet.</p>
                        ) : (
                          <div className="job-table-ledger">
                            <table>
                              <thead>
                                <tr>
                                  <th>Order ID</th>
                                  <th>SKU / Product</th>
                                  <th>Payout</th>
                                  <th>Payment Status</th>
                                  <th>Action</th>
                                </tr>
                              </thead>
                              <tbody>
                                {carp.completedJobs.map(job => (
                                  <tr key={job.orderId}>
                                    <td className="font-mono">{job.orderId}</td>
                                    <td className="font-mono text-small">{job.sku.split('-').slice(1).join('-') || job.sku}</td>
                                    <td className="text-bold">₹{job.payout}</td>
                                    <td>
                                      <span className={`payment-badge ${job.paymentStatus.toLowerCase()}`}>
                                        {job.paymentStatus}
                                      </span>
                                    </td>
                                    <td>
                                      {job.paymentStatus === 'Unpaid' ? (
                                        <button
                                          onClick={() => handleClearPayout(job.orderId, carp.name, job.payout)}
                                          className="clear-job-payout-btn"
                                        >
                                          Clear Payout
                                        </button>
                                      ) : (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                          <span className="cleared-indicator">Disbursed</span>
                                          {!job.archived && (
                                            <button
                                              onClick={() => {
                                                updateOrder(job.orderId, { archived: true });
                                                alert(`Order ${job.orderId} archived.`);
                                                triggerRefresh();
                                              }}
                                              className="clear-job-payout-btn"
                                              style={{ backgroundColor: '#4b5563', padding: '3px 6px', fontSize: '9px', height: 'auto', minWidth: 'auto', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                            >
                                              Archive
                                            </button>
                                          )}
                                        </div>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>

                      <div className="carp-ledger-summary-footer">
                        <span>Total Earnings: ₹{carp.totalCompletedPayout}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Create Manual Job Modal Overlay */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-area">
                <h3>Create Manual Job</h3>
              </div>
              <button className="close-btn" onClick={() => setShowCreateModal(false)}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleCreateJobSubmit} className="management-form" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '80vh', overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--admin-text-secondary)', textTransform: 'uppercase' }}>Customer Name *</label>
                  <input 
                    type="text" 
                    value={jobForm.customerName} 
                    onChange={(e) => setJobForm({ ...jobForm, customerName: e.target.value })}
                    placeholder="e.g. Tony Stark"
                    required 
                    style={{ backgroundColor: 'var(--admin-bg-input)', border: '1px solid var(--admin-border-color)', color: 'var(--admin-text-primary)', borderRadius: '6px', padding: '8px', fontSize: '12px' }}
                  />
                </div>
                
                <div className="form-group">
                  <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--admin-text-secondary)', textTransform: 'uppercase' }}>Customer Phone *</label>
                  <input 
                    type="text" 
                    value={jobForm.customerPhone} 
                    onChange={(e) => setJobForm({ ...jobForm, customerPhone: e.target.value })}
                    placeholder="e.g. +91 99999 88888"
                    required 
                    style={{ backgroundColor: 'var(--admin-bg-input)', border: '1px solid var(--admin-border-color)', color: 'var(--admin-text-primary)', borderRadius: '6px', padding: '8px', fontSize: '12px' }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--admin-text-secondary)', textTransform: 'uppercase' }}>Customer Address *</label>
                <textarea 
                  value={jobForm.customerAddress} 
                  onChange={(e) => setJobForm({ ...jobForm, customerAddress: e.target.value })}
                  placeholder="Street name, landmark, city"
                  required 
                  rows={2}
                  style={{ backgroundColor: 'var(--admin-bg-input)', border: '1px solid var(--admin-border-color)', color: 'var(--admin-text-primary)', borderRadius: '6px', padding: '8px', fontSize: '12px', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--admin-text-secondary)', textTransform: 'uppercase' }}>Pincode *</label>
                  <input 
                    type="text" 
                    value={jobForm.pincode} 
                    onChange={(e) => setJobForm({ ...jobForm, pincode: e.target.value })}
                    placeholder="e.g. 11201"
                    required 
                    style={{ backgroundColor: 'var(--admin-bg-input)', border: '1px solid var(--admin-border-color)', color: 'var(--admin-text-primary)', borderRadius: '6px', padding: '8px', fontSize: '12px' }}
                  />
                </div>
                
                <div className="form-group">
                  <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--admin-text-secondary)', textTransform: 'uppercase' }}>Product SKU *</label>
                  <input 
                    type="text" 
                    value={jobForm.sku} 
                    onChange={(e) => setJobForm({ ...jobForm, sku: e.target.value })}
                    placeholder="e.g. SKU-SOFA-02"
                    required 
                    style={{ backgroundColor: 'var(--admin-bg-input)', border: '1px solid var(--admin-border-color)', color: 'var(--admin-text-primary)', borderRadius: '6px', padding: '8px', fontSize: '12px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--admin-text-secondary)', textTransform: 'uppercase' }}>Assembly Payout (₹) *</label>
                  <input 
                    type="number" 
                    value={jobForm.payout} 
                    onChange={(e) => setJobForm({ ...jobForm, payout: e.target.value })}
                    placeholder="e.g. 150"
                    required 
                    style={{ backgroundColor: 'var(--admin-bg-input)', border: '1px solid var(--admin-border-color)', color: 'var(--admin-text-primary)', borderRadius: '6px', padding: '8px', fontSize: '12px' }}
                  />
                </div>
                
                <div className="form-group">
                  <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--admin-text-secondary)', textTransform: 'uppercase' }}>Retail Platform</label>
                  <select 
                    value={jobForm.platform} 
                    onChange={(e) => setJobForm({ ...jobForm, platform: e.target.value })}
                    style={{ backgroundColor: 'var(--admin-bg-input)', border: '1px solid var(--admin-border-color)', color: 'var(--admin-text-primary)', borderRadius: '6px', padding: '8px', fontSize: '12px', cursor: 'pointer' }}
                  >
                    <option value="Amazon">Amazon</option>
                    <option value="Flipkart">Flipkart</option>
                    <option value="WooCommerce">WooCommerce</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--admin-text-secondary)', textTransform: 'uppercase' }}>Payment Type</label>
                  <select 
                    value={jobForm.paymentType} 
                    onChange={(e) => setJobForm({ ...jobForm, paymentType: e.target.value })}
                    style={{ backgroundColor: 'var(--admin-bg-input)', border: '1px solid var(--admin-border-color)', color: 'var(--admin-text-primary)', borderRadius: '6px', padding: '8px', fontSize: '12px', cursor: 'pointer' }}
                  >
                    <option value="Company Pay">Company Pay</option>
                    <option value="Customer Pay">Customer Pay</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--admin-text-secondary)', textTransform: 'uppercase' }}>Delivery Target Date (Optional)</label>
                  <input 
                    type="datetime-local" 
                    value={jobForm.deliveryDate} 
                    onChange={(e) => setJobForm({ ...jobForm, deliveryDate: e.target.value })}
                    style={{ backgroundColor: 'var(--admin-bg-input)', border: '1px solid var(--admin-border-color)', color: 'var(--admin-text-primary)', borderRadius: '6px', padding: '8px', fontSize: '12px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button 
                  type="button" 
                  onClick={() => setShowCreateModal(false)}
                  className="import-submit-btn"
                  style={{ flex: 1, margin: 0, backgroundColor: 'transparent', border: '1px solid var(--admin-border-color)', color: 'var(--admin-text-primary)' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="import-submit-btn"
                  style={{ flex: 1, margin: 0 }}
                >
                  Create Job
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
