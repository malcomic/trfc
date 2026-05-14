import { v2 as cloudinary } from 'cloudinary'
import { config } from '../config/env.js'

cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
})

export async function uploadToCloudinary(fileBuffer: Buffer, folder: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder },
      (error, result) => {
        if (error) reject(error)
        else resolve(result?.secure_url || '')
      }
    )
    uploadStream.end(fileBuffer)
  })
}

export default cloudinary
