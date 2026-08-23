"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  Truck,
  TruckRow,
  MenuItem,
  MenuItemRow,
  mapTruckRow,
  mapMenuItemRow,
  formatCurrency,
} from "@/lib/trucks";

type Props = {
  truck: Truck;
};

const TRUCK_COLUMNS =
  "id, name, cuisine, description, photo_url, current_location_label, " +
  "current_lat, current_lng, opens_at, closes_at, is_open, accepting_pickup, " +
  "menu_items(id, truck_id, name, price, main_ingredients, photo_url, is_available_today, is_sold_out)";

const MENU_ITEM_COLUMNS =
  "id, truck_id, name, price, main_ingredients, photo_url, is_available_today, is_sold_out";

type SaveResult = { ok: true } | { ok: false; message: string };

// The truck's control surface (context doc Section 5). Each card below is
// one of the six MVP controls: Truck (profile), Today's location,
// Operating hours, Menu item creation, Menu available today, Sold out --
// plus Pickup availability. Single-boolean controls (is_open,
// accepting_pickup, per-item available/sold-out) save immediately on
// click, matching the "real-time" toggle language in the spec; multi-field
// sections (profile, location, hours) use an explicit Save so a half-typed
// edit is never sent field-by-field.
export default function OperatorDashboard({ truck: initialTruck }: Props) {
  const [truck, setTruck] = useState(initialTruck);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  async function saveTruckPatch(
    patch: Record<string, unknown>
  ): Promise<SaveResult> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("trucks")
      .update(patch)
      .eq("id", truck.id)
      .select(TRUCK_COLUMNS)
      .single();

    if (error) return { ok: false, message: error.message };

    setTruck(
      mapTruckRow(data as unknown as TruckRow & { menu_items: MenuItemRow[] })
    );
    return { ok: true };
  }

  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-y-auto bg-zinc-50 px-4 pb-10 pt-3 sm:px-6">
      <header className="flex flex-shrink-0 items-center justify-between pb-4">
        <div>
          <Link
            href="/"
            className="text-sm font-medium text-zinc-400 hover:text-zinc-600"
          >
            &larr; Back
          </Link>
          <h1 className="mt-1 text-lg font-bold tracking-tight text-zinc-900">
            {truck.name}
          </h1>
        </div>
        <Link
          href={`/trucks/${truck.id}`}
          className="text-xs font-medium text-zinc-500 underline-offset-2 hover:text-zinc-900 hover:underline"
        >
          View your live listing &rarr;
        </Link>
      </header>

      <div className="mb-4 flex flex-shrink-0 flex-wrap gap-2">
        <StatusBadge active={truck.isOpen} onLabel="Open" offLabel="Closed" />
        <StatusBadge
          active={truck.acceptingPickup}
          onLabel="Accepting pickup"
          offLabel="Not accepting pickup"
        />
      </div>

      {dashboardError && (
        <p className="mb-4 flex-shrink-0 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {dashboardError}
        </p>
      )}

      <div className="flex flex-col gap-4 pb-4">
        <TruckProfileCard truck={truck} saveTruckPatch={saveTruckPatch} />
        <LocationCard truck={truck} saveTruckPatch={saveTruckPatch} />
        <HoursCard
          truck={truck}
          saveTruckPatch={saveTruckPatch}
          setDashboardError={setDashboardError}
        />
        <PickupCard
          truck={truck}
          saveTruckPatch={saveTruckPatch}
          setDashboardError={setDashboardError}
        />
        <MenuItemsCard truck={truck} setTruck={setTruck} />
      </div>
    </div>
  );
}

function StatusBadge({
  active,
  onLabel,
  offLabel,
}: {
  active: boolean;
  onLabel: string;
  offLabel: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
        active ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-500"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          active ? "bg-emerald-500" : "bg-zinc-400"
        }`}
      />
      {active ? onLabel : offLabel}
    </span>
  );
}

function Toggle({
  checked,
  onClick,
  label,
}: {
  checked: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={checked}
      className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
        checked
          ? "border-zinc-900 bg-zinc-900 text-white"
          : "border-zinc-300 bg-white text-zinc-600"
      }`}
    >
      <span
        className={`h-2 w-2 rounded-full ${
          checked ? "bg-emerald-400" : "bg-zinc-300"
        }`}
      />
      {label}
    </button>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5">
      <h2 className="mb-3 text-sm font-semibold text-zinc-900">{title}</h2>
      {children}
    </section>
  );
}

