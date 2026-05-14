import { Product } from '../types'

export default function ProductCard({ product }: { product: Product }) {
  return (
    <div className="card p-4 bg-white">
      {product.image_url && <img src={product.image_url} alt={product.name} className="w-full h-48 object-cover rounded-lg" />}
      <h3 className="text-xl font-semibold mt-4">{product.name}</h3>
      <p className="text-gray-600 text-sm">{product.category}</p>
      <p className="font-bold text-primary mt-2">KES {product.price}</p>
    </div>
  )
}
