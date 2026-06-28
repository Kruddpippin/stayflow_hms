// Messaging Provider abstraction

export interface EmailPayload {
  to: string; from: string; subject: string; html: string; replyTo?: string;
  headers?: Record<string, string>;
}

export interface WhatsAppTemplatePayload {
  to: string; // phone number
  templateName: string;
  language: string;
  variables: string[];
}

export interface WhatsAppFreeformPayload {
  to: string;
  body: string;
}

export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface WebhookEvent {
  type: "delivered" | "bounced" | "opened" | "clicked" | "replied" | "failed" | "unsubscribe" | "session_opened";
  providerMessageId?: string;
  guestPhone?: string;
  detail?: Record<string, unknown>;
}

export interface MessagingProvider {
  name: string;
  sendEmail(payload: EmailPayload): Promise<SendResult>;
  sendWhatsAppTemplate(payload: WhatsAppTemplatePayload): Promise<SendResult>;
  sendWhatsAppFreeform(payload: WhatsAppFreeformPayload): Promise<SendResult>;
  verifyWebhook(headers: Headers, body: string): Promise<boolean>;
  parseEvent(payload: Record<string, unknown>): WebhookEvent | null;
}

// Mock provider for development
export class MockMessagingProvider implements MessagingProvider {
  name = "mock";

  async sendEmail(payload: EmailPayload): Promise<SendResult> {
    console.log(`[mock] Email to ${payload.to}: ${payload.subject}`);
    return { success: true, messageId: `mock-email-${Date.now()}` };
  }

  async sendWhatsAppTemplate(payload: WhatsAppTemplatePayload): Promise<SendResult> {
    console.log(`[mock] WA template to ${payload.to}: ${payload.templateName}`);
    return { success: true, messageId: `mock-wa-${Date.now()}` };
  }

  async sendWhatsAppFreeform(payload: WhatsAppFreeformPayload): Promise<SendResult> {
    console.log(`[mock] WA freeform to ${payload.to}: ${payload.body.slice(0, 50)}`);
    return { success: true, messageId: `mock-wa-ff-${Date.now()}` };
  }

  async verifyWebhook(): Promise<boolean> { return true; }

  parseEvent(payload: Record<string, unknown>): WebhookEvent | null {
    return { type: payload.type as WebhookEvent["type"] ?? "delivered" };
  }
}

// Resend email adapter
export class ResendEmailProvider implements MessagingProvider {
  name = "resend";
  private apiKey: string;

  constructor() {
    this.apiKey = Deno.env.get("RESEND_API_KEY") ?? "";
  }

  async sendEmail(payload: EmailPayload): Promise<SendResult> {
    if (!this.apiKey) {
      console.log(`[resend stub] Email to ${payload.to}`);
      return { success: true, messageId: `resend-stub-${Date.now()}` };
    }

    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: payload.from, to: [payload.to], subject: payload.subject,
        html: payload.html, reply_to: payload.replyTo,
      }),
    });
    const data = await resp.json();
    if (data.id) return { success: true, messageId: data.id };
    return { success: false, error: data.message ?? "Send failed" };
  }

  async sendWhatsAppTemplate(): Promise<SendResult> { return { success: false, error: "Use WA provider" }; }
  async sendWhatsAppFreeform(): Promise<SendResult> { return { success: false, error: "Use WA provider" }; }
  async verifyWebhook(headers: Headers, body: string): Promise<boolean> {
    const sig = headers.get("svix-signature");
    return !!sig; // Simplified; production would verify HMAC
  }

  parseEvent(payload: Record<string, unknown>): WebhookEvent | null {
    const type = payload.type as string;
    const mapping: Record<string, WebhookEvent["type"]> = {
      "email.delivered": "delivered", "email.bounced": "bounced",
      "email.opened": "opened", "email.clicked": "clicked",
      "email.complained": "unsubscribe",
    };
    if (!mapping[type]) return null;
    return { type: mapping[type], providerMessageId: (payload.data as Record<string, unknown>)?.email_id as string };
  }
}

// Twilio WhatsApp adapter
export class TwilioWhatsAppProvider implements MessagingProvider {
  name = "twilio_whatsapp";
  private accountSid: string;
  private authToken: string;
  private fromNumber: string;

  constructor() {
    this.accountSid = Deno.env.get("TWILIO_ACCOUNT_SID") ?? "";
    this.authToken = Deno.env.get("TWILIO_AUTH_TOKEN") ?? "";
    this.fromNumber = Deno.env.get("TWILIO_WHATSAPP_FROM") ?? "";
  }

  async sendEmail(): Promise<SendResult> { return { success: false, error: "Use email provider" }; }

  async sendWhatsAppTemplate(payload: WhatsAppTemplatePayload): Promise<SendResult> {
    if (!this.accountSid) {
      console.log(`[twilio stub] WA template to ${payload.to}`);
      return { success: true, messageId: `twilio-stub-${Date.now()}` };
    }

    const body = new URLSearchParams({
      From: `whatsapp:${this.fromNumber}`,
      To: `whatsapp:${payload.to}`,
      ContentSid: payload.templateName,
    });

    const resp = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: "Basic " + btoa(`${this.accountSid}:${this.authToken}`),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      }
    );
    const data = await resp.json();
    if (data.sid) return { success: true, messageId: data.sid };
    return { success: false, error: data.message ?? "Send failed" };
  }

  async sendWhatsAppFreeform(payload: WhatsAppFreeformPayload): Promise<SendResult> {
    if (!this.accountSid) {
      console.log(`[twilio stub] WA freeform to ${payload.to}`);
      return { success: true, messageId: `twilio-stub-ff-${Date.now()}` };
    }

    const body = new URLSearchParams({
      From: `whatsapp:${this.fromNumber}`,
      To: `whatsapp:${payload.to}`,
      Body: payload.body,
    });

    const resp = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: "Basic " + btoa(`${this.accountSid}:${this.authToken}`),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      }
    );
    const data = await resp.json();
    if (data.sid) return { success: true, messageId: data.sid };
    return { success: false, error: data.message ?? "Send failed" };
  }

  async verifyWebhook(headers: Headers, _body: string): Promise<boolean> {
    return !!headers.get("x-twilio-signature");
  }

  parseEvent(payload: Record<string, unknown>): WebhookEvent | null {
    const status = payload.MessageStatus as string;
    const body = (payload.Body as string ?? "").toLowerCase();
    if (body === "stop" || body === "unsubscribe") {
      return { type: "unsubscribe", guestPhone: payload.From as string };
    }
    if (status === "delivered") return { type: "delivered", providerMessageId: payload.MessageSid as string };
    if (status === "failed") return { type: "failed", providerMessageId: payload.MessageSid as string };
    if (payload.Body) return { type: "session_opened", guestPhone: payload.From as string };
    return null;
  }
}

export function getEmailProvider(): MessagingProvider {
  if (Deno.env.get("RESEND_API_KEY")) return new ResendEmailProvider();
  return new MockMessagingProvider();
}

export function getWhatsAppProvider(): MessagingProvider {
  if (Deno.env.get("TWILIO_ACCOUNT_SID")) return new TwilioWhatsAppProvider();
  return new MockMessagingProvider();
}
