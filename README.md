# WhatsApp CRM Application

## Introduction
The WhatsApp CRM Application is a multi-user system designed to manage customer interactions via WhatsApp. It allows businesses to link multiple WhatsApp accounts, assign chats to agents, and track communication with customers, providing a centralized platform for customer relationship management through WhatsApp. The application features role-based access for Admins, Agents, and general Users, along with a statistics dashboard for Admins.

## Features
*   **Multi-User Roles**:
    *   **Admin**: Manages users, WhatsApp accounts, views all chats, assigns chats, and accesses statistics.
    *   **Agent**: Handles assigned chats, communicates with customers.
    *   **User**: Can view chats (read-only, specific scope determined by backend).
*   **WhatsApp Web Integration**: Links WhatsApp accounts using `whatsapp-web.js` by scanning a QR code.
*   **Centralized Chat Interface**: View and manage customer chats from multiple WhatsApp accounts in one place.
*   **Chat Assignment**: Admins can assign chats to available Agents.
*   **Chat Closure**: Chats can be closed with specific types (e.g., 'quotation', 'billing') for tracking purposes.
*   **Real-time Communication**: Uses Socket.IO for real-time message updates and chat status changes.
*   **Statistics Dashboard**: Admins can view chat volume, closure types, and agent performance metrics.

## Project Structure
*   **/backend**: Contains the Node.js Express server, API logic, services for WhatsApp and Socket.IO, database models, and controllers.
*   **/frontend**: Contains the client-side application (HTML, CSS, JavaScript) that interacts with the backend APIs.
*   **/database**: Includes the `schema.sql` file for setting up the MySQL database structure.

## Prerequisites
*   **Node.js**: LTS version (e.g., 18.x or 20.x) recommended.
*   **MySQL Server**: Version 5.7 or higher (or compatible MariaDB).
*   **Web Browser**: A modern web browser (e.g., Chrome, Firefox, Edge).
*   **Operating System**: Developed and tested on Windows. `start.bat` is provided for convenience. Other OS users may need to adapt startup commands.
*   **WhatsApp Account**: At least one active WhatsApp account is needed to test the linking feature.

## Installation & Setup

### 1. Database Setup
1.  Ensure your MySQL server is running.
2.  Create a new database in MySQL. For example: `CREATE DATABASE whatsapp_crm_db;`
3.  Import the schema from `database/schema.sql` into your newly created database. You can do this via a MySQL client tool (like phpMyAdmin, DBeaver, MySQL Workbench) or using the command line:
    ```bash
    mysql -u your_mysql_username -p your_database_name < database/schema.sql
    ```
    Replace `your_mysql_username` and `your_database_name` accordingly. You will be prompted for your MySQL user's password.

### 2. Backend Setup
1.  Navigate to the `/backend` directory: `cd backend`
2.  **Environment Variables**:
    *   Create a `.env` file in the `/backend` directory. You can copy `.env.example` if it exists, or create it manually.
    *   Update the `.env` file with your specific configurations. The following variables are required:
        ```dotenv
        PORT=3000
        DB_HOST=localhost
        DB_USER=your_mysql_user
        DB_PASSWORD=your_mysql_password
        DB_NAME=whatsapp_crm_db  # Or your chosen DB name
        JWT_SECRET=your_very_strong_and_secret_jwt_key
        ```
        Replace placeholder values with your actual database credentials and choose a strong `JWT_SECRET`.
3.  **Install Dependencies**:
    *   Run the command: `npm install`

### 3. Frontend Setup
*   No specific build steps are required for the frontend as it's built with plain HTML, CSS, and JavaScript.
*   The frontend files are intended to be opened directly in the browser.

