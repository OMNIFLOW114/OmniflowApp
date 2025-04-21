import React from "react";

const TestBackendConnection = () => {
  const testApi = async () => {
    const response = await fetch("http://localhost:5000/api/something", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: "hello from frontend" }),
    });

    const result = await response.json();
    console.log("🎉 Response from backend:", result);
    alert(result.message); // show response on screen
  };

  return (
    <div className="text-center mt-10">
      <button
        onClick={testApi}
        className="bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700"
      >
        Test Backend Connection
      </button>
    </div>
  );
};

export default TestBackendConnection;
