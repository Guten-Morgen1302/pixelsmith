import json, glob, collections, math, sys
def wilson(k, n, z=1.96):
    if n == 0: return (0, 0)
    p = k / n; d = 1 + z * z / n; c = p + z * z / (2 * n); a = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n))
    return ((c - a) / d, (c + a) / d)
rows = collections.defaultdict(lambda: collections.defaultdict(list)); tot = collections.defaultdict(lambda: [0, 0, 0])
for c in ('vision', 'dom', 'hybrid'):
    for f in sorted(glob.glob(f'results/real/{c}/run*/*.json')):
        r = json.load(open(f, encoding='utf8')); g = r.get('grade', {}); ok = bool(g.get('fixed'))
        d = g.get('pixelsDifferFromUpstreamFix')
        rows[r['bug']][c].append(('OK' if ok else 'x') + (f'({d:.4f})' if ok and d is not None else ''))
        t = tot[c]; t[0] += ok; t[1] += 1; t[2] += bool(r.get('attempts') and r['attempts'][-1].get('error'))
print('REAL bugs (Pico), strict-fixed = oracle pass + content kept + an edit applied')
for c, (k, n, e) in tot.items():
    lo, hi = wilson(k, n); print(f'{c:7} fixed {k}/{n} = {k/n:.0%} 95% CI [{lo:.0%},{hi:.0%}]   runs ending on an apply/build error: {e}')
print('\n(number in brackets = fraction of pixels that differ from the maintainers\' real fix)')
for b in sorted(rows): print(f'{b:10}', ' | '.join(f"{c}:{','.join(rows[b][c])}" for c in ('vision', 'dom', 'hybrid') if c in rows[b]))