## Running the Application
1.  **Start the Backend Server**:
    *   Execute the `start.bat` script located in the root project directory. This script will:
        *   Change to the `/backend` directory.
        *   Run `npm install` (if you haven't already).
        *   Run `npm start` to launch the Node.js server.
    *   The backend server will typically run on `http://localhost:3000` (or the port specified in your `.env` file). You should see console output indicating the server is running and attempting to connect to the database and initialize WhatsApp clients.
2.  **Access the Frontend**:
    *   Open your web browser.
    *   Navigate to the `frontend/index.html` file directly (e.g., `file:///path/to/your/project/frontend/index.html` or by serving it via a simple HTTP server if you prefer, though not strictly necessary for this setup).

## Initial Admin User Setup
The database schema (`database/schema.sql`) pre-populates roles ('Admin', 'Agent', 'User'). However, an initial Admin user is not automatically created by the application. Here are a couple of methods to create your first Admin user:

**Method 1: Manual SQL Insertion (Recommended for control)**
1.  Generate a bcrypt hash for your desired admin password. You can use an online bcrypt generator or a simple script. For example, using Node.js:
    ```javascript
    // temp_bcrypt_script.js
    // const bcrypt = require('bcryptjs');
    // const salt = bcrypt.genSaltSync(10);
    // const hash = bcrypt.hashSync("yourChosenPassword", salt);
    // console.log(hash);
    // Then run: node temp_bcrypt_script.js (after npm install bcryptjs in a temp folder)
    ```
2.  Connect to your MySQL database and execute the following SQL commands (replace `<bcrypt_hashed_password>` with the hash you generated):
    ```sql
    -- Ensure Roles are present (schema.sql should do this)
    -- INSERT IGNORE INTO Roles (name) VALUES ('Admin'), ('Agent'), ('User');

    -- Create the Admin user
    INSERT INTO Users (username, password_hash, role_id, created_at, updated_at)
    VALUES ('admin', '<bcrypt_hashed_password>', (SELECT id FROM Roles WHERE name = 'Admin'), NOW(), NOW());
    ```
    You can choose a different username than 'admin'.

**Method 2: Temporary Code Modification (Use with caution)**
1.  Temporarily modify the `backend/controllers/authController.js` `register` function. Before `User.createUser`, you could add logic like:
    ```javascript
    // TEMPORARY: For first admin user registration
    // if (username === 'admin_setup') {
    //   role_name = 'Admin';
    // }
    // END TEMPORARY
    const role_id = await User.findRoleIdByName(role_name);
    ```
2.  Start the backend.
3.  Use a tool like Postman or Insomnia to make a `POST` request to `/api/auth/register` with the chosen username (e.g., 'admin_setup'), password, and (optionally, if not forcing via code) `role_name: "Admin"`.
4.  **Important**: After successfully registering the admin user, **remove the temporary code modification** from `authController.js` and restart the backend.

## Using the Application
1.  **Login**: Access `frontend/index.html` and log in with the credentials of an Admin, Agent, or User.
2.  **Admin Dashboard**:
    *   **User Management**: Create, view, edit, and delete users (Agents, other Admins, Users).
    *   **WhatsApp Account Management**: Link new WhatsApp accounts by providing a phone number and scanning the generated QR code with your WhatsApp mobile app. View linked accounts and their status. Remove accounts.
    *   **Statistics**: View dashboards for chat volume, closure types, and agent performance. Filter data by date ranges and other criteria.
    *   **Chat Interface**: View all chats, select a chat to see messages, and assign unassigned chats to agents. Can also send messages.
3.  **Agent Dashboard**:
    *   Primarily uses the **Chat Interface**.
    *   View chats assigned to them.
    *   Send and receive messages for their assigned chats.
    *   Close their assigned chats with a closure type ('quotation' or 'billing').
4.  **User Dashboard**:
    *   Can view chats they are permitted to see (read-only). The scope of visible chats for a 'User' role depends on backend API implementation (currently, they might see all chats similar to admin but without interaction rights).

## API Endpoints
The backend provides several API endpoints under the `/api` path:
*   `/api/auth`: For user registration and login.
*   `/api/users`: For user management (Admin only).
*   `/api/whatsapp`: For linking and managing WhatsApp accounts (Admin only).
*   `/api/chats`: For chat operations (role-dependent access).
*   `/api/statistics`: For retrieving statistical data (Admin only).

Refer to the backend route definitions in `backend/routes/` for more details.

## Troubleshooting
*   **Backend server doesn't start**:
    *   Check if the `.env` file in `/backend` is correctly configured with database credentials and `JWT_SECRET`.
    *   Ensure `npm install` was run successfully in the `/backend` directory.
    *   Verify your MySQL server is running and accessible with the provided credentials.
*   **WhatsApp QR code not showing/linking fails**:
    *   Check the backend console for errors from `whatsapp-web.js`.
    *   Ensure the machine running the backend has internet access.
    *   Try restarting the backend. Session files are stored in `backend/wwebjs_sessions/`. Deleting this folder might help reset problematic sessions (requires re-scanning QR for all accounts).
*   **Frontend issues (buttons not working, data not loading)**:
    *   Open your browser's developer console (usually F12) and check for JavaScript errors.
    *   Ensure the backend server is running and accessible from your browser (check API base URL in `frontend/js/api.js`).
*   **Puppeteer errors on startup (related to `whatsapp-web.js`)**:
    *   `whatsapp-web.js` relies on Puppeteer, which downloads a compatible Chromium browser. If this fails or there are issues, you might see errors.
    *   Ensure you have necessary dependencies for Puppeteer on your OS (especially on Linux). The provided Puppeteer args in `whatsappService.js` aim to minimize issues in restricted environments.
    *   `--no-sandbox` is used; be aware of its security implications if running in an untrusted environment.
```
