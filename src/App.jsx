import { useState, useCallback } from 'react'
import './App.css'

// Use the deployed Render backend URL
const API_URL = 'https://loan-calculator-backend-4wxp.onrender.com';

function App() {
  // Input state
  const [loanAmount, setLoanAmount] = useState('')
  const [tenureMonths, setTenureMonths] = useState('')
  const [interestRate, setInterestRate] = useState('')
  
  // Additional payment state
  const [partPayments, setPartPayments] = useState([])
  const [increasedEmis, setIncreasedEmis] = useState([])
  
  // UI state
  const [error, setError] = useState(null)
  const [results, setResults] = useState(null)

  // Add state for new part payment and EMI increase input rows
  const [newPartPayment, setNewPartPayment] = useState({ month: '', amount: '' });
  const [newEmiIncrease, setNewEmiIncrease] = useState({ month: '', amount: '' });

  const resetCalculation = () => {
    setResults(null)
    setError(null)
    setPartPayments([])
    setIncreasedEmis([])
  }

  const performCalculation = useCallback(async (currentPartPayments, currentIncreasedEmis) => {
    if (!loanAmount || !tenureMonths || !interestRate) return

    try {
      const response = await fetch(`${API_URL}/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loanAmount: parseFloat(loanAmount),
          loanTerm: parseInt(tenureMonths),
          interestRate: parseFloat(interestRate),
          partPayments: currentPartPayments.filter(p => p.month && p.amount),
          emiIncreases: currentIncreasedEmis.filter(e => e.month && e.amount),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setResults(data);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to calculate EMI.');
      setResults(null);
    }
  }, [loanAmount, tenureMonths, interestRate]);

  const handleSubmit = (e) => {
    e.preventDefault()
    resetCalculation()
    performCalculation([], [])
  }

  const handleAddPartPayment = () => {
    if (!newPartPayment.month || !newPartPayment.amount) return;
    setPartPayments([...partPayments, { ...newPartPayment }]);
    setNewPartPayment({ month: '', amount: '' });
    recalculate([...partPayments, { ...newPartPayment }], increasedEmis);
  };
  const handleDeletePartPayment = (index) => {
    const newPartPayments = partPayments.filter((_, i) => i !== index)
    setPartPayments(newPartPayments)
    recalculate(newPartPayments, increasedEmis)
  }
  const handlePartPaymentChange = (index, field, value) => {
    const newPartPayments = partPayments.map((p, i) => (i === index ? { ...p, [field]: value } : p))
    setPartPayments(newPartPayments)
    recalculate(newPartPayments, increasedEmis)
  }

  const handleAddIncreasedEmi = () => {
    if (!newEmiIncrease.month || !newEmiIncrease.amount) return;
    setIncreasedEmis([...increasedEmis, { ...newEmiIncrease }]);
    setNewEmiIncrease({ month: '', amount: '' });
    recalculate(partPayments, [...increasedEmis, { ...newEmiIncrease }]);
  };
  const handleDeleteIncreasedEmi = (index) => {
    const newIncreasedEmis = increasedEmis.filter((_, i) => i !== index)
    setIncreasedEmis(newIncreasedEmis)
    recalculate(partPayments, newIncreasedEmis)
  }
  const handleIncreasedEmiChange = (index, field, value) => {
    const newIncreasedEmis = increasedEmis.map((e, i) => (i === index ? { ...e, [field]: value } : e))
    setIncreasedEmis(newIncreasedEmis)
    recalculate(partPayments, newIncreasedEmis)
  }
  
  const recalculate = (newPartPayments, newIncreasedEmis) => {
    performCalculation(newPartPayments, newIncreasedEmis)
  }

  // Real-time recalculation on key down
  const handleKeyDown = (type, index, field, value) => {
    if (type === 'partPayment') {
      const newPartPayments = partPayments.map((p, i) => (i === index ? { ...p, [field]: value } : p))
      recalculate(newPartPayments, increasedEmis)
    } else if (type === 'emiIncrease') {
      const newIncreasedEmis = increasedEmis.map((e, i) => (i === index ? { ...e, [field]: value } : e))
      recalculate(partPayments, newIncreasedEmis)
    }
  }

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
              onChange={(e) => { setLoanAmount(e.target.value); resetCalculation(); }}
              required
              min="0"
              step="1000"
              placeholder="Enter loan amount"
            />
          </div>
          <div>
            <label htmlFor="tenureMonths">Tenure (Months)</label>
            <input
              type="number"
              id="tenureMonths"
              value={tenureMonths}
              onChange={(e) => { setTenureMonths(e.target.value); resetCalculation(); }}
              required
              min="1"
              max="360"
              placeholder="Enter tenure in months"
            />
          </div>
          <div>
            <label htmlFor="interestRate">Interest Rate (%)</label>
            <input
              type="number"
              id="interestRate"
              value={interestRate}
              onChange={(e) => { setInterestRate(e.target.value); resetCalculation(); }}
              required
              min="0"
              step="0.01"
              placeholder="Enter interest rate"
            />
          </div>
        </div>
        <button type="submit" className="calculate-btn">Calculate</button>
      </form>

      {error && <div className="error">{error}</div>}

      {results && (
        <>
          <div className="additional-payments">
            <div className="part-payments">
              <h3>Part Payments</h3>
              {partPayments.map((payment, index) => (
                <div key={index} className="payment-row">
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
              ))}
              <div className="payment-row">
                <input
                  type="number"
                  value={newPartPayment.month}
                  onChange={(e) => setNewPartPayment({ ...newPartPayment, month: e.target.value })}
                  placeholder="Month"
                  min="1"
                  max={tenureMonths}
                />
                <input
                  type="number"
                  value={newPartPayment.amount}
                  onChange={(e) => setNewPartPayment({ ...newPartPayment, amount: e.target.value })}
                  placeholder="Amount"
                  min="0"
                />
                <button type="button" className="add-payment-btn" onClick={handleAddPartPayment}>
                  Add
                </button>
              </div>
            </div>

            <div className="emi-increases">
              <h3>EMI Increases</h3>
              {increasedEmis.map((increase, index) => (
                <div key={index} className="emi-row">
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
                    onClick={() => handleDeleteIncreasedEmi(index)}
                    title="Delete EMI increase"
                  >
                    ×
                  </button>
                </div>
              ))}
              <div className="emi-row">
                <input
                  type="number"
                  value={newEmiIncrease.month}
                  onChange={(e) => setNewEmiIncrease({ ...newEmiIncrease, month: e.target.value })}
                  placeholder="Month"
                  min="1"
                  max={tenureMonths}
                />
                <input
                  type="number"
                  value={newEmiIncrease.amount}
                  onChange={(e) => setNewEmiIncrease({ ...newEmiIncrease, amount: e.target.value })}
                  placeholder="Amount"
                  min="0"
                />
                <button type="button" className="add-emi-btn" onClick={handleAddIncreasedEmi}>
                  Add
                </button>
              </div>
            </div>
          </div>

          <div className="result">
            <div className="summary">
              <div className="summary-item">
                <h3>Original Loan Amount</h3>
                <p>₹{results.original_loan_amount?.toLocaleString()}</p>
              </div>
              <div className="summary-item">
                <h3>Monthly EMI</h3>
                <p>₹{results.base_emi?.toLocaleString()}</p>
              </div>
              <div className="summary-item">
                <h3>Total Interest</h3>
                <p>₹{results.total_interest?.toLocaleString()}</p>
              </div>
              <div className="summary-item">
                <h3>Total Amount</h3>
                <p>₹{results.total_amount?.toLocaleString()}</p>
              </div>
              <div className="summary-item">
                <h3>Original Tenure</h3>
                <p>{tenureMonths} months</p>
              </div>
              {results.tenure_reduction > 0 && (
                <div className="summary-item">
                  <h3>Tenure Reduced By</h3>
                  <p>{results.tenure_reduction} months</p>
                </div>
              )}
              {results.interest_saved > 0 && (
                <div className="summary-item">
                  <h3>Interest Saved</h3>
                  <p>₹{results.interest_saved?.toLocaleString()}</p>
                </div>
              )}
              {results.tenure_reduction > 0 && (
                <div className="summary-item">
                  <h3>New Loan Term</h3>
                  <p>{results.actual_tenure} months</p>
                </div>
              )}
            </div>

            {results.schedule && results.schedule.length > 0 && (
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
                    {results.schedule.map((row, index) => (
                      <tr key={index}>
                        <td>{row.month}</td>
                        <td>₹{index === 0 ? results.original_loan_amount?.toLocaleString() : results.schedule[index - 1]?.remaining?.toLocaleString()}</td>
                        <td>₹{row.emi?.toLocaleString()}</td>
                        <td>₹{row.principal?.toLocaleString()}</td>
                        <td>₹{row.interest?.toLocaleString()}</td>
                        <td>₹{row.remaining?.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default App
