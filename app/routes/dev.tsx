import { useLoaderData } from "@remix-run/react";
import { LoaderFunction, json } from "~/mod";

type Debug = {
	NODE_ENV: string;
}

export let loader: LoaderFunction = ({ request, params }) => {
	const env = process.env;
	return json({
		NODE_ENV: env.NODE_ENV
	})
}

export default function() {
	const data = useLoaderData<Debug>()
	return <div>{JSON.stringify(data, null, 2)}</div>
}