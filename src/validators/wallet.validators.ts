import { z } from "zod";

export const walletIdParamSchema = z.object({
  walletId: z.coerce.number().int().positive(),
});

const baseTxnSchema = z.object({
  amount: z.coerce.number().int().positive(),
  referenceId: z.string().trim().min(3),
  note: z.string().trim().max(500).optional(),
});

export const topupBodySchema = baseTxnSchema;
export const spendBodySchema = baseTxnSchema;
export const bonusBodySchema = baseTxnSchema;

export type TxnBody = z.infer<typeof baseTxnSchema>;
