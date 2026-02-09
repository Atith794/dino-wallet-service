import express, {} from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import hpp from "hpp";
import { checkDbConnection } from "./db.js";
import { walletsRouter } from "./routes/wallets.js";
import { pool } from "./db.js";
dotenv.config();
const app = express();
const PORT = Number(process.env.PORT) || 3000;
app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(express.json({ limit: "100kb" }));
app.use(hpp());
app.use(helmet({}));
const allowedOrigins = (process.env.CORS_ORIGIN || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
app.use(cors({
    origin: (origin, cb) => {
        if (!origin)
            return cb(null, true);
        if (allowedOrigins.length === 0)
            return cb(null, true);
        if (allowedOrigins.includes(origin))
            return cb(null, true);
        return cb(new Error("CORS blocked: origin not allowed"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Idempotency-Key"],
}));
const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS) || 60_000;
const max = Number(process.env.RATE_LIMIT_MAX) || 120;
app.use(rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { ok: false, error: "Too many requests. Please try again later." },
}));
app.use("/wallets", walletsRouter);
app.get("/health", async (_req, res) => {
    try {
        const now = await checkDbConnection();
        res.json({ ok: true, db_status: "connected", time: now });
    }
    catch (error) {
        console.error("Your backend needs a doctor:", error);
        res
            .status(500)
            .json({ ok: false, db: "disconnected", error: error?.message ?? "Something went wrong" });
    }
});
// Central error handler to catches CORS origin errors
app.use((err, _req, res, _next) => {
    const msg = err?.message || "Internal error";
    res.status(400).json({ ok: false, error: msg });
});
app.listen(PORT, () => {
    console.log(`App is listening on port ${PORT}`);
});
async function shutdown(signal) {
    console.log(`${signal} received. Shutting down gracefully...`);
    try {
        await pool.end();
        console.log("PostgreSQL pool closed.");
    }
    catch (err) {
        console.error("Error while closing DB pool:", err);
    }
    finally {
        process.exit(0);
    }
}
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
//# sourceMappingURL=index.js.map