from flask import Flask, request, jsonify
from flask_cors import CORS
import math
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

# Configure CORS with specific origins
CORS(app, resources={
    r"/*": {
        "origins": [
            "http://localhost:5173",
            "https://bagnedinesh.github.io",
            "https://bagnedinesh.github.io/loan-calculator"
        ],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type"]
    }
})

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

@app.route('/calculate', methods=['POST', 'OPTIONS'])
def calculate_emi():
    if request.method == 'OPTIONS':
        return '', 200
        
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400

        # Extract values with defaults
        loan_amount = float(data.get('loanAmount', 0))
        interest_rate = float(data.get('interestRate', 0))
        loan_term = int(data.get('loanTerm', 0))
        part_payments = data.get('partPayments', [])
        emi_increases = data.get('emiIncreases', [])

        # Validate inputs
        if loan_amount <= 0 or interest_rate <= 0 or loan_term <= 0:
            return jsonify({"error": "Invalid input values"}), 400

        # Calculate monthly interest rate
        monthly_rate = interest_rate / 12 / 100

        # Calculate base EMI
        base_emi = loan_amount * monthly_rate * (1 + monthly_rate)**loan_term / ((1 + monthly_rate)**loan_term - 1)

        # Initialize variables for tracking
        remaining_principal = loan_amount
        total_interest = 0
        total_paid = 0
        current_emi = base_emi
        schedule = []

        # Process each month
        for month in range(1, loan_term + 1):
            # Calculate interest for this month
            interest_payment = remaining_principal * monthly_rate
            
            # Calculate principal payment
            principal_payment = current_emi - interest_payment
            
            # Check for part payments in this month
            part_payment = 0
            for payment in part_payments:
                if payment['month'] == month:
                    part_payment += float(payment['amount'])
            
            # Check for EMI increases in this month
            for increase in emi_increases:
                if increase['month'] == month:
                    current_emi += float(increase['amount'])
            
            # Update principal payment with part payment
            principal_payment += part_payment
            
            # Update totals
            remaining_principal -= principal_payment
            total_interest += interest_payment
            total_paid += principal_payment + interest_payment
            
            # Add to schedule
            schedule.append({
                'month': month,
                'emi': round(current_emi, 2),
                'principal': round(principal_payment, 2),
                'interest': round(interest_payment, 2),
                'remaining': round(remaining_principal, 2) if remaining_principal > 0 else 0
            })

        return jsonify({
            'base_emi': round(base_emi, 2),
            'total_interest': round(total_interest, 2),
            'total_payment': round(total_paid, 2),
            'schedule': schedule
        })

    except Exception as e:
        print(f"Error calculating EMI: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy"}), 200

@app.route('/')
def home():
    return jsonify({"status": "API is running"})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8000))
    app.run(host='0.0.0.0', port=port) 