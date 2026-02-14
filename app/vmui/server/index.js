const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const { Readable } = require('stream');

const app = express();
const upload = multer({ dest: 'uploads/' });

const VICTORIA_LOGS_URL = process.env.VICTORIA_LOGS_URL || 'http://localhost:9428';

// Enable CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());

// Parse a readable stream of CSV data into an array of row objects
function parseCsvStream(stream) {
  return new Promise((resolve, reject) => {
    const results = [];
    stream
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', reject);
  });
}

// Send all rows to VictoriaLogs as a single NDJSON batch
async function sendBatchToVictoriaLogs(rows, lookupName) {
  const ndjson = rows
    .map((row) => JSON.stringify({
      ...row,
      _lookup: lookupName,
      _msg: Object.values(row).join(' '),
    }))
    .join('\n');

  const url = `${VICTORIA_LOGS_URL}/insert/jsonline?_stream_fields=_lookup&_msg_field=_msg`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/stream+json' },
    body: ndjson,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`VictoriaLogs responded with ${response.status}: ${text}`);
  }
}

// Only apply multer for multipart/form-data requests (file uploads)
const optionalFileUpload = (req, res, next) => {
  if (req.is('multipart/form-data')) {
    upload.single('file')(req, res, next);
  } else {
    next();
  }
};

// Upload CSV and send to VictoriaLogs
app.post('/api/lookup/upload', optionalFileUpload, async (req, res) => {
  let stream;
  let filename;

  if (req.body && req.body.content && req.body.filename) {
    // Pasted CSV content — convert to readable stream for csv-parser
    filename = req.body.filename;
    stream = Readable.from(req.body.content);
  } else if (req.file) {
    // File upload
    filename = req.file.originalname.replace('.csv', '');
    stream = fs.createReadStream(req.file.path);
  } else {
    return res.status(400).json({ error: 'No file or content provided' });
  }

  try {
    const rows = await parseCsvStream(stream);

    if (rows.length === 0) {
      return res.status(400).json({ error: 'CSV contains no data rows' });
    }

    console.log(`Parsed ${rows.length} rows for lookup "${filename}"`);

    await sendBatchToVictoriaLogs(rows, filename);

    res.json({
      success: true,
      filename,
      totalRows: rows.length,
    });
  } catch (err) {
    console.error('Upload error:', err.message);
    res.status(500).json({ error: err.message });
  } finally {
    if (req.file) {
      fs.unlink(req.file.path, () => {});
    }
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Lookup server running on port ${PORT}`);
  console.log(`VictoriaLogs URL: ${VICTORIA_LOGS_URL}`);
});
