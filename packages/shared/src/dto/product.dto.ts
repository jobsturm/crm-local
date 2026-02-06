/**
 * Product DTOs - For product catalog
 */

/**
 * Product entity
 */
export interface ProductDto {
  id: string;
  description: string;
  defaultPrice: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * DTO for creating a new product
 */
export interface CreateProductDto {
  description: string;
  defaultPrice: number;
}

/**
 * DTO for updating a product
 */
export interface UpdateProductDto {
  description?: string;
  defaultPrice?: number;
}

/**
 * Response DTO for a single product
 */
export interface ProductResponseDto {
  product: ProductDto;
}

/**
 * Response DTO for a list of products
 */
export interface ProductListResponseDto {
  products: ProductDto[];
}
