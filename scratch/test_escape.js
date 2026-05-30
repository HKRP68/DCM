const { escapeHTML } = require('../utils');

const testCases = [
    { input: "Kash <3", expected: "Kash &lt;3" },
    { input: "Me & You", expected: "Me &amp; You" },
    { input: "Tag <html>", expected: "Tag &lt;html&gt;" },
    { input: "No special chars", expected: "No special chars" },
    { input: "", expected: "" },
    { input: null, expected: "" },
    { input: 123, expected: "123" }
];

testCases.forEach(tc => {
    const output = escapeHTML(tc.input);
    if (output === tc.expected) {
        console.log(`✅ PASS: "${tc.input}" -> "${output}"`);
    } else {
        console.log(`❌ FAIL: "${tc.input}" -> expected "${tc.expected}", got "${output}"`);
    }
});
