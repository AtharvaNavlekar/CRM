# DIALPULSE CRM

DialPulse CRM is a modern, high-performance Customer Relationship Management application designed for sales teams. Built with React and Node.js, it offers a comprehensive suite of tools to manage leads, track interactions, monitor compliance, and drive sales performance through intuitive dashboards and real-time communication features.

## Table of Contents
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation Instructions](#installation-instructions)
- [Usage Instructions](#usage-instructions)
- [Contributing Guidelines](#contributing-guidelines)
- [License Information](#license-information)
- [Contact Information](#contact-information)

## Features
- **Interactive Dashboard:** Get a bird's-eye view of your sales metrics, active tasks, and team performance.
- **Lead Management & Pipeline:** Track leads through customizable Kanban boards.
- **Integrated Calling Console:** Make and log calls directly from the CRM with built-in dialer capabilities.
- **Trust & Compliance Center:** Ensure all interactions meet regulatory standards with automated audit logging.
- **WhatsApp Integration:** Communicate with leads seamlessly via WhatsApp.
- **Gamified Leaderboards:** Motivate your sales team with performance tracking and rankings.
- **Detailed Reports:** Generate insights on sales conversions, call metrics, and compliance adherence.
- **Role-Based Access Control:** Secure authentication and authorization for different user roles.

## Prerequisites
Before you begin, ensure you have the following installed on your machine:
- Node.js (v18 or higher recommended)
- npm (Node Package Manager)

## Installation Instructions

1. **Clone the repository:**
   ```bash
   git clone https://github.com/AtharvaNavlekar/CRM.git
   cd CRM
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   - Create a `.env` file in the root directory.
   - Copy the contents from `.env.example` into `.env`.
   - Update the variables (like `JWT_SECRET`, database connections, or API keys) as needed for your environment.

4. **Start the development server:**
   ```bash
   npm run dev
   ```
   This command starts both the backend API and the Vite frontend development server concurrently. The application will be accessible at `http://localhost:3000`.

## Usage Instructions

- **Login:** Access the CRM by logging in with your designated user credentials. By default, the seed data provides initial access if configured.
- **Managing Leads:** Navigate to the 'Leads' or 'Pipeline' section to add new prospects, drag and drop them across different pipeline stages, and update their statuses.
- **Making Calls:** Open the Call Console to dial leads directly. Call durations and notes are automatically logged for compliance and tracking.
- **Viewing Reports:** Head over to the Reports section to visualize sales trends, team performance, and compliance metrics.

## Contributing Guidelines
We welcome contributions from the community! If you'd like to improve DialPulse CRM, please follow these steps:

1. **Fork the repository** on GitHub.
2. **Create a new branch** for your feature or bug fix:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Commit your changes** with clear and descriptive commit messages:
   ```bash
   git commit -m "Add some feature"
   ```
4. **Push to the branch**:
   ```bash
   git push origin feature/your-feature-name
   ```
5. **Open a Pull Request** against the `main` branch. Provide a detailed description of the changes you've made.

## License Information
This project is licensed under the MIT License. You are free to use, modify, and distribute this software in compliance with the license terms.

## Contact Information
If you have any questions, encounter issues, or need support, please feel free to reach out:
- **GitHub Issues:** [Open an issue in this repository](https://github.com/AtharvaNavlekar/CRM/issues)
- **Email Support:** Provide your contact email here (e.g., support@dialpulsecrm.com)
