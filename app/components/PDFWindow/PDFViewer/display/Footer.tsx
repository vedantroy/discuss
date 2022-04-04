type CardProps = {
    hotKey?: number;
    text: string;
};
const Card = ({ hotKey, text }: CardProps) => {
    return (
        <div className="card overflow-visible card-compact h-28 w-28 bg-zinc-200 shadow shadow-zinc-400">
            {hotKey !== undefined
                ? (
                    <div className="h-5 w-5 absolute left-[-6px] top-[-6px] bg-rose-400 text-center shadow shadow-rose-600 text-white">
                       {hotKey} 
                    </div>
                )
                : null}
            <div className="card-body" style={{ padding: "0.8rem" }}>
                <p className="max-h-24 overflow-hidden text-zinc-800">{text}</p>
            </div>
        </div>
    );
};

type PageProps = {
    page: number
}

const Page = ({ page }: PageProps) => {
    return (
            <>
            <div className="divider divider-horizontal my-3">{page}</div>
            <Card hotKey={3} text="long long long long long"/>
            <Card text="long tecxt !long long long long"/>
            </>
    )
}

export default function() {
    return (
        <div className="flex flex-row items-center absolute bottom-0 left-0 right-0 h-32 shadow shadow-zinc-500 bg-zinc-100 z-30">
            <Page page={3}/>
            <Page page={4}/>
        </div>
    );
}

// auto-assign keybindings to high-lighted comments
// *scroll* selected comments into view
