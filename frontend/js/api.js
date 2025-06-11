const API_BASE_URL = 'http://localhost:3000/api'; // Adjust if your backend port is different

async function fetchApi(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = localStorage.getItem('jwtToken');

    const headers = {
        'Content-Type': 'application/json',
        ...options.headers, // Allow overriding content-type or adding other headers
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
        ...options,
        headers,
    };

    try {
        const response = await fetch(url, config);

        if (response.status === 204) { // No Content
            return null;
        }

        const responseData = await response.json();

        if (!response.ok) {
            // Log the error details from backend if available
            console.error('API Error Response:', responseData);
            let errorMessage = `API Error: ${response.status} ${response.statusText}`;
            if (responseData && responseData.message) {
                errorMessage = responseData.message;
            } else if (typeof responseData === 'string') {
                errorMessage = responseData;
            }
            const error = new Error(errorMessage);
            error.status = response.status;
            error.data = responseData;
            throw error;
        }
        return responseData;
    } catch (error) {
        console.error('Fetch API Error:', error);
        // If it's an error we constructed, rethrow it. Otherwise, wrap it.
        if (error.status) {
            throw error;
        } else {
            // Network error or other fetch issue
            const networkError = new Error(error.message || 'Network error or server is unreachable.');
            networkError.isNetworkError = true;
            throw networkError;
        }
    }
}

// Example Usage (not part of this file, just for illustration)
/*
async function loginUser(username, password) {
    try {
        const data = await fetchApi('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password }),
        });
        console.log('Login successful:', data);
        // Store token, redirect, etc.
    } catch (error) {
        console.error('Login failed:', error.message);
        // Display error to user
    }
}
*/
