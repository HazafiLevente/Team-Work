let shuttingDown = false;

function registerProcessEvents() {
    process.on("beforeExit", (code) => {
        console.warn("[SERVER] beforeExit fired with code:", code);
    });

    process.on("exit", (code) => {
        console.warn("[SERVER] exit fired with code:", code);
    });

    process.on("uncaughtException", (error) => {
        console.error("[SERVER] uncaughtException:", error);
    });

    process.on("unhandledRejection", (reason) => {
        console.error("[SERVER] unhandledRejection:", reason);
    });

    process.on("SIGINT", () => {
        shuttingDown = true;
        console.warn("[SERVER] SIGINT received");
    });

    process.on("SIGTERM", () => {
        shuttingDown = true;
        console.warn("[SERVER] SIGTERM received");
    });
}

function isShuttingDown() {
    return shuttingDown;
}

module.exports = {
    registerProcessEvents,
    isShuttingDown
};
