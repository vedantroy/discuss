const Input = (
    { className, ...props }: React.DetailedHTMLProps<React.InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>,
) => (
    <input
        {...props}
        className={`Form-Input m-[1px] focus:m-0 ${className ? className : ""}`}
    />
);

export default Input;
