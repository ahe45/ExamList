const test = require("node:test");
const assert = require("node:assert/strict");
const { buildDocumentGeneratedObjectSvg, replaceTemplateGeneratedObjectImagesInHtml } = require("./generated-objects");

const examNoCode128Sequence = "104,18,22,16,17,16,16,16,17,88,106";

test("buildDocumentGeneratedObjectSvg renders barcode as Code128-B", () => {
  const svg = buildDocumentGeneratedObjectSvg("barcode", "26010001");

  assert.match(svg, /data-code128-format="code128"/);
  assert.match(svg, /data-code128-start="B"/);
  assert.match(svg, /data-code128-checksum="88"/);
  assert.match(svg, new RegExp(`data-code128-sequence="${examNoCode128Sequence}"`));
  assert.match(svg, /data-code128-value="26010001"/);
});

test("replaceTemplateGeneratedObjectImagesInHtml resolves generated object source aliases for barcode values", () => {
  const html =
    '<img class="template-generated-object template-generated-object-barcode" data-template-object-type="barcode" data-template-object-source="examineeNo" src="" alt="바코드" />';
  const result = replaceTemplateGeneratedObjectImagesInHtml(html, {
    candidate: {
      examNo: "26010001",
    },
  });

  assert.match(result, /title="수험번호 바코드"/);
  assert.match(result, /alt="수험번호 바코드"/);
  assert.match(result, /src="data:image\/svg\+xml;charset=UTF-8,/);
  assert.match(decodeURIComponent(result), new RegExp(`data-code128-sequence="${examNoCode128Sequence}"`));
});

test("replaceTemplateGeneratedObjectImagesInHtml suppresses empty alias values when requested", () => {
  const html =
    '<img class="template-generated-object template-generated-object-barcode" data-template-object-type="barcode" data-template-object-source="examNo" src="" alt="바코드" />';
  const result = replaceTemplateGeneratedObjectImagesInHtml(
    html,
    {
      candidate: {
        examNo: "",
      },
    },
    {
      suppressEmptyGeneratedObjects: true,
    },
  );

  assert.equal(result, "");
});

test("replaceTemplateGeneratedObjectImagesInHtml resolves the OPT10 alias", () => {
  const html =
    '<img class="template-generated-object template-generated-object-qrcode" data-template-object-type="qrcode" data-template-object-source="opt10" src="" alt="QR코드" />';
  const result = replaceTemplateGeneratedObjectImagesInHtml(
    html,
    {
      candidate: {
        opt10: "추가옵션",
      },
    },
    {
      suppressEmptyGeneratedObjects: true,
    },
  );

  assert.match(result, /title="OPT10 QR코드"/);
  assert.match(result, /src="data:image\/svg\+xml;charset=UTF-8,/);
});
