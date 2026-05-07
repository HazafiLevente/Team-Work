/**
 * --------------------------------------------------------------------------
 *  EMAIL NOTIFICATION SERVICE
 * --------------------------------------------------------------------------
 *  Handles SMTP-based email delivery for user authentication flows.
 *  Uses Nodemailer to send registration codes, password resets, and welcome emails.
 */

const nodemailer = require("nodemailer");

/**
 * SMTP Transporter Configuration
 * Uses environment variables for security. Ensure SMTP_PORT is 587 for TLS.
 */
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587", 10),
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    },
    tls: {
        rejectUnauthorized: false // Helps with some shared hosting providers
    }
});

// --- EMAIL TEMPLATES ---

/**
 * Sends a friendly welcome email after successful onboarding.
 */
async function sendWelcomeEmail(to, username) {
    try {
        await transporter.sendMail({
            from: `"Setup Configurator" <${process.env.MAIL_FROM}>`,
            to,
            subject: "🎉 Sikeres regisztráció – Setup Configurator",
            html: `
                <div style="font-family: sans-serif; line-height: 1.5; color: #333;">
                    <h2>Szia ${username}!</h2>
                    <p>Sikeresen regisztráltál a <b>Setup Configurator</b> oldalra.</p>
                    <p>Most már be tudsz jelentkezni és összeállíthatod álmaid setupját! 🚀</p>
                    <hr style="border: 0; border-top: 1px solid #eee;">
                    <small>Ez egy automatikus üzenet, kérjük ne válaszolj rá.</small>
                </div>
            `
        });
    } catch (error) {
        console.error("❌ Welcome email failed:", error.message);
    }
}

/**
 * Sends a 2FA-style registration code.
 */
async function sendRegisterCode(to, code) {
    try {
        await transporter.sendMail({
            from: `"Security" <${process.env.MAIL_FROM}>`,
            to,
            subject: "🔐 Regisztrációs kód",
            html: `
                <div style="font-family: sans-serif; text-align: center;">
                    <h2>Regisztráció megerősítése</h2>
                    <p>Kérjük, használd az alábbi kódot a regisztráció befejezéséhez:</p>
                    <div style="background: #f4f4f4; padding: 20px; font-size: 32px; font-weight: bold; letter-spacing: 8px;">
                        ${code}
                    </div>
                    <p style="color: #666;">A kód <b>5 percig</b> érvényes.</p>
                </div>
            `
        });
    } catch (error) {
        console.error("❌ Registration code email failed:", error.message);
    }
}

/**
 * Sends a password reset verification code.
 */
async function sendPasswordResetCode(to, code) {
    try {
        await transporter.sendMail({
            from: `"Security" <${process.env.MAIL_FROM}>`,
            to,
            subject: "🔑 Jelszó visszaállítás",
            html: `
                <div style="font-family: sans-serif; text-align: center;">
                    <h2>Jelszó visszaállítás</h2>
                    <p>Kérted a jelszavad visszaállítását. A kódod:</p>
                    <div style="background: #fff3cd; border: 1px solid #ffeeba; padding: 20px; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #856404;">
                        ${code}
                    </div>
                    <p>Ha nem te kérted, hagyd figyelmen kívül ezt az üzenetet.</p>
                    <p style="color: #666;">A kód <b>5 percig</b> érvényes.</p>
                </div>
            `
        });
    } catch (error) {
        console.error("❌ Password reset email failed:", error.message);
    }
}

module.exports = {
    sendWelcomeEmail,
    sendRegisterCode,
    sendPasswordResetCode
};