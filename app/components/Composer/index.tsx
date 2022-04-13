import React from "react";

export default function SubmitForm() {
    return (
        <div className="bg-black">
            <div>Hello!</div>
            <Composer />
        </div>
    );
}

const Input = (
    { className, ...props }: React.DetailedHTMLProps<React.InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>,
) => (
    <input
        {...props}
        className={`Border-Appearance ${className ? className : ""}`}
    />
);

export type ComposerProps = {
    text: "hello";
};

export function Composer() {
    // TODO(question): Why do we need mx-auto & left-0 right-0?
    return (
        <div className="absolute bottom-0 w-full max-w-[1475px] shadow-xl mx-auto left-0 right-0 flex flex-col gap-y-2">
            <div className="bg-sky-500 w-full h-2"></div>
            <div className="flex flex-row w-full justify-center gap-x-2">
                <div>
                    Preview..
                </div>
                <div className="flex flex-row">
                    <div className="flex flex-col gap-y-2">
                        <Input placeholder="" />
                        <div className="flex flex-row gap-2">
                            <Input disabled placeholder="Disabled ..." />
                            <Input disabled placeholder="Disabled ..." />
                        </div>
                        <textarea className="Border-Appearance h-64 box-content resize-none p-1" />
                    </div>
                </div>
                <div>
                    Preview...
                </div>
            </div>
        </div>
    );
}

// CSS styling
// - positioning

// Tech decisions
// I should construct the general site layout first
// -- if the site layout is built first, I will have more motivation to ignore stupid shit
// -- Easiest is best
// I should use the following editor:
// markdown
// What forums have I liked? Stackoverflow, (old) Reddit
// What forums have I disliked / never used? Piazza, Campuswire

// Why does SO have optimal UX?
// - It does one thing and one thing well (questions & answers)
// Top-voted answer goes to the top
//
