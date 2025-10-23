(define-non-fungible-token heritage-nft uint)
(define-constant ERR-NOT-AUTHORIZED u100)
(define-constant ERR-INVALID-TITLE u101)
(define-constant ERR-INVALID-DESCRIPTION u102)
(define-constant ERR-INVALID-HASH u103)
(define-constant ERR-INVALID-CULTURAL-CONTEXT u104)
(define-constant ERR-INVALID-LOCATION u105)
(define-constant ERR-INVALID-ROYALTY-RATE u106)
(define-constant ERR-INVALID-TIMESTAMP u107)
(define-constant ERR-NFT-ALREADY-EXISTS u108)
(define-constant ERR-NFT-NOT-FOUND u109)
(define-constant ERR-INVALID-UPDATE-PARAM u110)
(define-constant ERR-UPDATE-NOT-ALLOWED u111)
(define-constant ERR-MAX-NFTS-EXCEEDED u112)
(define-constant ERR-INVALID-CURRENCY u113)
(define-constant ERR-INVALID-STATUS u114)
(define-constant ERR-AUTHORITY-NOT-VERIFIED u115)
(define-constant ERR-INVALID-MIN-ROYALTY u116)
(define-constant ERR-INVALID-MAX-ROYALTY u117)
(define-data-var last-token-id uint u0)
(define-data-var max-nfts uint u10000)
(define-data-var mint-fee uint u500)
(define-data-var authority-contract (optional principal) none)
(define-map nft-metadata
  uint
  {
    title: (string-ascii 100),
    description: (string-ascii 500),
    hash: (buff 32),
    creator: principal,
    cultural-context: (string-ascii 200),
    location: (string-ascii 100),
    royalty-rate: uint,
    timestamp: uint,
    currency: (string-ascii 10),
    status: bool,
    min-royalty: uint,
    max-royalty: uint
  }
)
(define-map nft-updates
  uint
  {
    update-title: (string-ascii 100),
    update-description: (string-ascii 500),
    update-timestamp: uint,
    updater: principal
  }
)
(define-read-only (get-nft-metadata (id uint))
  (map-get? nft-metadata id)
)
(define-read-only (get-nft-updates (id uint))
  (map-get? nft-updates id)
)
(define-read-only (get-owner (id uint))
  (nft-get-owner? heritage-nft id)
)
(define-private (validate-title (title (string-ascii 100)))
  (if (and (> (len title) u0) (<= (len title) u100))
      (ok true)
      (err ERR-INVALID-TITLE))
)
(define-private (validate-description (desc (string-ascii 500)))
  (if (and (> (len desc) u0) (<= (len desc) u500))
      (ok true)
      (err ERR-INVALID-DESCRIPTION))
)
(define-private (validate-hash (h (buff 32)))
  (if (is-eq (len h) u32)
      (ok true)
      (err ERR-INVALID-HASH))
)
(define-private (validate-cultural-context (context (string-ascii 200)))
  (if (<= (len context) u200)
      (ok true)
      (err ERR-INVALID-CULTURAL-CONTEXT))
)
(define-private (validate-location (loc (string-ascii 100)))
  (if (<= (len loc) u100)
      (ok true)
      (err ERR-INVALID-LOCATION))
)
(define-private (validate-royalty-rate (rate uint))
  (if (<= rate u20)
      (ok true)
      (err ERR-INVALID-ROYALTY-RATE))
)
(define-private (validate-timestamp (ts uint))
  (if (>= ts block-height)
      (ok true)
      (err ERR-INVALID-TIMESTAMP))
)
(define-private (validate-currency (cur (string-ascii 10)))
  (if (or (is-eq cur "STX") (is-eq cur "USD") (is-eq cur "BTC"))
      (ok true)
      (err ERR-INVALID-CURRENCY))
)
(define-private (validate-min-royalty (min uint))
  (if (>= min u0)
      (ok true)
      (err ERR-INVALID-MIN-ROYALTY))
)
(define-private (validate-max-royalty (max uint))
  (if (> max u0)
      (ok true)
      (err ERR-INVALID-MAX-ROYALTY))
)
(define-private (validate-principal (p principal))
  (if (not (is-eq p 'SP000000000000000000002Q6VF78))
      (ok true)
      (err ERR-NOT-AUTHORIZED))
)
(define-public (set-authority-contract (contract-principal principal))
  (begin
    (try! (validate-principal contract-principal))
    (asserts! (is-none (var-get authority-contract)) (err ERR-AUTHORITY-NOT-VERIFIED))
    (var-set authority-contract (some contract-principal))
    (ok true)
  )
)
(define-public (set-max-nfts (new-max uint))
  (begin
    (asserts! (> new-max u0) (err ERR-MAX-NFTS-EXCEEDED))
    (asserts! (is-some (var-get authority-contract)) (err ERR-AUTHORITY-NOT-VERIFIED))
    (var-set max-nfts new-max)
    (ok true)
  )
)
(define-public (set-mint-fee (new-fee uint))
  (begin
    (asserts! (>= new-fee u0) (err ERR-INVALID-UPDATE-PARAM))
    (asserts! (is-some (var-get authority-contract)) (err ERR-AUTHORITY-NOT-VERIFIED))
    (var-set mint-fee new-fee)
    (ok true)
  )
)
(define-public (mint-nft
  (title (string-ascii 100))
  (description (string-ascii 500))
  (hash (buff 32))
  (cultural-context (string-ascii 200))
  (location (string-ascii 100))
  (royalty-rate uint)
  (currency (string-ascii 10))
  (min-royalty uint)
  (max-royalty uint)
)
  (let (
        (next-id (+ (var-get last-token-id) u1))
        (current-max (var-get max-nfts))
        (authority (var-get authority-contract))
      )
    (asserts! (<= next-id current-max) (err ERR-MAX-NFTS-EXCEEDED))
    (try! (validate-title title))
    (try! (validate-description description))
    (try! (validate-hash hash))
    (try! (validate-cultural-context cultural-context))
    (try! (validate-location location))
    (try! (validate-royalty-rate royalty-rate))
    (try! (validate-currency currency))
    (try! (validate-min-royalty min-royalty))
    (try! (validate-max-royalty max-royalty))
    (let ((authority-recipient (unwrap! authority (err ERR-AUTHORITY-NOT-VERIFIED))))
      (try! (stx-transfer? (var-get mint-fee) tx-sender authority-recipient))
    )
    (try! (nft-mint? heritage-nft next-id tx-sender))
    (map-set nft-metadata next-id
      {
        title: title,
        description: description,
        hash: hash,
        creator: tx-sender,
        cultural-context: cultural-context,
        location: location,
        royalty-rate: royalty-rate,
        timestamp: block-height,
        currency: currency,
        status: true,
        min-royalty: min-royalty,
        max-royalty: max-royalty
      }
    )
    (var-set last-token-id next-id)
    (print { event: "nft-minted", id: next-id })
    (ok next-id)
  )
)
(define-public (update-nft
  (nft-id uint)
  (update-title (string-ascii 100))
  (update-description (string-ascii 500))
)
  (let ((nft (map-get? nft-metadata nft-id)))
    (match nft
      n
        (begin
          (asserts! (is-eq (get creator n) tx-sender) (err ERR-NOT-AUTHORIZED))
          (try! (validate-title update-title))
          (try! (validate-description update-description))
          (map-set nft-metadata nft-id
            (merge n {
              title: update-title,
              description: update-description,
              timestamp: block-height
            })
          )
          (map-set nft-updates nft-id
            {
              update-title: update-title,
              update-description: update-description,
              update-timestamp: block-height,
              updater: tx-sender
            }
          )
          (print { event: "nft-updated", id: nft-id })
          (ok true)
        )
      (err ERR-NFT-NOT-FOUND)
    )
  )
)
(define-public (transfer-nft (id uint) (recipient principal))
  (begin
    (asserts! (is-eq (unwrap! (nft-get-owner? heritage-nft id) (err ERR-NFT-NOT-FOUND)) tx-sender) (err ERR-NOT-AUTHORIZED))
    (nft-transfer? heritage-nft id tx-sender recipient)
  )
)
(define-public (burn-nft (id uint))
  (begin
    (asserts! (is-eq (unwrap! (nft-get-owner? heritage-nft id) (err ERR-NFT-NOT-FOUND)) tx-sender) (err ERR-NOT-AUTHORIZED))
    (nft-burn? heritage-nft id tx-sender)
  )
)
(define-public (get-nft-count)
  (ok (var-get last-token-id))
)