import { doc, getDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export const calendarService = {
  /**
   * Refreshes OAuth credentials, schedules the audit event on Google Calendar,
   * configures automated email reminders, and logs the slot in meetings collection.
   */
  async createEvent(lead, date, time, type = 'audit_review') {
    if (!lead || !lead.email) return null;

    try {
      // 1. Fetch Google Calendar Settings from settings/google_calendar
      const googleSnap = await getDoc(doc(db, 'settings', 'google_calendar'));
      if (!googleSnap.exists()) {
        console.warn('[Calendar Service] Google Calendar integration credentials not configured in settings.');
        return null;
      }

      const data = googleSnap.data();
      const clientId = data.client_id || data.googleClientId;
      const clientSecret = data.client_secret || data.googleClientSecret;
      const refreshToken = data.refresh_token || data.googleRefreshToken;
      const calendarId = data.calendar_id || data.googleCalendarId || 'primary';

      if (!clientId || !clientSecret || !refreshToken) {
        console.warn('[Calendar Service] Incomplete Google Calendar settings.');
        return null;
      }

      // 2. Exchange refresh token for fresh access token client-side
      console.log('[Calendar Service] Exchanging refresh token for access token...');
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token'
        })
      });

      if (!tokenRes.ok) {
        const errText = await tokenRes.text();
        console.error('[Calendar Service] OAuth token refresh failed:', errText);
        return null;
      }

      const tokenData = await tokenRes.json();
      const accessToken = tokenData.access_token;

      // Extract details flexibly from lead or parameters
      const bookingDate = date || lead.date || lead.bookingDate;
      const bookingTime = time || lead.time || lead.bookingTime;
      const bookingType = type || lead.type || lead.meetingType || 'audit_review';

      // 3. Setup event schedule
      let startDateTime;
      if (bookingDate && bookingTime) {
        startDateTime = new Date(`${bookingDate}T${bookingTime}:00`);
      } else {
        startDateTime = new Date();
        startDateTime.setDate(startDateTime.getDate() + 1);
        startDateTime.setHours(11, 0, 0, 0);
      }

      let durationMinutes = 30;
      if (bookingType === 'discovery') durationMinutes = 15;
      else if (bookingType === 'strategy') durationMinutes = 45;

      const endDateTime = new Date(startDateTime.getTime() + durationMinutes * 60 * 1000);

      let summary = `AutoScale Systems Audit: ${lead.name} (${lead.company || 'N/A'})`;
      let description = `Deep-dive systems and processes audit.\nRequested Solution: ${lead.service || lead.requestedService || 'Custom Automation'}\nMessage/Bottlenecks: ${lead.message || 'None specified'}`;

      if (bookingType === 'discovery') {
        summary = `AutoScale Discovery Call: ${lead.name} (${lead.company || 'N/A'})`;
        description = `Discovery call to discuss AutoScale capabilities.\nLead Name: ${lead.name}\nEmail: ${lead.email}\nCompany: ${lead.company || 'N/A'}`;
      } else if (bookingType === 'strategy') {
        summary = `AutoScale Strategy Session: ${lead.name} (${lead.company || 'N/A'})`;
        description = `Strategy session to discuss proposal and automation roadmap.\nLead Name: ${lead.name}\nEmail: ${lead.email}\nCompany: ${lead.company || 'N/A'}`;
      }

      const eventPayload = {
        summary,
        description,
        start: { dateTime: startDateTime.toISOString(), timeZone: 'Asia/Kolkata' },
        end: { dateTime: endDateTime.toISOString(), timeZone: 'Asia/Kolkata' },
        attendees: [
          { email: lead.email }
        ],
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 1440 }, // 24 hours email alert
            { method: 'email', minutes: 30 }    // 30 minutes email alert
          ]
        }
      };

      console.log('[Calendar Service] Scheduling event on Google Calendar...');
      const createRes = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(eventPayload)
      });

      if (createRes.ok) {
        const eventData = await createRes.json();
        console.log('[Calendar Service] Google Calendar event scheduled successfully:', eventData.htmlLink);

        let dbTitle = `Audit: ${lead.name} (${lead.company || 'N/A'})`;
        if (bookingType === 'discovery') dbTitle = `Discovery: ${lead.name} (${lead.company || 'N/A'})`;
        else if (bookingType === 'strategy') dbTitle = `Strategy: ${lead.name} (${lead.company || 'N/A'})`;

        // 4. Save to Firestore meetings collection
        await addDoc(collection(db, 'meetings'), {
          title: dbTitle,
          date: startDateTime.toISOString().split('T')[0],
          time: bookingTime || startDateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          link: eventData.htmlLink || '',
          eventId: eventData.id,
          leadId: lead.id || lead.leadId || '',
          type: bookingType,
          createdAt: serverTimestamp()
        });

        return eventData.htmlLink;
      } else {
        const createErr = await createRes.text();
        console.error('[Calendar Service] Event creation rejected by Google Calendar API:', createErr);
        return null;
      }
    } catch (err) {
      console.error('[Calendar Service] Calendar scheduling exception:', err);
      return null;
    }
  }
};
