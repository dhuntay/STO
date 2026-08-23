import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type CreateOrderBody = {
  savedMealId?: unknown;
};

function generateOrderNumber(): string {
  // Short, human-readable-ish code for the confirmation screen/receipt --
  // uniqueness is enforced by the orders.order_number unique constraint,
  // with a few retries on the rare collision (see the retry loop below).
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Creates a real order (+ its single order_item) from a truck-linked saved
// meal, re-validating live against the truck/menu_item rather than trusting
// whatever was true when the meal was saved -- a truck can close, or an
// item can sell out, between "Add a saved meal" and the swipe. This is the
// prerequisite for the Square charge in /api/payments/square: Square needs
// a real order to attach a payment to (order_items.menu_item_id is a
// not-null FK -- see 0005_create_food_truck_platform_schema.sql).
//
// The response also carries the truck's public Square config (application
// id, location id, environment, whether it's connected at all) so
// SquarePaymentModal can initialize the Web Payments SDK from this same
// call, instead of a second round trip.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let body: CreateOrderBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const savedMealId = typeof body.savedMealId === "string" ? body.savedMealId : "";
  if (!savedMealId) {
    return NextResponse.json({ error: "Missing savedMealId." }, { status: 400 });
  }

  const { data: meal, error: mealError } = await supabase
    .from("saved_meals")
    .select("id, truck_id, menu_item_id, user_id")
    .eq("id", savedMealId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (mealError) {
    return NextResponse.json({ error: mealError.message }, { status: 500 });
  }
  if (!meal || !meal.truck_id || !meal.menu_item_id) {
    return NextResponse.json(
      { error: "This meal isn't linked to a food truck order." },
      { status: 400 }
    );
  }

  const { data: truck, error: truckError } = await supabase
    .from("trucks")
    .select(
      "id, is_active, is_open, accepting_pickup, pos_connected, " +
        "square_application_id, square_location_id, square_environment"
    )
    .eq("id", meal.truck_id)
    .maybeSingle();

  if (truckError) {
    return NextResponse.json({ error: truckError.message }, { status: 500 });
  }
  if (!truck || !truck.is_active || !truck.is_open || !truck.accepting_pickup) {
    return NextResponse.json(
      { error: "This truck isn't accepting orders right now." },
      { status: 409 }
    );
  }

  const { data: item, error: itemError } = await supabase
    .from("menu_items")
    .select("id, name, price, is_available_today, is_sold_out")
    .eq("id", meal.menu_item_id)
    .eq("truck_id", meal.truck_id)
    .maybeSingle();

  if (itemError) {
    return NextResponse.json({ error: itemError.message }, { status: 500 });
  }
  if (!item || !item.is_available_today || item.is_sold_out) {
    return NextResponse.json(
      { error: "This item isn't available right now." },
      { status: 409 }
    );
  }

  const price = Number(item.price);
  // No separate tax line item yet -- prices throughout the app are entered
  // and shown as "total, incl. tax" (see AddMealForm.tsx), so tax stays 0
  // rather than double-counting.
  const total = price;

  let order: { id: string; order_number: string } | null = null;
  let lastError: string | null = null;

  for (let attempt = 0; attempt < 5 && !order; attempt++) {
    const { data, error } = await supabase
      .from("orders")
      .insert({
        customer_id: user.id,
        truck_id: meal.truck_id,
        status: "created",
        subtotal: price,
        tax: 0,
        total,
        order_number: generateOrderNumber(),
      })
      .select("id, order_number")
      .single();

    if (!error) {
      order = data;
      break;
    }
    // 23505 = unique_violation; only worth retrying that specific case.
    if (error.code !== "23505") {
      lastError = error.message;
      break;
    }
    lastError = error.message;
  }

  if (!order) {
    return NextResponse.json(
      { error: lastError ?? "Couldn't create the order." },
      { status: 500 }
    );
  }

  const { error: itemInsertError } = await supabase.from("order_items").insert({
    order_id: order.id,
    menu_item_id: item.id,
    quantity: 1,
    price_at_order: price,
    name_at_order: item.name,
  });

  if (itemInsertError) {
    return NextResponse.json({ error: itemInsertError.message }, { status: 500 });
  }

  return NextResponse.json({
    orderId: order.id,
    orderNumber: order.order_number,
    total,
    truckId: meal.truck_id,
    square: {
      connected: truck.pos_connected,
      applicationId: truck.square_application_id,
      locationId: truck.square_location_id,
      environment: truck.square_environment === "production" ? "production" : "sandbox",
    },
  });
}
