import { collection, addDoc, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export const whatsappService = {
  /**
   * Log WhatsApp transaction details in Firestore whatsapp_logs collection.
   */
  async logWhatsApp({ recipientPhone, recipientName, body, templateUsed, status = 'sent', errorMessage = '' }) {
    console.log(`[WhatsApp Service] Logging dispatch to ${recipientName} (${recipientPhone})...`);
    
    try {
      const docRef = await addDoc(collection(db, 'whatsapp_logs'), {
        recipientPhone,
        recipientName,
        body,
        templateUsed: templateUsed || 'Custom Message',
        status,
        errorMessage,
        timestamp: serverTimestamp()
      });
      
      console.log(`[WhatsApp Service] Outbound log successfully saved in Firestore: ${docRef.id}`);

      // Dispatch global toast notification
      window.dispatchEvent(new CustomEvent('toast-notify', {
        detail: {
          message: status === 'sent' 
            ? `WhatsApp Sent: Message dispatched to ${recipientPhone}`
            : `WhatsApp Failed: Dispatch failed to ${recipientPhone}`,
          type: status === 'sent' ? 'success' : 'error'
        }
      }));

      return docRef.id;
    } catch (err) {
      console.error('[WhatsApp Service] Failed to log WhatsApp transaction:', err);
      return null;
    }
  },

  /**
   * Dispatch a real WhatsApp message using Twilio's REST API.
   * Catches CORS policy failures client-side and registers them transparently.
   */
  async sendWhatsApp({ recipientPhone, recipientName, body, templateUsed }) {
    if (!recipientPhone) return null;

    try {
      // 1. Fetch Twilio Credentials from settings
      const twilioSnap = await getDoc(doc(db, 'settings', 'twilio'));
      let twilioData = null;
      if (twilioSnap.exists()) {
        twilioData = twilioSnap.data();
      }

      if (!twilioData || !twilioData.accountSid || !twilioData.twilioToken || !twilioData.phoneNumber) {
        console.warn('[WhatsApp Service] Twilio Credentials missing in settings.');
        return this.logWhatsApp({
          recipientPhone,
          recipientName,
          body,
          templateUsed,
          status: 'failed',
          errorMessage: 'Twilio Gateway Configurations Missing'
        });
      }

      const { accountSid, twilioToken, phoneNumber } = twilioData;
      const cleanSender = phoneNumber.replace('whatsapp:', '');
      const cleanRecipient = recipientPhone.trim();

      console.log(`[WhatsApp Service] Dispatching Twilio payload to +${cleanRecipient}...`);

      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

      // Form UrlEncoded parameters
      const params = new URLSearchParams();
      params.append('From', `whatsapp:${cleanSender}`);
      params.append('To', `whatsapp:${cleanRecipient}`);
      params.append('Body', body);

      // Attempt fetch request
      const response = await fetch(twilioUrl, {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa(`${accountSid}:${twilioToken}`),
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params
      });

      if (response.ok) {
        const data = await response.json();
        console.log('[WhatsApp Service] Twilio dispatch response success:', data.sid);
        return this.logWhatsApp({ recipientPhone, recipientName, body, templateUsed, status: 'sent' });
      } else {
        const errorText = await response.text();
        console.error('[WhatsApp Service] Twilio API rejected dispatch request:', errorText);
        return this.logWhatsApp({ 
          recipientPhone, 
          recipientName, 
          body, 
          templateUsed, 
          status: 'failed', 
          errorMessage: `Twilio API Rejected: ${errorText}`
        });
      }
    } catch (err) {
      // Direct Twilio API requests from browsers fail due to CORS.
      // We catch it and log it as a real-world dispatch attempt that was blocked by browser policies.
      const isCorsError = err instanceof TypeError && err.message.includes('Failed to fetch');
      const errorMsg = isCorsError 
        ? 'CORS Policy: Browser blocked direct REST API write. Twilio requires a secure backend proxy in production.'
        : err.message || 'Network dispatch error';

      console.warn(`[WhatsApp Service] Twilio dispatch CORS/Network error: ${errorMsg}`);
      
      return this.logWhatsApp({
        recipientPhone,
        recipientName,
        body,
        templateUsed,
        status: 'failed',
        errorMessage: errorMsg
      });
    }
  },

  /**
   * 1. Lead Created -> WhatsApp Notification
   */
  async sendLeadCreated(lead) {
    const body = `Hi ${lead.name}, welcome to AutoScale! We have successfully registered your inquiry regarding ${lead.service || lead.requestedService || 'Automation Systems'}. Our systems architect will review your bottlenecks.`;
    return this.sendWhatsApp({
      recipientPhone: lead.phone,
      recipientName: lead.name,
      body,
      templateUsed: 'Lead Created Welcome'
    });
  },

  /**
   * 2. Proposal Sent -> WhatsApp Notification
   */
  async sendProposalSent(proposal, leadPhone) {
    const body = `Hi ${proposal.leadName}, your bespoke AutoScale Proposal for ${proposal.service} is ready! Total: INR ${proposal.price?.toLocaleString('en-IN')}. Log in to autoscale.systems to review and sign.`;
    return this.sendWhatsApp({
      recipientPhone: leadPhone || proposal.phone || '',
      recipientName: proposal.leadName,
      body,
      templateUsed: 'Proposal Sent Alert'
    });
  },

  /**
   * 3. Invoice Due -> WhatsApp Notification
   */
  async sendInvoiceDue(invoice, client) {
    const body = `Hi ${client.contactPerson || client.ownerName}, Invoice ${invoice.invoiceNumber} for INR ${invoice.amount?.toLocaleString('en-IN')} is due on ${invoice.dueDate}. Settle securely via client.autoscale.systems portal.`;
    return this.sendWhatsApp({
      recipientPhone: client.phone,
      recipientName: client.contactPerson || client.ownerName,
      body,
      templateUsed: 'Invoice Payment Due'
    });
  },

  /**
   * 4. Project Completed -> WhatsApp Notification
   */
  async sendProjectCompleted(project, client) {
    const body = `Hi ${client.contactPerson || client.ownerName}, outstanding work! Your project "${project.projectName}" is officially COMPLETED. Live deployment is verified. Review deliverables in your portal.`;
    return this.sendWhatsApp({
      recipientPhone: client.phone,
      recipientName: client.contactPerson || client.ownerName,
      body,
      templateUsed: 'Project Launch Completed'
    });
  },

  /**
   * 5. Client Onboarding -> WhatsApp Welcome
   */
  async sendClientOnboarding(client, project) {
    const body = `Hi ${client.contactPerson || client.ownerName}, welcome aboard! We have created your project workspace: "${project.projectName}". Track progress steps in real time in your client portal.`;
    return this.sendWhatsApp({
      recipientPhone: client.phone,
      recipientName: client.contactPerson || client.ownerName,
      body,
      templateUsed: 'Client Onboarding Welcome'
    });
  }
};
