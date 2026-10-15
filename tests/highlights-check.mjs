import assert from "node:assert";

// 1. Test smart bullet splitting
function splitBullets(text) {
  return text
    .split(/\r?\n/)
    .map((l) => l.replace(/^(\s*[-*•–—]+\s*|\s*\d+[\.\)]\s*)/, "").trim())
    .filter(Boolean);
}

const pastedText = `
* 5+ years building distributed React/Next.js systems
- Strong background in TypeScript and PostgreSQL
1. Experience with Redis and caching layers
• Ability to lead technical design reviews
`;

const parsedBullets = splitBullets(pastedText);
assert.strictEqual(parsedBullets.length, 4);
assert.strictEqual(parsedBullets[0], "5+ years building distributed React/Next.js systems");
assert.strictEqual(parsedBullets[1], "Strong background in TypeScript and PostgreSQL");
assert.strictEqual(parsedBullets[2], "Experience with Redis and caching layers");
assert.strictEqual(parsedBullets[3], "Ability to lead technical design reviews");

// 2. Test tech stack tag splitting and uniqueness
function parseTags(existing, text) {
  const tags = text
    .split(/[,;\n]/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0 && !existing.includes(t));
  return [...existing, ...tags];
}

const tags1 = parseTags([], "React, Next.js; TypeScript\nDocker");
assert.deepStrictEqual(tags1, ["React", "Next.js", "TypeScript", "Docker"]);
const tags2 = parseTags(tags1, "Docker, AWS, React");
assert.deepStrictEqual(tags2, ["React", "Next.js", "TypeScript", "Docker", "AWS"]);

// 3. Test serialization into custom_fields._highlights
const sampleHighlights = {
  requirements: parsedBullets,
  techStack: tags2,
  interviewNotes: [
    {
      id: "round-1",
      round: "Technical Screen",
      bullets: ["Covered system design", "Clarified SSR vs SSG"],
    },
  ],
};

const customFields = { priority: "High" };
const serialized = {
  ...customFields,
  _highlights: JSON.stringify(sampleHighlights),
};

assert.strictEqual(typeof serialized._highlights, "string");
const deserialized = JSON.parse(serialized._highlights);
assert.deepStrictEqual(deserialized, sampleHighlights);

console.log("All Highlights Vault checks passed successfully!");
