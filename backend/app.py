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
    # 1. Setup
    monthly_rate = interest_rate / (12 * 100)
    try:
        base_emi = (loan_amount * monthly_rate * math.pow(1 + monthly_rate, tenure_months)) / (math.pow(1 + monthly_rate, tenure_months) - 1)
        original_total_interest = (base_emi * tenure_months) - loan_amount
    except ZeroDivisionError:
        base_emi = 0
        original_total_interest = 0

    balance = float(loan_amount)
    schedule = []
    total_interest_paid = 0.0
    
    part_payment_dict = {int(pp['month']): float(pp['amount']) for pp in part_payments or [] if pp.get('month') and pp.get('amount')}
    increased_emi_dict = {int(ee['month']): float(ee['amount']) for ee in increased_emis or [] if ee.get('month') and ee.get('amount')}
    
    # 2. Calculation Loop
    month = 1
    while balance > 0.01 and month <= tenure_months * 2: # Allow for extended tenure
        interest_this_month = balance * monthly_rate
        
        current_emi = base_emi
        for start_month, increase_amount in increased_emi_dict.items():
            if month >= start_month:
                current_emi += increase_amount
        
        principal_from_emi = current_emi - interest_this_month
        
        part_payment = part_payment_dict.get(month, 0)
        
        # Total principal available to be paid this month
        total_principal_to_pay = principal_from_emi + part_payment
        
        # Determine the actual payment
        if balance <= total_principal_to_pay:
            # This is the final payment
            principal_paid = balance
            total_payment_this_month = balance + interest_this_month
            balance = 0.0
        else:
            # This is a regular payment
            principal_paid = total_principal_to_pay
            total_payment_this_month = current_emi + part_payment
            balance -= principal_paid
            
        total_interest_paid += interest_this_month
        
        schedule.append({
            'month': month,
            'emi': round(total_payment_this_month, 2),
            'principal': round(principal_paid, 2),
            'interest': round(interest_this_month, 2),
            'remaining': round(balance, 2)
        })
        month += 1

    # 3. Final calculations
    tenure_reduction = tenure_months - len(schedule)
    interest_saved = original_total_interest - total_interest_paid
    total_amount_paid = sum(item['emi'] for item in schedule)

    return {
        'base_emi': round(base_emi, 2),
        'schedule': schedule,
        'total_interest': round(total_interest_paid, 2),
        'total_amount': round(total_amount_paid, 2),
        'original_loan_amount': round(loan_amount, 2),
        'actual_tenure': len(schedule),
        'tenure_reduction': tenure_reduction if tenure_reduction > 0 else 0,
        'interest_saved': round(interest_saved, 2) if interest_saved > 0 else 0
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
        tenure_months = int(data.get('loanTerm', 0))
        part_payments = data.get('partPayments', [])
        increased_emis = data.get('emiIncreases', [])

        # Validate inputs
        if loan_amount <= 0 or interest_rate <= 0 or tenure_months <= 0:
            return jsonify({"error": "Invalid input values"}), 400

        # Use the calculate_loan function
        result = calculate_loan(loan_amount, tenure_months, interest_rate, part_payments, increased_emis)
        
        # Ensure all expected fields are present with correct names
        response_data = {
            'base_emi': result.get('base_emi', 0),
            'total_interest': result.get('total_interest', 0),
            'total_amount': result.get('total_amount', 0),
            'original_loan_amount': result.get('original_loan_amount', loan_amount),
            'actual_tenure': result.get('actual_tenure', tenure_months),
            'tenure_reduction': result.get('tenure_reduction', 0),
            'interest_saved': result.get('interest_saved', 0),
            'schedule': result.get('schedule', [])
        }
        
        return jsonify(response_data)

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