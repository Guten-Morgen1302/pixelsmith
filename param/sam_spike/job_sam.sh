#!/bin/bash
#SBATCH -J samspike
#SBATCH -N 1
#SBATCH --ntasks-per-node=16
#SBATCH --gres=gpu:A100-SXM4:1
#SBATCH --time=00:30:00
#SBATCH --output=logs/sam_%j.out
#SBATCH --error=logs/sam_%j.err
# Short walltime so backfill starts it sooner. 16 CPUs per GPU (NPSF advisory). One task: 28 images should take minutes on an A100.
# Compute nodes have no direct internet: weights must be prefetched on the login node (prefetch_sam.py) and HF_HOME must point at that cache.
echo "node: $(hostname)  job: $SLURM_JOB_ID  started: $(date)"
source "$HOME/pixelsmith_sam/env.sh"          # activates the python env AND exports HF_HOME (same value used by prefetch_sam.py)
export HF_HUB_OFFLINE=1                        # fail loudly instead of trying the network
nvidia-smi --query-gpu=name,memory.total,driver_version --format=csv,noheader
cd "$HOME/pixelsmith_sam"
python run_sam.py --model facebook/sam3 --data data --out results.json
echo "finished: $(date)"
