import { v2 as cloudinary } from "cloudinary"
import dotenv from "dotenv"

dotenv.config()

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

// Upload image to Cloudinary
export const uploadImage = async (file, folder = "ecommerce") => {
  try {
    const result = await cloudinary.uploader.upload(file, {
      folder,
      resource_type: "auto",
    })
    return {
      public_id: result.public_id,
      url: result.secure_url,
    }
  } catch (error) {
    console.error("Cloudinary upload error:", error)
    throw new Error("Error uploading image to Cloudinary")
  }
}

// Delete image from Cloudinary
export const deleteImage = async (publicId) => {
  try {
    await cloudinary.uploader.destroy(publicId)
    return { success: true }
  } catch (error) {
    console.error("Cloudinary delete error:", error)
    throw new Error("Error deleting image from Cloudinary")
  }
}

export default cloudinary
