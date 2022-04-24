import { useField } from "remix-validated-form";
import Input from "./input";

type MyInputProps = {
    type?: React.InputHTMLAttributes<HTMLInputElement>["type"];
    className?: string;
    name: string;
    onChange?: (value: React.ChangeEvent<HTMLInputElement>) => void;
};
const ValidatedInput = ({ type, name, onChange, className }: MyInputProps) => {
    const { error, getInputProps } = useField(name);
    // @ts-expect-error - I'm not sure why there's a type error here
    const props = getInputProps({ id: name });
    if (onChange) {
        const wrapped = props.onChange;
        props.onChange = (e) => {
            onChange(e);
            wrapped!!(e);
        };
    }
    return (
        <div>
            <Input type={type} className={`p-1 text-base ${className || ""}`} {...props} />
            {error && <div className="text-xs mt-0.5 text-rose-600">{error}</div>}
        </div>
    );
};

export default ValidatedInput;
