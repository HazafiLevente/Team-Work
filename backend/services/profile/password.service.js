const bcrypt = require("bcryptjs");
const { supabase } = require("../../services/supabase");

async function changeUserPassword(userId, oldPassword, newPassword) {
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

    const passwordMatches = await bcrypt.compare(oldPassword, user.password);
    if (!passwordMatches) {
        const passwordError = new Error("Wrong password");
        passwordError.statusCode = 400;
        throw passwordError;
    }

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
