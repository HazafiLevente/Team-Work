const { supabase } = require("./supabase");

// Database table names
const CONNECTIONS_TABLE = "connections[Connections]";
const CONNECTIONS_PROPERTIES_TABLE = "connections_properties[Connections]";
const CONNECTIONS_VALUES_TABLE = "connections_values[Connections]";
const SETUPS_TABLE = "setups";
const SETUP_DEVICES_TABLE = "setup_devices";

// Simple in-memory cache for property IDs
let propertyCache = null;

/**
 * Extracts and normalizes an ID from a database row.
 * Supports both "id" and "ID".
 */
function pickId(row) {
    const value = row?.id ?? row?.ID ?? null;
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
}

/**
 * Returns the first existing field value from a list of possible keys.
 */
function pickField(row, keys) {
    for (const key of keys) {
        if (row && row[key] != null) return row[key];
    }
    return null;
}

/**
 * Converts a value to a number.
 * Returns null if conversion fails.
 */
function toNumberOrNull(value) {
    if (value == null || value === "") return null;
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
}

/**
 * Converts a value to a trimmed string.
 * Returns null if empty.
 */
function toStringOrNull(value) {
    if (value == null) return null;
    const text = String(value).trim();
    return text ? text : null;
}

/**
 * Generates a fallback connection name
 * if no custom name was provided.
 */
function buildConnectionName(payload) {
    if (payload?.name) return String(payload.name).trim();

    const from = payload?.from_device_type || payload?.source_type || "device";
    const to = payload?.to_device_type || payload?.target_type || "device";

    return `${from} -> ${to}`;
}

/**
 * Ensures that a property exists in the database.
 * If missing, it creates it.
 * Uses cache for better performance.
 */
async function ensureProperty(propertyName) {
    const cachedId = propertyCache?.byName?.get(propertyName);
    if (cachedId) return cachedId;

    // Try finding existing property
    const { data: existing, error: findError } = await supabase
        .from(CONNECTIONS_PROPERTIES_TABLE)
        .select("*")
        .ilike("property", propertyName)
        .maybeSingle();

    if (findError) throw findError;

    // Property already exists
    if (existing) {
        const existingId = pickId(existing);

        if (!propertyCache) {
            propertyCache = { byName: new Map() };
        }

        propertyCache.byName.set(propertyName, existingId);

        return existingId;
    }

    // Create new property
    const { data: created, error: insertError } = await supabase
        .from(CONNECTIONS_PROPERTIES_TABLE)
        .insert({ property: propertyName })
        .select("*")
        .single();

    if (insertError) throw insertError;

    const createdId = pickId(created);

    if (!propertyCache) {
        propertyCache = { byName: new Map() };
    }

    propertyCache.byName.set(propertyName, createdId);

    return createdId;
}

/**
 * Inserts a connection value.
 * Supports both "property" and "property_id"
 * column naming styles.
 */
async function insertValueFlexible(payload) {
    const variants = [
        {
            connection_id: payload.connectionId,
            property: payload.propertyId,
            value: payload.value
        },
        {
            connection_id: payload.connectionId,
            property_id: payload.propertyId,
            value: payload.value
        }
    ];

    let lastError = null;

    // Try both formats until one works
    for (const row of variants) {
        const { error } = await supabase
            .from(CONNECTIONS_VALUES_TABLE)
            .insert(row);

        if (!error) return;

        lastError = error;
    }

    throw lastError || new Error("Failed to insert connection value");
}

/**
 * Deletes multiple rows by ID from a table.
 */
async function deleteManyByIds(tableName, ids) {
    const normalizedIds = [...new Set(
        (ids || [])
            .map(toNumberOrNull)
            .filter(Number.isFinite)
    )];

    if (!normalizedIds.length) return;

    const { error } = await supabase
        .from(tableName)
        .delete()
        .in("id", normalizedIds);

    if (error) throw error;
}

/**
 * Loads the entire connection state:
 * - connections
 * - properties
 * - values
 */
async function getConnectionState() {
    const [connectionsRes, propertiesRes, valuesRes] = await Promise.all([
        supabase.from(CONNECTIONS_TABLE).select("*"),
        supabase.from(CONNECTIONS_PROPERTIES_TABLE).select("*"),
        supabase.from(CONNECTIONS_VALUES_TABLE).select("*")
    ]);

    if (connectionsRes.error) throw connectionsRes.error;
    if (propertiesRes.error) throw propertiesRes.error;
    if (valuesRes.error) throw valuesRes.error;

    const propertiesById = new Map();
    const propertyIdsByName = new Map();

    // Build property lookup maps
    for (const row of propertiesRes.data || []) {
        const id = pickId(row);
        const name = String(row?.property || "").trim();

        if (!id || !name) continue;

        propertiesById.set(id, name);
        propertyIdsByName.set(name, id);
    }

    const values = Array.isArray(valuesRes.data)
        ? valuesRes.data
        : [];

    return {
        connections: Array.isArray(connectionsRes.data)
            ? connectionsRes.data
            : [],
        values,
        propertiesById,
        propertyIdsByName
    };
}

