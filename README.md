# Loan Calculator Backend

Flask API backend for the loan calculator application.

## Features

- EMI calculation with part payments
- EMI increases functionality
- Interest saved and tenure reduction calculations
- Detailed payment schedule
- Real-time calculations

## Deployment

This backend is designed to be deployed on Railway.

## API Endpoints

- `POST /calculate` - Calculate loan EMI and schedule
- `GET /health` - Health check endpoint
- `GET /` - API status

## Environment Variables

- `PORT` - Port number (Railway sets this automatically)
