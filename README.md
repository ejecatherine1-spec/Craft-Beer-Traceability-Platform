# 🍺 Craft Beer Traceability Platform

Welcome to a revolutionary blockchain-based platform that ensures transparency in craft beer production! This project uses the Stacks blockchain and Clarity smart contracts to trace ingredients from farm to pint, verifying local and ethical sourcing. Say goodbye to greenwashing—consumers can now trust claims about sustainable hops, barley, and more.

## ✨ Features

🌾 Register and certify ingredient suppliers with ethical/local proofs  
🚜 Track ingredient batches through the supply chain immutably  
🏭 Brewery integration for logging production steps  
✅ Real-time verification of sourcing claims via QR codes or apps  
🔒 Role-based access for farmers, brewers, auditors, and consumers  
💰 Incentive tokens for compliant participants  
📊 Analytics dashboard for supply chain insights  
🛡️ Prevent fraud with hash-based tamper-proof records  

## 🛠 How It Works

This platform leverages 8 interconnected Clarity smart contracts to create a secure, decentralized traceability system. Each contract handles a specific aspect of the supply chain, ensuring modularity and scalability.

### Key Smart Contracts

1. **SupplierRegistry.clar**: Registers suppliers (farmers/growers) with details like location, ethical certifications, and public keys. Functions include `register-supplier` (adds supplier with geo-proof) and `update-certification` (renews ethical status).

2. **IngredientBatch.clar**: Creates and tracks batches of ingredients (e.g., hops, malt). Uses `create-batch` to generate a unique hash for each batch, linking it to a supplier, and `transfer-batch` to log movements.

3. **BreweryRegistry.clar**: Onboards breweries with verification of their facilities. Includes `register-brewery` and `link-supplier` to associate with certified suppliers.

4. **SupplyChainTrail.clar**: Manages the end-to-end traceability. Core functions: `add-trail-step` (logs events like harvesting, shipping, brewing) and `get-full-trail` (retrieves immutable history for a beer batch).

5. **CertificationVerifier.clar**: Verifies local/ethical claims using oracles or on-chain proofs. `verify-batch` checks against standards (e.g., distance for "local" via geocode) and flags non-compliance.

6. **IncentiveToken.clar**: A fungible token (SIP-010 compliant) to reward participants. `mint-tokens` for ethical suppliers and `claim-reward` for breweries meeting traceability goals.

7. **AccessControl.clar**: Handles roles and permissions. `grant-role` assigns admin, auditor, or viewer access, ensuring only authorized parties can modify data.

8. **AuditLog.clar**: Logs all interactions for auditing. `log-event` records changes, and `query-audit` allows inspectors to review tamper-proof histories.

**For Suppliers/Farmers**  
- Register via SupplierRegistry.clar with proof of ethical practices (e.g., upload hash of certification docs).  
- Create a batch in IngredientBatch.clar, adding initial trail steps in SupplyChainTrail.clar.  
- Earn tokens from IncentiveToken.clar for verified local sourcing.

**For Breweries**  
- Onboard through BreweryRegistry.clar and link suppliers.  
- Receive batches, log production in SupplyChainTrail.clar, and certify via CertificationVerifier.clar.  
- Generate verifiable QR codes for beer labels using get-full-trail.

**For Consumers/Verifiers**  
- Scan a QR to call verify-batch in CertificationVerifier.clar.  
- View transparent data: origin, ethics, and carbon footprint via get-full-trail.  
- Auditors use AuditLog.clar for deep dives.

That's it! Breweries build trust, suppliers get rewarded, and beer lovers enjoy ethically sourced pints—all powered by Clarity on Stacks for low-cost, secure transactions.