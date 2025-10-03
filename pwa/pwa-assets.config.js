import { defineConfig } from '@vite-pwa/assets-generator/config'

export default defineConfig({
  preset: {
    transparent: {
      sizes: [72, 96, 128, 144, 152, 192, 384, 512],
      padding: 0.2,
      resizeOptions: {
        background: 'white',
        fit: 'contain'
      }
    },
    maskable: {
      sizes: [192, 512],
      padding: 0.3,
      resizeOptions: {
        background: 'white',
        fit: 'contain'
      }
    },
    apple: {
      sizes: [180],
      padding: 0.2,
      resizeOptions: {
        background: 'white',
        fit: 'contain'
      }
    }
  },
  images: ['fsbcg-logo.png']
})
