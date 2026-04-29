const { supabase } = require("../../services/supabase");

async function getUserProfile(userId) {
    const { data: user, error } = await supabase
        .from("user[Auth]")
        .select("ID, UserName, Name, Email")
        .eq("ID", userId)
        .single();

    if (error) throw error;
    return user;
}

async function getOrCreateUserDetails(userId) {
    const { data, error } = await supabase
        .from("user_more[Auth]")
        .select("age, phone_number, city")
        .eq("user_id", userId)
        .single();

    if (!error) return data;
    if (error.code !== "PGRST116") throw error;

    const { data: inserted, error: insertError } = await supabase
        .from("user_more[Auth]")
        .insert({
            user_id: userId,
            age: null,
            phone_number: null,
            city: null
        })
        .select()
        .single();

    if (insertError) throw insertError;
    return inserted;
}

async function updateUserProfile(userId, profile) {
    const { username, fullname } = profile;
    const { error } = await supabase
        .from("user[Auth]")
        .update({
            UserName: username,
            Name: fullname
        })
        .eq("ID", userId);

    if (error) throw error;
}

async function upsertUserDetails(userId, profile) {
    const { phone, age, city } = profile;
    const details = {
        age: age ?? null,
        phone_number: phone ?? null,
        city: city ?? null
    };

    const { data: updatedRows, error: updateError } = await supabase
        .from("user_more[Auth]")
        .update(details)
        .eq("user_id", userId)
        .select("user_id");

    if (updateError) throw updateError;
    if (updatedRows && updatedRows.length > 0) return;

    const { error: insertError } = await supabase
        .from("user_more[Auth]")
        .insert({
            user_id: userId,
            ...details
        });

    if (insertError) throw insertError;
}

module.exports = {
    getOrCreateUserDetails,
    getUserProfile,
    updateUserProfile,
    upsertUserDetails
};
