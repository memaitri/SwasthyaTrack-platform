# PDF Reports Checklist

This checklist outlines verification steps and acceptance criteria for server-side PDF report generation.

## Acceptance Criteria
- [ ] PDFs render without overlapping/misaligned elements across portrait and landscape.
- [ ] Text is readable (minimum 12pt), contrast is acceptable, and headings are present.
- [ ] Charts are rendered clearly and scaled properly (no blurring; high-DPI rendering used).
- [ ] No critical tables/images are split across pages; page-break rules applied.
- [ ] Health card fields (Vaccination, Allergies, etc.) are present and correctly populated when available.
- [ ] Headers (title, date, optional logo) and footers (page number) appear on each page.
- [ ] PDF metadata includes Title and Author fields.
- [ ] Generated PDFs are saved as fixtures in `server/tests/fixtures/` for manual review.

## How to run locally
1. Run tests (integration):
   ```bash
   npm test -t "Reports Integration"
   ```
2. Generate sample PDFs directly:
   ```bash
   node server/scripts/generate_report_samples.mjs
   ```
   The script now produces A4 and Letter sizes in both portrait and landscape (filenames include the size and orientation).
3. Client-side PDF generation (UI)
   - The Reports UI now uses a client-side PDF generator for `PDF` format where possible to ensure charts rendered in the frontend appear in the exported PDF.
   - To use: in the app, go to Reports → pick a report (e.g., Monthly Checkup or Annual Health), select **PDF (with charts)** and click **Generate & Download**. If client-side generation fails, the page falls back to server PDF generation.
4. You can also request specific size/orientation from the API, e.g.:
   ```bash
   curl -H "Authorization: Bearer <token>" "http://localhost:3000/api/reports/monthly-checkup?format=pdf&pageSize=Letter&orientation=landscape" --output monthly-checkup-letter-landscape.pdf
   ```
5. Open generated PDFs in `server/tests/fixtures/` or your browser/Acrobat for verification.

## CI
A workflow exists at `.github/workflows/report-tests.yml` to run tests and upload the generated PDF fixtures as artifacts.

## Notes
- Server-side report generation uses PDFKit + Puppeteer (for chart rendering).
- Accessibility: fonts sized to at least 12pt; metadata included. Tagged PDF support is limited with PDFKit.
