import sys
import json
from pathlib import Path
from graphify.detect import detect_updates

result = detect_updates(Path('.'))
if result.get('needs_graph') is False or result.get('total_files', 0) == 0:
    print('No files changed since last run. Graph is up to date.')
    sys.exit(0)

Path('graphify-out/.graphify_detect.json').write_text(json.dumps(result), encoding='utf-8')
print(f"Update needed. {result.get('total_files')} files changed/added.")
