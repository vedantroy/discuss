const Textarea = (
    { className, ...props }: React.DetailedHTMLProps<
        React.TextareaHTMLAttributes<HTMLTextAreaElement>,
        HTMLTextAreaElement
    >,
) => (
    <textarea
        {...props}
        className={`textarea textarea-bordered Form-Input focus:px-[15px] focus:py-[7px] ${className ? className : ""}`}
    />
);

export default Textarea;
