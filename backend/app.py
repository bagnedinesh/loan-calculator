from flask import Flask, request, jsonify
from flask_cors import CORS
import math
import os

app = Flask(__name__)

# Configure CORS
CORS(app, 
     resources={r"/*": {
         "origins": ["http://localhost:5173", "https://bagnedinesh.github.io", "https://bagnedinesh.github.io/loan-calculator"],
         "methods": ["GET", "POST", "OPTIONS"],
         "allow_headers": ["Content-Type", "Authorization"],
         "expose_headers": ["Content-Type", "Authorization"],
         "supports_credentials": False,
         "max_age": 3600
     }},
     supports_credentials=False
)

def calculate_loan(loan_amount, tenure_months, interest_rate, part_payments=None, increased_emis=None):
    # Convert annual interest rate to monthly
    monthly_rate = interest_rate / (12 * 100)
    
    # Calculate base EMI
    base_emi = loan_amount * monthly_rate * math.pow(1 + monthly_rate, tenure_months) / (math.pow(1 + monthly_rate, tenure_months) - 1)
    
    # Initialize variables
    balance = loan_amount
    schedule = []
    total_interest = 0
    total_amount = 0
    part_payments = part_payments or []
    increased_emis = increased_emis or []
    
    # Create a dictionary of part payments and increased EMIs for easy lookup
    part_payment_dict = {pp['month']: pp['amount'] for pp in part_payments}
    increased_emi_dict = {ee['month']: ee['amount'] for ee in increased_emis}
    
    # Calculate schedule
    month = 1
    while month <= tenure_months and balance > 0:
        # Calculate interest for this month
        interest_paid = balance * monthly_rate
        
        # Get EMI for this month (base EMI + any increases from previous months)
        current_emi = base_emi
        for start_month, increase_amount in increased_emi_dict.items():
            if month >= start_month:
                current_emi += increase_amount
        
        # Calculate principal paid
        principal_paid = current_emi - interest_paid
        
        # Add part payment if any
        if month in part_payment_dict:
            principal_paid += part_payment_dict[month]
        
        # Update balance
        balance -= principal_paid
        
        # If balance becomes negative, adjust principal paid
        if balance < 0:
            principal_paid += balance
            balance = 0
        
        # Calculate total payment for this month
        total_payment = principal_paid + interest_paid
        
        # Update totals
        total_interest += interest_paid
        total_amount += total_payment
        
        # Add to schedule
        schedule.append({
            'month': month,
            'emi': round(current_emi, 2),
            'principal_paid': round(principal_paid, 2),
            'interest_paid': round(interest_paid, 2),
            'total_payment': round(total_payment, 2),
            'balance': round(balance, 2)
        })
        
        month += 1
    
    return {
        'base_emi': round(base_emi, 2),
        'schedule': schedule,
        'total_interest': round(total_interest, 2),
        'total_amount': round(total_amount, 2),
        'original_loan_amount': round(loan_amount, 2),
        'actual_tenure': len(schedule)
    }

@app.route('/calculate', methods=['POST'])
def calculate():
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['loan_amount', 'tenure_months', 'interest_rate']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        # Extract and validate data
        loan_amount = float(data['loan_amount'])
        tenure_months = int(data['tenure_months'])
        interest_rate = float(data['interest_rate'])
        part_payments = data.get('part_payments', [])
        increased_emis = data.get('increased_emis', [])
        
        # Validate values
        if loan_amount <= 0:
            return jsonify({'error': 'Loan amount must be positive'}), 400
        if tenure_months <= 0:
            return jsonify({'error': 'Tenure must be positive'}), 400
        if interest_rate <= 0:
            return jsonify({'error': 'Interest rate must be positive'}), 400
        
        # Calculate loan
        result = calculate_loan(loan_amount, tenure_months, interest_rate, part_payments, increased_emis)
        return jsonify(result)
        
    except ValueError as e:
        return jsonify({'error': 'Invalid input values'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy"}), 200

@app.route('/', methods=['GET'])
def root():
    return jsonify({"message": "Loan Calculator API is running"}), 200

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8000))
    app.run(host='0.0.0.0', port=port, debug=False) 