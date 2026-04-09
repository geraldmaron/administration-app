import re

with open('web/src/app/generate/page.tsx', 'r') as f:
    content = f.read()

return_start = content.find('  return (\n    <div className="mx-auto max-w-[1600px]">')
prefix = content[:return_start]

# We stored the components previously. I can just re-extract from the original if I checkout HEAD.
