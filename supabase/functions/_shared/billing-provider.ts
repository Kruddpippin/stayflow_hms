// Billing Provider abstraction for SaaS subscription management

export interface BillingCustomer {
  org_id: string;
  email: string;
  name: string;
}

export interface SubscriptionParams {
  org_id: string;
  plan_code: string;
  interval: "monthly" | "yearly";
  amount: number;
  email: string;
  callback_url?: string;
}

export interface BillingResult {
  success: boolean;
  error?: string;
  data?: Record<string, unknown>;
}

export interface BillingProvider {
  name: string;
  createSubscription(params: SubscriptionParams): Promise<BillingResult & { authorization_url?: string; reference?: string }>;
  cancelSubscription(externalSubId: string, atPeriodEnd?: boolean): Promise<BillingResult>;
  verifyWebhook(headers: Headers, body: string, secret: string): Promise<boolean>;
  processWebhookEvent(event: Record<string, unknown>): Promise<{
    type: string; subscription_ref?: string; invoice_ref?: string;
    status?: string; amount?: number; period_start?: string; period_end?: string;
  } | null>;
}

export class PaystackBillingProvider implements BillingProvider {
  name = "paystack";
  private secret: string;

  constructor() {
    this.secret = Deno.env.get("PAYSTACK_SECRET_KEY") ?? "";
  }

  async createSubscription(params: SubscriptionParams): Promise<BillingResult & { authorization_url?: string; reference?: string }> {
    if (!this.secret) return { success: false, error: "Paystack not configured" };

    const reference = `STAYFLOW-${params.plan_code}-${params.org_id.slice(0, 8)}-${Date.now()}`;

    const resp = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: { Authorization: `Bearer ${this.secret}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        email: params.email,
        amount: Math.round(params.amount * 100),
        reference,
        callback_url: params.callback_url,
        metadata: {
          org_id: params.org_id,
          plan_code: params.plan_code,
          interval: params.interval,
          type: "subscription",
        },
      }),
    });
    const data = await resp.json();
    if (!data.status) return { success: false, error: data.message };

    return {
      success: true,
      authorization_url: data.data.authorization_url,
      reference: data.data.reference,
    };
  }

  async cancelSubscription(externalSubId: string, _atPeriodEnd?: boolean): Promise<BillingResult> {
    if (!this.secret) return { success: true };
    try {
      await fetch(`https://api.paystack.co/subscription/disable`, {
        method: "POST",
        headers: { Authorization: `Bearer ${this.secret}`, "Content-Type": "application/json" },
        body: JSON.stringify({ code: externalSubId, token: externalSubId }),
      });
      return { success: true };
    } catch (e) {
      return { success: false, error: (e as Error).message };
    }
  }

  async verifyWebhook(headers: Headers, body: string, secret: string): Promise<boolean> {
    const signature = headers.get("x-paystack-signature") ?? "";
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-512" }, false, ["sign"]);
    const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
    const computed = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
    return computed === signature;
  }

  async processWebhookEvent(event: Record<string, unknown>) {
    const eventType = event.event as string;
    const data = event.data as Record<string, unknown>;

    if (eventType === "charge.success") {
      const metadata = data.metadata as Record<string, unknown> | undefined;
      if (metadata?.type !== "subscription") return null;
      return {
        type: "subscription_paid",
        subscription_ref: data.reference as string,
        amount: (data.amount as number) / 100,
        status: "active",
      };
    }

    return null;
  }
}

export class MockBillingProvider implements BillingProvider {
  name = "mock";

  async createSubscription(params: SubscriptionParams) {
    const reference = `MOCK-${params.plan_code}-${Date.now()}`;
    console.log("[mock billing] createSubscription", params.plan_code, params.interval);
    return { success: true, reference, authorization_url: `${params.callback_url}?reference=${reference}` };
  }

  async cancelSubscription(_id: string) {
    return { success: true };
  }

  async verifyWebhook() { return true; }

  async processWebhookEvent(event: Record<string, unknown>) {
    return { type: event.type as string, status: "active" };
  }
}

export function getBillingProvider(code: string): BillingProvider {
  switch (code) {
    case "paystack": return new PaystackBillingProvider();
    case "mock": return new MockBillingProvider();
    default: return new MockBillingProvider();
  }
}
