import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient.js";

// Tokens, owned items and outfits (migration 20261024200000; how they work
// is in README "Tokens"). Everything that changes them goes through the
// database functions, which check who's calling.

export const TIERS = ["common", "rare", "epic", "legendary"];
export const TIER_LABEL = { common: "Common", rare: "Rare", epic: "Epic", legendary: "Legendary" };
// Same tier colors as the design pages.
export const TIER_COLOR = { common: "#c9c2d9", rare: "#4fb2ff", epic: "#c46bff", legendary: "#ffc53a" };

// Bumped after a brew or an outfit change, so every screen showing tokens or
// outfits refetches (e.g. the profile card under the Locker).
let version = 0;
const listeners = new Set();
function lootChanged() {
  version += 1;
  for (const fn of listeners) fn();
}
function useLootVersion() {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => version,
  );
}

const OUTFIT_COLUMNS = "head, shirt, pants, shoes, transformation, avatar, skin";
const outfitKeys = (o) => (o ? [o.head, o.shirt, o.pants, o.shoes, o.transformation].filter(Boolean) : []);

// Anyone's outfit (outfits are public) with the names of what they wear:
// { outfit: { head, shirt, ... } | null, names: Map key -> { name, tier }, loading }.
export function usePlayerOutfit(playerId) {
  const v = useLootVersion();
  const [state, setState] = useState({ outfit: null, names: new Map(), loading: true });

  useEffect(() => {
    if (!isSupabaseConfigured || !playerId) {
      setState({ outfit: null, names: new Map(), loading: false });
      return undefined;
    }
    let cancelled = false;
    (async () => {
      const { data: outfit, error } = await supabase.from("player_outfits").select(OUTFIT_COLUMNS).eq("player_id", playerId).maybeSingle();
      if (error) console.error("Failed to load outfit:", error);
      const keys = outfitKeys(outfit);
      let names = new Map();
      if (keys.length) {
        const { data: rows, error: namesError } = await supabase.from("cosmetic_items").select("key, name, tier").in("key", keys);
        if (namesError) console.error("Failed to load item names:", namesError);
        names = new Map((rows || []).map((r) => [r.key, r]));
      }
      if (!cancelled) setState({ outfit: outfit || null, names, loading: false });
    })();
    return () => {
      cancelled = true;
    };
  }, [playerId, v]);

  return state;
}

// The signed-in player's own tokens, items and outfit.
// items: [{ key, name, slot, tier, isNew }], newest first.
export function useMyLoot(userId) {
  const v = useLootVersion();
  const [state, setState] = useState({ tokens: null, items: [], outfit: null, loading: true, error: "" });

  useEffect(() => {
    if (!isSupabaseConfigured || !userId) {
      setState({ tokens: null, items: [], outfit: null, loading: false, error: "" });
      return undefined;
    }
    let cancelled = false;
    (async () => {
      const [tokens, items, outfit] = await Promise.all([
        supabase.rpc("my_tokens"),
        supabase
          .from("player_items")
          .select("item_key, obtained_at, seen_at, cosmetic_items(name, slot, tier)")
          .eq("player_id", userId)
          .order("obtained_at", { ascending: false }),
        supabase.from("player_outfits").select(OUTFIT_COLUMNS).eq("player_id", userId).maybeSingle(),
      ]);
      if (cancelled) return;
      const failed = tokens.error || items.error || outfit.error;
      if (failed) console.error("Failed to load tokens/items:", failed);
      setState({
        tokens: tokens.data?.balance ?? null,
        items: (items.data || []).map((r) => ({ key: r.item_key, ...r.cosmetic_items, isNew: !r.seen_at })),
        outfit: outfit.data || null,
        loading: false,
        error: failed ? "Couldn't load your items. Try again." : "",
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, v]);

  // For instant feedback before the database confirms (the Locker).
  const setOutfit = useCallback((outfit) => setState((s) => ({ ...s, outfit })), []);
  return { ...state, setOutfit };
}

async function call(fn, args) {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw error;
  return data;
}

// One pull: { key, slot, tier, name, balance }. Throws with the database's
// own message ("You need a token to brew…", "There's nothing left…").
export async function brew() {
  const result = await call("brew");
  lootChanged();
  return result;
}
export async function equipItem(key) {
  await call("equip_item", { p_key: key });
  lootChanged();
}
// slot "transformation" means "Back to my outfit".
export async function unequip(slot) {
  await call("unequip", { p_slot: slot });
  lootChanged();
}
// Avatar 1 or 2 and skin color 1-4 (free, migration 20261024230000).
export async function setLook(avatar, skin) {
  await call("set_look", { p_avatar: avatar, p_skin: skin });
  lootChanged();
}
export async function markItemsSeen() {
  await call("mark_items_seen");
  lootChanged();
}

// What the outfit looks like after wearing (or, with key null, taking off)
// something, by the same rules as equip_item/unequip: clothing takes off a
// transformation; a transformation covers the clothes, which stay saved.
export function outfitAfter(outfit, slot, key) {
  const next = { head: null, shirt: null, pants: null, shoes: null, transformation: null, ...outfit };
  next[slot] = key;
  if (slot !== "transformation" && key) next.transformation = null;
  return next;
}
