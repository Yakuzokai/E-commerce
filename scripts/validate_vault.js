const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const DOCS_DIR = path.join(REPO_ROOT, 'docs');
const MICROSERVICES_DIR = path.join(REPO_ROOT, 'microservices');

console.log('=== OBSIDIAN VAULT AUTOMATED VALIDATION ===\n');

let errorCount = 0;
let warningCount = 0;

function reportError(msg) {
  console.error(`❌ ERROR: ${msg}`);
  errorCount++;
}

function reportWarning(msg) {
  console.warn(`⚠️  WARNING: ${msg}`);
  warningCount++;
}

function reportPass(msg) {
  console.log(`✅ PASS: ${msg}`);
}

if (!fs.existsSync(DOCS_DIR)) {
  reportError(`Docs directory does not exist at ${DOCS_DIR}`);
  process.exit(1);
}

// 1. Collect all markdown files in the vault
const allFiles = [];
function collectFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectFiles(full);
    } else if (entry.name.endsWith('.md')) {
      allFiles.push(full);
    }
  }
}
collectFiles(DOCS_DIR);

console.log(`Discovered ${allFiles.length} documentation files in ${DOCS_DIR}.\n`);

const fileMap = new Map();
const aliasesMap = new Map();

allFiles.forEach(f => {
  const base = path.basename(f, '.md');
  fileMap.set(base, f);
});

// 2. Validate Frontmatter & Collect Aliases
allFiles.forEach(f => {
  const rel = path.relative(DOCS_DIR, f);
  const content = fs.readFileSync(f, 'utf8');

  if (!content.startsWith('---')) {
    reportError(`File missing YAML frontmatter opening '---': ${rel}`);
    return;
  }

  const endIndex = content.indexOf('\n---', 3);
  if (endIndex === -1) {
    reportError(`File missing YAML frontmatter closing '---': ${rel}`);
    return;
  }

  const frontmatter = content.substring(3, endIndex);
  const lines = frontmatter.split('\n');
  const hasTitle = lines.some(l => l.trim().startsWith('title:'));
  const hasTags = lines.some(l => l.trim().startsWith('tags:'));
  const hasType = lines.some(l => l.trim().startsWith('type:'));

  if (!hasTitle) reportError(`Frontmatter missing 'title:' in ${rel}`);
  if (!hasTags) reportWarning(`Frontmatter missing 'tags:' in ${rel}`);
  if (!hasType) reportWarning(`Frontmatter missing 'type:' in ${rel}`);

  // extract aliases
  const aliasMatch = frontmatter.match(/aliases:\s*\n((?:\s*-\s*[^\n]+\n)+)/);
  if (aliasMatch) {
    const aLines = aliasMatch[1].split('\n');
    for (const al of aLines) {
      const cleaned = al.replace(/^\s*-\s*/, '').trim();
      if (cleaned) aliasesMap.set(cleaned, f);
    }
  }
});
reportPass(`YAML Frontmatter validated across all ${allFiles.length} files.`);

// 3. Validate Bidirectional [[wikilinks]]
let totalWikilinks = 0;
let brokenWikilinks = 0;

allFiles.forEach(f => {
  const rel = path.relative(DOCS_DIR, f);
  const content = fs.readFileSync(f, 'utf8');

  const wikilinkRegex = /\[\[([^\]\|]+)(?:\|([^\]]+))?\]\]/g;
  let match;
  while ((match = wikilinkRegex.exec(content)) !== null) {
    totalWikilinks++;
    let target = match[1].trim();

    // handle anchor: [[Document#Heading]]
    let headingAnchor = null;
    if (target.includes('#')) {
      const parts = target.split('#');
      target = parts[0].trim();
      headingAnchor = parts[1].trim();
    }

    if (!target && headingAnchor) {
      continue;
    }

    const targetBase = path.basename(target, '.md');
    const resolvedPath = fileMap.get(targetBase) || aliasesMap.get(target);

    if (!resolvedPath) {
      reportError(`Broken wikilink in '${rel}': [[${match[1]}]] - Target not found!`);
      brokenWikilinks++;
    } else if (headingAnchor) {
      const targetContent = fs.readFileSync(resolvedPath, 'utf8');
      const cleanAnchor = headingAnchor.replace(/[^a-zA-Z0-9 ]/g, '').toLowerCase();
      const hasHeading = targetContent.split('\n').some(l => {
        if (!l.startsWith('#')) return false;
        const cleanL = l.replace(/^#+\s+/, '').replace(/[^a-zA-Z0-9 ]/g, '').toLowerCase();
        return cleanL.includes(cleanAnchor) || cleanAnchor.includes(cleanL);
      });
      if (!hasHeading) {
        reportWarning(`Heading anchor '#${headingAnchor}' in [[${match[1]}]] not strictly matched in '${path.relative(DOCS_DIR, resolvedPath)}'`);
      }
    }
  }
});

