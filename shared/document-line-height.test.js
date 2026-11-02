const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeDocumentLineHeightStyle } = require('./document-html-sanitizer');

test('line spacing expressions survive repeated save and reload normalization', () => {
  for (const value of ['calc(1em + 3pt)', '150%', '1.5', 'normal', '20px']) {
    const normalized = normalizeDocumentLineHeightStyle(`font-size:22pt;line-height:${value};`);
    assert.equal(normalizeDocumentLineHeightStyle(normalized), normalized);
    assert.ok(normalized.includes('--template-text-line-height:'));
  }
});

test('removing explicit line spacing restores inheritance without stale derived spacing', () => {
  assert.equal(normalizeDocumentLineHeightStyle('font-size:22pt;line-height:inherit;--template-text-line-height:20px'), 'font-size:22pt');
  assert.equal(normalizeDocumentLineHeightStyle('font-size:22pt;--template-text-line-height:20px'), 'font-size:22pt');
});

test('line-height normalization preserves unrelated styles and zero-height object spacers', () => {
  const original = 'height:89px;padding:0;';
  assert.equal(normalizeDocumentLineHeightStyle(original), original);
  assert.equal(normalizeDocumentLineHeightStyle('line-height:0px'), 'line-height:0px');
  assert.doesNotMatch(normalizeDocumentLineHeightStyle('line-height:0px'), /--template-text-line-height/);
  assert.match(normalizeDocumentLineHeightStyle('font-size:72pt;line-height:16px'), /max\(1em, 16px\)/);
});
