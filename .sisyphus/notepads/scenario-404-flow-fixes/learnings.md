
- Repair review now parses repeated `ids` params and legacy comma-joined values, so encoded query strings no longer depend on comma splitting alone.
- Repair review separates missing scenarios from true no-op repairs to avoid false green success states.
- Repair analyze fetch should check `response.ok` before trusting JSON payload semantics.
