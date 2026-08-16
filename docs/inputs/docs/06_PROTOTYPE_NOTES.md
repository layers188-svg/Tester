# Prototype status and known limitations

`prototype_reference/house_dark_v13_reference.html` is the latest conversation prototype and captures the direction of the product after the recent motion and title-sealing work.

It is **not production code**.

Do not ship it directly.

## Useful parts of the prototype

- premium dark entry idea
- motion environment intent
- Search / Trust Us flow
- `TRUST US / SEEN IT`
- Circle / Room / Library layout experiments
- sealed Tonight logic
- title reveal only after No Trailer

## Known prototype risks

- fixture data is hard coded
- deployment wrappers used during experiments caused black-screen failures
- some iterations had incorrect CSS state names
- some Room scroll versions calculated progress from global scroll incorrectly
- local state is not secure reveal authority
- prototype media may be embedded directly
- navigation and state are simplified
- no production metadata provider
- no production recommendation cache
- no auth / permissions model in the standalone file
- no production persistence

The production implementation must use the real app's routing, auth, database and server state.

## Lessons from failed prototype deployments

1. Do not use a compressed HTML loader wrapper to deploy the production app.
2. Do not depend on animation class-name strings that are not tested end to end.
3. Never declare motion complete because CSS exists. Render it.
4. Keep a safety path that removes blocking intro overlays if animation fails.
5. Use server state for title reveal.
