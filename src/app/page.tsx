"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"
import { AlertCircle, Calculator } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function CalculatorPage() {
  const [salary, setSalary] = useState("")
  const [state, setState] = useState("CA")
  const [benefits, setBenefits] = useState("basic")
  const [totalCost, setTotalCost] = useState<null | {
    base: number
    taxes: {
      socialSecurity: number
      medicare: number
      federalUnemployment: number
      stateUnemployment: number
    }
    benefits: number
    total: number
  }>(null)

  const [hourlyRate, setHourlyRate] = useState("")
  const [hoursWorked, setHoursWorked] = useState("")
  const [overtime, setOvertime] = useState("")
  const [payFrequency, setPayFrequency] = useState("weekly")
  const [filingStatus, setFilingStatus] = useState("single")
  const [allowances, setAllowances] = useState("0")
  const [paycheck, setPaycheck] = useState<null | {
    gross: number
    deductions: {
      federal: number
      state: number
      socialSecurity: number
      medicare: number
    }
    net: number
  }>(null)

  const [errors, setErrors] = useState<{
    salary?: string;
    hourlyRate?: string;
    hoursWorked?: string;
    overtime?: string;
  }>({})

  const [stateTaxRates, setStateTaxRates] = useState({
    CA: { name: "California", rate: 0.093 },
    NY: { name: "New York", rate: 0.109 },
    TX: { name: "Texas", rate: 0.0 }
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchTaxRates = async () => {
      try {
        const response = await fetch('/api/tax-rates')
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        const contentType = response.headers.get('content-type')
        if (!contentType || !contentType.includes('application/json')) {
          throw new TypeError("Oops, we haven't got JSON!")
        }
        const data = await response.json()
        setStateTaxRates(data)
      } catch (err) {
        console.error('Error fetching tax rates:', err)
        setError('Using default tax rates')
      } finally {
        setIsLoading(false)
      }
    }

    fetchTaxRates()
  }, [])

  const calculateEmployeeCost = () => {
    setErrors({})

    const baseSalary = parseFloat(salary) || 0
    
    const socialSecurityRate = 0.062
    const medicareRate = 0.0145
    const federalUnemploymentRate = 0.06
    const stateUnemploymentRates = {
      CA: 0.034,
      NY: 0.038,
      TX: 0.027
    }

    const benefitsRates = {
      basic: 0.2,
      standard: 0.25,
      premium: 0.3
    }

    const socialSecurity = baseSalary * socialSecurityRate
    const medicare = baseSalary * medicareRate
    const federalUnemployment = Math.min(baseSalary, 7000) * federalUnemploymentRate
    const stateUnemployment = Math.min(baseSalary, 7000) * stateUnemploymentRates[state as keyof typeof stateUnemploymentRates]
    const benefitsCost = baseSalary * benefitsRates[benefits as keyof typeof benefitsRates]

    const total = socialSecurity + medicare + federalUnemployment + stateUnemployment + benefitsCost

    setTotalCost({
      base: baseSalary,
      taxes: {
        socialSecurity,
        medicare,
        federalUnemployment,
        stateUnemployment
      },
      benefits: benefitsCost,
      total: baseSalary + total
    })
  }

  const calculateHourlyPay = () => {
    setErrors({})

    const rate = parseFloat(hourlyRate) || 0
    const hours = parseFloat(hoursWorked) || 0
    const overtimeHours = parseFloat(overtime) || 0
    const overtimeRate = rate * 1.5

    const regularPay = rate * hours
    const overtimePay = overtimeRate * overtimeHours
    const grossPay = regularPay + overtimePay

    const payPeriodMultiplier = {
      weekly: 1,
      biweekly: 2,
      monthly: 52/12
    }
    const periodGrossPay = grossPay * payPeriodMultiplier[payFrequency as keyof typeof payPeriodMultiplier]

    const federalTaxRate = {
      single: periodGrossPay <= 11600 ? 0.10 : 
              periodGrossPay <= 47150 ? 0.12 :
              periodGrossPay <= 100525 ? 0.22 : 0.24,
      married: periodGrossPay <= 23200 ? 0.10 :
               periodGrossPay <= 94300 ? 0.12 :
               periodGrossPay <= 201050 ? 0.22 : 0.24,
      head: periodGrossPay <= 16550 ? 0.10 :
            periodGrossPay <= 63100 ? 0.12 :
            periodGrossPay <= 100500 ? 0.22 : 0.24
    }

    const allowanceValue = parseInt(allowances) * 4300 / 52 * payPeriodMultiplier[payFrequency as keyof typeof payPeriodMultiplier]
    const taxableIncome = Math.max(0, periodGrossPay - allowanceValue)
    
    const federalTax = taxableIncome * federalTaxRate[filingStatus as keyof typeof federalTaxRate]
    const stateTax = periodGrossPay * stateTaxRates[state as keyof typeof stateTaxRates].rate
    const socialSecurity = periodGrossPay * 0.062
    const medicare = periodGrossPay * 0.0145

    const totalDeductions = federalTax + stateTax + socialSecurity + medicare
    const netPay = periodGrossPay - totalDeductions

    setPaycheck({
      gross: periodGrossPay,
      deductions: {
        federal: federalTax,
        state: stateTax,
        socialSecurity,
        medicare
      },
      net: netPay
    })
  }

  const validateEmployeeCostInputs = () => {
    const newErrors: typeof errors = {}
    
    if (!salary || isNaN(parseFloat(salary)) || parseFloat(salary) <= 0) {
      newErrors.salary = "Please enter a valid salary amount"
    }
  
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }
  
  const validateHourlyPayInputs = () => {
    const newErrors: typeof errors = {}
    
    if (!hourlyRate || isNaN(parseFloat(hourlyRate)) || parseFloat(hourlyRate) <= 0) {
      newErrors.hourlyRate = "Please enter a valid hourly rate"
    }
    if (!hoursWorked || isNaN(parseFloat(hoursWorked)) || parseFloat(hoursWorked) < 0) {
      newErrors.hoursWorked = "Please enter valid hours worked"
    }
    if (overtime && (isNaN(parseFloat(overtime)) || parseFloat(overtime) < 0)) {
      newErrors.overtime = "Please enter valid overtime hours"
    }
  
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-zinc-900 text-zinc-100">
        {error && (
          <div className="bg-red-900/50 p-2 text-center text-white">
            {error}
          </div>
        )}
        <div className="container mx-auto py-10 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="mb-12 space-y-4">
              <div className="flex items-center gap-3">
                <Calculator className="h-8 w-8 text-[hsl(var(--primary))]" />
                <h1 className="text-4xl font-bold tracking-tight text-white">Payroll Calculator</h1>
              </div>
              <p className="text-zinc-300 text-lg">
                Calculate employee costs and payroll with precision
              </p>
            </div>
            
            <Tabs defaultValue="employee-cost" className="space-y-8">
              <TabsList className="grid w-full grid-cols-2 bg-zinc-800 p-1 rounded-xl">
                <TabsTrigger 
                  value="employee-cost"
                  className="rounded-lg data-[state=active]:bg-[hsl(var(--primary))] data-[state=active]:text-zinc-900"
                >
                  Employee Cost
                </TabsTrigger>
                <TabsTrigger 
                  value="hourly-paycheck"
                  className="rounded-lg data-[state=active]:bg-[hsl(var(--primary))] data-[state=active]:text-zinc-900"
                >
                  Hourly Paycheck
                </TabsTrigger>
              </TabsList>

              <TabsContent value="employee-cost">
                <Card className="border-zinc-800 bg-zinc-900/50 backdrop-blur">
                  <CardHeader>
                    <CardTitle className="text-2xl text-white">Employee Cost Calculator</CardTitle>
                    <CardDescription className="text-zinc-300">
                      Calculate the total cost of hiring an employee including taxes and benefits
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid gap-6">
                      <div className="space-y-2">
                        <Label className="text-zinc-100">
                          Annual Salary
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                className="ml-2 text-zinc-400 hover:text-[hsl(var(--primary))] focus:outline-none"
                              >
                                <AlertCircle className="h-4 w-4" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent className="bg-zinc-800 border-zinc-700 text-white">
                              <p>Enter the employee's annual salary before taxes and deductions</p>
                            </TooltipContent>
                          </Tooltip>
                        </Label>
                        <Input
                          type="number"
                          placeholder="Enter annual salary"
                          className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
                          value={salary}
                          onChange={(e) => setSalary(e.target.value)}
                        />
                        {/* {errors.salary && (
                          <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>{errors.salary}</AlertDescription>
                          </Alert>
                        )} */}
                      </div>

                      <div className="space-y-2">
                        <Label className="text-zinc-200">State</Label>
                        <Select value={state} onValueChange={setState}>
                          <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100">
                            <SelectValue placeholder="Select state" />
                          </SelectTrigger>
                          <SelectContent className="bg-zinc-800 border-zinc-700 text-white [&>*:hover]:bg-zinc-700 [&>*:hover]:text-white">
                            <SelectItem value="CA">California</SelectItem>
                            <SelectItem value="NY">New York</SelectItem>
                            <SelectItem value="TX">Texas</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-zinc-200">Benefits Package</Label>
                        <Select value={benefits} onValueChange={setBenefits}>
                          <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100">
                            <SelectValue placeholder="Select benefits package" />
                          </SelectTrigger>
                          <SelectContent className="bg-zinc-800 border-zinc-700 text-white [&>*:hover]:bg-zinc-700 [&>*:hover]:text-white">
                            <SelectItem value="basic">Basic (20% of salary)</SelectItem>
                            <SelectItem value="standard">Standard (25% of salary)</SelectItem>
                            <SelectItem value="premium">Premium (30% of salary)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <Button onClick={calculateEmployeeCost} className="bg-[hsl(var(--primary))] text-zinc-900 hover:bg-[hsl(var(--primary)/0.8)] w-full">
                        Calculate Total Cost
                      </Button>

                      {totalCost && (
                        <div className="rounded-lg bg-zinc-800/50 p-4 space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-zinc-300">Base Salary</span>
                            <span className="text-white font-medium">${totalCost.base.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-zinc-300">Social Security</span>
                            <span className="text-white font-medium">${totalCost.taxes.socialSecurity.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-zinc-300">Medicare</span>
                            <span className="text-white font-medium">${totalCost.taxes.medicare.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-zinc-300">Federal Unemployment</span>
                            <span className="text-white font-medium">${totalCost.taxes.federalUnemployment.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-zinc-300">State Unemployment</span>
                            <span className="text-white font-medium">${totalCost.taxes.stateUnemployment.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-zinc-300">Benefits</span>
                            <span className="text-white font-medium">${totalCost.benefits.toLocaleString()}</span>
                          </div>
                          <div className="h-px bg-zinc-700 my-3" />
                          <div className="flex justify-between items-center">
                            <span className="text-[hsl(var(--primary))] font-semibold">Total Annual Cost</span>
                            <span className="text-[hsl(var(--primary))] font-semibold">${totalCost.total.toLocaleString()}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="hourly-paycheck">
                <Card className="border-zinc-800 bg-zinc-900/50 backdrop-blur">
                  <CardHeader>
                    <CardTitle className="text-2xl text-white">Hourly Paycheck Calculator</CardTitle>
                    <CardDescription className="text-zinc-300">
                      Calculate take-home pay for hourly employees
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid gap-6">
                      <div className="space-y-2">
                        <Label className="text-zinc-100">
                          Hourly Rate
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                className="ml-2 text-zinc-400 hover:text-[hsl(var(--primary))] focus:outline-none"
                              >
                                <AlertCircle className="h-4 w-4" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent className="bg-zinc-800 border-zinc-700 text-white">
                              <p>Enter the employee's hourly wage rate</p>
                            </TooltipContent>
                          </Tooltip>
                        </Label>
                        <Input
                          type="number"
                          placeholder="Enter hourly rate"
                          className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
                          value={hourlyRate}
                          onChange={(e) => setHourlyRate(e.target.value)}
                        />
                        {/* {errors.hourlyRate && (
                          <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>{errors.hourlyRate}</AlertDescription>
                          </Alert>
                        )} */}
                      </div>

                      <div className="grid gap-6 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label className="text-zinc-200">Regular Hours</Label>
                          <Input
                            type="number"
                            placeholder="Enter regular hours"
                            className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
                            value={hoursWorked}
                            onChange={(e) => setHoursWorked(e.target.value)}
                          />
                          {/* {errors.hoursWorked && (
                            <Alert variant="destructive">
                              <AlertCircle className="h-4 w-4" />
                              <AlertTitle>Error</AlertTitle>
                              <AlertDescription>{errors.hoursWorked}</AlertDescription>
                            </Alert>
                          )} */}
                        </div>
                        <div className="space-y-2">
                          <Label className="text-zinc-200">Overtime Hours</Label>
                          <Input
                            type="number"
                            placeholder="Enter overtime hours"
                            className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
                            value={overtime}
                            onChange={(e) => setOvertime(e.target.value)}
                          />
                          {/* {errors.overtime && (
                            <Alert variant="destructive">
                              <AlertCircle className="h-4 w-4" />
                              <AlertTitle>Error</AlertTitle>
                              <AlertDescription>{errors.overtime}</AlertDescription>
                            </Alert>
                          )} */}
                        </div>
                      </div>

                      <div className="grid gap-6 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label className="text-zinc-200">Filing Status</Label>
                          <Select value={filingStatus} onValueChange={setFilingStatus}>
                            <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100">
                              <SelectValue placeholder="Select filing status" />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-800 border-zinc-700 text-white [&>*:hover]:bg-zinc-700 [&>*:hover]:text-white">
                              <SelectItem value="single">Single</SelectItem>
                              <SelectItem value="married">Married</SelectItem>
                              <SelectItem value="head">Head of Household</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-zinc-200">Pay Frequency</Label>
                          <Select value={payFrequency} onValueChange={setPayFrequency}>
                            <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100">
                              <SelectValue placeholder="Select pay frequency" />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-800 border-zinc-700 text-white [&>*:hover]:bg-zinc-700 [&>*:hover]:text-white">
                              <SelectItem value="weekly">Weekly</SelectItem>
                              <SelectItem value="biweekly">Bi-weekly</SelectItem>
                              <SelectItem value="monthly">Monthly</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid gap-4 mb-4">
                        <Label htmlFor="state" className="text-zinc-200">State</Label>
                        <Select value={state} onValueChange={setState}>
                          <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100">
                            <SelectValue placeholder="Select state" />
                          </SelectTrigger>
                          <SelectContent className="bg-zinc-800 border-zinc-700 text-white [&>*:hover]:bg-zinc-700 [&>*:hover]:text-white">
                            <SelectItem value="CA">California</SelectItem>
                            <SelectItem value="NY">New York</SelectItem>
                            <SelectItem value="TX">Texas</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <Button onClick={calculateHourlyPay} className="bg-[hsl(var(--primary))] text-zinc-900 hover:bg-[hsl(var(--primary)/0.8)] w-full">
                        Calculate Paycheck
                      </Button>

                      {paycheck && (
                        <div className="rounded-lg bg-zinc-800/50 p-4 space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-zinc-300">Gross Pay</span>
                            <span className="text-white font-medium">${paycheck.gross.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-zinc-300">Federal Tax</span>
                            <span className="text-white font-medium">${paycheck.deductions.federal.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-zinc-300">State Tax</span>
                            <span className="text-white font-medium">${paycheck.deductions.state.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-zinc-300">Social Security</span>
                            <span className="text-white font-medium">${paycheck.deductions.socialSecurity.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-zinc-300">Medicare</span>
                            <span className="text-white font-medium">${paycheck.deductions.medicare.toLocaleString()}</span>
                          </div>
                          <div className="h-px bg-zinc-700 my-3" />
                          <div className="flex justify-between items-center">
                            <span className="text-[hsl(var(--primary))] font-semibold">Net Pay</span>
                            <span className="text-[hsl(var(--primary))] font-semibold">${paycheck.net.toLocaleString()}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
      <style jsx global>{`
        :root {
          --primary: 12 91% 77%;
        }
      `}</style>
    </TooltipProvider>
  )
}

