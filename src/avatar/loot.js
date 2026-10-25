import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient.js";
import { addSave, applySaves, confirmSave, dropSave, settleSaves } from "./outfitSaves.js";

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
// What's loaded is kept with the id it belongs to, so switching players
// shows "loading" rather than the previous player's outfit.
const NO_OUTFIT = { outfit: null, names: new Map(), loading: false };
const LOADING_OUTFIT = { outfit: null, names: new Map(), loading: true };
export function usePlayerOutfit(playerId) {
  const v = useLootVersion();
  const [state, setState] = useState({ forId: null, outfit: null, names: new Map() });

  useEffect(() => {
    if (!isSupabaseConfigured || !playerId) return undefined;
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
      if (!cancelled) setState({ forId: playerId, outfit: outfit || null, names });
    })();
    return () => {
      cancelled = true;
    };
  }, [playerId, v]);

  if (!isSupabaseConfigured || !playerId) return NO_OUTFIT;
  if (state.forId !== playerId) return LOADING_OUTFIT;
  return { outfit: state.outfit, names: state.names, loading: false };
}

// The signed-in player's own tokens, items and outfit.
// items: [{ key, name, slot, tier, isNew }], newest first.
// The outfit is what was last fetched with the Locker's unconfirmed changes
// on top (see outfitSaves.js); wear() and changeLook() make a change, show
// it at once and save it, one save after another so the last tap wins. They
// reject if that save failed (its change is then undone on screen).
export function useMyLoot(userId) {
  const v = useLootVersion();
  // What's loaded is kept with the id it belongs to (see usePlayerOutfit).
  const [state, setState] = useState({ forId: null, tokens: null, items: [], outfit: null, error: "" });
  const [saves, setSaves] = useState([]);
  const fetchCount = useRef(0);
  const saveCount = useRef(0);
  const queue = useRef(Promise.resolve());

  useEffect(() => {
    if (!isSupabaseConfigured || !userId) return undefined;
    let cancelled = false;
    const seq = ++fetchCount.current;
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
      if (failed) {
        console.error("Failed to load tokens/items:", failed);
        // A failed refresh keeps what's already on screen.
        setState((s) => (s.forId === userId ? s : { forId: userId, tokens: null, items: [], outfit: null, error: "Couldn't load your items. Try again." }));
        return;
      }
      setState({
        forId: userId,
        tokens: tokens.data?.balance ?? null,
        items: (items.data || []).map((r) => ({ key: r.item_key, ...r.cosmetic_items, isNew: !r.seen_at })),
        outfit: outfit.data || null,
        error: "",
      });
      setSaves((list) => settleSaves(list, seq));
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, v]);

  const save = useCallback(
    (change, fn, args) => {
      const id = ++saveCount.current;
      setSaves((list) => addSave(list, id, change, userId));
      const run = queue.current.then(() => call(fn, args));
      queue.current = run.catch(() => {});
      return run.then(
        () => {
          // The next fetch to start includes this change.
          const from = fetchCount.current + 1;
          setSaves((list) => confirmSave(list, id, from));
          lootChanged();
        },
        (err) => {
          setSaves((list) => dropSave(list, id));
          lootChanged();
          throw err;
        },
      );
    },
    [userId],
  );
  // Wear something (key) or take the slot off (null; slot "transformation"
  // means "Back to my outfit").
  const wear = useCallback(
    (slot, key) => save((o) => outfitAfter(o, slot, key), key ? "equip_item" : "unequip", key ? { p_key: key } : { p_slot: slot }),
    [save],
  );
  // Avatar 1 or 2 and skin color 1-4 (free, migration 20261024230000).
  const changeLook = useCallback(
    (avatar, skin) => save((o) => ({ ...o, avatar, skin }), "set_look", { p_avatar: avatar, p_skin: skin }),
    [save],
  );

  const current = state.forId === userId;
  const outfit = useMemo(
    () => (current ? applySaves(state.outfit, saves.filter((s) => s.userId === userId)) : null),
    [current, state.outfit, saves, userId],
  );

  if (!isSupabaseConfigured || !userId) return { tokens: null, items: [], outfit: null, loading: false, error: "", wear, changeLook };
  if (!current) return { tokens: null, items: [], outfit: null, loading: true, error: "", wear, changeLook };
  return { tokens: state.tokens, items: state.items, outfit, loading: false, error: state.error, wear, changeLook };
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
// The Cauldron's "Wear it" (the Locker uses useMyLoot's wear()).
export async function equipItem(key) {
  await call("equip_item", { p_key: key });
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