function SavedFlash({ show }: { show: boolean }) {
  if (!show) return null;
  return <span className="text-xs font-medium text-emerald-600">Saved</span>;
}

function useFlash(): [boolean, () => void] {
  const [show, setShow] = useState(false);
  function flash() {
    setShow(true);
    setTimeout(() => setShow(false), 2000);
  }
  return [show, flash];
}

// --- Truck profile ---------------------------------------------------

function TruckProfileCard({
  truck,
  saveTruckPatch,
}: {
  truck: Truck;
  saveTruckPatch: (patch: Record<string, unknown>) => Promise<SaveResult>;
}) {
  const [name, setName] = useState(truck.name);
  const [cuisine, setCuisine] = useState(truck.cuisine ?? "");
  const [description, setDescription] = useState(truck.description ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, flash] = useFlash();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Enter a truck name.");
      return;
    }
    setSaving(true);
    const result = await saveTruckPatch({
      name: name.trim(),
      cuisine: cuisine.trim() || null,
      description: description.trim() || null,
    });
    setSaving(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    flash();
  }

  return (
    <Card title="Truck">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-600">
            Truck name
          </label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-600">
            Cuisine
          </label>
          <input
            value={cuisine}
            onChange={(e) => setCuisine(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-600">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full resize-none rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none"
          />
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-zinc-900 px-4 py-2 text-xs font-semibold text-white transition disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <SavedFlash show={saved} />
        </div>
      </form>
    </Card>
  );
}

// --- Today's location --------------------------------------------------

function LocationCard({
  truck,
  saveTruckPatch,
}: {
  truck: Truck;
  saveTruckPatch: (patch: Record<string, unknown>) => Promise<SaveResult>;
}) {
  const [locationLabel, setLocationLabel] = useState(truck.locationLabel ?? "");
  const [lat, setLat] = useState(truck.lat?.toString() ?? "");
  const [lng, setLng] = useState(truck.lng?.toString() ?? "");
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, flash] = useFlash();

  function handleUseCurrentLocation() {
    if (!("geolocation" in navigator)) {
      setError("Location isn't available in this browser.");
      return;
    }
    setError(null);
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toString());
        setLng(pos.coords.longitude.toString());
        setLocating(false);
      },
      () => {
        setError(
          "Couldn't get your location — check the browser's location permission, or enter it manually below."
        );
        setLocating(false);
      },
      { timeout: 8000 }
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsedLat = lat.trim() === "" ? null : Number(lat);
    const parsedLng = lng.trim() === "" ? null : Number(lng);
    if (
      (parsedLat !== null && !Number.isFinite(parsedLat)) ||
      (parsedLng !== null && !Number.isFinite(parsedLng))
    ) {
      setError("Latitude and longitude must be numbers.");
      return;
    }

    setSaving(true);
    const result = await saveTruckPatch({
      current_location_label: locationLabel.trim() || null,
      current_lat: parsedLat,
      current_lng: parsedLng,
    });
    setSaving(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    flash();
  }

  return (
    <Card title="Today's location">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-600">
            Where you're parked
          </label>
          <input
            value={locationLabel}
            onChange={(e) => setLocationLabel(e.target.value)}
            placeholder="Corner of 5th & Main"
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none"
          />
          <p className="mt-1 text-[11px] text-zinc-400">
            Shown to customers browsing nearby trucks.
          </p>
        </div>

        <button
          type="button"
          onClick={handleUseCurrentLocation}
          disabled={locating}
          className="self-start rounded-full border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:border-zinc-900 disabled:opacity-50"
        >
          {locating ? "Locating…" : "Use my current location"}
        </button>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600">
              Latitude
            </label>
            <input
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              inputMode="decimal"
              placeholder="—"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600">
              Longitude
            </label>
            <input
              value={lng}
              onChange={(e) => setLng(e.target.value)}
              inputMode="decimal"
              placeholder="—"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none"
            />
          </div>
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-zinc-900 px-4 py-2 text-xs font-semibold text-white transition disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <SavedFlash show={saved} />
        </div>
      </form>
    </Card>
  );
}

