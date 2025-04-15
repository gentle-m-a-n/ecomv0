import jwt from "jsonwebtoken"
import { promisify } from "util"
import User from "../models/User.js"
import { ErrorResponse } from "../utils/errorResponse.js"

// Protect routes
export const protect = async (req, res, next) => {
  let token

  // Get token from Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    // Set token from Bearer token in header
    token = req.headers.authorization.split(" ")[1]
  }
  // If no token found, return error
  if (!token) {
    return next(new ErrorResponse("Not authorized to access this route", 401))
  }

  try {
    // Verify token
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET)

    // Get user from the token
    const user = await User.findById(decoded.id)

    if (!user) {
      return next(new ErrorResponse("No user found with this id", 404))
    }

    // Set user in request
    req.user = user
    next()
  } catch (error) {
    return next(new ErrorResponse("Not authorized to access this route", 401))
  }
}

// Grant access to specific roles
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new ErrorResponse(`User role ${req.user.role} is not authorized to access this route`, 403))
    }
    next()
  }
}
