import Cart from "../models/Cart.js"
import Product from "../models/Product.js"
import { ErrorResponse } from "../utils/errorResponse.js"

// @desc    Get user cart
// @route   GET /api/cart
// @access  Private
export const getCart = async (req, res, next) => {
  try {
    let cart = await Cart.findOne({ user: req.user.id }).populate({
      path: "items.product",
      select: "name price images stock",
    })

    if (!cart) {
      cart = await Cart.create({
        user: req.user.id,
        items: [],
      })
    }

    res.status(200).json({
      success: true,
      data: cart,
    })
  } catch (error) {
    next(error)
  }
}

// @desc    Add item to cart
// @route   POST /api/cart
// @access  Private
export const addToCart = async (req, res, next) => {
  try {
    const { productId, quantity } = req.body

    // Validate product
    const product = await Product.findById(productId)
    if (!product) {
      return next(new ErrorResponse(`Product not found with id of ${productId}`, 404))
    }

    // Check stock
    if (product.stock < quantity) {
      return next(new ErrorResponse(`Product has insufficient stock. Available: ${product.stock}`, 400))
    }

    // Find user cart or create new one
    let cart = await Cart.findOne({ user: req.user.id })
    if (!cart) {
      cart = await Cart.create({
        user: req.user.id,
        items: [],
      })
    }

    // Check if product already in cart
    const itemIndex = cart.items.findIndex((item) => item.product.toString() === productId)

    if (itemIndex > -1) {
      // Product exists in cart, update quantity
      cart.items[itemIndex].quantity += quantity
      if (cart.items[itemIndex].quantity > product.stock) {
        return next(new ErrorResponse(`Cannot add more than available stock (${product.stock})`, 400))
      }
    } else {
      // Product not in cart, add new item
      cart.items.push({
        product: productId,
        quantity,
        price: product.price,
      })
    }

    // Save cart
    await cart.save()

    // Return updated cart
    cart = await Cart.findById(cart._id).populate({
      path: "items.product",
      select: "name price images stock",
    })

    res.status(200).json({
      success: true,
      data: cart,
    })
  } catch (error) {
    next(error)
  }
}

// @desc    Update cart item
// @route   PUT /api/cart/:itemId
// @access  Private
export const updateCartItem = async (req, res, next) => {
  try {
    const { quantity } = req.body
    const { itemId } = req.params

    // Find user cart
    let cart = await Cart.findOne({ user: req.user.id })
    if (!cart) {
      return next(new ErrorResponse("Cart not found", 404))
    }

    // Find item in cart
    const itemIndex = cart.items.findIndex((item) => item._id.toString() === itemId)
    if (itemIndex === -1) {
      return next(new ErrorResponse("Item not found in cart", 404))
    }

    // Check product stock
    const product = await Product.findById(cart.items[itemIndex].product)
    if (!product) {
      return next(new ErrorResponse("Product not found", 404))
    }

    if (quantity > product.stock) {
      return next(new ErrorResponse(`Cannot add more than available stock (${product.stock})`, 400))
    }

    // Update quantity or remove if quantity is 0
    if (quantity <= 0) {
      cart.items.splice(itemIndex, 1)
    } else {
      cart.items[itemIndex].quantity = quantity
    }

    // Save cart
    await cart.save()

    // Return updated cart
    cart = await Cart.findById(cart._id).populate({
      path: "items.product",
      select: "name price images stock",
    })

    res.status(200).json({
      success: true,
      data: cart,
    })
  } catch (error) {
    next(error)
  }
}

// @desc    Remove item from cart
// @route   DELETE /api/cart/:itemId
// @access  Private
export const removeFromCart = async (req, res, next) => {
  try {
    const { itemId } = req.params

    // Find user cart
    let cart = await Cart.findOne({ user: req.user.id })
    if (!cart) {
      return next(new ErrorResponse("Cart not found", 404))
    }

    // Find item in cart
    const itemIndex = cart.items.findIndex((item) => item._id.toString() === itemId)
    if (itemIndex === -1) {
      return next(new ErrorResponse("Item not found in cart", 404))
    }

    // Remove item
    cart.items.splice(itemIndex, 1)

    // Save cart
    await cart.save()

    // Return updated cart
    cart = await Cart.findById(cart._id).populate({
      path: "items.product",
      select: "name price images stock",
    })

    res.status(200).json({
      success: true,
      data: cart,
    })
  } catch (error) {
    next(error)
  }
}

// @desc    Clear cart
// @route   DELETE /api/cart
// @access  Private
export const clearCart = async (req, res, next) => {
  try {
    // Find user cart
    const cart = await Cart.findOne({ user: req.user.id })
    if (!cart) {
      return next(new ErrorResponse("Cart not found", 404))
    }

    // Clear items
    cart.items = []

    // Save cart
    await cart.save()

    res.status(200).json({
      success: true,
      data: cart,
    })
  } catch (error) {
    next(error)
  }
}
