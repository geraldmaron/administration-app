# Image generation and usage

Current scope: generated scenario scenes and authored ambient assets. Interface direction lives in `docs/DESIGN.md`. Image style rules do not govern charts, icons, maps, panel fills or the entire player palette.

## People and identity

People use the record-driven portrait renderer (`DECISIONS.md` §11); there is no generated portrait pool to replenish. Reuse the live portrait, flag, map, icon and institution-mark components for identity. Preserve the app logo. Generated scenes avoid recognizable living-person likenesses, real official insignia, readable signage, logos and watermarks.

## Scenario scenes

`packages/content/src/scene.ts` defines `SceneFacets`: scenario kind, site and register (`intact`, `strained`, `damaged`, `ceremonial`). `sceneFacets` derives the register from authored and campaign-facing conditions; the fallback chain avoids overstating damage. `packages/content/src/scene-prompt.ts` composes the prompt and negatives.

Scenes illustrate the story and its setting. They are not documentary proof of an event, a forecast of exact casualties or a source of intelligence. A generic scene must remain reusable across its allowed nations: don't add a recognizable landmark, national flag or place-specific sign. Country-specific context can be added by the UI from actual data.

Use documentary framing for this photographic pipeline, with natural color, scene-specific contrast and available light. Universal desaturation is retired. The site and condition determine light, activity and damage. Keep non-damaged scenes free of invented wreckage; avoid graphic injury or children in distress. Photography-specific negative prompts do not ban separate diagrammatic or illustrated asset classes.

`SCENE_STANDARD` is the format and size authority. At this revision it specifies WebP, 768×432, 16:9 and at most 60,000 bytes. `studio-cli/src/jobs/gate.ts` applies the `scene-batch` gate to the image record, format, byte ceiling, plausible minimum size and file existence. These mechanical checks do not prove composition, visual quality or story truth; inspect the actual output.

## Ambient assets and other visual forms

`assets/player/ambiance/README.md` records the existing authored library. No player module resolves it yet; DESIGN.md does not currently place ambient art on any screen. Ambient art can establish geography, domain or atmosphere. Choose color, texture, light and crop for the destination; neither near-black grounds nor a muted grade are mandatory for every asset. Declare text-safe regions where text actually overlaps, rather than applying a heavy scrim to every image.

New illustrative asset classes should define their use, provenance and performance requirements without inheriting unrelated photographic negatives. Use data-driven SVG or existing UI primitives for charts, diagrams and icons. Do not render dynamic metric values as generated image text.

## Acceptance and provenance

Use the existing session-driven asset workflow; this document does not authorize paid generation, publication or deployment. Keep the actual generator, prompt and available generation metadata in the job record. Do not invent a seed for a provider that did not supply one. Generated assets trace to their job journal; authored assets trace to their checked-in source.

Inspect each asset at its rendered sizes for content truth, crop, contrast, legibility, visual defects and byte cost. Check the image in the intended panel and at narrow widths, not only as a standalone file. Accessible descriptions should distinguish illustration from measured evidence. Previously generated assets are not changed merely by updating this guidance or the prompt composer.
