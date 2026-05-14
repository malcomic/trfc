import { Link } from 'react-router-dom'
import { useCart } from '../store/cartStore'

export default function Cart() {
  const { items, removeItem, updateQuantity, getTotal } = useCart()
  const total = getTotal()

  const handleQuantityChange = (productId: string, newQuantity: number) => {
    if (newQuantity < 1) return
    updateQuantity(productId, newQuantity)
  }

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Shopping Cart</h1>

        {items.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 mb-4">Your cart is empty</p>
            <Link to="/shop" className="text-primary font-semibold hover:underline">
              Continue Shopping
            </Link>
          </div>
        ) : (
          <>
            <div className="space-y-4 mb-8">
              {items.map((item) => (
                <div key={item.product.id} className="bg-white rounded-lg shadow p-4 flex justify-between items-center">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{item.product.name}</h3>
                    <p className="text-gray-600">KES {item.product.price}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleQuantityChange(item.product.id, item.quantity - 1)}
                      className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
                    >
                      -
                    </button>
                    <span className="w-8 text-center font-semibold">{item.quantity}</span>
                    <button
                      onClick={() => handleQuantityChange(item.product.id, item.quantity + 1)}
                      className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
                    >
                      +
                    </button>
                  </div>
                  <p className="w-24 text-right font-semibold">
                    KES {(item.product.price * item.quantity).toFixed(2)}
                  </p>
                  <button
                    onClick={() => removeItem(item.product.id)}
                    className="ml-4 text-red-500 hover:text-red-700 font-bold"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <div className="bg-light rounded-lg p-6 mb-6">
              <div className="flex justify-between items-center text-2xl font-bold mb-6">
                <span>Total:</span>
                <span className="text-primary">KES {total.toFixed(2)}</span>
              </div>
              <Link
                to="/checkout"
                className="block w-full bg-primary text-white text-center py-3 rounded-lg font-semibold hover:bg-opacity-90 transition"
              >
                Proceed to Checkout
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
