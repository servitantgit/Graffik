import io
import sys

SRC = 'Gillette 2026 New UI overtime.html'
DST = 'Gillette 2026 New UI overtime.html'

with io.open(SRC, 'r', encoding='utf-8-sig') as f:
    content = f.read()

# Find the LAST <script> tag (the inline JS block at the end of the body)
idx = content.rfind('<script>')
if idx == -1:
    print('ERROR: <script> tag not found')
    sys.exit(1)

# Cut everything from the marker (inclusive) to end of file
html_part = content[:idx].rstrip()

scripts = '''
<!-- ===== MODUŁY JS (rozbito monolit na 9 plików) ===== -->
<script src="js/data.js"></script>
<script src="js/core.js"></script>
<script src="js/ui.js"></script>
<script src="js/edit.js"></script>
<script src="js/dashboard.js"></script>
<script src="js/calendar.js"></script>
<script src="js/views.js"></script>
<script src="js/actions.js"></script>
<script src="js/main.js"></script>
</body>
</html>
'''

new_content = html_part + scripts

with io.open(DST, 'w', encoding='utf-8', newline='\n') as f:
    f.write(new_content)

print('OK: replaced inline JS with module references')
print('New file size:', len(new_content), 'chars')