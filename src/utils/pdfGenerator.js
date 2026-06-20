import { jsPDF } from 'jspdf';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';

export const pdfGenerator = {
  /**
   * Automatically drafts, formats, and uploads a styled Proposal PDF to Firebase Storage.
   */
  async generateAndUploadProposal(proposalId, proposal) {
    if (!proposalId || !proposal) return null;

    try {
      const doc = new jsPDF();
      doc.setFont("Helvetica");
      
      // Header Banner
      doc.setFillColor(18, 2, 36);
      doc.rect(0, 0, 210, 45, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.text("AUTOSCALE SYSTEMS", 14, 25);
      doc.setFontSize(10);
      doc.text("BESPOKE INTEGRATION & AUTOMATION PROPOSAL", 14, 35);
      
      // Client Details
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(11);
      doc.setFont("Helvetica", "bold");
      doc.text("PREPARED FOR:", 14, 58);
      doc.setFont("Helvetica", "normal");
      doc.text(`${proposal.leadName} (${proposal.company})`, 14, 64);
      doc.text(`Industry: ${proposal.industry || 'Other'} | Email: ${proposal.email}`, 14, 70);
      doc.text(`Solution: ${proposal.service}`, 14, 76);
      doc.text(`Date Generated: ${new Date().toLocaleDateString('en-IN')}`, 14, 82);
      
      // Problem Statement
      doc.setFont("Helvetica", "bold");
      doc.text("1. PROBLEM STATEMENT", 14, 96);
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(10);
      const problemLines = doc.splitTextToSize(proposal.problem || 'Reviewing operational challenges.', 182);
      doc.text(problemLines, 14, 102);
      
      // Solution Proposal
      let currentY = 102 + problemLines.length * 5 + 10;
      doc.setFontSize(11);
      doc.setFont("Helvetica", "bold");
      doc.text("2. PROPOSED AUTOMATION PIPELINE", 14, currentY);
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(10);
      const solutionLines = doc.splitTextToSize(proposal.solution || 'Deploying custom API systems.', 182);
      doc.text(solutionLines, 14, currentY + 6);
      
      // ROI & Cost
      currentY = currentY + 6 + solutionLines.length * 5 + 10;
      doc.setFontSize(11);
      doc.setFont("Helvetica", "bold");
      doc.text("3. COMMERCIAL BREAKDOWN", 14, currentY);
      
      doc.setFillColor(245, 245, 245);
      doc.rect(14, currentY + 4, 182, 8, "F");
      doc.setFontSize(9);
      doc.text("Deliverable Area", 16, currentY + 9);
      doc.text("Pricing (INR)", 160, currentY + 9);
      
      doc.setTextColor(50, 50, 50);
      doc.setFontSize(10);
      doc.setFont("Helvetica", "normal");
      doc.text(`Core Integration Solution for ${proposal.service}`, 16, currentY + 18);
      doc.text(`INR ${proposal.price?.toLocaleString('en-IN')}`, 160, currentY + 18);
      
      doc.setTextColor(0, 0, 0);
      doc.setFont("Helvetica", "bold");
      doc.text("EXPECTED RETURN ON INVESTMENT (ROI):", 14, currentY + 32);
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(9);
      const roiLines = doc.splitTextToSize(proposal.expectedRoi || 'Saves significant manual workflows.', 182);
      doc.text(roiLines, 14, currentY + 38);

      const pdfBlob = doc.output('blob');
      const storagePath = `proposals/${proposalId}_proposal.pdf`;
      const fileRef = ref(storage, storagePath);
      const snap = await uploadBytes(fileRef, pdfBlob);
      const downloadURL = await getDownloadURL(snap.ref);
      
      console.log(`[PDF Generator] Proposal PDF successfully uploaded: ${downloadURL}`);
      return downloadURL;
    } catch (err) {
      console.error('[PDF Generator] Failed to generate proposal PDF:', err);
      return null;
    }
  },

  /**
   * Automatically drafts, formats, and uploads a styled Invoice PDF to Firebase Storage.
   */
  async generateAndUploadInvoice(invoiceId, invoice) {
    if (!invoiceId || !invoice) return null;

    try {
      const doc = new jsPDF();
      doc.setFont("Helvetica");
      
      // Header Banner
      doc.setFillColor(18, 2, 36);
      doc.rect(0, 0, 210, 45, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.text("AUTOSCALE SYSTEMS", 14, 25);
      doc.setFontSize(10);
      doc.text("TAX INVOICE STATEMENT", 14, 35);
      
      // Details
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(11);
      doc.setFont("Helvetica", "bold");
      doc.text(`INVOICE NUMBER: ${invoice.invoiceNumber}`, 14, 58);
      doc.setFont("Helvetica", "normal");
      doc.text(`Issued Date: ${invoice.issueDate || new Date().toISOString().split('T')[0]}`, 14, 64);
      doc.text(`Due Date: ${invoice.dueDate}`, 14, 70);
      doc.text(`Client Company: ${invoice.clientName}`, 14, 76);
      doc.text(`Linked Project: ${invoice.projectTitle || 'General Retainer'}`, 14, 82);
      
      // Table Header
      doc.setFillColor(245, 245, 245);
      doc.rect(14, 95, 182, 8, "F");
      doc.setFontSize(9);
      doc.setFont("Helvetica", "bold");
      doc.text("Item / Description", 16, 100);
      doc.text("Subtotal (INR)", 160, 100);
      
      // Table Content
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`Systems Development Retainer: ${invoice.projectTitle || 'GeneralRetainer'}`, 16, 112);
      doc.text(`INR ${invoice.amount?.toLocaleString('en-IN')}`, 160, 112);
      
      // Total Summary
      doc.setFont("Helvetica", "bold");
      doc.text("TOTAL AMOUNT PAYABLE:", 110, 135);
      doc.text(`INR ${invoice.amount?.toLocaleString('en-IN')}`, 160, 135);
      
      doc.setFontSize(9);
      doc.setFont("Helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      doc.text("Payment instructions: Settle via secure client portal at client.autoscale.systems.", 14, 160);

      const pdfBlob = doc.output('blob');
      const storagePath = `invoices/${invoiceId}_invoice.pdf`;
      const fileRef = ref(storage, storagePath);
      const snap = await uploadBytes(fileRef, pdfBlob);
      const downloadURL = await getDownloadURL(snap.ref);
      
      console.log(`[PDF Generator] Invoice PDF successfully uploaded: ${downloadURL}`);
      return downloadURL;
    } catch (err) {
      console.error('[PDF Generator] Failed to generate invoice PDF:', err);
      return null;
    }
  },

  /**
   * Automatically drafts, formats, and uploads a styled Audit Report PDF to Firebase Storage.
   */
  async generateAndUploadAudit(reportId, audit) {
    if (!reportId || !audit) return null;

    try {
      const doc = new jsPDF();
      doc.setFont("Helvetica");
      
      // Header Banner
      doc.setFillColor(18, 2, 36);
      doc.rect(0, 0, 210, 45, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.text("AUTOSCALE SYSTEMS", 14, 25);
      doc.setFontSize(10);
      doc.text("TECHNICAL SYSTEMS AUDIT & ROI FORECAST REPORT", 14, 35);
      
      // Details
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(11);
      doc.setFont("Helvetica", "bold");
      doc.text("AUDIT PROFILE:", 14, 58);
      doc.setFont("Helvetica", "normal");
      doc.text(`Company Name: ${audit.businessName}`, 14, 64);
      doc.text(`Website Target: ${audit.website}`, 14, 70);
      doc.text(`Industry Sector: ${audit.industry}`, 14, 76);

      let roiString = '';
      if (typeof audit.roiEstimate === 'object' && audit.roiEstimate !== null) {
        roiString = `Annual Savings: INR ${audit.roiEstimate.annualSavings?.toLocaleString('en-IN') || 0} | Monthly: INR ${audit.roiEstimate.monthlySavings?.toLocaleString('en-IN') || 0}`;
      } else {
        roiString = String(audit.roiEstimate || '');
      }
      doc.text(`ROI Estimate Forecast: ${roiString}`, 14, 82);
      doc.text(`Audited Date: ${new Date().toLocaleDateString('en-IN')}`, 14, 88);
      
      // Findings
      doc.setFont("Helvetica", "bold");
      doc.text("OPERATIONAL AUDIT FINDINGS:", 14, 102);
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(9);

      let findingsText = '';
      if (typeof audit.findings === 'object' && audit.findings !== null) {
        const opps = audit.findings.automationOpportunities || [];
        const gaps = audit.findings.leadCaptureGaps || [];
        const speed = audit.findings.responseTimeAnalysis || {};
        const steps = audit.findings.processImprovements || [];
        
        findingsText = `1. AUTOMATION OPPORTUNITIES:\n` + 
          opps.map(o => `  * ${o.title}: ${o.desc} (${o.impact})`).join('\n') + 
          `\n\n2. RESPONSE TIME ANALYSIS:\n` +
          `  * Current Speed: ${speed.current || 'N/A'} -> Recommended Speed: ${speed.recommended || 'Under 30s'}\n  * Detail: ${speed.explanation || ''}\n\n` +
          `3. LEAD CAPTURE GAPS:\n` +
          gaps.map(g => `  * ${g}`).join('\n') +
          `\n\n4. PROCESS IMPROVEMENTS:\n` +
          steps.map(s => `  * ${s}`).join('\n');
      } else {
        findingsText = String(audit.findings || '');
      }

      const findingsLines = doc.splitTextToSize(findingsText, 182);
      doc.text(findingsLines, 14, 108);
      
      const pdfBlob = doc.output('blob');
      const storagePath = `audits/${reportId}_audit.pdf`;
      const fileRef = ref(storage, storagePath);
      const snap = await uploadBytes(fileRef, pdfBlob);
      const downloadURL = await getDownloadURL(snap.ref);
      
      console.log(`[PDF Generator] Audit PDF successfully uploaded: ${downloadURL}`);
      return downloadURL;
    } catch (err) {
      console.error('[PDF Generator] Failed to generate audit PDF:', err);
      return null;
    }
  },

  /**
   * Automatically drafts, formats, and uploads a styled Client Summary PDF to Firebase Storage.
   */
  async generateAndUploadSummary(clientId, client, project) {
    if (!clientId || !client || !project) return null;

    try {
      const doc = new jsPDF();
      doc.setFont("Helvetica");
      
      // Header Banner
      doc.setFillColor(18, 2, 36);
      doc.rect(0, 0, 210, 45, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.text("AUTOSCALE SYSTEMS", 14, 25);
      doc.setFontSize(10);
      doc.text("CLIENT SUMMARY WORKSPACE HANDOVER REPORT", 14, 35);
      
      // Details
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(11);
      doc.setFont("Helvetica", "bold");
      doc.text("CLIENT RECORD SUMMARY:", 14, 58);
      doc.setFont("Helvetica", "normal");
      doc.text(`Company Account: ${client.companyName || client.company}`, 14, 64);
      doc.text(`Account Owner: ${client.contactPerson || client.ownerName}`, 14, 70);
      doc.text(`Email Address: ${client.email}`, 14, 76);
      doc.text(`Integration Workspace: ${project.projectName}`, 14, 82);
      doc.text(`Project Stage: ${project.status} (${project.progress || 0}% Complete)`, 14, 88);
      doc.text(`Total Contract Value: INR ${client.contractValue?.toLocaleString('en-IN')}`, 14, 94);
      
      const pdfBlob = doc.output('blob');
      const storagePath = `summaries/${clientId}_summary.pdf`;
      const fileRef = ref(storage, storagePath);
      const snap = await uploadBytes(fileRef, pdfBlob);
      const downloadURL = await getDownloadURL(snap.ref);
      
      console.log(`[PDF Generator] Client Summary PDF successfully uploaded: ${downloadURL}`);
      return downloadURL;
    } catch (err) {
      console.error('[PDF Generator] Failed to generate summary PDF:', err);
      return null;
    }
  }
};
