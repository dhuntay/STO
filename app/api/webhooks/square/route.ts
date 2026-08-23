import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifySquareWebhookSignature, mapSquarePaymentStatus } from "@/lib/square";

// Reconciles payment status changes Square reports asynchronously (e.g. an
// APPROVED payment later settling to COMPLETED, or a card getting declined
// after the synchronous /api/payments/square call already returned
// "pending"). Registered per-truck in Square's dashboard as
// https://sto-ebon.vercel.app/api/webhooks/square?truckId=<truck id>, which
// is also why truckId has to be part of the signed URL below -- Square
// signs over the *exact* URL it was configured to call.
//
// Square requires this endpoint to exist and respond correctly before a
// truck owner can finish setting up a webhook subscription, so this route
// has to ship today even though it can't be truly exercised until the
// owner has real Square credentials and a public deployment to point at.
export async function POST(request: Request) {
  const truckId = new URL(request.url).searchParams.get("truckId");
  if (!truckId) {
    return NextResponse.json({ error: "Missing truckId." }, { status: 400 });
  }

  // Signature verification needs the raw, unparsed body -- reading it as
  // JSON first and re-serializing can produce different bytes (key order,
  // whitespace) and silently break every signature check.
  const rawBody = await request.text();
  const signatureHeader = request.headers.get("x-square-hmacsha256-signature");

  const admin = createAdminClient();

  const { data: connection, error: connectionError } = await admin
    .from("truck_pos_connections")
    .select("webhook_signature_key")
    .eq("truck_id", truckId)
    .eq("provider", "square")
    .maybeSingle();

  if (connectionError) {
    return NextResponse.json({ error: connectionError.message }, { status: 500 });
  }
  if (!connection?.webhook_signature_key) {
    // No signing key on file yet (owner hasn't finished connecting the
    // webhook in Square's dashboard) -- nothing we can safely verify
    // against, so reject rather than trust an unverified payload.
    return NextResponse.json({ error: "Webhook not configured for this truck." }, { status: 401 });
  }

  const valid = verifySquareWebhookSignature({
    signatureKey: connection.webhook_signature_key,
    notificationUrl: request.url,
    rawBody,
    signatureHeader,
  });

  if (!valid) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  const payload = JSON.parse(rawBody) as {
    type?: string;
    data?: { object?: { payment?: { id?: string; status?: string } } };
  };

  const payment = payload.data?.object?.payment;
  if (!payment?.id || !payment.status) {
    // Not a payment event (or a shape we don't recognize) -- ack it so
    // Square doesn't retry something we were never going to act on.
    return NextResponse.json({ ok: true, ignored: true });
  }

  const paymentStatus = mapSquarePaymentStatus(payment.status);

  const { data: paymentRow, error: paymentLookupError } = await admin
    .from("payments")
    .select("id, order_id, status")
    .eq("provider_payment_id", payment.id)
    .maybeSingle();

  if (paymentLookupError) {
    return NextResponse.json({ error: paymentLookupError.message }, { status: 500 });
  }
  if (!paymentRow) {
    // A payment we don't have a row for -- most likely from a different
    // truck/connection reusing the same signing key by mistake, or a
    // delivery for a payment created outside this flow. Ack without acting.
    return NextResponse.json({ ok: true, ignored: true });
  }

  await admin.from("payments").update({ status: paymentStatus }).eq("id", paymentRow.id);

  const { data: orderRow } = await admin
    .from("orders")
    .select("id, status")
    .eq("id", paymentRow.order_id)
    .maybeSingle();

  if (orderRow) {
    if (
      (paymentStatus === "captured" || paymentStatus === "authorized") &&
      (orderRow.status === "payment_pending" || orderRow.status === "created")
    ) {
      await admin.from("orders").update({ status: "paid" }).eq("id", orderRow.id);
    } else if (
      paymentStatus === "failed" &&
      (orderRow.status === "payment_pending" || orderRow.status === "created")
    ) {
      // Bounce back to "created" so the customer can retry the swipe --
      // there's no dedicated "payment failed" order status in the enum,
      // and re-attempting is exactly what should happen next.
      await admin.from("orders").update({ status: "created" }).eq("id", orderRow.id);
    }
  }

  return NextResponse.json({ ok: true });
}
