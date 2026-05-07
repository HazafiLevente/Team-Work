const { changeUserPassword } = require("../services/profile/password.service");
const { getOrCreateUserDetails, getUserProfile, updateUserProfile, upsertUserDetails } = require("../services/profile/profile.service");
const { calculateUserSetupPrice } = require("../services/profile/setupPrice.service");
const { supabase } = require("../services/supabase");

const SETUP_LIST_TABLE = "setup_list";
const SETUP_LIST_PROPERTIES_TABLE = "setup_list_properties";
const SETUP_LIST_VALUES_TABLE = "setup_list_values";
const SETUP_LIST_VALUE_LIST_ID_COLUMN_CANDIDATES = [
    "setup_list_id",
    "setup-list_id",
    "setuplist_id",
    "list_id"
];
const LIST_PROPERTY_NAMES = {
    title: "title",
    setupType: "setup_type",
    isFavorite: "isFavorite",
    isSecret: "isSecret",
    setupId: "setup_id"
};

let setupListValueListIdColumnCache = null;

function toBoolean(value) {
    return value === true || value === "true" || value === 1 || value === "1";
}

function setupTypeOf(setup) {
    return String(setup?.setup_type ?? setup?.type ?? "").trim().toLowerCase();
}

function mapSetupSummaryItem(setup) {
    return {
        id: Number(setup.id),
        name: setup.name || setup.setup_name || "Nevtelen setup",
        type: setup.setup_type || setup.type || null,
        category: setup.category || null
    };
}

function classifySetupRooms(rooms = []) {
    const summary = {
        regular: [],
        favorites: [],
        notes: []
    };

    for (const setup of rooms || []) {
        const isNote = toBoolean(setup?.isNote ?? setup?.is_note ?? setup?.isnote);
        const isFavorite = toBoolean(setup?.is_plan ?? setup?.is_favorite ?? setup?.isFavorite);
        const type = setupTypeOf(setup);
        const item = mapSetupSummaryItem(setup);

        if (isNote || type === "note") {
            summary.notes.push(item);
            continue;
        }

        if (isFavorite || type === "favorite" || type === "plan") {
            summary.favorites.push(item);
            continue;
        }

        summary.regular.push(item);
    }

    return summary;
}

function isFavoriteList(list) {
    const name = String(list?.name ?? "").trim().toLowerCase();
    const title = String(list?.title ?? "").trim().toLowerCase();
    const type = String(list?.setupType ?? "").trim().toLowerCase();
    return name === "favorite" || title === "favorite" || type === "favorite";
}

async function getSetupListPropertyMap() {
    const { data, error } = await supabase
        .from(SETUP_LIST_PROPERTIES_TABLE)
        .select("id, property");

    if (error) throw error;

    const byId = new Map();
    (data || []).forEach((row) => {
        const id = String(row?.id ?? "");
        const property = String(row?.property ?? "").trim();
        if (id && property) byId.set(id, property);
    });
    return byId;
}

async function getSetupListValueListIdColumn() {
    if (setupListValueListIdColumnCache) return setupListValueListIdColumnCache;

    for (const columnName of SETUP_LIST_VALUE_LIST_ID_COLUMN_CANDIDATES) {
        const { error } = await supabase
            .from(SETUP_LIST_VALUES_TABLE)
            .select(columnName)
            .limit(1);

        if (!error) {
            setupListValueListIdColumnCache = columnName;
            return setupListValueListIdColumnCache;
        }
    }

    setupListValueListIdColumnCache = "setup_list_id";
    return setupListValueListIdColumnCache;
}

async function getSetupLists(userId) {
    const { data: lists, error: listError } = await supabase
        .from(SETUP_LIST_TABLE)
        .select("*")
        .eq("user_id", userId)
        .order("id", { ascending: true });

    if (listError) throw listError;

    const listRows = lists || [];
    const listIds = listRows.map((list) => list.id).filter((id) => id != null);
    if (!listIds.length) return [];

    const propertyMap = await getSetupListPropertyMap();
    const listIdColumn = await getSetupListValueListIdColumn();
    const { data: values, error: valuesError } = await supabase
        .from(SETUP_LIST_VALUES_TABLE)
        .select("*")
        .in(listIdColumn, listIds);

    if (valuesError) throw valuesError;

    const valueGroups = new Map();
    (values || []).forEach((row) => {
        const listId = String(row?.[listIdColumn] ?? "");
        const propertyName = propertyMap.get(String(row?.property ?? "")) || String(row?.property ?? "");
        if (!listId || !propertyName) return;
        if (!valueGroups.has(listId)) valueGroups.set(listId, {});
        const group = valueGroups.get(listId);
        if (!group[propertyName]) group[propertyName] = [];
        group[propertyName].push(row?.value);
    });

    return listRows.map((list) => {
        const valuesByProperty = valueGroups.get(String(list.id)) || {};
        return {
            id: Number(list.id),
            name: list.name,
            title: valuesByProperty[LIST_PROPERTY_NAMES.title]?.[0] || list.name,
            setupType: valuesByProperty[LIST_PROPERTY_NAMES.setupType]?.[0] || list.name,
            isFavorite: toBoolean(valuesByProperty[LIST_PROPERTY_NAMES.isFavorite]?.[0]),
            isSecret: toBoolean(valuesByProperty[LIST_PROPERTY_NAMES.isSecret]?.[0]),
            setupIds: (valuesByProperty[LIST_PROPERTY_NAMES.setupId] || [])
                .map((value) => Number(value))
                .filter((value) => Number.isFinite(value) && value > 0)
        };
    });
}

