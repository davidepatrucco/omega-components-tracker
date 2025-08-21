const express = require('express');
const router = express.Router();
const { ShareServiceClient, StorageSharedKeyCredential } = require('@azure/storage-file-share');
const { requireAuth } = require('../middleware/auth');

// Initialize Azure File Share client
let shareClient = null;
let rootDir = null;

function initializeAzureClient() {
  const account = process.env.AZURE_STORAGE_ACCOUNT;
  const accountKey = process.env.AZURE_STORAGE_KEY;
  const shareName = process.env.AZURE_FILE_SHARE;

  if (!account || !accountKey || !shareName) {
    console.warn('Azure File Share configuration missing. Files endpoints will not work.');
    return false;
  }

  try {
    const credential = new StorageSharedKeyCredential(account, accountKey);
    const serviceClient = new ShareServiceClient(
      `https://${account}.file.core.windows.net`,
      credential
    );
    shareClient = serviceClient.getShareClient(shareName);
    rootDir = shareClient.getDirectoryClient("");
    console.log('Azure File Share client initialized successfully');
    return true;
  } catch (error) {
    console.error('Failed to initialize Azure File Share client:', error);
    return false;
  }
}

// Initialize client on module load
const azureConfigured = initializeAzureClient();

// Middleware to check if Azure is configured
function requireAzureConfig(req, res, next) {
  if (!azureConfigured || !rootDir) {
    return res.status(503).json({ 
      error: 'Azure File Share not configured. Please check environment variables.' 
    });
  }
  next();
}

// GET /files - list all files
router.get('/', requireAuth, requireAzureConfig, async (req, res) => {
  try {
    const files = [];
    for await (const item of rootDir.listFilesAndDirectories()) {
      if (item.kind === "file") {
        files.push({
          name: item.name,
          size: item.properties?.contentLength || 0,
          lastModified: item.properties?.lastModified || null
        });
      }
    }
    res.json(files);
  } catch (err) {
    console.error('Error listing files:', err);
    res.status(500).json({ error: 'Errore nel recupero files' });
  }
});

// GET /files/:name - download/view a specific file
router.get('/:name', requireAuth, requireAzureConfig, async (req, res) => {
  try {
    const fileName = req.params.name;
    const fileClient = rootDir.getFileClient(fileName);
    
    // Check if file exists
    const exists = await fileClient.exists();
    if (!exists) {
      return res.status(404).json({ error: 'File non trovato' });
    }

    const download = await fileClient.download();
    
    // Set appropriate headers
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    
    // Pipe the file stream to response
    download.readableStreamBody.pipe(res);
  } catch (err) {
    console.error('Error downloading file:', err);
    res.status(404).json({ error: 'File non trovato' });
  }
});

module.exports = router;