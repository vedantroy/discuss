import { assert } from "./utils";

type Resolve = (x: IteratorResult<number, any>) => void;
type IteratorState = { queue: number[]; resolve: Resolve | null; remaining: number | null; id: number };
export class AsyncIteratorManager {
    states: Record<
        number,
        IteratorState
    >;
    id: number;

    constructor() {
        this.states = {};
        this.id = 0;
    }

    createIterable(n: number | null = null): AsyncIterable<number> {
        const id = this.id;
        this.id += 1;
        this.states[id] = {
            queue: [],
            resolve: null,
            remaining: n,
            id,
        };

        const state = this.states[id];
        const that = this;

        const it: AsyncIterator<number> = {
            next() {
                return new Promise((resolve, _) => {
                    assert(state.resolve === null, `resolve was already taken`);
                    state.resolve = resolve;
                    if (state.remaining === 0) {
                        delete that.states[state.id];
                        resolve({ value: undefined, done: true });
                    } else if (state.queue.length > 0) {
                        const first = state.queue.shift();
                        state.resolve = resolve;
                        that.#executeResolve(state, first!!);
                    }
                });
            },
            async return(_value?: number) {
                delete that.states[state.id];
                // I'm pretty sure returning `value` does nothing
                // If `done: true`
                return { value: undefined, done: true };
            },
            async throw(_: unknown) {
                delete that.states[state.id];
                return { value: undefined, done: true };
            },
        };

        return {
            [Symbol.asyncIterator]() {
                return it;
            },
        };
    }

    #executeResolve(state: IteratorState, value: number) {
        const { resolve, id } = state;
        if (state.remaining !== null) state.remaining -= 1;
        state.resolve = null;
        resolve!!({ value });
    }

    pushValue(v: number) {
        for (const state of Object.values(this.states)) {
            const { queue, resolve } = state;
            if (resolve !== null) {
                this.#executeResolve(state, v);
            } else {
                queue.push(v);
            }
        }
    }
}
