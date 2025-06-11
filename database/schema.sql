-- Roles Table
CREATE TABLE Roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE
);

-- Insert default roles
INSERT INTO Roles (name) VALUES ('Admin'), ('Agent'), ('User');

-- Users Table
CREATE TABLE Users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES Roles(id)
);

-- WhatsAppAccounts Table
CREATE TABLE WhatsAppAccounts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    phone_number VARCHAR(255) NOT NULL UNIQUE,
    user_id INT, -- The Admin user who linked this account
    session_data TEXT, -- Kept for potential future use, though LocalAuth stores on disk
    status VARCHAR(50) DEFAULT 'pending_qr_scan', -- e.g., 'pending_qr_scan', 'connected', 'auth_failure', 'disconnected'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(id),
    INDEX idx_wa_status (status),
    INDEX idx_wa_user_id (user_id)
);

-- Chats Table
CREATE TABLE Chats (
    id INT AUTO_INCREMENT PRIMARY KEY,
    whatsapp_account_id INT,
    customer_contact_id VARCHAR(255) NOT NULL, -- e.g., customer's phone number
    agent_id INT NULL, -- FK to Users table, can be NULL if unassigned
    status VARCHAR(50) DEFAULT 'open', -- e.g., 'open', 'assigned', 'closed'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    closed_at TIMESTAMP NULL,
    closure_type VARCHAR(255) NULL, -- e.g., 'quotation', 'billing', NULL
    FOREIGN KEY (whatsapp_account_id) REFERENCES WhatsAppAccounts(id),
    FOREIGN KEY (agent_id) REFERENCES Users(id),
    INDEX idx_chats_created_at (created_at),
    INDEX idx_chats_agent_id (agent_id),
    INDEX idx_chats_whatsapp_account_id (whatsapp_account_id),
    INDEX idx_chats_closure_type (closure_type),
    INDEX idx_chats_status (status),
    INDEX idx_chats_customer_contact_id (customer_contact_id) -- For finding chats by customer
);

-- Messages Table
CREATE TABLE Messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    chat_id INT,
    sender_id VARCHAR(255) NOT NULL, -- Can be our User ID or external contact ID
    sender_type VARCHAR(50) NOT NULL, -- e.g., 'agent', 'customer', 'system'
    content TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- Or could be the actual message timestamp from WhatsApp
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- No updated_at for messages as they are typically immutable once sent
    FOREIGN KEY (chat_id) REFERENCES Chats(id),
    INDEX idx_messages_chat_id (chat_id),
    INDEX idx_messages_timestamp (timestamp)
);
