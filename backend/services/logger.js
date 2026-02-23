/**
 * 📋 Centralized Logger Service
 * Intercepts all console.log / console.warn / console.error
 * and persists entries to a rolling JSON log file.
 */

const fs = require("fs");
const path = require("path");

const LOG_DIR = path.join(__dirname, "..", "..", "datas", "Jsons");
const LOG_FILE = path.join(LOG_DIR, "server-logs.json");
const MAX_ENTRIES = 2000; // max entries kept in the file

// Ensure directory exists
if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
}

// In-memory buffer
let logBuffer = [];

// Load existing logs on startup
try {
    if (fs.existsSync(LOG_FILE)) {
        const raw = fs.readFileSync(LOG_FILE, "utf-8");
        logBuffer = JSON.parse(raw);
        if (!Array.isArray(logBuffer)) logBuffer = [];
    }
} catch {
    logBuffer = [];
}

// ---- Persist (debounced) ----
let saveTimer = null;
function scheduleSave() {
    if (saveTimer) return;
    saveTimer = setTimeout(() => {
        saveTimer = null;
        try {
            // Trim old entries
            if (logBuffer.length > MAX_ENTRIES) {
                logBuffer = logBuffer.slice(logBuffer.length - MAX_ENTRIES);
            }
            fs.writeFileSync(LOG_FILE, JSON.stringify(logBuffer, null, 2), "utf-8");
        } catch (e) {
            // fallback – can't log here or we'd recurse
        }
    }, 1000);
}

// ---- Core log function ----
function addEntry(level, args) {
    const message = args
        .map(a => {
            if (typeof a === "string") return a;
            try { return JSON.stringify(a); } catch { return String(a); }
        })
        .join(" ");

    const entry = {
        id: Date.now() + Math.random().toString(36).slice(2, 6),
        timestamp: new Date().toISOString(),
        level,      // "log" | "warn" | "error"
        message
    };

    logBuffer.push(entry);
    scheduleSave();
}

// ---- Intercept console ----
const _origLog = console.log.bind(console);
const _origWarn = console.warn.bind(console);
const _origError = console.error.bind(console);

console.log = (...args) => {
    addEntry("log", args);
    _origLog(...args);
};

console.warn = (...args) => {
    addEntry("warn", args);
    _origWarn(...args);
};

console.error = (...args) => {
    addEntry("error", args);
    _origError(...args);
};

// ---- Public API ----
function getLogs({ limit = 200, level, search, since } = {}) {
    let result = [...logBuffer];

    if (level) {
        result = result.filter(e => e.level === level);
    }

    if (search) {
        const s = search.toLowerCase();
        result = result.filter(e => e.message.toLowerCase().includes(s));
    }

    if (since) {
        const sinceDate = new Date(since);
        result = result.filter(e => new Date(e.timestamp) >= sinceDate);
    }

    // newest first
    result.reverse();

    return result.slice(0, limit);
}

function clearLogs() {
    logBuffer = [];
    scheduleSave();
}

module.exports = { getLogs, clearLogs };
