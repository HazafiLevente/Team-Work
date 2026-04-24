const { supabase } = require("./supabase");

const CONNECTIONS_TABLE = "connections[Connections]";
const CONNECTIONS_PROPERTIES_TABLE = "connections_properties[Connections]";
const CONNECTIONS_VALUES_TABLE = "connections_values[Connections]";
const SETUPS_TABLE = "setups";
const SETUP_DEVICES_TABLE = "setup_devices";

let propertyCache = null;

function pickId(row) {
    const value = row?.id ?? row?.ID ?? null;
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
}

function pickField(row, keys) {
    for (const key of keys) {
        if (row && row[key] != null) return row[key];
    }
    return null;
}

function toNumberOrNull(value) {
    if (value == null || value === "") return null;
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
}

function toStringOrNull(value) {
    if (value == null) return null;
    const text = String(value).trim();
    return text ? text : null;
}

function buildConnectionName(payload) {
    if (payload?.name) return String(payload.name).trim();

    const from = payload?.from_device_type || payload?.source_type || "device";
    const to = payload?.to_device_type || payload?.target_type || "device";
    return `${from} -> ${to}`;
}

async function ensureProperty(propertyName) {
    const cachedId = propertyCache?.byName?.get(propertyName);
    if (cachedId) return cachedId;

    const { data: existing, error: findError } = await supabase
        .from(CONNECTIONS_PROPERTIES_TABLE)
        .select("*")
        .ilike("property", propertyName)
        .maybeSingle();

    if (findError) throw findError;

    if (existing) {
        const existingId = pickId(existing);
        if (!propertyCache) propertyCache = { byName: new Map() };
        propertyCache.byName.set(propertyName, existingId);
        return existingId;
    }

    const { data: created, error: insertError } = await supabase
        .from(CONNECTIONS_PROPERTIES_TABLE)
        .insert({ property: propertyName })
        .select("*")
        .single();

    if (insertError) throw insertError;

    const createdId = pickId(created);
    if (!propertyCache) propertyCache = { byName: new Map() };
    propertyCache.byName.set(propertyName, createdId);
    return createdId;
}

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

    for (const row of variants) {
        const { error } = await supabase
            .from(CONNECTIONS_VALUES_TABLE)
            .insert(row);

        if (!error) return;
        lastError = error;
    }

    throw lastError || new Error("Failed to insert connection value");
}

async function deleteManyByIds(tableName, ids) {
    const normalizedIds = [...new Set((ids || []).map(toNumberOrNull).filter(Number.isFinite))];
    if (!normalizedIds.length) return;

    const { error } = await supabase
        .from(tableName)
        .delete()
        .in("id", normalizedIds);

    if (error) throw error;
}

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

    for (const row of propertiesRes.data || []) {
        const id = pickId(row);
        const name = String(row?.property || "").trim();
        if (!id || !name) continue;
        propertiesById.set(id, name);
        propertyIdsByName.set(name, id);
    }

    const values = Array.isArray(valuesRes.data) ? valuesRes.data : [];
    return {
        connections: Array.isArray(connectionsRes.data) ? connectionsRes.data : [],
        values,
        propertiesById,
        propertyIdsByName
    };
}

async function hydrateConnections(connectionRows) {
    const state = await getConnectionState();
    const rows = Array.isArray(connectionRows) ? connectionRows : state.connections;
    const valuesByConnectionId = new Map();

    for (const row of state.values) {
        const connectionId = toNumberOrNull(row?.connection_id);
        const propertyRef = toNumberOrNull(row?.property ?? row?.property_id);
        const propertyName = propertyRef == null ? null : state.propertiesById.get(propertyRef);
        if (!connectionId || !propertyName) continue;

        const bucket = valuesByConnectionId.get(connectionId) || {};
        bucket[propertyName] = toStringOrNull(row?.value) ?? row?.value ?? null;
        valuesByConnectionId.set(connectionId, bucket);
    }

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

    const [setupRowsRes, deviceRowsRes] = await Promise.all([
        setupIds.size
            ? supabase.from(SETUPS_TABLE).select("*").in("id", [...setupIds])
            : Promise.resolve({ data: [], error: null }),
        deviceIds.size
            ? supabase.from(SETUP_DEVICES_TABLE).select("*").in("id", [...deviceIds])
            : Promise.resolve({ data: [], error: null })
    ]);

    if (setupRowsRes.error) throw setupRowsRes.error;
    if (deviceRowsRes.error) throw deviceRowsRes.error;

    const setupsById = new Map(
        (setupRowsRes.data || []).map((row) => [
            pickId(row),
            {
                id: pickId(row),
                setup_name: row?.name || row?.setup_name || `Setup #${pickId(row)}`
            }
        ])
    );

    const devicesById = new Map(
        (deviceRowsRes.data || []).map((row) => [
            pickId(row),
            {
                id: pickId(row),
                setup_id: toNumberOrNull(row?.setup_id),
                title: row?.title || row?.name || row?.product_name || null,
                role: String(row?.role || row?.type || "device").trim() || "device"
            }
        ])
    );

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
        const fromDeviceType = toStringOrNull(values.device_type_from) || fromDevice?.role || "setup";
        const toDeviceType = toStringOrNull(values.device_type_to) || toDevice?.role || "setup";

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
            from_setup: {
                id: fromSetupId,
                setup_name: fromDevice?.title || fromSetup?.setup_name || `Eszkoz #${fromDeviceId ?? "?"}`
            },
            to_setup: {
                id: toSetupId,
                setup_name: toDevice?.title || toSetup?.setup_name || `Eszkoz #${toDeviceId ?? "?"}`
            },
            source: {
                category: fromDeviceType,
                id: fromDeviceId
            },
            target: {
                category: toDeviceType,
                id: toDeviceId
            }
        };
    });
}

