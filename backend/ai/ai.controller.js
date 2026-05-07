const { GoogleGenerativeAI } = require("@google/generative-ai");
const { listProducts, listBrands, getCatalogOverview } = require("../services/products/productCatalog.service");
const { supabase } = require("../services/supabase");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
const AI_PANEL_TABLES = ["ai_panel[Messages]", "ai_panel"];
const AI_TEXTS_TABLES = ["ai_texts[Messages]", "ai_texts"];

function pickField(row, keys) {
    if (!row || typeof row !== "object") return null;

    for (const key of keys) {
        const foundKey = Object.keys(row).find((candidate) => candidate.toLowerCase() === key.toLowerCase());
        if (!foundKey) continue;

        const value = row[foundKey];
        if (value !== undefined && value !== null) {
            return value;
        }
    }

    return null;
}

function mapAiPanel(row) {
    return {
        id: Number(pickField(row, ["id", "ID"])),
        user_id: Number(pickField(row, ["user_id", "owner_id", "user1_id", "userid"])),
        title: String(pickField(row, ["title", "name", "label", "title_user1"]) || "Uj AI beszelgetes"),
        created_at: String(pickField(row, ["created_at", "createdAt"]) || new Date().toISOString())
    };
}

function mapAiPanelRow(row) {
    return {
        id: Number(pickField(row, ["id", "ID"])),
        user_id: Number(pickField(row, ["user_id", "owner_id", "user1_id", "userid"])),
        created_at: String(pickField(row, ["created_at", "createdAt"]) || new Date().toISOString())
    };
}

async function selectFromFirstAvailable(tableNames, queryFactory) {
    let lastError = null;

    for (const tableName of tableNames) {
        try {
            const result = await queryFactory(tableName);
            if (!result?.error) {
                return { ...result, tableName };
            }
            lastError = result.error;
        } catch (error) {
            lastError = error;
        }
    }

    if (lastError) throw lastError;
    throw new Error("No matching AI table found");
}

async function insertIntoFirstAvailable(tableNames, payloadFactory) {
    let lastError = null;

    for (const tableName of tableNames) {
        const payload = payloadFactory(tableName);
        try {
            const result = await supabase.from(tableName).insert(payload).select("*").single();
            if (!result?.error) {
                return { ...result, tableName };
            }
            lastError = result.error;
        } catch (error) {
            lastError = error;
        }
    }

    if (lastError) throw lastError;
    throw new Error("Insert failed for all AI tables");
}

async function insertAiTextWithDuration(panelId, answer, message, seconds) {
    try {
        await insertIntoFirstAvailable(AI_TEXTS_TABLES, () => ([
            {
                panel_id: panelId,
                ai_text: answer,
                user_text: message,
                time: seconds,
                created_at: new Date().toISOString()
            }
        ]));
        return;
    } catch (error) {
        const errorText = String(error?.message || error || "").toLowerCase();
        const timeColumnProblem =
            errorText.includes("time") &&
            (errorText.includes("column") || errorText.includes("schema") || errorText.includes("does not exist"));

        if (!timeColumnProblem) {
            throw error;
        }
    }

    await insertIntoFirstAvailable(AI_TEXTS_TABLES, () => ([
        {
            panel_id: panelId,
            ai_text: answer,
            user_text: message,
            created_at: new Date().toISOString()
        }
    ]));
}

async function updateFirstAvailable(tableNames, payload, id) {
    let lastError = null;

    for (const tableName of tableNames) {
        for (const idColumn of ["id", "ID"]) {
            try {
                const result = await supabase.from(tableName).update(payload).eq(idColumn, id).select("*").maybeSingle();
                if (!result?.error) {
                    return result;
                }
                lastError = result.error;
            } catch (error) {
                lastError = error;
            }
        }
    }

    if (lastError) throw lastError;
    throw new Error("Update failed for all AI tables");
}

async function ensureAiPanel(userId, panelId) {
    const numericId = Number(panelId);

    if (Number.isFinite(numericId) && numericId > 0) {
        const { data } = await selectFromFirstAvailable(AI_PANEL_TABLES, (tableName) =>
            supabase.from(tableName).select("*").eq("id", numericId).eq("user_id", userId).maybeSingle()
        );

        if (data) return mapAiPanelRow(data);
    }

    const now = new Date().toISOString();
    const { data: created } = await insertIntoFirstAvailable(AI_PANEL_TABLES, () => ([
        { user_id: userId, created_at: now }
    ]));

    return mapAiPanelRow(created);
}

