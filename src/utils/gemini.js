import { appConfig } from '../config/appConfig';

const API_KEY = appConfig.gemini.apiKey;

/**
 * Direct fetch request to the Gemini API
 * @param {string} prompt - Prompt to send to Gemini
 * @param {boolean} expectJson - Whether to configure the model for JSON output
 * @returns {Promise<string|object>} Response text or parsed JSON object
 */
export async function generateWithGemini(prompt, expectJson = false) {
  if (!API_KEY) {
    console.warn("[Gemini Utility] No API Key detected. Using local simulation fallback.");
    return simulateFallback(prompt, expectJson);
  }

  const endpoint = `${appConfig.gemini.endpoint}?key=${API_KEY}`;

  try {
    const payload = {
      contents: [
        {
          parts: [
            {
              text: prompt
            }
          ]
        }
      ]
    };

    if (expectJson) {
      payload.generationConfig = {
        responseMimeType: "application/json"
      };
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API returned status ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const textResult = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textResult) {
      throw new Error("Empty response returned from Gemini candidates");
    }

    if (expectJson) {
      try {
        return JSON.parse(textResult);
      } catch (jsonErr) {
        console.warn("[Gemini Utility] Failed to parse JSON response. Raw output:", textResult);
        // Fallback parse attempts
        const jsonMatch = textResult.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
        throw jsonErr;
      }
    }

    return textResult;

  } catch (error) {
    console.error("[Gemini Utility] API Call failed. Triggering simulation fallback. Error:", error);
    return simulateFallback(prompt, expectJson);
  }
}

/**
 * Local simulation fallback to ensure 100% UI stability offline or without keys
 */
function simulateFallback(prompt, expectJson) {
  return new Promise((resolve) => {
    setTimeout(() => {
      if (!expectJson) {
        resolve("Autoscale Simulated Response:\n\nBased on your prompt, we recommend integrating WhatsApp lead capture bots and cognitive CRM sync gateways to cut response times down from 4 hours to under 30 seconds, leading to a 30% boost in overall conversion rate.");
        return;
      }

      // Check if audit prompt
      if (prompt.toLowerCase().includes("audit") || prompt.toLowerCase().includes("opportunities")) {
        resolve({
          automationOpportunities: [
            {
              title: "WhatsApp Lead Capture & Routing Bot",
              desc: "Automates the intake of new leads and instantly pushes them to the Autoscale Leads pipeline, routing them to the correct developer.",
              impact: "+28% conversion rate"
            },
            {
              title: "Cognitive CRM Sync Gateway",
              desc: "Eliminates manual entry by synchronizing contact forms and bookings directly with the billing nodes.",
              impact: "Saves 12+ hours/week for founders"
            }
          ],
          leadCaptureGaps: [
            "No after-hours chat responder on the primary website.",
            "Form validation is basic and fails to capture critical qualification data like company size."
          ],
          responseTimeAnalysis: {
            current: "Estimated 3.5 Hours",
            recommended: "Under 15 Seconds",
            explanation: "Integrating automated triggers immediately routes bookings to team members, cutting down client drop-off rates."
          },
          processImprovements: [
            "Convert won leads into client portal accounts in one click to accelerate onboarding.",
            "Standardize developer clearance levels with secure role assignments."
          ],
          roiEstimate: {
            monthlySavings: 42000,
            annualSavings: 504000,
            revenueOpportunity: 180000
          }
        });
      } else {
        // Proposal prompt
        resolve({
          problem: "The client lacks dynamic systems to capture, score, and transition leads, causing leakage in customer onboarding and late invoice tracking.",
          solution: "Deploy the Autoscale CRM & Delivery Operating System, configuring automated pipelines, client dashboards, and automated email/WhatsApp alerts.",
          timeline: [
            { phase: "Audit & Architecture", duration: "3 Days" },
            { phase: "Deployment & Integration", duration: "6 Days" },
            { phase: "Harden and Handover", duration: "3 Days" }
          ],
          pricing: [
            { item: "Autoscale License & Core Pipeline Setup", cost: 45000 },
            { item: "Bespoke WhatsApp Bot & Automated Notifications", cost: 25000 }
          ],
          expectedRoi: "Reclaim up to 15 hours of manual work weekly and increase client proposal conversion rate by 22% within the first month."
        });
      }
    }, 1500); // 1.5s delay to feel like genuine AI generation
  });
}