/**
 * Converts raw database rows into
 * fully usable connection objects.
 */
async function hydrateConnections(connectionRows) {
    const state = await getConnectionState();

    const rows = Array.isArray(connectionRows)
        ? connectionRows
        : state.connections;

    const valuesByConnectionId = new Map();

    // Group values by connection ID
    for (const row of state.values) {
        const connectionId = toNumberOrNull(row?.connection_id);

        const propertyRef = toNumberOrNull(
            row?.property ?? row?.property_id
        );

        const propertyName =
            propertyRef == null
                ? null
                : state.propertiesById.get(propertyRef);

        if (!connectionId || !propertyName) continue;

        const bucket = valuesByConnectionId.get(connectionId) || {};

        bucket[propertyName] =
            toStringOrNull(row?.value)
            ?? row?.value
            ?? null;

        valuesByConnectionId.set(connectionId, bucket);
    }

    // Collect related setup/device IDs
    const setupIds = new Set();
    const deviceIds = new Set();

    for (const row of rows) {
        const connectionId = pickId(row);

        const values = valuesByConnectionId.get(connectionId) || {};

        const setupFromId = toNumberOrNull(values.setup_from);
        const setupToId = toNumberOrNull(values.setup_to);

        const deviceFromId = toNumberOrNull(values.device_from);
        const deviceToId = toNumberOrNull(values.device_to);

        if (setupFromId) setupIds.add(setupFromId);
        if (setupToId) setupIds.add(setupToId);

        if (deviceFromId) deviceIds.add(deviceFromId);
        if (deviceToId) deviceIds.add(deviceToId);
    }

    // Load setups and devices in parallel
    const [setupRowsRes, deviceRowsRes] = await Promise.all([
        setupIds.size
            ? supabase
                .from(SETUPS_TABLE)
                .select("*")
                .in("id", [...setupIds])
            : Promise.resolve({ data: [], error: null }),

        deviceIds.size
            ? supabase
                .from(SETUP_DEVICES_TABLE)
                .select("*")
                .in("id", [...deviceIds])
            : Promise.resolve({ data: [], error: null })
    ]);

    if (setupRowsRes.error) throw setupRowsRes.error;
    if (deviceRowsRes.error) throw deviceRowsRes.error;

    // Build setup lookup map
    const setupsById = new Map(
        (setupRowsRes.data || []).map((row) => [
            pickId(row),
            {
                id: pickId(row),
                setup_name:
                    row?.name ||
                    row?.setup_name ||
                    `Setup #${pickId(row)}`
            }
        ])
    );

    /**
     * Devices reference another setup through setup_id.
     * We fetch those too because their visible name lives there.
     */
    const deviceSetupIds = [...new Set(
        (deviceRowsRes.data || [])
            .map((row) => toNumberOrNull(row?.setup_id))
            .filter(Number.isFinite)
    )];

    const missingDeviceSetupIds = deviceSetupIds.filter(
        (id) => !setupsById.has(id)
    );

    if (missingDeviceSetupIds.length) {
        const {
            data: deviceSetupRows,
            error: deviceSetupErr
        } = await supabase
            .from(SETUPS_TABLE)
            .select("*")
            .in("id", missingDeviceSetupIds);

        if (deviceSetupErr) throw deviceSetupErr;

        for (const row of deviceSetupRows || []) {
            const id = pickId(row);

            if (!id) continue;

            setupsById.set(id, {
                id,
                setup_name:
                    row?.name ||
                    row?.setup_name ||
                    `Setup #${id}`
            });
        }
    }

    // Build device lookup map
    const devicesById = new Map(
        (deviceRowsRes.data || []).map((row) => [
            pickId(row),
            {
                id: pickId(row),

                setup_id: toNumberOrNull(row?.setup_id),

                title:
                    setupsById.get(
                        toNumberOrNull(row?.setup_id)
                    )?.setup_name ||
                    row?.title ||
                    row?.name ||
                    row?.product_name ||
                    null,

                role:
                    String(row?.role || row?.type || "device").trim()
                    || "device"
            }
        ])
    );

    /**
     * Final transformation:
     * convert raw rows into frontend-friendly objects.
     */
    return rows.map((row) => {
        const connectionId = pickId(row);

        const values = valuesByConnectionId.get(connectionId) || {};

        const fromSetupId = toNumberOrNull(values.setup_from);
        const toSetupId = toNumberOrNull(values.setup_to);

        const fromDeviceId = toNumberOrNull(values.device_from);
        const toDeviceId = toNumberOrNull(values.device_to);

        const fromDevice = devicesById.get(fromDeviceId) || null;
        const toDevice = devicesById.get(toDeviceId) || null;

        const fromSetup = setupsById.get(fromSetupId) || null;
        const toSetup = setupsById.get(toSetupId) || null;

        const fromDeviceType =
            toStringOrNull(values.device_type_from)
            || fromDevice?.role
            || "setup";

        const toDeviceType =
            toStringOrNull(values.device_type_to)
            || toDevice?.role
            || "setup";

        const fromDeviceName =
            toStringOrNull(values.device_name_from) || null;

        const toDeviceName =
            toStringOrNull(values.device_name_to) || null;

        return {
            id: connectionId,
            name: row?.name || null,

            from_setup_id: fromSetupId,
            to_setup_id: toSetupId,

            from_device_id: fromDeviceId,
            to_device_id: toDeviceId,

            from_device_type: fromDeviceType,
            to_device_type: toDeviceType,

            port_from: values.port_from ?? null,
            port_to: values.port_to ?? null,
            port_type: values.port_type ?? null,

            // Human-readable source setup
            from_setup: {
                id: fromSetupId,
                setup_name:
                    fromDeviceName ||
                    fromDevice?.title ||
                    fromSetup?.setup_name ||
                    `Eszkoz #${fromDeviceId ?? "?"}`
            },

            // Human-readable target setup
            to_setup: {
                id: toSetupId,
                setup_name:
                    toDeviceName ||
                    toDevice?.title ||
                    toSetup?.setup_name ||
                    `Eszkoz #${toDeviceId ?? "?"}`
            },

            // Source device info
            source: {
                category: fromDeviceType,
                id: fromDeviceId,
                name: fromDeviceName || fromDevice?.title || null,
            },

            // Target device info
            target: {
                category: toDeviceType,
                id: toDeviceId,
                name: toDeviceName || toDevice?.title || null,
            }
        };
    });
}

