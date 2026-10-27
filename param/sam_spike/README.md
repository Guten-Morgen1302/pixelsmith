# SAM localisation spike

Question (pre-registered in docs/BUILD-PLAN.md): given a buggy page screenshot and the plain name of the affected element, does SAM box the right element (IoU >= 0.5 vs the DOM box)? 28 screenshots, `data/manifest.json` holds the phrase and ground-truth boxes. Decision rule: >= 60% hit rate -> SAM goes into the agent loop; below that it is reported as a negative result / ablation.

Model: `facebook/sam3` through transformers (`Sam3Model`). SAM 3.1 loading is not verified. Say "SAM 3" in any claim until it is.

## Option A: your laptop, CPU (no cluster needed)
1. `hf auth login` (or `huggingface-cli login`) in YOUR terminal with a READ token from huggingface.co/settings/tokens. Do not paste the token anywhere else.
2. From the repo root: `cd param/sam_spike && python run_sam.py --out results.json` (first run downloads ~3 GB; 28 images on CPU should take a few minutes each at worst).

## Option B: PARAM Siddhi-AI (A100)
1. Connect VPN + `ssh <user>@login.npsf.cdac.in`.
2. `mkdir -p ~/pixelsmith_sam/logs`; copy this folder's contents there (scp from your laptop; `data/` is 1.3 MB).
3. Create `~/pixelsmith_sam/env.sh` like your earlier project's: activate the Python env (needs `transformers>=5` with Sam3, `torch`, `pillow`) and `export HF_HOME=<same path used for prefetch>`.
4. On the login node: `hf auth login` then `python prefetch_sam.py facebook/sam3` (compute nodes have no internet).
5. `cd ~/pixelsmith_sam && sbatch job_sam.sh`, then `cat logs/sam_<jobid>.out`; copy `results.json` back and commit it to `results/sam/`.
Advisories: 16 CPUs per GPU job, <= 8 running jobs. Do not request more than one GPU.

## Result of the pre-registered run (2026-10-27, PARAM A100, facebook/sam3, score threshold 0.5)
**4 of 28 = 14.3%** (rule: >= 60% to put SAM in the agent loop). SAM returned NO box for 23 of 28 screenshots; when it did, the boxes were accurate (IoU 0.87-0.99 on the 4 hits). Hits: large heading, blue button x2, product image. Zero hits for modal dialog, tables, nav bar, footer, dropdown, tooltip, text, inputs. Per class: overflow 0/6, responsive 1/4, stacking 0/4, spacing 1/4, contrast 0/4, media 2/3, state 0/3. Raw: `results/sam/spike1-preregistered-thr0.5.json`.
Official outcome per the pre-registered rule: SAM is NOT in the agent loop. Any follow-up run below is exploratory and post hoc and does not replace this number.
