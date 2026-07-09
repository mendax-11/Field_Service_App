#!/usr/bin/env node
/* eslint-disable no-undef */


/**
 * TimberFlow SLA Escalator Daemon
 * 
 * This script runs periodically to check for orders that have breached their promise date
 * and automatically flags them as breached, appends an audit log, and triggers a webhook.
 * 
 * --- Linux Crontab Configuration Guide ---
 * To run this script automatically on a Linux server:
 * 1. Open the crontab editor for the current user (e.g., ubuntu):
 *    crontab -e
 * 
 * 2. Add a line to run the script every 5 minutes. Adjust the directory path, 
 *    Node.js executable path, and environment variables as necessary:
 *    *\/5 * * * * cd "/home/ubuntu/timberflow" && POCKETBASE_ADMIN_EMAIL="admin@timberflow.in" POCKETBASE_ADMIN_PASSWORD="your-admin-password" N8N_WEBHOOK_URL="https://n8n.yourdomain.com/webhook/timberflow-events" /usr/bin/node scripts/slaEscalator.js >> /var/log/sla_escalator.log 2>&1
 * 
 * 3. Create the log file and ensure it has write permissions for the cron execution user:
 *    sudo touch /var/log/sla_escalator.log
 *    sudo chown ubuntu:ubuntu /var/log/sla_escalator.log
 * 
 * Note: Alternatively, you can omit specifying the variables inline in crontab if they are
 * already set in a `.env` file at the project root; this script automatically attempts
 * to parse a root `.env` file.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import PocketBase from 'pocketbase';

// 1. Parse and load environment variables from the local .env file if it exists
try {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const envPath = path.resolve(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf-8');
    envConfig.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const match = trimmed.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        // Strip quotes if present
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.substring(1, value.length - 1);
        } else if (value.startsWith("'") && value.endsWith("'")) {
          value = value.substring(1, value.length - 1);
        }
        if (!process.env[key]) {
          process.env[key] = value.trim();
        }
      }
    });
  }
} catch (err) {
  console.warn('[SLA Escalator] Note: Could not load .env file manually:', err.message);
}

// 2. Read Configuration parameters
const pocketbaseUrl = process.env.VITE_POCKETBASE_URL || process.env.POCKETBASE_URL || 'http://127.0.0.1:8090';
const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL;
const adminPassword = process.env.POCKETBASE_ADMIN_PASSWORD;
const globalN8nWebhookUrl = process.env.N8N_WEBHOOK_URL || process.env.VITE_N8N_WEBHOOK_URL;

console.log('--- SLA Escalator Cron Daemon Booting ---');
console.log('PocketBase URL:', pocketbaseUrl);
console.log('Current local time:', new Date().toISOString());

async function run() {
  const pb = new PocketBase(pocketbaseUrl);

  // 3. Authenticate if Admin credentials are provided
  if (adminEmail && adminPassword) {
    try {
      console.log(`Authenticating admin session for: ${adminEmail}...`);
      await pb.admins.authWithPassword(adminEmail, adminPassword);
      console.log('Admin authenticated successfully.');
    } catch (err) {
      console.error('CRITICAL: Admin authentication failed:', err.message);
      process.exit(1);
    }
  } else {
    console.log('No admin credentials provided. Proceeding with anonymous API access...');
  }

  // 4. Fetch orders that are NOT completed
  console.log('Fetching active (non-Completed) orders...');
  let orders = [];
  try {
    orders = await pb.collection('orders').getFullList({
      filter: 'status != "Completed"',
      sort: '-created'
    });
    console.log(`Retrieved ${orders.length} active orders.`);
  } catch (err) {
    console.error('CRITICAL: Failed to query orders collection:', err.message);
    process.exit(1);
  }

  const now = new Date();
  let processedCount = 0;
  let breachCount = 0;

  // 5. Evaluate each order for SLA breaches
  for (const order of orders) {
    processedCount++;
    const orderIdentifier = order.order_id || order.id;
    
    // Parse promise date
    const promiseDateStr = order.promise_date || order.promiseDate;
    if (!promiseDateStr) {
      continue; // Missing promise date, skip checking SLA
    }

    const promiseDate = new Date(promiseDateStr);
    if (isNaN(promiseDate.getTime())) {
      console.warn(`[Order ${orderIdentifier}] Invalid promise date format: "${promiseDateStr}". Skipping.`);
      continue;
    }

    // Check if deadline has passed
    const isDeadlinePassed = now > promiseDate;
    const isAlreadyMarkedBreached = order.sla_breached === true || order.slaBreached === true;
    
    // Normalize or parse audit logs
    let auditLogs = [];
    try {
      if (order.audit_logs) {
        auditLogs = typeof order.audit_logs === 'string' ? JSON.parse(order.audit_logs) : order.audit_logs;
      } else if (order.auditLogs) {
        auditLogs = typeof order.auditLogs === 'string' ? JSON.parse(order.auditLogs) : order.auditLogs;
      }
    } catch (e) {
      console.warn(`[Order ${orderIdentifier}] Failed to parse audit logs, resetting:`, e.message);
      auditLogs = [];
    }
    if (!Array.isArray(auditLogs)) {
      auditLogs = [];
    }

    const alreadyEscalatedInLogs = auditLogs.some(l => l.action === 'SLA BREACH — Auto-Escalated');

    if (isDeadlinePassed && !isAlreadyMarkedBreached && !alreadyEscalatedInLogs) {
      console.log(`[Order ${orderIdentifier}] SLA BREACH DETECTED! Promise date: ${promiseDateStr}, Current time: ${now.toISOString()}`);
      breachCount++;

      // Create new audit log entry
      const newAuditLog = {
        timestamp: new Date().toISOString(),
        action: 'SLA BREACH — Auto-Escalated',
        user: 'SLA Cron Daemon',
        comments: 'SLA deadline missed. Order auto-escalated to dispatch manager.'
      };
      
      const updatedAuditLogs = [...auditLogs, newAuditLog];

      // Build payload matching database fields (updating both camelCase and snake_case properties for compatibility)
      const updateData = {
        sla_breached: true,
        slaBreached: true,
        audit_logs: updatedAuditLogs,
        auditLogs: updatedAuditLogs
      };

      // Perform update in PocketBase
      try {
        await pb.collection('orders').update(order.id, updateData);
        console.log(`[Order ${orderIdentifier}] Successfully updated breach flag and appended audit log.`);
      } catch (err) {
        console.error(`[Order ${orderIdentifier}] Failed to update order with breach flag. Error:`, err.message);
        
        // Try fallback: Update audit logs only (in case the SLA breach boolean fields do not exist in the collection schema)
        try {
          console.log(`[Order ${orderIdentifier}] Attempting fallback update (audit logs only)...`);
          await pb.collection('orders').update(order.id, {
            audit_logs: updatedAuditLogs,
            auditLogs: updatedAuditLogs
          });
          console.log(`[Order ${orderIdentifier}] Fallback update successful.`);
        } catch (fallbackErr) {
          console.error(`[Order ${orderIdentifier}] Fallback update failed:`, fallbackErr.message);
        }
      }

      // 6. Webhook Triggering
      const orderHasN8nEnabled = order.n8n_enabled === true || order.n8nEnabled === true;
      if (orderHasN8nEnabled || globalN8nWebhookUrl) {
        if (!globalN8nWebhookUrl) {
          console.warn(`[Order ${orderIdentifier}] Webhook is enabled on the order, but no general N8N_WEBHOOK_URL is set in environment. Skipping webhook dispatch.`);
          continue;
        }

        const hoursOverdue = Math.max(0, Math.abs(Math.round((now - promiseDate) / (1000 * 60 * 60))));
        
        const webhookPayload = {
          event: 'sla_breach_detected',
          timestamp: new Date().toISOString(),
          data: {
            orderId: order.order_id || order.id,
            customerName: order.customer_name || 'Unknown Customer',
            customerPhone: order.customer_phone || order.customer_number || '',
            promiseDate: promiseDate.toISOString(),
            hoursOverdue: hoursOverdue
          }
        };

        console.log(`[Order ${orderIdentifier}] Triggering HTTP POST webhook to ${globalN8nWebhookUrl}...`);
        try {
          const response = await fetch(globalN8nWebhookUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(webhookPayload)
          });
          if (!response.ok) {
            console.error(`[Order ${orderIdentifier}] Webhook returned error status: ${response.status} ${response.statusText}`);
          } else {
            console.log(`[Order ${orderIdentifier}] Webhook sent successfully.`);
          }
        } catch (webhookErr) {
          console.error(`[Order ${orderIdentifier}] Webhook connection failed:`, webhookErr.message);
        }
      }
    }
  }

  console.log(`SLA Escalation run completed. Processed ${processedCount} orders. Auto-escalated ${breachCount} orders.`);
}

run().catch(err => {
  console.error('FATAL: SLA Escalator daemon run failed:', err);
  process.exit(1);
});
