/**
 * --------------------------------------------------------------------------
 *  PASSWORD SECURITY SERVICE
 * --------------------------------------------------------------------------
 *  Handles sensitive credential updates, including bcrypt verification
 *  and secure hashing for user authentication.
 */

const bcrypt = require("bcryptjs");
const { supabase } = require("../../services/supabase");

/**
 * Validates the old password and updates the user's credentials with a new hash.
 *
 * @param {string|number} userId - The unique identifier of the user.
 * @param {string} oldPassword - The current password for verification.
 * @param {string} newPassword - The new password to be hashed and stored.
 */
async function changeUserPassword(userId, oldPassword, newPassword) {
    // 1. Fetch current encrypted password
    const { data: user, error } = await supabase
        .from("user[Auth]")
        .select("password")
        .eq("ID", userId)
        .single();

    if (error || !user) {
        const notFoundError = new Error(error?.message || "User not found");
        notFoundError.statusCode = 500;
        throw notFoundError;
    }

    // 2. Verify identity via bcrypt comparison
    const passwordMatches = await bcrypt.compare(oldPassword, user.password);
    if (!passwordMatches) {
        const passwordError = new Error("Wrong password");
        passwordError.statusCode = 400;
        throw passwordError;
    }

    // 3. Hash new password and update record
    const hashed = await bcrypt.hash(newPassword, 10);
    const { error: updateError } = await supabase
        .from("user[Auth]")
        .update({ password: hashed })
        .eq("ID", userId);

    if (updateError) throw updateError;
}

module.exports = {
    changeUserPassword
};