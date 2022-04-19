import { Outlet } from "remix";

export default function() {
    return (
        <>
            <div>header!</div>
            <Outlet />
        </>
    );
}
