import { createRequire } from 'module';
import {
  assertValidDocxTemplate,
  createDocxTemplateFromText,
  renderDocxTemplate,
} from './docx-template-renderer.js';

const nodeRequire = createRequire(import.meta.url);
type AdmZipEntry = { getData(): Buffer };
type AdmZipArchive = {
  addFile(fileName: string, content: Buffer): void;
  getEntry(fileName: string): AdmZipEntry | null;
  updateFile(fileName: string, content: Buffer): void;
  toBuffer(): Buffer;
};
type AdmZipConstructor = new (content?: Buffer) => AdmZipArchive;
const AdmZip = nodeRequire('adm-zip') as AdmZipConstructor;

function readDocumentXml(buffer: Buffer): string {
  const entry = new AdmZip(buffer).getEntry('word/document.xml');
  if (!entry) {
    throw new Error('word/document.xml missing');
  }
  return entry.getData().toString('utf-8');
}

describe('DOCX template renderer', () => {
  it('replaces source-style single braces and SSOO double braces in the actual template binary', () => {
    const template = createDocxTemplateFromText('계약번호 {계약번호}\n고객사 {{customerName}}');
    const rendered = renderDocxTemplate(template, {
      계약번호: 'CRM-CT-001',
      customerName: 'LS MnM',
    });
    const xml = readDocumentXml(rendered);

    expect(xml).toContain('CRM-CT-001');
    expect(xml).toContain('LS MnM');
    expect(xml).not.toContain('{계약번호}');
    expect(xml).not.toContain('{{customerName}}');
  });

  it('replaces a placeholder split across multiple Word text runs while preserving other package entries', () => {
    const zip = new AdmZip(createDocxTemplateFromText('placeholder'));
    const xml = readDocumentXml(zip.toBuffer()).replace(
      'placeholder',
      '{{customer</w:t></w:r><w:r><w:t>Name}}',
    );
    zip.updateFile('word/document.xml', Buffer.from(xml, 'utf-8'));
    zip.addFile('word/styles.xml', Buffer.from('<styles>keep-me</styles>', 'utf-8'));

    const rendered = renderDocxTemplate(zip.toBuffer(), { customerName: 'LS Electric' });
    expect(readDocumentXml(rendered)).toContain('LS Electric');
    expect(new AdmZip(rendered).getEntry('word/styles.xml')?.getData().toString('utf-8')).toBe('<styles>keep-me</styles>');
  });

  it('rejects a non-DOCX binary', () => {
    expect(() => assertValidDocxTemplate(Buffer.from('not-a-docx'))).toThrow('유효한 DOCX ZIP 파일이 아닙니다.');
  });
});
