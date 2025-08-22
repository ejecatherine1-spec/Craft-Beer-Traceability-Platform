;; IncentiveToken.clar
;; SIP-010 compliant fungible token for rewarding ethical and local sourcing in craft beer supply chain
;; Features: Multi-minter support, pause/unpause, admin controls, mint with metadata, burn, transfer
;; Audit logs for mints, error handling, and more

;; Traits
(define-trait ft-trait
  (
    (transfer (uint principal principal (optional (buff 34))) (response bool uint))
    (get-name () (response (string-ascii 32) uint))
    (get-symbol () (response (string-ascii 32) uint))
    (get-decimals () (response uint uint))
    (get-balance (principal) (response uint uint))
    (get-total-supply () (response uint uint))
    (get-token-uri () (response (optional (string-utf8 256)) uint))
  )
)

;; Constants
(define-constant CONTRACT-OWNER tx-sender)
(define-constant MAX-METADATA-LEN u500)
(define-constant ERR-UNAUTHORIZED (err u100))
(define-constant ERR-PAUSED (err u101))
(define-constant ERR-INVALID-AMOUNT (err u102))
(define-constant ERR-INVALID-RECIPIENT (err u103))
(define-constant ERR-INVALID-MINTER (err u104))
(define-constant ERR-ALREADY-REGISTERED (err u105))
(define-constant ERR-METADATA-TOO-LONG (err u106))
(define-constant ERR-INSUFFICIENT-BALANCE (err u107))
(define-constant ERR-INVALID-MEMO (err u108))
(define-constant ERR-TRANSFER-PAUSED (err u109))
(define-constant ERR-BURN-PAUSED (err u110))
(define-constant ERR-MINT-PAUSED (err u111))
(define-constant ERR-NOT-OWNER (err u112))
(define-constant ERR-INVALID-URI (err u113))

;; Data Variables
(define-data-var token-name (string-ascii 32) "IncentiveToken")
(define-data-var token-symbol (string-ascii 32) "ITK")
(define-data-var token-decimals uint u6)
(define-data-var total-supply uint u0)
(define-data-var contract-paused bool false)
(define-data-var admin principal tx-sender)
(define-data-var token-uri (optional (string-utf8 256)) none)
(define-data-var mint-counter uint u0)

;; Data Maps
(define-map balances principal uint)
(define-map minters principal bool)
(define-map mint-records uint {amount: uint, recipient: principal, metadata: (string-utf8 500), timestamp: uint})

;; Private Functions
(define-private (is-admin (caller principal))
  (is-eq caller (var-get admin)))

(define-private (is-minter (caller principal))
  (default-to false (map-get? minters caller)))

(define-private (add-balance (account principal) (amount uint))
  (let ((current (get-balance account)))
    (map-set balances account (+ current amount))))

(define-private (subtract-balance (account principal) (amount uint))
  (let ((current (get-balance account)))
    (asserts! (>= current amount) ERR-INSUFFICIENT-BALANCE)
    (map-set balances account (- current amount))))

;; Public Functions - Admin Controls
(define-public (set-admin (new-admin principal))
  (begin
    (asserts! (is-admin tx-sender) ERR-UNAUTHORIZED)
    (var-set admin new-admin)
    (ok true)))

(define-public (pause-contract)
  (begin
    (asserts! (is-admin tx-sender) ERR-UNAUTHORIZED)
    (var-set contract-paused true)
    (ok true)))

(define-public (unpause-contract)
  (begin
    (asserts! (is-admin tx-sender) ERR-UNAUTHORIZED)
    (var-set contract-paused false)
    (ok true)))

(define-public (add-minter (minter principal))
  (begin
    (asserts! (is-admin tx-sender) ERR-UNAUTHORIZED)
    (asserts! (is-none (map-get? minters minter)) ERR-ALREADY-REGISTERED)
    (map-set minters minter true)
    (ok true)))

(define-public (remove-minter (minter principal))
  (begin
    (asserts! (is-admin tx-sender) ERR-UNAUTHORIZED)
    (map-set minters minter false)
    (ok true)))

(define-public (set-token-uri (new-uri (optional (string-utf8 256))))
  (begin
    (asserts! (is-admin tx-sender) ERR-UNAUTHORIZED)
    (asserts! (or (is-none new-uri) (<= (len (unwrap-panic new-uri)) u256)) ERR-INVALID-URI)
    (var-set token-uri new-uri)
    (ok true)))

;; Public Functions - Token Operations
(define-public (mint (amount uint) (recipient principal) (metadata (string-utf8 500)))
  (begin
    (asserts! (not (var-get contract-paused)) ERR-MINT-PAUSED)
    (asserts! (is-minter tx-sender) ERR-INVALID-MINTER)
    (asserts! (> amount u0) ERR-INVALID-AMOUNT)
    (asserts! (not (is-eq recipient CONTRACT-OWNER)) ERR-INVALID-RECIPIENT) ;; Prevent mint to owner for demo
    (asserts! (<= (len metadata) MAX-METADATA-LEN) ERR-METADATA-TOO-LONG)
    (let ((new-counter (+ (var-get mint-counter) u1)))
      (var-set mint-counter new-counter)
      (map-set mint-records new-counter {amount: amount, recipient: recipient, metadata: metadata, timestamp: block-height})
      (add-balance recipient amount)
      (var-set total-supply (+ (var-get total-supply) amount))
      (ok true))))

(define-public (transfer (amount uint) (sender principal) (recipient principal) (memo (optional (buff 34))))
  (begin
    (asserts! (not (var-get contract-paused)) ERR-TRANSFER-PAUSED)
    (asserts! (is-eq tx-sender sender) ERR-UNAUTHORIZED)
    (asserts! (> amount u0) ERR-INVALID-AMOUNT)
    (asserts! (not (is-eq recipient CONTRACT-OWNER)) ERR-INVALID-RECIPIENT)
    (asserts! (or (is-none memo) (<= (len (unwrap-panic memo)) u34)) ERR-INVALID-MEMO)
    (subtract-balance sender amount)
    (add-balance recipient amount)
    (ok true)))

(define-public (burn (amount uint))
  (begin
    (asserts! (not (var-get contract-paused)) ERR-BURN-PAUSED)
    (asserts! (> amount u0) ERR-INVALID-AMOUNT)
    (subtract-balance tx-sender amount)
    (var-set total-supply (- (var-get total-supply) amount))
    (ok true)))

;; Read-Only Functions
(define-read-only (get-name)
  (ok (var-get token-name)))

(define-read-only (get-symbol)
  (ok (var-get token-symbol)))

(define-read-only (get-decimals)
  (ok (var-get token-decimals)))

(define-read-only (get-total-supply)
  (ok (var-get total-supply)))

(define-read-only (get-balance (account principal))
  (ok (default-to u0 (map-get? balances account))))

(define-read-only (get-token-uri)
  (ok (var-get token-uri)))

(define-read-only (get-mint-record (token-id uint))
  (ok (map-get? mint-records token-id)))

(define-read-only (is-minter-check (account principal))
  (ok (is-minter account)))

(define-read-only (is-paused)
  (ok (var-get contract-paused)))

;; Initialization
(begin
  (map-set minters CONTRACT-OWNER true))