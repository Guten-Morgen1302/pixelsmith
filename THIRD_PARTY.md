# Third-party material

The bench replays real bugs from existing open-source projects, used as data at the commit just before each upstream fix. They keep their own licenses.

| Project | License | Used for |
|---|---|---|
| [Pico CSS](https://github.com/picocss/pico) | MIT | pico-474, pico-585, pico-528, pico-615 |
| [daisyUI](https://github.com/saadeghi/daisyui) | MIT | daisyui-4724 |

Each `bench/bugs/*/meta.json` records the upstream PR number, the base (buggy) commit and the merged fix commit. The upstream sources are cloned into `bench/_work/` at build time and are not committed.

Models: Muse Spark Open, Muse Wonder (Meta Model API) and SAM 3 are Meta's; see their own licenses and terms. No model weights are included in this repository.
