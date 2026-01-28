const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

async function sendWelcomeEmail(to, username) {
    await transporter.sendMail({
        from: process.env.MAIL_FROM,
        to,
        subject: "🎉 Sikeres regisztráció – Setup Configurator",
        html: `
            <h2>Szia ${username}!</h2>
            <p>Sikeresen regisztráltál a <b>Setup Configurator</b> oldalra.</p>
            <p>Most már be tudsz jelentkezni és elkezdheted az összeállításaidat 🚀</p>
            <hr>
            <small>Ez egy automatikus email.</small>
        `
    });
}

module.exports = { sendWelcomeEmail };
