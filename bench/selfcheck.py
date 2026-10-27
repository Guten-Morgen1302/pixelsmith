"""How often does the agent's own final self-verification agree with the hidden grader?
Rows: agent's last selfVerify.fixed (True/False/none)  vs  grader's oracle pass. Seeded (strict=fixed) and real runs, all configs."""
import json, glob, collections
def load(pattern):
    out = []
    for f in glob.glob(pattern):
        r = json.load(open(f, encoding='utf8')); g = r.get('grade') or {}
        att = [a for a in r.get('attempts', []) if a.get('selfVerify')]
        if not g or not att: continue
        out.append((bool(att[-1]['selfVerify'].get('fixed')), bool(g.get('oracle')), bool(g.get('fixed')), r['bug'], f))
    return out
for name, pat in (('seeded', 'results/seeded/*/run*/*.json'), ('real', 'results/real/*/run*/*.json')):
    rows = load(pat)
    c = collections.Counter((sv, orc) for sv, orc, _, _, _ in rows)
    n = len(rows)
    print(f'{name}: {n} runs with a self-check')
    print(f'  agent says fixed  & grader pass : {c[(True, True)]}')
    print(f'  agent says fixed  & grader FAIL : {c[(True, False)]}   <- false "fixed" claims')
    print(f'  agent says NOT    & grader pass : {c[(False, True)]}   <- agent too pessimistic')
    print(f'  agent says NOT    & grader FAIL : {c[(False, False)]}')
    agree = c[(True, True)] + c[(False, False)]
    print(f'  agreement {agree}/{n} = {agree / n:.0%}')
    if name == 'real':
        for sv, orc, fx, b, f in rows:
            if sv != orc: print('   disagree:', b, f.replace(chr(92), '/').split('results/')[1], 'selfcheck', sv, 'oracle', orc)
