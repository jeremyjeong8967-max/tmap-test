#!/usr/bin/env python3
"""분리된 비압축 소스에서 단일 HTML 열람본을 생성합니다. 외부 패키지 불필요."""
import base64
from pathlib import Path

root = Path(__file__).resolve().parents[1]
html = (root / 'index.html').read_text(encoding='utf-8')
css = (root / 'assets/css/styles.css').read_text(encoding='utf-8')
data = (root / 'assets/js/data.js').read_text(encoding='utf-8')
app = (root / 'assets/js/app.js').read_text(encoding='utf-8')
logo = base64.b64encode((root / 'assets/images/tmap-logo.png').read_bytes()).decode('ascii')
html = html.replace('<link rel="stylesheet" href="assets/css/styles.css">', f'<style>\n{css}\n</style>')
html = html.replace('    <script src="assets/js/data.js" defer></script>\n', '')
html = html.replace('    <script src="assets/js/app.js" defer></script>\n', '')
html = html.replace('assets/images/tmap-logo.png', f'data:image/png;base64,{logo}')
html = html.replace('</body>', f'<!-- 단일 HTML도 비압축입니다. 수정 원본은 assets/ 안의 분리 소스입니다. -->\n<script>\n{data}\n{app}\n</script>\n</body>')
(root / 'preview.html').write_text(html, encoding='utf-8')
print('preview.html generated')
