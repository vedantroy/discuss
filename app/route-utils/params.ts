import type { Params } from "react-router-dom"
import invariant from "tiny-invariant"

export function getParam(p: Params<string>, name: string): string {
	invariant(p[name], `Missing param: ${name}`)
	return p[name]!!
}