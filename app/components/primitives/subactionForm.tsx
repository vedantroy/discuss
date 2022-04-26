import React from "react";
import { Form, FormProps } from "remix";

const SubForm = ({ children, subaction, ...rest }: { children: React.ReactNode; subaction: string } & FormProps) => {
    return (
        <Form {...rest}>
            {children}
            <input type="hidden" name="subaction" value={subaction}></input>
        </Form>
    );
};

export default SubForm;
