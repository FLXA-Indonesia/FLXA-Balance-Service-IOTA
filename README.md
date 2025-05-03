# FLXA Balance Service for IOTA

Welcome to the official repository for the FLXA Balance Service, developed by FLXA Indonesia. This service manages user balances within the FLXA ecosystem, integrating seamlessly with the IOTA distributed ledger technology to ensure secure and efficient transactions.

## Overview
The FLXA Balance Service provides backend functionalities for:
- Managing user FLXA token balances.
- Handling transactions related to balance updates.
- Integrating with payment gateways for top-ups.
- Interacting with the IOTA Tangle for decentralized balance management.

## Features
1. Balance Management: Track and update user balances accurately.
2. Transaction Handling: Process balance-related transactions securely.
3. Payment Gateway Integration: Support for credit card top-ups via Midtrans.
4. IOTA Integration: Utilize the IOTA Tangle for decentralized operations.
5. RESTful API: Exposes endpoints for frontend integration.
6. Deployment Ready: Configured for deployment on platforms like Vercel.

## Repository Structure
```
├── src/                  # Source code directory
│   └── ...               # Application logic and route handlers
├── .eslintrc.js          # ESLint configuration
├── .gitignore            # Git ignore rules
├── index.js              # Entry point of the application
├── package.json          # Project metadata and dependencies
├── package-lock.json     # Exact versions of installed dependencies
└── vercel.json           # Vercel deployment configuration
```


## Getting Started
### Prerequisites

1. Node.js (version 14 or higher)

2. npm (comes with Node.js)

### Installation
1. Clone the repository:
```bash
git clone https://github.com/FLXA-Indonesia/FLXA-Balance-Service-IOTA.git
cd FLXA-Balance-Service-IOTA
```

2. Install dependencies:
```bash
npm install
```

### Running the Application
To start the development server:

```bash
npm start
```

The server will start on the default port (e.g., http://localhost:3000). You can modify the port and other configurations as needed.

### Deployment
The project includes a vercel.json file, making it ready for deployment on Vercel. To deploy:

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Deploy:
```bash
vercel
```

Follow the prompts to complete the deployment process.

## API Endpoints
The service exposes the RESTful API endpoints accessible at `/src/routes`

Note: Authentication middleware ensures that only authorized users can access certain endpoints.

## Contributing
We welcome contributions to enhance the FLXA User Service. To contribute:
1. Fork the repository.
2. Create a new branch for your feature or bug fix.
3. Commit your changes with clear messages.
4. Push your branch and open a pull request detailing your modifications.
5. Please ensure your code adheres to the project's coding standards and includes relevant tests.

## License
This project is licensed under the [GNU Affero General Public License V3](LICENSE)
