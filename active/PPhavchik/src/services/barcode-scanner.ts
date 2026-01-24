/**
 * Barcode Scanner Service - Integration with Open Food Facts API
 * Automatically fetch product nutrition data from barcodes
 * Supports both text input and photo scanning
 */
import axios from 'axios';
import jsQR from 'jsqr';
const Jimp = require('jimp');

export interface ProductNutrition {
  name: string;
  barcode: string;
  calories: number;
  protein: number;
  fats: number;
  carbs: number;
  quantity?: string;
  brand?: string;
  imageUrl?: string;
}

export class BarcodeScanner {
  private static readonly API_BASE = 'https://world.openfoodfacts.org/api/v2';

  /**
   * Fetch product data by barcode from Open Food Facts
   */
  static async getProductByBarcode(barcode: string): Promise<ProductNutrition | null> {
    try {
      const url = `${this.API_BASE}/product/${barcode}.json`;
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'PPhavchik-Bot/1.0 (Nutrition Tracker)'
        },
        timeout: 10000
      });

      if (response.data.status === 0) {
        // Product not found
        return null;
      }

      const product = response.data.product;

      // Extract nutrition data (per 100g)
      const nutriments = product.nutriments || {};

      // Calculate per serving or per 100g
      const servingSize = product.serving_size || '100g';
      const calories = Math.round(nutriments['energy-kcal_100g'] || nutriments['energy-kcal'] || 0);
      const protein = Math.round(nutriments['proteins_100g'] || nutriments['proteins'] || 0);
      const fats = Math.round(nutriments['fat_100g'] || nutriments['fat'] || 0);
      const carbs = Math.round(nutriments['carbohydrates_100g'] || nutriments['carbohydrates'] || 0);

      // Product name (prefer Russian, fallback to English)
      const productName = product.product_name_ru || product.product_name || 'Неизвестный продукт';
      const brand = product.brands || undefined;

      return {
        name: productName,
        barcode,
        calories,
        protein,
        fats,
        carbs,
        quantity: servingSize,
        brand,
        imageUrl: product.image_url || undefined
      };

    } catch (error) {
      console.error('Error fetching product from Open Food Facts:', error);
      return null;
    }
  }

  /**
   * Search product by name (fallback if barcode not found)
   */
  static async searchProductByName(query: string): Promise<ProductNutrition[]> {
    try {
      const url = `${this.API_BASE}/search`;
      const response = await axios.get(url, {
        params: {
          search_terms: query,
          page_size: 5,
          fields: 'product_name,brands,nutriments,barcode,image_url,serving_size'
        },
        headers: {
          'User-Agent': 'PPhavchik-Bot/1.0 (Nutrition Tracker)'
        },
        timeout: 10000
      });

      const products = response.data.products || [];
      return products.map((product: any) => {
        const nutriments = product.nutriments || {};

        return {
          name: product.product_name || 'Неизвестный продукт',
          barcode: product.barcode || '',
          calories: Math.round(nutriments['energy-kcal_100g'] || 0),
          protein: Math.round(nutriments['proteins_100g'] || 0),
          fats: Math.round(nutriments['fat_100g'] || 0),
          carbs: Math.round(nutriments['carbohydrates_100g'] || 0),
          quantity: product.serving_size || '100g',
          brand: product.brands,
          imageUrl: product.image_url
        };
      });

    } catch (error) {
      console.error('Error searching products:', error);
      return [];
    }
  }

  /**
   * Parse barcode from text (user can type barcode directly)
   */
  static parseBarcodeFromText(text: string): string | null {
    // Remove all non-digits
    const digits = text.replace(/\D/g, '');

    // Valid barcodes are typically 8, 12, or 13 digits
    if (digits.length === 8 || digits.length === 12 || digits.length === 13) {
      return digits;
    }

    return null;
  }

  /**
   * Scan barcode from image file
   */
  static async scanBarcodeFromImage(imagePath: string): Promise<string | null> {
    try {
      // Read image
      const image = await Jimp.read(imagePath);

      // Convert to grayscale for better recognition
      image.grayscale();

      // Get image data
      const imageData = {
        data: new Uint8ClampedArray(image.bitmap.data),
        width: image.bitmap.width,
        height: image.bitmap.height
      };

      // Scan for QR/barcode
      const code = jsQR(imageData.data, imageData.width, imageData.height);

      if (code && code.data) {
        // Validate that it's a valid barcode (8-13 digits)
        const barcode = this.parseBarcodeFromText(code.data);
        return barcode;
      }

      // Try EAN-13 detection with rotation (sometimes barcodes are rotated)
      for (let rotation = 0; rotation < 360; rotation += 90) {
        if (rotation > 0) {
          image.rotate(90);
          const rotatedData = {
            data: new Uint8ClampedArray(image.bitmap.data),
            width: image.bitmap.width,
            height: image.bitmap.height
          };

          const rotatedCode = jsQR(rotatedData.data, rotatedData.width, rotatedData.height);
          if (rotatedCode && rotatedCode.data) {
            const barcode = this.parseBarcodeFromText(rotatedCode.data);
            if (barcode) return barcode;
          }
        }
      }

      return null;
    } catch (error) {
      console.error('Error scanning barcode from image:', error);
      return null;
    }
  }

  /**
   * Download image from Telegram and scan barcode
   */
  static async scanBarcodeFromTelegramFile(
    fileUrl: string
  ): Promise<string | null> {
    try {
      // Download image
      const response = await axios.get(fileUrl, {
        responseType: 'arraybuffer',
        timeout: 30000
      });

      // Save temporarily
      const tempPath = `/tmp/barcode-${Date.now()}.jpg`;
      const fs = require('fs');
      fs.writeFileSync(tempPath, response.data);

      // Scan barcode
      const barcode = await this.scanBarcodeFromImage(tempPath);

      // Clean up
      fs.unlinkSync(tempPath);

      return barcode;
    } catch (error) {
      console.error('Error downloading and scanning Telegram image:', error);
      return null;
    }
  }
}
