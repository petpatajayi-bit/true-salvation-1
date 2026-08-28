# Morrow Objects setup

The site is ready for Stripe Payment Links and a booking provider. You do not need to add secret keys to this site.

## 1. Create Stripe products

1. Open [Stripe Dashboard](https://dashboard.stripe.com/).
2. Create a product for each item: Tide cup ($28), Arc vase ($64), Loom cushion ($52), and After rain candle ($34).
3. For each product, choose **Create payment link**.
4. Copy each public payment-link URL.
5. Open `script.js` and paste each URL next to the matching product in `STORE_CONFIG.paymentLinks`.

Example:

```js
'Tide cup': 'https://buy.stripe.com/your-real-link'
```

Stripe collects the customer’s payment and shipping address. You still pack and ship the order, unless you use a fulfillment company.

## 2. Connect booking

1. Create a free account at [Calendly](https://calendly.com/) or [Cal.com](https://cal.com/).
2. Create a 45-minute event called **Morrow styling session**.
3. Add your availability and optional $75 payment settings.
4. Copy the public booking-page URL.
5. Paste it into `bookingUrl` in `script.js`.

```js
bookingUrl: 'https://calendly.com/your-name/styling-session'
```

Until you add a URL, the booking button opens an email draft instead.

## 3. Optional bag checkout

For simple product links, each product button can send customers directly to its Stripe Payment Link. If you later want customers to combine multiple products in one cart, use Shopify Buy Button or a small server-side Stripe Checkout integration. Never put a Stripe secret key in this website’s files.

## 4. Test before publishing

Use Stripe test mode first. Click each product, confirm the correct price, submit a test checkout, and book a test appointment. The site can stay local while you do all of this.