/**
 * Normalizes incoming payload fields
 * into a consistent internal structure.
 */
function normalizeCreatePayload(raw = {}) {
    return {
        name: toStringOrNull(raw.name),

        setupFromId: toNumberOrNull(
            raw.setup_from
            ?? raw.from_setup_id
            ?? raw.setup_id
        ),

        setupToId: toNumberOrNull(
            raw.setup_to
            ?? raw.to_setup_id
            ?? raw.setup_id
        ),

        deviceFromId: toNumberOrNull(
            raw.device_from
            ?? raw.from_device_id
        ),

        deviceToId: toNumberOrNull(
            raw.device_to
            ?? raw.to_device_id
        ),

        portFrom: toStringOrNull(
            raw.port_from
            ?? raw.from_setup_device_port_id
        ),

        portTo: toStringOrNull(
            raw.port_to
            ?? raw.to_setup_device_port_id
        ),

        portType: toStringOrNull(
            raw.port_type
            ?? raw.type
        ),

        from_device_type: toStringOrNull(raw.from_device_type),
        to_device_type: toStringOrNull(raw.to_device_type),

        device_name_from: toStringOrNull(raw.device_name_from),
        device_name_to: toStringOrNull(raw.device_name_to),
    };
}

/**
 * Creates a new connection and stores
 * all related property values.
 */
async function createConnection(rawPayload = {}) {
    const payload = normalizeCreatePayload(rawPayload);

    // Validate required fields
    if (
        !payload.setupFromId ||
        !payload.setupToId ||
        !payload.deviceFromId ||
        !payload.deviceToId
    ) {
        const error = new Error("Missing required connection fields");
        error.status = 400;
        throw error;
    }

    // Create base connection row
    const { data: created, error: insertError } = await supabase
        .from(CONNECTIONS_TABLE)
        .insert({
            name: buildConnectionName(payload)
        })
        .select("*")
        .single();

    if (insertError) throw insertError;

    const connectionId = pickId(created);

    try {
        // Prepare dynamic property values
        const valuesToInsert = [
            ["setup_from", String(payload.setupFromId)],
            ["setup_to", String(payload.setupToId)],
            ["device_from", String(payload.deviceFromId)],
            ["device_to", String(payload.deviceToId)]
        ];

        if (payload.portFrom) {
            valuesToInsert.push(["port_from", payload.portFrom]);
        }

        if (payload.portTo) {
            valuesToInsert.push(["port_to", payload.portTo]);
        }

        if (payload.portType) {
            valuesToInsert.push(["port_type", payload.portType]);
        }

        if (payload.from_device_type) {
            valuesToInsert.push([
                "device_type_from",
                payload.from_device_type
            ]);
        }

        if (payload.to_device_type) {
            valuesToInsert.push([
                "device_type_to",
                payload.to_device_type
            ]);
        }

        if (payload.device_name_from) {
            valuesToInsert.push([
                "device_name_from",
                payload.device_name_from
            ]);
        }

        if (payload.device_name_to) {
            valuesToInsert.push([
                "device_name_to",
                payload.device_name_to
            ]);
        }

        // Insert all property-value pairs
        for (const [propertyName, value] of valuesToInsert) {
            const propertyId = await ensureProperty(propertyName);

            await insertValueFlexible({
                connectionId,
                propertyId,
                value
            });
        }
    } catch (error) {
        // Rollback connection if value insertion fails
        await removeConnection(connectionId).catch(() => null);
        throw error;
    }

    // Return fully hydrated connection object
    const hydrated = await hydrateConnections([created]);

    return hydrated[0] || { id: connectionId };
}

