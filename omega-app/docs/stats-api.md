# Stats API Documentation

## Endpoint: GET /getStats

This endpoint calculates and returns dashboard indicators for the lavorazione (processing) page.

### Response Format

```json
{
  "inLavorazione": {
    "count": 3,
    "label": "In lavorazione"
  },
  "daSpedire": {
    "count": 1,
    "label": "Da spedire"
  },
  "verificato": {
    "count": 2,
    "percentage": 67,
    "total": 3,
    "label": "Non verificati"
  },
  "speditiOggi": {
    "count": 2,
    "label": "Spediti oggi"
  },
  "commesseAperte": {
    "count": 1,
    "label": "Commesse aperte"
  },
  "inTrattamento": {
    "count": 1,
    "label": "In trattamento"
  },
  "meta": {
    "totalComponents": 6,
    "timestamp": "2025-08-21T09:56:09.644Z",
    "calculatedAt": "8/21/2025"
  }
}
```

### Indicators Description

1. **inLavorazione**: Number of all components in the system where status is not "spedito" (status != '6')

2. **daSpedire**: Sum of components that are in "pronto per consegna" status (status = '5')

3. **verificato**: Number of non-shipped components where the `verificato` flag is false. Also expressed as percentage of total non-shipped components.

4. **speditiOggi**: Number of components that are in "spedito" status (status = '6') with today's date in their history

5. **commesseAperte**: Number of open orders (commesse) that have at least one component that is not in "spedito" status

6. **inTrattamento**: Number of components that are in one of the treatment states (status starting with '4:')

### Status Codes Reference

- '1' = Nuovo
- '2' = Produzione Interna
- '3' = Produzione Esterna / Costruito
- '4:*:*' = Treatment states (e.g., '4:ZINCATURA:IN')
- '5' = Pronto per consegna
- '6' = Spedito

### Usage

```bash
curl http://localhost:4000/getStats
```

### Error Handling

- Returns 500 status code with error message if calculation fails
- Handles edge cases like empty database gracefully
- All percentages are rounded to nearest integer