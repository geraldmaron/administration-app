---
name: game-art-direction
description: Create and review generated scene and ambient-art briefs for The Administration. Applies to raster assets and image prompts, not UI charts, iconography or general surface color. People use the record-driven portrait renderer; do not generate replacement faces.
---

# Game art direction

Use `docs/DESIGN.md` for product intent, `docs/IMAGE_GENERATION_SPEC.md` for the live image workflow and `references/art-law.md` for asset-specific review. These rules govern generated assets, not a mandatory palette or aesthetic for every interface element.

Name the image's job and its destination before prompting: a scene illustration, atmosphere, or a new asset class. Choose framing, light, color and detail to support the actual story and rendered size. Strong color, layered lighting and expressive atmosphere are available; do not universally desaturate output or hide it behind a scrim. Place quiet text-safe areas only where text will overlap.

For reusable scenario scenes, honor the class, site and condition passed by the existing composer. Do not add destruction to an intact or strained scene, or landmarks and symbols that falsely bind a generic scene to a particular nation. Generated story imagery is an illustration, not evidence that an event or exact outcome occurred.

People are drawn by the record-driven portrait renderer (`docs/DECISIONS.md` §11). Keep recognizable living people, real official insignia, outlet logos and readable generated signage out of scene assets. Use the existing flags, maps, icons and portrait system for identity.

Retain the generation provenance and run the existing asset gate. Review the image itself for story fit, framing, visual defects, contrast and performance at its actual display sizes. No paid generation or publishing is authorized merely by applying this skill.
