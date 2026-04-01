import re
with open('c:/Users/Deiviss/Desktop/disk_analyzer/frontend/src/App.jsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Replace constants
c_start = text.index('const API = "http://127.0.0.1:8000";')
c_end = text.index('];', text.index('const SIZE_FILTERS')) + 3
text = text[:c_start] + 'import { API, APP_VERSION, CHAT_HISTORY_KEY, CHAT_MAX_PERSIST, FAVORITES_KEY, SCAN_HISTORY_KEY, SCAN_HISTORY_MAX, WIN_PATH_RE, THEMES, _savedTheme, CAT_COLORS, CAT_ICONS, CATEGORIES, PROVIDERS, MODEL_INFO, KNOWN_MODELS, SIZE_FILTERS } from "./utils/constants";\n' + text[c_end:]

# Replace helpers
h_start = text.index('const _fmtSizeCache = new Map();')
h_end = text.index('function MermaidLightbox')
text = text[:h_start] + 'import { _fmtSizeCache, fmtSize, fmtNum, MiniBar, SortIcon } from "./utils/helpers";\n' + text[h_end:]

with open('c:/Users/Deiviss/Desktop/disk_analyzer/frontend/src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(text)
print("Done!")
