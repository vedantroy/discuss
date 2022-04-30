// TODO: scrap the hidden input
// not worth doing now since i'll (soon) switch over to WSIWYG editor anyways
// https://github.com/airjp73/remix-validated-form/discussions/98
import { useState } from "react";
import { useField } from "remix-validated-form";
import Textarea from "./textarea";

// className="textarea textarea-bordered w-full h-52 mt-1"

type TextAreaProps = {
    className?: string;
    name: string;
    defaultValue?: string;
    // onChange: (value: React.ChangeEvent<HTMLInputElement>) => void;
};
const ValidatedTextarea = (
    { name, /* onChange, */ className, defaultValue }: TextAreaProps,
) => {
    const { error, getInputProps } = useField(name);
    const { onBlur, onChange, ...rest } = getInputProps({ id: name });
    const [text, setText] = useState(defaultValue || "");
    return (
        <div>
            <Textarea
                value={text}
                onChange={e => {
                    setText(e.target.value);
                    onChange(e.target.value);
                }}
                onBlur={e => {
                    onBlur(e);
                }}
                className={className || ""}
            />
            <input value={text} type="hidden" {...rest} />
            {error && <div className="text-xs mt-0.5 text-rose-600">{error}</div>}
        </div>
    );
};

export default ValidatedTextarea;
