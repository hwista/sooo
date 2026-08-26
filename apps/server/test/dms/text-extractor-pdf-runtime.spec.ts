import { extractTextFromFile } from '../../src/modules/dms/file/text-extractor.js';

function createSinglePagePdf(text: string): Buffer {
  const escapedText = text.replace(/([()\\])/gu, '\\$1');
  const stream = `BT /F1 12 Tf 72 720 Td (${escapedText}) Tj ET`;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(pdf, 'ascii');
}

describe('DMS PDF extraction runtime', () => {
  it('extracts text and renders a page through the pinned pdfjs runtime', async () => {
    const proofText = 'SSOO DMS launch PDF runtime proof';

    const result = await extractTextFromFile(createSinglePagePdf(proofText), 'launch-proof.pdf');

    expect(result.unsupportedReason).toBeUndefined();
    expect(result.text).toContain(proofText);
    expect(result.images).toHaveLength(1);
    expect(result.images[0]).toEqual(expect.objectContaining({
      mimeType: 'image/png',
      name: 'page-1.png',
    }));
    expect(result.images[0]?.size).toBeGreaterThan(0);
  });
});
