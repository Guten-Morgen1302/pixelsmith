import json, glob, collections, sys
root = sys.argv[1] if len(sys.argv) > 1 else 'results/real'
c = collections.Counter(); ex = {}
for f in glob.glob(root + '/*/run*/*.json'):
    r = json.load(open(f, encoding='utf8'))
    for a in r.get('attempts', []):
        e = a.get('error')
        if e:
            k = e[:50]; c[k] += 1; ex.setdefault(k, (f, e[:300]))
for k, n in c.most_common():
    print(n, 'x', ex[k][1].replace('\n', ' '))
    print('    e.g.', ex[k][0])
print('pick samples:')
for f in sorted(glob.glob(root + '/vision/run1/*.json')):
    r = json.load(open(f, encoding='utf8'))
    print(r['bug'], json.dumps(r.get('pick'))[:300])
