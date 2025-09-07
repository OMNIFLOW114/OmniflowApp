// src/services/storeService.js

// Example function to fetch stores
export const getStores = async () => {
    try {
      const response = await fetch("/api/stores"); // Replace with your actual API endpoint
      if (!response.ok) {
        throw new Error("Failed to fetch stores");
      }
      return await response.json();
    } catch (error) {
      console.error("Error fetching stores:", error);
      return [];
    }
  };
  