export type TopupInput = {
    walletId: number;
    amount: number;
    referenceId: string;
    note?: string | undefined;
};
type WalletMeta = {
    walletId: number;
    userId: number;
    asset: {
        code: string;
        name: string;
    };
};
export declare function getWalletMeta(walletId: number): Promise<WalletMeta>;
export declare function getWalletBalance(walletId: number): Promise<{
    walletId: number;
    balance: number;
}>;
export declare function topupWallet(input: TopupInput): Promise<{
    walletId: number;
    balance: number;
    userId: number;
    asset: {
        code: string;
        name: string;
    };
    transaction: string;
    idempotent: boolean;
} | {
    walletId: number;
    balance: number;
    userId: number;
    asset: {
        code: string;
        name: string;
    };
    idempotent: boolean;
}>;
export type SpendInput = {
    walletId: number;
    amount: number;
    referenceId: string;
    note?: string | undefined;
};
export declare function spendFromWallet(input: SpendInput): Promise<{
    walletId: number;
    balance: number;
    userId: number;
    asset: {
        code: string;
        name: string;
    };
    idempotent: boolean;
    transaction: string;
} | {
    walletId: number;
    balance: number;
    userId: number;
    asset: {
        code: string;
        name: string;
    };
    idempotent: boolean;
}>;
export type BonusInput = {
    walletId: number;
    amount: number;
    referenceId: string;
    note?: string | undefined;
};
export declare function bonusWallet(input: BonusInput): Promise<{
    walletId: number;
    balance: number;
    userId: number;
    asset: {
        code: string;
        name: string;
    };
    idempotent: boolean;
    transaction: string;
} | {
    walletId: number;
    balance: number;
    userId: number;
    asset: {
        code: string;
        name: string;
    };
    idempotent: boolean;
}>;
export {};
//# sourceMappingURL=walletService.d.ts.map