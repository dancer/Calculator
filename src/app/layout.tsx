import { Metadata } from "next"
import localFont from 'next/font/local'
import './globals.css'

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans'
})

export const metadata: Metadata = {
  title: "Payroll Calculator | Warp",
  description: "Calculate employee costs, hourly pay, and more with Warp's payroll calculator.",
}

export default function CalculatorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={geistSans.className}>
        {children}
      </body>
    </html>
  )
}