function normalize(value = "") {
    return String(value ?? "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^\p{L}\p{N}\s-]/gu, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function tokenize(value = "") {
    return normalize(value).split(" ").filter(Boolean);
}

function parseBudget(question = "") {
    const raw = String(question || "").toLowerCase().replace(/\s+/g, " ").trim();
    if (!raw) return null;

    const millionMatch = raw.match(/(\d+(?:[.,]\d+)?)\s*(millio|milli[oó])/i);
    if (millionMatch) {
        const value = Number(String(millionMatch[1]).replace(",", "."));
        return Number.isFinite(value) ? Math.round(value * 1_000_000) : null;
    }

    const thousandMatch = raw.match(/(\d+(?:[.,]\d+)?)\s*ezer/i);
    if (thousandMatch) {
        const value = Number(String(thousandMatch[1]).replace(",", "."));
        return Number.isFinite(value) ? Math.round(value * 1_000) : null;
    }

    const ftMatch = raw.match(/(\d[\d\s.]*)\s*(ft|forint)/i);
    if (ftMatch) {
        const value = Number(String(ftMatch[1]).replace(/[^\d]/g, ""));
        return Number.isFinite(value) ? value : null;
    }

    return null;
}

function detectQuestionContext(question = "") {
    const q = normalize(question);
    const budget = parseBudget(question);

    const isPcBuild =
        ["pc", "szamitogep", "számítógép", "gep", "gép", "build", "konfig", "konfiguracio", "összedobni", "osszedobni"]
            .some((token) => q.includes(normalize(token)));

    const isHt =
        ["erosito", "erősítő", "receiver", "hangfal", "soundbar", "subwoofer", "hazimozi", "házimozi"]
            .some((token) => q.includes(normalize(token)));

    const isInstrument =
        ["gitar", "gitár", "dob", "saxophone", "szaxofon", "trumpet", "trombita"]
            .some((token) => q.includes(normalize(token)));

    let category = "all";
    if (isPcBuild) category = "computer";
    else if (isHt) category = "ht";
    else if (isInstrument) category = "instrument";

    return {
        category,
        budget,
        isPcBuild,
        isHtBuild: isHt && ["rakj ossze", "rakj össze", "epits", "építs", "allits ossze", "állíts össze", "7 2", "7.2", "5.1", "5 1"].some((token) => q.includes(normalize(token))),
    };
}

function normalizeSocket(value = "") {
    return String(value ?? "")
        .trim()
        .toUpperCase()
        .replace(/\s+/g, "")
        .replace(/SOCKET/g, "");
}

function normalizeRamType(value = "") {
    const raw = String(value ?? "").trim().toUpperCase();
    if (!raw) return "";
    if (raw.includes("DDR5")) return "DDR5";
    if (raw.includes("DDR4")) return "DDR4";
    if (raw.includes("DDR3")) return "DDR3";
    return raw;
}

function getProductValue(product, keys = []) {
    for (const key of keys) {
        const direct = product?.[key];
        if (direct !== undefined && direct !== null && direct !== "") return direct;

        const dataValue = product?.data?.[key];
        if (dataValue !== undefined && dataValue !== null && dataValue !== "") return dataValue;
    }

    return null;
}

function getNormalizedSocket(product) {
    return normalizeSocket(getProductValue(product, ["socket", "Socket"]));
}

function getNormalizedRamType(product) {
    return normalizeRamType(getProductValue(product, ["ram_type", "RAMType", "memory_type", "ddr_type"]));
}

function getNumericPrice(product) {
    const value = Number(product?.price || 0);
    return Number.isFinite(value) ? value : 0;
}

function parseHtLayout(question = "") {
    const q = normalize(question);
    if (q.includes("7 2") || q.includes("7.2")) {
        return { channels: "7.2", front: 2, side: 2, back: 2, center: 1, subwoofer: 2, receiver: 1 };
    }
    if (q.includes("5 1") || q.includes("5.1")) {
        return { channels: "5.1", front: 2, side: 2, back: 0, center: 1, subwoofer: 1, receiver: 1 };
    }
    return { channels: "5.1", front: 2, side: 2, back: 0, center: 1, subwoofer: 1, receiver: 1 };
}

function pickMultipleBest(products, count, scorer) {
    return [...(products || [])]
        .sort((a, b) => scorer(b) - scorer(a))
        .slice(0, count);
}

function duplicateToCount(products, count, slot) {
    const source = [...(products || [])];
    if (!source.length || count <= 0) return [];

    const result = [];
    let index = 0;
    while (result.length < count) {
        result.push({ slot, product: source[index % source.length] });
        index += 1;
    }
    return result;
}

function assignHtRoleEntries(products, roleNames = []) {
    const source = [...(products || [])];
    if (!source.length || !roleNames.length) return [];

    return roleNames.map((slot, index) => ({
        slot,
        product: source[index % source.length],
    }));
}

function getHtPairKey(product) {
    const manufacturer = normalize(product?.manufacturer);
    const name = normalize(product?.name || product?.model);
    const table = normalize(product?.table_name || product?.source_table);
    return `${manufacturer}|${table}|${name}`;
}

function pickHtRoleProducts(products, count, scorer, { preferSameModel = false, excludeKeys = [] } = {}) {
    const sorted = [...(products || [])].sort((a, b) => scorer(b) - scorer(a));
    if (!sorted.length || count <= 0) return [];
    const excluded = new Set(excludeKeys || []);
    const filteredSorted = excluded.size
        ? sorted.filter((product) => !excluded.has(getHtPairKey(product)))
        : sorted;
    const candidateList = filteredSorted.length ? filteredSorted : sorted;

    if (!preferSameModel || count === 1) {
        return candidateList.slice(0, count);
    }

    const groups = new Map();
    for (const product of candidateList) {
        const key = getHtPairKey(product);
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(product);
    }

    const rankedGroups = Array.from(groups.values()).sort((a, b) => {
        const scoreDiff = scorer(b[0]) - scorer(a[0]);
        if (scoreDiff !== 0) return scoreDiff;
        return b.length - a.length;
    });

    const bestGroup = rankedGroups[0] || [];
    if (bestGroup.length) {
        return Array.from({ length: count }, (_, index) => bestGroup[index % bestGroup.length]);
    }

    return candidateList.slice(0, count);
}

function isHtSpeakerTable(tableName = "") {
    const normalized = normalize(tableName);
    if (!normalized) return false;

    return [
        "front_speaker",
        "back_speaker",
        "side_speaker",
        "center_speakers",
        "floor_speakers",
        "ceiling_speakers",
        "portable_speakers",
        "studio_monitor_speakers",
    ].includes(normalized) ||
        normalized.includes("speaker") ||
        normalized.includes("monitor");
}

function isHtReceiverTable(tableName = "") {
    const normalized = normalize(tableName);
    return [
        "home_theater",
        "receiver",
        "receivers",
        "audio_processors",
        "audio_processor",
        "avr",
    ].includes(normalized);
}

function isHtSubwooferTable(tableName = "") {
    return normalize(tableName).includes("subwoofer");
}

function buildHtRolePlan(layout) {
    return [
        ...Array(layout.receiver).fill("receiver"),
        "front_left",
        "front_right",
        ...(layout.center ? ["center"] : []),
        ...(layout.side >= 1 ? ["side_left"] : []),
        ...(layout.side >= 2 ? ["side_right"] : []),
        ...(layout.back >= 1 ? ["back_left"] : []),
        ...(layout.back >= 2 ? ["back_right"] : []),
        ...(layout.subwoofer >= 1 ? ["subwoofer_1"] : []),
        ...(layout.subwoofer >= 2 ? ["subwoofer_2"] : []),
    ];
}

function buildHtRecommendation(products, budget = null, brand = null, message = "") {
    const layout = parseHtLayout(message);
    const preferredBrand = normalize(brand || "");
    const wantsPremium = ["jobb fajta", "jobbfele", "premium", "prémium", "high end", "komolyabb"].some((token) => normalize(message).includes(normalize(token)));

    const brandFiltered = preferredBrand
        ? products.filter((product) => normalize(product?.manufacturer).includes(preferredBrand))
        : products;
    const filtered = brandFiltered.length ? brandFiltered : products;
    const allReceivers = products.filter((product) => {
        const table = normalize(product?.table_name || product?.source_table);
        return isHtReceiverTable(table);
    });

    const scoreHt = (product, minPrice = 0) => {
        let score = scorePcCandidate(product, minPrice);
        if (preferredBrand && normalize(product?.manufacturer).includes(preferredBrand)) score += 120;
        if (wantsPremium) score += Math.min(getNumericPrice(product) / 1500, 220);
        return score;
    };

    const tableNameOf = (product) => normalize(product?.table_name || product?.source_table);
    const speakerPool = filtered.filter((product) => isHtSpeakerTable(tableNameOf(product)));
    const allSpeakerPool = products.filter((product) => isHtSpeakerTable(tableNameOf(product)));
    const subwooferPool = filtered.filter((product) => isHtSubwooferTable(tableNameOf(product)));
    const allSubwooferPool = products.filter((product) => isHtSubwooferTable(tableNameOf(product)));

    const byTable = {
        receiver: filtered.filter((product) => isHtReceiverTable(tableNameOf(product))),
        front: filtered.filter((product) => ["front_speaker", "floor_speakers"].includes(tableNameOf(product))),
        side: filtered.filter((product) => ["side_speaker", "ceiling_speakers", "floor_speakers"].includes(tableNameOf(product))),
        back: filtered.filter((product) => ["back_speaker", "side_speaker", "ceiling_speakers", "floor_speakers"].includes(tableNameOf(product))),
        center: filtered.filter((product) => ["center_speakers", "front_speaker", "floor_speakers"].includes(tableNameOf(product))),
        floor: filtered.filter((product) => tableNameOf(product) === "floor_speakers"),
        ceiling: filtered.filter((product) => tableNameOf(product) === "ceiling_speakers"),
        subwoofer: subwooferPool,
    };

    const fallbackSpeakerPool = speakerPool.length ? speakerPool : allSpeakerPool;
    const pickRolePool = (primaryPool, secondaryPools = []) => {
        const pools = [primaryPool, ...secondaryPools].filter((pool) => Array.isArray(pool) && pool.length);
        return pools[0] || [];
    };

    const receiverBase = pickMultipleBest(
        byTable.receiver.length ? byTable.receiver : allReceivers,
        layout.receiver,
        (product) => scoreHt(product, 60000)
    );
    const frontPool = pickRolePool(byTable.front, [byTable.floor || [], fallbackSpeakerPool]);
    const sidePool = pickRolePool(byTable.side, [byTable.back, byTable.floor || [], byTable.ceiling || [], fallbackSpeakerPool]);
    const backPool = pickRolePool(byTable.back, [byTable.side, byTable.floor || [], byTable.ceiling || [], fallbackSpeakerPool]);
    const centerPool = pickRolePool(byTable.center, [byTable.front, byTable.floor || [], fallbackSpeakerPool]);

    const usedRoleKeys = new Set();
    const rememberRole = (entries) => {
        for (const product of entries || []) {
            usedRoleKeys.add(getHtPairKey(product));
        }
        return entries;
    };

    const frontBase = rememberRole(
        pickHtRoleProducts(frontPool, layout.front, (product) => scoreHt(product, 40000), {
            preferSameModel: true,
        })
    );
    const centerBase = rememberRole(
        pickHtRoleProducts(centerPool, layout.center, (product) => scoreHt(product, 20000), {
            excludeKeys: Array.from(usedRoleKeys),
        })
    );
    const sideBase = rememberRole(
        pickHtRoleProducts(sidePool, layout.side, (product) => scoreHt(product, 25000), {
            preferSameModel: true,
            excludeKeys: Array.from(usedRoleKeys),
        })
    );
    const backBase = rememberRole(
        pickHtRoleProducts(backPool, layout.back, (product) => scoreHt(product, 25000), {
            preferSameModel: true,
            excludeKeys: Array.from(usedRoleKeys),
        })
    );
    const subBase = rememberRole(pickHtRoleProducts(
        byTable.subwoofer.length ? byTable.subwoofer : allSubwooferPool,
        layout.subwoofer,
        (product) => scoreHt(product, 30000),
        {
            preferSameModel: true,
            excludeKeys: Array.from(usedRoleKeys),
        }
    ));

    const parts = [
        ...duplicateToCount(receiverBase, layout.receiver, "receiver"),
        ...assignHtRoleEntries(frontBase, ["front_left", "front_right"].slice(0, layout.front)),
        ...assignHtRoleEntries(sideBase, ["side_left", "side_right"].slice(0, layout.side)),
        ...assignHtRoleEntries(backBase, ["back_left", "back_right"].slice(0, layout.back)),
        ...assignHtRoleEntries(centerBase, layout.center ? ["center"] : []),
        ...assignHtRoleEntries(subBase, ["subwoofer_1", "subwoofer_2"].slice(0, layout.subwoofer)),
    ];

    const total = parts.reduce((sum, entry) => sum + getNumericPrice(entry.product), 0);
    const requiredSlots = buildHtRolePlan(layout);

    const counts = parts.reduce((acc, entry) => {
        acc[entry.slot] = (acc[entry.slot] || 0) + 1;
        return acc;
    }, {});

    const missingSlots = [];
    for (const slot of requiredSlots) {
        const have = counts[slot] || 0;
        if (have < 1) {
            missingSlots.push(slot);
        }
    }

    return {
        parts,
        total,
        layout,
        missingSlots,
    };
}

function scorePcCandidate(product, preferredMinPrice = 0) {
    const price = getNumericPrice(product);
    let score = 0;

    if (price > 0) score += Math.min(price / 1000, 300);
    if (price >= preferredMinPrice) score += 40;
    if (getNormalizedSocket(product)) score += 80;
    if (getNormalizedRamType(product)) score += 40;
    if (String(product?.name || "").length > 6) score += 10;

    return score;
}

function pickBestProduct(products, scorer) {
    return [...(products || [])]
        .sort((a, b) => scorer(b) - scorer(a))
        .find(Boolean) || null;
}

function buildPcRecommendation(products, budget = null) {
    const byTable = {
        cpu: products.filter((product) => normalize(product?.table_name || product?.source_table) === "processors"),
        motherboard: products.filter((product) => normalize(product?.table_name || product?.source_table) === "motherboard"),
        ram: products.filter((product) => normalize(product?.table_name || product?.source_table) === "ram"),
        gpu: products.filter((product) => normalize(product?.table_name || product?.source_table) === "video_cards"),
        psu: products.filter((product) => normalize(product?.table_name || product?.source_table) === "psu"),
        cooler: products.filter((product) => normalize(product?.table_name || product?.source_table) === "cpu_coolers"),
        storage: products.filter((product) => ["storages", "storage", "storage_devices"].includes(normalize(product?.table_name || product?.source_table))),
    };

    const targetCpuMin = budget ? Math.max(15000, Math.round(budget * 0.12)) : 25000;
    const cpu = pickBestProduct(byTable.cpu, (product) => scorePcCandidate(product, targetCpuMin)) || null;
    const cpuSocket = getNormalizedSocket(cpu);

    const compatibleMotherboards = byTable.motherboard.filter((product) => {
        const socket = getNormalizedSocket(product);
        if (!cpuSocket || !socket) return false;
        return socket === cpuSocket;
    });

    const motherboard = pickBestProduct(
        compatibleMotherboards.length ? compatibleMotherboards : byTable.motherboard,
        (product) => scorePcCandidate(product, budget ? Math.max(12000, Math.round(budget * 0.08)) : 18000)
    ) || null;

    const boardRamType = getNormalizedRamType(motherboard);
    const compatibleRams = byTable.ram.filter((product) => {
        const ramType = getNormalizedRamType(product);
        if (!boardRamType || !ramType) return false;
        return ramType === boardRamType;
    });

    const ram = pickBestProduct(
        compatibleRams.length ? compatibleRams : byTable.ram,
        (product) => scorePcCandidate(product, budget ? Math.max(10000, Math.round(budget * 0.06)) : 14000)
    ) || null;

    const gpu = pickBestProduct(
        byTable.gpu,
        (product) => scorePcCandidate(product, budget ? Math.max(30000, Math.round(budget * 0.18)) : 45000)
    ) || null;

    const storage = pickBestProduct(
        byTable.storage,
        (product) => scorePcCandidate(product, budget ? Math.max(10000, Math.round(budget * 0.05)) : 12000)
    ) || null;

    const compatibleCoolers = byTable.cooler.filter((product) => {
        const socket = getNormalizedSocket(product);
        if (!cpuSocket || !socket) return false;
        return socket === cpuSocket;
    });

    const cooler = pickBestProduct(
        compatibleCoolers.length ? compatibleCoolers : byTable.cooler,
        (product) => scorePcCandidate(product, budget ? Math.max(6000, Math.round(budget * 0.03)) : 8000)
    ) || null;

    const baseTotal =
        getNumericPrice(cpu) +
        getNumericPrice(motherboard) +
        getNumericPrice(ram) +
        getNumericPrice(gpu) +
        getNumericPrice(storage) +
        getNumericPrice(cooler);

    const psu = pickBestProduct(byTable.psu.filter((product) => {
        const nextTotal = baseTotal + getNumericPrice(product);
        if (!budget) return true;
        return nextTotal <= budget;
    }), (product) => scorePcCandidate(product, budget ? Math.max(12000, Math.round(budget * 0.06)) : 16000))
        || pickBestProduct(byTable.psu, (product) => scorePcCandidate(product, budget ? Math.max(12000, Math.round(budget * 0.06)) : 16000))
        || null;

    const parts = [
        { slot: "processzor", product: cpu },
        { slot: "procihuto", product: cooler },
        { slot: "alaplap", product: motherboard },
        { slot: "ram", product: ram },
        { slot: "gpu", product: gpu },
        { slot: "tapegyseg", product: psu },
    ].filter((entry) => !!entry.product);

    const total = parts.reduce((sum, entry) => sum + getNumericPrice(entry.product), 0);

    return {
        parts,
        total,
        missingSlots: ["processzor", "procihuto", "alaplap", "ram", "gpu", "tapegyseg"]
            .filter((slot) => !parts.some((entry) => entry.slot === slot)),
        compatibility: {
            cpu_socket: cpuSocket || null,
            motherboard_socket: getNormalizedSocket(motherboard) || null,
            ram_type: boardRamType || getNormalizedRamType(ram) || null,
            socket_match: !!cpuSocket && !!getNormalizedSocket(motherboard) && cpuSocket === getNormalizedSocket(motherboard),
            ram_match: !!(boardRamType && getNormalizedRamType(ram) && boardRamType === getNormalizedRamType(ram)),
        }
    };
}

function uniqueBy(items, getKey) {
    const map = new Map();
    for (const item of items || []) {
        const key = getKey(item);
        if (!key || map.has(key)) continue;
        map.set(key, item);
    }
    return Array.from(map.values());
}

function isListQuestion(question = "") {
    const q = normalize(question);
    return [
        "listaz",
        "listazd",
        "sorold",
        "mutasd",
        "milyen",
        "miket",
        "osszes",
        "ajanlj",
        "ajanlas",
        "termekeket",
        "termekek",
    ].some((word) => q.includes(word));
}

async function extractBrand(question = "") {
    const q = normalize(question);
    const brands = await listBrands();

    const found = (brands || [])
        .map((brand) => String(brand || "").trim())
        .filter(Boolean)
        .sort((a, b) => b.length - a.length)
        .find((brand) => q.includes(normalize(brand)));

    return found || null;
}

function buildSearchFields(product) {
    return [
        product?.name,
        product?.model,
        product?.manufacturer,
        product?.table_name,
        product?.source_table,
        product?.type,
        product?.category,
    ]
        .map((value) => normalize(value))
        .filter(Boolean)
        .join(" ");
}

function scoreProduct(product, question) {
    const q = normalize(question);
    const qTokens = tokenize(question);
    const fields = buildSearchFields(product);
    const name = normalize(product?.name);
    const model = normalize(product?.model);
    const manufacturer = normalize(product?.manufacturer);
    const tableName = normalize(product?.table_name || product?.source_table);

    let score = 0;

    if (!q) return score;
    if (name && q.includes(name)) score += 120;
    if (model && q.includes(model)) score += 100;
    if (manufacturer && q.includes(manufacturer)) score += 30;
    if (tableName && q.includes(tableName)) score += 20;

    for (const token of qTokens) {
        if (token.length < 2) continue;
        if (name.includes(token)) score += 16;
        if (model.includes(token)) score += 14;
        if (manufacturer.includes(token)) score += 8;
        if (fields.includes(token)) score += 4;
    }

    return score;
}

function sortByScore(products, question) {
    return [...products].sort((a, b) => {
        const scoreDiff = scoreProduct(b, question) - scoreProduct(a, question);
        if (scoreDiff !== 0) return scoreDiff;
        return String(a?.name || a?.model || "").localeCompare(String(b?.name || b?.model || ""), "hu");
    });
}

async function searchProducts(message) {
    const context = detectQuestionContext(message);
    const allProducts = await listProducts({ limit: 5000, category: context.category || "all" });
    const brand = await extractBrand(message);
    const listIntent = isListQuestion(message);
    const budget = context.budget;

    const budgetFiltered = budget
        ? allProducts.filter((product) => {
            const price = Number(product?.price || 0);
            if (!Number.isFinite(price) || price <= 0) return context.isPcBuild;
            return price <= budget;
        })
        : allProducts;

    const scored = sortByScore(budgetFiltered, message);

    if (context.isPcBuild) {
        const recommendation = buildPcRecommendation(scored, budget);

        if (recommendation.parts.length) {
            return {
                mode: "list",
                brand,
                list: recommendation.parts.map((entry) => entry.product),
                category: context.category,
                budget,
                buildTotal: recommendation.total,
                buildIntent: true,
                requiredParts: ["processzor", "procihuto", "alaplap", "ram", "gpu", "tapegyseg"],
                compatibility: recommendation.compatibility,
                missingSlots: recommendation.missingSlots,
                buildParts: recommendation.parts.map((entry) => ({
                    slot: entry.slot,
                    product: entry.product,
                })),
            };
        }
    }

    if (context.isHtBuild) {
        const recommendation = buildHtRecommendation(scored, budget, brand, message);
        if (recommendation.parts.length) {
            return {
                mode: "list",
                brand,
                list: recommendation.parts.map((entry) => entry.product),
                category: context.category,
                budget,
                htIntent: true,
                htLayout: recommendation.layout,
                buildTotal: recommendation.total,
                missingSlots: recommendation.missingSlots,
                buildParts: recommendation.parts.map((entry) => ({
                    slot: entry.slot,
                    product: entry.product,
                })),
            };
        }
    }

    if (listIntent) {
        const list = uniqueBy(
            scored.filter((product) => {
                if (brand) {
                    return normalize(product?.manufacturer).includes(normalize(brand));
                }

                return scoreProduct(product, message) > 0;
            }),
            (product) => `${product?.table_name || product?.source_table}:${product?.id}`
        ).slice(0, 24);

        return {
            mode: list.length ? "list" : "none",
            brand,
            list,
            category: context.category,
            budget,
        };
    }

    const exact = uniqueBy(
        scored.filter((product) => scoreProduct(product, message) >= 18),
        (product) => `${product?.table_name || product?.source_table}:${product?.id}`
    ).slice(0, 6);

    return {
        mode: exact.length ? "product" : "none",
        brand,
        exact,
        category: context.category,
        budget,
    };
}

function summarizeOverviewForQuestion(overview, message) {
    const normalizedQuestion = normalize(message);
    const relevantTypes = (overview?.typeCounts || []).filter((entry) => {
        const type = normalize(entry?.type);
        const sampleText = (entry?.samples || [])
            .map((sample) => normalize(sample?.name || sample?.manufacturer || ""))
            .join(" ");

        if (!normalizedQuestion) return false;
        return normalizedQuestion.includes(type) || type.includes(normalizedQuestion) || sampleText.includes(normalizedQuestion);
    });

    return {
        totalProducts: overview?.totalProducts || 0,
        topTypes: (overview?.typeCounts || []).slice(0, 12).map((entry) => ({
            type: entry.type,
            count: entry.count,
        })),
        relevantTypes: relevantTypes.slice(0, 8).map((entry) => ({
            type: entry.type,
            count: entry.count,
            samples: (entry.samples || []).slice(0, 5).map((sample) => ({
                id: sample.id,
                name: sample.name,
                manufacturer: sample.manufacturer,
                table_name: sample.table_name,
            })),
        })),
        topManufacturers: (overview?.manufacturerCounts || []).slice(0, 12),
        topTables: (overview?.tableCounts || []).slice(0, 12),
    };
}

async function generateAnswer(message, products, history = [], overviewSummary = null, aiData = null) {
    if (aiData?.buildIntent && Array.isArray(aiData?.buildParts) && aiData.buildParts.length) {
        return buildPcAnswer(aiData);
    }

    if (aiData?.htIntent && Array.isArray(aiData?.buildParts) && aiData.buildParts.length) {
        return buildHtAnswer(aiData);
    }

    const historyPrompt = history.length
        ? `ELOZMENYEK:\n${history.map((item) => `${item.role === "user" ? "Felhasznalo" : "AI"}: ${item.text}`).join("\n")}\n`
        : "";

    const prompt = `
Te a SetupConfigurator magyar nyelvu AI asszisztense vagy.

${historyPrompt}

A felhasznalo most ezt irta:
"${message}"

KATALOGUS OSSZEGZES A products + values + properties modellbol:
${JSON.stringify(overviewSummary || {}, null, 2)}

Talalatok az adatbazisbol:
${JSON.stringify(products, null, 2)}

KERESI KONTEXTUS:
${JSON.stringify({
        category: aiData?.category || "all",
        budget: aiData?.budget || null,
        buildIntent: !!aiData?.buildIntent,
        buildTotal: aiData?.buildTotal || null,
        requiredParts: aiData?.requiredParts || null,
        compatibility: aiData?.compatibility || null,
    }, null, 2)}

Szabalyok:
1. Magyarul valaszolj.
2. A valaszod a products, values es properties adataihoz igazodjon, ne talalj ki keszletet vagy darabszamot.
3. Ha a felhasznalo mennyisegre kerdez ra, hasznald a katalogus osszegzes totalProducts, typeCounts vagy relevantTypes adatait.
4. Ha vannak talalatok, azokat termeszetesen, rendezett stilusban mutasd be.
5. Ha nincs konkret talalat, de a katalogus osszegzesbol tudsz relevans kategoriat vagy peldakat mondani, akkor azt tedd meg.
6. Ne irj JSON-t vagy technikai szoveget.
7. Ha ar is van, emeld ki Ft formaban.
8. Ha a kerdes PC epitesrol szol, csak szamitogepes alkatreszekbol valassz, ne keverj hangfalat, hangkartyat vagy mas kategoriat.
9. Ha koltsegkeret van a kerdesben, tartsd magad ahhoz, es emeld ki a becsult osszarat.
10. PC epitesnel gondolkodj ugy, hogy egy teljes gephez legalabb ezek kellenek: processzor, procihuto, alaplap, RAM, videokartya, tarhely, tapegyseg.
11. PC epitesnel figyeld a kompatibilitast: CPU socket passzoljon az alaplaphoz, RAM tipusa passzoljon az alaplaphoz, es lehetőleg ne ajanlj nyilvanvaloan ossze nem illo kombinaciot.
`;

    try {
        const result = await model.generateContent(prompt);
        return result.response.text();
    } catch (error) {
        return buildFallbackAnswer(message, products, overviewSummary, aiData);
    }
}

function buildPcAnswer(aiData) {
    const lines = ["Osszeraktam egy javasolt gepet a jelenlegi adatbazis alapjan:"];

    for (const entry of aiData.buildParts || []) {
        const product = entry?.product;
        if (!product) continue;

        const title = product?.name || [product?.manufacturer, product?.model].filter(Boolean).join(" ");
        const price = product?.price ? `${product.price} Ft` : "ar nincs megadva";
        const socket = getNormalizedSocket(product);
        const ramType = getNormalizedRamType(product);

        let details = `${title} - ${price}`;
        if (socket) details += ` - socket: ${socket}`;
        if (ramType) details += ` - ${ramType}`;

        lines.push(`### ${entry.slot}`);
        lines.push(`- ${details}`);
    }

    const compatibilityNotes = [];
    if (aiData?.compatibility?.socket_match) {
        compatibilityNotes.push(`CPU/alaplap socket rendben: ${aiData.compatibility.cpu_socket}`);
    }
    if (aiData?.compatibility?.ram_match && aiData?.compatibility?.ram_type) {
        compatibilityNotes.push(`RAM kompatibilitas rendben: ${aiData.compatibility.ram_type}`);
    }
    if (compatibilityNotes.length) {
        lines.push("### Kompatibilitas");
        for (const note of compatibilityNotes) {
            lines.push(`- ${note}`);
        }
    }

    if (aiData?.missingSlots?.length) {
        lines.push("### Hianyzo elemek");
        for (const slot of aiData.missingSlots) {
            lines.push(`- ${slot}`);
        }
    }

    if (aiData?.buildTotal) {
        lines.push(`### Becsult vegosszeg`);
        lines.push(`- ${aiData.buildTotal} Ft`);
    }

    lines.push("Ha szeretned, a kovetkezo korben tudok egy olcsobb, erosebb vagy jatekra optimalizalt valtozatot is osszerakni.");
    return lines.join("\n");
}

function buildHtAnswer(aiData) {
    const lines = [`Osszeraktam egy javasolt ${aiData?.htLayout?.channels || "hazimozi"} hazimozit a jelenlegi adatbazis alapjan:`];

    const grouped = {};

    for (const entry of aiData.buildParts || []) {
        if (!grouped[entry.slot]) grouped[entry.slot] = [];
        grouped[entry.slot].push(entry.product);
    }

    const labels = {
        receiver: "Receiver / erosito",
        front_left: "Front left",
        front_right: "Front right",
        side_left: "Side left",
        side_right: "Side right",
        back_left: "Back left",
        back_right: "Back right",
        center: "Center",
        subwoofer_1: "Subwoofer 1",
        subwoofer_2: "Subwoofer 2",
    };

    for (const slot of ["receiver", "front_left", "front_right", "center", "side_left", "side_right", "back_left", "back_right", "subwoofer_1", "subwoofer_2"]) {
        const items = grouped[slot] || [];
        if (!items.length) continue;

        lines.push(`### ${labels[slot]}`);
        for (const product of items) {
            const title = product?.name || [product?.manufacturer, product?.model].filter(Boolean).join(" ");
            const price = product?.price ? `${product.price} Ft` : "ar nincs megadva";
            lines.push(`- ${title} - ${price}`);
        }
    }

    if (aiData?.missingSlots?.length) {
        lines.push("### Hianyzo elemek");
        for (const slot of aiData.missingSlots) {
            lines.push(`- ${labels[slot] || slot}`);
        }
    }

    if (aiData?.buildTotal) {
        lines.push("### Becsult vegosszeg");
        lines.push(`- ${aiData.buildTotal} Ft`);
    }

    lines.push("Ha szeretned, a kovetkezo korben tudok olcsobb, premium vagy kifejezetten filmre optimalizalt valtozatot is osszerakni.");
    return lines.join("\n");
}

function buildFallbackAnswer(message, products, overviewSummary = null, aiData = null) {
    if (aiData?.buildIntent && Array.isArray(aiData?.buildParts) && aiData.buildParts.length) {
        return buildPcAnswer(aiData);
    }

    if (aiData?.htIntent && Array.isArray(aiData?.buildParts) && aiData.buildParts.length) {
        return buildHtAnswer(aiData);
    }

    const totalProducts = Number(overviewSummary?.totalProducts || 0);
    const relevantTypes = Array.isArray(overviewSummary?.relevantTypes) ? overviewSummary.relevantTypes : [];
    const topTypes = Array.isArray(overviewSummary?.topTypes) ? overviewSummary.topTypes : [];

    if (Array.isArray(products) && products.length) {
        const preview = products
            .slice(0, 8)
            .map((product) => {
                const title = product?.name || [product?.manufacturer, product?.model].filter(Boolean).join(" ");
                const price = product?.price ? ` - ${product.price} Ft` : "";
                return `- ${title}${price}`;
            })
            .join("\n");

        return `Talaltam nehany relevans termeket:\n${preview}`;
    }

    if (relevantTypes.length) {
        const summary = relevantTypes
            .slice(0, 5)
            .map((entry) => `${entry.type}: ${entry.count} db`)
            .join(", ");

        return `A kerdesedhez kapcsolodo kategoriakbol ezt latom az adatbazisban: ${summary}. Pontosabb keresessel szivesen leszukitem.`;
    }

    if (topTypes.length) {
        const summary = topTypes
            .slice(0, 5)
            .map((entry) => `${entry.type}: ${entry.count} db`)
            .join(", ");

        return totalProducts
            ? `Az adatbazis jelenleg ${totalProducts} termeket tartalmaz. A legnagyobb kategoriak: ${summary}.`
            : "Most nem talaltam eleg adatot a biztos valaszhoz, de ujra meg tudom probalni pontosabb kerdesre.";
    }

    return "Most nem talaltam eleg adatot a biztos valaszhoz, de ujra meg tudom probalni pontosabb kerdesre.";
}

async function runAiPrompt({ message, history = [], panelId = null, userId = null, persist = true }) {
    const startedAt = Date.now();

    if (!message) {
        throw new Error("Missing message");
    }

    const aiData = await searchProducts(message);
    let overviewSummary = null;

    try {
        const overview = await getCatalogOverview();
        overviewSummary = summarizeOverviewForQuestion(overview, message);
    } catch (error) {
        overviewSummary = null;
    }

    const promptProducts =
        aiData.mode === "list" ? aiData.list :
        aiData.mode === "product" ? aiData.exact :
        [];

    const answer = await generateAnswer(message, promptProducts, history, overviewSummary, aiData);
    const elapsedSeconds = Math.max(0, Math.ceil((Date.now() - startedAt) / 1000));

    let resolvedPanelId = null;

    if (persist && Number.isFinite(Number(userId)) && Number(userId) > 0) {
        const panel = await ensureAiPanel(Number(userId), panelId);
        await insertAiTextWithDuration(panel.id, answer, message, elapsedSeconds);
        resolvedPanelId = String(panel.id);
    }

    return {
        answer,
        data: aiData,
        panel_id: resolvedPanelId,
        messages_id: resolvedPanelId,
        time: elapsedSeconds,
    };
}

exports.runAiPrompt = runAiPrompt;

exports.askAi = async (req, res) => {
    try {
        const result = await runAiPrompt({
            message: req.body?.message,
            history: Array.isArray(req.body?.history) ? req.body.history : [],
            panelId: req.body?.panel_id ?? req.body?.messages_id,
            userId: Number(req.user?.id),
            persist: true
        });

        return res.json(result);
    } catch (error) {
        console.error("AI ERROR:", error);
        return res.status(500).json({ error: "AI service error" });
    }
};
