"""Run on the PARAM LOGIN node (it has internet). Downloads SAM weights into $HF_HOME so the offline GPU job can load them.
Requires you to have run `huggingface-cli login` (or `hf auth login`) yourself on the login node with a READ token. Never paste the token anywhere else.
"""
import os, sys
from huggingface_hub import snapshot_download

print('HF_HOME =', os.environ.get('HF_HOME'))
for repo in sys.argv[1:] or ['facebook/sam3']:
    try:
        p = snapshot_download(repo_id=repo)
        print('OK ', repo, '->', p)
    except Exception as e:
        print('FAIL', repo, '->', type(e).__name__, str(e)[:200])
