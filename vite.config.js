import { defineConfig } from 'vite'

export default defineConfig({
    server: {
        watch: {
            // Ignore the backgrounds directory to prevent performance issues
            // when dealing with a large number of assets.
            ignored: ['**/src/assets/images/backgrounds/**']
        }
    }
})
