import { useState, useEffect, useRef } from 'react';
import './AdminPortal.css';
import { 
  ClipboardList, Package, HelpCircle, Bell, 
  Coins, UserCheck, ShieldAlert, Upload, Cpu, X,
  LayoutDashboard, Activity, AlertCircle, ShieldCheck,
  Settings, Download, IndianRupee
} from 'lucide-react';
import { 
  getUserRole, setUserRole, hasRole, hasPermission,
  saveOrders, addNotification, updateOrder, addOrder, checkSlaBreaches,
  getN8nConfig, saveN8nConfig, getNotifications, autoAllocateOrders, clearNotifications,
  exportOrdersCSV, pb, resetState, fsaQueries, normalizeOrder, stateManager, isActiveOrder
} from '../utils/stateManager';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import OrderGrid from './OrderGrid';
import InventoryDashboard from './InventoryDashboard';
import SupportPortal from './SupportPortal';
import TechniciansDashboard from './TechniciansDashboard';


// Templates for CSV Import
const CSV_TEMPLATES = {
  Amazon: `Order ID,Customer Name,Phone,Customer Address,City,State,Pincode,SKU,Payout,Payment Type,Delivery Date,Promise Date,Product Image URL,Product Review Link,Seller Review Link
AMZ-4001,John Smith,+1-555-0111,"221B MG Road",Mumbai,MH,400001,SKU-OAK-DESK-01,150,Prepaid,2026-06-28T10:00:00Z,2026-06-29T18:00:00Z,https://example.com/oak-desk.jpg,https://example.com/product-review,https://example.com/seller-review
AMZ-4002,Bruce Wayne,+1-555-0122,"42 Park Street",Delhi,DL,110001,SKU-MAHOGANY-TABLE-02,280,Prepaid,2026-06-27T14:00:00Z,2026-06-28T18:00:00Z,https://example.com/table.jpg,https://example.com/product-review,https://example.com/seller-review`,
  
  Flipkart: `Order ID,Customer Name,Phone,Customer Address,City,State,Pincode,SKU,Payout,Payment Type,Delivery Date,Promise Date,Product Image URL,Product Review Link,Seller Review Link
FLIP-5001,Clark Kent,+1-555-0133,"88 Brigade Road",Bengaluru,KA,560001,SKU-PINE-BED-04,320,COD,2026-06-26T16:00:00Z,2026-06-27T18:00:00Z,https://example.com/pine-bed.jpg,https://example.com/product-review,https://example.com/seller-review
FLIP-5002,Diana Prince,+1-555-0144,"17 Anna Salai",Chennai,TN,600002,SKU-WALNUT-CHAIR-03,85,COD,2026-06-29T11:00:00Z,2026-06-30T18:00:00Z,https://example.com/chair.jpg,https://example.com/product-review,https://example.com/seller-review`,
  
  WooCommerce: `Order ID,Customer Name,Phone,Customer Address,City,State,Pincode,SKU,Payout,Payment Type,Delivery Date,Promise Date,Product Image URL,Product Review Link,Seller Review Link
WOO-6001,Tony Stark,+1-555-0155,"9 BKC Avenue",Mumbai,MH,400051,SKU-BIRCH-CABINET-02,120,Prepaid,2026-06-25T18:00:00Z,2026-06-26T18:00:00Z,https://example.com/cabinet.jpg,https://example.com/product-review,https://example.com/seller-review
WOO-6002,Barry Allen,+1-555-0166,"5 Salt Lake Sector V",Kolkata,WB,700091,SKU-OAK-TABLE-02,190,Prepaid,2026-06-30T09:00:00Z,2026-07-01T18:00:00Z,https://example.com/oak-table.jpg,https://example.com/product-review,https://example.com/seller-review`
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
        "value1": "={{$json.body.event}}",
        "rules": {
          "rules": [
            { "value2": "transit_started" },
            { "value2": "sla_breach_detected", "output": 1 },
            { "value2": "job_completed", "output": 2 },
            { "value2": "otp_requested", "output": 3 }
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
        "jsonBody": "={\"messaging_product\": \"whatsapp\", \"to\": \"{{$node[\\\"TimberFlow Event Webhook\\\"].json.body.data.customerPhone.replace(/[^0-9]/g, '')}}\", \"type\": \"template\", \"template\": {\"name\": \"fsm_technician_transit\", \"language\": {\"code\": \"en_US\"}, \"components\": [{\"type\": \"body\", \"parameters\": [{\"type\": \"text\", \"text\": \"{{$node[\\\"TimberFlow Event Webhook\\\"].json.body.data.customerName}}\"}, {\"type\": \"text\", \"text\": \"{{$node[\\\"TimberFlow Event Webhook\\\"].json.body.data.carpenterName}}\"}, {\"type\": \"text\", \"text\": \"{{$node[\\\"TimberFlow Event Webhook\\\"].json.body.data.trackingUrl}}\"}]}]}}"
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
        "jsonBody": "={\"messaging_product\": \"whatsapp\", \"to\": \"{{$node[\\\"TimberFlow Event Webhook\\\"].json.body.data.customerPhone.replace(/[^0-9]/g, '')}}\", \"type\": \"template\", \"template\": {\"name\": \"fsm_sla_breach\", \"language\": {\"code\": \"en_US\"}, \"components\": [{\"type\": \"body\", \"parameters\": [{\"type\": \"text\", \"text\": \"{{$node[\\\"TimberFlow Event Webhook\\\"].json.body.data.orderId}}\"}]}]}}"
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
        "jsonBody": "={\"messaging_product\": \"whatsapp\", \"to\": \"{{$node[\\\"TimberFlow Event Webhook\\\"].json.body.data.customerName}}\", \"type\": \"template\", \"template\": {\"name\": \"fsm_job_completed\", \"language\": {\"code\": \"en_US\"}, \"components\": [{\"type\": \"body\", \"parameters\": [{\"type\": \"text\", \"text\": \"{{$node[\\\"TimberFlow Event Webhook\\\"].json.body.data.customerName}}\"}, {\"type\": \"text\", \"text\": \"{{$node[\\\"TimberFlow Event Webhook\\\"].json.body.data.carpenterName}}\"}]}]}}"
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
        "jsonBody": "={\"messaging_product\": \"whatsapp\", \"to\": \"{{$node[\\\"TimberFlow Event Webhook\\\"].json.body.data.customerPhone.replace(/[^0-9]/g, '')}}\", \"type\": \"template\", \"template\": {\"name\": \"fsm_otp_verification\", \"language\": {\"code\": \"en_US\"}, \"components\": [{\"type\": \"body\", \"parameters\": [{\"type\": \"text\", \"text\": \"{{$node[\\\"TimberFlow Event Webhook\\\"].json.body.data.otp}}\"}]}, {\"type\": \"button\", \"sub_type\": \"url\", \"index\": \"0\", \"parameters\": [{\"type\": \"text\", \"text\": \"{{$node[\\\"TimberFlow Event Webhook\\\"].json.body.data.otp}}\"}]}]}}"
      },
      "id": "782cd981-d1a2-4a00-bf64-0c2d3aef6623",
      "name": "WhatsApp: Send OTP Code",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.1,
      "position": [730, 490]
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
        [ { "node": "WhatsApp: Thank Customer", "type": "main", "index": 0 } ],
        [ { "node": "WhatsApp: Send OTP Code", "type": "main", "index": 0 } ]
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
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined' && window.location.hash) {
      const hash = window.location.hash.replace('#/', '');
      const validTabs = ['dashboard', 'orders', 'inventory', 'support', 'technicians', 'expenses', 'payouts', 'settings'];
      if (validTabs.includes(hash)) return hash;
    }
    return 'dashboard';
  });
  const mapRef = useRef(null);
  const [role, setRole] = useState('Super Admin');
  const [notifications, setNotifications] = useState([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showArchivedPayouts, setShowArchivedPayouts] = useState(false);
  const [selectedPayoutOrderIds, setSelectedPayoutOrderIds] = useState([]);
  const [geocodeCache, setGeocodeCache] = useState({});

  const { data: ordersData = { items: [] } } = useQuery(fsaQueries.orders.all(1, 500));
  const { data: carpentersData = { items: [] } } = useQuery(fsaQueries.carpenters.all(1, 500));

  const serverOrders = (ordersData.items || []).map(normalizeOrder).filter(Boolean);
  const localOrders = stateManager.getOrders();
  const mergedOrders = new Map();
  serverOrders.forEach(order => mergedOrders.set(order.orderId, order));
  localOrders.forEach(order => {
    const normalized = normalizeOrder(order);
    if (normalized) {
      mergedOrders.set(normalized.orderId, { ...(mergedOrders.get(normalized.orderId) || {}), ...normalized });
    }
  });
  const orders = Array.from(mergedOrders.values());
  const carpenters = carpentersData.items || [];
  
  // Date-range filter states
  const [dateFilterPreset, setDateFilterPreset] = useState('all'); // today, week, month, 30days, all, custom
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  
  // CSV Uploader states
  const [csvText, setCsvText] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('Amazon');
  const [showOpsTools, setShowOpsTools] = useState(false);

  // Manual Job Creation states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [jobForm, setJobForm] = useState({
    orderId: '',
    customerName: '',
    customerPhone: '',
    customerAddress: '',
    city: '',
    state: '',
    pincode: '',
    sku: '',
    payout: '',
    platform: 'Amazon',
    paymentType: 'Company Pay',
    deliveryDate: '',
    promiseDate: '',
    productImageUrl: '',
    productReviewLink: '',
    sellerReviewLink: ''
  });

  // n8n Webhook settings
  const [n8nUrl, setN8nUrl] = useState('');
  const [n8nEnabled, setN8nEnabled] = useState(false);
  const [webhookTestStatus, setWebhookTestStatus] = useState('idle'); // idle, sending, success, error

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

  const handleCopyBlueprint = () => {
    navigator.clipboard?.writeText(n8nBlueprintJSON)
      .then(() => alert('n8n Workflow Blueprint JSON copied to clipboard! Import it by pasting in n8n.'))
      .catch(() => alert('Failed to copy to clipboard.'));
  };

  const handleCreateJobSubmit = (e) => {
    e.preventDefault();
    const { orderId, customerName, customerPhone, customerAddress, city, state, pincode, sku, payout, platform, paymentType, deliveryDate, promiseDate, productImageUrl, productReviewLink, sellerReviewLink } = jobForm;
    
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
      orderId: orderId.trim() || undefined,
      platform,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerAddress: customerAddress.trim(),
      city: city.trim(),
      state: state.trim(),
      pincode: pincode.trim(),
      sku: sku.trim(),
      payout: payoutNum,
      paymentType,
      deliveryDate: deliveryDate ? new Date(deliveryDate).toISOString() : undefined,
      promiseDate: promiseDate ? new Date(promiseDate).toISOString() : undefined,
      productImageUrl: productImageUrl.trim(),
      productReviewLink: productReviewLink.trim(),
      sellerReviewLink: sellerReviewLink.trim()
    });
    
    if (newOrder) {
      addNotification(`New manual order ${newOrder.orderId} created for ${customerName}.`, 'admin@service.com', 'Admin');
      setShowCreateModal(false);
      setJobForm({
        orderId: '',
        customerName: '',
        customerPhone: '',
        customerAddress: '',
        city: '',
        state: '',
        pincode: '',
        sku: '',
        payout: '',
        platform: 'Amazon',
        paymentType: 'Company Pay',
        deliveryDate: '',
        promiseDate: '',
        productImageUrl: '',
        productReviewLink: '',
        sellerReviewLink: ''
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
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    };
    window.addEventListener('fsa_storage_update', handleUpdate);
    return () => window.removeEventListener('fsa_storage_update', handleUpdate);
  }, [queryClient]);

  // Set default tab based on role and enforce access control
  useEffect(() => {
    const currentRole = getUserRole();
    setRole(currentRole);

    const allowedTabsMapping = {
      'Super Admin': ['dashboard', 'orders', 'inventory', 'support', 'technicians', 'expenses', 'payouts', 'settings'],
      'Dispatcher': ['dashboard', 'orders', 'technicians'],
      'Inventory Manager': ['inventory', 'orders', 'expenses'],
      'Customer Support': ['support', 'orders']
    };

    const userRoles = currentRole.split(',').map(r => r.trim());
    let userAllowed = [];
    userRoles.forEach(r => {
      const tabs = allowedTabsMapping[r] || [];
      tabs.forEach(tab => {
        if (!userAllowed.includes(tab)) {
          userAllowed.push(tab);
        }
      });
    });

    if (userAllowed.length === 0) {
      userAllowed = ['dashboard'];
    }
    
    // Redirect to default tab if current activeTab is not allowed
    if (!userAllowed.includes(activeTab)) {
      setActiveTab(userAllowed[0]);
      if (typeof window !== 'undefined') {
        window.location.hash = '#/' + userAllowed[0];
      }
    }
  }, [role, activeTab]);

  // Handle hash change for back/forward browser navigation
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#/', '');
      const validTabs = ['dashboard', 'orders', 'inventory', 'support', 'technicians', 'expenses', 'payouts', 'settings'];
      
      const currentRole = getUserRole();
      const allowedTabsMapping = {
        'Super Admin': ['dashboard', 'orders', 'inventory', 'support', 'technicians', 'expenses', 'payouts', 'settings'],
        'Dispatcher': ['dashboard', 'orders', 'technicians'],
        'Inventory Manager': ['inventory', 'orders', 'expenses'],
        'Customer Support': ['support', 'orders']
      };

      const userRoles = currentRole.split(',').map(r => r.trim());
      let userAllowed = [];
      userRoles.forEach(r => {
        const tabs = allowedTabsMapping[r] || [];
        tabs.forEach(tab => {
          if (!userAllowed.includes(tab)) {
            userAllowed.push(tab);
          }
        });
      });

      if (userAllowed.length === 0) {
        userAllowed = ['dashboard'];
      }

      if (validTabs.includes(hash)) {
        if (userAllowed.includes(hash)) {
          setActiveTab(hash);
        } else {
          // If trying to access an unauthorized hash, redirect to first allowed tab
          setActiveTab(userAllowed[0]);
          window.location.hash = '#/' + userAllowed[0];
        }
      }
    };

    // Run once on mount to synchronize hash if empty
    if (typeof window !== 'undefined') {
      if (!window.location.hash) {
        window.location.hash = '#/' + activeTab;
      } else {
        // Handle case where user loads page with a hash directly
        handleHashChange();
      }
      window.addEventListener('hashchange', handleHashChange);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('hashchange', handleHashChange);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isValidLatLng = (coords) => (
    Array.isArray(coords)
    && coords.length === 2
    && Number.isFinite(Number(coords[0]))
    && Number.isFinite(Number(coords[1]))
    && Math.abs(Number(coords[0])) <= 90
    && Math.abs(Number(coords[1])) <= 180
  );

  // Fetch true geographical coordinates for pincodes to plot on map
  useEffect(() => {
    if (activeTab !== 'dashboard') return;
    
    const activeOrders = orders.filter(isActiveOrder);
    const uniquePins = [...new Set(activeOrders.map(o => o.pincode).filter(Boolean))];
    
    let isSubscribed = true;
    
    const fetchGeocodes = async () => {
      let updated = false;
      const newCache = {};
      
      for (const pin of uniquePins) {
        if (!geocodeCache[pin] && !geocodeCache[`failed_${pin}`]) {
          try {
            // Try Indian Pincode first
            let res = await fetch(`https://api.zippopotam.us/in/${pin}`);
            if (!res.ok) {
               // Fallback for US zip codes (like the demo data NY zip codes)
               res = await fetch(`https://api.zippopotam.us/us/${pin}`);
            }
            if (res.ok) {
              const data = await res.json();
              if (data && data.places && data.places.length > 0) {
                const coords = [parseFloat(data.places[0].latitude), parseFloat(data.places[0].longitude)];
                if (isValidLatLng(coords)) {
                  newCache[pin] = coords;
                } else {
                  newCache[`failed_${pin}`] = true;
                }
                updated = true;
              } else {
                newCache[`failed_${pin}`] = true;
                updated = true;
              }
            } else {
              newCache[`failed_${pin}`] = true;
              updated = true;
            }
          } catch (e) {
            newCache[`failed_${pin}`] = true;
            updated = true;
          }
        }
      }
      
      if (isSubscribed && updated) {
        setGeocodeCache(prev => ({ ...prev, ...newCache }));
      }
    };
    
    fetchGeocodes();
    return () => { isSubscribed = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, refreshTrigger]);

  // Request browser notification permission on mount
  useEffect(() => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Initialize and update Leaflet Live Dispatch Tracking Map
  useEffect(() => {
    if (activeTab !== 'dashboard' || !window.L) {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      return;
    }

    const mapContainer = document.getElementById('dispatch-leaflet-map');
    if (!mapContainer) return;

    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    // Centered around general Mumbai/India area for Indian context
    const defaultCenter = [19.0760, 72.8777];
    const map = window.L.map('dispatch-leaflet-map', {
      zoomControl: true,
      scrollWheelZoom: true
    }).setView(defaultCenter, 10);
    
    mapRef.current = map;

    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    const markersGroup = window.L.featureGroup().addTo(map);

    // 1. Plot Technicians
    const technicians = carpenters;
    technicians.forEach(t => {
      let coords;
      const gpsCoords = t.gpsCoords ? [Number(t.gpsCoords.lat), Number(t.gpsCoords.lng)] : null;
      if (isValidLatLng(gpsCoords)) {
        coords = gpsCoords;
      } else {
        // Fallback: slight random spread around center for simulation
        const hash = t.name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const latOffset = ((hash & 0xFF) / 255 - 0.5) * 0.12;
        const lngOffset = (((hash >> 8) & 0xFF) / 255 - 0.5) * 0.12;
        coords = [defaultCenter[0] + latOffset, defaultCenter[1] + lngOffset];
      }

      if (!isValidLatLng(coords)) return;

      const activeJobsCount = orders.filter(o => o.assignedCarpenter === t.name && isActiveOrder(o)).length;

      const techIcon = window.L.divIcon({
        className: 'custom-leaflet-tech-icon',
        html: `<div style="background-color: #3b82f6; border: 2px solid white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(0,0,0,0.4);"><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg></div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });

      const popupContent = `
        <div style="font-family: system-ui, -apple-system, sans-serif; color: #1e293b; padding: 4px; min-width: 140px;">
          <h5 style="margin: 0 0 4px 0; font-size: 13px; color: #3b82f6;">👷 ${t.name}</h5>
          <span style="font-size: 11px; color: #64748b;">Rank: ${t.rank}</span><br/>
          <span style="font-size: 11px; color: #64748b;">Active Jobs: ${activeJobsCount} / ${t.maxActiveJobs || 3}</span><br/>
          ${t.gpsCoords ? '<strong style="color: #22c55e; font-size: 10px;">● Online (Live GPS)</strong>' : '<em style="color: #94a3b8; font-size: 10px;">Offline (Last Position)</em>'}
        </div>
      `;

      window.L.marker(coords, { icon: techIcon })
        .bindPopup(popupContent)
        .addTo(markersGroup);
    });

    // 2. Plot Active Orders
    const activeOrders = orders.filter(isActiveOrder);
    activeOrders.forEach(o => {
      // Deterministic offset based on pincode for clean grid grouping
      const pinStr = o.pincode || '';
      let hash = 0;
      for (let i = 0; i < pinStr.length; i++) {
        hash = pinStr.charCodeAt(i) + ((hash << 5) - hash);
      }
      
      let coords;
      if (isValidLatLng(geocodeCache[pinStr])) {
        // Small random scatter around the true coordinates so multiple jobs in same pincode don't perfectly overlap
        const latOffset = ((hash & 0xFF) / 255 - 0.5) * 0.008;
        const lngOffset = (((hash >> 8) & 0xFF) / 255 - 0.5) * 0.008;
        coords = [Number(geocodeCache[pinStr][0]) + latOffset, Number(geocodeCache[pinStr][1]) + lngOffset];
      } else {
        // Fallback: Random offset from default center if geocoding fails or is loading
        const latOffset = ((hash & 0xFF) / 255 - 0.5) * 0.16;
        const lngOffset = (((hash >> 8) & 0xFF) / 255 - 0.5) * 0.16;
        coords = [defaultCenter[0] + latOffset, defaultCenter[1] + lngOffset];
      }

      if (!isValidLatLng(coords)) return;

      const statusColor = o.jobStatus === 'In Progress' ? '#eab308' : o.jobStatus === 'Assigned' ? '#10b981' : o.jobStatus === 'On Hold' ? '#f97316' : '#ef4444';

      const orderIcon = window.L.divIcon({
        className: 'custom-leaflet-order-icon',
        html: `<div style="background-color: ${statusColor}; border: 2px solid white; width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(0,0,0,0.4);"><svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path><circle cx="12" cy="10" r="3"></circle></svg></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });

      const popupContent = `
        <div style="font-family: system-ui, -apple-system, sans-serif; color: #1e293b; padding: 4px; min-width: 150px;">
          <h5 style="margin: 0 0 4px 0; font-size: 13px; color: ${statusColor};">📦 ${o.orderId}</h5>
          <span style="font-size: 11px;">Client: <strong>${o.customerName}</strong></span><br/>
          <span style="font-size: 11px;">Pincode: ${o.pincode}</span><br/>
          <span style="font-size: 11px;">Status: <strong style="color: ${statusColor}">${o.jobStatus}</strong></span><br/>
          <span style="font-size: 11px;">Technician: ${o.assignedCarpenter || 'Unassigned'}</span>
        </div>
      `;

      window.L.marker(coords, { icon: orderIcon })
        .bindPopup(popupContent)
        .addTo(markersGroup);
    });

    if (markersGroup.getLayers().length > 0) {
      try {
        map.fitBounds(markersGroup.getBounds().pad(0.1));
      } catch (err) {}
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, refreshTrigger, geocodeCache]);


  const triggerRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleRoleChange = (e) => {
    const newRole = e.target.value;
    setUserRole(newRole);
    setRole(newRole);
    triggerRefresh();
  };

  // Handle CSV Import
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCsvText(event.target.result);
      };
      reader.readAsText(file);
    }
  };

  const handleImportCSV = () => {
    if (!csvText.trim()) {
      alert('Please enter or load some CSV data first.');
      return;
    }

    try {
      const lines = csvText.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length <= 1) {
        alert('Invalid CSV data. Ensure you have a header row and data rows.');
        return;
      }

      // Helper function to parse CSV lines correctly, including commas within quotes
      const parseCSVLine = (line) => {
        const result = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        result.push(current.trim());
        // Clean leading/trailing quotes and spacing
        return result.map(val => val.replace(/^"|"$/g, '').trim());
      };

      const headerLine = lines[0];
      const headers = parseCSVLine(headerLine).map(h => h.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim());

      const getHeaderIdx = (aliases) => {
        return headers.findIndex(h => aliases.some(alias => h.includes(alias)));
      };

      const idxOrderId = getHeaderIdx(['order id', 'orderid']);
      const idxCustomerName = getHeaderIdx(['customer name', 'name']);
      const idxPhone = getHeaderIdx(['phone', 'contact']);
      const idxSku = getHeaderIdx(['sku', 'product']);
      const idxPayout = getHeaderIdx(['payout', 'price', 'amount', 'fee']);
      const idxPaymentType = getHeaderIdx(['payment type', 'payment']);
      const idxDeliveryDate = getHeaderIdx(['delivery date', 'date']);
      const idxPromiseDate = getHeaderIdx(['promise date', 'sla target', 'sla']);
      const idxProductImageUrl = getHeaderIdx(['product image url', 'product image', 'image url', 'image']);
      const idxProductReviewLink = getHeaderIdx(['product review link', 'product review', 'review link']);
      const idxSellerReviewLink = getHeaderIdx(['seller review link', 'seller review', 'seller reviewer']);
      
      const idxAddress = getHeaderIdx(['customer address', 'address']);
      const idxCity = getHeaderIdx(['city']);
      const idxState = getHeaderIdx(['state', 'province']);
      const idxPincode = getHeaderIdx(['pincode', 'pin', 'zip', 'postal']);

      const missingHeaders = [];
      if (idxOrderId === -1) missingHeaders.push('order id');
      if (idxCustomerName === -1) missingHeaders.push('customer name');
      if (idxPhone === -1) missingHeaders.push('phone');
      if (idxSku === -1) missingHeaders.push('sku');
      if (idxPayout === -1) missingHeaders.push('payout');
      if (idxPaymentType === -1) missingHeaders.push('payment type');
      if (idxDeliveryDate === -1) missingHeaders.push('delivery date');

      if (missingHeaders.length > 0) {
        alert(`Invalid CSV format. Missing required columns: ${missingHeaders.join(', ')}.\nExpected header columns: Order ID, Customer Name, Phone, SKU, Payout, Payment Type, Delivery Date`);
        return;
      }

      const currentOrders = orders;
      let duplicateCount = 0;
      const rowErrors = [];
      const ordersToImport = [];
      const ordersToUpdate = [];
      const seenCsvOrderIds = new Set();

      // Extract platform from template selection or auto-detect
      let detectedPlatform = selectedTemplate || 'Amazon';
      if (csvText.includes('FLIP-')) detectedPlatform = 'Flipkart';
      if (csvText.includes('WOO-')) detectedPlatform = 'WooCommerce';

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        const columns = parseCSVLine(line);
        
        // Skip empty lines
        if (columns.length === 1 && !columns[0]) continue;

        const expectedMinCols = 7; // Required headers count
        if (columns.length < expectedMinCols) {
          rowErrors.push(`Row ${i + 1}: Line has incomplete data (fewer than ${expectedMinCols} columns)`);
          continue;
        }

        const orderId = columns[idxOrderId];
        const customerName = columns[idxCustomerName];
        const phone = columns[idxPhone];
        const sku = columns[idxSku];
        const payoutStr = columns[idxPayout];
        const paymentType = columns[idxPaymentType];
        const deliveryDateStr = columns[idxDeliveryDate];
        const promiseDateStr = idxPromiseDate !== -1 ? columns[idxPromiseDate] : '';
        const productImageUrl = idxProductImageUrl !== -1 ? columns[idxProductImageUrl] : '';
        const productReviewLink = idxProductReviewLink !== -1 ? columns[idxProductReviewLink] : '';
        const sellerReviewLink = idxSellerReviewLink !== -1 ? columns[idxSellerReviewLink] : '';
        
        const customerAddress = idxAddress !== -1 ? columns[idxAddress] : '';
        const city = idxCity !== -1 ? columns[idxCity] : '';
        const state = idxState !== -1 ? columns[idxState] : '';
        const pincode = idxPincode !== -1 ? columns[idxPincode] : '';

        const rowNum = i + 1;
        const currentErrors = [];

        if (!orderId) {
          currentErrors.push('Missing Order ID');
        }
        if (!customerName) {
          currentErrors.push('Missing Customer Name');
        }
        if (!phone) {
          currentErrors.push('Missing Phone Number');
        }
        if (!sku) {
          currentErrors.push('Missing SKU');
        }

        const payoutVal = Number(payoutStr);
        if (payoutStr === '' || isNaN(payoutVal) || payoutVal < 0) {
          currentErrors.push(`Invalid Payout: "${payoutStr}" must be a non-negative number`);
        }

        let parsedDeliveryDate = null;
        if (deliveryDateStr) {
          const timestamp = Date.parse(deliveryDateStr);
          if (isNaN(timestamp)) {
            currentErrors.push(`Invalid Delivery Date format: "${deliveryDateStr}"`);
          } else {
            parsedDeliveryDate = new Date(timestamp).toISOString();
          }
        }

        let parsedPromiseDate = null;
        if (promiseDateStr) {
          const timestamp = Date.parse(promiseDateStr);
          if (isNaN(timestamp)) {
            currentErrors.push(`Invalid Promise Date format: "${promiseDateStr}"`);
          } else {
            parsedPromiseDate = new Date(timestamp).toISOString();
          }
        }

        if (currentErrors.length > 0) {
          rowErrors.push(`Row ${rowNum}: ${currentErrors.join(', ')}`);
          continue;
        }

        // Check duplicates in this CSV itself
        if (seenCsvOrderIds.has(orderId)) {
          duplicateCount++;
          continue;
        }
        seenCsvOrderIds.add(orderId);

        const existingOrder = currentOrders.find(o => o.orderId === orderId);
        const importedOrderFields = {
          orderId,
          platform: detectedPlatform,
          customerName,
          customerPhone: phone,
          customerAddress,
          city,
          state,
          pincode,
          sku,
          payout: payoutVal,
          deliveryStatus: existingOrder?.deliveryStatus || 'Pending',
          jobStatus: 'Unassigned',
          paymentStatus: existingOrder?.paymentStatus || 'Unpaid',
          paymentType: paymentType || 'Prepaid',
          deliveryDate: parsedDeliveryDate || new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          promiseDate: parsedPromiseDate || existingOrder?.promiseDate || existingOrder?.promise_date || '',
          promise_date: parsedPromiseDate || existingOrder?.promiseDate || existingOrder?.promise_date || '',
          productImage: productImageUrl || existingOrder?.productImage || existingOrder?.product_image_url || '',
          product_image_url: productImageUrl || existingOrder?.productImageUrl || existingOrder?.product_image_url || existingOrder?.productImage || '',
          productReviewLink: productReviewLink || existingOrder?.productReviewLink || existingOrder?.product_review_link || existingOrder?.productRefLink || '',
          productRefLink: productReviewLink || existingOrder?.productRefLink || existingOrder?.product_review_link || '',
          product_review_link: productReviewLink || existingOrder?.productReviewLink || existingOrder?.product_review_link || existingOrder?.productRefLink || '',
          sellerReviewLink: sellerReviewLink || existingOrder?.sellerReviewLink || existingOrder?.seller_review_link || existingOrder?.sellerReviewer || '',
          sellerReviewer: sellerReviewLink || existingOrder?.sellerReviewer || existingOrder?.seller_review_link || '',
          seller_review_link: sellerReviewLink || existingOrder?.sellerReviewLink || existingOrder?.seller_review_link || existingOrder?.sellerReviewer || '',
          orderDate: existingOrder?.orderDate || new Date().toISOString(),
          comments: existingOrder?.comments || [],
          auditLogs: [
            ...(existingOrder?.auditLogs || []),
            {
              timestamp: new Date().toISOString(),
              action: existingOrder ? 'Order Updated via CSV' : 'Order Created',
              user: role,
              comments: `${existingOrder ? 'Updated' : 'Imported'} via CSV (${detectedPlatform} format)`
            }
          ]
        };

        if (existingOrder) {
          ordersToUpdate.push({
            ...existingOrder,
            ...importedOrderFields,
            jobStatus: existingOrder.jobStatus || existingOrder.status || 'Unassigned',
            status: existingOrder.status || existingOrder.jobStatus || 'Unassigned',
            assembly_status: existingOrder.assembly_status || existingOrder.status || existingOrder.jobStatus || 'Unassigned',
            assignedCarpenter: existingOrder.assignedCarpenter,
            assignedCarpenterId: existingOrder.assignedCarpenterId,
            assigned_carpenter: existingOrder.assigned_carpenter,
            assigned_carpenter_name: existingOrder.assigned_carpenter_name
          });
        } else {
          ordersToImport.push({
            ...importedOrderFields,
            jobStatus: 'Unassigned',
            status: 'Unassigned',
            assembly_status: 'Unassigned',
            assignedCarpenter: null
          });
        }
      }

      if (rowErrors.length > 0) {
        alert(`Failed to import CSV due to validation errors:\n\n${rowErrors.slice(0, 10).join('\n')}${rowErrors.length > 10 ? `\n...and ${rowErrors.length - 10} more errors.` : ''}\n\nPlease correct these rows and try again.`);
        return;
      }

      if (ordersToImport.length > 0 || ordersToUpdate.length > 0) {
        const updatedById = new Map();
        ordersToUpdate.forEach(order => updatedById.set(order.orderId, order));
        const mergedOrders = [
          ...ordersToImport,
          ...currentOrders.map(order => updatedById.get(order.orderId) || order)
        ];
        const changedOrders = [...ordersToImport, ...ordersToUpdate];
        saveOrders(mergedOrders, changedOrders);
        addNotification(`CSV processed: imported ${ordersToImport.length}, updated ${ordersToUpdate.length}. Platform: ${detectedPlatform}.`);
        setCsvText('');
        queryClient.invalidateQueries({ queryKey: ['orders'] });
        triggerRefresh();
        alert(`CSV Import Complete!\n- Imported: ${ordersToImport.length} orders\n- Updated: ${ordersToUpdate.length} orders\n- Duplicate rows skipped: ${duplicateCount}`);
      } else {
        alert(`No orders imported or updated. (Skipped ${duplicateCount} duplicate rows)`);
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
    const allOrders = orders;
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
    return carpenters.map(carp => {
      // Find completed jobs assigned to this carpenter
      const completedJobs = allOrders.filter(
        o => o.assignedCarpenter === carp.name && o.jobStatus === 'Completed' && (showArchivedPayouts || !o.archived)
      );

      // Sum payout of completed jobs that are still 'Unpaid' or 'Pending Payout'
      const outstandingPayout = completedJobs
        .filter(o => o.paymentStatus === 'Unpaid' || o.paymentStatus === 'Pending Payout')
        .reduce((sum, o) => sum + o.payout, 0);

      const totalCompletedPayout = completedJobs.reduce((sum, o) => sum + o.payout, 0);

      return {
        ...carp,
        completedJobs,
        outstandingPayout,
        totalCompletedPayout
      };
    }).filter(carp => carp.completedJobs.length > 0);
  };

  const handleClearPayoutLegacy = (orderId, carpenterName, amount) => {
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
  void handleClearPayoutLegacy;

  const isPendingPayout = (order) => order.paymentStatus === 'Unpaid' || order.paymentStatus === 'Pending Payout';

  const clearPayoutOrders = (jobsToClear, notificationLabel) => {
    const pendingJobs = jobsToClear.filter(isPendingPayout);
    if (pendingJobs.length === 0) return;

    const jobsById = new Map(pendingJobs.map(job => [job.orderId, job]));
    const timestamp = new Date().toISOString();
    const changedOrders = [];
    const localSourceOrders = stateManager.getOrders();
    const sourceOrders = localSourceOrders.length > 0 ? localSourceOrders : orders;
    const sourceOrderIds = new Set(sourceOrders.map(order => order.orderId || order.order_id || order.id));
    const missingOrders = pendingJobs
      .filter(job => !sourceOrderIds.has(job.orderId))
      .map(job => normalizeOrder(job));
    const updatedOrders = [...sourceOrders, ...missingOrders].map(sourceOrder => {
      const order = normalizeOrder(sourceOrder);
      const targetJob = jobsById.get(order.orderId);
      if (!targetJob) return sourceOrder;

      const updatedOrder = normalizeOrder({
        ...order,
        paymentStatus: 'Paid',
        payment_status: 'Paid',
        auditLogs: [
          ...(order.auditLogs || []),
          {
            timestamp,
            action: 'Payout Cleared',
            user: role,
            comments: `Outstanding payout of ₹${targetJob.payout} cleared by Super Admin.`
          }
        ]
      });

      changedOrders.push(updatedOrder);
      return updatedOrder;
    });

    saveOrders(updatedOrders, changedOrders);
    setSelectedPayoutOrderIds(prev => prev.filter(orderId => !jobsById.has(orderId)));
    queryClient.setQueryData(fsaQueries.orders.all(1, 500).queryKey, (old) => {
      if (!old) return old;
      return {
        ...old,
        items: old.items.map(order => {
          const orderId = order.order_id || order.id;
          if (!jobsById.has(orderId)) return order;
          return {
            ...order,
            payment_status: 'Paid',
            paymentStatus: 'Paid',
            audit_logs: changedOrders.find(changed => changed.orderId === orderId)?.auditLogs || order.audit_logs
          };
        })
      };
    });
    queryClient.invalidateQueries({ queryKey: ['orders'] });

    const totalAmount = pendingJobs.reduce((sum, job) => sum + Number(job.payout || 0), 0);
    addNotification(`Payout: Cleared ₹${totalAmount} outstanding payout for ${notificationLabel} (${pendingJobs.length} order${pendingJobs.length === 1 ? '' : 's'}).`);
    triggerRefresh();
  };

  const handleClearPayout = (job, carpenterName) => {
    clearPayoutOrders([job], `${carpenterName} / Order ${job.orderId}`);
  };

  const togglePayoutSelection = (orderId) => {
    setSelectedPayoutOrderIds(prev => (
      prev.includes(orderId)
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    ));
  };

  const setPayoutSelection = (jobs, selected) => {
    const pendingIds = jobs.filter(isPendingPayout).map(job => job.orderId);
    setSelectedPayoutOrderIds(prev => {
      const current = new Set(prev);
      pendingIds.forEach(orderId => {
        if (selected) current.add(orderId);
        else current.delete(orderId);
      });
      return Array.from(current);
    });
  };

  const getClaimKey = (claim) => `${claim.type || ''}|${Number(claim.amount || 0)}|${claim.notes || ''}`;
  const getClaimResolutionKey = (claim) => `${String(claim.type || '').trim().toLowerCase()}|${Number(claim.amount || 0)}`;

  const parseExpenseClaimText = (text = '') => {
    const match = text.match(/(?:requested extra charge of|field tech requested extra charge of)\s*₹?\s*(\d+(?:\.\d+)?)\s*for\s*(.+?)\.\s*Notes:\s*(.+)$/i);
    if (!match) return null;
    return {
      amount: Number(match[1]),
      type: match[2].trim(),
      notes: match[3].trim()
    };
  };

  const parseResolvedExpenseClaimText = (text = '') => {
    const match = text.match(/(?:approved|rejected|dismissed)\s+extra charge of\s*(?:₹|â‚¹)?\s*(\d+(?:\.\d+)?)\s*for\s*(.+?)(?:\.|$)/i);
    if (!match) return null;
    return {
      amount: Number(match[1]),
      type: match[2].trim()
    };
  };

  const getOrderExpenseClaims = (order) => {
    const closedClaimsClearedAt = (order.auditLogs || [])
      .filter(log => log.action === 'Closed Order Expense Claims Cleared')
      .map(log => new Date(log.timestamp || 0).getTime())
      .filter(Number.isFinite)
      .reduce((latest, ts) => Math.max(latest, ts), 0);
    const isSuppressedLegacyClaim = (claim) => (
      closedClaimsClearedAt > 0
      && !isActiveOrder(order)
      && new Date(claim.timestamp || 0).getTime() <= closedClaimsClearedAt
    );

    const rawStructuredClaims = (order.extraCharges || []).map(claim => ({
      ...claim,
      source: 'structured'
    }));
    const seenClaims = new Set(rawStructuredClaims.map(getClaimKey));
    const resolvedClaimKeys = new Set(
      rawStructuredClaims
        .filter(claim => claim.status && claim.status !== 'Pending Approval')
        .map(getClaimResolutionKey)
    );
    (order.auditLogs || []).forEach(log => {
      if (log.action !== 'Extra Charge Approved' && log.action !== 'Extra Charge Rejected') return;
      const parsed = parseResolvedExpenseClaimText(log.comments || '');
      if (parsed) resolvedClaimKeys.add(getClaimResolutionKey(parsed));
    });
    (order.comments || []).forEach(comment => {
      const parsed = parseResolvedExpenseClaimText(comment.text || '');
      if (parsed) resolvedClaimKeys.add(getClaimResolutionKey(parsed));
    });
    const structuredClaims = rawStructuredClaims.filter(claim => claim.status !== 'Dismissed');

    const auditClaims = (order.auditLogs || [])
      .filter(log => log.action === 'Extra Charge Requested')
      .map(log => {
        const parsed = parseExpenseClaimText(log.comments || '');
        if (!parsed) return null;
        return {
          id: `audit_${order.orderId}_${log.timestamp}`,
          ...parsed,
          status: 'Pending Approval',
          requestedBy: log.user,
          timestamp: log.timestamp,
          source: 'audit'
        };
      })
      .filter(Boolean)
      .filter(claim => !resolvedClaimKeys.has(getClaimResolutionKey(claim)))
      .filter(claim => !isSuppressedLegacyClaim(claim))
      .filter(claim => {
        const key = getClaimKey(claim);
        if (seenClaims.has(key)) return false;
        seenClaims.add(key);
        return true;
      });

    const commentClaims = (order.comments || [])
      .map(comment => {
        const parsed = parseExpenseClaimText(comment.text || '');
        if (!parsed) return null;
        return {
          id: `comment_${order.orderId}_${comment.timestamp}`,
          ...parsed,
          status: 'Pending Approval',
          requestedBy: comment.author,
          timestamp: comment.timestamp,
          source: 'comment'
        };
      })
      .filter(Boolean)
      .filter(claim => !resolvedClaimKeys.has(getClaimResolutionKey(claim)))
      .filter(claim => !isSuppressedLegacyClaim(claim))
      .filter(claim => {
        const key = getClaimKey(claim);
        if (seenClaims.has(key)) return false;
        seenClaims.add(key);
        return true;
      });

    return [...structuredClaims, ...auditClaims, ...commentClaims];
  };

  const getExpenseClaimsData = () => {
    return getFilteredOrdersList()
      .flatMap(order => getOrderExpenseClaims(order).map(claim => ({
        ...claim,
        orderId: order.orderId,
        customerName: order.customerName,
        assignedCarpenter: order.assignedCarpenter,
        isClosedOrder: !isActiveOrder(order),
        currentPayout: Number(order.payout || 0)
      })))
      .filter(claim => claim.status === 'Pending Approval')
      .sort((a, b) => {
        return new Date(b.timestamp || 0) - new Date(a.timestamp || 0);
      });
  };

  const hasResolvedExpenseClaim = (order, claim) => {
    if (!order || !claim) return false;
    const key = getClaimResolutionKey(claim);
    const resolvedInCharges = (order.extraCharges || []).some(existingClaim => (
      getClaimResolutionKey(existingClaim) === key
      && existingClaim.status
      && existingClaim.status !== 'Pending Approval'
    ));
    if (resolvedInCharges) return true;

    return (order.auditLogs || []).some(log => {
      if (log.action !== 'Extra Charge Approved' && log.action !== 'Extra Charge Rejected') return false;
      const parsed = parseResolvedExpenseClaimText(log.comments || '');
      return parsed && getClaimResolutionKey(parsed) === key;
    });
  };

  const handleResolveExpenseClaim = (orderId, chargeId, resolution, fallbackClaim = null) => {
    const timestamp = new Date().toISOString();
    let changedOrder = null;
    let targetClaim = null;
    let alreadyResolved = false;

    const localSourceOrders = stateManager.getOrders();
    const sourceOrders = localSourceOrders.length > 0 ? localSourceOrders : orders;
    const currentOrder = sourceOrders.map(normalizeOrder).find(order => (
      order && (order.orderId === orderId || order.id === orderId || order.order_id === orderId)
    ));
    if (fallbackClaim && hasResolvedExpenseClaim(currentOrder, fallbackClaim)) {
      alert('This expense claim is already resolved.');
      return;
    }

    const updatedOrders = sourceOrders.map(sourceOrder => {
      const order = normalizeOrder(sourceOrder);
      if (!order || (order.orderId !== orderId && order.id !== orderId && order.order_id !== orderId)) return sourceOrder;

      let updatedCharges = (order.extraCharges || []).map(claim => {
        if (claim.id !== chargeId) return claim;
        targetClaim = claim;
        if (claim.status && claim.status !== 'Pending Approval') {
          alreadyResolved = true;
          return claim;
        }
        return {
          ...claim,
          status: resolution,
          payoutApplied: resolution === 'Approved',
          resolvedAt: timestamp,
          resolvedBy: role
        };
      });

      if (!targetClaim && fallbackClaim) {
        targetClaim = fallbackClaim;
        updatedCharges = [
          ...updatedCharges,
          {
            ...fallbackClaim,
            id: chargeId,
            status: resolution,
            payoutApplied: resolution === 'Approved',
            resolvedAt: timestamp,
            resolvedBy: role
          }
        ];
      }

      if (!targetClaim) return sourceOrder;

      const amountVal = Number(targetClaim.amount || 0);
      const alreadyResolvedForOrder = hasResolvedExpenseClaim(order, targetClaim);
      const payoutDelta = resolution === 'Approved' && !targetClaim.payoutApplied && !alreadyResolvedForOrder ? amountVal : 0;
      const currentPayout = Number(order.payout || order.assembly_payout || 0);

      changedOrder = normalizeOrder({
        ...order,
        extraCharges: updatedCharges,
        extra_charges: updatedCharges,
        payout: currentPayout + payoutDelta,
        assembly_payout: currentPayout + payoutDelta,
        assembly_amount: currentPayout + payoutDelta,
        auditLogs: [
          ...(order.auditLogs || []),
          {
            timestamp,
            action: resolution === 'Approved' ? 'Extra Charge Approved' : 'Extra Charge Rejected',
            user: role,
            comments: `${resolution} extra charge of ₹${amountVal} for ${targetClaim.type || 'Expense'}.`
          }
        ],
        comments: [
          ...(order.comments || []),
          {
            timestamp,
            author: 'System',
            text: `System: Extra charge request of ₹${amountVal} has been ${resolution.toLowerCase()} by ${role}.`
          }
        ]
      });

      return changedOrder;
    });

    if (alreadyResolved) {
      alert('This expense claim is already resolved.');
      return;
    }

    if (!changedOrder || !targetClaim) {
      alert('Could not resolve this claim. Refresh the orders and try again.');
      return;
    }

    saveOrders(updatedOrders, changedOrder);
    addNotification(`Expense Claim: ${resolution} ₹${targetClaim.amount} for order ${orderId}.`);
    queryClient.invalidateQueries({ queryKey: ['orders'] });
    triggerRefresh();
    alert(`Expense claim ${resolution.toLowerCase()} successfully.`);
  };

  const handleClearClosedExpenseClaims = () => {
    const timestamp = new Date().toISOString();
    const localSourceOrders = stateManager.getOrders();
    const sourceOrders = localSourceOrders.length > 0 ? localSourceOrders : orders;
    let clearedCount = 0;
    const changedOrders = [];

    const updatedOrders = sourceOrders.map(sourceOrder => {
      const order = normalizeOrder(sourceOrder);
      if (!order || isActiveOrder(order)) return sourceOrder;

      const pendingClosedClaims = getOrderExpenseClaims(order).filter(claim => claim.status === 'Pending Approval');
      if (pendingClosedClaims.length === 0) return sourceOrder;

      const existingCharges = order.extraCharges || [];
      const existingKeys = new Set(existingCharges.map(getClaimKey));
      const dismissedFallbackClaims = pendingClosedClaims
        .filter(claim => !existingKeys.has(getClaimKey(claim)))
        .map(claim => ({
          ...claim,
          status: 'Dismissed',
          resolvedAt: timestamp,
          resolvedBy: role,
          dismissalReason: 'Cleared because order is already closed.'
        }));

      const updatedCharges = [
        ...existingCharges.map(claim => (
          claim.status === 'Pending Approval'
            ? {
                ...claim,
                status: 'Dismissed',
                resolvedAt: timestamp,
                resolvedBy: role,
                dismissalReason: 'Cleared because order is already closed.'
              }
            : claim
        )),
        ...dismissedFallbackClaims
      ];

      clearedCount += pendingClosedClaims.length;
      const updatedOrder = normalizeOrder({
        ...order,
        extraCharges: updatedCharges,
        extra_charges: updatedCharges,
        auditLogs: [
          ...(order.auditLogs || []),
          {
            timestamp,
            action: 'Closed Order Expense Claims Cleared',
            user: role,
            comments: `Dismissed ${pendingClosedClaims.length} pending expense claim${pendingClosedClaims.length === 1 ? '' : 's'} on closed order.`
          }
        ],
        comments: [
          ...(order.comments || []),
          {
            timestamp,
            author: 'System',
            text: `System: Cleared ${pendingClosedClaims.length} pending expense claim${pendingClosedClaims.length === 1 ? '' : 's'} because this order is already closed.`
          }
        ]
      });

      changedOrders.push(updatedOrder);
      return updatedOrder;
    });

    if (clearedCount === 0) {
      alert('No pending expense claims found on closed orders.');
      return;
    }

    saveOrders(updatedOrders, changedOrders);
    addNotification(`Expense Claims: Cleared ${clearedCount} closed-order claim${clearedCount === 1 ? '' : 's'}.`);
    queryClient.invalidateQueries({ queryKey: ['orders'] });
    triggerRefresh();
    alert(`Cleared ${clearedCount} closed-order expense claim${clearedCount === 1 ? '' : 's'}.`);
  };

  const payoutLedgerData = getPayoutData();
  const expenseClaimsData = getExpenseClaimsData();
  const pendingExpenseClaims = expenseClaimsData.filter(claim => claim.status === 'Pending Approval');
  const pendingClosedExpenseClaims = pendingExpenseClaims.filter(claim => claim.isClosedOrder);
  const pendingPayoutJobs = payoutLedgerData.flatMap(carp => carp.completedJobs.filter(isPendingPayout));
  const selectedPayoutJobs = pendingPayoutJobs.filter(job => selectedPayoutOrderIds.includes(job.orderId));
  const selectedPayoutTotal = selectedPayoutJobs.reduce((sum, job) => sum + Number(job.payout || 0), 0);
  const allPendingPayoutsSelected = pendingPayoutJobs.length > 0 && pendingPayoutJobs.every(job => selectedPayoutOrderIds.includes(job.orderId));
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

          {/* Role Switcher (Hidden in Server Mode for strict security) */}
          {!pb.authStore.isValid && (
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
                <option value="Dispatcher, Inventory Manager">Dispatcher + Inventory</option>
                <option value="Dispatcher, Customer Support">Dispatcher + Support</option>
                <option value="Inventory Manager, Customer Support">Inventory + Support</option>
              </select>
            </div>
          )}
        </div>
      </header>

      {/* Main Tab Navigation */}
      <nav className="portal-tabs">
        {hasPermission(role, ['Super Admin', 'Dispatcher']) && (
          <button 
            className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => { window.location.hash = '#/dashboard'; setShowNotifDropdown(false); }}
          >
            <LayoutDashboard size={18} /> Overview Dashboard
          </button>
        )}
        
        {hasPermission(role, ['Super Admin', 'Dispatcher', 'Inventory Manager', 'Customer Support']) && (
          <button 
            className={`tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => { window.location.hash = '#/orders'; setShowNotifDropdown(false); }}
          >
            <Package size={18} /> Orders Dashboard
          </button>
        )}

        {hasPermission(role, ['Super Admin', 'Inventory Manager']) && (
          <button 
            className={`tab-btn ${activeTab === 'inventory' ? 'active' : ''}`}
            onClick={() => { window.location.hash = '#/inventory'; setShowNotifDropdown(false); }}
          >
            <ClipboardList size={18} /> Logistics & Parts
          </button>
        )}

        {hasPermission(role, ['Super Admin', 'Inventory Manager']) && (
          <button 
            className={`tab-btn ${activeTab === 'expenses' ? 'active' : ''}`}
            onClick={() => { window.location.hash = '#/expenses'; setShowNotifDropdown(false); }}
          >
            <IndianRupee size={18} /> Expense Claims
          </button>
        )}

        {hasPermission(role, ['Super Admin', 'Customer Support']) && (
          <button 
            className={`tab-btn ${activeTab === 'support' ? 'active' : ''}`}
            onClick={() => { window.location.hash = '#/support'; setShowNotifDropdown(false); }}
          >
            <HelpCircle size={18} /> Support Portal
          </button>
        )}
        
        {hasPermission(role, ['Super Admin', 'Dispatcher']) && (
          <button 
            className={`tab-btn ${activeTab === 'technicians' ? 'active' : ''}`}
            onClick={() => { window.location.hash = '#/technicians'; setShowNotifDropdown(false); }}
          >
            <UserCheck size={18} /> Technicians
          </button>
        )}
        
        {hasRole(role, 'Super Admin') && (
          <button 
            className={`tab-btn ${activeTab === 'payouts' ? 'active' : ''}`}
            onClick={() => { window.location.hash = '#/payouts'; setShowNotifDropdown(false); }}
          >
            <Coins size={18} /> Payout Ledger
          </button>
        )}

        {hasRole(role, 'Super Admin') && (
          <button 
            className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => { window.location.hash = '#/settings'; setShowNotifDropdown(false); }}
          >
            <Settings size={18} /> Integrations & API
          </button>
        )}
      </nav>

      {/* Main Workspace Body */}
      <main className="portal-body-content">
        {hasPermission(role, ['Super Admin', 'Dispatcher']) && (
          <div 
            className="tab-panel dashboard-panel animate-fade-in"
            style={{ display: activeTab === 'dashboard' ? 'block' : 'none' }}
          >
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
                <div className="kpi-value">{carpenters.length}</div>
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

              {/* Live Dispatch map */}
              <div className="live-map-card card-style">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div>
                    <h4 style={{ margin: 0 }}>Live Dispatch Tracking</h4>
                    <p className="card-desc" style={{ margin: 0 }}>Real-time location of active technicians and pending orders.</p>
                  </div>
                  <span className="live-indicator"><span className="pulse-dot"></span> Live GPS</span>
                </div>

                <div style={{ position: 'relative', width: '100%' }}>
                  <div id="dispatch-leaflet-map" style={{ height: '350px', borderRadius: '8px', zIndex: 1, border: '1px solid var(--admin-border-color)' }}></div>
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
                  {carpenters.map(c => {
                    const activeJobsCount = orders.filter(
                      o => o.assignedCarpenter === c.name && isActiveOrder(o)
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

        {hasPermission(role, ['Super Admin', 'Dispatcher', 'Inventory Manager', 'Customer Support']) && (
          <div 
            className="tab-panel orders-panel animate-fade-in"
            style={{ display: activeTab === 'orders' ? 'block' : 'none' }}
          >
            {/* Tab Header Bar with Toggle & Action */}
            <div className="orders-tab-header" style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
              paddingBottom: '12px',
              borderBottom: '1px solid var(--admin-border-color)',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: 'var(--admin-text-primary)' }}>
                Installations Dispatch Console
              </h3>
              
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(true)}
                  className="template-btn active"
                  style={{
                    margin: 0,
                    fontSize: '12px',
                    padding: '6px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  <Upload size={13} />
                  <span>Create Manual Job</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowOpsTools(!showOpsTools)}
                  className="template-btn"
                  style={{
                    margin: 0,
                    fontSize: '12px',
                    padding: '6px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    backgroundColor: showOpsTools ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                    border: '1px solid var(--admin-border-color)',
                    color: showOpsTools ? 'var(--color-secondary, #3b82f6)' : 'var(--admin-text-secondary)',
                    fontWeight: '600'
                  }}
                >
                  <Cpu size={13} />
                  <span>{showOpsTools ? 'Hide Operations Panel' : 'Show Operations Panel'}</span>
                </button>
              </div>
            </div>

            {/* Top Row: CSV Importer & Auto Allocation Engine (Collapsible) */}
            {showOpsTools && (
              hasPermission(role, ['Super Admin', 'Dispatcher']) ? (
                <div className="orders-top-control-grid" style={{ marginBottom: '20px' }}>
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
                      <div style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px', padding: '8px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px' }}>
                        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Or upload CSV file:</span>
                        <input 
                          type="file" 
                          accept=".csv" 
                          onChange={handleFileUpload} 
                          style={{ fontSize: '13px', color: 'var(--text-color)' }}
                        />
                      </div>
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
                      <button 
                        type="button"
                        onClick={async () => {
                          if (window.confirm("Are you sure you want to clear all local browser cache? This will clean up local sample data and load fresh, active records from the PocketBase server.")) {
                            await resetState();
                            triggerRefresh();
                            alert("Local browser cache cleared! Fetching fresh data from the server...");
                            window.location.reload();
                          }
                        }}
                        className="import-submit-btn"
                        title="Clears all local storage/IndexedDB mock files and pulls clean records from server"
                        style={{ flex: 1, margin: 0, minWidth: '120px', backgroundColor: 'transparent', border: '1px solid var(--color-danger, #ef4444)', color: 'var(--color-danger, #ef4444)' }}
                      >
                        Clear Local Cache
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
                          {orders.filter(o => o.jobStatus === 'Unassigned').length}
                        </span>
                        <span className="stat-label">Unassigned Jobs</span>
                      </div>
                      <div className="engine-stat">
                        <span className="stat-num">{carpenters.length}</span>
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
              )
            )}

            {/* The main Order List Grid */}
            <OrderGrid 
              refreshTrigger={refreshTrigger}
              onRefresh={triggerRefresh}
            />
          </div>
        )}

        {hasPermission(role, ['Super Admin', 'Inventory Manager']) && (
          <div 
            className="tab-panel inventory-panel animate-fade-in"
            style={{ display: activeTab === 'inventory' ? 'block' : 'none' }}
          >
            <InventoryDashboard 
              refreshTrigger={refreshTrigger}
              onRefresh={triggerRefresh}
            />
          </div>
        )}

        {hasPermission(role, ['Super Admin', 'Customer Support']) && (
          <div 
            className="tab-panel support-panel animate-fade-in"
            style={{ display: activeTab === 'support' ? 'block' : 'none' }}
          >
            <SupportPortal 
              refreshTrigger={refreshTrigger}
              onRefresh={triggerRefresh}
            />
          </div>
        )}

        {hasPermission(role, ['Super Admin', 'Dispatcher']) && (
          <div 
            className="tab-panel technicians-panel animate-fade-in"
            style={{ display: activeTab === 'technicians' ? 'block' : 'none' }}
          >
            <TechniciansDashboard 
              refreshTrigger={refreshTrigger}
              onRefresh={triggerRefresh}
            />
          </div>
        )}

        {hasPermission(role, ['Super Admin', 'Inventory Manager']) && (
          <div 
            className="tab-panel expenses-panel animate-fade-in"
            style={{ display: activeTab === 'expenses' ? 'block' : 'none' }}
          >
            <div className="ledger-workspace">
              <div className="ledger-summary-header">
                <div>
                  <h3><IndianRupee size={22} /> Expense Claims</h3>
                  <p className="subtitle">Approve technician reimbursement requests before they are added to payout liability.</p>
                </div>
                <div className="ledger-total-box">
                  <span className="label">Pending Claims:</span>
                  <span className="value font-mono">{pendingExpenseClaims.length}</span>
                </div>
                <button
                  type="button"
                  className="expense-clear-closed-btn"
                  disabled={pendingClosedExpenseClaims.length === 0}
                  onClick={handleClearClosedExpenseClaims}
                >
                  Clear Closed Claims ({pendingClosedExpenseClaims.length})
                </button>
              </div>

              <div className="expense-claims-panel">
                <div className="expense-claims-header">
                  <div>
                    <h4>Reimbursement Approval Queue</h4>
                    <p>Claims submitted by technicians for travel, hardware, and other field expenses.</p>
                  </div>
                  <div className="expense-claims-count">
                    <strong>{pendingExpenseClaims.length}</strong>
                    <span>Pending</span>
                  </div>
                  <button
                    type="button"
                    className="expense-clear-closed-btn"
                    disabled={pendingClosedExpenseClaims.length === 0}
                    onClick={handleClearClosedExpenseClaims}
                  >
                    Clear Closed ({pendingClosedExpenseClaims.length})
                  </button>
                </div>

                {expenseClaimsData.length === 0 ? (
                  <div className="expense-claims-empty">No reimbursement claims submitted yet.</div>
                ) : (
                  <div className="expense-claims-list">
                    {expenseClaimsData.map(claim => {
                      const isPending = claim.status === 'Pending Approval';
                      const statusClass = (claim.status || 'pending').toLowerCase().replace(/\s+/g, '-');

                      return (
                        <div key={`expenses-${claim.orderId}-${claim.id}`} className={`expense-claim-row ${statusClass}`}>
                          <div className="expense-claim-main">
                            <div className="expense-claim-title">
                              <strong>{claim.type}</strong>
                              <span className={`expense-claim-status ${statusClass}`}>{claim.status}</span>
                            </div>
                            <div className="expense-claim-meta">
                              <span>Order {claim.orderId}</span>
                              <span>{claim.assignedCarpenter || claim.requestedBy || 'Technician'}</span>
                              <span>{claim.timestamp ? new Date(claim.timestamp).toLocaleString('en-IN') : 'No date'}</span>
                            </div>
                            <p>{claim.notes || 'No notes provided.'}</p>
                            {claim.receipt && (
                              <a href={claim.receipt} target="_blank" rel="noopener noreferrer" className="expense-receipt-link">
                                View Receipt
                              </a>
                            )}
                          </div>
                          <div className="expense-claim-side">
                            <strong>₹{claim.amount}</strong>
                            {isPending ? (
                              <div className="expense-claim-actions">
                                <button type="button" className="expense-approve-btn" onClick={() => handleResolveExpenseClaim(claim.orderId, claim.id, 'Approved', claim)}>
                                  Approve
                                </button>
                                <button type="button" className="expense-reject-btn" onClick={() => handleResolveExpenseClaim(claim.orderId, claim.id, 'Rejected', claim)}>
                                  Reject
                                </button>
                              </div>
                            ) : (
                              <span className="expense-resolved-note">
                                {claim.resolvedAt ? `Resolved ${new Date(claim.resolvedAt).toLocaleDateString('en-IN')}` : 'Resolved'}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {hasRole(role, 'Super Admin') && (
          <div 
            className="tab-panel payouts-panel animate-fade-in"
            style={{ display: activeTab === 'payouts' ? 'block' : 'none' }}
          >
            {!hasRole(role, 'Super Admin') ? (
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
                  <div className="ledger-bulk-actions">
                    <label className="payout-select-toggle">
                      <input
                        type="checkbox"
                        checked={allPendingPayoutsSelected}
                        disabled={pendingPayoutJobs.length === 0}
                        onChange={(e) => setPayoutSelection(pendingPayoutJobs, e.target.checked)}
                      />
                      Select Pending
                    </label>
                    <div className="selected-payout-summary">
                      <span>{selectedPayoutJobs.length} selected</span>
                      <strong>₹{selectedPayoutTotal}</strong>
                    </div>
                    <button
                      type="button"
                      className="bulk-clear-payout-btn"
                      disabled={selectedPayoutJobs.length === 0}
                      onClick={() => clearPayoutOrders(selectedPayoutJobs, 'selected carpenters')}
                    >
                      Clear Selected
                    </button>
                  </div>
                  <div className="ledger-total-box" style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', color: 'var(--text-muted)' }}>
                      <input 
                        type="checkbox" 
                        checked={showArchivedPayouts} 
                        onChange={(e) => setShowArchivedPayouts(e.target.checked)} 
                        style={{ margin: 0 }}
                      />
                      Show Archived
                    </label>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                      <span className="label">Total Company Outstanding:</span>
                      <span className="value font-mono">₹{totalCompanyOutstanding}</span>
                    </div>
                  </div>
                </div>

                <div className="expense-claims-panel">
                  <div className="expense-claims-header">
                    <div>
                      <h4>Expense Claims</h4>
                      <p>Approve technician reimbursement requests for travel, hardware, and other field expenses.</p>
                    </div>
                    <div className="expense-claims-count">
                      <strong>{pendingExpenseClaims.length}</strong>
                      <span>Pending</span>
                    </div>
                    <button
                      type="button"
                      className="expense-clear-closed-btn"
                      disabled={pendingClosedExpenseClaims.length === 0}
                      onClick={handleClearClosedExpenseClaims}
                    >
                      Clear Closed ({pendingClosedExpenseClaims.length})
                    </button>
                  </div>

                  {expenseClaimsData.length === 0 ? (
                    <div className="expense-claims-empty">No reimbursement claims submitted yet.</div>
                  ) : (
                    <div className="expense-claims-list">
                      {expenseClaimsData.map(claim => {
                        const isPending = claim.status === 'Pending Approval';
                        const statusClass = (claim.status || 'pending').toLowerCase().replace(/\s+/g, '-');

                        return (
                          <div key={`${claim.orderId}-${claim.id}`} className={`expense-claim-row ${statusClass}`}>
                            <div className="expense-claim-main">
                              <div className="expense-claim-title">
                                <strong>{claim.type}</strong>
                                <span className={`expense-claim-status ${statusClass}`}>{claim.status}</span>
                              </div>
                              <div className="expense-claim-meta">
                                <span>Order {claim.orderId}</span>
                                <span>{claim.assignedCarpenter || claim.requestedBy || 'Technician'}</span>
                                <span>{claim.timestamp ? new Date(claim.timestamp).toLocaleString('en-IN') : 'No date'}</span>
                              </div>
                              <p>{claim.notes || 'No notes provided.'}</p>
                              {claim.receipt && (
                                <a href={claim.receipt} target="_blank" rel="noopener noreferrer" className="expense-receipt-link">
                                  View Receipt
                                </a>
                              )}
                            </div>
                            <div className="expense-claim-side">
                              <strong>₹{claim.amount}</strong>
                              {isPending ? (
                                <div className="expense-claim-actions">
                                  <button type="button" className="expense-approve-btn" onClick={() => handleResolveExpenseClaim(claim.orderId, claim.id, 'Approved', claim)}>
                                    Approve
                                  </button>
                                  <button type="button" className="expense-reject-btn" onClick={() => handleResolveExpenseClaim(claim.orderId, claim.id, 'Rejected', claim)}>
                                    Reject
                                  </button>
                                </div>
                              ) : (
                                <span className="expense-resolved-note">
                                  {claim.resolvedAt ? `Resolved ${new Date(claim.resolvedAt).toLocaleDateString('en-IN')}` : 'Resolved'}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="carpenter-ledger-grid">
                  {payoutLedgerData.length === 0 ? (
                    <div className="empty-ledger-state" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                      <p>No completed jobs found for any technician.</p>
                    </div>
                  ) : (
                    payoutLedgerData.map(carp => {
                      const pendingJobs = carp.completedJobs.filter(isPendingPayout);
                      const allCarpPayoutsSelected = pendingJobs.length > 0 && pendingJobs.every(job => selectedPayoutOrderIds.includes(job.orderId));

                      return (
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
                          <div className="payout-card-toolbar">
                            <h5>Completed Jobs ({carp.completedJobs.length})</h5>
                            {pendingJobs.length > 0 && (
                              <div className="payout-card-actions">
                                <label className="payout-select-toggle">
                                  <input
                                    type="checkbox"
                                    checked={allCarpPayoutsSelected}
                                    onChange={(e) => setPayoutSelection(pendingJobs, e.target.checked)}
                                  />
                                  Select Pending
                                </label>
                                <button
                                  type="button"
                                  className="bulk-clear-payout-btn compact"
                                  onClick={() => clearPayoutOrders(pendingJobs, carp.name)}
                                >
                                  Clear All
                                </button>
                              </div>
                            )}
                          </div>
                          {carp.completedJobs.length === 0 ? (
                            <p className="no-jobs-payout">No completed installation jobs yet.</p>
                          ) : (
                            <div className="job-table-ledger">
                              <table>
                                <thead>
                                  <tr>
                                    <th className="select-col">Select</th>
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
                                      <td className="select-col">
                                        {isPendingPayout(job) && (
                                          <input
                                            type="checkbox"
                                            aria-label={`Select payout for order ${job.orderId}`}
                                            checked={selectedPayoutOrderIds.includes(job.orderId)}
                                            onChange={() => togglePayoutSelection(job.orderId)}
                                          />
                                        )}
                                      </td>
                                      <td className="font-mono">{job.orderId}</td>
                                      <td className="font-mono text-small">{job.sku.split('-').slice(1).join('-') || job.sku}</td>
                                      <td className="text-bold">₹{job.payout}</td>
                                      <td>
                                        <span className={`payment-badge ${job.paymentStatus.toLowerCase()}`}>
                                          {job.paymentStatus}
                                        </span>
                                      </td>
                                      <td>
                                        {(job.paymentStatus === 'Unpaid' || job.paymentStatus === 'Pending Payout') ? (
                                          <button
                                            onClick={() => handleClearPayout(job, carp.name)}
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
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {hasRole(role, 'Super Admin') && (
          <div 
            className="tab-panel settings-panel animate-fade-in"
            style={{ display: activeTab === 'settings' ? 'block' : 'none' }}
          >
            <div className="card-style" style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <Cpu size={22} className="theme-accent" />
                <h3 style={{ margin: 0 }}>Integrations & Webhook Configuration</h3>
              </div>
              <p className="card-desc" style={{ marginBottom: '24px' }}>
                TimberFlow can automatically push status updates (such as transit alerts or completion confirmations) to your n8n workflow, which in turn triggers automated WhatsApp notifications to customers.
              </p>

              <form onSubmit={handleSaveN8nConfig} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <input
                    type="checkbox"
                    id="n8n-enabled-toggle"
                    checked={n8nEnabled}
                    onChange={(e) => setN8nEnabled(e.target.checked)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <label htmlFor="n8n-enabled-toggle" style={{ fontWeight: '600', cursor: 'pointer', userSelect: 'none' }}>
                    Enable Automated Webhook Notifications
                  </label>
                </div>

                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--admin-text-secondary)', textTransform: 'uppercase' }}>
                    n8n Webhook URL
                  </label>
                  <input
                    type="url"
                    value={n8nUrl}
                    onChange={(e) => setN8nUrl(e.target.value)}
                    placeholder="https://n8n.yourdomain.com/webhook/timberflow-fsm-events"
                    required
                    style={{ width: '100%', backgroundColor: 'var(--admin-bg-input)', border: '1px solid var(--admin-border-color)', color: 'var(--admin-text-primary)', borderRadius: '6px', padding: '10px', fontSize: '13px', outline: 'none' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                  <button
                    type="submit"
                    className="add-pincode-submit"
                    style={{ padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold' }}
                  >
                    Save Configuration
                  </button>

                  <button
                    type="button"
                    onClick={handleTestWebhook}
                    className="import-toggle-btn"
                    style={{ padding: '10px 20px', borderRadius: '6px' }}
                  >
                    {webhookTestStatus === 'sending' ? 'Sending Test...' : 'Test Webhook Connection'}
                  </button>
                </div>
              </form>

              <hr style={{ border: 'none', borderTop: '1px solid var(--admin-border-color)', margin: '30px 0' }} />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <h4 style={{ margin: '0 0 6px 0' }}>n8n Workflow Blueprint</h4>
                <p className="card-desc">
                  Import our predefined workflow in n8n to instantly set up Meta WhatsApp Cloud API templates for traveling alerts, SLA breaches, and completion notifications.
                </p>
                <button
                  type="button"
                  onClick={handleCopyBlueprint}
                  className="import-toggle-btn"
                  style={{ width: 'fit-content', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '8px', borderRadius: '6px', border: '1px dashed var(--admin-border-color)' }}
                >
                  <Upload size={14} />
                  <span>Copy Workflow Blueprint JSON</span>
                </button>
              </div>
            </div>
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
                  <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--admin-text-secondary)', textTransform: 'uppercase' }}>Order ID (Optional)</label>
                  <input 
                    type="text" 
                    value={jobForm.orderId} 
                    onChange={(e) => setJobForm({ ...jobForm, orderId: e.target.value })}
                    placeholder="e.g. AMZ-1049 (Auto if blank)"
                    style={{ backgroundColor: 'var(--admin-bg-input)', border: '1px solid var(--admin-border-color)', color: 'var(--admin-text-primary)', borderRadius: '6px', padding: '8px', fontSize: '12px' }}
                  />
                </div>
                
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
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
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

              <div className="form-group">
                <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--admin-text-secondary)', textTransform: 'uppercase' }}>Customer Address *</label>
                <textarea 
                  value={jobForm.customerAddress} 
                  onChange={(e) => setJobForm({ ...jobForm, customerAddress: e.target.value })}
                  placeholder="Street name, landmark"
                  required 
                  rows={2}
                  style={{ backgroundColor: 'var(--admin-bg-input)', border: '1px solid var(--admin-border-color)', color: 'var(--admin-text-primary)', borderRadius: '6px', padding: '8px', fontSize: '12px', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--admin-text-secondary)', textTransform: 'uppercase' }}>City</label>
                  <input 
                    type="text" 
                    value={jobForm.city} 
                    onChange={(e) => setJobForm({ ...jobForm, city: e.target.value })}
                    placeholder="e.g. Mumbai"
                    style={{ backgroundColor: 'var(--admin-bg-input)', border: '1px solid var(--admin-border-color)', color: 'var(--admin-text-primary)', borderRadius: '6px', padding: '8px', fontSize: '12px' }}
                  />
                </div>
                
                <div className="form-group">
                  <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--admin-text-secondary)', textTransform: 'uppercase' }}>State</label>
                  <input 
                    type="text" 
                    value={jobForm.state} 
                    onChange={(e) => setJobForm({ ...jobForm, state: e.target.value })}
                    placeholder="e.g. MH"
                    style={{ backgroundColor: 'var(--admin-bg-input)', border: '1px solid var(--admin-border-color)', color: 'var(--admin-text-primary)', borderRadius: '6px', padding: '8px', fontSize: '12px' }}
                  />
                </div>

                <div className="form-group">
                  <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--admin-text-secondary)', textTransform: 'uppercase' }}>Pincode *</label>
                  <input 
                    type="text" 
                    value={jobForm.pincode} 
                    onChange={(e) => setJobForm({ ...jobForm, pincode: e.target.value })}
                    placeholder="e.g. 400001"
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
                    type="date" 
                    value={jobForm.deliveryDate} 
                    onChange={(e) => setJobForm({ ...jobForm, deliveryDate: e.target.value })}
                    style={{ backgroundColor: 'var(--admin-bg-input)', border: '1px solid var(--admin-border-color)', color: 'var(--admin-text-primary)', borderRadius: '6px', padding: '8px', fontSize: '12px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--admin-text-secondary)', textTransform: 'uppercase' }}>Promise Date (SLA Target)</label>
                  <input 
                    type="date" 
                    value={jobForm.promiseDate} 
                    onChange={(e) => setJobForm({ ...jobForm, promiseDate: e.target.value })}
                    style={{ backgroundColor: 'var(--admin-bg-input)', border: '1px solid var(--admin-border-color)', color: 'var(--admin-text-primary)', borderRadius: '6px', padding: '8px', fontSize: '12px' }}
                  />
                </div>
                
                <div className="form-group">
                  <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--admin-text-secondary)', textTransform: 'uppercase' }}>Product Image URL (Optional)</label>
                  <input 
                    type="text" 
                    value={jobForm.productImageUrl} 
                    onChange={(e) => setJobForm({ ...jobForm, productImageUrl: e.target.value })}
                    placeholder="https://example.com/product.jpg"
                    style={{ backgroundColor: 'var(--admin-bg-input)', border: '1px solid var(--admin-border-color)', color: 'var(--admin-text-primary)', borderRadius: '6px', padding: '8px', fontSize: '12px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--admin-text-secondary)', textTransform: 'uppercase' }}>Product Review Link (Optional)</label>
                  <input 
                    type="text" 
                    value={jobForm.productReviewLink} 
                    onChange={(e) => setJobForm({ ...jobForm, productReviewLink: e.target.value })}
                    placeholder="e.g. feedback/product"
                    style={{ backgroundColor: 'var(--admin-bg-input)', border: '1px solid var(--admin-border-color)', color: 'var(--admin-text-primary)', borderRadius: '6px', padding: '8px', fontSize: '12px' }}
                  />
                </div>
                
                <div className="form-group">
                  <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--admin-text-secondary)', textTransform: 'uppercase' }}>Seller Review Link (Optional)</label>
                  <input 
                    type="text" 
                    value={jobForm.sellerReviewLink} 
                    onChange={(e) => setJobForm({ ...jobForm, sellerReviewLink: e.target.value })}
                    placeholder="e.g. feedback/seller"
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
