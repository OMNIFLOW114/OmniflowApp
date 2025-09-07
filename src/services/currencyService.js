// src/services/currencyService.js

const API_KEY = "e2d4922c48f0795ab5eb3f20"; // (I will tell you how to get FREE API key)
const BASE_URL = `https://v6.exchangerate-api.com/v6/${API_KEY}/latest/USD`;

export const fetchExchangeRates = async () => {
  try {
    const res = await fetch(BASE_URL);
    if (!res.ok) throw new Error("Failed to fetch exchange rates");
    const data = await res.json();
    return data.conversion_rates; // Contains object of all currency rates
  } catch (error) {
    console.error("Exchange Rate Error:", error);
    return null;
  }
};

