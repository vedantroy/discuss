import clsx from "clsx";
import { useEffect, useRef, useState } from "react";
import { BsZoomIn, BsZoomOut } from "react-icons/bs";
import { Row } from "~/components/primitives/layout";

type HeaderProps = {
    title: string;
    pageInputRef: React.RefObject<HTMLInputElement>;
    goToPage: () => void;
    showHelp: () => void;
    onZoom: (z: number) => void;
    pages: number;
    zoom: number;
};

const NAV_KEYS = new Set(["ArrowLeft", "ArrowRight", "Delete", "Backspace"]);
const SUNKEN_INPUT = "border-none outline-none bg-zinc-700 text-center";
const maxZoom = 4;

const roundTo2Decimals = (x: number) => Math.round(x * 100) / 100;
const makePercent = (x: number) => `${roundTo2Decimals(x * 100)}%`;

export default function(
    { title, pageInputRef, onZoom, pages, goToPage, zoom, showHelp }: HeaderProps,
) {
    const maxDigits = pages.toString().length;
    const zoomInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        zoomInputRef.current!!.value = makePercent(zoom);
    }, [zoom]);

    function submitZoom() {
        const { value } = zoomInputRef.current!!;
        if (/^[0-9]+\%?$/.test(value)) {
            const zoomStr = value.endsWith("%") ? value.slice(0, -1) : value;
            const zoomVal = roundTo2Decimals(parseInt(zoomStr) / 100);
            onZoom(Math.min(zoomVal, maxZoom));
        } else zoomInputRef.current!!.value = makePercent(zoom);
    }

    return (
        <div
            // TODO: Why do we have to use min-height?
            className="grid px-2 justify-between shadow shadow-zinc-700 bg-zinc-600 min-h-8 items-center text-zinc-200 text-base"
            style={{ zIndex: 2, gridTemplateColumns: "1fr auto 1fr" }}
        >
            <div className="font-semibold truncate pr-8">{title}</div>
            <Row className="basis-0">
                <input
                    ref={pageInputRef}
                    onKeyDown={evt => {
                        if (evt.ctrlKey || NAV_KEYS.has(evt.key)) return;
                        if (evt.key === "Enter") {
                            goToPage();
                            return;
                        }
                        // only allow numbers
                        if (!isFinite(parseInt(evt.key)) || evt.key === " ") {
                            evt.preventDefault();
                        }
                    }}
                    onBlur={() => goToPage()}
                    className={clsx(SUNKEN_INPUT, "mr-1 ml-2 ")}
                    style={{ width: `calc(max(2, ${maxDigits}) * 1ch + 8px)` }}
                >
                </input>
                <div>/ {pages}</div>
                <Row className="gap-x-1 ml-4">
                    <button
                        onClick={() => onZoom(Math.max(zoom - 0.1, 0.1))}
                    >
                        <BsZoomOut />
                    </button>
                    <input
                        onBlur={submitZoom}
                        onKeyDown={evt => {
                            if (evt.key === "Enter") submitZoom();
                        }}
                        ref={zoomInputRef}
                        className={clsx(SUNKEN_INPUT, "w-[6ch]")}
                    >
                    </input>
                    <button
                        onClick={() => onZoom(Math.min(zoom + 0.1, maxZoom))}
                    >
                        <BsZoomIn />
                    </button>
                </Row>
            </Row>
            <Row className="justify-end">
                <button
                    className="bg-emerald-400 rounded px-2 font-bold basis-0"
                    onClick={showHelp}
                >
                    Help
                </button>
            </Row>
        </div>
    );
}
