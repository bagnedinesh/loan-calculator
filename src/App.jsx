import { useState } from 'react'
import './App.css'

const API_URL = import.meta.env.PROD 
  ? 'https://loan-calculator-backend.onrender.com'
  : 'http://127.0.0.1:8000';

function App() {
  const [loanAmount, setLoanAmount] = useState('')
  const [tenureMonths, setTenureMonths] = useState('')
  const [interestRate, setInterestRate] = useState('')
  const [partPayments, setPartPayments] = useState([])
  const [increasedEmis, setIncreasedEmis] = useState([])
  const [monthlyEmi, setMonthlyEmi] = useState(null)
  const [totalInterest, setTotalInterest] = useState(null)
  const [totalAmount, setTotalAmount] = useState(null)
  const [originalLoanAmount, setOriginalLoanAmount] = useState(null)
  const [error, setError] = useState(null)
  const [showAdditionalFields, setShowAdditionalFields] = useState(false)
  const [schedule, setSchedule] = useState([])
  const [baseEmi, setBaseEmi] = useState(null)
  const [actualTenure, setActualTenure] = useState(null)
  const [validationErrors, setValidationErrors] = useState({})
  const [summary, setSummary] = useState({
    originalLoanAmount: 0,
    baseEmi: 0,
    totalInterest: 0,
    totalAmount: 0,
    remainingTenure: 0
  })

  const validateLoanAmount = (value) => {
    if (!value) return 'Loan amount is required'
    if (isNaN(value) || value <= 0) return 'Loan amount must be greater than 0'
    if (value > 1000000000) return 'Loan amount cannot exceed ₹1,000,000,000'
    return ''
  }

  const validateTenure = (value) => {
    if (!value) return 'Tenure is required'
    if (isNaN(value) || value <= 0) return 'Tenure must be greater than 0'
    if (value > 360) return 'Tenure cannot exceed 360 months (30 years)'
    return ''
  }

  const validateInterestRate = (value) => {
    if (!value) return 'Interest rate is required'
    if (isNaN(value) || value <= 0) return 'Interest rate must be greater than 0'
    if (value > 100) return 'Interest rate cannot exceed 100%'
    return ''
  }

  const validatePartPayment = (payment) => {
    if (!payment.month || !payment.amount) {
      return 'Month and amount are required';
    }
    const month = parseInt(payment.month);
    const amount = parseFloat(payment.amount);
    
    if (isNaN(month) || month <= 0) {
      return 'Month must be a positive number';
    }
    if (month > parseInt(tenureMonths)) {
      return `Month cannot exceed loan tenure (${tenureMonths} months)`;
    }
    if (isNaN(amount) || amount <= 0) {
      return 'Amount must be a positive number';
    }
    if (amount > parseFloat(loanAmount)) {
      return 'Part payment cannot exceed loan amount';
    }
    return '';
  };

  const validateEmiIncrease = (increase) => {
    if (!increase.month || !increase.amount) {
      return 'Month and amount are required';
    }
    const month = parseInt(increase.month);
    const amount = parseFloat(increase.amount);
    
    if (isNaN(month) || month <= 0) {
      return 'Month must be a positive number';
    }
    if (month > parseInt(tenureMonths)) {
      return `Month cannot exceed loan tenure (${tenureMonths} months)`;
    }
    if (isNaN(amount) || amount <= 0) {
      return 'Amount must be a positive number';
    }
    if (amount > parseFloat(loanAmount) * 2) {
      return 'EMI increase cannot exceed twice the loan amount';
    }
    return '';
  };

  const handleLoanAmountChange = (e) => {
    const value = e.target.value
    setLoanAmount(value)
    setValidationErrors(prev => ({
      ...prev,
      loanAmount: validateLoanAmount(value)
    }))
  }

  const handleTenureChange = (e) => {
    const value = e.target.value
    setTenureMonths(value)
    setValidationErrors(prev => ({
      ...prev,
      tenureMonths: validateTenure(value)
    }))
  }

  const handleInterestRateChange = (e) => {
    const value = e.target.value
    setInterestRate(value)
    setValidationErrors(prev => ({
      ...prev,
      interestRate: validateInterestRate(value)
    }))
  }

  const handlePartPaymentChange = (index, field, value) => {
    const newPartPayments = [...partPayments]
    newPartPayments[index] = {
      ...newPartPayments[index],
      [field]: value
    }
    setPartPayments(newPartPayments)
    
    // Validate the updated payment
    const error = validatePartPayment(newPartPayments[index])
    const newErrors = [...validationErrors]
    newErrors[index] = error
    setValidationErrors(newErrors)
  }

  const handleIncreasedEmiChange = (index, field, value) => {
    const newIncreasedEmis = [...increasedEmis]
    newIncreasedEmis[index] = { ...newIncreasedEmis[index], [field]: value }
    setIncreasedEmis(newIncreasedEmis)
    
    // Validate the updated EMI increase
    const error = validateEmiIncrease({ month: value, amount: newIncreasedEmis[index].amount })
    const newErrors = [...validationErrors]
    newErrors[index] = error
    setValidationErrors(newErrors)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setMonthlyEmi(null)
    setTotalInterest(null)
    setTotalAmount(null)
    setOriginalLoanAmount(null)
    setSchedule([])
    setBaseEmi(null)
    setActualTenure(null)

    // Validate all fields
    const errors = {
      loanAmount: validateLoanAmount(loanAmount),
      tenureMonths: validateTenure(tenureMonths),
      interestRate: validateInterestRate(interestRate)
    }

    // Validate part payments
    partPayments.forEach((payment, index) => {
      const paymentErrors = validatePartPayment(payment)
      if (paymentErrors) errors[`partPayment_${index}_${field}`] = paymentErrors
    })

    // Validate EMI increases
    increasedEmis.forEach((emi, index) => {
      const emiErrors = validateEmiIncrease(emi)
      if (emiErrors) errors[`increasedEmi_${index}_${field}`] = emiErrors
    })

    setValidationErrors(errors)

    // Check if there are any errors
    if (Object.values(errors).some(error => error)) {
      return
    }

    try {
      console.log('Using API URL:', API_URL); // Debug log
      const response = await fetch(`${API_URL}/calculate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        mode: 'cors',
        body: JSON.stringify({
          loan_amount: parseFloat(loanAmount),
          tenure_months: parseInt(tenureMonths),
          interest_rate: parseFloat(interestRate),
          part_payments: partPayments.filter(p => p.month && p.amount).map(p => ({
            month: parseInt(p.month),
            amount: parseFloat(p.amount)
          })),
          increased_emis: increasedEmis.filter(e => e.month && e.amount).map(e => ({
            month: parseInt(e.month),
            amount: parseFloat(e.amount)
          }))
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Response data:', data); // Debug log

      if (data.error) {
        throw new Error(data.error);
      }

      setMonthlyEmi(data.base_emi);
      setTotalInterest(data.total_interest);
      setTotalAmount(data.total_amount);
      setOriginalLoanAmount(data.original_loan_amount);
      setSchedule(data.schedule || []);
      setBaseEmi(data.base_emi);
      setActualTenure(data.actual_tenure);
      setShowAdditionalFields(true);
    } catch (err) {
      console.error('API Error:', err);
      setError(err.message || 'Failed to calculate EMI. Please try again.');
    }
  }

  const handleAddPartPayment = () => {
    setPartPayments([...partPayments, { month: '', amount: '' }])
    setValidationErrors([...validationErrors, ''])
  }

  const handleDeletePartPayment = (index) => {
    const newPartPayments = [...partPayments];
    newPartPayments.splice(index, 1);
    setPartPayments(newPartPayments);
    
    const newErrors = [...validationErrors];
    newErrors.splice(index, 1);
    setValidationErrors(newErrors);
  };

  const handleAddIncreasedEmi = () => {
    setIncreasedEmis([...increasedEmis, { month: '', amount: '' }])
    setValidationErrors([...validationErrors, ''])
  }

  const handleDeleteIncreasedEmi = (index) => {
    const newIncreasedEmis = increasedEmis.filter((_, i) => i !== index)
    const newErrors = validationErrors.filter((_, i) => i !== index)
    setIncreasedEmis(newIncreasedEmis)
    setValidationErrors(newErrors)
  }

  const handleDeleteEmiIncrease = (index) => {
    const newEmiIncreases = [...increasedEmis];
    newEmiIncreases.splice(index, 1);
    setIncreasedEmis(newEmiIncreases);
    
    const newValidationErrors = [...validationErrors];
    newValidationErrors.splice(index, 1);
    setValidationErrors(newValidationErrors);
  };

  return (
    <div className="container">
      <h1>Loan Calculator with Part Payment Feature</h1>
      <form onSubmit={handleSubmit} className="loan-form">
        <div className="input-group">
          <div>
            <label htmlFor="loanAmount">Loan Amount (₹)</label>
            <input
              type="number"
              id="loanAmount"
              value={loanAmount}
              onChange={handleLoanAmountChange}
              required
              min="0"
              step="1000"
              placeholder="Enter loan amount"
            />
            {validationErrors.loanAmount && (
              <div className="error-message">{validationErrors.loanAmount}</div>
            )}
          </div>
          <div>
            <label htmlFor="tenureMonths">Tenure (Months)</label>
            <input
              type="number"
              id="tenureMonths"
              value={tenureMonths}
              onChange={handleTenureChange}
              required
              min="1"
              max="360"
              placeholder="Enter tenure in months"
            />
            {validationErrors.tenureMonths && (
              <div className="error-message">{validationErrors.tenureMonths}</div>
            )}
          </div>
          <div>
            <label htmlFor="interestRate">Interest Rate (%)</label>
            <input
              type="number"
              id="interestRate"
              value={interestRate}
              onChange={handleInterestRateChange}
              required
              min="0"
              step="0.01"
              placeholder="Enter interest rate"
            />
            {validationErrors.interestRate && (
              <div className="error-message">{validationErrors.interestRate}</div>
            )}
          </div>
        </div>
        <button type="submit" className="calculate-btn">Calculate</button>
      </form>

      {error && <div className="error">{error}</div>}

      {showAdditionalFields && (
        <div className="additional-payments">
          <div className="part-payments">
            <h3>Part Payments</h3>
            {partPayments.map((payment, index) => (
              <div key={index} className="input-group">
                <div>
                  <input
                    type="number"
                    value={payment.month}
                    onChange={(e) => handlePartPaymentChange(index, 'month', e.target.value)}
                    placeholder="Month"
                    min="1"
                    max={tenureMonths}
                  />
                  <input
                    type="number"
                    value={payment.amount}
                    onChange={(e) => handlePartPaymentChange(index, 'amount', e.target.value)}
                    placeholder="Amount"
                    min="0"
                  />
                  <button
                    type="button"
                    className="delete-btn"
                    onClick={() => handleDeletePartPayment(index)}
                    title="Delete part payment"
                  >
                    ×
                  </button>
                </div>
                {validationErrors[index] && (
                  <div className="error-message">{validationErrors[index]}</div>
                )}
              </div>
            ))}
            <button type="button" className="add-payment-btn" onClick={handleAddPartPayment}>
              Add Part Payment
            </button>
          </div>

          <div className="emi-increases">
            <h3>EMI Increases</h3>
            {increasedEmis.map((increase, index) => (
              <div key={index} className="input-group">
                <div>
                  <input
                    type="number"
                    value={increase.month}
                    onChange={(e) => handleIncreasedEmiChange(index, 'month', e.target.value)}
                    placeholder="Month"
                    min="1"
                    max={tenureMonths}
                  />
                  <input
                    type="number"
                    value={increase.amount}
                    onChange={(e) => handleIncreasedEmiChange(index, 'amount', e.target.value)}
                    placeholder="Amount"
                    min="0"
                  />
                  <button
                    type="button"
                    className="delete-btn"
                    onClick={() => handleDeleteEmiIncrease(index)}
                    title="Delete EMI increase"
                  >
                    ×
                  </button>
                </div>
                {validationErrors[index] && (
                  <div className="error-message">{validationErrors[index]}</div>
                )}
              </div>
            ))}
            <button type="button" className="add-payment-btn" onClick={handleAddIncreasedEmi}>
              Add EMI Increase
            </button>
          </div>
        </div>
      )}

      {monthlyEmi !== null && (
        <div className="result">
          <div className="summary">
            <div className="summary-item">
              <h3>Original Loan Amount</h3>
              <p>₹{originalLoanAmount?.toLocaleString()}</p>
            </div>
            <div className="summary-item">
              <h3>Monthly EMI</h3>
              <p>₹{baseEmi?.toLocaleString()}</p>
            </div>
            <div className="summary-item">
              <h3>Total Interest</h3>
              <p>₹{totalInterest?.toLocaleString()}</p>
            </div>
            <div className="summary-item">
              <h3>Total Amount</h3>
              <p>₹{totalAmount?.toLocaleString()}</p>
            </div>
            {(partPayments.some(p => p.month && p.amount) || increasedEmis.some(e => e.month && e.amount)) && (
              <div className="summary-item">
                <h3>Tenure Reduced</h3>
                <p>{summary.remainingTenure} months</p>
              </div>
            )}
          </div>

          {schedule && schedule.length > 0 && (
            <div className="schedule-table-wrapper">
              <h3>Payment Schedule</h3>
              <table className="schedule-table">
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Opening Balance</th>
                    <th>EMI</th>
                    <th>Principal Paid</th>
                    <th>Interest Paid</th>
                    <th>Closing Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {schedule.map((row, index) => (
                    <tr key={index}>
                      <td>{row.month}</td>
                      <td>₹{index === 0 ? originalLoanAmount?.toLocaleString() : schedule[index - 1]?.balance?.toLocaleString()}</td>
                      <td>₹{row.emi?.toLocaleString()}</td>
                      <td>₹{row.principal_paid?.toLocaleString()}</td>
                      <td>₹{row.interest_paid?.toLocaleString()}</td>
                      <td>₹{row.balance?.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default App
