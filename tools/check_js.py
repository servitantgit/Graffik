import io
import glob
import sys

def check_balance(path):
    with io.open(path, 'r', encoding='utf-8') as f:
        src = f.read()
    stack = []
    pairs = {')': '(', ']': '[', '}': '{'}
    in_str = None
    i = 0
    while i < len(src):
        c = src[i]
        if in_str:
            if c == '\\':
                i += 2
                continue
            if c == in_str:
                in_str = None
            i += 1
            continue
        if c in ('"', "'", '`'):
            in_str = c
        elif c in '([{':
            stack.append(c)
        elif c in ')]}':
            if not stack or stack[-1] != pairs[c]:
                return 'UNBALANCED at pos ' + str(i)
            stack.pop()
        elif c == '/' and i + 1 < len(src) and src[i+1] == '/':
            while i < len(src) and src[i] != '\n':
                i += 1
            continue
        elif c == '/' and i + 1 < len(src) and src[i+1] == '*':
            i += 2
            while i + 1 < len(src) and not (src[i] == '*' and src[i+1] == '/'):
                i += 1
            i += 2
            continue
        i += 1
    if in_str:
        return 'UNTERMINATED STRING'
    if stack:
        return 'UNCLOSED: ' + ''.join(stack)
    return 'OK'

files = sorted(glob.glob('js/*.js'))
all_ok = True
for path in files:
    status = check_balance(path)
    print(path, '->', status)
    if status != 'OK':
        all_ok = False
if all_ok:
    print('ALL_JS_OK')
    sys.exit(0)
else:
    sys.exit(1)