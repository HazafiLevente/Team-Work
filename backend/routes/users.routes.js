/**
 * --------------------------------------------------------------------------
 *  USER & SOCIAL ECOSYSTEM ROUTES
 * --------------------------------------------------------------------------
 *  Manages public profiles, user discovery, and complex data enrichment
 *  for user-specific setups and hardware assets.
 */

const router = require("express").Router();
const { supabase } = require("../services/supabase");
const verifyUser = require("../middlewares/verifyUser");
const optionalUser = require("../middlewares/optionalUser");
const { resolveRole } = require("../services/control");

// --- UTILITY HELPERS ---

function pickFirst(row, keys) {
    if (!row || typeof row !== "object") return null;

    for (const key of keys) {
        const foundKey = Object.keys(row).find((candidate) => candidate.toLowerCase() === key.toLowerCase());
        if (!foundKey) continue;

        const value = row[foundKey];
        if (value !== undefined && value !== null && value !== "") return value;
    }

    return null;
}

function toBoolean(value) {
    return value === true || value === "true" || value === 1 || value === "1";
}

function slugifyUserName(value) {
    return String(value || "").trim().replace(/\s+/g, "_").toLowerCase();
}

function unslugUserName(value) {
    return String(value || "").trim().replace(/_/g, " ");
}

function isRegularSetup(setup) {
    const isNote = toBoolean(setup?.isNote ?? setup?.is_note ?? setup?.isnote);
    const setupType = String(setup?.setup_type ?? setup?.type ?? "").trim().toLowerCase();

    // A jegyzeteket mindenképpen kiszűrjük
    if (isNote || setupType === "note") return false;

    // Minden mást (room, plan, favorite, üres) megtartunk, ha nem titkos
    return true;
}

function extractPrice(item) {
    return item?.price
        ?? item?.Price
        ?? item?.price_huf
        ?? item?.["Price Range (Ft)"]
        ?? item?.data?.price
        ?? item?.data?.Price
        ?? item?.data?.price_huf
        ?? item?.data?.["Price Range (Ft)"]
        ?? null;
}

function parsePriceToNumber(raw) {
    if (raw === null || raw === undefined || raw === "") return 0;
    if (typeof raw === "number") return Number.isFinite(raw) ? Math.round(raw) : 0;

    const nums = String(raw)
        .replace(/\u00a0/g, " ")
        .match(/\d+(?:[.,]\d+)?/g);

    if (!nums || nums.length === 0) return 0;

    const parsed = nums
        .map((x) => Number(String(x).replace(",", ".")))
        .filter((n) => Number.isFinite(n));

    if (!parsed.length) return 0;
    if (parsed.length === 1) return Math.round(parsed[0]);

    return Math.round((Math.min(...parsed) + Math.max(...parsed)) / 2);
}

async function buildEavIndexForProducts(productIds) {
    const ids = [...new Set((productIds || []).map((x) => Number(x)).filter(Boolean))];
    if (!ids.length) return new Map();

    const { data: rows, error } = await supabase
        .from("values")
        .select(`products_id, value, properties:properties_id (id, property, type)`)
        .in("products_id", ids);

    if (error) {
        console.error("users.routes: EAV load error:", error.message);
        return new Map();
    }

    const index = new Map(); // productId -> {propName: value}
    for (const row of rows || []) {
        const pid = Number(row?.products_id);
        const propName = String(row?.properties?.property || "").trim();
        if (!pid || !propName) continue;
        if (!index.has(pid)) index.set(pid, {});
        index.get(pid)[propName] = row?.value ?? null;
    }
    return index;
}


// --- DATA ENRICHMENT SERVICES ---

/**
 * Fetches and attaches detailed device information and price calculations to setups.
 */

async function enrichSetupsWithDevices(setups) {
    if (!setups || setups.length === 0) return [];

    const setupIds = (setups || [])
        .map((s) => Number(s?.id ?? s?.ID ?? s?.setup_id ?? s?.setupId ?? 0))
        .filter((id) => Number.isFinite(id) && id > 0);

    if (!setupIds.length) {
        return (setups || []).map((setup) => ({ ...setup, devices: [], totalPrice: 0 }));
    }


    const { data: devices, error: devicesError } = await supabase
        .from("setups")
        .select("*")
        .in("room_id", setupIds);

    if (devicesError) {
        console.error("users.routes: failed to load child setups:", devicesError.message || devicesError);
        return setups;
    }

    const childSetupIds = devices.map(d => d.id);
    

    const { data: deviceConnections, error: connError } = await supabase
        .from("setup_devices")
        // NOTE: not all schemas have `source_table` column here (it's not needed for EAV-based enrichment).
        .select("setup_id, device_id")
        .in("setup_id", childSetupIds);

    if (connError) {
        console.error("users.routes: failed to load setup_devices:", connError.message || connError);
        return setups;
    }


    const productIds = [...new Set((deviceConnections || []).map((c) => Number(c?.device_id)).filter(Boolean))];
    const eavIndex = await buildEavIndexForProducts(productIds);


    return setups.map(setup => {
        const setupDevices = devices.filter(d => d.room_id === setup.id);
        const enrichedDevices = setupDevices.map(d => {
            const conn = deviceConnections.find(c => c.setup_id === d.id);
            const productId = Number(conn?.device_id);
            const valueMap = productId ? (eavIndex.get(productId) || {}) : {};
            const merged = {
                id: productId || null,
                name: d.name,
                type: d.type,
                category: d.category,
                ...valueMap,
                data: valueMap
            };

            return {
                id: d.id,
                name: d.name,
                type: d.type,
                price: productId ? parsePriceToNumber(extractPrice(merged)) : 0,
                manufacturer: String(
                    valueMap?.manufacturer ??
                    valueMap?.Manufacturer ??
                    valueMap?.brand ??
                    valueMap?.Brand ??
                    ""
                ).trim()
            };
        });

        const totalPrice = enrichedDevices.reduce((sum, d) => sum + (Number(d.price) || 0), 0);

        return {
            ...setup,
            devices: enrichedDevices,
            totalPrice
        };
    });
}


