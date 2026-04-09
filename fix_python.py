import re
with open('refactor_page.py', 'r') as f:
    text = f.read()

# Remove the 'f' prefix from new_return
text = text.replace('f"""  return (', '"""  return (')

# Use text.replace to substitute variables
text += """
new_return = new_return.replace('{blitz_ui_clean}', blitz_ui_clean)
new_return = new_return.replace('{manual_form_clean}', manual_form_clean)
new_return = new_return.replace('{news_form_clean}', news_form_clean)
with open('web/src/app/generate/page.tsx.new', 'w') as f:
    f.write(prefix + new_return)
print("Done")
"""
with open('refactor_page.py', 'w') as f:
    f.write(text)
