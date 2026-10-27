"""SAM localisation spike (pre-registered in docs/BUILD-PLAN.md).

For each buggy screenshot, ask SAM for the affected element by a plain concept phrase and check whether any predicted box
overlaps a ground-truth element box (from the DOM) with IoU >= 0.5. Reports hit rate overall and per bug class.
Run on the cluster (GPU) or a laptop (CPU):  python run_sam.py [--model facebook/sam3] [--data data] [--out results.json]
Model: facebook/sam3 via transformers (Sam3Model/Sam3Processor). SAM 3.1 loading is NOT verified; do not claim 3.1 from this script.
"""
import argparse, json, os, time
import torch
from PIL import Image
from transformers import Sam3Model, Sam3Processor

ap = argparse.ArgumentParser()
ap.add_argument('--model', default='facebook/sam3')
ap.add_argument('--data', default='data')
ap.add_argument('--out', default='results.json')
ap.add_argument('--threshold', type=float, default=0.5)
args = ap.parse_args()

def iou(a, b):
    ix = max(0, min(a[2], b[2]) - max(a[0], b[0])); iy = max(0, min(a[3], b[3]) - max(a[1], b[1]))
    inter = ix * iy; ua = (a[2] - a[0]) * (a[3] - a[1]) + (b[2] - b[0]) * (b[3] - b[1]) - inter
    return inter / ua if ua > 0 else 0.0

device = 'cuda' if torch.cuda.is_available() else 'cpu'
print('device', device, torch.cuda.get_device_name(0) if device == 'cuda' else '', flush=True)
model = Sam3Model.from_pretrained(args.model).to(device).eval()
processor = Sam3Processor.from_pretrained(args.model)
manifest = json.load(open(os.path.join(args.data, 'manifest.json')))
rows = []
expl = {}
for m in manifest:
    img = Image.open(os.path.join(args.data, m['id'] + '.png')).convert('RGB')
    t = time.time()
    inputs = processor(images=img, text=m['phrase'], return_tensors='pt').to(device)
    with torch.no_grad():
        out = model(**inputs)
    res = processor.post_process_instance_segmentation(out, threshold=args.threshold, mask_threshold=0.5, target_sizes=inputs.get('original_sizes').tolist())[0]
    boxes = [b.tolist() for b in res['boxes']]; scores = [float(s) for s in res['scores']]
    best = max((iou(b, g) for b in boxes for g in m['gt_boxes']), default=0.0)
    # EXPLORATORY (post hoc, added after the pre-registered 0.5 run scored 4/28): same forward pass, lower score thresholds.
    for th in [0.3, 0.2, 0.1, 0.05]:
        r2 = processor.post_process_instance_segmentation(out, threshold=th, mask_threshold=0.5, target_sizes=inputs.get('original_sizes').tolist())[0]
        b2 = [b.tolist() for b in r2['boxes']]
        expl.setdefault(th, []).append({'id': m['id'], 'cls': m['cls'], 'n_pred': len(b2), 'best_iou': round(max((iou(b, g) for b in b2 for g in m['gt_boxes']), default=0.0), 3)})
    rows.append({'id': m['id'], 'cls': m['cls'], 'phrase': m['phrase'], 'n_pred': len(boxes), 'best_iou': round(best, 3), 'hit': best >= 0.5,
                 'pred_boxes': [[round(v, 1) for v in b] for b in boxes][:6], 'scores': [round(s, 3) for s in scores][:6], 'gt_boxes': m['gt_boxes'][:6], 'sec': round(time.time() - t, 2)})
    print(f"{m['id']:34} '{m['phrase']}' preds={len(boxes)} bestIoU={best:.2f} {'HIT' if best >= 0.5 else 'miss'}", flush=True)

n = len(rows); hits = sum(r['hit'] for r in rows)
by = {}
for r in rows: by.setdefault(r['cls'], []).append(r['hit'])
summary = {'model': args.model, 'device': device, 'n': n, 'hits': hits, 'hit_rate': round(hits / n, 3), 'by_class': {k: f'{sum(v)}/{len(v)}' for k, v in by.items()}, 'iou_threshold': 0.5, 'score_threshold': args.threshold}
print(json.dumps(summary, indent=1))
expl_summary = {str(th): {'hits': sum(r['best_iou'] >= 0.5 for r in v), 'n': len(v), 'with_any_pred': sum(r['n_pred'] > 0 for r in v)} for th, v in expl.items()}
print('EXPLORATORY (post hoc) hits at lower score thresholds:', json.dumps(expl_summary))
json.dump({'summary': summary, 'rows': rows, 'exploratory_post_hoc': {'summary': expl_summary, 'rows': expl}}, open(args.out, 'w'), indent=1)
