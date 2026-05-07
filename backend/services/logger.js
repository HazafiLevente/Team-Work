/**
 * --------------------------------------------------------------------------
 *  SERVER EVENT LOGGER & CONSOLE HIJACKER
 * --------------------------------------------------------------------------
 *  Intersects all console output and persists it to a circular JSON buffer.
 *  Features asynchronous debounced saving to prevent I/O bottlenecks.
 */

const fs = require("fs");
const path = require("path");

// --- CONFIGURATION ---
const LOG_DIR = path.join(__dirname, "..", "..", "datas", "Jsons");
const LOG_FILE = path.join(LOG_DIR, "server-logs.json");
const MAX_ENTRIES = 2000; // Keep the file size manageable
const SAVE_DELAY_MS = 1000;

// Ensure log directory existence
if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
}

// --- LOG BUFFER INITIALIZATION ---
let logBuffer = [];

try {
    if (fs.existsSync(LOG_FILE)) {
        const raw = fs.readFileSync(LOG_FILE, "utf-8");
        logBuffer = JSON.parse(raw);
        if (!Array.isArray(logBuffer)) logBuffer = [];
    }
} catch (e) {
    logBuffer = []; // Fallback if JSON is corrupted
}

// --- PERSISTENCE LOGIC (DEBOUNCED) ---
let saveTimer = null;

/**
 * Persists the buffer to disk with a debounce to group multiple logs
 * into a single write operation.
 */
function scheduleSave() {
    if (saveTimer) return;
    saveTimer = setTimeout(() => {
        saveTimer = null;
        try {
            // Implement circular buffer (FIFO)
            if (logBuffer.length > MAX_ENTRIES) {
                logBuffer = logBuffer.slice(logBuffer.length - MAX_ENTRIES);
            }
            fs.writeFileSync(LOG_FILE, JSON.stringify(logBuffer, null, 2), "utf-8");
        } catch (err) {
            process.stderr.write(`❌ Logger failed to write to disk: ${err.message}\n`);
        }
    }, SAVE_DELAY_MS);
}

/**
 * Creates a structured log entry from console arguments.
 */
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
        level,
        message
    };

    logBuffer.push(entry);
    scheduleSave();
}

// --- CONSOLE HIJACKING ---

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

// --- PUBLIC API ---

/**
 * Retrieves logs with optional filtering and search capabilities.
 */
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

    // Newest first
    result.reverse();
    return result.slice(0, limit);
}

/**
 * Resets the log buffer and clears the file.
 */
function clearLogs() {
    logBuffer = [];
    scheduleSave();
}

module.exports = { getLogs, clearLogs };