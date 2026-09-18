# VALBID

Pay to claim your spot.

VALBID is an independent community board concept for VALORANT players. Paid Position is a platform position based on verified spend; it is not an official Riot Games competitive rank or endorsement.


## Payment integration status

VALBID uses a server/database payment-intent boundary. The browser never marks a payment successful and never activates a leaderboard position. PayPal checkout and webhook verification require PayPal API credentials and a server-side callback endpoint; these are intentionally kept out of the public client.
