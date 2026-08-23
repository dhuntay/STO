// Shared client-side helpers for Square's Web Payments SDK, used by
// useSquareWallet to pre-warm Apple Pay/Google Pay ahead of the swipe (see
// that file for why pre-warming is necessary). SquarePaymentModal.tsx has
// its own copy of the equivalent types/loader rather than importing this --
// that file is the already-working card-fallback path, and keeping it
// self-contained means changes here can't affect it.
export type SquarePaymentMethod = {
  attach: (selector: string) => Promise<void>;
  tokenize: () => Promise<{ status: string; token?: string; errors?: { message: string }[] }>;
  destroy: () => Promise<void>;
};

export type SquarePayments = {
  card: () => Promise<SquarePaymentMethod>;
  applePay: (request: unknown) => Promise<SquarePaymentMethod>;
  googlePay: (request: unknown) => Promise<SquarePaymentMethod>;
  paymentRequest: (options: Record<string, unknown>) => unknown;
};

type SquareGlobal = {
  payments: (applicationId: string, locationId: string) => Promise<SquarePayments>;
};

function readSquareGlobal(): SquareGlobal | undefined {
  return (window as unknown as { Square?: SquareGlobal }).Square;
}

function sdkUrl(environment: "sandbox" | "production"): string {
  return environment === "production"
    ? "https://web.squarecdn.com/v1/square.js"
    : "https://sandbox.web.squarecdn.com/v1/square.js";
}

// Loads the Web Payments SDK script at most once per page.
function loadSquareScript(environment: "sandbox" | "production"): Promise<void> {
  if (readSquareGlobal()) return Promise.resolve();

  const existing = document.querySelector<HTMLScriptElement>("script[data-square-sdk]");
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Failed to load Square.")));
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = sdkUrl(environment);
    script.dataset.squareSdk = "true";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Square."));
    document.head.appendChild(script);
  });
}

// Loads the SDK (if needed) and returns the payments client for a given
// truck's Square config.
export async function getSquarePayments(
  environment: "sandbox" | "production",
  applicationId: string,
  locationId: string
): Promise<SquarePayments> {
  await loadSquareScript(environment);
  const square = readSquareGlobal();
  if (!square) throw new Error("Failed to load Square.");
  return square.payments(applicationId, locationId);
}
