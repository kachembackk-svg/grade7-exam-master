# Missing Images Manifest

This project ships with **246 asset images present** and **0 still missing**. All five subjects — Integrated Science, Mathematics, English, Social Studies, and Creative & Technology Studies — have complete image sets. See `DATABASE_HEALTH_CHECK_REPORT.md` for the per-subject breakdown.

This manifest documents the naming convention to use if images for a future paper need to be added later.

## How to add a missing image

1. Locate the original image (from the source PDF page or the extraction output).
2. Save it into `client/public/data/assets/` using the **exact file name** listed below for that asset.
3. Reload the app. The image appears automatically — no code or JSON changes needed.
4. Optional: open the **Data** page and click **Run image check** to confirm it is now found.

The app never blocks on a missing image: any question whose asset file is absent still shows its full text, options, correct answer and explanation, with a short 'Image not available' notice plus a written description of what the figure showed.

---
