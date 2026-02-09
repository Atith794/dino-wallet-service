import { Router } from "express";
import { z } from "zod";
import { topupWallet, spendFromWallet, bonusWallet, getWalletBalance, getWalletMeta, } from "../services/walletService.js";
import { walletIdParamSchema, topupBodySchema, spendBodySchema, bonusBodySchema, } from "../validators/wallet.validators.js";
export const walletsRouter = Router();
function handleError(res, err) {
    if (err instanceof z.ZodError) {
        return res.status(422).json({
            ok: false,
            error: "Validation error",
            details: err,
        });
    }
    const msg = err?.message ?? "Unknown error";
    if (msg === "Wallet not found")
        return res.status(404).json({ ok: false, error: msg });
    if (msg === "Insufficient balance")
        return res.status(409).json({ ok: false, error: msg });
    return res.status(400).json({ ok: false, error: msg });
}
walletsRouter.post("/:walletId/topup", async (req, res) => {
    try {
        const { walletId } = walletIdParamSchema.parse(req.params);
        const body = topupBodySchema.parse(req.body);
        const result = await topupWallet({ walletId, ...body });
        res.json({ ok: true, ...result });
    }
    catch (err) {
        handleError(res, err);
    }
});
walletsRouter.post("/:walletId/spend", async (req, res) => {
    try {
        const { walletId } = walletIdParamSchema.parse(req.params);
        const body = spendBodySchema.parse(req.body);
        const result = await spendFromWallet({ walletId, ...body });
        res.json({ ok: true, ...result });
    }
    catch (err) {
        handleError(res, err);
    }
});
walletsRouter.post("/:walletId/bonus", async (req, res) => {
    try {
        const { walletId } = walletIdParamSchema.parse(req.params);
        const body = bonusBodySchema.parse(req.body);
        const result = await bonusWallet({ walletId, ...body });
        res.json({ ok: true, ...result });
    }
    catch (err) {
        handleError(res, err);
    }
});
walletsRouter.get("/:walletId/balance", async (req, res) => {
    try {
        const { walletId } = walletIdParamSchema.parse(req.params);
        const result = await getWalletBalance(walletId);
        res.json({ ok: true, ...result });
    }
    catch (err) {
        handleError(res, err);
    }
});
walletsRouter.get("/:walletId", async (req, res) => {
    try {
        const { walletId } = walletIdParamSchema.parse(req.params);
        const meta = await getWalletMeta(walletId);
        res.json({ ok: true, ...meta });
    }
    catch (err) {
        handleError(res, err);
    }
});
//# sourceMappingURL=wallets.js.map