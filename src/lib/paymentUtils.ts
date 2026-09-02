// src/lib/paymentUtils.ts

// Fungsi untuk mendapatkan persentase komisi dari localStorage
export function getAppCommission(): number {
  try {
    const commission = JSON.parse(localStorage.getItem("rentmate_app_commission") || "{}");
    return commission.percentage || 20; // Default 20%
  } catch (error) {
    console.error("Error getting app commission:", error);
    return 20; // Default 20%
  }
}

// Fungsi untuk menghitung pembagian pembayaran
export function calculatePaymentSplit(totalAmount: number, commissionPercentage: number) {
  const appAmount = Math.round(totalAmount * (commissionPercentage / 100));
  const mitraAmount = totalAmount - appAmount;
  
  return {
    appAmount,
    mitraAmount,
    totalAmount,
    commissionPercentage
  };
}

// Fungsi untuk memformat mata uang
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}