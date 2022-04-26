type LayoutProps = {
    children: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
};

export const Row = (
    { children, className = "", style = {} }: LayoutProps,
) => <div className={`flex flex-row ${className}`} style={style}>{children}</div>;

export const Col = (
    { children, className = "", style = {} }: LayoutProps,
) => <div className={`flex flex-col ${className}`} style={style}>{children}</div>;
