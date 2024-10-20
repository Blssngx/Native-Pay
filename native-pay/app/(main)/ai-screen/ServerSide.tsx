'use server';

import Redirect from "./Redirect";

export async function ServerSide({
    to,
}: {
    to: string;
}) {
    return (
        <Redirect to={to} />
    );
}