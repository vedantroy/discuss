const Input = (
    { className, ...props }: React.DetailedHTMLProps<React.InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>,
) => (
    <input
        {...props}
        className={`Border-Appearance rounded ${className ? className : ""}`}
    />
);

export default Input;
