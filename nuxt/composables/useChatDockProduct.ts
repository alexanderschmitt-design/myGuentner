/**
 * useChatDockProduct — product-preview channel for the ChatDock.
 *
 * Call `useProductChatTrigger().openProductInChat(product)` from any
 * component to open Günther and show an instant product preview card.
 * ChatDock watches this state and injects a ChatProductPreviewCard entry
 * into the chat history — no AI round-trip for the initial display.
 */

export interface ProductPitchContext {
  productName: string
  category: string
  subcategory?: string | null
  series?: string | null
  description?: string | null
  imagePath: string
}

export function useChatDockProduct() {
  return useState<ProductPitchContext | null>('chat-dock-product', () => null)
}

/**
 * Returns `openProductInChat` — sets the product context and opens the
 * drawer. ChatDock injects the preview card directly into its history.
 */
export function useProductChatTrigger() {
  const productCtx = useChatDockProduct()
  const isOpen     = useChatDockState()

  function openProductInChat(product: ProductPitchContext) {
    productCtx.value = product
    isOpen.value     = true
  }

  return { openProductInChat }
}
