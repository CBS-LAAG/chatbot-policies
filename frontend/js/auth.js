// Ensure this script is loaded after api.js

const auth = {
    handleLogin: async () => {
        const usernameInput = document.getElementById('username');
        const passwordInput = document.getElementById('password');
        const errorP = document.getElementById('login-error');

        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();

        if (!username || !password) {
            errorP.textContent = 'Username and password are required.';
            errorP.style.display = 'block';
            return;
        }
        errorP.style.display = 'none';

        try {
            const data = await fetchApi('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ username, password }),
            });

            if (data && data.token && data.tokenPayload) { // Assuming backend sends token and tokenPayload
                localStorage.setItem('jwtToken', data.token);
                localStorage.setItem('userData', JSON.stringify(data.tokenPayload)); // { userId, username, role }
                window.location.href = 'dashboard.html';
            } else if (data && data.token) { // Fallback if tokenPayload is not directly in response
                 // Try to decode JWT locally if absolutely necessary (not recommended for critical info)
                 // Or better, ensure backend sends necessary user info alongside token.
                 // For now, store what we have and assume dashboard will fetch more if needed.
                localStorage.setItem('jwtToken', data.token);
                // A minimal userData if backend doesn't send payload (less ideal)
                // const decoded = auth.parseJwt(data.token); // Simple JWT parse, not for verification
                // localStorage.setItem('userData', JSON.stringify({ username: decoded.username, role: decoded.role, userId: decoded.userId }));
                // For this implementation, we rely on backend sending tokenPayload as designed in previous steps.
                // If tokenPayload is not in response, this indicates an issue with backend or this assumption.
                console.warn("Login response did not include tokenPayload. User role might not be available.");
                // For now, we'll assume the backend *does* send tokenPayload as per earlier design.
                // If not, the dashboard might not function correctly for role-based UI.
                window.location.href = 'dashboard.html';
            }
            else {
                // Should be caught by fetchApi's error handling if !response.ok
                errorP.textContent = data.message || 'Login failed: No token received.';
                errorP.style.display = 'block';
            }
        } catch (error) {
            console.error('Login error:', error);
            errorP.textContent = error.message || 'Login failed. Please try again.';
            errorP.style.display = 'block';
        }
    },

    logout: () => {
        localStorage.removeItem('jwtToken');
        localStorage.removeItem('userData');
        window.location.href = 'index.html';
    },

    checkAuthRedirect: () => {
        const token = localStorage.getItem('jwtToken');
        const currentPage = window.location.pathname.split('/').pop();

        if (token && currentPage === 'index.html') {
            window.location.href = 'dashboard.html';
        } else if (!token && currentPage === 'dashboard.html') {
            window.location.href = 'index.html';
        }
        // No action if on the correct page relative to auth state
    },

    getUserData: () => {
        const userDataString = localStorage.getItem('userData');
        try {
            return JSON.parse(userDataString);
        } catch (e) {
            return null;
        }
    },

    getToken: () => {
        return localStorage.getItem('jwtToken');
    },

    // Basic JWT parser (does not verify signature, only for client-side convenience if needed)
    // parseJwt: (token) => {
    //     try {
    //         return JSON.parse(atob(token.split('.')[1]));
    //     } catch (e) {
    //         return null;
    //     }
    // }
};

// Initial check when script loads, for dashboard pages primarily
// For index.html, the inline script handles its specific redirect logic.
if (window.location.pathname.includes('dashboard.html')) {
    auth.checkAuthRedirect();
}
