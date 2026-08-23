import { createHmac, timingSafeEqual } from "crypto";

// Thin adapter around Square's REST API -- deliberately no `square` npm SDK
// dependency, to avoid touching package.json/package-lock.json from this
// session. See STO_Consolidated_Context.md Section 6/9, "Payment/POS
// Integration Layer": Square is the first of several intended providers, so
// this stays a swappable adapter rather than something baked into the order
// engine -- a Clover/Toast adapter later would implement the same shape.

export type SquareEnvironment = "sandbox" | "production";

function baseUrl(environment: SquareEnvironment): string {
  return environment === "production"
    ? "https://connect.squareup.com"
    : "https://connect.squareupsandbox.com";
}

// Square requires a version header on every request; pin it explicitly so a
// Square-side default change can't silently alter behavior here.
const SQUARE_VERSION = "2024-10-17";

export type SquareConnection = {
  environment: SquareEnvironment;
  accessToken: string;
  locationId: string;
};

export type CreatePaymentResult =
  | { ok: true; paymentId: string; status: string; receiptUrl: string | null }
  | { ok: false; error: string };

// Charges a tokenized payment source (the `token` a Web Payments SDK
// wallet/card returns after tokenize()) for `amount` dollars. idempotencyKey
// should be stable per attempt -- using the STO order id means a retried
// request with the same order can never double-charge.
export async function createSquarePayment(
  connection: SquareConnection,
  args: {
    sourceId: string;
    idempotencyKey: string;
    amount: number;
    currency?: string;
  }
): Promise<CreatePaymentResult> {
  let res: Response;
  try {
    res = await fetch(`${baseUrl(connection.environment)}/v2/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Square-Version": SQUARE_VERSION,
        Authorization: `Bearer ${connection.accessToken}`,
      },
      body: JSON.stringify({
        source_id: args.sourceId,
        idempotency_key: args.idempotencyKey,
        location_id: connection.locationId,
        amount_money: {
          // Square wants the smallest currency unit (cents for USD).
          amount: Math.round(args.amount * 100),
          currency: args.currency ?? "USD",
        },
      }),
    });
  } catch {
    return { ok: false, error: "Couldn't reach Square. Check your connection and try again." };
  }

  const data = await res.json().catch(() => null);

  if (!res.ok || !data?.payment) {
    const detail: string | undefined = Array.isArray(data?.errors)
      ? data.errors
          .map((e: { detail?: string }) => e.detail)
          .filter(Boolean)
          .join("; ")
      : undefined;
    return { ok: false, error: detail || `Square declined the payment (${res.status}).` };
  }

  return {
    ok: true,
    paymentId: data.payment.id,
    status: data.payment.status as string,
    receiptUrl: data.payment.receipt_url ?? null,
  };
}

// Square signs webhook deliveries as
// base64(hmac_sha256(signatureKey, notificationUrl + rawBody)) -- the exact
// URL Square was configured to POST to, concatenated with the raw request
// body (not the parsed/re-serialized JSON, which can differ byte-for-byte).
// https://developer.squareup.com/docs/webhooks/step3validate
export function verifySquareWebhookSignature(args: {
  signatureKey: string;
  notificationUrl: string;
  rawBody: string;
  signatureHeader: string | null;
}): boolean {
  if (!args.signatureHeader) return false;

  const hmac = createHmac("sha256", args.signatureKey);
  hmac.update(args.notificationUrl + args.rawBody);
  const expected = hmac.digest("base64");

  const expectedBuf = Buffer.from(expected);
  const receivedBuf = Buffer.from(args.signatureHeader);
  if (expectedBuf.length !== receivedBuf.length) return false;
  return timingSafeEqual(expectedBuf, receivedBuf);
}

// Square's payment.status values -> our narrower payment_status enum.
export function mapSquarePaymentStatus(
  squareStatus: string
): "pending" | "authorized" | "captured" | "failed" {
  switch (squareStatus) {
    case "COMPLETED":
      return "captured";
    case "APPROVED":
      return "authorized";
    case "FAILED":
    case "CANCELED":
      return "failed";
    default:
      return "pending";
  }
}
