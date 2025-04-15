import Order from "../models/Order.js"
import Product from "../models/Product.js"
import { ErrorResponse } from "../utils/errorResponse.js"

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
export const createOrder = async (req, res, next) => {
  try {
    const { orderItems, shippingAddress, paymentMethod, itemsPrice, taxPrice, shippingPrice, totalPrice } = req.body

    if (!orderItems || orderItems.length === 0) {
      return next(new ErrorResponse("No order items", 400))
    }

    // Verify all products exist and have sufficient stock
    for (const item of orderItems) {
      const product = await Product.findById(item.product)
      if (!product) {
        return next(new ErrorResponse(`Product not found with id: ${item.product}`, 404))
      }

      if (product.stock < item.quantity) {
        return next(new ErrorResponse(`Product ${product.name} is out of stock`, 400))
      }
    }

    // Create order
    const order = await Order.create({
      user: req.user.id,
      orderItems,
      shippingAddress,
      paymentMethod,
      itemsPrice,
      taxPrice,
      shippingPrice,
      totalPrice,
    })

    // Update product stock
    for (const item of orderItems) {
      const product = await Product.findById(item.product)
      product.stock -= item.quantity
      await product.save()
    }

    res.status(201).json({
      success: true,
      data: order,
    })
  } catch (error) {
    next(error)
  }
}

// @desc    Get all orders
// @route   GET /api/orders
// @access  Private/Admin
export const getOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({}).populate({
      path: "user",
      select: "name email",
    })

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders,
    })
  } catch (error) {
    next(error)
  }
}

// @desc    Get user orders
// @route   GET /api/orders/myorders
// @access  Private
export const getMyOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ user: req.user.id })

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders,
    })
  } catch (error) {
    next(error)
  }
}

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private
export const getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id).populate({
      path: "user",
      select: "name email",
    })

    if (!order) {
      return next(new ErrorResponse(`Order not found with id of ${req.params.id}`, 404))
    }

    // Make sure user is order owner or admin
    if (order.user._id.toString() !== req.user.id && req.user.role !== "admin") {
      return next(new ErrorResponse(`Not authorized to access this order`, 401))
    }

    res.status(200).json({
      success: true,
      data: order,
    })
  } catch (error) {
    next(error)
  }
}

// @desc    Update order to paid
// @route   PUT /api/orders/:id/pay
// @access  Private
export const updateOrderToPaid = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)

    if (!order) {
      return next(new ErrorResponse(`Order not found with id of ${req.params.id}`, 404))
    }

    // Update order
    order.isPaid = true
    order.paidAt = Date.now()
    order.paymentResult = {
      id: req.body.id,
      status: req.body.status,
      update_time: req.body.update_time,
      email_address: req.body.email_address,
    }

    const updatedOrder = await order.save()

    res.status(200).json({
      success: true,
      data: updatedOrder,
    })
  } catch (error) {
    next(error)
  }
}

// @desc    Update order to delivered
// @route   PUT /api/orders/:id/deliver
// @access  Private/Admin
export const updateOrderToDelivered = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)

    if (!order) {
      return next(new ErrorResponse(`Order not found with id of ${req.params.id}`, 404))
    }

    // Update order
    order.isDelivered = true
    order.deliveredAt = Date.now()
    order.status = "delivered"

    const updatedOrder = await order.save()

    res.status(200).json({
      success: true,
      data: updatedOrder,
    })
  } catch (error) {
    next(error)
  }
}

// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private/Admin
export const updateOrderStatus = async (req, res, next) => {
  try {
    const { status } = req.body

    const order = await Order.findById(req.params.id)

    if (!order) {
      return next(new ErrorResponse(`Order not found with id of ${req.params.id}`, 404))
    }

    // Update status
    order.status = status

    // If status is delivered, update delivered fields
    if (status === "delivered") {
      order.isDelivered = true
      order.deliveredAt = Date.now()
    }

    const updatedOrder = await order.save()

    res.status(200).json({
      success: true,
      data: updatedOrder,
    })
  } catch (error) {
    next(error)
  }
}

// @desc    Delete order
// @route   DELETE /api/orders/:id
// @access  Private/Admin
export const deleteOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)

    if (!order) {
      return next(new ErrorResponse(`Order not found with id of ${req.params.id}`, 404))
    }

    await order.deleteOne()

    res.status(200).json({
      success: true,
      data: {},
    })
  } catch (error) {
    next(error)
  }
}