/**
 * Filters and prepares public-facing setup information.
 */


async function getPublicSetups(targetUserId, isMe) {
    const { data: setups, error: setupsError } = await supabase
        .from("setup_room")
        .select("*")
        .eq("user_id", targetUserId)
        .order("name", { ascending: true });

    if (setupsError) throw setupsError;

    let mySetups = (setups || []);

    if (!isMe) {

        mySetups = mySetups.filter(s => {
            const isSecret = toBoolean(s.isSecret ?? s.is_secret ?? s.isPrivate ?? s.is_private);
            const isPlan = toBoolean(s.is_plan);
            return !isSecret && isRegularSetup(s) && !isPlan;
        });
        

        mySetups = await enrichSetupsWithDevices(mySetups);
    } else {

        mySetups = mySetups.filter(isRegularSetup);
    }

    return mySetups.map((setup) => ({
        id: setup.id,
        name: setup.name || "Nevtelen setup",
        type: setup.type || setup.setup_type || null,
        category: setup.category || null,
        devices: setup.devices || [],
        totalPrice: setup.totalPrice || 0
    }));
}


// --- PUBLIC ROUTES ---

/**
 * List all users (excluding the current authenticated user)
 */


router.get("/", verifyUser, async (req, res) => {
    const currentUserId = Number(req.user.id);

    const { data, error } = await supabase
        .from("user[Auth]")
        .select("ID, UserName")
        .neq("ID", currentUserId);

    if (error) {
        console.error(error);
        return res.status(500).json({ error: error.message });
    }

    const users = data.map(u => ({
        id: u.ID,
        username: u.UserName
    }));

    res.json(users);
});

/**
 * Fetch detailed user profile and their public setups by slug/username
 */

router.get("/by-name/:name/profile", optionalUser, async (req, res) => {
    try {
        const rawName = req.params.name;
        const readableName = unslugUserName(rawName);
        const requestedSlug = slugifyUserName(readableName);
        const currentUserId = Number(req.user?.id || 0);

        const { data: allUsers, error: userError } = await supabase
            .from("user[Auth]")
            .select("ID, UserName, Name");

        if (userError) return res.status(500).json({ error: userError.message });

        const users = (allUsers || []).filter((candidate) => {
            const usernameSlug = slugifyUserName(candidate?.UserName);
            const nameSlug = slugifyUserName(candidate?.Name);
            return usernameSlug === requestedSlug || nameSlug === requestedSlug;
        });

        if (!users || users.length === 0) return res.status(404).json({ error: "User not found" });

        const user = users[0];
        const targetUserId = user.ID;
        const isMe = currentUserId === targetUserId;

        const [{ data: detailsList, error: detailsError }, mySetups] = await Promise.all([
            supabase
                .from("user_more[Auth]")
                .select("*")
                .eq("user_id", targetUserId),
            getPublicSetups(targetUserId, isMe)
        ]);

        if (detailsError) return res.status(500).json({ error: detailsError.message });

        const details = detailsList && detailsList.length > 0 ? detailsList[0] : null;

        const profilePicture = pickFirst(details, [
            "profile_picture", "profilePicture", "profile_image", "profileImage", "avatar_url", "avatar", "picture", "image"
        ]);

        const rank = resolveRole(user.ID);

        const responseData = {
            user: {
                id: user.ID,
                username: user.UserName,
                name: user.Name || user.UserName,
                age: details?.age ?? null,
                profilePicture,
                rank: rank
            },
            mySetups
        };

        res.json(responseData);
    } catch (err) {
        res.status(500).json({ error: err.message || "Internal Server Error" });
    }
});


/**
 * Fetch detailed user profile and their public setups by User ID
 */


router.get("/:id/profile", optionalUser, async (req, res) => {
    try {
        const targetUserId = Number(req.params.id);
        const currentUserId = Number(req.user?.id || 0);
        const isMe = currentUserId === targetUserId;

        if (!Number.isFinite(targetUserId) || targetUserId <= 0) {
            return res.status(400).json({ error: "Invalid user id" });
        }

        const [{ data: users, error: userError }, { data: detailsList, error: detailsError }, mySetups] = await Promise.all([
            supabase
                .from("user[Auth]")
                .select("ID, UserName, Name")
                .eq("ID", targetUserId),
            supabase
                .from("user_more[Auth]")
                .select("*")
                .eq("user_id", targetUserId),
            getPublicSetups(targetUserId, isMe)
        ]);

        if (userError) return res.status(500).json({ error: userError.message });
        const user = users && users.length > 0 ? users[0] : null;
        if (!user) return res.status(404).json({ error: "User not found" });
        if (detailsError) return res.status(500).json({ error: detailsError.message });

        const details = detailsList && detailsList.length > 0 ? detailsList[0] : null;

        const profilePicture = pickFirst(details, [
            "profile_picture", "profilePicture", "profile_image", "profileImage", "avatar_url", "avatar", "picture", "image"
        ]);

        const rank = resolveRole(user.ID);

        res.json({
            user: {
                id: user.ID,
                username: user.UserName,
                name: user.Name || user.UserName,
                age: details?.age ?? null,
                profilePicture,
                rank: rank
            },
            mySetups
        });
    } catch (err) {
        res.status(500).json({ error: err.message || "Internal Server Error" });
    }
});

module.exports = router;
