import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, '..', '..');
const markersPath = path.join(workspaceRoot, 'scratch-tar1090', 'html', 'markers.js');
const defaultsPath = path.join(workspaceRoot, 'scratch-tar1090', 'html', 'defaults.js');
const outputPath = path.join(workspaceRoot, 'explorer-v2', 'frontend', 'src', 'earth', 'flights', 'tar1090.generated.ts');

const markersSource = fs.readFileSync(markersPath, 'utf8');
const defaultsSource = fs.readFileSync(defaultsPath, 'utf8');

const ulacPreset = evaluateExpression(extractExpression(markersSource, 'const _ulac =', ';'));
const shapes = evaluateObject(extractObject(markersSource, 'let shapes ='));
const typeDesignatorIcons = evaluateObject(
  extractObject(markersSource, 'let TypeDesignatorIcons ='),
  { _ulac: ulacPreset },
);
const typeDescriptionIcons = evaluateObject(
  extractObject(markersSource, 'let TypeDescriptionIcons ='),
  { _ulac: ulacPreset },
);
const categoryIcons = evaluateObject(
  extractObject(markersSource, 'let CategoryIcons ='),
  { _ulac: ulacPreset },
);
const colorByAlt = evaluateObject(extractObject(defaultsSource, 'let ColorByAlt ='));
const outlineColor = extractStringLiteral(defaultsSource, 'let OutlineADSBColor =');
const outlineWidth = extractNumberLiteral(defaultsSource, 'let outlineWidth =');

const output = `/* eslint-disable */
// Generated from scratch-tar1090/html/markers.js and defaults.js.
// Run: node explorer-v2/scripts/generate-tar1090-visuals.mjs

export const TAR1090_OUTLINE_ADSB_COLOR = ${JSON.stringify(outlineColor)} as const;
export const TAR1090_OUTLINE_WIDTH = ${JSON.stringify(outlineWidth)} as const;

export const TAR1090_COLOR_BY_ALT = ${serialize(colorByAlt)} as const;
export const TAR1090_SHAPES = ${serialize(shapes)} as const;
export const TAR1090_TYPE_DESIGNATOR_ICONS = ${serialize(typeDesignatorIcons)} as const;
export const TAR1090_TYPE_DESCRIPTION_ICONS = ${serialize(typeDescriptionIcons)} as const;
export const TAR1090_CATEGORY_ICONS = ${serialize(categoryIcons)} as const;

export type Tar1090ShapeKey = keyof typeof TAR1090_SHAPES;
`;

fs.writeFileSync(outputPath, output, 'utf8');
console.log(`Generated ${path.relative(workspaceRoot, outputPath)}`);

function evaluateObject(objectLiteral, context = {}) {
  return vm.runInNewContext(`(${objectLiteral})`, context);
}

function evaluateExpression(expression, context = {}) {
  return vm.runInNewContext(expression, context);
}

function extractObject(source, marker) {
  const markerIndex = source.indexOf(marker);
  if (markerIndex === -1) {
    throw new Error(`Marker not found: ${marker}`);
  }

  const start = source.indexOf('{', markerIndex);
  if (start === -1) {
    throw new Error(`Object start not found for: ${marker}`);
  }

  return extractBalanced(source, start, '{', '}');
}

function extractExpression(source, marker, endToken) {
  const markerIndex = source.indexOf(marker);
  if (markerIndex === -1) {
    throw new Error(`Expression marker not found: ${marker}`);
  }

  const start = markerIndex + marker.length;
  const end = source.indexOf(endToken, start);
  if (end === -1) {
    throw new Error(`Expression end not found for: ${marker}`);
  }

  return source.slice(start, end).trim();
}

function extractBalanced(source, startIndex, openChar, closeChar) {
  let depth = 0;
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inTemplate = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let index = startIndex; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];
    const previous = source[index - 1];

    if (inLineComment) {
      if (char === '\n') {
        inLineComment = false;
      }
      continue;
    }

    if (inBlockComment) {
      if (char === '*' && next === '/') {
        inBlockComment = false;
        index += 1;
      }
      continue;
    }

    if (!inSingleQuote && !inDoubleQuote && !inTemplate) {
      if (char === '/' && next === '/') {
        inLineComment = true;
        index += 1;
        continue;
      }
      if (char === '/' && next === '*') {
        inBlockComment = true;
        index += 1;
        continue;
      }
    }

    if (!inDoubleQuote && !inTemplate && char === '\'' && previous !== '\\') {
      inSingleQuote = !inSingleQuote;
      continue;
    }

    if (!inSingleQuote && !inTemplate && char === '"' && previous !== '\\') {
      inDoubleQuote = !inDoubleQuote;
      continue;
    }

    if (!inSingleQuote && !inDoubleQuote && char === '`' && previous !== '\\') {
      inTemplate = !inTemplate;
      continue;
    }

    if (inSingleQuote || inDoubleQuote || inTemplate) {
      continue;
    }

    if (char === openChar) {
      depth += 1;
    } else if (char === closeChar) {
      depth -= 1;
      if (depth === 0) {
        return source.slice(startIndex, index + 1);
      }
    }
  }

  throw new Error(`Unbalanced structure for marker starting at index ${startIndex}`);
}

function extractStringLiteral(source, marker) {
  const pattern = new RegExp(`${escapeRegExp(marker)}\\s*['"]([^'"]+)['"]`);
  const match = source.match(pattern);
  if (!match) {
    throw new Error(`String literal not found for ${marker}`);
  }
  return match[1];
}

function extractNumberLiteral(source, marker) {
  const pattern = new RegExp(`${escapeRegExp(marker)}\\s*([0-9]+(?:\\.[0-9]+)?)`);
  const match = source.match(pattern);
  if (!match) {
    throw new Error(`Number literal not found for ${marker}`);
  }
  return Number(match[1]);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function serialize(value) {
  return JSON.stringify(value, null, 2);
}
