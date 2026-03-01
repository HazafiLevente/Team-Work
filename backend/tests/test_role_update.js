const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { updateUserEnvRole, ROLES } = require('../services/control');
const fs = require('fs');

async function test() {
    console.log("Existing ADMINS:", process.env.ADMINS);

    const testUserId = 999;
    updateUserEnvRole(testUserId, 'admin');

    console.log("Memory ADMINS:", Array.from(ROLES.admins));

    const envPath = path.join(__dirname, '..', '.env');
    const content = fs.readFileSync(envPath, 'utf-8');
    const line = content.split('\n').find(l => l.trim().startsWith('ADMINS='));
    console.log("File line:", line);

    // Cleanup
    updateUserEnvRole(testUserId, 'user');
    console.log("Cleanup done.");
}

test();