/**
 * Returns all connections for a specific setup.
 */
async function listConnectionsBySetup(setupId) {
    const targetId = toNumberOrNull(setupId);

    if (!targetId) return [];

    const hydrated = await hydrateConnections();

    return hydrated.filter((row) =>
        Number(row?.from_setup_id) === targetId ||
        Number(row?.to_setup_id) === targetId
    );
}

/**
 * Returns all connections.
 */
async function listAllConnections() {
    return hydrateConnections();
}

/**
 * Returns all connections for a specific device.
 */
async function listConnectionsByDevice(deviceId) {
    const targetId = toNumberOrNull(deviceId);

    if (!targetId) return [];

    const hydrated = await hydrateConnections();

    return hydrated.filter((row) =>
        Number(row?.from_device_id) === targetId ||
        Number(row?.to_device_id) === targetId
    );
}

/**
 * Deletes a single connection
 * and all its related values.
 */
async function removeConnection(connectionId) {
    const id = toNumberOrNull(connectionId);

    if (!id) return false;

    // Delete connection values first
    const { error: deleteValuesError } = await supabase
        .from(CONNECTIONS_VALUES_TABLE)
        .delete()
        .eq("connection_id", id);

    if (deleteValuesError) throw deleteValuesError;

    // Delete connection row
    const { error: deleteConnectionError } = await supabase
        .from(CONNECTIONS_TABLE)
        .delete()
        .eq("id", id);

    if (deleteConnectionError) throw deleteConnectionError;

    return true;
}

/**
 * Deletes all connections related
 * to the provided setup IDs.
 */
async function removeConnectionsForSetupIds(setupIds) {
    const ids = [...new Set(
        (setupIds || [])
            .map(toNumberOrNull)
            .filter(Number.isFinite)
    )];

    if (!ids.length) return [];

    const hydrated = await hydrateConnections();

    const toDelete = hydrated
        .filter((row) =>
            ids.includes(Number(row?.from_setup_id)) ||
            ids.includes(Number(row?.to_setup_id))
        )
        .map((row) => Number(row.id))
        .filter(Number.isFinite);

    if (!toDelete.length) return [];

    // Delete all related values first
    const { error: deleteValuesError } = await supabase
        .from(CONNECTIONS_VALUES_TABLE)
        .delete()
        .in("connection_id", toDelete);

    if (deleteValuesError) throw deleteValuesError;

    // Delete connection rows
    await deleteManyByIds(CONNECTIONS_TABLE, toDelete);

    return toDelete;
}

/**
 * Deletes all connections related
 * to the provided device IDs.
 */
async function removeConnectionsForDeviceIds(deviceIds) {
    const ids = [...new Set(
        (deviceIds || [])
            .map(toNumberOrNull)
            .filter(Number.isFinite)
    )];

    if (!ids.length) return [];

    const hydrated = await hydrateConnections();

    const toDelete = hydrated
        .filter((row) =>
            ids.includes(Number(row?.from_device_id)) ||
            ids.includes(Number(row?.to_device_id))
        )
        .map((row) => Number(row.id))
        .filter(Number.isFinite);

    if (!toDelete.length) return [];

    // Delete all related values first
    const { error: deleteValuesError } = await supabase
        .from(CONNECTIONS_VALUES_TABLE)
        .delete()
        .in("connection_id", toDelete);

    if (deleteValuesError) throw deleteValuesError;

    // Delete connection rows
    await deleteManyByIds(CONNECTIONS_TABLE, toDelete);

    return toDelete;
}

// Export public API
module.exports = {
    createConnection,
    listConnectionsBySetup,
    listAllConnections,
    listConnectionsByDevice,
    removeConnection,
    removeConnectionsForSetupIds,
    removeConnectionsForDeviceIds
};