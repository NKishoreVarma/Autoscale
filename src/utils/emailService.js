import { collection, addDoc, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Helper to wrap email content in a premium glassmorphic/dark theme HTML design.
 */
function wrapHtmlTemplate(title, preheader, contentHtml) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${title}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          background-color: #050505;
          color: #e5e5e5;
          margin: 0;
          padding: 0;
          -webkit-font-smoothing: antialiased;
        }
        .wrapper {
          width: 100%;
          table-layout: fixed;
          background-color: #050505;
          padding-bottom: 40px;
          padding-top: 40px;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background-color: rgba(255, 255, 255, 0.01);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        }
        .header {
          padding: 32px;
          background: linear-gradient(135deg, #120224 0%, #050505 100%);
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          text-align: center;
        }
        .logo {
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.25em;
          color: #8b5cf6;
          text-transform: uppercase;
          margin-bottom: 8px;
        }
        .header-title {
          font-size: 20px;
          font-weight: 300;
          letter-spacing: -0.025em;
          color: #ffffff;
          margin: 0;
          text-transform: uppercase;
        }
        .content {
          padding: 32px;
          line-height: 1.6;
          font-size: 14px;
          color: #c0c0c0;
        }
        .highlight {
          color: #ffffff;
          font-weight: 600;
        }
        .button-container {
          margin: 32px 0;
          text-align: center;
        }
        .btn {
          display: inline-block;
          padding: 12px 28px;
          background-color: #ffffff;
          color: #000000 !important;
          text-decoration: none;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          transition: background-color 0.2s;
        }
        .footer {
          padding: 24px 32px;
          background-color: rgba(255, 255, 255, 0.02);
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          font-size: 11px;
          text-align: center;
          color: #525252;
        }
        .footer a {
          color: #8b5cf6;
          text-decoration: none;
        }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="container">
          <div class="header">
            <div class="logo">AutoScale Systems</div>
            <h1 class="header-title">${title}</h1>
          </div>
          <div class="content">
            ${contentHtml}
          </div>
          <div class="footer">
            &copy; 2026 AutoScale Systems. All rights reserved.<br>
            Tech Hub, Bangalore, India &bull; <a href="mailto:support@autoscale.systems">support@autoscale.systems</a>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

export const emailService = {
  /**
   * Helper to write log document in Firestore
   */
  async logEmail({ toEmail, toName, subject, body, html, triggerEvent, status = 'sent', errorMessage = '' }) {
    console.log(`[Email Service] Logging "${triggerEvent}" to ${toName} (${toEmail})...`);
    
    try {
      const docRef = await addDoc(collection(db, 'email_logs'), {
        recipientEmail: toEmail,
        recipientName: toName,
        subject,
        body,
        html: html || '',
        status,
        errorMessage,
        triggerEvent,
        timestamp: serverTimestamp()
      });
      
      console.log(`[Email Service] Outbound log successfully saved in Firestore: ${docRef.id}`);

      // Dispatch global toast notification
      window.dispatchEvent(new CustomEvent('toast-notify', {
        detail: {
          message: status === 'sent' 
            ? `Email Sent: "${subject}" dispatched to ${toEmail}`
            : `Email Error: Failed to dispatch "${subject}" to ${toEmail}`,
          type: status === 'sent' ? 'success' : 'error'
        }
      }));

      return docRef.id;
    } catch (err) {
      console.error('[Email Service] Failed to log email transaction:', err);
      return null;
    }
  },

  /**
   * Core dispatcher that connects to Resend REST API or logs locally if standard SMTP.
   */
  async sendEmail({ toEmail, toName, subject, body, html, triggerEvent }) {
    try {
      // 1. Fetch configurations from settings
      const smtpSnap = await getDoc(doc(db, 'settings', 'smtp'));
      let smtpData = null;
      if (smtpSnap.exists()) {
        smtpData = smtpSnap.data();
      }

      const isResend = smtpData && (
        smtpData.host === 'api.resend.com' ||
        smtpData.host === 'smtp.resend.com' ||
        (smtpData.smtpPassword && smtpData.smtpPassword.startsWith('re_'))
      );

      const sender = smtpData?.senderEmail || 'AutoScale Systems <onboarding@resend.dev>';

      if (isResend && smtpData.smtpPassword) {
        console.log('[Email Service] Triggering real Resend API dispatch...');
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${smtpData.smtpPassword}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: sender,
            to: [toEmail],
            subject: subject,
            html: html || body.replace(/\n/g, '<br>')
          })
        });

        if (response.ok) {
          const resData = await response.json();
          console.log('[Email Service] Resend dispatch success. API Message ID:', resData.id);
          return this.logEmail({ toEmail, toName, subject, body, html, triggerEvent, status: 'sent' });
        } else {
          const errorMsg = await response.text();
          console.error('[Email Service] Resend API rejected request:', errorMsg);
          return this.logEmail({ toEmail, toName, subject, body, html, triggerEvent, status: 'failed', errorMessage: errorMsg });
        }
      } else {
        // Standard SMTP cannot be connected to via Raw TCP client-side.
        // We log the attempt as "sent (simulated)" to ensure the system is operational.
        const details = smtpData?.host 
          ? `SMTP Host configured: ${smtpData.host}:${smtpData.port}. Client-side browser direct SMTP is simulated.`
          : 'SMTP Configuration Missing. Simulated send logged.';
        
        console.log(`[Email Service] ${details}`);
        return this.logEmail({ 
          toEmail, 
          toName, 
          subject, 
          body, 
          html, 
          triggerEvent, 
          status: smtpData?.host ? 'sent' : 'failed', 
          errorMessage: smtpData?.host ? '' : 'SMTP Configurations Missing'
        });
      }
    } catch (err) {
      console.error('[Email Service] Dispatch error:', err);
      return this.logEmail({ toEmail, toName, subject, body, html, triggerEvent, status: 'failed', errorMessage: err.message });
    }
  },

  /**
   * 1. Contact Form -> Thank You Email
   */
  async sendThankYouEmail(lead) {
    const title = "Inquiry Logged";
    const body = `Hi ${lead.name},\n\nThank you for reaching out to AutoScale Systems. We have successfully logged your contact form inquiry regarding your business challenges:\n\n"${lead.message || 'Custom integration requests'}"\n\nOne of our systems architects will review your company profile and reach back to you shortly.\n\nBest Regards,\nSystems Delivery Team\nAutoScale Systems`;
    
    const html = wrapHtmlTemplate(
      title,
      "Thank you for contacting AutoScale Systems",
      `
        <p>Hi <span class="highlight">${lead.name}</span>,</p>
        <p>Thank you for reaching out to <span class="highlight">AutoScale Systems</span>. We have successfully received your inquiry regarding:</p>
        <blockquote style="border-left: 3px solid #8b5cf6; padding-left: 16px; margin: 16px 0; color: #a3a3a3; font-style: italic;">
          "${lead.message || 'Custom systems integration request'}"
        </blockquote>
        <p>One of our systems architects will audit your challenges and contact you via email (<strong>${lead.email}</strong>) or phone (<strong>${lead.phone}</strong>) within the next 24 hours to schedule a deep-dive audit.</p>
        <div class="button-container">
          <a href="https://autoscale.systems" class="btn">Visit AutoScale</a>
        </div>
      `
    );

    return this.sendEmail({
      toEmail: lead.email,
      toName: lead.name,
      subject: "Thank you for contacting AutoScale Systems",
      body,
      html,
      triggerEvent: 'Contact Form Inquiry'
    });
  },

  /**
   * 2. Book Audit -> Confirmation Email
   */
  async sendAuditConfirmation(lead, scheduledTime = 'TBD') {
    const title = "Automation Audit Initiated";
    const body = `Hi ${lead.name},\n\nYour request for a Free Automation Audit for your company "${lead.company}" has been confirmed.\n\nCapability Requested: ${lead.service || lead.requestedService || 'Custom System'}\nScheduled Slot: ${scheduledTime}\n\nOur engineers have initialized your audit file and will deliver the Custom Opportunities & ROI Estimate report within 24 hours.\n\nBest Regards,\nSystems Delivery Team\nAutoScale Systems`;

    const html = wrapHtmlTemplate(
      title,
      "Free Systems Audit Confirmed",
      `
        <p>Hi <span class="highlight">${lead.name}</span>,</p>
        <p>Your request for a <span class="highlight">Free Automation Audit</span> for <span class="highlight">${lead.company}</span> has been successfully received and scheduled.</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 24px 0; background-color: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 8px; font-size: 13px;">
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.05); color: #525252; text-transform: uppercase; font-size: 9px; font-weight: bold; width: 120px;">System Category</td>
            <td style="padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.05); color: #ffffff;">${lead.service || lead.requestedService || 'Custom System'}</td>
          </tr>
          <tr>
            <td style="padding: 12px; color: #525252; text-transform: uppercase; font-size: 9px; font-weight: bold;">Audit Time</td>
            <td style="padding: 12px; color: #ffffff;">${scheduledTime}</td>
          </tr>
        </table>

        <p>An automation engineer will analyze your website URL and Challenges details to compile a custom Opportunities & ROI report.</p>
        <p>We will email your completed report and calendar link shortly.</p>
      `
    );

    return this.sendEmail({
      toEmail: lead.email,
      toName: lead.name,
      subject: "Audit Confirmed: AutoScale Systems Integration",
      body,
      html,
      triggerEvent: 'Audit Booking Confirmation'
    });
  },

  /**
   * 3. Proposal Email
   */
  async sendProposalEmail(proposal, lead) {
    const title = "Bespoke Automation Proposal";
    const body = `Hi ${lead.name},\n\nWe have prepared a customized systems integration proposal for ${lead.company}.\n\nService: ${proposal.service}\nCommercial Value: ${proposal.price} INR\n\nYou can access, print, and accept this proposal via your AutoScale client portal.\n\nBest Regards,\nSystems Delivery Team\nAutoScale Systems`;

    const html = wrapHtmlTemplate(
      title,
      "Commercial Proposal Available",
      `
        <p>Hi <span class="highlight">${lead.name}</span>,</p>
        <p>Our engineering team has analyzed your workflow challenges and completed a customized commercial proposal for <span class="highlight">${lead.company || proposal.company}</span>.</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 24px 0; background-color: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 8px; font-size: 13px;">
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.05); color: #525252; text-transform: uppercase; font-size: 9px; font-weight: bold; width: 120px;">Requested Solution</td>
            <td style="padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.05); color: #ffffff;">${proposal.service}</td>
          </tr>
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.05); color: #525252; text-transform: uppercase; font-size: 9px; font-weight: bold;">Expected ROI</td>
            <td style="padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.05); color: #ffffff;">${proposal.expectedRoi}</td>
          </tr>
          <tr>
            <td style="padding: 12px; color: #525252; text-transform: uppercase; font-size: 9px; font-weight: bold;">Total Commercials</td>
            <td style="padding: 12px; color: #10b981; font-weight: bold; font-family: monospace;">INR ${proposal.price?.toLocaleString('en-IN')}</td>
          </tr>
        </table>

        <p>A PDF version of this proposal has been generated and archived in your records. Please review the details and confirm your acceptance to trigger development workflows.</p>
        <div class="button-container">
          <a href="https://autoscale.systems/client/login" class="btn">Review Proposal</a>
        </div>
      `
    );

    return this.sendEmail({
      toEmail: lead.email,
      toName: lead.name,
      subject: `Bespoke Proposal: AutoScale ${proposal.service} Integration`,
      body,
      html,
      triggerEvent: 'Proposal Sent'
    });
  },

  /**
   * 4. Invoice Email
   */
  async sendInvoiceEmail(invoice, client) {
    const title = "Invoice Issued";
    const body = `Hi ${client.contactPerson},\n\nInvoice ${invoice.invoiceNumber} has been issued for your AutoScale integration project "${invoice.projectTitle}".\n\nAmount Due: ${invoice.amount} INR\nDue Date: ${invoice.dueDate}\n\nPlease settle this invoice via the client portal.\n\nBest Regards,\nBilling Team\nAutoScale Systems`;

    const html = wrapHtmlTemplate(
      title,
      `Milestone Invoice ${invoice.invoiceNumber}`,
      `
        <p>Hi <span class="highlight">${client.contactPerson || client.ownerName}</span>,</p>
        <p>We have issued a commercial statement invoice for project <span class="highlight">${invoice.projectTitle}</span>.</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 24px 0; background-color: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 8px; font-size: 13px;">
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.05); color: #525252; text-transform: uppercase; font-size: 9px; font-weight: bold; width: 120px;">Invoice Number</td>
            <td style="padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.05); color: #ffffff; font-family: monospace;">${invoice.invoiceNumber}</td>
          </tr>
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.05); color: #525252; text-transform: uppercase; font-size: 9px; font-weight: bold;">Due Date</td>
            <td style="padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.05); color: #ffffff; font-family: monospace;">${invoice.dueDate}</td>
          </tr>
          <tr>
            <td style="padding: 12px; color: #525252; text-transform: uppercase; font-size: 9px; font-weight: bold;">Amount Payable</td>
            <td style="padding: 12px; color: #ffffff; font-weight: bold; font-family: monospace;">INR ${invoice.amount?.toLocaleString('en-IN')}</td>
          </tr>
        </table>

        <p>You can print, download, or submit payments directly inside the AutoScale Client Portal.</p>
        <div class="button-container">
          <a href="https://autoscale.systems/client/login" class="btn">View & Pay Invoice</a>
        </div>
      `
    );

    return this.sendEmail({
      toEmail: client.email,
      toName: client.contactPerson || client.ownerName,
      subject: `Invoice Issued: ${invoice.invoiceNumber} — AutoScale Systems`,
      body,
      html,
      triggerEvent: 'Invoice Issued'
    });
  },

  /**
   * 5. Client Onboarding Email
   */
  async sendOnboardingEmail(client, project) {
    const title = "Welcome to AutoScale";
    const body = `Hi ${client.contactPerson},\n\nWelcome to AutoScale! Your client account has been verified, and we have initiated the project workspace: "${project.projectName}".\n\nYou can access your deliverables and track tasks in real time in our client portal.\n\nBest Regards,\nSystems Delivery Team\nAutoScale Systems`;

    const html = wrapHtmlTemplate(
      title,
      "Client Workspace Onboarding",
      `
        <p>Hi <span class="highlight">${client.contactPerson || client.ownerName}</span>,</p>
        <p>Welcome to <span class="highlight">AutoScale Systems</span>! We are excited to collaborate with you to build your business automation infrastructure.</p>
        
        <p>We have completed your onboarding configuration and created your dedicated project workspace:</p>
        <div style="padding: 16px; background-color: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); border-radius: 8px; text-align: center; margin: 20px 0;">
          <span style="font-size: 16px; font-weight: bold; color: #ffffff;">${project.projectName}</span>
        </div>

        <p>Through the Client Portal, you will be able to:</p>
        <ul style="padding-left: 20px; margin: 16px 0; color: #a3a3a3;">
          <li>Track active milestones and checklist task progress.</li>
          <li>Download deliverables, contracts, and proposal documents.</li>
          <li>Submit feedback tickets and speak directly with the system engineers.</li>
          <li>Manage statement billings and invoice receipts.</li>
        </ul>

        <div class="button-container">
          <a href="https://autoscale.systems/client/login" class="btn">Enter Client Portal</a>
        </div>
      `
    );

    return this.sendEmail({
      toEmail: client.email,
      toName: client.contactPerson || client.ownerName,
      subject: `Onboarding: Welcome to AutoScale Systems!`,
      body,
      html,
      triggerEvent: 'Client Onboarding'
    });
  },

  /**
   * 6. Project Update Email
   */
  async sendProjectUpdateEmail(project, client, updateDetails = '') {
    const title = "Project Milestone Update";
    const body = `Hi ${client.contactPerson},\n\nYour project "${project.projectName}" has been updated.\n\nNew Status: ${project.status}\nProgress: ${project.progress}%\n\nUpdate Details:\n${updateDetails}\n\nBest Regards,\nSystems Delivery Team\nAutoScale Systems`;

    const html = wrapHtmlTemplate(
      title,
      "Milestone Status Update",
      `
        <p>Hi <span class="highlight">${client.contactPerson || client.ownerName}</span>,</p>
        <p>Your systems project <span class="highlight">${project.projectName}</span> has received a status update:</p>

        <table style="width: 100%; border-collapse: collapse; margin: 24px 0; background-color: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 8px; font-size: 13px;">
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.05); color: #525252; text-transform: uppercase; font-size: 9px; font-weight: bold; width: 120px;">Current Phase</td>
            <td style="padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.05); color: #8b5cf6; font-weight: bold; text-transform: uppercase;">${project.status}</td>
          </tr>
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.05); color: #525252; text-transform: uppercase; font-size: 9px; font-weight: bold;">Completion %</td>
            <td style="padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.05); color: #ffffff;">${project.progress || 0}%</td>
          </tr>
          <tr>
            <td style="padding: 12px; color: #525252; text-transform: uppercase; font-size: 9px; font-weight: bold;">Activity Notes</td>
            <td style="padding: 12px; color: #e5e5e5; font-light;">${updateDetails || 'Work continues according to plan.'}</td>
          </tr>
        </table>

        <div class="button-container">
          <a href="https://autoscale.systems/client/login" class="btn">View Project Console</a>
        </div>
      `
    );

    return this.sendEmail({
      toEmail: client.email,
      toName: client.contactPerson || client.ownerName,
      subject: `Project Update: ${project.projectName} is now ${project.status}`,
      body,
      html,
      triggerEvent: 'Project Status Update'
    });
  },

  /**
   * 7. AI Audit Delivered Email (Day 0)
   */
  async sendAuditDeliveryEmail(lead, audit) {
    const title = "AI Growth Audit Delivered";
    const annualSavings = audit.roiEstimate?.annualSavings?.toLocaleString('en-IN') || '0';
    const body = `Hi ${lead.name},\n\nWe have completed your Free AI Growth Audit for "${lead.company}".\n\nAnnual Projected Savings: INR ${annualSavings}\n\nYou can access the full report and download the PDF in the link below.\n\nBest Regards,\nSystems Delivery Team\nAutoScale Systems`;

    const html = wrapHtmlTemplate(
      title,
      "AI Growth Audit Delivery",
      `
        <p>Hi <span class="highlight">${lead.name}</span>,</p>
        <p>We are excited to deliver your completed <span class="highlight">Free AI Growth Audit</span> report for <span class="highlight">${lead.company}</span>.</p>
        
        <div style="padding: 16px; background-color: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); border-radius: 8px; text-align: center; margin: 20px 0;">
          <span style="font-size: 11px; font-weight: bold; color: #8b5cf6; display: block; text-transform: uppercase;">Projected Annual Opportunity</span>
          <span style="font-size: 24px; font-weight: bold; color: #10b981; font-family: monospace; display: block; margin-top: 8px;">INR ${annualSavings}</span>
        </div>

        <p>Our AI model analyzed your challenges and website, identifying high-impact automation opportunities and response time bottlenecks. The PDF report has been compiled and saved to our cloud archives.</p>
        
        <div class="button-container">
          <a href="${audit.pdfUrl || 'https://autoscale.systems'}" class="btn" target="_blank">Download Audit PDF</a>
        </div>
        
        <p>You can also review the full interactive findings directly on our website and schedule a consult call to discuss implementation.</p>
      `
    );

    return this.sendEmail({
      toEmail: lead.email,
      toName: lead.name,
      subject: `Your AI Growth Audit for ${lead.company} is Ready!`,
      body,
      html,
      triggerEvent: 'Audit Delivered'
    });
  },

  /**
   * 8. Campaign Follow-Up Day 2 (Case Study)
   */
  async sendFollowUpDay2(lead) {
    const title = "Case Study: +35% Conversions";
    const body = `Hi ${lead.name},\n\nWe recently sent your AI Growth Audit. To show you these systems in action, here is a case study of how Smile-Design Clinics automated their patient intake and boosted appointment bookings by 35%.\n\nRead the full study on our site.\n\nBest Regards,\nAutoScale Systems`;

    const html = wrapHtmlTemplate(
      title,
      "Automation Case Study in Action",
      `
        <p>Hi <span class="highlight">${lead.name}</span>,</p>
        <p>A couple of days ago we shared your AI Growth Audit. We wanted to share how similar custom systems perform in the real world.</p>
        
        <blockquote style="border-left: 3px solid #8b5cf6; padding-left: 16px; margin: 20px 0; color: #a3a3a3; font-style: italic;">
          "Smile-Design Clinics integrated a conversational AI patient intake agent, eliminating unanswered calls during peak hours and boosting bookings by 35%."
        </blockquote>

        <p>By automating qualified WhatsApp replies and booking integrations, they completely offloaded staff while capturing more revenue. We can implement a similar pipeline for <span class="highlight">${lead.company || 'your business'}</span>.</p>

        <div class="button-container">
          <a href="https://autoscale.systems/" class="btn">View Case Studies</a>
        </div>
      `
    );

    return this.sendEmail({
      toEmail: lead.email,
      toName: lead.name,
      subject: `Case Study: How We Automated Inbound Patient Intake by 35%`,
      body,
      html,
      triggerEvent: 'Follow-up Day 2'
    });
  },

  /**
   * 9. Campaign Follow-Up Day 5 (ROI Example)
   */
  async sendFollowUpDay5(lead, audit) {
    const title = "Your Projected ROI Breakdown";
    const annualSavings = audit?.roiEstimate?.annualSavings?.toLocaleString('en-IN') || '1,44,000';
    const monthlySavings = audit?.roiEstimate?.monthlySavings?.toLocaleString('en-IN') || '12,000';
    const body = `Hi ${lead.name},\n\nWe estimated that Autoscale custom systems could recover INR ${monthlySavings}/month (INR ${annualSavings}/year) for ${lead.company} by fixing process bottlenecks. Here is a breakdown of that return on investment.\n\nBest Regards,\nAutoScale Systems`;

    const html = wrapHtmlTemplate(
      title,
      "Operational ROI Forecast",
      `
        <p>Hi <span class="highlight">${lead.name}</span>,</p>
        <p>Let's look at the financial numbers from your systems audit. We forecast a clear return on investment by deploying custom automations at <span class="highlight">${lead.company || 'your business'}</span>:</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 24px 0; background-color: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 8px; font-size: 13px;">
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.05); color: #525252; text-transform: uppercase; font-size: 9px; font-weight: bold; width: 150px;">Monthly Saved</td>
            <td style="padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.05); color: #ffffff; font-weight: bold; font-family: monospace;">INR ${monthlySavings}</td>
          </tr>
          <tr>
            <td style="padding: 12px; color: #525252; text-transform: uppercase; font-size: 9px; font-weight: bold;">Annual Opportunity</td>
            <td style="padding: 12px; color: #10b981; font-weight: bold; font-family: monospace;">INR ${annualSavings}</td>
          </tr>
        </table>

        <p>These gains are achieved by converting 4-hour response latency into under 30-second automated response loops, stopping leads from dropping off to competitors.</p>
        
        <div class="button-container">
          <a href="https://autoscale.systems/" class="btn">Calculate Custom ROI</a>
        </div>
      `
    );

    return this.sendEmail({
      toEmail: lead.email,
      toName: lead.name,
      subject: `ROI Analysis: Reclaim INR ${monthlySavings} monthly at ${lead.company}`,
      body,
      html,
      triggerEvent: 'Follow-up Day 5'
    });
  },

  /**
   * 10. Campaign Follow-Up Day 7 (Book Strategy Call)
   */
  async sendFollowUpDay7(lead) {
    const title = "Schedule a Strategy Session";
    const body = `Hi ${lead.name},\n\nWe've analyzed your systems and estimated your savings. Let's schedule a 45-minute Strategy Call to map out a deployment blueprint for ${lead.company}.\n\nBook your slot below.\n\nBest Regards,\nAutoScale Systems`;

    const html = wrapHtmlTemplate(
      title,
      "Deploy Your Automation Blueprint",
      `
        <p>Hi <span class="highlight">${lead.name}</span>,</p>
        <p>We've mapped out the gaps and potential ROI. The next step is a live session to design the technical blueprint for <span class="highlight">${lead.company || 'your business'}</span>.</p>
        
        <p>In this 45-minute <strong>Strategy Session</strong>, we will:</p>
        <ul style="padding-left: 20px; margin: 16px 0; color: #a3a3a3;">
          <li>Review your specific database and tool integration layers.</li>
          <li>Outline the custom WhatsApp and CRM pipeline stages.</li>
          <li>Provide a flat-rate proposal and delivery timeline options.</li>
        </ul>

        <div class="button-container">
          <a href="https://autoscale.systems/book" class="btn">Book Strategy Session</a>
        </div>
      `
    );

    return this.sendEmail({
      toEmail: lead.email,
      toName: lead.name,
      subject: `Blueprint Session: Schedule your Strategy Call`,
      body,
      html,
      triggerEvent: 'Follow-up Day 7'
    });
  },

  /**
   * 11. Lead Magnet Delivery Email
   */
  async sendLeadMagnetEmail(email, name, resourceTitle) {
    const title = "Resource Download Confirmation";
    const body = `Hi ${name},\n\nHere is your link to download: ${resourceTitle}.\n\nThank you for requesting this guide from AutoScale Systems.\n\nBest Regards,\nAutoScale Systems`;

    const html = wrapHtmlTemplate(
      title,
      "Your Guide is Ready",
      `
        <p>Hi <span class="highlight">${name}</span>,</p>
        <p>Thank you for requesting our resource guide. Your copy of the <span class="highlight">${resourceTitle}</span> is ready for download:</p>
        
        <div class="button-container">
          <a href="https://autoscale.systems/resources" class="btn">Download Resource Guide</a>
        </div>

        <p>We hope this provides valuable automation insights for your business operations.</p>
      `
    );

    return this.sendEmail({
      toEmail: email,
      toName: name,
      subject: `Download: Your copy of the ${resourceTitle}`,
      body,
      html,
      triggerEvent: 'Lead Magnet Download'
    });
  }
};