function normalizeCreatePayload(raw = {}) {
    return {
        name: toStringOrNull(raw.name),
        setupFromId: toNumberOrNull(raw.setup_from ?? raw.from_setup_id ?? raw.setup_id),
        setupToId: toNumberOrNull(raw.setup_to ?? raw.to_setup_id ?? raw.setup_id),
        deviceFromId: toNumberOrNull(raw.device_from ?? raw.from_device_id),
        deviceToId: toNumberOrNull(raw.device_to ?? raw.to_device_id),
        portFrom: toStringOrNull(raw.port_from ?? raw.from_setup_device_port_id),
        portTo: toStringOrNull(raw.port_to ?? raw.to_setup_device_port_id),
        portType: toStringOrNull(raw.port_type ?? raw.type),
        from_device_type: toStringOrNull(raw.from_device_type),
        to_device_type: toStringOrNull(raw.to_device_type)
    };
}

async function createConnection(rawPayload = {}) {
    const payload = normalizeCreatePayload(rawPayload);

    if (!payload.setupFromId || !payload.setupToId || !payload.deviceFromId || !payload.deviceToId) {
        const error = new Error("Missing required connection fields");
        error.status = 400;
        throw error;
    }

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
        const valuesToInsert = [
            ["setup_from", String(payload.setupFromId)],
            ["setup_to", String(payload.setupToId)],
            ["device_from", String(payload.deviceFromId)],
            ["device_to", String(payload.deviceToId)]
        ];

        if (payload.portFrom) valuesToInsert.push(["port_from", payload.portFrom]);
        if (payload.portTo) valuesToInsert.push(["port_to", payload.portTo]);
        if (payload.portType) valuesToInsert.push(["port_type", payload.portType]);
        if (payload.from_device_type) valuesToInsert.push(["device_type_from", payload.from_device_type]);
        if (payload.to_device_type) valuesToInsert.push(["device_type_to", payload.to_device_type]);

        for (const [propertyName, value] of valuesToInsert) {
            const propertyId = await ensureProperty(propertyName);
            await insertValueFlexible({
                connectionId,
                propertyId,
                value
            });
        }
    } catch (error) {
        await removeConnection(connectionId).catch(() => null);
        throw error;
    }

    const hydrated = await hydrateConnections([created]);
    return hydrated[0] || { id: connectionId };
}

async function listConnectionsBySetup(setupId) {
    const targetId = toNumberOrNull(setupId);
    if (!targetId) return [];

    const hydrated = await hydrateConnections();
    return hydrated.filter((row) =>
        Number(row?.from_setup_id) === targetId || Number(row?.to_setup_id) === targetId
    );
}

async function listAllConnections() {
    return hydrateConnections();
}

async function listConnectionsByDevice(deviceId) {
    const targetId = toNumberOrNull(deviceId);
    if (!targetId) return [];

    const hydrated = await hydrateConnections();
    return hydrated.filter((row) =>
        Number(row?.from_device_id) === targetId || Number(row?.to_device_id) === targetId
    );
}

async function removeConnection(connectionId) {
    const id = toNumberOrNull(connectionId);
    if (!id) return false;

    const { error: deleteValuesError } = await supabase
        .from(CONNECTIONS_VALUES_TABLE)
        .delete()
        .eq("connection_id", id);
    if (deleteValuesError) throw deleteValuesError;

    const { error: deleteConnectionError } = await supabase
        .from(CONNECTIONS_TABLE)
        .delete()
        .eq("id", id);

    if (deleteConnectionError) throw deleteConnectionError;

    return true;
}

async function removeConnectionsForSetupIds(setupIds) {
    const ids = [...new Set((setupIds || []).map(toNumberOrNull).filter(Number.isFinite))];
    if (!ids.length) return [];

    const hydrated = await hydrateConnections();
    const toDelete = hydrated
        .filter((row) => ids.includes(Number(row?.from_setup_id)) || ids.includes(Number(row?.to_setup_id)))
        .map((row) => Number(row.id))
        .filter(Number.isFinite);

    if (!toDelete.length) return [];

    const { error: deleteValuesError } = await supabase
        .from(CONNECTIONS_VALUES_TABLE)
        .delete()
        .in("connection_id", toDelete);
    if (deleteValuesError) throw deleteValuesError;

    await deleteManyByIds(CONNECTIONS_TABLE, toDelete);
    return toDelete;
}

async function removeConnectionsForDeviceIds(deviceIds) {
    const ids = [...new Set((deviceIds || []).map(toNumberOrNull).filter(Number.isFinite))];
    if (!ids.length) return [];

    const hydrated = await hydrateConnections();
    const toDelete = hydrated
        .filter((row) => ids.includes(Number(row?.from_device_id)) || ids.includes(Number(row?.to_device_id)))
        .map((row) => Number(row.id))
        .filter(Number.isFinite);

    if (!toDelete.length) return [];

    const { error: deleteValuesError } = await supabase
        .from(CONNECTIONS_VALUES_TABLE)
        .delete()
        .in("connection_id", toDelete);
    if (deleteValuesError) throw deleteValuesError;

    await deleteManyByIds(CONNECTIONS_TABLE, toDelete);
    return toDelete;
}

module.exports = {
    createConnection,
    listConnectionsBySetup,
    listAllConnections,
    listConnectionsByDevice,
    removeConnection,
    removeConnectionsForSetupIds,
    removeConnectionsForDeviceIds
};
