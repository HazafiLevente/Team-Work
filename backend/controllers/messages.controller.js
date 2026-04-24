// controllers/messages.controller.js
const { supabase } = require("../services/supabase");

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

function mapAiText(row) {
    return {
        id: Number(pickField(row, ["id", "ID"])),
        panel_id: Number(pickField(row, ["panel_id", "ai_panel_id", "panelid", "messages_id", "ai_messages_id", "message_id"])),
        ai_text: String(pickField(row, ["ai_text", "answer", "assistant_text", "context_ai"]) || ""),
        user_text: String(pickField(row, ["user_text", "question", "prompt", "context_user"]) || ""),
        time: Number(pickField(row, ["time", "duration", "seconds"]) || 0),
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

async function deleteFromFirstAvailable(tableNames, idColumnCandidates, id) {
    let lastError = null;

    for (const tableName of tableNames) {
        for (const column of idColumnCandidates) {
            try {
                const result = await supabase.from(tableName).delete().eq(column, id);
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
    throw new Error("Delete failed for all AI tables");
}

async function ensureReportProperty(propertyName) {
    const { data: existing, error: findError } = await supabase
        .from("reports_properties[Admin]")
        .select("*")
        .ilike("property", propertyName)
        .maybeSingle();

    if (findError) throw findError;
    if (existing) return Number(pickField(existing, ["id", "ID"]));

    const { data: created, error: insertError } = await supabase
        .from("reports_properties[Admin]")
        .insert({ property: propertyName })
        .select("*")
        .single();

    if (insertError) throw insertError;
    return Number(pickField(created, ["id", "ID"]));
}

async function insertReportValue(payload) {
    const { error } = await supabase
        .from("reports_values[Admin]")
        .insert({
            report_id: payload.reportId,
            property_id: payload.propertyId,
            value: payload.value
        });

    if (error) throw error;
}

async function getAiPanel(panelId, userId) {
    const { data } = await selectFromFirstAvailable(AI_PANEL_TABLES, (tableName) =>
        supabase.from(tableName).select("*").eq("id", panelId).eq("user_id", userId).maybeSingle()
    );

    return data ? mapAiPanelRow(data) : null;
}

async function createAiPanel(userId) {
    const now = new Date().toISOString();
    const { data } = await insertIntoFirstAvailable(AI_PANEL_TABLES, () => ([
        { user_id: userId, created_at: now }
    ]));

    return mapAiPanelRow(data);
}

function getAiPanelTitle(panel) {
    return String(panel?.title || panel?.name || panel?.label || "Uj AI beszelgetes");
}

exports.createPanelAndMessage = async (req, res) => {
    try {
        const user1 = Number(req.user.id);
        const user2 = Number(req.body.user2_id);
        const context = req.body.context?.trim();

        // ✅ ha a user2 blokkolt téged, ne tudj panelt indítani
        const { data: rel } = await supabase
            .from('messages_relations[Messages]')
            .select('blocked')
            .eq('owner_id', user2)
            .eq('target_user_id', user1)
            .maybeSingle();

        if (rel?.blocked) {
            return res.status(403).json({ error: "Blocked" });
        }

        if (!user2) return res.status(400).json({ error: "Missing user2_id" });

        // 🔎 Panel keresés (mindkét irány)
        const { data: existing } = await supabase
            .from("messages_panel[Messages]")
            .select("*")
            .or(`and(user1_id.eq.${user1},user2_id.eq.${user2}),and(user1_id.eq.${user2},user2_id.eq.${user1})`)
            .limit(1);

        let panel;

        if (existing && existing.length > 0) {
            panel = existing[0];
        } else {
            // ➕ Panel létrehozás
            const { data: created, error } = await supabase
                .from("messages_panel[Messages]")
                .insert({
                    user1_id: user1,
                    user2_id: user2,
                    created_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) return res.status(500).json({ error: error.message });

            panel = created;
        }

        // ✉️ Ha van üzenet, akkor insert
        if (context) {
            await supabase
                .from("messages[Messages]")
                .insert({
                    messages_panel_id: panel.id,
                    user_id: user1,
                    context,
                    created_at: new Date().toISOString()
                });
        }

        res.json({ success: true, panelId: panel.id });

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};


/**
 * POST /api/messages/send
 */
exports.send = async (req, res) => {
    try {
        const user1 = Number(req.user.id);
        const user2 = Number(req.body.user2_id);
        const context = String(req.body.context || '');

        // ✅ ha a címzett (user2) blokkolt vagy tiltott téged, akkor ne tudj írni
        const { data: rel } = await supabase
            .from('messages_relations[Messages]')
            .select('blocked, disabled')
            .eq('owner_id', user2)
            .eq('target_user_id', user1)
            .maybeSingle();

        if (rel?.blocked) return res.status(403).json({ error: "Blocked" });
        if (rel?.disabled) return res.status(403).json({ error: "Disabled" });

        if (!user2 || !context.trim()) {
            return res.status(400).json({ error: "Missing data" });
        }

        // panel keresése (kétirányú)
        let { data: panel } = await supabase
            .from('messages_panel[Messages]')
            .select('*')
            .or(`and(user1_id.eq.${user1},user2_id.eq.${user2}),and(user1_id.eq.${user2},user2_id.eq.${user1})`)
            .limit(1);

        let panelId;

        if (panel && panel.length > 0) {
            panelId = panel[0].id;
        } else {
            const { data: created, error } = await supabase
                .from('messages_panel[Messages]')
                .insert({
                    user1_id: user1,
                    user2_id: user2,
                    title_user1: 'Chat',
                    title_user2: 'Chat',
                    created_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) return res.status(500).json({ error: error.message });

            panelId = created.id;
        }

        const { error: insertError } = await supabase
            .from('messages[Messages]')
            .insert({
                messages_panel_id: panelId,
                user_id: user1,
                context,
                created_at: new Date().toISOString()
            });

        if (insertError) {
            return res.status(500).json({ error: insertError.message });
        }

        return res.json({ success: true });

    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
};

exports.reportUser = async (req, res) => {
    try {
        const reporterUserId = Number(req.user.id);
        let reportedUserId = Number(req.body.reported_user_id || req.body.target_user_id);
        const panelId = Number(req.body.panel_id || req.body.conversation_key);
        const reportedMessageId = Number(req.body.message_id);
        const reportScope = String(req.body.report_scope || req.body.scope || "profile").trim() === "message"
            ? "message"
            : "profile";
        const title = String(req.body.title || "").trim();
        const reportType = String(req.body.report_type || req.body.type || "").trim();
        const reportMessage = String(req.body.message || req.body.report_message || "").trim();

        if (!panelId || !title || !reportType || !reportMessage) {
            return res.status(400).json({ error: "Missing report data" });
        }

        const { data: panel, error: panelError } = await supabase
            .from("messages_panel[Messages]")
            .select("id, user1_id, user2_id")
            .eq("id", panelId)
            .maybeSingle();

        if (panelError) return res.status(500).json({ error: panelError.message });
        if (!panel) return res.status(404).json({ error: "Conversation not found" });

        const participants = [Number(panel.user1_id), Number(panel.user2_id)];
        if (!participants.includes(reporterUserId)) {
            return res.status(403).json({ error: "Forbidden" });
        }

        let reportedMessageContext = "";

        if (reportScope === "message") {
            if (!Number.isFinite(reportedMessageId)) {
                return res.status(400).json({ error: "Missing message id" });
            }

            const { data: messageRow, error: messageError } = await supabase
                .from("messages[Messages]")
                .select("id, messages_panel_id, user_id, context")
                .eq("id", reportedMessageId)
                .eq("messages_panel_id", panelId)
                .maybeSingle();

            if (messageError) return res.status(500).json({ error: messageError.message });
            if (!messageRow) return res.status(404).json({ error: "Message not found" });

            reportedUserId = Number(messageRow.user_id);
            reportedMessageContext = String(messageRow.context || "");
        }

        if (!reportedUserId || !participants.includes(reportedUserId)) {
            return res.status(403).json({ error: "Forbidden" });
        }

        if (reportedUserId === reporterUserId) {
            return res.status(400).json({ error: "You cannot report yourself" });
        }

        const { data: report, error: reportError } = await supabase
            .from("reports[Admin]")
            .insert({
                title,
                created_at: new Date().toISOString()
            })
            .select("*")
            .single();

        if (reportError) return res.status(500).json({ error: reportError.message });

        const reportId = Number(pickField(report, ["id", "ID"]));
        const propertyIds = {
            reporter_user_id: await ensureReportProperty("reporter_user_id"),
            reported_user_id: await ensureReportProperty("reported_user_id"),
            report_type: await ensureReportProperty("report_type"),
            report_message: await ensureReportProperty("report_message"),
            type: await ensureReportProperty("type"),
            message_id: reportScope === "message" ? await ensureReportProperty("message_id") : null,
            message_context: reportScope === "message" ? await ensureReportProperty("message_context") : null
        };

        const valuesToInsert = [
            insertReportValue({
                reportId,
                propertyId: propertyIds.reporter_user_id,
                value: String(reporterUserId)
            }),
            insertReportValue({
                reportId,
                propertyId: propertyIds.reported_user_id,
                value: String(reportedUserId)
            }),
            insertReportValue({
                reportId,
                propertyId: propertyIds.report_type,
                value: reportType
            }),
            insertReportValue({
                reportId,
                propertyId: propertyIds.report_message,
                value: reportMessage
            }),
            insertReportValue({
                reportId,
                propertyId: propertyIds.type,
                value: reportScope
            })
        ];

        if (reportScope === "message") {
            valuesToInsert.push(
                insertReportValue({
                    reportId,
                    propertyId: propertyIds.message_id,
                    value: String(reportedMessageId)
                }),
                insertReportValue({
                    reportId,
                    propertyId: propertyIds.message_context,
                    value: reportedMessageContext
                })
            );
        }

        await Promise.all(valuesToInsert);

        return res.json({ success: true, reportId });
    } catch (e) {
        console.error("Message report error:", e);
        return res.status(500).json({ error: e.message });
    }
};

/**
 * GET /api/messages/panels
 */
exports.getPanels = async (req, res) => {
    try {
        const userId = Number(req.user.id);

        const { data, error } = await supabase
            .from('messages_panel[Messages]')
            .select('*')
            .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
            .order('created_at', { ascending: false });

        if (error) return res.status(500).json({ error: error.message });

        return res.json(data || []);

    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
};

/**
 * GET /api/messages/panel/:id
 */
exports.getPanelMessages = async (req, res) => {
    try {
        const panelId = Number(req.params.id);

        const { data, error } = await supabase
            .from('messages[Messages]')
            .select('*')
            .eq('messages_panel_id', panelId)
            .order('created_at', { ascending: true });

        if (error) return res.status(500).json({ error: error.message });

        return res.json(data || []);

    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
};
exports.conversations = async (req, res) => {
    try {

        const userId = Number(req.user.id);

        const { data: panels, error } = await supabase
            .from("messages_panel[Messages]")
            .select("*")
            .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
            .order("created_at", { ascending: false });

        if (error) return res.status(500).json({ error: error.message });

        const conversations = [];

        for (const p of panels) {

            const otherUserId =
                p.user1_id === userId
                    ? p.user2_id
                    : p.user1_id;

            const { data: user } = await supabase
                .from("user[Auth]")
                .select("ID, UserName")
                .eq("ID", otherUserId)
                .single();

            conversations.push({
                key: String(p.id),
                title: user?.UserName || "Ismeretlen",
                otherUserId,
                lastAt: p.created_at,
                lastMessage: ""
            });

        }

        res.json(conversations);

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

exports.conversation = async (req, res) => {
    try {

        const panelId = Number(req.params.key);

        const { data, error } = await supabase
            .from("messages[Messages]")
            .select("*")
            .eq("messages_panel_id", panelId)
            .order("created_at", { ascending: true });

        if (error) {
            console.error(error);
            return res.status(500).json({ error: error.message });
        }

        res.json({ items: data });

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};
exports.editMessage = async (req, res) => {
    try {
        const messageId = Number(req.params.id);
        const userId = Number(req.user.id);
        const newText = String(req.body.context || '').trim();

        if (!newText) {
            return res.status(400).json({ error: "Empty message" });
        }

        // Lekérjük az üzenetet
        const { data: message, error } = await supabase
            .from('messages[Messages]')
            .select('*')
            .eq('id', messageId)
            .single();

        if (error || !message) {
            return res.status(404).json({ error: "Message not found" });
        }

        // 🔒 csak saját üzenet módosítható
        if (message.user_id !== userId) {
            return res.status(403).json({ error: "Not allowed" });
        }

        const { error: updateError } = await supabase
            .from('messages[Messages]')
            .update({ context: newText })
            .eq('id', messageId);

        if (updateError) {
            return res.status(500).json({ error: updateError.message });
        }

        res.json({ success: true });

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};
exports.deleteMessage = async (req, res) => {
    try {
        const messageId = Number(req.params.id);
        const userId = Number(req.user.id);

        const { data: message, error } = await supabase
            .from('messages[Messages]')
            .select('*')
            .eq('id', messageId)
            .single();

        if (error || !message) {
            return res.status(404).json({ error: "Message not found" });
        }

        if (message.user_id !== userId) {
            return res.status(403).json({ error: "Not allowed" });
        }

        const { error: deleteError } = await supabase
            .from('messages[Messages]')
            .delete()
            .eq('id', messageId);

        if (deleteError) {
            return res.status(500).json({ error: deleteError.message });
        }

        res.json({ success: true });

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// ✅ DELETE /api/messages/conversation/:key
exports.deleteConversation = async (req, res) => {
    try {
        const userId = Number(req.user.id);
        const key = Number(req.params.key); // panel id

        // 1️⃣ panel ellenőrzés + jogosultság
        const { data: panel, error: panelErr } = await supabase
            .from("messages_panel[Messages]")
            .select("id, user1_id, user2_id")
            .eq("id", key)
            .single();

        if (panelErr || !panel) {
            return res.status(404).json({ error: "Panel not found" });
        }

        if (panel.user1_id !== userId && panel.user2_id !== userId) {
            return res.status(403).json({ error: "Forbidden" });
        }

        // 2️⃣ üzenetek törlése (✅ helyes oszlop: messages_panel_id)
        const { error: msgErr } = await supabase
            .from("messages[Messages]")
            .delete()
            .eq("messages_panel_id", key);

        if (msgErr) {
            return res.status(500).json({ error: msgErr.message });
        }

        // 3️⃣ panel törlése (✅ helyes tábla: messages_panel[Messages])
        const { error: delErr } = await supabase
            .from("messages_panel[Messages]")
            .delete()
            .eq("id", key);

        if (delErr) {
            return res.status(500).json({ error: delErr.message });
        }

        return res.json({ ok: true });
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
};



// ✅ Relations (mute/disable/block)
async function upsertRelation(ownerId, targetId, patch) {

    const { data: existing, error: findErr } = await supabase
        .from('messages_relations[Messages]')
        .select('id')
        .eq('owner_id', ownerId)
        .eq('target_user_id', targetId)
        .maybeSingle();

    if (findErr) return { error: findErr };

    if (existing?.id) {
        return supabase
            .from('messages_relations[Messages]')
            .update({ ...patch, updated_at: new Date().toISOString() })
            .eq('id', existing.id)
            .select()
            .single();
    }

    return supabase
        .from('messages_relations[Messages]')
        .insert([{ owner_id: ownerId, target_user_id: targetId, ...patch }])
        .select()
        .single();
}

exports.setMute = async (req, res) => {
    try {
        const ownerId = Number(req.user.id);
        const targetId = Number(req.body.target_user_id);
        const muted = !!req.body.muted;

        if (!targetId) return res.status(400).json({ error: "Missing target_user_id" });

        const { data, error } = await upsertRelation(ownerId, targetId, { muted });
        if (error) return res.status(500).json({ error: error.message });

        res.json({ ok: true, relation: data });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

exports.setDisable = async (req, res) => {
    try {
        const ownerId = Number(req.user.id);
        const targetId = Number(req.body.target_user_id);
        const disabled = !!req.body.disabled;

        if (!targetId) return res.status(400).json({ error: "Missing target_user_id" });

        const { data, error } = await upsertRelation(ownerId, targetId, { disabled });
        if (error) return res.status(500).json({ error: error.message });

        res.json({ ok: true, relation: data });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

exports.setBlock = async (req, res) => {
    try {
        const ownerId = Number(req.user.id);
        const targetId = Number(req.body.target_user_id);
        const blocked = !!req.body.blocked;

        if (!targetId) return res.status(400).json({ error: "Missing target_user_id" });

        const { data, error } = await upsertRelation(ownerId, targetId, { blocked });
        if (error) return res.status(500).json({ error: error.message });

        res.json({ ok: true, relation: data });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

exports.aiCreateConversation = async (req, res) => {
    try {
        const userId = Number(req.user.id);
        const data = await createAiPanel(userId);

        return res.json({
            key: String(data.id),
            title: "Uj AI beszelgetes",
            lastText: "",
            updatedAt: data.created_at,
            messages: [
                {
                    id: Date.now(),
                    sender: "system",
                    text: "Kerdezz barmit, es itt folytathatod a korabbi AI beszelgeteseidet is.",
                    created_at: data.created_at
                }
            ]
        });
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
};

exports.aiConversations = async (req, res) => {
    try {
        const userId = Number(req.user.id);

        const { data: rawPanels } = await selectFromFirstAvailable(AI_PANEL_TABLES, (tableName) =>
            supabase.from(tableName).select("*").eq("user_id", userId).order("created_at", { ascending: false })
        );

        const panels = (rawPanels || []).map(mapAiPanelRow);

        const items = [];

        for (const panel of panels || []) {
            const { data: rawRows } = await selectFromFirstAvailable(AI_TEXTS_TABLES, (tableName) =>
                supabase.from(tableName).select("*").eq("panel_id", panel.id).order("created_at", { ascending: true })
            );

            const rows = (rawRows || []).map(mapAiText);

            const latest = (rows || []).length ? rows[rows.length - 1] : null;
            const firstQuestion = rows.find((row) => row.user_text)?.user_text || "";

            items.push({
                key: String(panel.id),
                title: firstQuestion ? (firstQuestion.length > 34 ? `${firstQuestion.slice(0, 34)}...` : firstQuestion) : "Uj AI beszelgetes",
                lastText: latest?.ai_text || latest?.user_text || "",
                updatedAt: latest?.created_at || panel.created_at,
            });
        }

        return res.json(items.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
};

exports.aiConversation = async (req, res) => {
    try {
        const userId = Number(req.user.id);
        const panelId = Number(req.params.key);

        const panel = await getAiPanel(panelId, userId);
        if (!panel) {
            return res.status(404).json({ error: "AI conversation not found" });
        }

        const { data: rawRows } = await selectFromFirstAvailable(AI_TEXTS_TABLES, (tableName) =>
            supabase.from(tableName).select("*").eq("panel_id", panelId).order("created_at", { ascending: true })
        );

        const rows = (rawRows || []).map(mapAiText);

        const items = [
            {
                id: panelId * 1000000,
                sender: "system",
                text: "Kerdezz barmit, es itt folytathatod a korabbi AI beszelgeteseidet is.",
                created_at: panel.created_at
            }
        ];

        for (const row of rows || []) {
            if (row.user_text) {
                items.push({
                    id: row.id * 2,
                    sender: "me",
                    text: row.user_text,
                    created_at: row.created_at
                });
            }

            if (row.ai_text) {
                items.push({
                    id: row.id * 2 + 1,
                    sender: "ai",
                    text: row.ai_text,
                    created_at: row.created_at
                });
            }
        }

        return res.json({
            key: String(panel.id),
            title: rows.find((row) => row.user_text)?.user_text || "Uj AI beszelgetes",
            items
        });
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
};

exports.aiDeleteConversation = async (req, res) => {
    try {
        const userId = Number(req.user.id);
        const panelId = Number(req.params.key);

        const panel = await getAiPanel(panelId, userId);
        if (!panel) {
            return res.status(404).json({ error: "AI conversation not found" });
        }

        try {
            await deleteFromFirstAvailable(AI_TEXTS_TABLES, ["panel_id", "ai_panel_id", "panelid"], panelId);
            await deleteFromFirstAvailable(AI_PANEL_TABLES, ["id", "ID"], panelId);
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }

        return res.json({ ok: true });
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
};

exports.aiRenameConversation = async (req, res) => {
    try {
        const userId = Number(req.user.id);
        const panelId = Number(req.params.key);
        const title = String(req.body.title || "").trim();

        if (!title) return res.status(400).json({ error: "Missing title" });

        const panel = await getAiPanel(panelId, userId);
        if (!panel) {
            return res.status(404).json({ error: "AI conversation not found" });
        }

        return res.json({ ok: true, skipped: true });
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
};
