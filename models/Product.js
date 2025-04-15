import mongoose from "mongoose"
import slugify from "slugify"

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please provide a product name"],
      trim: true,
      maxlength: [100, "Product name cannot be more than 100 characters"],
    },
    slug: String,
    description: {
      type: String,
      required: [true, "Please provide a product description"],
      maxlength: [2000, "Description cannot be more than 2000 characters"],
    },
    price: {
      type: Number,
      required: [true, "Please provide a product price"],
      min: [0, "Price must be greater than 0"],
    },
    discountPrice: {
      type: Number,
      min: [0, "Discount price must be greater than 0"],
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Please provide a product category"],
    },
    stock: {
      type: Number,
      required: [true, "Please provide product stock"],
      min: [0, "Stock cannot be negative"],
      default: 0,
    },
    images: [
      {
        public_id: {
          type: String,
          required: true,
        },
        url: {
          type: String,
          required: true,
        },
      },
    ],
    featured: {
      type: Boolean,
      default: false,
    },
    ratings: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        rating: {
          type: Number,
          required: true,
          min: 1,
          max: 5,
        },
        review: String,
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    averageRating: {
      type: Number,
      min: [1, "Rating must be at least 1"],
      max: [5, "Rating cannot be more than 5"],
      default: 0,
    },
    numReviews: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
)

// Create product slug from the name
productSchema.pre("save", function (next) {
  this.slug = slugify(this.name, { lower: true })
  next()
})

// Calculate average rating
productSchema.methods.calculateAverageRating = function () {
  if (this.ratings.length === 0) {
    this.averageRating = 0
    this.numReviews = 0
  } else {
    const totalRating = this.ratings.reduce((acc, item) => item.rating + acc, 0)
    this.averageRating = totalRating / this.ratings.length
    this.numReviews = this.ratings.length
  }
  this.save()
}

const Product = mongoose.model("Product", productSchema)

export default Product