if (brokenWikilinks === 0) {
  reportPass(`All ${totalWikilinks} wikilinks resolved successfully without broken links.`);
} else {
  reportError(`Found ${brokenWikilinks} broken wikilinks!`);
}

// 4. Validate Mermaid Code Blocks
let mermaidBlockCount = 0;
allFiles.forEach(f => {
  const rel = path.relative(DOCS_DIR, f);
  const content = fs.readFileSync(f, 'utf8');

  const mermaidBlocks = content.matchAll(/```mermaid\s*\n([\s\S]*?)```/g);
  for (const mb of mermaidBlocks) {
    mermaidBlockCount++;
    const code = mb[1].trim();
    if (!code) {
      reportError(`Empty mermaid block in ${rel}`);
    }
    const validDiagramTypes = ['flowchart', 'sequenceDiagram', 'erDiagram', 'stateDiagram', 'stateDiagram-v2', 'mindmap', 'classDiagram', 'gantt'];
    const hasValidType = validDiagramTypes.some(t => code.startsWith(t));
    if (!hasValidType) {
      reportError(`Unrecognized mermaid diagram type in ${rel}: '${code.substring(0, 30)}...'`);
    }
  }
});
reportPass(`Found and validated ${mermaidBlockCount} native Mermaid diagram blocks.`);

// 5. Verify All 14 Microservices are Documented in 02 - Services/ and Present in Architecture
const actualServices = fs.readdirSync(MICROSERVICES_DIR, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => d.name);

console.log(`\nVerifying service coverage for ${actualServices.length} repository microservices:`);

const homeContent = fs.readFileSync(path.join(DOCS_DIR, '00 - Home.md'), 'utf8');
const systemOverviewContent = fs.readFileSync(path.join(DOCS_DIR, '01 - Architecture', 'System Overview.md'), 'utf8');
const targetArchContent = fs.readFileSync(path.join(DOCS_DIR, '01 - Architecture', 'Target Architecture.md'), 'utf8');

actualServices.forEach(s => {
  let expectedTitle = s.split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  if (s === 'ml-service') expectedTitle = 'ML Service';
  if (s === 'api-gateway') expectedTitle = 'API Gateway';

  const expectedFile = s === 'api-gateway'
    ? path.join(DOCS_DIR, '01 - Architecture', 'API Gateway.md')
    : path.join(DOCS_DIR, '02 - Services', `${expectedTitle}.md`);

  if (!fs.existsSync(expectedFile)) {
    reportError(`Missing dedicated documentation file for microservice: ${s} (Expected '${expectedFile}')`);
  } else {
    reportPass(`Document verified: ${path.relative(DOCS_DIR, expectedFile)}`);
  }

  if (!homeContent.includes(`[[${expectedTitle}]]`)) {
    reportError(`Service [[${expectedTitle}]] is missing from 00 - Home.md!`);
  }
  if (s !== 'api-gateway' && !systemOverviewContent.includes(`[[${expectedTitle}]]`)) {
    reportError(`Service [[${expectedTitle}]] is missing from 01 - Architecture/System Overview.md!`);
  }
  if (!targetArchContent.includes(`[[${expectedTitle}]]`)) {
    reportError(`Service [[${expectedTitle}]] is missing from 01 - Architecture/Target Architecture.md!`);
  }
});

console.log('\n===========================================');
console.log(`Validation Complete: ${errorCount} Errors, ${warningCount} Warnings.`);
console.log('===========================================\n');

if (errorCount > 0) {
  process.exit(1);
} else {
  console.log('🎉 Obsidian Vault passed all verification checks perfectly!');
}
