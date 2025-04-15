import stripe from "../utils/stripe.js"
import Order from "../models/Order.js"
import Product from "../models/Product.js"
import Cart from "../models/Cart.js"
import { ErrorResponse } from "../utils/errorResponse.js"

// @desc    Create payment intent
// @route   POST /api/payment/create-payment-intent
// @access  Private
export const createPaymentIntent = async (req, res, next) => {
  try {
    const { items, shipping, paymentMethodType } = req.body

    // Verify items and calculate total
    let totalAmount = 0
    const orderItems = []

    for (const item of items) {
      const product = await Product.findById(item.product)
      if (!product) {
        return next(new ErrorResponse(`Product not found with id: ${item.product}`, 404))
      }

      if (product.stock < item.quantity) {
        return next(new ErrorResponse(`Product ${product.name} is out of stock`, 400))
      }

      totalAmount += product.price * item.quantity
      orderItems.push({
        product: product._id,
        name: product.name,
        quantity: item.quantity,
        price: product.price,
        image: product.images[0]?.url || "",
      })
    }

    // Calculate tax and shipping
    const taxRate = 0.07 // 7% tax
    const taxAmount = totalAmount * taxRate
    const shippingAmount = shipping?.price || 0
    const finalAmount = Math.round((totalAmount + taxAmount + shippingAmount) * 100) // Convert to cents for Stripe

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: finalAmount,
      currency: "usd",
      payment_method_types: [paymentMethodType || "card"],
      metadata: {
        userId: req.user.id,
        orderId: Date.now().toString(),
      },
    })

    res.status(200).json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      amount: finalAmount,
      id: paymentIntent.id,
    })
  } catch (error) {
    next(error)
  }
}

// @desc    Process payment and create order
// @route   POST /api/payment/process-payment
// @access  Private
export const processPayment = async (req, res, next) => {
  try {
    const { paymentIntentId, shippingAddress } = req.body

    // Retrieve payment intent to verify payment
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)

    if (paymentIntent.status !== "succeeded") {
      return next(new ErrorResponse("Payment not successful", 400))
    }

    // Get user's cart
    const cart = await Cart.findOne({ user: req.user.id }).populate("items.product")

    if (!cart || cart.items.length === 0) {
      return next(new ErrorResponse("No items in cart", 400))
    }

    // Create order items from cart
    const orderItems = cart.items.map((item) => ({
      product: item.product._id,
      name: item.product.name,
      quantity: item.quantity,
      price: item.price,
      image: item.product.images[0]?.url || "",
    }))

    // Calculate prices
    const itemsPrice = cart.totalPrice
    const taxPrice = itemsPrice * 0.07 // 7% tax
    const shippingPrice = 10 // Fixed shipping price
    const totalPrice = itemsPrice + taxPrice + shippingPrice

    // Create order
    const order = await Order.create({
      user: req.user.id,
      orderItems,
      shippingAddress,
      paymentMethod: "stripe",
      paymentResult: {
        id: paymentIntentId,
        status: paymentIntent.status,
        update_time: Date.now(),
        email_address: req.user.email,
      },
      itemsPrice,
      taxPrice,
      shippingPrice,
      totalPrice,
      isPaid: true,
      paidAt: Date.now(),
    })

    // Update product stock
    for (const item of cart.items) {
      const product = await Product.findById(item.product._id)
      product.stock -= item.quantity
      await product.save()
    }

    // Clear cart
    await Cart.findByIdAndDelete(cart._id)

    res.status(201).json({
      success: true,
      data: order,
    })
  } catch (error) {
    next(error)
  }
}

// @desc    Handle Stripe webhook
// @route   POST /api/payment/webhook
// @access  Public
export const handleWebhook = async (req, res, next) => {
  try {
    const sig = req.headers["stripe-signature"]
    let event

    // Verify webhook signature
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET)
    } catch (err) {
      return res.status(400).send(`Webhook Error: ${err.message}`)
    }

    // Handle the event
    switch (event.type) {
      case "payment_intent.succeeded":
        const paymentIntent = event.data.object
        console.log("PaymentIntent was successful:", paymentIntent.id)
        // You can add additional logic here if needed
        break
      case "payment_intent.payment_failed":
        const failedPayment = event.data.object
        console.log("Payment failed:", failedPayment.id)
        // You can add failure handling logic here
        break
      default:
        console.log(`Unhandled event type ${event.type}`)
    }

    // Return a 200 response to acknowledge receipt of the event
    res.status(200).json({ received: true })
  } catch (error) {
    next(error)
  }
}
