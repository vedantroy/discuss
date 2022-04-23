import { useField } from "remix-validated-form";
import Input from "./input";

type MyInputProps = {
    className?: string;
    name: string;
    onChange?: (value: React.ChangeEvent<HTMLInputElement>) => void;
};
const ValidatedInput = ({ name, onChange, className }: MyInputProps) => {
    const { error, getInputProps } = useField(name);
    // @ts-expect-error - I'm not sure why there's a type error here
    const props = getInputProps({ id: name });
    if (props.onChange) {
        const og = props.onChange;
        og
            ? props.onChange = (e) => {
                onChange!!(e);
                og(e);
            }
            : props.onChange = onChange;
    }
    return (
        <div>
            <Input className={`p-1 text-base ${className || ""}`} {...props} />
            {error && <div className="text-xs mt-0.5 text-rose-600">{error}</div>}
        </div>
    );
};

export default ValidatedInput;