// --- Operating hours -----------------------------------------------------

function HoursCard({
  truck,
  saveTruckPatch,
  setDashboardError,
}: {
  truck: Truck;
  saveTruckPatch: (patch: Record<string, unknown>) => Promise<SaveResult>;
  setDashboardError: (message: string | null) => void;
}) {
  const [opensAt, setOpensAt] = useState(truck.opensAt ?? "");
  const [closesAt, setClosesAt] = useState(truck.closesAt ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, flash] = useFlash();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const result = await saveTruckPatch({
      opens_at: opensAt || null,
      closes_at: closesAt || null,
    });
    setSaving(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    flash();
  }

  async function handleToggleOpen() {
    setDashboardError(null);
    const result = await saveTruckPatch({ is_open: !truck.isOpen });
    if (!result.ok) setDashboardError(result.message);
  }

  return (
    <Card title="Operating hours">
      <div className="mb-3">
        <Toggle
          checked={truck.isOpen}
          onClick={handleToggleOpen}
          label={truck.isOpen ? "Open for orders" : "Closed"}
        />
        <p className="mt-1.5 text-[11px] text-zinc-400">
          This overrides the hours below — flip it off any time to close
          early or mark the truck closed for the day, or on to open early.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600">
              Opens
            </label>
            <input
              type="time"
              value={opensAt}
              onChange={(e) => setOpensAt(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600">
              Closes
            </label>
            <input
              type="time"
              value={closesAt}
              onChange={(e) => setClosesAt(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none"
            />
          </div>
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-zinc-900 px-4 py-2 text-xs font-semibold text-white transition disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <SavedFlash show={saved} />
        </div>
      </form>
    </Card>
  );
}

// --- Pickup availability -----------------------------------------------

function PickupCard({
  truck,
  saveTruckPatch,
  setDashboardError,
}: {
  truck: Truck;
  saveTruckPatch: (patch: Record<string, unknown>) => Promise<SaveResult>;
  setDashboardError: (message: string | null) => void;
}) {
  async function handleToggle() {
    setDashboardError(null);
    const result = await saveTruckPatch({
      accepting_pickup: !truck.acceptingPickup,
    });
    if (!result.ok) setDashboardError(result.message);
  }

  return (
    <Card title="Pickup availability">
      <Toggle
        checked={truck.acceptingPickup}
        onClick={handleToggle}
        label={
          truck.acceptingPickup ? "Accepting pickup orders" : "Not accepting orders"
        }
      />
      <p className="mt-1.5 text-[11px] text-zinc-400">
        Independent of your hours and location — pause new orders any time
        without changing anything else (e.g. the kitchen is backed up).
      </p>
    </Card>
  );
}

// --- Menu items ----------------------------------------------------------

function MenuItemsCard({
  truck,
  setTruck,
}: {
  truck: Truck;
  setTruck: React.Dispatch<React.SetStateAction<Truck>>;
}) {
  const [itemName, setItemName] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [itemIngredients, setItemIngredients] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!itemName.trim()) {
      setError("Enter an item name.");
      return;
    }
    const price = Number(itemPrice);
    if (!Number.isFinite(price) || price < 0) {
      setError("Enter a valid price.");
      return;
    }
    const mainIngredients = itemIngredients
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    // Required, not just suggested: the customer's "Add a saved meal" form
    // shows this straight from the menu item with no way to leave it blank
    // (it's meant to be the truck's real ingredient list, not something the
    // customer types themselves) -- so an item saved without any here would
    // strand a customer who picks it. See AddMealForm.tsx.
    if (mainIngredients.length === 0) {
      setError("List at least one main ingredient.");
      return;
    }

    setAdding(true);
    const supabase = createClient();
    const { data, error: insertError } = await supabase
      .from("menu_items")
      .insert({
        truck_id: truck.id,
        name: itemName.trim(),
        price,
        main_ingredients: mainIngredients,
      })
      .select(MENU_ITEM_COLUMNS)
      .single();
    setAdding(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setTruck((prev) => ({
      ...prev,
      menuItems: [...prev.menuItems, mapMenuItemRow(data as MenuItemRow)],
    }));
    setItemName("");
    setItemPrice("");
    setItemIngredients("");
  }

  async function toggleItemField(
    itemId: string,
    field: "is_available_today" | "is_sold_out",
    value: boolean
  ) {
    setError(null);
    const supabase = createClient();
    const { data, error: updateError } = await supabase
      .from("menu_items")
      .update({ [field]: value })
      .eq("id", itemId)
      .select(MENU_ITEM_COLUMNS)
      .single();

    if (updateError) {
      setError(updateError.message);
      return;
    }

    const updated = mapMenuItemRow(data as MenuItemRow);
    setTruck((prev) => ({
      ...prev,
      menuItems: prev.menuItems.map((item) =>
        item.id === itemId ? updated : item
      ),
    }));
  }

  async function handleRemoveItem(itemId: string) {
    setError(null);
    const supabase = createClient();
    const { error: deleteError } = await supabase
      .from("menu_items")
      .delete()
      .eq("id", itemId);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setTruck((prev) => ({
      ...prev,
      menuItems: prev.menuItems.filter((item) => item.id !== itemId),
    }));
    setConfirmRemoveId(null);
  }

  return (
    <Card title="Menu items">
      {truck.menuItems.length === 0 ? (
        <p className="mb-3 text-xs text-zinc-400">
          No items yet — add your first one below.
        </p>
      ) : (
        <ul className="mb-4 flex flex-col gap-2">
          {truck.menuItems.map((item: MenuItem) => (
            <li
              key={item.id}
              className="rounded-xl border border-zinc-200 p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-zinc-900">
                    {item.name}
                  </p>
                  {item.mainIngredients.length > 0 ? (
                    <p className="truncate text-xs text-zinc-500">
                      {item.mainIngredients.join(", ")}
                    </p>
                  ) : (
                    <p className="truncate text-xs text-amber-600">
                      No ingredients listed — remove and re-add to fix.
                    </p>
                  )}
                </div>
                <span className="flex-shrink-0 text-sm font-semibold text-zinc-900">
                  {formatCurrency(item.price)}
                </span>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Toggle
                  checked={item.isAvailableToday}
                  onClick={() =>
                    toggleItemField(
                      item.id,
                      "is_available_today",
                      !item.isAvailableToday
                    )
                  }
                  label={item.isAvailableToday ? "Available today" : "Off menu today"}
                />
                <Toggle
                  checked={item.isSoldOut}
                  onClick={() =>
                    toggleItemField(item.id, "is_sold_out", !item.isSoldOut)
                  }
                  label={item.isSoldOut ? "Sold out" : "In stock"}
                />

                {confirmRemoveId === item.id ? (
                  <span className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.id)}
                      className="rounded-full bg-red-600 px-3 py-1.5 text-xs font-medium text-white"
                    >
                      Confirm remove
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmRemoveId(null)}
                      className="rounded-full border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600"
                    >
                      Cancel
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmRemoveId(item.id)}
                    className="ml-auto text-xs font-medium text-zinc-400 hover:text-red-600"
                  >
                    Remove
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <form
        onSubmit={handleAddItem}
        className="flex flex-col gap-3 border-t border-zinc-100 pt-4"
      >
        <p className="text-xs font-medium text-zinc-600">Add a menu item</p>
        <div>
          <input
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            placeholder="Pork Belly Bao"
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <input
            value={itemPrice}
            onChange={(e) => setItemPrice(e.target.value)}
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            placeholder="9.50"
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none"
          />
          <input
            required
            value={itemIngredients}
            onChange={(e) => setItemIngredients(e.target.value)}
            placeholder="Pork belly, scallion, hoisin"
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none"
          />
        </div>
        <p className="text-[11px] text-zinc-400">
          Fixed values, no size/add-on variants for now — separate
          ingredients with commas. Customers see these exactly as typed here,
          so it's required.
        </p>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={adding}
          className="self-start rounded-full bg-zinc-900 px-4 py-2 text-xs font-semibold text-white transition disabled:opacity-50"
        >
          {adding ? "Adding…" : "Add item"}
        </button>
      </form>
    </Card>
  );
}
