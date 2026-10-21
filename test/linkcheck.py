"""Live-check every source and explainer URL in js/cards.js, including the PSU/OS-prefixed ones.
Run: python3 test/linkcheck.py   (exits non-zero if any URL is not 200 or redirects elsewhere)"""
import re, subprocess, sys, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
s = open(os.path.join(ROOT, 'js', 'cards.js'), encoding='utf-8').read()
OS = 'https://openstax.org/books/introductory-statistics-2e/pages/'
PSU = 'https://online.stat.psu.edu/'
urls = set()
for m in re.finditer(r"url: (?:(PSU|OS) \+ )?'([^']+)'", s):
    prefix = {'PSU': PSU, 'OS': OS}.get(m.group(1), '')
    urls.add(prefix + m.group(2))

def norm(u):
    return u.split('#')[0].rstrip('/').replace('.html', '')

flagged = 0
for u in sorted(urls):
    r = subprocess.run(['curl', '-sL', '-m', '25', '-A', 'Mozilla/5.0', '-o', os.devnull, '-w', '%{http_code} %{url_effective}', u],
                       capture_output=True, text=True)
    code, eff = (r.stdout.split(' ', 1) + [''])[:2]
    if code != '200' or norm(eff) != norm(u):
        flagged += 1
        print('FLAG', u, '->', code, eff)
print(f'{len(urls)} distinct URLs checked, {flagged} flagged')
sys.exit(1 if flagged else 0)
