# Azure File Share Configuration for Omega Components Tracker

This document explains how to configure Azure Files integration.

## Environment Variables

Add the following environment variables to your `.env` file:

```env
# Azure File Share Configuration
AZURE_STORAGE_ACCOUNT=your_storage_account_name
AZURE_STORAGE_KEY=your_storage_account_key
AZURE_FILE_SHARE=your_file_share_name
```

## Example Configuration

```env
# Example (replace with your actual values)
AZURE_STORAGE_ACCOUNT=omegastorage
AZURE_STORAGE_KEY=abcd1234...your_key_here...
AZURE_FILE_SHARE=commessa-files
```

## API Endpoints

The Azure Files integration provides the following API endpoints:

### GET `/api/files`
Lists all files in the Azure File Share.

**Response:**
```json
[
  {
    "name": "document.pdf",
    "size": 1024567,
    "lastModified": "2024-01-15T10:30:00Z"
  }
]
```

### GET `/api/files/:name`
Downloads a specific file from the Azure File Share.

**Parameters:**
- `name`: The name of the file to download

**Response:**
- File content as blob/stream with appropriate headers

## Frontend Interface

The "Vedi Files" menu item provides a user-friendly interface to:
- View all files in the Azure File Share
- See file sizes and modification dates
- Download files with a single click
- Refresh the file list

## Error Handling

If Azure configuration is missing or incorrect:
- Backend logs a warning on startup
- API endpoints return HTTP 503 with appropriate error message
- Frontend shows error messages to users

## Security

- All endpoints require user authentication
- Uses Azure Storage Shared Key Credential for secure access
- File downloads are streamed directly from Azure to user