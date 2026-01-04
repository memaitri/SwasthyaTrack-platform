I added placeholder SVG logo files to `client/public`:
  - `logo-swasthya-48.svg`  (48×48 placeholder)
  - `logo-swasthya-256.svg` (256×256 placeholder)
  - `logo-swasthya.svg`     (general placeholder)

You uploaded `swasthyatrack-logo.jpeg` which is present in this folder. I attempted to generate PNG variants automatically but the environment was unable to run the image conversion (no PNGs were created).

Current behavior:
  - The UI will fall back to the uploaded file `/swasthyatrack-logo.jpeg` if no size-specific PNG/SVG is present.

If you want me to retry generation, reply here and I'll try again (may require network access). Alternatively, you can upload a high-resolution `PNG` or `SVG` and I'll generate and commit `logo-swasthya-48.png` and `logo-swasthya-256.png` immediately.