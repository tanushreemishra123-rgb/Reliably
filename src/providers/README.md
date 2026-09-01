# Providers

A **provider** turns a workflow op into content. The engine depends only on
this contract, so the mock and the live Claude provider are fully
interchangeable — swapping one for the other changes *where the words come
from*, never how the workflow executes, validates, fails, or recovers.

```ts
interface Provider {
  id: string;                 // "mock" | "anthropic"
  label: string;              // shown in the UI
  live: boolean;              // true if it makes network calls
  run(op: string, args: {
    payload: object;          // the running workflow payload
    attempt: number;          // 1-based; used by transient scenarios
    model: "primary" | "fallback";
    source?: string;          // for tool ops
  }): Promise<{ value: object; note: string }>;
}
```

### Ops a provider must implement

| op          | returns (`value`)                                             |
|-------------|--------------------------------------------------------------|
| `summarize` | `{ summary, decisions[], actionItems[{task, owner, due}] }`   |
| `classify`  | `{ category, confidence }`                                    |
| `draft`     | `{ draft }`                                                   |
| `retrieve`  | `{ evidence: [{ title, text }] }`                             |
| `answer`    | `{ answer, grounded }`                                        |
| `research`  | `{ source, points[] }`                                        |
| `plan`      | `{ plan[], model }`                                           |

### Important

Failure injection is **not** the provider's job. The engine decides when a
timeout, malformed payload, low-confidence result, empty retrieval, or
interruption fires, based on the active puzzle. That keeps every puzzle
deterministic and reviewable regardless of which provider is selected.
