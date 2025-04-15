import mongoose from "mongoose"
import slugify from "slugify"

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please provide a category name"],
      trim: true,
      unique: true,
      maxlength: [50, "Category name cannot be more than 50 characters"],
    },
    slug: String,
    description: {
      type: String,
      maxlength: [500, "Description cannot be more than 500 characters"],
    },
    image: {
      public_id: String,
      url: String,
    },
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
)

// Create category slug from the name
categorySchema.pre("save", function (next) {
  this.slug = slugify(this.name, { lower: true })
  next()
})

// Virtual for subcategories
categorySchema.virtual("subcategories", {
  ref: "Category",
  localField: "_id",
  foreignField: "parent",
})

const Category = mongoose.model("Category", categorySchema)

export default Category
