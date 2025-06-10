# Loan Calculator Application

A web application for calculating loan EMI with support for part payments and EMI increases.

## Features

- Calculate EMI for loans
- Support for part payments
- EMI increase functionality
- Real-time validation
- Detailed payment schedule
- Summary of loan details

## Tech Stack

- Frontend: React.js with Vite
- Backend: Python Flask
- Styling: CSS

## Setup Instructions

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Run the Flask server:
   ```bash
   python app.py
   ```

### Frontend Setup

1. Install Node.js dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

## API Endpoints

- POST `/calculate`: Calculate loan EMI and payment schedule
  - Request body: JSON with loan details
  - Response: JSON with calculation results

## Development

- Backend runs on: http://localhost:8000
- Frontend runs on: http://localhost:5173

## License

MIT