function buildListSummary(lists, rooms) {
    const setupById = new Map((rooms || []).map((setup) => [Number(setup.id), setup]));
    const setupPrivacy = new Map();

    for (const list of lists || []) {
        for (const setupId of list.setupIds || []) {
            setupPrivacy.set(Number(setupId), Boolean(setupPrivacy.get(Number(setupId))) || Boolean(list.isSecret));
        }
    }

    const groups = (lists || [])
        .filter((list) => Array.isArray(list.setupIds) && list.setupIds.length)
        .map((list) => ({
            id: list.id,
            name: list.name,
            title: list.title || list.name || "Lista",
            isSecret: Boolean(list.isSecret),
            isFavorite: Boolean(list.isFavorite) || isFavoriteList(list),
            setups: (list.setupIds || [])
                .map((setupId) => setupById.get(Number(setupId)))
                .filter(Boolean)
                .map((setup) => ({
                    ...mapSetupSummaryItem(setup),
                    isSecret: Boolean(setupPrivacy.get(Number(setup.id)))
                }))
        }))
        .filter((list) => list.setups.length);

    const listedSetupIds = new Set();
    groups.forEach((list) => list.setups.forEach((setup) => listedSetupIds.add(Number(setup.id))));
    const unlisted = (rooms || [])
        .filter((setup) => !listedSetupIds.has(Number(setup.id)))
        .filter((setup) => {
            const isNote = toBoolean(setup?.isNote ?? setup?.is_note ?? setup?.isnote);
            const type = setupTypeOf(setup);
            return !isNote && type !== "note";
        })
        .map((setup) => ({ ...mapSetupSummaryItem(setup), isSecret: false }));

    if (unlisted.length) {
        groups.push({
            id: null,
            name: "unlisted",
            title: "Lista nelkul",
            isSecret: false,
            isFavorite: false,
            setups: unlisted
        });
    }

    return groups;
}

async function getSetupSummary(userId) {
    const { data, error } = await supabase
        .from("setup_room")
        .select("*")
        .eq("user_id", userId)
        .order("name", { ascending: true });

    if (error) throw error;

    const rooms = data || [];
    const setupSummary = classifySetupRooms(rooms);
    const lists = await getSetupLists(userId);
    setupSummary.lists = buildListSummary(lists, rooms);
    return setupSummary;
}

async function getProfile(req, res) {
    const userId = req.user.id;

    try {
        const [user, details, totalSetupPrice, setupSummary] = await Promise.all([
            getUserProfile(userId),
            getOrCreateUserDetails(userId),
            calculateUserSetupPrice(userId).catch((err) => {
                console.error("Profile total setup price error:", err);
                return 0;
            }),
            getSetupSummary(userId).catch((err) => {
                console.error("Profile setup summary error:", err);
                return { regular: [], favorites: [], notes: [], lists: [] };
            })
        ]);

        res.json({
            username: user.UserName,
            fullname: user.Name,
            email: user.Email,
            age: details?.age ?? null,
            phone: details?.phone_number ?? null,
            city: details?.city ?? null,
            totalSetupPrice,
            setupSummary
        });
    } catch (err) {
        res.status(500).json({ error: err.message || "Internal Server Error" });
    }
}

async function updateProfile(req, res) {
    try {
        const userId = req.user.id;

        await updateUserProfile(userId, req.body);
        await upsertUserDetails(userId, req.body);

        res.json({ success: true });
    } catch (err) {
        console.error("updateProfile ERROR:", err);
        res.status(500).json({ error: err.message || "Internal Server Error" });
    }
}

async function changePassword(req, res) {
    try {
        const userId = req.user.id;
        const { oldPassword, newPassword } = req.body;

        await changeUserPassword(userId, oldPassword, newPassword);
        res.json({ success: true });
    } catch (err) {
        console.error("changePassword ERROR:", err);
        res.status(err.statusCode || 500).json({ error: err.message || "Internal Server Error" });
    }
}

module.exports = {
    changePassword,
    getProfile,
    updateProfile
};
