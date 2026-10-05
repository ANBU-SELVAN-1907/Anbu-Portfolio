from pathlib import Path
from pypdf import PdfReader
import zipfile,xml.etree.ElementTree as ET
folder=Path('.sites-runtime/resume-tests')
for file in folder.glob('*.pdf'):
 r=PdfReader(file);expected=file.with_suffix('.expected.txt').read_text(encoding='utf-8');actual=' '.join(p.extract_text() for p in r.pages)
 norm=lambda s: ''.join(s.split()).lower()
 assert norm(actual)==norm(expected),file.name
 assert r.trailer['/Root']['/MarkInfo']['/Marked'] and '/StructTreeRoot' in r.trailer['/Root']
 for page in r.pages:
  for font in page['/Resources']['/Font'].values():
   f=font.get_object();descriptor=f['/DescendantFonts'][0].get_object()['/FontDescriptor'].get_object() if '/DescendantFonts' in f else f['/FontDescriptor'].get_object()
   assert '/FontFile2' in descriptor or '/FontFile3' in descriptor
with zipfile.ZipFile(folder/'resume.docx') as z:
 body=z.read('word/document.xml');assert b'<w:tbl>' not in body and b'w:txbxContent' not in body
 assert b'Heading1' in body and b'Jose' not in body
 assert 'José Candidate' in body.decode('utf-8') and b'candidate@example.test' in body
print('PDF actual text, embedded fonts, structure tags and Word single-column paragraphs passed.')
