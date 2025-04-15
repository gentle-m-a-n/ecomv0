import Product from "../models/Product.js"
import Category from "../models/Category.js"
import { ErrorResponse } from "../utils/errorResponse.js"
import { uploadImage, deleteImage } from "../utils/cloudinary.js"

// @desc    Create new product
// @route   POST /api/products
// @access  Private/Admin
export const createProduct = async (req, res, next) => {
  try {
    const { name, description, price, category, stock, featured } = req.body

    // Check if category exists
    const categoryExists = await Category.findById(category)
    if (!categoryExists) {
      return next(new ErrorResponse(`Category not found with id of ${category}`, 404))
    }

    // Handle image uploads
    const images = []
    if (req.body.images && req.body.images.length > 0) {
      for (const image of req.body.images) {
        const result = await uploadImage(image, "products")
        images.push(result)
      }
    }

    // Create product
    const product = await Product.create({
      name,
      description,
      price,
      category,
      stock,
      featured: featured || false,
      images,
    })

    res.status(201).json({
      success: true,
      data: product,
    })
  } catch (error) {
    next(error)
  }
}

// @desc    Get all products
// @route   GET /api/products
// @access  Public
export const getProducts = async (req, res, next) => {
  try {
    // Copy req.query
    const reqQuery = { ...req.query }

    // Fields to exclude
    const removeFields = ["select", "sort", "page", "limit"]

    // Loop over removeFields and delete them from reqQuery
    removeFields.forEach((param) => delete reqQuery[param])

    // Create query string
    let queryStr = JSON.stringify(reqQuery)

    // Create operators ($gt, $gte, etc)
    queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, (match) => `$${match}`)

    // Finding resource
    let query = Product.find(JSON.parse(queryStr)).populate("category", "name")

    // Select Fields
    if (req.query.select) {
      const fields = req.query.select.split(",").join(" ")
      query = query.select(fields)
    }

    // Sort
    if (req.query.sort) {
      const sortBy = req.query.sort.split(",").join(" ")
      query = query.sort(sortBy)
    } else {
      query = query.sort("-createdAt")
    }

    // Pagination
    const page = Number.parseInt(req.query.page, 10) || 1
    const limit = Number.parseInt(req.query.limit, 10) || 10
    const startIndex = (page - 1) * limit
    const endIndex = page * limit
    const total = await Product.countDocuments(JSON.parse(queryStr))

    query = query.skip(startIndex).limit(limit)

    // Executing query
    const products = await query

    // Pagination result
    const pagination = {}

    if (endIndex < total) {
      pagination.next = {
        page: page + 1,
        limit,
      }
    }

    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit,
      }
    }

    res.status(200).json({
      success: true,
      count: products.length,
      pagination,
      data: products,
    })
  } catch (error) {
    next(error)
  }
}

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Public
export const getProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id).populate("category", "name")

    if (!product) {
      return next(new ErrorResponse(`Product not found with id of ${req.params.id}`, 404))
    }

    res.status(200).json({
      success: true,
      data: product,
    })
  } catch (error) {
    next(error)
  }
}

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private/Admin
export const updateProduct = async (req, res, next) => {
  try {
    let product = await Product.findById(req.params.id)

    if (!product) {
      return next(new ErrorResponse(`Product not found with id of ${req.params.id}`, 404))
    }

    // Handle image uploads if any
    if (req.body.images && req.body.images.length > 0) {
      // Delete old images from cloudinary
      for (const image of product.images) {
        await deleteImage(image.public_id)
      }

      // Upload new images
      const images = []
      for (const image of req.body.images) {
        const result = await uploadImage(image, "products")
        images.push(result)
      }
      req.body.images = images
    }

    // Update product
    product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    })

    res.status(200).json({
      success: true,
      data: product,
    })
  } catch (error) {
    next(error)
  }
}

// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Private/Admin
export const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id)

    if (!product) {
      return next(new ErrorResponse(`Product not found with id of ${req.params.id}`, 404))
    }

    // Delete images from cloudinary
    for (const image of product.images) {
      await deleteImage(image.public_id)
    }

    await product.deleteOne()

    res.status(200).json({
      success: true,
      data: {},
    })
  } catch (error) {
    next(error)
  }
}

// @desc    Add product review
// @route   POST /api/products/:id/reviews
// @access  Private
export const addProductReview = async (req, res, next) => {
  try {
    const { rating, review } = req.body

    const product = await Product.findById(req.params.id)

    if (!product) {
      return next(new ErrorResponse(`Product not found with id of ${req.params.id}`, 404))
    }

    // Check if user already reviewed
    const alreadyReviewed = product.ratings.find((r) => r.user.toString() === req.user._id.toString())

    if (alreadyReviewed) {
      return next(new ErrorResponse("Product already reviewed", 400))
    }

    // Add review
    product.ratings.push({
      user: req.user._id,
      rating: Number(rating),
      review,
    })

    // Calculate average rating
    product.calculateAverageRating()

    await product.save()

    res.status(201).json({
      success: true,
      data: product,
    })
  } catch (error) {
    next(error)
  }
}
