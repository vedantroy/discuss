export function throwNotFoundResponse(msg: string = "Not Found"): never {
    throw new Response(msg, {
        status: 404,
    });
}
