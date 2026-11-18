"""Generates assets/stats/stats.svg and assets/stats/langs.svg (dark bg, muted red accent).
Run by .github/workflows/stats.yml. Uses GITHUB_TOKEN if present (higher rate limit)."""
import json, os, urllib.request, urllib.parse
USER = os.environ.get("GH_USER", "ifwian")
TOKEN = os.environ.get("GITHUB_TOKEN", "")
BG, RED, TEXT, MUTED = "#0d0d0f", "#b3202a", "#c9c9c9", "#8a8a90"
FONT = "'Segoe UI',Ubuntu,'Helvetica Neue',Arial,sans-serif"

def api(path):
    req = urllib.request.Request("https://api.github.com" + path, headers={
        "Accept": "application/vnd.github+json", "User-Agent": "profile-stats",
        **({"Authorization": f"Bearer {TOKEN}"} if TOKEN else {})})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)

def search_count(kind, q):
    return api(f"/search/{kind}?q={urllib.parse.quote(q)}&per_page=1")["total_count"]

SEED = os.environ.get('SEED') == '1'
if SEED:
    own, stars, commits, prs, issues, langs, total, top = [], '–', '–', '–', '–', {}, 1, []
else:
    repos, page = [], 1
    while True:
        batch = api(f"/users/{USER}/repos?per_page=100&type=owner&page={page}")
        repos += batch
        if len(batch) < 100: break
        page += 1
    own = [r for r in repos if not r["fork"]]
    stars = sum(r["stargazers_count"] for r in own)
    commits = search_count("commits", f"author:{USER}")
    prs = search_count("issues", f"author:{USER} type:pr")
    issues = search_count("issues", f"author:{USER} type:issue")

    langs = {}
    for r in own:
        try:
            for k, v in api(f"/repos/{USER}/{r['name']}/languages").items():
                langs[k] = langs.get(k, 0) + v
        except Exception:
            pass
    total = sum(langs.values()) or 1
    top = sorted(langs.items(), key=lambda x: -x[1])[:6]

PAL = ["#b3202a", "#d9424d", "#8f1a22", "#e8737b", "#6e141b", "#f0a0a6"]

def card(w, h, title, body):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" role="img" aria-label="{title}">
<style>.f{{animation:f 1.2s ease both}}@keyframes f{{from{{opacity:0;transform:translateY(6px)}}to{{opacity:1}}}}</style>
<rect width="{w}" height="{h}" rx="6" fill="{BG}" stroke="#2a1014" stroke-width="1"/>
<g class="f">
<text x="25" y="35" font-family="{FONT}" font-size="18" font-weight="700" fill="{RED}">{title}</text>
{body}</g></svg>'''

rows = [("Public Repos", "–" if SEED else len(own)), ("Total Stars", stars), ("Total Commits", commits),
        ("Pull Requests", prs), ("Issues", issues)]
b = ""
for i, (k, v) in enumerate(rows):
    y = 70 + i * 28
    b += f'<circle cx="32" cy="{y-5}" r="4" fill="{RED}"/><text x="48" y="{y}" font-family="{FONT}" font-size="14" fill="{TEXT}">{k}:</text>'
    b += f'<text x="260" y="{y}" font-family="{FONT}" font-size="14" font-weight="700" fill="{TEXT}" text-anchor="end">{v}</text>'
open("assets/stats/stats.svg", "w").write(card(300, 200, f"{USER}'s GitHub Stats", b))

if SEED:
    b = f'<text x="25" y="90" font-family="{FONT}" font-size="13" fill="{MUTED}">Updates on the next workflow run</text>'
else:
  b = ""
  bar_x, bar_w, x = 25, 250, 25
  for i, (k, v) in enumerate(top):
      w = max(2, round(bar_w * v / total))
      b += f'<rect x="{x}" y="52" width="{w}" height="8" fill="{PAL[i]}"/>'
      x += w
  for i, (k, v) in enumerate(top):
      col, row = i % 2, i // 2
      cx, cy = 25 + col * 130, 90 + row * 30
      b += f'<circle cx="{cx+5}" cy="{cy-4}" r="5" fill="{PAL[i]}"/><text x="{cx+16}" y="{cy}" font-family="{FONT}" font-size="12" fill="{TEXT}">{k} <tspan fill="{MUTED}">{v*100/total:.1f}%</tspan></text>'
open("assets/stats/langs.svg", "w").write(card(300, 200, "Most Used Languages", b))
print(len(own), stars, commits, prs, issues, top)
