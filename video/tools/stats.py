"""Compute every number the video shows, from the committed results. Writes video/src/data.json (merged by make_assets.mjs)."""
import json, glob, math, collections, os
def wilson(k, n, z=1.96):
    if n == 0: return (0.0, 0.0)
    p = k / n; d = 1 + z * z / n; c = p + z * z / (2 * n); a = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n))
    return ((c - a) / d, (c + a) / d)
def pct(x): return round(100 * x)
sp = json.load(open('bench/seeded/splits.json'))
seeded = {}
for c in ('vision', 'dom', 'hybrid'):
    k = n = orc = 0
    for f in glob.glob(f'results/seeded/{c}/run*/*.json'):
        r = json.load(open(f, encoding='utf8'))
        if sp.get(r['bug']) != 'heldout': continue
        g = r.get('grade', {}); n += 1; k += bool(g.get('fixed')); orc += bool(g.get('oracle'))
    lo, hi = wilson(k, n); seeded[c] = {'k': k, 'n': n, 'pct': pct(k / n), 'lo': pct(lo), 'hi': pct(hi), 'oracle': orc}
real = {}
for c in ('vision', 'dom', 'hybrid'):
    k = n = 0
    for f in glob.glob(f'results/real/{c}/run*/*.json'):
        r = json.load(open(f, encoding='utf8')); n += 1; k += bool(r.get('grade', {}).get('fixed'))
    lo, hi = wilson(k, n); real[c] = {'k': k, 'n': n, 'pct': pct(k / n), 'lo': pct(lo), 'hi': pct(hi)}
def selfcheck(pattern):
    cnt = collections.Counter()
    for f in glob.glob(pattern):
        r = json.load(open(f, encoding='utf8')); g = r.get('grade') or {}
        att = [a for a in r.get('attempts', []) if a.get('selfVerify')]
        if not g or not att: continue
        cnt[(bool(att[-1]['selfVerify'].get('fixed')), bool(g.get('oracle')))] += 1
    claims = cnt[(True, True)] + cnt[(True, False)]
    return {'claims': claims, 'wrong': cnt[(True, False)], 'wrongPct': pct(cnt[(True, False)] / claims) if claims else 0, 'pessimistic': cnt[(False, True)], 'runs': sum(cnt.values())}
sc = {'seeded': selfcheck('results/seeded/*/run*/*.json'), 'real': selfcheck('results/real/*/run*/*.json')}
adv = json.load(open('results/adversarial-test.json', encoding='utf8'))
sam = json.load(open('results/sam/spike1-preregistered-thr0.5.json', encoding='utf8'))
sam2 = json.load(open('results/sam/spike2-exploratory.json', encoding='utf8'))
cost = [json.loads(l) for l in open('results/cost.jsonl') if l.strip()]
bugs_seeded = len(sp)
out = {'seeded': seeded, 'real': real, 'selfcheck': sc,
       'adversarial': {'tests': adv['tests'], 'holes': len(adv['holes'])},
       'sam': {'hits': sam['summary']['hits'], 'n': sam['summary']['n'], 'pct': pct(sam['summary']['hit_rate']), 'noBox': sum(1 for r in sam['rows'] if r['n_pred'] == 0), 'best': sam2['exploratory_post_hoc']['summary']['0.1']['hits']},
       'calls': len(cost), 'completionTokens': sum(c['completion_tokens'] for c in cost), 'seededBugs': bugs_seeded, 'realBugs': len(glob.glob('bench/bugs/*/meta.json'))}
os.makedirs('video/src', exist_ok=True)
json.dump(out, open('video/src/stats.json', 'w'), indent=1)
print(json.dumps(out, indent=1))
