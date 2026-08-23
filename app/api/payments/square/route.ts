import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createSquarePayment, mapSquarePaymentStatus } from "@/lib/square";

type ChargeBody = {
  orderId?: unknown;
  sourceId?: unknown;
};

const TERMINAL_PAID_STATUSES = new Set([
  "paid",
  "accepted",
  "preparing",
  "ready",
  "picked_up",
]);

// Charges the order created by POST /api/orders. This is the second half of
// the "one swipe = wallet auth = payment authorization" flow: the swipe
// gesture completes -> AuthModal is swapped for SquarePaymentModal for
// truck-linked meals -> the wallet/card token that comes back from
// tokenize() is posted here.
//
// All reads/writes of orders/payments go through the admin (service-role)
// client rather than the request-scoped one: neither table has a
// client-facing policy for the columns this route needs to touch (orders.
// status, payments.* -- see 0005 migration and the payments table comment:
// "a payment's status should only ever be written by a trusted server
// context"). Ownership is instead verified by hand below, by comparing
// order.customer_id to the authenticated user id.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let body: ChargeBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const orderId = typeof body.orderId === "string" ? body.orderId : "";
  const sourceId = typeof body.sourceId === "string" ? body.sourceId : "";
  if (!orderId || !sourceId) {
    return NextResponse.json({ error: "Missing orderId or sourceId." }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: order, error: orderError } = await admin
    .from("orders")
    .select("id, customer_id, truck_id, total, status")
    .eq("id", orderId)
    .maybeSingle();

  if (orderError) {
    return NextResponse.json({ error: orderError.message }, { status: 500 });
  }
  if (!order || order.customer_id !== user.id) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  if (TERMINAL_PAID_STATUSES.has(order.status)) {
    // Already paid -- most likely a retried/duplicate submit (e.g. the
    // customer's connection dropped after Square accepted the charge but
    // before the response reached them). Treat as success instead of
    // double-charging or bouncing them to an error screen.
    return NextResponse.json({ orderId: order.id, status: order.status, alreadyPaid: true });
  }
  if (order.status === "cancelled_refunded") {
    return NextResponse.json({ error: "This order was cancelled." }, { status: 409 });
  }

  const { data: connection, error: connectionError } = await admin
    .from("truck_pos_connections")
    .select("environment, access_token, location_id")
    .eq("truck_id", order.truck_id)
    .eq("provider", "square")
    .maybeSingle();

  if (connectionError) {
    return NextResponse.json({ error: connectionError.message }, { status: 500 });
  }
  if (!connection) {
    return NextResponse.json(
      { error: "This truck hasn't connected Square yet." },
      { status: 409 }
    );
  }

  // Mark the attempt in-flight before calling out to Square. If the
  // customer's tab dies between here and the payments insert below, the
  // order is left at payment_pending (not silently reverted to "created")
  // -- a clear, retry-safe signal, since idempotencyKey is stable on
  // order.id and Square itself will just return the original payment for a
  // repeated call with the same key.
  await admin.from("orders").update({ status: "payment_pending" }).eq("id", order.id);

  const result = await createSquarePayment(
    {
      environment: connection.environment === "production" ? "production" : "sandbox",
      accessToken: connection.access_token,
      locationId: connection.location_id,
    },
    {
      sourceId,
      idempotencyKey: order.id,
      amount: Number(order.total),
    }
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 402 });
  }

  const paymentStatus = mapSquarePaymentStatus(result.status);

  const { error: paymentInsertError } = await admin.from("payments").insert({
    order_id: order.id,
    provider: "square",
    provider_payment_id: result.paymentId,
    status: paymentStatus,
    amount: order.total,
  });

  if (paymentInsertError) {
    return NextResponse.json({ error: paymentInsertError.message }, { status: 500 });
  }

  const newOrderStatus =
    paymentStatus === "captured" || paymentStatus === "authorized" ? "paid" : "payment_pending";

  await admin.from("orders").update({ status: newOrderStatus }).eq("id", order.id);

  return NextResponse.json({
    orderId: order.id,
    status: newOrderStatus,
    paymentId: result.paymentId,
    receiptUrl: result.receiptUrl,
  });
}
