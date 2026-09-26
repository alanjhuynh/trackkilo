const BOM = 0xfeff;
const FORMULA_START = /^[=+\-@]/;

// Picks the delimiter that splits the header row the most (Excel in some
// locales writes semicolons)
function detectDelimiter(text) {
  const header = text.split(/\r?\n/, 1)[0];
  return [',', ';', '\t']
    .map((delimiter) => [delimiter, header.split(delimiter).length])
    .sort((a, b) => b[1] - a[1])[0][0];
}

// RFC 4180 parsing: quoted fields, doubled quotes, line breaks inside quotes.
// Returns rows as arrays of strings, skipping blank lines.
export function parseCsv(input) {
  const text = input.charCodeAt(0) === BOM ? input.slice(1) : input;
  const delimiter = detectDelimiter(text);
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"' && field === '') {
      quoted = true;
    } else if (char === delimiter) {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }

  return rows
    .map((cells) => cells.map(unprotectCell))
    .filter((cells) => cells.some((cell) => cell.trim() !== ''));
}

// Spreadsheet apps run cells starting with = + - @ as formulas, so exported
// text cells get a leading apostrophe (removed again on import)
const protectCell = (value) => (typeof value === 'string' && FORMULA_START.test(value) ? `'${value}` : value);
const unprotectCell = (value) => (/^'[=+\-@]/.test(value) ? value.slice(1) : value);

export function toCsv(rows) {
  return rows
    .map((row) => row
      .map((cell) => {
        const text = cell === null || cell === undefined ? '' : String(protectCell(cell));
        return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
      })
      .join(','))
    .join('\r\n');
}
