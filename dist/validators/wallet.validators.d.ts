import { z } from "zod";
export declare const walletIdParamSchema: z.ZodObject<{
    walletId: z.ZodCoercedNumber<unknown>;
}, z.core.$strip>;
declare const baseTxnSchema: z.ZodObject<{
    amount: z.ZodCoercedNumber<unknown>;
    referenceId: z.ZodString;
    note: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const topupBodySchema: z.ZodObject<{
    amount: z.ZodCoercedNumber<unknown>;
    referenceId: z.ZodString;
    note: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const spendBodySchema: z.ZodObject<{
    amount: z.ZodCoercedNumber<unknown>;
    referenceId: z.ZodString;
    note: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const bonusBodySchema: z.ZodObject<{
    amount: z.ZodCoercedNumber<unknown>;
    referenceId: z.ZodString;
    note: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type TxnBody = z.infer<typeof baseTxnSchema>;
export {};
//# sourceMappingURL=wallet.validators.d.ts.map