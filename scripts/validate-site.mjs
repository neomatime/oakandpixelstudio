import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const config = JSON.parse(await readFile(path.join(root, "site.config.json"), "utf8"));
const failures = [];

function fail(message) {
  failures.push(message);
}

function extractScripts(html) {
  return [...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)].map((match) => ({
    attrs: match[1],
    body: match[2],
  }));
}

function hasMeta(html, name) {
  return new RegExp(`<meta\\s+name=["']${name}["']\\s+content=["'][^"']+["']`, "i").test(html);
}

function hasProperty(html, property) {
  return new RegExp(`<meta\\s+property=["']${property}["']\\s+content=["'][^"']+["']`, "i").test(html);
}

function checkBlankTargets(file, html) {
  const links = [...html.matchAll(/<a\b[^>]*target=["']_blank["'][^>]*>/gi)].map((match) => match[0]);
  for (const link of links) {
    if (!/\brel=["'][^"']*\bnoopener\b[^"']*\bnoreferrer\b[^"']*["']/i.test(link)) {
      fail(`${file}: external target="_blank" link is missing rel="noopener noreferrer": ${link}`);
    }
  }
}

async function exists(relativePath) {
  try {
    await stat(path.join(root, relativePath));
    return true;
  } catch {
    return false;
  }
}

for (const file of config.validation.requiredFiles) {
  if (!(await exists(file))) fail(`Missing required file: ${file}`);
}

const htmlFiles = config.pages.map((page) => page.file);
for (const page of config.pages) {
  const filePath = path.join(root, page.file);
  const html = await readFile(filePath, "utf8");

  if (!html.includes(`<link rel="canonical" href="${page.url}">`)) {
    fail(`${page.file}: canonical URL does not match ${page.url}`);
  }

  for (const metaName of ["description", "twitter:card", "twitter:title", "twitter:description", "twitter:image"]) {
    if (!hasMeta(html, metaName)) fail(`${page.file}: missing meta name="${metaName}"`);
  }

  for (const property of ["og:type", "og:site_name", "og:title", "og:description", "og:url", "og:image"]) {
    if (!hasProperty(html, property)) fail(`${page.file}: missing meta property="${property}"`);
  }

  for (const forbidden of config.validation.forbiddenPatterns) {
    if (html.includes(forbidden)) fail(`${page.file}: forbidden pattern found: ${forbidden}`);
  }

  checkBlankTargets(page.file, html);

  for (const script of extractScripts(html)) {
    const type = script.attrs.match(/type=["']([^"']+)["']/i)?.[1]?.toLowerCase() || "text/javascript";
    if (type === "application/ld+json") {
      try {
        JSON.parse(script.body.trim());
      } catch (error) {
        fail(`${page.file}: invalid JSON-LD: ${error.message}`);
      }
    }
  }
}

const sitemap = await readFile(path.join(root, "sitemap.xml"), "utf8");
for (const page of config.pages) {
  if (!sitemap.includes(`<loc>${page.url}</loc>`)) fail(`sitemap.xml: missing ${page.url}`);
}

const robots = await readFile(path.join(root, "robots.txt"), "utf8");
if (!robots.includes(`${config.site.baseUrl}/sitemap.xml`)) fail("robots.txt: missing sitemap URL");
if (!robots.includes(`${config.site.baseUrl}/llms.txt`)) fail("robots.txt: missing llms.txt reference");

const rootFiles = await readdir(root);
for (const unexpected of rootFiles.filter((file) => /^oakandpixel-work-|^oakandpixel-maintain-/.test(file))) {
  fail(`Unexpected temporary artifact in repo root: ${unexpected}`);
}

try {
  const answerEngine = JSON.parse(await readFile(path.join(root, "answer-engine.json"), "utf8"));
  if (answerEngine.canonical_url !== config.site.baseUrl + "/") {
    fail("answer-engine.json: canonical_url does not match site base URL");
  }
  if (!Array.isArray(answerEngine.questions) || answerEngine.questions.length < 3) {
    fail("answer-engine.json: expected at least three answer-ready questions");
  }
} catch (error) {
  fail(`answer-engine.json: invalid JSON: ${error.message}`);
}

if (failures.length) {
  console.error("Site validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Site validation passed for ${htmlFiles.length} pages.`);
