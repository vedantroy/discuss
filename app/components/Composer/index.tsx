import React from "react";

export default function SubmitForm() {
    return (
        <div>
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
        // We add 1px to the border on focus. To prevent the div from expanding
        /// we add a margin (when unfocused) which we remove (when focused)
        className={`Border-Appearance ${className ? className : ""}`}
    />
);

export function Composer() {
    // TODO(question): Why do we need mx-auto & left-0 right-0?
    return (
        <div className="absolute bottom-0 w-full bg-white mx-auto left-0 right-0">
            <div className="flex flex-row px-2">
                <div className="flex flex-col gap-y-2">
                    <Input placeholder="" />
                    <div className="flex flex-row gap-2">
                        <Input placeholder="" />
                        <Input placeholder="" />
                    </div>
                    <textarea className="Border-Appearance h-64 box-content" />
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
