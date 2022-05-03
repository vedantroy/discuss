export const accessControlSelector = {
    public: true,
    admins: { shortId: true },
    writers: { shortId: true },
} as const;
