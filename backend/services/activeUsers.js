


const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;

const HISTORY_DIR = path.join(__dirname, "..", "..", "datas", "Jsons");
const HISTORY_FILE = path.join(HISTORY_DIR, "active-users-history.json");
const ACTIVE_WINDOW_MS = 60 * 1000;



const activeSessions = new Map();



let dailyHistory = {};


try {
    if (fs.existsSync(HISTORY_FILE)) {
        dailyHistory = JSON.parse(fs.readFileSync(HISTORY_FILE, "utf-8"));
    }
} catch {
    dailyHistory = {};
}


const todaySeenUserIds = new Set();
let todayRequestCount = 0;

function todayKey() {
    return new Date().toISOString().slice(0, 10);
}


let saveTimer = null;
function scheduleSave() {
    if (saveTimer) return;
    saveTimer = setTimeout(() => {
        saveTimer = null;
        try {

            const key = todayKey();


            const userDetails = [];
            todaySeenUserIds.forEach(id => {


                const session = activeSessions.get(id);
                userDetails.push({
                    id,
                    username: session?.username || `User#${id}`
                });
            });

            dailyHistory[key] = {
                unique: todaySeenUserIds.size,
                total_requests: todayRequestCount,
                users: userDetails
            };

            fs.writeFileSync(HISTORY_FILE, JSON.stringify(dailyHistory, null, 2), "utf-8");
        } catch {  }
    }, 2000);
}


function trackMiddleware(req, _res, next) {
    try {
        const token = req.cookies?.auth_token;
        if (token && JWT_SECRET) {
            const decoded = jwt.verify(token, JWT_SECRET);
            const userId = Number(decoded.id);
            const username = decoded.username || `User#${userId}`;

            activeSessions.set(userId, {
                lastSeen: Date.now(),
                username
            });

            todaySeenUserIds.add(userId);
            todayRequestCount++;
            scheduleSave();
        }
    } catch {  }
    next();
}


function getActiveUsers() {
    const now = Date.now();
    const online = [];

    for (const [userId, session] of activeSessions) {
        if (now - session.lastSeen < ACTIVE_WINDOW_MS) {
            online.push({
                id: userId,
                username: session.username,
                lastSeen: new Date(session.lastSeen).toISOString()
            });
        }
    }

    return online;
}

function getActiveCount() {
    const now = Date.now();
    let count = 0;
    for (const session of activeSessions.values()) {
        if (now - session.lastSeen < ACTIVE_WINDOW_MS) count++;
    }
    return count;
}

function getDailyHistory() {

    const key = todayKey();
    dailyHistory[key] = {
        unique: todaySeenUserIds.size,
        total_requests: todayRequestCount
    };


    const sorted = Object.entries(dailyHistory)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .slice(-90)
        .map(([date, data]) => ({
            date,
            unique: data.unique,
            total_requests: data.total_requests,
            users: data.users || []
        }));

    return sorted;
}

module.exports = { trackMiddleware, getActiveUsers, getActiveCount, getDailyHistory };
